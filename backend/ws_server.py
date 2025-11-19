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
from typing import Set
import json
import uvicorn

# FastAPI 앱 생성
app = FastAPI(title="GPS Location Sharing Server")

# CORS 설정 - 모든 도메인 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


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
        for connection, user_id in self.client_to_user.items():
            if user_id == to_user_id:
                try:
                    await connection.send_json(message)
                except:
                    pass

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
        # 같은 userId의 이전 websocket 연결이 있는지 확인
        # (같은 사용자가 여러 탭/기기에서 접속한 경우)
        for old_ws, old_user_id in list(self.client_to_user.items()):
            if old_user_id == user_id and old_ws != websocket:
                print(f"⚠️  같은 userId '{user_id}'의 이전 연결 제거 (새로운 연결로 교체)")
                self.active_connections.discard(old_ws)
                try:
                    old_ws.close()
                except:
                    pass
                self.client_to_user.pop(old_ws, None)

        # userId 기반으로 사용자 정보 업데이트
        self.user_locations[user_id] = {
            "id": user_id,  # userId를 id로 사용
            "userId": user_id,
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": datetime.now().isoformat()
        }

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

                    print(f"📍 userId: '{user_id}' (clientId: '{client_id}') - 위치: ({latitude:.4f}, {longitude:.4f})")

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

                emoji_message = {
                    "type": "emoji",
                    "from": from_user,
                    "to": to_user,
                    "emoji": emoji,
                    "timestamp": datetime.now().isoformat()
                }

                print(f"😀 이모티콘 전송: {from_user} → {to_user} : {emoji}")

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


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 GPS 실시간 위치 공유 WebSocket 서버 시작")
    print("="*60)
    print("📡 WebSocket: ws://localhost:8080/ws")
    print("🏥 Health Check: http://localhost:8080/health")
    print("📊 통계: http://localhost:8080/stats")
    print("="*60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8080)
