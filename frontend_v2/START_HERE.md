# 🚀 여기서부터 시작하세요!

## 📌 중요: ngrok 포트 설정 명확화

### 백엔드에서 실행해야 할 명령어

```bash
# 터미널 1: HTTP API 서버 (포트 8000)
ngrok http 8000
# 출력 예:
# Forwarding https://nana-nondefiant-jodee.ngrok-free.dev -> http://localhost:8000

# 터미널 2: WebSocket 서버 (포트 8080)
ngrok http 8080
# 출력 예:
# Forwarding https://unmuddy-kamala-hendecahedral.ngrok-free.dev -> http://localhost:8080
```

⚠️ **중요**: 각각 다른 터미널에서 실행해야 합니다!

---

## 🔧 프론트엔드 설정 확인

### 1단계: 환경 변수 확인
파일 위치: `.env`

```env
VITE_API_BASE_URL=https://nana-nondefiant-jodee.ngrok-free.dev
VITE_WS_BASE_URL=wss://unmuddy-kamala-hendecahedral.ngrok-free.dev
```

**변경 필요 시:**
- `https://nana-nondefiant-jodee.ngrok-free.dev` → 실제 HTTP API ngrok URL로 변경
- `wss://unmuddy-kamala-hendecahedral.ngrok-free.dev` → 실제 WebSocket ngrok URL로 변경

### 2단계: 포트 확인 사항
- ✅ HTTP API: 포트 8000 → ngrok이 HTTPS로 변환
- ✅ WebSocket: 포트 8080 → ngrok이 WSS로 변환
- ✅ ngrok URL에는 포트번호를 붙이지 않음

---

## 🎯 5단계 실행 가이드

### Step 1️⃣: 백엔드 준비 (백엔드 개발자)

```bash
# 포트 8000 시작
python main.py  # 또는 백엔드 실행 명령어

# 포트 8080 시작 (다른 터미널)
python websocket_server.py  # 또는 WebSocket 실행 명령어
```

### Step 2️⃣: ngrok 터널 생성 (백엔드 개발자)

```bash
# 터미널 1에서:
ngrok http 8000

# 터미널 2에서:
ngrok http 8080
```

### Step 3️⃣: ngrok URL 확인

ngrok 출력에서 다음을 확인하세요:
```
HTTP API ngrok URL: https://nana-nondefiant-jodee.ngrok-free.dev
WebSocket ngrok URL: https://unmuddy-kamala-hendecahedral.ngrok-free.dev
```

### Step 4️⃣: .env 파일 업데이트 (필요한 경우)

```bash
# .env 파일 수정
VITE_API_BASE_URL=https://nana-nondefiant-jodee.ngrok-free.dev
VITE_WS_BASE_URL=wss://unmuddy-kamala-hendecahedral.ngrok-free.dev
```

### Step 5️⃣: 프론트엔드 실행

```bash
# 의존성 설치 (첫 실행일 때만)
npm install

# 개발 서버 시작
npm run dev
```

자동으로 열리는 주소: `http://localhost:3000`

---

## ✅ 실행 후 확인 사항

### 1. 날씨 정보 확인
- 홈 화면 상단에 "오늘의 날씨" 섹션이 보이나요?
- 온도, 습도, 풍속이 표시되나요?
- ✅ 예 → HTTP API 연결 성공!
- ❌ 아니오 → `NGROK_WEBSOCKET_SETUP.md`의 "문제 해결" 섹션 참고

### 2. 지도 로드 확인
- 지도가 표시되나요?
- GPS 권한을 요청하는 팝업이 보이나요?
- ✅ 예 → 기본 설정 성공!
- ❌ 아니오 → 브라우저 콘솔에서 오류 메시지 확인

### 3. 실시간 위치 공유 확인
- 지도에 민트색 포인트(내 위치)가 보이나요?
- 브라우저 개발자 도구 → Network → WS 필터 적용
- WebSocket 연결이 "101 Switching Protocols"로 표시되나요?
- ✅ 예 → WebSocket 연결 성공!
- ❌ 아니오 → 아래 "문제 해결" 섹션 참고

---

## 🆘 문제 해결 빠른 가이드

### 문제 1: "WebSocket 연결 실패"
```
원인: WebSocket 서버(포트 8080) 미실행 또는 잘못된 ngrok URL
해결:
1. 백엔드 WebSocket 서버 실행 확인 (포트 8080)
2. ngrok http 8080 실행 확인
3. .env의 VITE_WS_BASE_URL 확인
```

### 문제 2: "날씨 정보 표시 안 됨"
```
원인: HTTP API 서버(포트 8000) 미실행 또는 잘못된 ngrok URL
해결:
1. 백엔드 HTTP API 서버 실행 확인 (포트 8000)
2. ngrok http 8000 실행 확인
3. .env의 VITE_API_BASE_URL 확인
```

### 문제 3: "GPS 위치 표시 안 됨"
```
원인: 브라우저 GPS 권한 미허용
해결:
1. 브라우저 주소창 옆의 위치 아이콘 클릭
2. "http://localhost:3000에 위치 액세스 허용" 클릭
3. 페이지 새로고침 (F5)
```

### 문제 4: "포트 3000 이미 사용 중"
```
다른 포트에서 실행:
npm run dev -- --port 3001
```

---

## 📂 주요 파일 위치

```
프로젝트/
├── .env                              ← 환경 변수 설정
├── src/
│   ├── config/
│   │   └── api.ts                  ← API 엔드포인트
│   ├── hooks/
│   │   └── useWebSocket.ts         ← WebSocket 연결
│   └── components/
│       ├── map/
│       │   └── GPSMap.tsx          ← 지도 + GPS
│       └── home/
│           └── WeatherWidget.tsx   ← 날씨 정보
└── package.json
```

---

## 📚 상세 가이드

- **ngrok WebSocket 설정**: `NGROK_WEBSOCKET_SETUP.md`
- **전체 설정 정보**: `SERVER_CONFIG.md`
- **빠른 시작**: `QUICK_START.md`

---

## 🎯 체크리스트

### 준비 단계
```
[ ] Node.js 설치 (node --version 확인)
[ ] npm 설치 (npm --version 확인)
[ ] 백엔드 코드 준비
[ ] ngrok 설치 및 로그인
```

### 백엔드 실행
```
[ ] HTTP API 서버 시작 (포트 8000)
[ ] WebSocket 서버 시작 (포트 8080)
[ ] ngrok http 8000 실행
[ ] ngrok http 8080 실행
```

### 프론트엔드 실행
```
[ ] .env 파일 확인
[ ] npm install 완료
[ ] npm run dev 실행
[ ] http://localhost:3000 접속
```

### 기능 확인
```
[ ] 날씨 정보 표시됨
[ ] 지도 로드됨
[ ] GPS 권한 팝업 수락됨
[ ] 내 위치 마커(민트색) 표시됨
[ ] WebSocket 연결 상태 확인됨
```

---

## 🚨 주의사항

### ⚠️ ngrok URL 변경 시 주의
ngrok 프리 요금제는 재시작할 때마다 URL이 변경됩니다.
```
변경 전: https://nana-nondefiant-jodee.ngrok-free.dev
변경 후: https://random-string-123.ngrok-free.dev  ← 다름!
```

**해결책**:
1. ngrok을 켜놓은 상태 유지
2. 또는 `.env` 파일의 URL을 새로운 URL로 업데이트
3. 또는 ngrok 유료 요금제로 고정 URL 사용

### ⚠️ 포트 중복 확인
```bash
# 이미 사용 중인 포트 확인
lsof -i :8000  # 또는 netstat -tuln | grep 8000
lsof -i :8080
lsof -i :3000
```

---

**지금 시작하려면 위의 "5단계 실행 가이드"를 따르세요!**
