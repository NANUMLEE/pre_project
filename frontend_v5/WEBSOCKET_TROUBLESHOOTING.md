# WebSocket 오류 진단 및 해결 가이드

## 🔴 현재 발견된 문제

### 1. **ngrok URL 만료** (가장 높은 확률)
```
상태: 🔴 HIGH PRIORITY
현재 설정: wss://paramedical-unsortable-nan.ngrok-free.dev
문제: ngrok 터널은 일정 시간 후 자동으로 새로운 URL 생성됨
```

**해결 단계:**
1. 백엔드 터미널에서 현재 ngrok URL 확인
   ```bash
   ngrok http 8080  # WebSocket 서버용
   ngrok http 8000  # API 서버용
   ```
2. 새로운 URL을 `.env` 파일에 업데이트
   ```env
   VITE_WS_BASE_URL=wss://새로운_ngrok_URL
   VITE_API_BASE_URL=https://새로운_ngrok_URL
   ```
3. 프론트엔드 재시작

---

### 2. **코드상 수정 사항** (이미 반영됨)

#### ✅ 수정 완료:

1. **userId 없을 때도 WebSocket 연결**
   - 이전: userId가 없으면 위치 공유 차단
   - 현재: clientId를 대체키로 사용
   - 파일: `src/hooks/useWebSocket.ts:49`
   ```typescript
   const userIdParam = userId || clientId;
   const fullUrl = `${wsUrl}?userId=${userIdParam}`;
   ```

2. **로그인 필수 화면 제거**
   - 이전: 로그인하지 않으면 지도 표시 안 함
   - 현재: 경고만 표시하고 지도 표시
   - 파일: `src/components/map/GPSMap.tsx:79-81`
   ```typescript
   if (!isLoggedIn) {
     console.warn('⚠️ 로그인하지 않은 사용자입니다. clientId로 위치 추적합니다.');
   }
   ```

3. **데이터 필터링 개선**
   - 파일: `src/hooks/useWebSocket.ts:68-75`
   ```typescript
   const currentUserId = userId || clientId;
   const otherUsersList = (data.locations || []).filter(
     (loc) => loc.userId !== currentUserId && loc.id !== clientId
   );
   ```

4. **재연결 로깅 추가**
   - 파일: `src/hooks/useWebSocket.ts:121`
   ```typescript
   console.log('🔄 WebSocket 자동 재연결 시도...');
   ```

5. **에러 디버깅 정보 추가**
   - 파일: `src/hooks/useWebSocket.ts:113-123`
   ```typescript
   console.error('🔍 확인 사항:', {
     url: wsUrl,
     userId: userId,
     연결상태: ws.readyState,
     에러이벤트: event
   });
   ```

---

## 🔍 WebSocket 연결 로그 확인 방법

### 브라우저 콘솔에서 확인할 로그:

```
1️⃣ 연결 시도:
   🔌 WebSocket 연결 시도: wss://...
   📍 WebSocket URL: wss://...?userId=...

2️⃣ 연결 성공:
   ✅ WebSocket 연결 성공!
   👤 연결된 userId: ...

3️⃣ 데이터 수신:
   📥 WebSocket 수신: { type: 'locations', ... }
   📍 받은 위치: 3명, 필터링 후: 2명

4️⃣ 오류 발생:
   ❌ WebSocket 오류: ...
   🔍 확인 사항: { url: ..., userId: ... }
```

### DevTools에서 WebSocket 확인:
1. F12 → Network 탭
2. "WS" 필터 클릭
3. `ws://` 또는 `wss://` 로 시작하는 연결 확인
4. 연결 상태 확인:
   - ✅ 101 Switching Protocols = 성공
   - ❌ 그 외 = 실패

---

## 📋 체크리스트

### 백엔드 확인 사항:
- [ ] WebSocket 서버 포트 8080에서 실행 중인가?
- [ ] ngrok이 정상 실행 중인가?
  ```bash
  ngrok http 8080
  ```
- [ ] ngrok URL이 변경되었는가?
- [ ] 백엔드 로그에 WebSocket 연결 기록이 있는가?

### 프론트엔드 확인 사항:
- [ ] `.env` 파일의 VITE_WS_BASE_URL이 최신 ngrok URL인가?
- [ ] 프론트엔드를 다시 시작했는가? (npm run dev)
- [ ] 브라우저 캐시를 비웠는가? (Ctrl+Shift+Delete)
- [ ] 브라우저 콘솔에 에러 메시지가 있는가?
- [ ] WebSocket 연결 로그가 출력되는가?

### 네트워크 확인 사항:
- [ ] 인터넷 연결이 정상인가?
- [ ] 방화벽이 WebSocket을 차단하지 않는가?
- [ ] ngrok 계정 계획 제한이 없는가?

---

## 🚀 일반적인 해결 순서

### 1단계: ngrok URL 확인
```bash
# 터미널에서 현재 ngrok 실행
ngrok http 8080

# 출력에서 다음을 찾기:
# Forwarding                    https://xxxx-xxxx-xxxx.ngrok-free.dev -> http://localhost:8080
```

### 2단계: 환경 변수 업데이트
```env
VITE_WS_BASE_URL=wss://새로운_URL  # https → wss로 변환
```

### 3단계: 프론트엔드 재시작
```bash
npm run dev
```

### 4단계: 브라우저 재실행
```
1. F12 (DevTools 열기)
2. Network 탭
3. 페이지 새로고침 (F5)
4. "WS" 필터로 WebSocket 연결 확인
```

### 5단계: 로그 확인
```javascript
// 콘솔에서 확인:
// 🔌 WebSocket 연결 시도: wss://...
// ✅ WebSocket 연결 성공!
// 📥 WebSocket 수신: ...
```

---

## 🛠️ 추가 개선사항 (선택사항)

### 자동 재연결 개선:
```typescript
// 현재: 3초마다 재연결
// 권장: Exponential backoff (1초 → 2초 → 4초 → 8초)
```

### 연결 상태 표시:
```typescript
// NearbyMap.tsx의 "위치 공유 준비 중..." 메시지
// isConnected 상태를 UI에 명확히 표시
```

### 오프라인 대응:
```typescript
// WebSocket 연결 실패 시 마지막 데이터 캐싱
// 오프라인 상태 시각적 표시
```

---

## 📞 추가 도움말

### ngrok 설명:
- **목적**: 로컬 서버를 인터넷에 노출
- **특징**: 자동 HTTPS/WSS 지원, 동적 URL
- **주의**: URL은 매번 다름, 재시작하면 변경됨

### WebSocket vs HTTP:
- **HTTP**: 요청-응답 방식 (단방향)
- **WebSocket**: 양방향 지속 연결 (실시간)
- **사용처**: 실시간 위치 공유, 채팅, 게임

### 포트 설명:
- **8000**: REST API 서버
- **8080**: WebSocket 서버
- **3000**: 프론트엔드 (Vite)

---

**마지막 수정**: 2025-11-18
**상태**: 🔄 대기 중 (ngrok URL 업데이트 필요)
