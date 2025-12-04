# ================================================================
# complete_tf_idf_recommendation.py
# TF-IDF + 거리 기반 러닝 코스 추천 엔진
# API 서버에서 import 가능하도록 함수 기반 구조
# ================================================================

import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import openrouteservice
import csv
import os


# ================================================================
# 1) DB 연결 설정
# ================================================================
engine = create_engine("mysql+pymysql://root:12345@localhost/Users")

ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjA3YThlZjdiN2ViMzQwNmFhYTM3MGFlNzY4N2YxMjE3IiwiaCI6Im11cm11cjY0In0="
client = openrouteservice.Client(key=ORS_API_KEY)

# ================================================================
# 2) CSV 데이터 로드
# ================================================================
def load_csv(filepath):
    """CSV 파일을 읽어 Dict 형태 리스트로 반환"""
    data = []
    with open(filepath, "r", encoding="cp949") as f:
        reader = csv.DictReader(f)
        for row in reader:
            def to_float(v):
                try:
                    return float(v) if v != "" else None
                except:
                    return None

            row["start_lat"] = to_float(row.get("위도1"))
            row["start_lng"] = to_float(row.get("경도1"))
            row["difficulty"] = row.get("난이도")
            data.append(row)

    return data

base_dir = os.path.dirname(os.path.abspath(__file__))
COURSES_KNN = None  # 함수 호출 시에 로드하도록 변경

# ================================================================
# 3) ORS 기반 실제 이동 거리 계산
# ================================================================
def ors_distance(lat1, lon1, lat2, lon2):
    """OpenRouteService를 이용해 실제 도보 경로 거리(km)를 반환"""
    try:
        coords = [(lon1, lat1), (lon2, lat2)]  # ORS는 (lon, lat) 순서

        route = client.directions(
            coordinates=coords,
            profile='foot-walking',
            format='geojson'
        )

        seg = route['features'][0]['properties']['segments'][0]
        dist_km = seg["distance"] / 1000  # meters → km

        return dist_km

    except Exception as e:
        print("❌ ORS Distance Error:", e)
        return None


# ================================================================
# 4) 메인 추천 함수
# ================================================================
def recommend_courses(user_id, user_lat, user_lon, top_k=5):
    try:
        # ① 사용자 러닝 기록 불러오기
        df_user = pd.read_sql(f"""
            SELECT distance_km
            FROM running_record
            WHERE user_id = {user_id}
        """, engine)

        if df_user.empty:
            return {
                "status": "error",
                "user_id": user_id,
                "recommended_count": 0,
                "recommended_courses": [],
                "message": f"사용자 {user_id}의 기록이 없습니다"
            }

        avg_distance = df_user["distance_km"].mean()

        # ② 코스 데이터 불러오기
        courses_knn_path = os.path.join(base_dir, "data", "knn_course.csv")
        df_courses = pd.read_csv(courses_knn_path).copy()

        # 난이도 스코어 매핑
        diff_map = {"초급": 1, "중급": 2, "상급": 3}
        df_courses["difficulty_score"] = df_courses["난이도"].map(diff_map).fillna(2)

        # ③ ORS 기반 사용자-코스 거리 계산 (위도/경도 필드명: 위도1, 경도1)
        df_courses["geo_distance_km"] = df_courses.apply(
            lambda r: ors_distance(user_lat, user_lon, r["위도1"], r["경도1"]),
            axis=1
        )
        df_courses["geo_distance_km"] = df_courses["geo_distance_km"].fillna(0)

        # ④ 특성 정규화 (0~1 범위)
        from sklearn.preprocessing import MinMaxScaler

        # 위치 근접도: 거리가 작을수록 1에 가까움 (역함수)
        df_courses["proximity_score"] = 1 / (1 + df_courses["geo_distance_km"] / 10)

        # 코스 거리 정규화: 사용자 평균 거리와의 유사도
        scaler_distance = MinMaxScaler()
        df_courses["distance_normalized"] = scaler_distance.fit_transform(
            df_courses[["거리"]]
        )

        # 난이도 정규화: 1~3 → 0~1
        df_courses["difficulty_normalized"] = (df_courses["difficulty_score"] - 1) / (3 - 1)

        # ⑤ 전체 벡터 생성 (근접도, 거리 유사도, 난이도)
        # 우선순위: 위치 > 거리 유사도 > 난이도
        numeric_features = np.column_stack([
            df_courses["proximity_score"],        # 위치 근접도 (주요)
            df_courses["distance_normalized"],    # 거리 유사도 (보조)
            df_courses["difficulty_normalized"]   # 난이도 (보조)
        ])

        X_combined = numeric_features

        # 사용자 벡터: [위치(기준=1.0), 거리 유사도, 난이도]
        user_proximity_score = 1.0  # 사용자는 자신 위치에서 0거리 = 최대값

        # 사용자 평균 거리를 정규화
        user_distance_normalized = scaler_distance.transform([[avg_distance]])[0][0]

        # 중급 난이도 정규화
        user_difficulty_normalized = (2.0 - 1) / (3 - 1)

        user_profile = np.array([[user_proximity_score, user_distance_normalized, user_difficulty_normalized]])

        # ⑥ 유클리드 거리 기반 유사도 계산
        from sklearn.metrics.pairwise import euclidean_distances
        distances = euclidean_distances(user_profile, X_combined).flatten()
        df_courses["similarity"] = 1 / (1 + distances)

        recommended = df_courses.sort_values("similarity", ascending=False).head(top_k)

        # ⑦ API로 반환하기 좋은 JSON 형태
        recommended_courses_list = recommended.to_dict(orient="records")

        return {
            "status": "success",
            "user_id": user_id,
            "user_avg_distance": float(avg_distance),
            "recommended_count": len(recommended_courses_list),
            "recommended_courses": recommended_courses_list,
            "message": "위치 기반 추천 성공"
        }
    except Exception as e:
        print(f"❌ 위치 기반 추천 에러: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "user_id": user_id,
            "recommended_count": 0,
            "recommended_courses": [],
            "error": str(e),
            "message": "위치 기반 추천에 실패했습니다"
        }
