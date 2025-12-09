import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from math import radians, sin, cos, sqrt, atan2
import csv
import os


# ================================================================
# 1) DB 연결 설정
# ================================================================
try:
    engine = create_engine("mysql+pymysql://root:12345@localhost/Users")
except Exception as e:
    print(f"⚠️ DB 연결 오류: {str(e)}")
    engine = None


# ================================================================
# 2) Haversine 거리 계산 (직선거리)
# ================================================================
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c   # km


# ================================================================
# 3) CSV 데이터 로드
# ================================================================
def load_csv(filepath):
    """CSV 파일을 읽어 DataFrame으로 반환"""
    try:
        return pd.read_csv(filepath, encoding="cp949")
    except UnicodeDecodeError:
        return pd.read_csv(filepath, encoding="utf-8")

base_dir = os.path.dirname(os.path.abspath(__file__))



# ================================================================
# 3) 사용자 러닝 기록 로드
# ================================================================
def load_user_pattern(user_id):
    df_user = pd.read_sql(f"""
        SELECT distance_km
        FROM running_record
        WHERE user_id = {user_id}
    """, engine)

    if df_user.empty:
        return None

    return df_user["distance_km"].mean()


# ================================================================
# 4) 코스 데이터 로드
# ================================================================
def load_course_data():
    csv_path = os.path.join(base_dir, "data/knn_course.csv")
    df = load_csv(csv_path)

    diff_map = {"초급": 1, "중급": 2, "상급": 3}
    df["difficulty_score"] = df["난이도"].map(diff_map).fillna(2)

    return df


# ================================================================
# 5) 메인 추천 함수
# ================================================================
def recommend_courses(user_id, user_lat, user_lon, top_k=5):

    # ① 사용자 평균 러닝 패턴 로드
    user_avg_dist = load_user_pattern(user_id)
    if user_avg_dist is None:
        return {"error": f"User {user_id} has no running records."}

    # ② 코스 데이터 불러오기
    df = load_course_data()

    # ③ 코스의 중간 지점 계산 (시작점과 끝점의 중점)
    df["중간위도"] = (df["위도1"].astype(float) + df["위도2"].astype(float)) / 2
    df["중간경도"] = (df["경도1"].astype(float) + df["경도2"].astype(float)) / 2

    # ④ 직선거리 계산 (사용자 위치에서 코스 중간 지점까지)
    df["geo_distance_km"] = df.apply(
        lambda r: haversine(user_lat, user_lon, float(r["중간위도"]), float(r["중간경도"])),
        axis=1
    )

    # ④ 거리 근접도 점수 (0~1)
    df["proximity_score"] = 1 / (1 + df["geo_distance_km"])

    # ⑤ 사용자 거리 패턴 유사도
    df["dist_diff"] = np.abs(df["거리"] - user_avg_dist)
    df["distance_score"] = 1 / (1 + df["dist_diff"])

    # ⑥ 최종 점수 종합
    df["final_score"] = (
          0.5 * df["proximity_score"]
        + 0.5 * df["distance_score"]
    )

    df_sorted = df.sort_values("final_score", ascending=False)

    # 항상 5개 보장
    if len(df_sorted) >= top_k:
        recommended = df_sorted.head(top_k)
    else:
        # 부족하면 남은 코스 추가해서 top_k까지 채움
        recommended = df_sorted.head(len(df_sorted))

    # ⑦ API용 JSON 형태 반환
    return {
        "user_id": user_id,
        "user_avg_distance": float(user_avg_dist),
        "recommended_count": len(recommended),
        "recommended_courses": recommended.to_dict(orient="records")
    }
