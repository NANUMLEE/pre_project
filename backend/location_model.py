import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from math import radians, sin, cos, sqrt, atan2
import openrouteservice
import os


# ================================================================
# 1) DB 연결 설정
# ================================================================
try:
    engine = create_engine("mysql+pymysql://root:12345@localhost/Users")
except Exception as e:
    print(f"⚠️ DB 연결 오류: {str(e)}")
    engine = None

# ORS 클라이언트
ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjA3YThlZjdiN2ViMzQwNmFhYTM3MGFlNzY4N2YxMjE3IiwiaCI6Im11cm11cjY0In0="
client = openrouteservice.Client(key=ORS_API_KEY)


# ================================================================
# 2) CSV 데이터 로드 함수
# ================================================================
def load_csv(filepath):
    """CSV 파일을 읽어 DataFrame으로 반환"""
    try:
        return pd.read_csv(filepath, encoding="cp949")
    except UnicodeDecodeError:
        return pd.read_csv(filepath, encoding="utf-8")

base_dir = os.path.dirname(os.path.abspath(__file__))


# ================================================================
# 3) Haversine 거리 계산 (직선거리)
# ================================================================
def haversine(lat1, lon1, lat2, lon2):
    """위도/경도 네 개를 받아 직선 거리(km)를 반환"""
    R = 6371  # km
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat1, lon1])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


# ================================================================
# 2-1) "35.123,129.456" → (35.123, 129.456) 파싱 함수
# ================================================================
def parse_point(point_str):
    """'35.123,129.456' → (lat, lon)"""
    try:
        lat, lon = map(float, point_str.split(','))
        return lat, lon
    except:
        return None, None


def haversine_from_point(user_lat, user_lon, point_str):
    lat2, lon2 = parse_point(point_str)
    if lat2 is None:
        return None
    return haversine(user_lat, user_lon, lat2, lon2)


# ================================================================
# 3) 사용자 러닝 기록 로드 (최근 5회 평균 거리)
# ================================================================
def load_user_pattern(user_id):
    df_user = pd.read_sql(f"""
        SELECT distance_km
        FROM running_record
        WHERE user_id = {user_id}
        ORDER BY start_time DESC
        LIMIT 5
    """, engine)

    if df_user.empty:
        return None

    return df_user["distance_km"].mean()


# ================================================================
# 4) 코스 데이터 로드 (CSV 파일에서)
# ================================================================
def load_course_data():
    """CSV 파일에서 코스 데이터 로드"""
    csv_path = os.path.join(base_dir, "data", "knn_course.csv")
    df = load_csv(csv_path)

    diff_map = {"초급": 1, "중급": 2, "상급": 3}
    df["difficulty_score"] = df["난이도"].map(diff_map).fillna(2)

    # start_point, end_point 컬럼 생성 (위도1,경도1 → "lat,lon" 형식)
    df["start_point"] = df["위도1"].astype(str) + "," + df["경도1"].astype(str)
    df["end_point"] = df["위도2"].astype(str) + "," + df["경도2"].astype(str)

    # CSV 컬럼명을 MySQL 형식으로 매핑
    df["distance_total_km"] = df["거리"]

    return df


# ================================================================
# 5) ORS 기반 평균 경사율 계산 함수
# ================================================================
def calculate_gradient_percent(row):
    start_raw = row.get("start_point", None)
    end_raw = row.get("end_point", None)

    if not start_raw or not end_raw:
        return None

    start_lat, start_lon = parse_point(start_raw)
    end_lat, end_lon = parse_point(end_raw)

    if start_lat is None or end_lat is None:
        return None

    coords = [
        (start_lon, start_lat),
        (end_lon,   end_lat)
    ]

    try:
        route = client.directions(
            coordinates=coords,
            profile="foot-walking",
            format="geojson",
            elevation=True
        )

        seg = route["features"][0]["properties"]["segments"][0]

        ascent = seg.get("ascent", None)
        dist   = seg.get("distance", None)

        if ascent is None or dist is None or dist <= 0:
            return None

        gradient_percent = (ascent / dist) * 100

        if gradient_percent < 0:
            return None

        return gradient_percent

    except Exception as e:
        print(f"❌ 경사도 계산 실패: {e}")
        return None


# ================================================================
# 6) 메인 추천 함수
# ================================================================
def recommend_courses(user_id, user_lat, user_lon, top_k=5):

    user_avg_dist = load_user_pattern(user_id)
    if user_avg_dist is None:
        return {"error": f"User {user_id} has no running records."}

    df = load_course_data()

    # 사용자 위치 → 코스 시작점 직선거리
    df["geo_distance_km"] = df["start_point"].apply(
        lambda p: haversine_from_point(user_lat, user_lon, p)
    ).fillna(9999)

    df["proximity_score"] = 1 / (1 + df["geo_distance_km"])

    df["dist_diff"] = np.abs(df["distance_total_km"] - user_avg_dist)
    df["distance_score"] = 1 / (1 + df["dist_diff"])

    df["gradient_percent"] = df.apply(calculate_gradient_percent, axis=1)

    df["gradient_score"] = df["gradient_percent"].apply(
        lambda x: 1 / (1 + x) if pd.notna(x) and x >= 0 else 0
    )

    # 🛠 수정된 최종 점수 (elevation_score → gradient_score)
    df["final_score"] = (
          0.5 * df["proximity_score"]
        + 0.3 * df["distance_score"]
        + 0.2 * df["gradient_score"]
    )

    recommended = df.sort_values("final_score", ascending=False).head(top_k)

    return {
        "user_id": user_id,
        "user_avg_distance": float(user_avg_dist),
        "recommended_count": len(recommended),
        "recommended_courses": recommended.to_dict(orient="records")
    }
