import requests
from urllib.parse import quote
from datetime import datetime
from dotenv import load_dotenv
import os
import csv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# 환경 변수 로드
load_dotenv()
SERVICE_KEY = os.getenv("SERVICE_KEY")

if not SERVICE_KEY:
    raise ValueError("❌ SERVICE_KEY가 .env에서 로드되지 않았습니다.")


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