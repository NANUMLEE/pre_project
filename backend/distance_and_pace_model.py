import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
import os


# ===============================================================
# 1) DB 연결
# ===============================================================
engine = create_engine("mysql+pymysql://root:12345@localhost/Users")


# ===============================================================
# 2) 유저 기록 로드 (running_record)
# ===============================================================
def load_user_record(user_id: int) -> pd.DataFrame:
    """running_record 테이블에서 사용자의 거리 및 페이스 정보 로드"""
    try:
        query = text("""
            SELECT
                distance_km as Distance,
                pace_km as Running_time
            FROM running_record
            WHERE user_id = :user_id
            ORDER BY start_time DESC
            LIMIT 50
        """)
        with engine.begin() as conn:
            result = conn.execute(query, {"user_id": user_id}).fetchall()

        if not result:
            return pd.DataFrame()

        df = pd.DataFrame([{"Distance": r[0], "Running_time": r[1]} for r in result])
        return df
    except Exception as e:
        print(f"❌ 사용자 기록 로드 실패: {str(e)}")
        return pd.DataFrame()


# ===============================================================
# 3) 코스 정보 로드 (knn_course)
# ===============================================================
def load_course_data() -> pd.DataFrame:
    """knn_course CSV에서 코스 정보 로드 및 페이스 계산"""
    try:
        # CSV 파일에서 직접 로드
        base_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(base_dir, "data", "knn_course.csv")
        df = pd.read_csv(csv_path)

        # 필드명 검증
        if '거리' not in df.columns or 'duration_min' not in df.columns:
            print("⚠️ CSV 필드명이 올바르지 않습니다")
            return pd.DataFrame()
        # ZeroDivisionError 방지: 거리가 0이 아닌 행만 사용
        df = df[df["거리"] > 0].copy()
        if df.empty:
            print("⚠️ 유효한 코스가 없습니다 (거리 > 0)")
            return pd.DataFrame()
        df["course_pace"] = df["duration_min"] / df["거리"]
        return df
    except Exception as e:
        print(f"❌ 코스 정보 로드 실패: {str(e)}")
        return pd.DataFrame()


# ===============================================================
# 4) 사용자 피처 계산 (최근 n개 기록)
# ===============================================================
def compute_user_features(df_user, n_recent=5):
    """사용자의 평균 거리 및 페이스 계산"""
    if df_user.empty:
        return 5.0, 6.0  # 기본값

    df_recent = df_user.head(n_recent)

    user_avg_distance = df_recent["Distance"].mean()
    user_avg_pace = df_recent["Running_time"].mean()

    return user_avg_distance, user_avg_pace


# ===============================================================
# 5) 직접 유클리드 거리 계산 기반 추천
# ===============================================================
def recommend_courses(df_user, df_courses, k=5, n_recent=5):
    """거리와 페이스 기반 유클리드 거리 계산 추천"""
    if df_user.empty or df_courses.empty:
        return pd.DataFrame()

    user_avg_distance, user_avg_pace = compute_user_features(df_user, n_recent)

    diff_distance = df_courses["거리"] - user_avg_distance
    diff_pace = df_courses["course_pace"] - user_avg_pace

    df_courses = df_courses.copy()
    df_courses["euclidean_dist"] = np.sqrt(diff_distance**2 + diff_pace**2)

    df_recommended = df_courses.sort_values("euclidean_dist").head(k)

    return df_recommended


# ===============================================================
# 6) 메인 추천 함수 (외부 모듈에서 임포트 가능)
# ===============================================================
def recommend_courses_by_distance_pace(user_id: int, k: int = 5):
    """
    사용자의 거리 및 페이스 기반 추천 코스 함수

    파라미터:
    - user_id: 사용자 ID
    - k: 추천 개수 (기본 5개)

    반환:
    - dict: 추천 결과 (user_id, user_avg_distance, user_avg_pace, recommended_courses)
    """
    try:
        # 사용자 기록 로드
        df_user = load_user_record(user_id)

        if df_user.empty:
            return {
                "status": "error",
                "user_id": user_id,
                "recommended_count": 0,
                "recommended_courses": [],
                "message": f"사용자 {user_id}의 기록이 없습니다"
            }

        # 코스 정보 로드
        df_courses = load_course_data()

        if df_courses.empty:
            return {
                "status": "error",
                "user_id": user_id,
                "recommended_count": 0,
                "recommended_courses": [],
                "message": "코스 정보를 불러올 수 없습니다"
            }

        # 사용자 특성 계산
        user_avg_distance, user_avg_pace = compute_user_features(df_user)

        # 코스 추천
        recommended = recommend_courses(df_user, df_courses, k)

        if recommended.empty:
            return {
                "status": "error",
                "user_id": user_id,
                "recommended_count": 0,
                "recommended_courses": [],
                "message": "추천 가능한 코스가 없습니다"
            }

        return {
            "status": "success",
            "user_id": user_id,
            "user_avg_distance": round(user_avg_distance, 2),
            "user_avg_pace": round(user_avg_pace, 2),
            "recommended_count": len(recommended),
            "recommended_courses": recommended.to_dict(orient="records"),
            "message": "거리와 페이스 기반 추천 성공"
        }

    except Exception as e:
        print(f"❌ 추천 함수 에러: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "user_id": user_id,
            "recommended_count": 0,
            "recommended_courses": [],
            "error": str(e),
            "message": "추천 처리 중 오류가 발생했습니다"
        }
