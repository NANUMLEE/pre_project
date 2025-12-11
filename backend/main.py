# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
from urllib.parse import quote
from datetime import datetime
from dotenv import load_dotenv
import os
import csv
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from typing import Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
import openrouteservice
import asyncio
from concurrent.futures import ThreadPoolExecutor
import uuid
import httpx
from fastapi import File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from calorie_model.calorie_model import predict_calorie

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
        print("✅ Users DB connected successfully!")
except Exception as e:
    print(f"❌ DB connection failed: {str(e)}")

# ================================
# OpenRouteService API 설정 (위치기반 추천)
# ================================
ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjA3YThlZjdiN2ViMzQwNmFhYTM3MGFlNzY4N2YxMjE3IiwiaCI6Im11cm11cjY0In0="
try:
    ors_client = openrouteservice.Client(key=ORS_API_KEY)
    print("✅ OpenRouteService connected successfully!")
except Exception as e:
    print(f"⚠️ OpenRouteService connection failed: {str(e)}")
    ors_client = None


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


# # CSV 데이터 로드 (서버 시작 시 1번만 읽음)
base_dir = os.path.dirname(os.path.abspath(__file__))
COURSES = load_csv(os.path.join(base_dir, "data", "러닝 코스 데이터_전처리(최종).csv"))
PLACES = load_csv(os.path.join(base_dir, "data", "러닝 장소 데이터_전처리(최종).csv"))


# ================================================================
# location-based model import
# ================================================================
try:
    from location import recommend_courses as recommend_location_based_courses
    print("✅ location-based model imported successfully")
except ImportError as e:
    print(f"❌ location-based model import failed: {str(e)}")
    recommend_location_based_courses = None


# ================================================================
# location-based model import (for recommended courses)
# ================================================================
try:
    from location_model import recommend_courses as recommend_courses_by_location
    print("✅ location-based model (for recommended courses) imported successfully")
except ImportError as e:
    print(f"❌ location-based model import failed: {str(e)}")
    recommend_courses_by_location = None


# ================================================================
# voice model import
# ================================================================
try:
    # whisper_project 경로를 sys.path에 추가
    whisper_project_path = os.path.join(os.path.dirname(base_dir), "whisper_project")
    if whisper_project_path not in sys.path:
        sys.path.insert(0, whisper_project_path)

    from runner_voice_model_memory import run_pipeline_bytes_no_tts
    print("✅ voice model imported successfully")
except ImportError as e:
    print(f"❌ voice model import failed: {str(e)}")
    run_pipeline_bytes_no_tts = None


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
    allow_credentials=False,  # credentials를 False로 변경 (allow_origins=["*"]와 함께 사용 불가)
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# =========================
# 음성 명령 기능 설정
# =========================

# ws_server.py 주소 (포트 8080)
# ngrok URL로 변경 (ws_server가 다른 컴퓨터에서 실행 중)
WS_SERVER_URL = "https://pa-unamazed-michiko.ngrok-free.dev"

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

class RunningRecordCreate(BaseModel):
    """러닝 기록 저장"""
    user_id: int
    start_time: str  # datetime string format: "YYYY-MM-DD HH:MM:SS"
    end_time: str    # datetime string format: "YYYY-MM-DD HH:MM:SS"
    distance_km: float
    pace_km: Optional[float] = None
    calories_kcal: Optional[float] = None
    start_point: Optional[str] = None
    end_point: Optional[str] = None
    via1_point: Optional[str] = None
    via2_point: Optional[str] = None
    via3_point: Optional[str] = None
    route: Optional[str] = None  # JSON string for route data

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

def get_user_avg_pace(user_id: int):
    """사용자의 평균 페이스 조회 (최근 5개 기록 기준)"""
    try:
        with engine.begin() as conn:
            query = text("""
                SELECT AVG(pace_km) as avg_pace
                FROM running_record
                WHERE user_id = :user_id
                ORDER BY start_time DESC
                LIMIT 5
            """)
            result = conn.execute(query, {"user_id": user_id}).fetchone()

            if result and result[0]:
                return float(result[0])
            else:
                return 6.0  # 기본값: 6분/km
    except Exception as e:
        print(f"❌ 평균 페이스 조회 실패: {str(e)}")
        return 6.0  # 오류 시 기본값

def create_user(email: str, name: str):
    """새로운 사용자 생성"""
    try:
        with engine.begin() as conn:
            query = text("INSERT INTO users (email, name) VALUES (:email, :name)")
            conn.execute(query, {"email": email, "name": name})
            # 같은 트랜잭션 내에서 생성된 사용자 조회
            select_query = text("SELECT user_id, name, email, gender, age, height_cm, weight_kg FROM users WHERE email = :email")
            result = conn.execute(select_query, {"email": email}).fetchone()
            if result:
                user = {
                    "user_id": result[0],
                    "name": result[1],
                    "email": result[2],
                    "gender": result[3],
                    "age": result[4],
                    "height_cm": result[5],
                    "weight_kg": result[6]
                }
                print(f"✅ 사용자 생성 성공: {email}")
                return user
            else:
                print(f"⚠️ 사용자 생성 후 조회 실패: {email}")
                return None
    except Exception as e:
        print(f"❌ 사용자 생성 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def save_running_record(record_data: RunningRecordCreate):
    """러닝 기록을 DB에 저장"""
    try:
        # record_id 생성 (rec001, rec002, ... 형식)
        with engine.begin() as conn:
            # 최근 record_id 조회
            max_id_query = text("SELECT MAX(CAST(SUBSTR(record_id, 4) AS UNSIGNED)) FROM running_record")
            max_id_result = conn.execute(max_id_query).fetchone()
            max_id = max_id_result[0] if max_id_result and max_id_result[0] else 0
            new_id = max_id + 1
            record_id = f"rec{str(new_id).zfill(3)}"  # rec001, rec002, ...

        with engine.begin() as conn:
            query = text("""
                INSERT INTO running_record
                (record_id, user_id, start_time, end_time, distance_km, pace_km, calories_kcal,
                 start_point, end_point, via1_point, via2_point, via3_point, route, duration_time)
                VALUES
                (:record_id, :user_id, :start_time, :end_time, :distance_km, :pace_km, :calories_kcal,
                 :start_point, :end_point, :via1_point, :via2_point, :via3_point, :route,
                 SEC_TO_TIME(TIMESTAMPDIFF(SECOND, :start_time, :end_time)))
            """)

            result = conn.execute(query, {
                "record_id": record_id,
                "user_id": record_data.user_id,
                "start_time": record_data.start_time,
                "end_time": record_data.end_time,
                "distance_km": record_data.distance_km,
                "pace_km": record_data.pace_km,
                "calories_kcal": record_data.calories_kcal,
                "start_point": record_data.start_point,
                "end_point": record_data.end_point,
                "via1_point": record_data.via1_point,
                "via2_point": record_data.via2_point,
                "via3_point": record_data.via3_point,
                "route": record_data.route
            })

            print(f"✅ 러닝 기록 저장 성공: record_id={record_id}, user_id={record_data.user_id}")
            return {
                "success": True,
                "record_id": record_id,
                "message": "러닝 기록이 저장되었습니다"
            }
    except Exception as e:
        print(f"❌ 러닝 기록 저장 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

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

# # 1) 러닝 코스 데이터 제공
@app.get("/api/courses")
def get_courses():
    """
    러닝 코스 데이터 제공
    """
    return {"courses": COURSES}


# # 2) 러닝 장소 데이터 제공
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
                    TIMESTAMPDIFF(SECOND, start_time, end_time) as duration_seconds,
                    calories_kcal
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
                        "duration": int(r[5]) if r[5] else 0,
                        "calories_kcal": float(r[6]) if r[6] else 0.0
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

@app.post("/api/running-record")
def create_running_record(request: RunningRecordCreate):
    """
    러닝 기록을 DB에 저장

    요청 데이터:
    {
        "user_id": 1,
        "start_time": "2025-11-25 10:30:00",
        "end_time": "2025-11-25 11:00:00",
        "distance_km": 5.2,
        "pace_km": 5.77,
        "calories_kcal": 312,
        "start_point": "서울시 강남구",
        "end_point": "서울시 강남구"
    }
    """
    try:
        print(f"📍 러닝 기록 저장 요청 수신")
        print(f"   - user_id: {request.user_id} (타입: {type(request.user_id)})")
        print(f"   - start_time: {request.start_time} (타입: {type(request.start_time)})")
        print(f"   - end_time: {request.end_time} (타입: {type(request.end_time)})")
        print(f"   - distance_km: {request.distance_km} (타입: {type(request.distance_km)})")
        print(f"   - pace_km: {request.pace_km}")
        print(f"   - calories_kcal: {request.calories_kcal}")

        result = save_running_record(request)

        if result["success"]:
            return {
                "success": True,
                "record_id": result["record_id"],
                "message": result["message"]
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 러닝 기록 저장 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"러닝 기록 저장 실패: {str(e)}")


# ================================
#     위치 기반 추천 코스 API (Location-based)
# ================================
@app.get("/api/recommended-courses")
def get_recommended_courses(user_id: int = 1, user_lat: float = 37.4979, user_lon: float = 127.0276, k: int = 5):
    """
    사용자의 위치 기반 추천 러닝 코스 API (location_model.py 사용)

    파라미터:
    - user_id: 사용자 ID
    - user_lat: 사용자 위도 (기본: 강남역 위도)
    - user_lon: 사용자 경도 (기본: 강남역 경도)
    - k: 추천할 코스 개수 (기본: 5)

    사용 예시: /api/recommended-courses?user_id=1&user_lat=37.4979&user_lon=127.0276&k=5
    """
    try:
        print(f"\n{'='*60}")
        print(f"📍 위치 기반 추천 코스 요청: user_id={user_id}, lat={user_lat}, lon={user_lon}, k={k}")
        print(f"{'='*60}")

        if recommend_courses_by_location is None:
            raise Exception("location-based model을 불러올 수 없습니다")

        result = recommend_courses_by_location(user_id, user_lat, user_lon, top_k=k)

        print(f"✅ 추천 완료: {result.get('recommended_count', 0)}개 코스")
        print(f"{'='*60}\n")

        return result
    except Exception as e:
        print(f"❌ 위치 기반 추천 API 에러: {str(e)}")
        import traceback
        traceback.print_exc()
        print(f"{'='*60}\n")
        return {
            "status": "error",
            "user_id": user_id,
            "recommended_count": 0,
            "recommended_courses": [],
            "error": str(e),
            "message": "위치 기반 추천에 실패했습니다"
        }


@app.get("/api/nearby-running-courses")
def get_nearby_running_courses(user_id: int = 1, user_lat: float = 37.4979, user_lon: float = 127.0276, k: int = 5):
    """
    사용자 위치 기반 추천 러닝 코스 API

    파라미터:
    - user_id: 사용자 ID
    - user_lat: 사용자 위도 (기본: 강남역 위도)
    - user_lon: 사용자 경도 (기본: 강남역 경도)
    - k: 추천할 코스 개수 (기본: 5)

    사용 예시: /api/nearby-running-courses?user_id=1&user_lat=37.4979&user_lon=127.0276&k=5
    """
    try:
        if recommend_location_based_courses is None:
            raise Exception("location-based model을 불러올 수 없습니다")

        result = recommend_location_based_courses(user_id, user_lat, user_lon, top_k=k)
        return result
    except Exception as e:
        print(f"❌ 위치기반 추천 API 에러: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "user_id": user_id,
            "error": str(e),
            "message": "주변 러닝 코스 추천에 실패했습니다"
        }


# ================================
#     코스별 칼로리 조회 API
# ================================

@app.get("/api/course-calorie-info")
def get_course_calorie_info(user_id: int, course_name: str = None, course_index: int = None):
    """
    사용자가 특정 코스에서 소모할 칼로리 조회

    파라미터:
    - user_id: 사용자 ID (필수)
    - course_name: 코스명 (course_index 없으면 필수)
    - course_index: 코스 인덱스 (course_name 없으면 필수)

    사용 예시:
    
    - /api/course-calorie-info?user_id=1&course_name=한강공원
    - /api/course-calorie-info?user_id=1&course_index=0
    """
    try:
        # 사용자 정보 조회
        user = get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail=f"사용자 {user_id}를 찾을 수 없습니다")

        # 사용자 정보 추출 및 변환
        user_gender_raw = user.get("gender")
        # DB의 'M', 'F', 'O' → 모델이 기대하는 'Male', 'Female'로 변환
        gender_map = {'M': 'Male', 'F': 'Female', 'O': 'Male'}
        user_gender = gender_map.get(user_gender_raw, 'Male') if user_gender_raw else 'Male'

        user_age = user.get("age") or 35
        user_height_cm = user.get("height_cm") or 170
        user_weight_kg = user.get("weight_kg") or 70

        # 코스 찾기
        selected_course = None

        if course_index is not None and 0 <= course_index < len(COURSES):
            # 인덱스로 찾기
            selected_course = COURSES[course_index]
        elif course_name:
            # 코스명으로 찾기
            for course in COURSES:
                if course.get("러닝코스 명") == course_name:
                    selected_course = course
                    break

        if not selected_course:
            raise HTTPException(status_code=404, detail="해당 코스를 찾을 수 없습니다")

        # 거리 파싱
        distance_raw = selected_course.get("거리", "5km")
        if isinstance(distance_raw, str):
            distance_km = float(distance_raw.strip().replace('km', '').replace('Km', '').strip())
        else:
            distance_km = float(distance_raw) if distance_raw else 5.0

        # 사용자의 평균 페이스 조회 (최근 5개 기록 기준)
        user_avg_pace = get_user_avg_pace(user_id)

        # 러닝 시간 계산
        running_time_min = distance_km * user_avg_pace

        # 시작/종료 시간 생성
        from datetime import timedelta
        start_time = datetime.now()
        end_time = start_time + timedelta(minutes=running_time_min)

        # 칼로리 예측 (CatBoost 모델)
        predicted_calories = predict_calorie(
            user_age, user_height_cm, user_weight_kg, start_time, end_time
        )

        # 소수점 2자리 반올림
        predicted_calories = round(predicted_calories, 2)

        return {
            "success": True,
            "user_id": user_id,
            "user_info": {
                "name": user.get("name"),
                "gender": user_gender,
                "age": user_age,
                "height_cm": user_height_cm,
                "weight_kg": user_weight_kg
            },
            "course_info": {
                "course_name": selected_course.get("러닝코스 명"),
                "distance_km": distance_km,
                "estimated_time_min": round(running_time_min, 2),
                "difficulty": selected_course.get("난이도", "정보없음")
            },
            "calorie_info": {
                "predicted_calories": predicted_calories,
                "calorie_per_km": round(predicted_calories / distance_km, 2) if distance_km > 0 else 0,
                "unit": "kcal"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 칼로리 조회 에러: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"칼로리 조회 실패: {str(e)}")


@app.get("/")
def root():
    return {"message": "Runnerism API 서버 작동 중!"}


# ================================
#     음성 명령 API
# ================================

async def get_nearby_runners_from_ws(user_id: str):
    """
    ws_server.py에서 주변 러너 정보를 가져옴

    Returns:
        List[Dict]: [{"id": "1", "name": "김시현"}, ...]
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WS_SERVER_URL}/api/nearby-runners/{user_id}",
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("runners", [])
            else:
                print(f"⚠️  ws_server 응답 실패: {response.status_code}")
                return []
    except Exception as e:
        print(f"❌ ws_server 연결 실패: {e}")
        # ws_server가 꺼져있어도 빈 리스트 반환 (에러는 발생시키지 않음)
        return []


@app.post("/api/stt")
async def stt_only(file: UploadFile = File(...)):
    """
    간단한 STT 전용 API (Wakeword 감지용)
    - 음성 파일만 받아서 텍스트만 반환
    - Intent 파싱 없음

    출력:
        {
            "success": True,
            "text": "리즘아 주변에 누가 뛰고 있어"
        }
    """
    try:
        print(f"\n{'='*60}")
        print(f"🎤 STT 요청 (Wakeword 감지용)")

        # 1) 업로드된 파일을 bytes로 읽기
        audio_bytes = await file.read()
        print(f"📦 오디오 크기: {len(audio_bytes)} bytes")

        # 2) Whisper STT만 수행
        if run_pipeline_bytes_no_tts is None:
            raise Exception("voice model이 로드되지 않았습니다")

        # 간단한 STT만 호출 (임시로 빈 nearby_runners 전달)
        result = await run_pipeline_bytes_no_tts(
            audio_bytes=audio_bytes,
            nearby_runners=[],
            from_user_id="temp"
        )

        raw_text = result["command_info"]["raw_text"]
        print(f"🎧 STT 결과: {raw_text}")
        print(f"{'='*60}\n")

        return {
            "success": True,
            "text": raw_text
        }

    except Exception as e:
        print(f"❌ STT 처리 실패: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "text": ""
        }


@app.post("/api/voice-command")
async def voice_command(
    userId: str = Form(...),
    file: UploadFile = File(...)
):
    """
    음성 명령 처리 API (Web Speech API 전환)
    - STT만 수행
    - TTS 텍스트만 반환 (MP3 생성 X)

    입력:
        - userId: 사용자 ID (Form)
        - file: 음성 파일 Blob (File)

    출력:
        {
            "success": True,
            "intent": "ASK_NEARBY_RUNNER_WHO",
            "rawText": "주변에 누가 뛰고 있어",
            "ttsText": "김시현, 박신혜 등 4명이 뛰고 있습니다.",
            "emojiType": "FIGHTING",
            "targetName": "김시현"
        }
    """
    try:
        print(f"\n{'='*60}")
        print(f"🎤 음성 명령 요청 - userId: {userId}")

        # 1) 업로드된 파일을 bytes로 읽기
        audio_bytes = await file.read()
        print(f"📦 오디오 크기: {len(audio_bytes)} bytes")

        # 2) ws_server에서 주변 러너 정보 가져오기
        nearby_runners = await get_nearby_runners_from_ws(userId)
        print(f"👥 주변 러너: {len(nearby_runners)}명")

        # 3) 음성 처리 파이프라인 실행 (TTS 생성 제거)
        if run_pipeline_bytes_no_tts is None:
            raise Exception("voice model이 로드되지 않았습니다")

        result = await run_pipeline_bytes_no_tts(
            audio_bytes=audio_bytes,
            nearby_runners=nearby_runners,
            from_user_id=userId
        )

        # 4) 결과 추출
        command_info = result["command_info"]
        tts_text = result["tts_text"]
        intent = command_info["intent"]
        raw_text = command_info["raw_text"]

        print(f"🎧 STT 결과: {raw_text}")
        print(f"🧠 Intent: {intent}")
        print(f"🗣  TTS 문장: {tts_text}")

        # 5) 이모티콘 전송 처리 (SEND_EMOJI_BROADCAST 또는 SEND_EMOJI_DIRECT)
        if intent in ("SEND_EMOJI_BROADCAST", "SEND_EMOJI_DIRECT"):
            try:
                emoji_type = command_info.get("emoji_type") or "FIGHTING"

                # 이모티콘 받을 사용자 결정
                to_user_ids = []
                if intent == "SEND_EMOJI_BROADCAST":
                    to_user_ids = ["ALL"]
                elif intent == "SEND_EMOJI_DIRECT":
                    target_name = command_info.get("target_name")
                    # nearby_runners에서 target_name과 일치하는 러너 찾기
                    target = next(
                        (r for r in nearby_runners if r.get("name") == target_name),
                        None
                    )
                    if target:
                        to_user_ids = [target.get("id")]

                # ws_server에 이모티콘 전송 요청
                if to_user_ids:
                    async with httpx.AsyncClient() as client:
                        emoji_response = await client.post(
                            f"{WS_SERVER_URL}/api/send-emoji",
                            json={
                                "from_user_id": userId,
                                "to_user_ids": to_user_ids,
                                "emoji_type": emoji_type
                            },
                            timeout=5.0
                        )
                        if emoji_response.status_code == 200:
                            print(f"✅ 이모티콘 전송 성공")
                        else:
                            print(f"⚠️  이모티콘 전송 실패: {emoji_response.status_code}")
            except Exception as emoji_error:
                print(f"⚠️  이모티콘 전송 중 오류 (계속 진행): {emoji_error}")

        print(f"{'='*60}\n")

        # 6) 응답 반환 (audioUrl 제거, 텍스트만 반환)
        return {
            "success": True,
            "intent": intent,
            "rawText": raw_text,
            "ttsText": tts_text,
            "emojiType": command_info.get("emoji_type"),
            "targetName": command_info.get("target_name")
        }

    except Exception as e:
        print(f"❌ 음성 명령 처리 실패: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "ttsText": "음성 명령 처리 중 오류가 발생했습니다."
        }


@app.get("/api/emoji-tts")
async def emoji_tts(from_name: str, emoji_type: str):
    """
    이모티콘 수신 TTS 텍스트 반환 (Web Speech API 전환)
    - MP3 생성 제거
    - 텍스트만 반환

    파라미터:
        - from_name: 보낸 사람 이름 (예: 스피드러너)
        - emoji_type: 이모티콘 타입 (FIGHTING, HIGHFIVE, FIRE, 💪, 🙌, 🔥)

    반환:
        {
            "success": true,
            "text": "스피드러너님이 화이팅 이모티콘을 보냈습니다."
        }
    """
    try:
        print(f"🔊 이모티콘 TTS 텍스트 생성: from_name={from_name}, emoji_type={emoji_type}")

        # 이모티콘 타입을 한글 이름으로 변환
        emoji_map = {
            'FIGHTING': '화이팅',
            'HIGHFIVE': '하이파이브',
            'FIRE': '열정',
            '💪': '화이팅',
            '🙌': '하이파이브',
            '🔥': '열정',
        }
        emoji_korean = emoji_map.get(emoji_type, '이모티콘')

        # TTS 문장 생성
        tts_text = f"{from_name}님이 {emoji_korean} 이모티콘을 보냈습니다."
        print(f"📝 TTS 문장: {tts_text}")

        return {
            "success": True,
            "text": tts_text
        }

    except Exception as e:
        print(f"❌ 이모티콘 TTS 텍스트 생성 실패: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # WebSocket 서버와 함께 실행
    print("🚀 Runnerism API 서버 시작...")
    print("📡 엔드포인트:")
    print("   - 날씨: http://localhost:8000/weather")
    print("   - 러닝 코스: http://localhost:8000/api/courses")
    print("   - 러닝 장소: http://localhost:8000/api/places")
    uvicorn.run(app, host="0.0.0.0", port=8000)