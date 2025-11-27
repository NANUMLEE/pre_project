# ================================================================
# complete_knn_recommendation.py
# 완전한 KNN 기반 러닝 코스 추천 엔진 (API 연결 가능)
# ================================================================

import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sklearn.neighbors import NearestNeighbors


# ================================================================
# 1) DB 연결 설정
# ================================================================
engine = create_engine("mysql+pymysql://root:1234@localhost/runnerism")

# ================================================================
# 2) 사용자 기록 로드
# ================================================================
def load_user_record(user_id: int) -> pd.DataFrame:
    """running_calorie_augment 테이블에서 특정 사용자 기록 로드"""
    query = f"""
        SELECT *
        FROM running_calorie_augment
        WHERE id = {user_id}
    """
    return pd.read_sql(query, engine)


# ================================================================
# 3) 코스 정보 로드
# ================================================================
def load_course_data() -> pd.DataFrame:
    """knn_course 테이블에서 러닝 코스 데이터 로드"""
    query = """
        SELECT 
            course_id,
            route,
            distance_total_km,
            duration_min
        FROM knn_course
    """
    df = pd.read_sql(query, engine)

    # 코스 페이스 계산 (min/km)
    df["course_pace"] = df["duration_min"] / df["distance_total_km"]
    return df


# ================================================================
# 4) 유저 feature 계산
# ================================================================
def compute_user_features(df_user, n_recent=5):
    df_recent = df_user.sort_index(ascending=False).head(n_recent)

    user_avg_distance = df_recent["Distance"].mean()
    user_pace = (df_recent["Running_time"] / df_recent["Distance"]).mean()

    return user_avg_distance, user_pace


# ================================================================
# 5) KNN 추천
# ================================================================
def recommend_knn(df_user, df_courses, k=5, n_recent=5):
    """유저의 평균 거리 + 페이스 기반 KNN 추천"""
    user_avg_distance, user_pace = compute_user_features(df_user, n_recent)

    # 사용자 벡터
    user_vec = np.array([[user_avg_distance, user_pace]])

    # 코스 벡터 (거리 + 페이스)
    course_vec = df_courses[["distance_total_km", "course_pace"]].values

    # KNN 모델
    knn = NearestNeighbors(
        n_neighbors=min(k, len(df_courses)),
        metric="euclidean"
    )
    knn.fit(course_vec)

    # top-k 코스 찾기
    _, idx = knn.kneighbors(user_vec)

    return df_courses.iloc[idx[0]]


# ================================================================
# 6) API에서 사용할 메인 함수
# ================================================================
def recommend_courses_for_user(user_id: int, k=5):
    """사용자 ID를 받아 추천 코스 반환"""
    
    df_user = load_user_record(user_id)
    if df_user.empty:
        return {"error": f"❌ user {user_id} record not found"}

    df_courses = load_course_data()

    recommended = recommend_knn(df_user, df_courses, k)

    return {
        "user_id": user_id,
        "recommended_courses": recommended.to_dict(orient="records")
    }
