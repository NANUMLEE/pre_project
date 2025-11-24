# 🚀 러너리즘 - 서버 설정 가이드

## 현재 서버 설정

### ngrok 서버 주소

#### HTTP API 서버 (메인 백엔드)
- **URL**: `https://nana-nondefiant-jodee.ngrok-free.dev`
- **포트**: 8000 (원본)
- **기능**: 날씨 정보, 코스 데이터 등 REST API

#### WebSocket 서버 (실시간 위치 공유)
- **URL**: `wss://unmuddy-kamala-hendecahedral.ngrok-free.dev`
- **포트**: 8080 (원본)
- **기능**: 실시간 GPS 위치 공유

---

## 🔧 프론트엔드 설정 방법

### 1. 환경 변수 설정 (`.env` 파일)
프로젝트 루트에 `.env` 파일이 있습니다:

```env
VITE_API_BASE_URL=https://nana-nondefiant-jodee.ngrok-free.dev
VITE_WS_BASE_URL=wss://unmuddy-kamala-hendecahedral.ngrok-free.dev
```

**참고**:
- ngrok은 HTTPS/WSS만 지원합니다
- HTTP/WS는 사용할 수 없습니다
- 서버 URL을 변경할 때는 `.env` 파일만 수정하면 됩니다

### 2. 설정 파일 (`src/config/api.ts`)
모든 API 엔드포인트는 이 파일에서 관리됩니다:

```typescript
export const API_BASE_URL = 'https://nana-nondefiant-jodee.ngrok-free.dev'
export const WS_ENDPOINT = 'wss://unmuddy-kamala-hendecahedral.ngrok-free.dev/ws'
```

---

## 📡 API 통합 파일 목록

### WebSocket 연결
1. **`src/hooks/useWebSocket.ts`** ✅
   - 실시간 위치 데이터 송수신
   - 자동 재연결 기능

2. **`src/components/map/GPSMap.tsx`** ✅
   - GPS 위치 추적
   - WebSocket URL 설정

### REST API 호출
3. **`src/components/home/WeatherWidget.tsx`** ✅
   - 날씨 정보 조회
   - API 엔드포인트: `/weather`

---

## 🎯 웹사이트 실행 방법

### 필수 사항
- Node.js 16 이상 설치
- npm 또는 yarn 설치

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

**자동으로 열리는 주소**:
- `http://localhost:3000`

### 3. 프로덕션 빌드
```bash
npm run build
```

빌드 결과: `./build` 디렉토리

---

## 🔐 ngrok HTTPS/WSS 설정 주의사항

ngrok에서는 다음을 반드시 준수해야 합니다:

### ✅ 올바른 설정
```typescript
// HTTP API
fetch('https://nana-nondefiant-jodee.ngrok-free.dev/weather')

// WebSocket
new WebSocket('wss://unmuddy-kamala-hendecahedral.ngrok-free.dev/ws')
```

### ❌ 잘못된 설정 (사용 금지)
```typescript
// HTTP 프로토콜은 ngrok에서 지원 안 함
fetch('http://nana-nondefiant-jodee.ngrok-free.dev/weather')

// WS도 ngrok에서 지원 안 함
new WebSocket('ws://unmuddy-kamala-hendecahedral.ngrok-free.dev/ws')
```

---

## 🚨 문제 해결

### 1. WebSocket 연결 실패
- 브라우저 개발자 도구 → Network 탭에서 확인
- `wss://` (보안 WebSocket)인지 확인
- ngrok 서버 상태 확인

### 2. API 요청 실패
- HTTPS 프로토콜 확인
- ngrok 터널이 활성 상태인지 확인
- CORS 설정 확인

### 3. ngrok URL 변경 시
1. `.env` 파일 수정
2. `src/config/api.ts` 자동 반영됨
3. 브라우저 캐시 삭제 후 새로고침

---

## 📋 체크리스트

### 환경 설정
- [ ] Node.js 설치
- [ ] npm install 실행
- [ ] `.env` 파일 확인

### 서버 준비
- [ ] ngrok 터널 실행 (HTTP & WebSocket)
- [ ] 백엔드 서버 실행 (포트 8000, 8080)

### 프론트엔드 실행
- [ ] `npm run dev` 실행
- [ ] `http://localhost:3000` 접속
- [ ] 지도 표시 확인
- [ ] 날씨 정보 표시 확인
- [ ] 실시간 위치 공유 확인

---

## 📝 주요 변경 사항

### 추가된 파일
- `src/config/api.ts` - API 설정 중앙화
- `.env` - 환경 변수

### 수정된 파일
- `src/hooks/useWebSocket.ts` - ngrok URL 적용
- `src/components/map/GPSMap.tsx` - ngrok URL 적용
- `src/components/home/WeatherWidget.tsx` - ngrok URL 적용

### 설정 유지
- `vite.config.ts` - 이미 ngrok 도메인 허용 설정됨
- `package.json` - 변경 없음

---

## 🔗 관련 링크

- [ngrok 공식 문서](https://ngrok.com/docs)
- [Vite 공식 문서](https://vitejs.dev)
- [React 공식 문서](https://react.dev)
- [Leaflet 지도 API](https://leafletjs.com)

---

**작성일**: 2025-11-17
**최종 수정**: 2025-11-17
