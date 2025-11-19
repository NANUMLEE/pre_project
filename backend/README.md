# 백엔드 서버 실행 가이드

## 파일 구조

```
backend/
├── main.py              # 기상청 API 서버
├── ws_server.py         # WebSocket GPS 실시간 위치 공유 서버
├── requirements.txt     # 필요 패키지
├── .env                 # 환경 변수 (SERVICE_KEY)
└── README.md           # 이 파일
```

---

## 🚀 **방법 1: WebSocket 서버만 실행**

GPS 실시간 위치 공유만 필요한 경우:

```bash
cd backend
python ws_server.py
```

**출력:**
```
============================================================
🚀 GPS 실시간 위치 공유 WebSocket 서버 시작
============================================================
📡 WebSocket: ws://localhost:8080/ws
🏥 Health Check: http://localhost:8080/health
📊 통계: http://localhost:8080/stats
============================================================
```

**접근 URL:**
- WebSocket: `ws://localhost:8080/ws`
- 상태 확인: `http://localhost:8080/health`
- 통계: `http://localhost:8080/stats`

---

## 🚀 **방법 2: 기상청 API + WebSocket 서버 함께 실행**

날씨 API와 GPS 위치 공유를 모두 사용하는 경우:

```bash
cd backend
python main.py
```

**출력:**
```
🚀 날씨 API 서버 시작...
📡 WebSocket 서버도 함께 실행됩니다 (포트 8000)
```

**접근 URL:**
- WebSocket: `ws://localhost:8080/ws`
- 날씨 API: `http://localhost:8080/api/weather/today` 또는 `http://localhost:8080/weather`

---

## 🌐 **ngrok을 이용한 외부 접근**

다른 컴퓨터에서 접근할 수 있도록 ngrok으로 노출:

### 1️⃣ ngrok 설치

**Windows (PowerShell 관리자 권한):**
```bash
choco install ngrok
```

또는 [ngrok 공식 사이트](https://ngrok.com/download)에서 다운로드

**Mac:**
```bash
brew install ngrok
```

**Linux:**
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list && \
  sudo apt update && sudo apt install ngrok
```

### 2️⃣ ngrok 인증

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

- 토큰은 [ngrok 대시보드](https://dashboard.ngrok.com)에서 얻을 수 있습니다.

### 3️⃣ 백엔드 실행

```bash
# 터미널 1: 백엔드 서버 실행
cd backend
python ws_server.py
```

### 4️⃣ ngrok 터널 생성

```bash
# 터미널 2: ngrok 실행
ngrok http 8080
```

**출력 예:**
```
ngrok                                       (Ctrl+C to quit)

Session Status                online
Web Interface                  http://127.0.0.1:4040
Forwarding                     https://abc123-def456.ngrok.io -> http://localhost:8000
```

### 5️⃣ 프론트엔드에서 WebSocket URL 변경

**방법 A: 환경 변수 사용 (권장)**

프론트엔드 `.env` 파일:
```bash
VITE_WS_URL=wss://abc123-def456.ngrok.io/ws
```

**방법 B: 코드에서 직접 변경**

프론트엔드 `src/components/home/NearbyMap.tsx` (line 20, 37):
```typescript
const { otherUsers, isConnected } = useWebSocket(
  clientId,
  'wss://abc123-def456.ngrok.io/ws'  // ← 변경
);

<GPSMap
  wsUrl="wss://abc123-def456.ngrok.io/ws"  // ← 변경
  showOtherUsers={true}
/>
```

---

## 📊 **API 엔드포인트**

### WebSocket
```
ws://localhost:8000/ws
wss://abc123-def456.ngrok.io/ws (ngrok 사용 시)
```

### REST API
```
GET /health           # 서버 상태 확인
GET /stats           # 연결된 클라이언트 및 위치 통계
GET /api/weather/today  # 기상청 날씨 데이터
GET /weather         # 기상청 날씨 데이터 (별칭)
```

---

## 💬 **WebSocket 메시지 형식**

### 클라이언트 → 서버 (GPS 위치 전송)
```json
{
  "type": "location",
  "id": "user_1234567_abcdef",
  "latitude": 37.5665,
  "longitude": 126.9780
}
```

### 서버 → 클라이언트 (모든 사용자 위치 브로드캐스트)
```json
{
  "type": "locations",
  "locations": [
    {
      "id": "user_1234567_abcdef",
      "latitude": 37.5665,
      "longitude": 126.9780,
      "timestamp": "2025-11-17T10:30:45.123456"
    },
    {
      "id": "user_9876543_zyxwvu",
      "latitude": 37.4979,
      "longitude": 127.0276,
      "timestamp": "2025-11-17T10:30:46.234567"
    }
  ]
}
```

---

## 🔍 **ngrok 대시보드**

서버가 실행 중일 때 이 URL에서 WebSocket 요청을 모니터링할 수 있습니다:
```
http://127.0.0.1:4040
```

---

## ⚠️ **주의사항**

1. **ngrok 무료 요금제 제한:**
   - 2시간마다 세션 종료
   - 매번 새로운 URL 생성
   - 무료 ngrok은 대역폭 제한 있음

2. **보안:**
   - 프로덕션 배포 시 HTTPS/WSS 필수
   - 인증 토큰 보안 유지

3. **CORS 설정:**
   - 현재 모든 도메인 허용 (`allow_origins=["*"]`)
   - 프로덕션에서는 특정 도메인만 허용 권장

4. **WebSocket 재연결:**
   - 클라이언트는 자동 재연결 기능 포함 (3초 간격)
   - 서버 재시작 시 자동 재연결됨

---

## 🐛 **문제 해결**

### 포트 8080이 이미 사용 중
```bash
# 현재 포트 8080 사용 프로세스 확인
netstat -ano | findstr :8080

# 포트 변경 (예: 8081)
python ws_server.py  # ws_server.py의 port를 8081로 변경 필요
```

### WebSocket 연결 실패
1. 백엔드 서버가 실행 중인지 확인
2. 브라우저 개발자 도구 콘솔에서 오류 메시지 확인
3. ngrok URL 정확성 확인
4. HTTPS에서 실행 중이면 `wss://` 사용 필수

### ngrok 연결 오류
```bash
# ngrok 인증 확인
ngrok version

# 인증 토큰 재설정
ngrok config add-authtoken YOUR_NEW_TOKEN
```

---

## 📚 **참고 링크**

- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [WebSocket 가이드](https://fastapi.tiangolo.com/advanced/websockets/)
- [ngrok 공식 사이트](https://ngrok.com/)
- [기상청 API](https://www.data.go.kr/tcs/dss/selectApiStandardGuide.do?apiSeq=15)

---

**마지막 업데이트:** 2025-11-17
