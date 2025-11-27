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


# ================================================================
# 1) DB 연결 설정
# ================================================================
engine = create_engine("mysql+pymysql://root:12345@localhost/Users")

ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjA3YThlZjdiN2ViMzQwNmFhYTM3MGFlNzY4N2YxMjE3IiwiaCI6Im11cm11cjY0In0="
client = openrouteservice.Client(key=ORS_API_KEY)

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
def recommend_courses(user_id, user_lat, user_lon, courses_data, top_k=5):
    """
    사용자 위치 기반 러닝 코스 추천
    - user_id: 사용자 ID
    - user_lat, user_lon: 사용자 현재 위치
    - courses_data: CSV에서 로드한 코스 데이터 (list of dict)
    - top_k: 추천할 코스 개수
    """

    # ------------------------------------------------------------
    # ① 사용자 러닝 기록 불러오기
    # ------------------------------------------------------------
    df_user = pd.read_sql(f"""
        SELECT distance_km
        FROM running_record
        WHERE user_id = {user_id}
    """, engine)

    if df_user.empty:
        return {"error": f"사용자 {user_id} 기록 없음"}

    avg_distance = df_user["distance_km"].mean()

    # ------------------------------------------------------------
    # ② 코스 데이터를 DataFrame으로 변환
    # ------------------------------------------------------------
    df_courses = pd.DataFrame(courses_data)

    # 난이도 스코어 매핑
    diff_map = {"초급": 1, "중급": 2, "상급": 3}
    df_courses["difficulty"] = df_courses.get("난이도", "중급")
    df_courses["difficulty_score"] = df_courses["difficulty"].map(diff_map).fillna(2)

    # CSV의 거리를 숫자로 변환
    def parse_distance(distance_val):
        """거리 문자열을 숫자로 변환 (예: '5km' → 5.0)"""
        try:
            if isinstance(distance_val, str):
                return float(distance_val.strip().replace('km', '').replace('Km', '').strip())
            return float(distance_val) if distance_val else 0
        except:
            return 0

    df_courses["distance_parsed"] = df_courses["거리"].apply(parse_distance)

    # ------------------------------------------------------------
    # ③ ORS 기반 사용자-코스 거리 계산 (위도/경도 필드명: start_lat, start_lng)
    # ------------------------------------------------------------
    df_courses["geo_distance_km"] = df_courses.apply(
        lambda r: ors_distance(user_lat, user_lon, r.get("start_lat", 0), r.get("start_lng", 0)),
        axis=1
    )

    # ------------------------------------------------------------
    # ④ 키워드 TF-IDF (CSV에 keywords 필드가 있으면 사용)
    # ------------------------------------------------------------
    if "keywords" in df_courses.columns:
        vectorizer = TfidfVectorizer()
        keyword_vectors = vectorizer.fit_transform(df_courses["keywords"].fillna(""))
    else:
        # keywords가 없으면 더미 벡터 사용
        vectorizer = None
        keyword_vectors = None

    # ------------------------------------------------------------
    # ⑤ 전체 벡터 생성 (거리, 난이도, 위치거리 + TFIDF)
    # ------------------------------------------------------------
    numeric_features = df_courses[[
        "distance_parsed",
        "difficulty_score",
        "geo_distance_km"
    ]].fillna(0).values

    if keyword_vectors is not None:
        X_combined = np.hstack((numeric_features, keyword_vectors.toarray()))
        # 유저 프로필 벡터
        user_keyword_vec = vectorizer.transform([""])  # 유저 키워드 없음
        user_profile = np.hstack((
            user_keyword_vec.toarray()[0]
        )).reshape(1, -1)
    else:
        X_combined = numeric_features
        user_profile = np.array([[avg_distance, 2.0, 0]])  # 기본 사용자 프로필

    # ------------------------------------------------------------
    # ⑥ 코사인 유사도 기반 추천 (또는 유클리드 거리)
    # ------------------------------------------------------------
    if keyword_vectors is not None:
        df_courses["similarity"] = cosine_similarity(user_profile, X_combined).flatten()
    else:
        # keywords가 없으면 유클리드 거리로 계산
        from sklearn.metrics.pairwise import euclidean_distances
        distances = euclidean_distances(user_profile, X_combined).flatten()
        df_courses["similarity"] = 1 / (1 + distances)  # 거리를 유사도로 변환

    recommended = df_courses.sort_values("similarity", ascending=False).head(top_k)

    # ------------------------------------------------------------
    # ⑦ API로 반환하기 좋은 JSON 형태
    # ------------------------------------------------------------
    return {
        "user_id": user_id,
        "user_avg_distance": float(avg_distance),
        "recommended_courses": recommended.to_dict(orient="records")
    }
