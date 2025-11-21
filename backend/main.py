import requests
from urllib.parse import quote
from datetime import datetime
from dotenv import load_dotenv
import os
import csv
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy import create_engine, text
from pydantic import BaseModel

# 환경 변수 로드
load_dotenv()
SERVICE_KEY = os.getenv("SERVICE_KEY")

if not SERVICE_KEY:
    raise ValueError("❌ SERVICE_KEY가 .env에서 로드되지 않았습니다.")

# ================================
# MySQL DB 연결 설정
# ================================
DB_URL = "mysql+pymysql://root:12345@localhost/Users"
engine = create_engine(DB_URL, echo=False)

# 연결 테스트
try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✅ Users DB 연결 성공!")
except Exception as e:
    print(f"❌ DB 연결 실패: {str(e)}")


# ✅ CSV 파일 읽는 함수
def load_csv(filepath):
    """CSV 파일을 읽어 Dict 형태 리스트로 반환"""
    data = []
    with open(filepath, "r", encoding="cp949") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # 문자열 float 변환
            def to_float(v):
                try:
                    return float(v) if v != "" else None
                except:
                    return None

            # 시작지점
            row["start_lat"] = to_float(row.get("위도1"))
            row["start_lng"] = to_float(row.get("경도1"))

            # 끝지점
            row["end_lat"] = to_float(row.get("위도2"))
            row["end_lng"] = to_float(row.get("경도2"))

            # 경유지(최대 3개라고 했지)
            row["via"] = []
            for i in range(3, 6):  # 위도3/경도3, 위도4/경도4, 위도5/경도5
                lat_key = f"위도{i}"
                lng_key = f"경도{i}"
                lat = to_float(row.get(lat_key))
                lng = to_float(row.get(lng_key))

                if lat and lng:
                    row["via"].append({
                        "lat": lat,
                        "lng": lng
                    })

            # ⭐ 난이도 필드 추가
            row["difficulty"] = row.get("난이도")  # 또는 difficulty_level 등 이름 변경 가능
   
            data.append(row)

    return data


# 📌 CSV 데이터 로드 (서버 시작 시 1번만 읽음)
COURSES = load_csv("./data/러닝 코스 데이터_전처리(최종).csv")
PLACES = load_csv("./data/러닝 장소 데이터_전처리(최종).csv")


# 기상청 API 호출 함수
def fetch_data_from_kma(current_time, category, fcst_time):
    base_date = current_time.strftime("%Y%m%d")
    params = {
        'serviceKey': quote(SERVICE_KEY, safe=''),
        'numOfRows': 500,
        'pageNo': 1,
        'dataType': 'JSON',
        'base_date': base_date,
        'base_time': '0200',
        'nx': 98,
        'ny': 75
    }

    url = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
    response = requests.get(url, params=params)
    data = response.json()

    items = data['response']['body']['items']['item']
    found = next((i for i in items if i["category"] == category and i["fcstTime"] == fcst_time), None)
    return found["fcstValue"] if found else None

# FastAPI 서버
app = FastAPI()

# React CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ================================
# Pydantic 데이터 모델
# ================================
class UserLogin(BaseModel):
    """로그인 요청 데이터"""
    email: str
    password: str = None  # 선택사항

class UserSignUp(BaseModel):
    """회원가입 요청 데이터"""
    email: str
    name: str
    password: str = None

class UserInfo(BaseModel):
    """사용자 정보"""
    user_id: int
    name: str
    email: str
    gender: str = None
    age: int = None
    height_cm: int = None
    weight_kg: int = None

class UserProfileUpdate(BaseModel):
    """사용자 프로필 업데이트"""
    user_id: int
    age: int
    gender: str
    height_cm: int
    weight_kg: int

# ================================
# Users DB 조회 함수
# ================================
def get_user_by_email(email: str):
    """이메일로 사용자 조회"""
    try:
        with engine.begin() as conn:
            query = text("SELECT user_id, name, email, gender, age, height_cm, weight_kg FROM users WHERE email = :email")
            result = conn.execute(query, {"email": email}).fetchone()
            if result:
                return {
                    "user_id": result[0],
                    "name": result[1],
                    "email": result[2],
                    "gender": result[3],
                    "age": result[4],
                    "height_cm": result[5],
                    "weight_kg": result[6]
                }
            return None
    except Exception as e:
        print(f"❌ DB 조회 실패: {str(e)}")
        return None

def get_user_by_id(user_id: int):
    """사용자 ID로 사용자 조회"""
    try:
        with engine.begin() as conn:
            query = text("SELECT user_id, name, email, gender, age, height_cm, weight_kg FROM users WHERE user_id = :user_id")
            result = conn.execute(query, {"user_id": user_id}).fetchone()
            if result:
                return {
                    "user_id": result[0],
                    "name": result[1],
                    "email": result[2],
                    "gender": result[3],
                    "age": result[4],
                    "height_cm": result[5],
                    "weight_kg": result[6]
                }
            return None
    except Exception as e:
        print(f"❌ DB 조회 실패: {str(e)}")
        return None

def create_user(email: str, name: str):
    """새로운 사용자 생성"""
    try:
        with engine.begin() as conn:
            query = text("INSERT INTO users (email, name) VALUES (:email, :name)")
            conn.execute(query, {"email": email, "name": name})
            # 생성된 사용자 조회
            return get_user_by_email(email)
    except Exception as e:
        print(f"❌ 사용자 생성 실패: {str(e)}")
        return None

def get_user_avg_distance(user_id: int):
    """사용자의 평균 러닝 거리 조회"""
    try:
        with engine.begin() as conn:
            query = text("""
                SELECT AVG(distance_km) as avg_distance, COUNT(*) as total_runs
                FROM running_record
                WHERE user_id = :user_id
            """)
            result = conn.execute(query, {"user_id": user_id}).fetchone()
            if result and result[0]:
                return {
                    "avg_distance": float(result[0]),
                    "total_runs": result[1]
                }
            return {"avg_distance": 5.0, "total_runs": 0}  # 기본값
    except Exception as e:
        print(f"❌ 평균 거리 조회 실패: {str(e)}")
        return {"avg_distance": 5.0, "total_runs": 0}

def get_weather():
    now = datetime.now()
    time = "0300"  # 가장 최신 예보 시간

    temp = fetch_data_from_kma(now, "TMP", time)
    sky = fetch_data_from_kma(now, "SKY", time)
    humidity = fetch_data_from_kma(now, "REH", time)
    wind = fetch_data_from_kma(now, "WSD", time)

    sky_map = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림"
    }

    # 러닝 추천 메시지 결정
    if temp:
        t = int(temp)
        if 10 <= t <= 22:
            msg = "🏃‍♂️ 러닝하기 좋은 날씨입니다!"
        elif t < 5:
            msg = "🥶 너무 춥습니다!"
        elif t > 28:
            msg = "🥵 너무 더워요 조심하세요!"
        else:
            msg = "🙂 무난한 날씨입니다!"
    else:
        msg = "⚠️ 날씨 데이터를 불러오지 못했습니다."

    # 디버깅 출력
    print("=== 날씨 API ===")
    print("기온:", temp)
    print("하늘:", sky)
    print("습도:", humidity)
    print("풍속:", wind)

    # React에서 받을 JSON
    return {
        "temp": temp,
        "sky": sky_map.get(sky, "정보 없음"),
        "humidity": humidity,
        "wind": wind,
        "message": msg
    }

@app.get("/weather")
def weather_endpoint():
    try:
        return get_weather()
    except Exception as e:
        print(f"❌ 날씨 API 에러: {str(e)}")
        return {
            "temp": "0",
            "sky": "정보 없음",
            "humidity": "0",
            "wind": "0",
            "message": f"⚠️ 에러: {str(e)}"
        }

@app.get("/api/weather/today")
def weather_today():
    try:
        result = get_weather()
        print("======="*10)
        print(result)
        print("======="*10)

        return result
    except Exception as e:
        print(f"❌ 날씨 API 에러: {str(e)}")
        return {
            "temp": "0",
            "sky": "정보 없음",
            "humidity": "0",
            "wind": "0",
            "message": f"⚠️ 에러: {str(e)}"
        }


# ================================
#     러닝 코스 & 장소 API 엔드포인트
# ================================

# 📌 1) 러닝 코스 데이터 제공
@app.get("/api/courses")
def get_courses():
    return {"courses": COURSES}


# 📌 2) 러닝 장소 데이터 제공
@app.get("/api/places")
def get_places():
    return {"places": PLACES}


# ================================
#     사용자 인증 API
# ================================

@app.post("/api/login")
def login(request: UserLogin):
    """
    사용자 로그인 (이메일 기반)
    """
    try:
        user = get_user_by_email(request.email)
        if not user:
            raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다")

        # 사용자의 러닝 기록 조회
        user_stats = get_user_avg_distance(user["user_id"])

        return {
            "success": True,
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "nickname": user["name"],
            "profileImage": None,
            "totalRuns": user_stats["total_runs"],
            "totalDistance": user_stats["avg_distance"] * user_stats["total_runs"] if user_stats["total_runs"] > 0 else 0,
            "gender": user["gender"],
            "age": user["age"],
            "height": user["height_cm"],
            "weight": user["weight_kg"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 로그인 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"로그인 실패: {str(e)}")

@app.post("/api/register")
def register(request: UserSignUp):
    """
    사용자 회원가입 (이메일, 이름 기반)
    """
    try:
        # 기존 사용자 확인
        existing_user = get_user_by_email(request.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="이미 존재하는 이메일입니다")

        # 새로운 사용자 생성
        user = create_user(request.email, request.name)
        if not user:
            raise HTTPException(status_code=500, detail="사용자 생성 실패")

        return {
            "success": True,
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "nickname": user["name"],
            "profileImage": None,
            "totalRuns": 0,
            "totalDistance": 0
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 회원가입 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"회원가입 실패: {str(e)}")

@app.get("/api/user/{user_id}")
def get_user(user_id: int):
    """
    사용자 정보 조회
    """
    try:
        user = get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

        # 사용자의 러닝 기록 조회
        user_stats = get_user_avg_distance(user_id)

        return {
            "success": True,
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "nickname": user["name"],
            "totalRuns": user_stats["total_runs"],
            "totalDistance": user_stats["avg_distance"] * user_stats["total_runs"] if user_stats["total_runs"] > 0 else 0,
            "gender": user["gender"],
            "age": user["age"],
            "height": user["height_cm"],
            "weight": user["weight_kg"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 사용자 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"사용자 조회 실패: {str(e)}")

@app.get("/api/user/records/{email}")
def get_user_running_records(email: str):
    """
    사용자의 모든 러닝 기록 조회 (email 기반)
    - 누적 거리: SUM(distance_km)
    - 총 운동시간: SUM(TIMESTAMPDIFF(SECOND, start_time, end_time))
    - 평균 페이스: AVG(pace_km)
    - 평균 거리: AVG(distance_km)
    """
    try:
        with engine.begin() as conn:
            # 사용자 ID 조회
            user_query = text("SELECT user_id FROM users WHERE email = :email")
            user_result = conn.execute(user_query, {"email": email}).fetchone()

            if not user_result:
                raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

            user_id = user_result[0]

            # 통계 계산을 위한 쿼리
            stats_query = text("""
                SELECT
                    COUNT(*) as total_runs,
                    SUM(distance_km) as total_distance,
                    AVG(distance_km) as avg_distance,
                    AVG(pace_km) as avg_pace,
                    SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) as total_duration_seconds
                FROM running_record
                WHERE user_id = :user_id
            """)
            stats_result = conn.execute(stats_query, {"user_id": user_id}).fetchone()

            total_runs = stats_result[0] or 0
            total_distance = float(stats_result[1]) if stats_result[1] else 0.0
            avg_distance = float(stats_result[2]) if stats_result[2] else 0.0
            avg_pace = float(stats_result[3]) if stats_result[3] else 0.0
            total_duration_seconds = stats_result[4] or 0

            print(f"📊 사용자 {email}의 러닝 통계:")
            print(f"   - 총 러닝 횟수: {total_runs}")
            print(f"   - 누적 거리: {total_distance} km")
            print(f"   - 평균 거리: {avg_distance} km")
            print(f"   - 평균 페이스: {avg_pace} min/km")
            print(f"   - 총 운동시간: {total_duration_seconds} 초")

            # 러닝 기록 조회
            records_query = text("""
                SELECT
                    record_id,
                    start_time,
                    end_time,
                    distance_km,
                    pace_km,
                    TIMESTAMPDIFF(SECOND, start_time, end_time) as duration_seconds
                FROM running_record
                WHERE user_id = :user_id
                ORDER BY start_time DESC
            """)
            records = conn.execute(records_query, {"user_id": user_id}).fetchall()

            return {
                "success": True,
                "email": email,
                "user_id": user_id,
                "totalDistance": round(total_distance, 2),
                "totalDuration": int(total_duration_seconds),
                "avgPace": round(avg_pace, 2),
                "avgDistance": round(avg_distance, 2),
                "totalRuns": total_runs,
                "records": [
                    {
                        "id": r[0],
                        "date": r[1].isoformat() if hasattr(r[1], 'isoformat') else str(r[1]),
                        "distance": float(r[3]),
                        "pace": float(r[4]) if r[4] else 0.0,
                        "duration": int(r[5]) if r[5] else 0
                    }
                    for r in records
                ]
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 러닝 기록 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"러닝 기록 조회 실패: {str(e)}")

@app.post("/api/user/profile")
def update_user_profile(request: UserProfileUpdate):
    """
    사용자 프로필 정보 업데이트
    """
    try:
        user_id = request.user_id
        age = request.age
        gender = request.gender
        height_cm = request.height_cm
        weight_kg = request.weight_kg

        print(f"📝 프로필 업데이트 요청: user_id={user_id}, age={age}, gender={gender}, height={height_cm}, weight={weight_kg}")

        with engine.begin() as conn:
            # 프로필 정보 업데이트
            query = text("""
                UPDATE users
                SET age = :age, gender = :gender, height_cm = :height_cm, weight_kg = :weight_kg
                WHERE user_id = :user_id
            """)

            result = conn.execute(query, {
                "user_id": user_id,
                "age": age,
                "gender": gender,
                "height_cm": height_cm,
                "weight_kg": weight_kg
            })

            print(f"✅ 프로필 업데이트 완료: {result.rowcount}개 행 수정됨")

        # 업데이트된 사용자 정보 조회
        updated_user = get_user_by_id(user_id)

        return {
            "success": True,
            "message": "프로필이 업데이트되었습니다",
            "user": updated_user
        }

    except ValueError as e:
        print(f"❌ 값 오류: {str(e)}")
        raise HTTPException(status_code=400, detail=f"잘못된 데이터 형식: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 프로필 업데이트 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"프로필 업데이트 실패: {str(e)}")


# ================================
#     맞춤형 추천 코스 API
# ================================

def hybrid_recommend(user_id: int, k=5):
    """
    사용자별 맞춤 코스 추천 (DB 기반)
    - 사용자의 평균 러닝 거리를 조회
    - 난이도 클러스터 결정 (0=초급, 1=중급, 2=상급)
    - 같은 난이도의 코스에서 거리 유사도로 추천
    """
    try:
        # 1) 사용자 평균 거리 조회
        user_stats = get_user_avg_distance(user_id)
        avg_distance = user_stats.get("avg_distance", 5.0)

        # 2) 사용자 클러스터 결정 (거리 기반)
        if avg_distance <= 3:
            user_cluster = 0  # 초급
            difficulty_filter = "초급"
        elif avg_distance <= 7:
            user_cluster = 1  # 중급
            difficulty_filter = "중급"
        else:
            user_cluster = 2  # 상급
            difficulty_filter = "상급"

        # 3) 같은 난이도의 코스 필터링
        filtered_courses = [
            course for course in COURSES
            if course.get("difficulty") == difficulty_filter
        ]

        # 4) 사용자 거리와 유사한 코스 정렬 (KNN 유사도)
        for course in filtered_courses:
            distance = float(course.get("distance_km", 0)) if course.get("distance_km") else 0
            course["similarity_score"] = abs(distance - avg_distance)

        # 유사도가 낮은 순서로 정렬 (낮을수록 유사함)
        sorted_courses = sorted(filtered_courses, key=lambda c: c["similarity_score"])[:k]

        # similarity_score 제거 (응답에서 불필요)
        for course in sorted_courses:
            course.pop("similarity_score", None)

        return {
            "user_id": user_id,
            "user_cluster": user_cluster,
            "difficulty": difficulty_filter,
            "avg_distance": avg_distance,
            "recommended_courses": sorted_courses
        }
    except Exception as e:
        print(f"❌ 추천 함수 에러: {str(e)}")
        return {
            "user_id": user_id,
            "error": str(e),
            "recommended_courses": []
        }


@app.get("/api/recommended-courses")
def get_recommended_courses(user_id: int = 1, k: int = 5):
    """
    사용자별 맞춤 추천 코스 API
    """
    try:
        result = hybrid_recommend(user_id, k)
        return result
    except Exception as e:
        print(f"❌ 추천 API 에러: {str(e)}")
        return {
            "user_id": user_id,
            "user_cluster": -1,
            "recommended_courses": [],
            "error": str(e)
        }


@app.get("/")
def root():
    return {"message": "Runnerism API 서버 작동 중!"}


if __name__ == "__main__":
    # WebSocket 서버와 함께 실행
    print("🚀 Runnerism API 서버 시작...")
    print("📡 엔드포인트:")
    print("   - 날씨: http://localhost:8000/weather")
    print("   - 러닝 코스: http://localhost:8000/api/courses")
    print("   - 러닝 장소: http://localhost:8000/api/places")
    uvicorn.run(app, host="0.0.0.0", port=8000)