# 🔌 ngrok WebSocket 설정 가이드

## 문제점
WebSocket 연결이 포트 8080에서 실행되고 있는데, ngrok을 통해 제대로 연결하지 못하는 경우가 있습니다.

---

## ✅ 올바른 ngrok 설정 방법

### 방법 1: ngrok HTTP 모드 (권장)

#### 백엔드에서 실행할 명령어:

```bash
# 터미널 1: HTTP API 서버 (포트 8000)
ngrok http 8000
# 출력 예: Forwarding https://nana-nondefiant-jodee.ngrok-free.dev -> http://localhost:8000

# 터미널 2: WebSocket 서버 (포트 8080)
ngrok http 8080
# 출력 예: Forwarding https://unmuddy-kamala-hendecahedral.ngrok-free.dev -> http://localhost:8080
```

#### 프론트엔드 설정 (`.env`):

```env
VITE_API_BASE_URL=https://nana-nondefiant-jodee.ngrok-free.dev
VITE_WS_BASE_URL=wss://unmuddy-kamala-hendecahedral.ngrok-free.dev
```

#### JavaScript 코드:

```typescript
// ngrok이 자동으로 HTTP → HTTPS, WS → WSS로 변환합니다
const ws = new WebSocket('wss://unmuddy-kamala-hendecahedral.ngrok-free.dev/ws')
```

---

### 방법 2: ngrok TCP 모드 (대안)

만약 방법 1이 작동하지 않으면 TCP 모드를 사용합니다:

```bash
# WebSocket을 TCP 모드로 터널링
ngrok tcp 8080
# 출력 예: tcp://0.tcp.ngrok.io:12345 -> localhost:8080
```

#### 프론트엔드 설정:

```typescript
// TCP 모드를 사용하는 경우 wss는 아래와 같이 구성합니다
const ws = new WebSocket('wss://0.tcp.ngrok.io:12345/ws')
```

---

## ⚠️ 주의사항

### 1. ngrok URL에 포트번호 포함 금지
❌ **틀린 예**:
```typescript
new WebSocket('wss://unmuddy-kamala-hendecahedral.ngrok-free.dev:8080/ws')
                                                                      ^^^^
                                                    ngrok이 자동 매핑하므로 불필요
```

✅ **올바른 예**:
```typescript
new WebSocket('wss://unmuddy-kamala-hendecahedral.ngrok-free.dev/ws')
```

### 2. 프로토콜 확인
- HTTP API: `https://` (HTTP가 HTTPS로 자동 변환)
- WebSocket: `wss://` (WS가 WSS로 자동 변환)

### 3. ngrok 터널 재생성 시
ngrok을 재시작하면 URL이 변경될 수 있습니다:
```
이전: https://nana-nondefiant-jodee.ngrok-free.dev
재시작 후: https://new-random-string.ngrok-free.dev (변경됨)
```

**해결책**: 환경변수를 동적으로 설정하거나, 유료 ngrok 계획으로 고정 URL 사용

---

## 🔍 연결 문제 진단

### 브라우저 개발자 도구에서 확인

#### 1. Network 탭 확인
```
1. 브라우저 F12 → Network 탭
2. "WS" 필터 적용
3. WebSocket 연결 상태 확인
   - 초록색 101 Switching Protocols → ✅ 성공
   - 빨간색 또는 오류 → ❌ 실패
```

#### 2. Console 탭에서 오류 확인
```javascript
// 사용자 정의 콘솔 메시지로 확인
console.log('WebSocket URL:', 'wss://unmuddy-kamala-hendecahedral.ngrok-free.dev/ws')
```

#### 3. Application 탭에서 환경변수 확인
```javascript
// 개발자 도구 Console에서 실행
console.log(import.meta.env.VITE_WS_BASE_URL)
```

---

## 🛠️ 문제 해결 단계

### 문제: "WebSocket connection failed"

**1단계: ngrok 상태 확인**
```bash
# ngrok이 실행 중인지 확인
curl https://unmuddy-kamala-hendecahedral.ngrok-free.dev

# 응답이 오면 ngrok 터널이 정상 작동 중
```

**2단계: 백엔드 서버 확인**
```bash
# 로컬 포트에 직접 연결 (개발 환경)
curl http://localhost:8080

# 응답이 오면 백엔드가 정상 작동 중
```

**3단계: 프론트엔드 URL 확인**
```javascript
// 개발자 도구 Console에서 확인
console.log('WS URL:', 'wss://unmuddy-kamala-hendecahedral.ngrok-free.dev/ws')

// 또는 config 파일에서 확인
import { WS_ENDPOINT } from './config/api'
console.log('Endpoint:', WS_ENDPOINT)
```

**4단계: 브라우저 콘솔 로그 확인**
```javascript
// useWebSocket.ts 또는 GPSMap.tsx에서 자동으로 출력됨:
// 🔌 WebSocket 연결 시도: wss://...
// ✅ WebSocket 연결 성공!
// ❌ WebSocket 오류: ...
```

---

## 📋 체크리스트

### ngrok 설정
- [ ] HTTP API 터널 실행: `ngrok http 8000`
- [ ] WebSocket 터널 실행: `ngrok http 8080`
- [ ] 생성된 ngrok URL 확인 및 복사

### 프론트엔드 설정
- [ ] `.env` 파일에 ngrok URL 입력
- [ ] `VITE_API_BASE_URL=https://...`
- [ ] `VITE_WS_BASE_URL=wss://...`
- [ ] 포트번호 미포함 확인

### 실행 확인
- [ ] 백엔드 서버 실행 중 (포트 8000, 8080)
- [ ] ngrok 터널 활성 상태
- [ ] `npm run dev` 실행
- [ ] 브라우저 개발자 도구에서 WS 연결 확인
- [ ] 네트워크 탭에서 101 Switching Protocols 확인

---

## 🔧 동적 환경변수 설정 (선택사항)

만약 ngrok URL이 자주 변경된다면, 다음과 같이 동적으로 설정할 수 있습니다:

### 1. `.env.local` 파일 생성 (git 제외)
```env
# .env.local
VITE_API_BASE_URL=https://현재-ngrok-api-url.ngrok-free.dev
VITE_WS_BASE_URL=wss://현재-ngrok-ws-url.ngrok-free.dev
```

### 2. 또는 런타임 설정
```typescript
// src/main.tsx
const apiUrl = process.env.VITE_API_BASE_URL || 'https://api-default.ngrok-free.dev'
const wsUrl = process.env.VITE_WS_BASE_URL || 'wss://ws-default.ngrok-free.dev'
```

---

## 📚 참고 자료

- [ngrok 공식 문서](https://ngrok.com/docs)
- [ngrok WebSocket 가이드](https://ngrok.com/docs/tcp)
- [WebSocket API MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

## ❓ FAQ

**Q: ngrok URL에 `/ws` 경로를 포함해야 하나요?**
A: 네, `/ws`는 ngrok URL이 아닌 WebSocket 경로입니다.
```typescript
✅ 올바름: 'wss://unmuddy-kamala-hendecahedral.ngrok-free.dev/ws'
❌ 틀림: 'wss://unmuddy-kamala-hendecahedral.ngrok-free.dev:8080/ws'
```

**Q: HTTP와 WebSocket이 다른 ngrok URL을 사용해도 되나요?**
A: 네, 각각 다른 포트(8000, 8080)이므로 다른 URL을 사용합니다.

**Q: ngrok 유료 요금제가 필요한가요?**
A: 프리 요금제도 충분하지만, URL이 변경됩니다. 고정 URL이 필요하면 유료 요금제 필요합니다.

---

**마지막 수정**: 2025-11-17
