# 🔧 WebSocket 연결 오류 즉시 해결법

## 🚨 오류 메시지
```
WebSocket connection to 'ws://localhost:8000/ws' failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED
```

---

## ✅ 빠른 해결법 (3단계)

### 1단계: npm 개발 서버 재시작

```bash
# 현재 실행 중인 npm run dev를 종료
# 터미널에서 Ctrl+C 누르기

# 모든 터미널 종료 후 새로 시작
npm run dev
```

⚠️ **중요**: 이전에 `.env` 파일을 수정했다면 이 과정이 필수입니다!

### 2단계: 브라우저 캐시 삭제

```
1. F12 키로 개발자 도구 열기
2. "Application" 탭 클릭
3. "Storage" → "Clear site data" 클릭
4. 모든 체크박스 선택 후 Clear 클릭
```

### 3단계: 페이지 새로고침

```
Ctrl+F5 (Windows/Linux) 또는 Cmd+Shift+R (Mac)
```

---

## 🎯 검증 (5분 안에 확인)

### Step 1: .env 파일 확인
파일 위치: 프로젝트 루트의 `.env`

**올바른 내용**:
```env
VITE_API_BASE_URL=https://nana-nondefiant-jodee.ngrok-free.dev
VITE_WS_BASE_URL=wss://unmuddy-kamala-hendecahedral.ngrok-free.dev
```

### Step 2: 백엔드 서버 실행 확인

**터미널 1** (이미 실행 중):
```bash
# HTTP API 서버 (포트 8000)
python main.py  # 또는 백엔드 실행 명령
```

**터미널 2** (이미 실행 중):
```bash
# WebSocket 서버 (포트 8080)
python websocket_server.py  # 또는 WebSocket 실행 명령
```

### Step 3: ngrok 터널 확인

**터미널 3** (이미 실행 중):
```bash
# HTTP API 터널
ngrok http 8000
# 출력 예: Forwarding https://nana-nondefiant-jodee.ngrok-free.dev -> http://localhost:8000
```

**터미널 4** (이미 실행 중):
```bash
# WebSocket 터널
ngrok http 8080
# 출력 예: Forwarding https://unmuddy-kamala-hendecahedral.ngrok-free.dev -> http://localhost:8080
```

### Step 4: 브라우저 개발자 도구 확인

```javascript
// 브라우저 콘솔에 입력:
console.log(import.meta.env.VITE_WS_BASE_URL)

// 출력 결과:
// wss://unmuddy-kamala-hendecahedral.ngrok-free.dev
```

✅ 위와 같이 `wss://`로 시작하는 ngrok URL이 표시되면 **성공**!

### Step 5: Network 탭 확인

```
1. 개발자 도구 → Network 탭
2. 필터: "WS" 입력
3. 페이지 새로고침 (F5)
4. "wss://unmuddy-kamala-hendecahedral.ngrok-free.dev" 항목 확인
5. 상태코드: 101 Switching Protocols ✅
```

---

## 📋 최종 체크리스트

```
[ ] .env 파일에 ngrok URL이 입력됨
[ ] npm run dev가 실행 중
[ ] 브라우저 캐시 삭제함
[ ] 페이지를 Ctrl+F5로 새로고침함
[ ] 브라우저 콘솔에서 wss://로 시작하는 URL 확인함
[ ] Network 탭에서 101 상태코드 확인함
[ ] 백엔드 서버 (포트 8000, 8080) 실행 중
[ ] ngrok 터널 (http 8000, http 8080) 실행 중
```

---

## 🆘 여전히 오류가 있다면

### 원인 분석

**현상**: `ws://localhost:8000/ws`로 연결 시도
→ **원인**: 환경변수가 제대로 로드되지 않음

**해결방법**:
1. `.env` 파일이 **프로젝트 루트**에 있는지 확인
2. `npm run dev` 중단 후 다시 시작
3. 브라우저 캐시 완전 삭제
4. 브라우저 재시작
5. `http://localhost:3000` 재접속

### 더 자세한 진단

자세한 진단은 `DEBUG_WEBSOCKET.md` 파일을 참고하세요.

---

## 🎯 현재 설정 요약

### 포트 정보
- **HTTP API**: 포트 8000 → ngrok HTTPS 변환
- **WebSocket**: 포트 8080 → ngrok WSS 변환
- **프론트엔드**: 포트 3000

### ngrok URL
- **HTTP API**: `https://nana-nondefiant-jodee.ngrok-free.dev`
- **WebSocket**: `wss://unmuddy-kamala-hendecahedral.ngrok-free.dev`

### 프로토콜 주의
- ✅ `https://` (HTTP API)
- ✅ `wss://` (WebSocket)
- ❌ `http://` 불가능 (ngrok 미지원)
- ❌ `ws://` 불가능 (ngrok 미지원)

---

**이 문제는 위의 3단계를 수행하면 해결됩니다! 🎉**

자세한 내용은 `DEBUG_WEBSOCKET.md` 참고
