# 🔍 WebSocket 연결 오류 진단 가이드

## 오류 메시지 분석
```
WebSocket connection to 'ws://localhost:8000/ws' failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED
```

### 문제 원인
- `ws://localhost:8000/ws`로 연결 시도 중
- `8000` 포트로 WebSocket을 연결하려고 함 (잘못됨)
- 로컬 주소로 연결 시도 (ngrok 미사용)

### 해결책
3가지 문제를 확인하세요:

---

## ✅ 1단계: 환경 변수 확인

### .env 파일 확인
```bash
# 프로젝트 루트의 .env 파일 확인
cat .env
```

**올바른 설정**:
```env
VITE_API_BASE_URL=https://nana-nondefiant-jodee.ngrok-free.dev
VITE_WS_BASE_URL=wss://unmuddy-kamala-hendecahedral.ngrok-free.dev
```

### 개발 서버 재시작 필수!
```bash
# 1. npm run dev를 실행 중이라면 중단 (Ctrl+C)
# 2. .env 파일 수정
# 3. npm run dev 다시 실행
```

⚠️ **중요**: `.env` 파일을 변경하면 반드시 개발 서버를 재시작해야 합니다!

---

## ✅ 2단계: 브라우저 캐시 삭제

개발 서버 재시작 후에도 WebSocket 오류가 발생하면:

### Chrome/Edge 캐시 삭제
```
1. F12 키로 개발자 도구 열기
2. Application 탭 클릭
3. Storage 섹션에서 "Clear site data" 클릭
4. 체크박스 모두 선택 후 Clear 클릭
5. 페이지 새로고침 (Ctrl+F5 또는 Cmd+Shift+R)
```

### Firefox 캐시 삭제
```
1. F12 키로 개발자 도구 열기
2. Storage 탭 클릭
3. 왼쪽 메뉴에서 "Cookies" 선택
4. http://localhost:3000 항목 삭제
5. 페이지 새로고침 (Ctrl+Shift+R)
```

---

## ✅ 3단계: 백엔드 및 ngrok 확인

### ngrok 터널 실행 상태 확인
```bash
# 터미널에서 실행 중인지 확인
# 1. HTTP API (포트 8000) - ngrok http 8000 실행 중?
# 2. WebSocket (포트 8080) - ngrok http 8080 실행 중?

# 확인 방법: 각 터널의 로그에서 "Forwarding" 메시지 확인
# 예: Forwarding https://nana-nondefiant-jodee.ngrok-free.dev -> http://localhost:8000
```

### ngrok URL 확인
```bash
# ngrok 웹 인터페이스에서 확인
# 브라우저에서 열기: http://127.0.0.1:4040
# 활성화된 터널 목록 확인
```

### 백엔드 서버 실행 확인
```bash
# HTTP API 서버 (포트 8000) 실행 중인지 확인
curl http://localhost:8000

# WebSocket 서버 (포트 8080) 실행 중인지 확인
curl http://localhost:8080
```

---

## ✅ 4단계: 브라우저에서 URL 확인

### 개발자 도구에서 WebSocket URL 확인
```javascript
// 브라우저 개발자 도구 → Console 탭에서 실행:
console.log(import.meta.env.VITE_WS_BASE_URL)
console.log(import.meta.env.VITE_API_BASE_URL)
```

**올바른 출력**:
```
wss://unmuddy-kamala-hendecahedral.ngrok-free.dev
https://nana-nondefiant-jodee.ngrok-free.dev
```

**잘못된 출력** (ngrok URL이 표시되지 않으면):
```
undefined
undefined
```

→ `.env` 파일을 확인하고 개발 서버를 다시 시작하세요!

---

## ✅ 5단계: 네트워크 탭에서 WebSocket 연결 확인

### Network 탭에서 WebSocket 조회
```
1. 브라우저 개발자 도구 열기 (F12)
2. Network 탭 클릭
3. 필터에 "WS" 입력 (WebSocket만 표시)
4. 페이지 새로고침 (F5)
5. "ws" 또는 "wss"로 시작하는 항목 확인
```

### 연결 상태 확인
- ✅ 상태 코드 `101 Switching Protocols` → WebSocket 연결 성공!
- ❌ 상태 코드 `Connection failed` → WebSocket 연결 실패
- ❌ localhost:8000 표시 → 잘못된 URL 사용 중

---

## 🔧 문제별 해결 방법

### 문제 1: "ws://localhost:8000/ws"로 여전히 연결 시도
```
원인: .env 파일이 읽혀지지 않거나 개발 서버가 재시작되지 않음
해결:
1. .env 파일이 프로젝트 루트에 있는지 확인
2. .env 파일에 올바른 URL이 입력되어 있는지 확인
3. npm run dev를 중단하고 다시 시작
4. 브라우저 캐시 삭제
5. 페이지 새로고침 (Ctrl+F5)
```

### 문제 2: "net::ERR_CONNECTION_REFUSED"
```
원인: 백엔드 WebSocket 서버가 실행 중이지 않음
해결:
1. 백엔드 WebSocket 서버 실행 확인 (포트 8080)
2. ngrok http 8080 실행 확인
3. ngrok에서 생성된 URL이 .env와 일치하는지 확인
```

### 문제 3: "WebSocket connection failed"
```
원인: 여러 가지 가능
해결 순서:
1. 브라우저 콘솔의 상세 오류 메시지 확인
2. Network 탭에서 WebSocket 요청 확인
3. ngrok 터널 상태 확인 (http://127.0.0.1:4040)
4. 개발자 도구에서 import.meta.env.VITE_WS_BASE_URL 출력값 확인
```

---

## 📋 체크리스트

### 백엔드 준비
```
[ ] HTTP API 서버 실행 중 (포트 8000)
[ ] WebSocket 서버 실행 중 (포트 8080)
[ ] ngrok http 8000 실행 중
[ ] ngrok http 8080 실행 중
[ ] ngrok이 생성한 URL 확인 및 기록
```

### 프론트엔드 설정
```
[ ] .env 파일이 프로젝트 루트에 있음
[ ] .env에 올바른 ngrok URL 입력됨
[ ] npm run dev를 중단했다가 다시 시작함
```

### 브라우저 확인
```
[ ] 브라우저 개발자 도구에서 환경변수 확인됨
[ ] Network 탭에서 WebSocket 연결 상태 확인됨
[ ] wss:// URL로 시작하는 WebSocket 요청 보임
[ ] 상태 코드 101이 표시됨
```

---

## 🆘 여전히 문제가 있나요?

### 콘솔 메시지 확인
```javascript
// 페이지 로드 후 브라우저 콘솔에서 다음 메시지 찾기:

// ✅ 성공
✅ WebSocket 연결 성공!
🔌 WebSocket 연결 시도: wss://unmuddy-kamala-hendecahedral.ngrok-free.dev/ws

// ❌ 실패
❌ WebSocket 오류: Error in connection establishment: net::ERR_CONNECTION_REFUSED
🔌 WebSocket 연결 시도: ws://localhost:8000/ws
```

### 상세 로그 확인
브라우저 Console에 다음을 입력:
```javascript
// 환경변수 확인
console.log('API URL:', import.meta.env.VITE_API_BASE_URL)
console.log('WS URL:', import.meta.env.VITE_WS_BASE_URL)

// 또는 config 모듈에서 직접 확인
import { WS_ENDPOINT, API_BASE_URL } from './config/api'
console.log('WS_ENDPOINT:', WS_ENDPOINT)
console.log('API_BASE_URL:', API_BASE_URL)
```

---

## 📝 최종 요약

**WebSocket 오류 해결 순서**:
1. ✅ `.env` 파일 확인 (ngrok URL 포함)
2. ✅ 개발 서버 재시작
3. ✅ 브라우저 캐시 삭제
4. ✅ 페이지 새로고침 (Ctrl+F5)
5. ✅ 콘솔에서 올바른 WebSocket URL 확인
6. ✅ Network 탭에서 WebSocket 연결 상태 확인

---

**최종 수정**: 2025-11-17
