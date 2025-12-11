"""
WebSocket 서버 - 실시간 GPS 위치 공유
=====================================

기능:
- 클라이언트로부터 GPS 위치 데이터 수신
- 모든 클라이언트에게 위치 정보 실시간 브로드캐스트
- 10km 반경 필터링 (클라이언트에서 처리)
- 자동 재연결 및 오류 처리

사용법:
    python ws_server.py

또는 main.py와 함께 실행:
    uvicorn ws_server:app --host 0.0.0.0 --port 8000

주의:
    - ngrok을 사용할 경우 wss:// (WebSocket Secure) 사용
    - 클라이언트는 프론트엔드의 useWebSocket 훅 사용
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Set, List, Dict
import json
import uvicorn
from sqlalchemy import create_engine, text
import math

# FastAPI 앱 생성
app = FastAPI(title="GPS Location Sharing Server")

# CORS 설정 - 모든 도메인 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ================================
# MySQL DB 연결 설정
# ================================
DB_URL = "mysql+pymysql://root:1234@localhost/Users"
engine = create_engine(DB_URL, echo=False)

def get_user_name(user_id: str) -> str:
    """user_id로 users 테이블에서 name 조회"""
    try:
        # user_id를 정수로 변환 (DB는 INT 타입)
        user_id_int = int(user_id)
        with engine.connect() as conn:
            query = text("SELECT name FROM users WHERE user_id = :user_id")
            result = conn.execute(query, {"user_id": user_id_int}).fetchone()
            if result:
                name = result[0]
                print(f"✅ name 조회 성공: user_id={user_id_int} → name={name}")
                return name
            else:
                print(f"⚠️ name을 찾을 수 없음: user_id={user_id_int}")
                return user_id  # name이 없으면 user_id 반환
    except ValueError:
        print(f"❌ user_id 타입 변환 실패: {user_id} (정수가 아님)")
        return user_id
    except Exception as e:
        print(f"❌ 사용자 name 조회 실패 ({user_id}): {str(e)}")
        return user_id  # 에러 시 user_id 반환


class ConnectionManager:
    """
    WebSocket 연결을 관리하는 클래스

    기능:
    - 클라이언트 연결/해제 관리
    - userId 기반 사용자 위치 정보 저장 (동일한 userId = 동일한 사용자)
    - 모든 클라이언트에게 브로드캐스트
    """

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        # userId 기반으로 사용자 관리: {userId: {websocket, id, latitude, longitude, timestamp}}
        self.user_locations = {}  # userId -> user_data
        self.client_to_user = {}  # websocket -> userId (빠른 조회용)
        self.client_count = 0

    async def connect(self, websocket: WebSocket):
        """새로운 클라이언트 연결"""
        await websocket.accept()
        self.active_connections.add(websocket)
        self.client_count += 1
        print(f"✅ 클라이언트 연결됨 (총 {len(self.active_connections)}명)")

    async def disconnect(self, websocket: WebSocket):
        """클라이언트 연결 해제 및 해당 사용자 위치 정보 삭제"""
        self.active_connections.discard(websocket)

        # 해당 websocket의 userId 조회
        userId = self.client_to_user.pop(websocket, None)

        # userId 기반 사용자 정보에서 해당 사용자 완전 삭제
        user_was_removed = False
        if userId and userId in self.user_locations:
            # 위치 정보 삭제 (사용자가 나갔으므로)
            del self.user_locations[userId]
            user_was_removed = True
            print(f"❌ userId '{userId}' 연결 해제 및 위치 정보 삭제 (남은 클라이언트: {len(self.active_connections)}명)")
        else:
            print(f"❌ 클라이언트 연결 해제 (남은 클라이언트: {len(self.active_connections)}명)")

        # 사용자가 삭제되었으면 모든 클라이언트에게 업데이트된 위치 정보 브로드캐스트
        if user_was_removed:
            await self.broadcast({
                "type": "locations",
                "locations": self.get_all_locations()
            })

    async def send_to_user(self, to_user_id: str, message: dict):
        """특정 userId를 가진 클라이언트에게만 메시지 전송 (이모티콘용)"""
        print(f"\n{'='*60}")
        print(f"📤 send_to_user 호출")
        print(f"   - to_user_id: {to_user_id} (타입: {type(to_user_id).__name__})")
        print(f"   - message: {message}")
        print(f"   - 현재 연결된 사용자: {list(self.client_to_user.values())}")
        print(f"{'='*60}")

        sent = False
        for connection, user_id in self.client_to_user.items():
            print(f"🔍 비교: user_id={user_id} (타입: {type(user_id).__name__}) vs to_user_id={to_user_id}")
            # 문자열로 변환하여 비교 (타입 불일치 방지)
            if str(user_id) == str(to_user_id):
                try:
                    await connection.send_json(message)
                    print(f"✅ 이모티콘 전송 성공: {to_user_id}")
                    sent = True
                except Exception as e:
                    print(f"❌ 이모티콘 전송 실패: {to_user_id} - {e}")

        if not sent:
            print(f"⚠️ 받는 사람을 찾을 수 없음: {to_user_id}")
            print(f"   현재 연결된 사용자 목록: {list(self.client_to_user.values())}")

    async def broadcast(self, data: dict):
        """
        모든 연결된 클라이언트에게 데이터 전송

        Args:
            data: 전송할 JSON 데이터
        """
        disconnected_clients = []

        for connection in self.active_connections.copy():
            try:
                await connection.send_json(data)
            except Exception as e:
                print(f"❌ 전송 실패: {e}")
                disconnected_clients.append(connection)

        # 실패한 연결 제거
        for connection in disconnected_clients:
            self.active_connections.discard(connection)

    def add_location(self, user_id: str, client_id: str, latitude: float, longitude: float, websocket: WebSocket):
        """
        사용자 위치 정보 저장 (userId 기반)

        동일한 userId의 이전 연결이 있으면 제거 (중복 방지)

        Args:
            user_id: 고정 사용자 ID (이메일 기반)
            client_id: 임시 클라이언트 ID (세션용)
            latitude: 위도
            longitude: 경도
            websocket: WebSocket 연결 객체
        """
        print(f"\n=== add_location 호출 ===")
        print(f"user_id (타입: {type(user_id).__name__}): {user_id}")

        # 같은 userId의 이전 websocket 연결이 있는지 확인
        # (같은 사용자가 여러 탭/기기에서 접속한 경우)
        for old_ws, old_user_id in list(self.client_to_user.items()):
            if old_user_id == user_id and old_ws != websocket:
                print(f"⚠️  같은 userId '{user_id}'의 이전 연결 제거 (새로운 연결로 교체)")
                self.active_connections.discard(old_ws)
                self.client_count -= 1
                try:
                    old_ws.close()
                except:
                    pass
                self.client_to_user.pop(old_ws, None)

        # userId로부터 사용자 name 조회
        user_name = get_user_name(user_id)
        print(f"조회된 name: {user_name} (타입: {type(user_name).__name__})")

        # userId 기반으로 사용자 정보 업데이트
        self.user_locations[user_id] = {
            "id": user_id,  # userId를 id로 사용
            "userId": user_id,
            "name": user_name,  # name 추가
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": datetime.now().isoformat()
        }
        print(f"저장된 위치 데이터: {self.user_locations[user_id]}")
        print(f"=== add_location 끝 ===\n")

        # websocket -> userId 매핑 저장
        self.client_to_user[websocket] = user_id

    def get_all_locations(self):
        """모든 사용자의 위치 정보 반환 (userId 기반)"""
        return list(self.user_locations.values())


# 전역 연결 관리자
manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket 엔드포인트 - GPS 실시간 위치 공유

    클라이언트로부터 받는 메시지 형식:
    {
        "type": "location",
        "id": "clientId_xxxx",
        "userId": "user_email",  # 고정 사용자 ID (이메일 기반)
        "latitude": 37.5665,
        "longitude": 126.9780
    }

    클라이언트에게 보내는 메시지 형식:
    {
        "type": "locations",
        "locations": [
            {
                "id": "user_email",      # userId (동일한 userId = 동일한 사용자)
                "userId": "user_email",
                "latitude": 37.5665,
                "longitude": 126.9780,
                "timestamp": "2025-11-17T10:30:45.123456"
            },
            ...
        ]
    }
    """
    await manager.connect(websocket)

    user_id_from_query = websocket.query_params.get("userId")

    try:
        while True:
            # 클라이언트로부터 GPS 데이터 수신
            data = await websocket.receive_json()

            # 위치 데이터 처리
            if data.get("type") == "location":
                client_id = data.get("id", "unknown")
                body_user_id = data.get("userId")
                user_id = user_id_from_query or body_user_id or client_id  # userId 우선 사용, 없으면 clientId
                latitude = data.get("latitude")
                longitude = data.get("longitude")

                if latitude is not None and longitude is not None:
                    # userId 기반으로 위치 정보 저장
                    manager.add_location(user_id, client_id, latitude, longitude, websocket)

                    # print(f"📍 userId: '{user_id}' (clientId: '{client_id}') - 위치: ({latitude:.4f}, {longitude:.4f})")

                    # 모든 클라이언트에게 현재 모든 사용자 위치 전송 (userId 기반)
                    await manager.broadcast({
                        "type": "locations",
                        "locations": manager.get_all_locations()
                    })
                else:
                    print(f"⚠️ 잘못된 위치 데이터: {data}")

            # ✨ 이모티콘 메시지 처리 (신규)
            elif data.get("type") == "emoji":
                from_user = data.get("from")
                to_user = data.get("to")
                emoji = data.get("emoji")

                print(f"🎯 이모티콘 메시지 수신: {from_user} → {to_user} : {emoji}")
                print(f"📋 현재 연결된 사용자: {list(manager.client_to_user.values())}")

                # 🔧 항상 서버에서 발신자 이름 조회 (프론트엔드 값 무시)
                from_user_name = None

                # 1순위: user_locations에서 조회
                if from_user in manager.user_locations:
                    from_user_name = manager.user_locations[from_user].get("name")
                    print(f"✅ user_locations에서 조회: {from_user_name}")

                # 2순위: DB에서 조회
                if not from_user_name:
                    print(f"⚠️ user_locations에 없음. DB에서 조회 시도...")
                    from_user_name = get_user_name(from_user)
                    print(f"✅ DB에서 조회한 이름: {from_user_name}")

                # 3순위: 기본값
                if not from_user_name or from_user_name == from_user:
                    from_user_name = f"러너{from_user}"
                    print(f"⚠️ 이름 조회 실패. 기본값 사용: {from_user_name}")

                emoji_message = {
                    "type": "emoji",
                    "from": from_user,
                    "fromUserName": from_user_name,  # ✨ 보낸 사람 이름 추가
                    "to": to_user,
                    "emoji": emoji,
                    "timestamp": datetime.now().isoformat()
                }

                print(f"😀 이모티콘 전송: {from_user_name} ({from_user}) → {to_user} : {emoji}")
                print(f"📤 전송 데이터: {emoji_message}")

                # 받는 사용자에게만 메시지 전송
                await manager.send_to_user(to_user, emoji_message)
                print(f"✅ send_to_user 호출 완료: {to_user}")

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
        print("👋 WebSocket 정상 종료")
    except Exception as e:
        print(f"❌ WebSocket 오류: {e}")
        await manager.disconnect(websocket)


@app.get("/health")
async def health_check():
    """서버 상태 확인"""
    return {
        "status": "healthy",
        "connected_clients": len(manager.active_connections),
        "tracked_users": len(manager.user_locations),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/stats")
async def get_stats():
    """서버 통계 반환"""
    return {
        "connected_clients": len(manager.active_connections),
        "tracked_users": len(manager.user_locations),
        "users": manager.get_all_locations(),
        "timestamp": datetime.now().isoformat()
    }


@app.delete("/admin/users/{user_id}")
async def delete_user(user_id: str):
    """
    특정 사용자를 위치 목록에서 제거 (관리용)

    사용 예:
    DELETE http://localhost:8080/admin/users/user_17634
    """
    if user_id in manager.user_locations:
        del manager.user_locations[user_id]

        # 모든 클라이언트에게 업데이트된 위치 정보 브로드캐스트
        await manager.broadcast({
            "type": "locations",
            "locations": manager.get_all_locations()
        })

        print(f"🗑️  사용자 '{user_id}' 위치 정보 삭제됨")
        return {
            "status": "success",
            "message": f"사용자 '{user_id}'가 삭제되었습니다",
            "remaining_users": len(manager.user_locations)
        }
    else:
        return {
            "status": "not_found",
            "message": f"사용자 '{user_id}'를 찾을 수 없습니다",
            "remaining_users": len(manager.user_locations)
        }


@app.delete("/admin/users")
async def delete_all_invalid_users():
    """
    clientId로만 저장된 유효하지 않은 사용자 모두 삭제
    (userId가 없는 사용자 = 로그인하지 않은 사용자)
    """
    invalid_users = [
        user_id for user_id in manager.user_locations.keys()
        if user_id.startswith("user_")  # clientId 형식: user_TIMESTAMP_RANDOM
    ]

    for user_id in invalid_users:
        del manager.user_locations[user_id]

    # 모든 클라이언트에게 업데이트된 위치 정보 브로드캐스트
    if invalid_users:
        await manager.broadcast({
            "type": "locations",
            "locations": manager.get_all_locations()
        })
        print(f"🗑️  유효하지 않은 사용자 {len(invalid_users)}명 삭제됨: {invalid_users}")

    return {
        "status": "success",
        "deleted_count": len(invalid_users),
        "deleted_users": invalid_users,
        "remaining_users": len(manager.user_locations)
    }


@app.post("/api/send-emoji")
async def send_emoji(request: dict):
    """
    이모티콘 전송 API (음성 명령용)

    요청 형식:
    {
        "from_user_id": "1",
        "to_user_ids": ["2", "3"],  # 또는 ["ALL"]
        "emoji_type": "FIGHTING"  # FIGHTING, HIGHFIVE, FIRE
    }
    """
    try:
        from_user_id = request.get("from_user_id")
        to_user_ids = request.get("to_user_ids", [])
        emoji_type = request.get("emoji_type", "FIGHTING")

        print(f"\n{'='*60}")
        print(f"😀 이모티콘 전송 요청")
        print(f"   - from: {from_user_id} (타입: {type(from_user_id).__name__})")
        print(f"   - to: {to_user_ids}")
        print(f"   - emoji: {emoji_type}")
        print(f"   - 현재 연결된 사용자: {list(manager.client_to_user.values())}")
        print(f"   - user_locations 키: {list(manager.user_locations.keys())}")

        # 보낸 사람의 이름 조회
        from_user_name = "알 수 없음"
        if from_user_id in manager.user_locations:
            from_user_name = manager.user_locations[from_user_id].get("name", from_user_id)
        else:
            # user_locations에 없으면 DB에서 직접 조회
            from_user_name = get_user_name(from_user_id)

        print(f"   - from_name: {from_user_name}")

        sent_count = 0

        # "ALL"이면 모든 사용자에게 전송 (자기 자신 제외)
        if "ALL" in to_user_ids:
            for user_id in manager.user_locations.keys():
                if user_id != from_user_id:
                    emoji_message = {
                        "type": "emoji",
                        "from": from_user_id,
                        "fromUserName": from_user_name,  # ✨ 보낸 사람 이름 추가
                        "to": user_id,
                        "emoji": emoji_type,
                        "timestamp": datetime.now().isoformat()
                    }
                    await manager.send_to_user(user_id, emoji_message)
                    sent_count += 1
        else:
            # 특정 사용자들에게만 전송
            for user_id in to_user_ids:
                emoji_message = {
                    "type": "emoji",
                    "from": from_user_id,
                    "fromUserName": from_user_name,  # ✨ 보낸 사람 이름 추가
                    "to": user_id,
                    "emoji": emoji_type,
                    "timestamp": datetime.now().isoformat()
                }
                await manager.send_to_user(user_id, emoji_message)
                sent_count += 1

        print(f"✅ 이모티콘 전송 완료: {sent_count}명")
        print(f"{'='*60}\n")

        return {
            "success": True,
            "sent_count": sent_count,
            "message": f"{sent_count}명에게 이모티콘을 보냈습니다"
        }

    except Exception as e:
        print(f"❌ 이모티콘 전송 실패: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }


# ================================
# 음성 명령을 위한 주변 러너 조회 API
# ================================

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Haversine 공식을 사용하여 두 좌표 간의 거리를 계산 (단위: km)

    Args:
        lat1, lon1: 첫 번째 지점의 위도/경도
        lat2, lon2: 두 번째 지점의 위도/경도

    Returns:
        float: 두 지점 간의 거리 (km)
    """
    R = 6371  # 지구 반지름 (km)

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * \
        math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c
    return distance


@app.get("/api/nearby-runners/{user_id}")
async def get_nearby_runners(user_id: str, radius_km: float = 10.0):
    """
    특정 사용자 주변의 러너 목록 반환 (음성 명령 API용)

    Args:
        user_id: 조회할 사용자의 ID
        radius_km: 검색 반경 (km, 기본값: 10km)

    Returns:
        {
            "user_id": "user123",
            "user_location": {"latitude": 37.5, "longitude": 127.0},
            "radius_km": 10.0,
            "runners": [
                {"id": "user456", "name": "김시현"},
                {"id": "user789", "name": "박신혜"}
            ]
        }
    """
    try:
        # 요청한 사용자의 위치 정보 조회
        user_location = manager.user_locations.get(user_id)

        if not user_location:
            print(f"⚠️  사용자 '{user_id}'의 위치 정보를 찾을 수 없음")
            return {
                "user_id": user_id,
                "user_location": None,
                "radius_km": radius_km,
                "runners": []
            }

        user_lat = user_location["latitude"]
        user_lon = user_location["longitude"]

        print(f"\n{'='*60}")
        print(f"🔍 주변 러너 조회: user_id={user_id}")
        print(f"📍 사용자 위치: ({user_lat:.4f}, {user_lon:.4f})")
        print(f"📏 검색 반경: {radius_km}km")

        # 주변 러너 필터링
        nearby_runners = []
        for other_user_id, other_location in manager.user_locations.items():
            # 자기 자신은 제외
            if other_user_id == user_id:
                continue

            other_lat = other_location["latitude"]
            other_lon = other_location["longitude"]
            other_name = other_location.get("name", other_user_id)

            # 거리 계산
            distance = calculate_distance(user_lat, user_lon, other_lat, other_lon)

            if distance <= radius_km:
                nearby_runners.append({
                    "id": other_user_id,
                    "name": other_name,
                    "distance_km": round(distance, 2)
                })
                print(f"  ✅ {other_name} ({other_user_id}): {distance:.2f}km")

        print(f"👥 검색 결과: {len(nearby_runners)}명")
        print(f"{'='*60}\n")

        return {
            "user_id": user_id,
            "user_location": {
                "latitude": user_lat,
                "longitude": user_lon
            },
            "radius_km": radius_km,
            "runners": nearby_runners
        }

    except Exception as e:
        print(f"❌ 주변 러너 조회 실패: {e}")
        import traceback
        traceback.print_exc()
        return {
            "user_id": user_id,
            "user_location": None,
            "radius_km": radius_km,
            "runners": [],
            "error": str(e)
        }


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 GPS 실시간 위치 공유 WebSocket 서버 시작")
    print("="*60)
    print("📡 WebSocket: ws://localhost:8080/ws")
    print("🏥 Health Check: http://localhost:8080/health")
    print("📊 통계: http://localhost:8080/stats")
    print("="*60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8080)
