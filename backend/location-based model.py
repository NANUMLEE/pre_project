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
engine = create_engine("mysql+pymysql://root:1234@localhost:3306/runnerism")

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
def recommend_courses(user_id, user_lat, user_lon, top_k=5):

    # ------------------------------------------------------------
    # ① 사용자 러닝 기록 불러오기
    # ------------------------------------------------------------
    df_user = pd.read_sql(f"""
        SELECT Distance
        FROM running_calorie_augment
        WHERE id = {user_id}
    """, engine)

    if df_user.empty:
        return {"error": f"사용자 {user_id} 기록 없음"}

    avg_distance = df_user["Distance"].mean()

    # ------------------------------------------------------------
    # ② 코스 데이터 불러오기
    # ------------------------------------------------------------
    df_courses = pd.read_sql("""
        SELECT route, distance_total_km, difficulty, keywords, lat, lon
        FROM knn_course
    """, engine)

    # 난이도 스코어 매핑
    diff_map = {"초급": 1, "중급": 2, "상급": 3}
    df_courses["difficulty_score"] = df_courses["difficulty"].map(diff_map)

    # ------------------------------------------------------------
    # ③ ORS 기반 사용자-코스 거리 계산
    # ------------------------------------------------------------
    df_courses["geo_distance_km"] = df_courses.apply(
        lambda r: ors_distance(user_lat, user_lon, r["lat"], r["lon"]),
        axis=1
    )

    # ------------------------------------------------------------
    # ④ 키워드 TF-IDF
    # ------------------------------------------------------------
    vectorizer = TfidfVectorizer()
    keyword_vectors = vectorizer.fit_transform(df_courses["keywords"].fillna(""))

    # ------------------------------------------------------------
    # ⑤ 전체 벡터 생성 (거리, 난이도, 위치거리 + TFIDF)
    # ------------------------------------------------------------
    numeric_features = df_courses[[
        "distance_total_km",
        "difficulty_score",
        "geo_distance_km"
    ]].values

    X_combined = np.hstack((numeric_features, keyword_vectors.toarray()))

    # 유저 프로필 벡터
    user_keyword_vec = vectorizer.transform([""])  # 유저 키워드 없음
    user_profile = np.hstack(( 
        user_keyword_vec.toarray()[0]
    )).reshape(1, -1)

    # ------------------------------------------------------------
    # ⑥ 코사인 유사도 기반 추천
    # ------------------------------------------------------------
    df_courses["similarity"] = cosine_similarity(user_profile, X_combined).flatten()

    recommended = df_courses.sort_values("similarity", ascending=False).head(top_k)

    # ------------------------------------------------------------
    # ⑦ API로 반환하기 좋은 JSON 형태
    # ------------------------------------------------------------
    return {
        "user_id": user_id,
        "user_avg_distance": float(avg_distance),
        "recommended_courses": recommended.to_dict(orient="records")
    }
