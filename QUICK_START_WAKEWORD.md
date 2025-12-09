# ⚡ Wakeword 기능 빠른 시작 가이드

## 🎯 목표
"러닝 시작" 버튼 한 번 클릭 후, "리즘아, 00한테 파이팅 보내줘"라고 말하면 자동으로 이모티콘이 전송되도록 구현

---

## 📦 1단계: 신규 파일 확인

다음 3개 파일이 추가되었습니다:

```
frontend_v5/src/
├── utils/
│   └── audioRecorder.ts          ✅ 생성 완료
├── hooks/
│   └── useWakewordDetection.ts   ✅ 생성 완료
└── components/
    └── WakewordListener.tsx      ✅ 생성 완료
```

---

## 🔧 2단계: Running.tsx 수정

### 1. Import 추가

파일: `frontend_v5/src/components/running/Running.tsx`

```typescript
// 기존 import들...
import VoiceCommandButton from '../VoiceCommandButton';

// ✨ 신규 추가
import WakewordListener from '../WakewordListener';
import type { VoiceCommandResult } from '../../hooks/useWakewordDetection';
```

### 2. State 추가

```typescript
export function Running({ course, onComplete, onBack }: RunningProps) {
  // 기존 state들...
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // ...

  // ✨ 신규 추가
  const [isWakewordActive, setIsWakewordActive] = useState(false);
```

### 3. 명령어 결과 처리 함수 추가

```typescript
// ✨ 신규 추가: Wakeword 명령어 결과 처리
const handleWakewordCommand = (result: VoiceCommandResult) => {
  console.log('🎯 음성 명령 처리:', result);

  // 이모티콘 전송 명령어
  if (result.intent === 'send_emoji' && result.emojiType && result.targetName) {
    // 타겟 사용자 찾기 (이름 또는 ID로)
    const targetUser = otherUsers.find(user =>
      user.name?.includes(result.targetName!) ||
      user.userId?.includes(result.targetName!)
    );

    if (targetUser) {
      // WebSocket으로 이모티콘 전송
      sendEmoji(targetUser.id, result.emojiType);
      console.log(`✅ ${targetUser.name}님에게 ${result.emojiType} 이모티콘 전송`);
    } else {
      console.warn(`⚠️ "${result.targetName}" 사용자를 찾을 수 없습니다`);
    }
  }
};
```

### 4. "러닝 시작" 버튼에 Wakeword 활성화 연결

```typescript
const handleStart = () => {
  // 로그인 체크 (기존)
  if (!isLoggedIn) {
    alert('러닝을 시작하려면 먼저 로그인하세요.');
    return;
  }

  // 기존 로직
  setIsRunning(true);
  setIsPaused(false);

  // ✨ 신규 추가: Wakeword 자동 활성화
  setIsWakewordActive(true);
  console.log('🎙️ Wakeword 리스너 활성화됨');
};
```

### 5. "러닝 종료" 시 Wakeword 비활성화

```typescript
const handleStopConfirm = () => {
  console.log('종료 버튼 클릭 - duration:', duration, 'distance:', distance);

  // ✨ 신규 추가: Wakeword 비활성화
  setIsWakewordActive(false);

  // 기존 종료 로직
  if (duration > 0) {
    const newRun: Run = {
      id: Date.now().toString(),
      userId: userId || 'unknown',
      courseId: course?.id,
      date: new Date(),
      duration,
      distance: parseFloat(distance.toFixed(2)),
      calories: calculateCalories(),
      pace: parseFloat(calculatePace().toFixed(2)),
      route: []
    };
    onComplete(newRun);
    setShowStopDialog(false);
  }
};
```

### 6. JSX에 WakewordListener 추가

return 문 안의 맨 마지막, VoiceCommandButton 아래에 추가:

```typescript
return (
  <div className="min-h-screen bg-[#2e2d52] text-white flex flex-col overflow-hidden relative rounded-3xl">
    {/* ... 기존 Header, Map, Stats 코드 ... */}

    {/* 음성 명령 플로팅 버튼 (기존) */}
    {isLoggedIn && userId && (
      <VoiceCommandButton
        userId={userId}
        compact={true}
        onResult={handleWakewordCommand}  {/* ✨ 콜백 연결 */}
      />
    )}

    {/* ✨ 신규 추가: Wakeword 리스너 */}
    {isLoggedIn && userId && isWakewordActive && (
      <WakewordListener
        userId={userId}
        wakewords={['리즘아', '리즈마']}
        onCommandResult={handleWakewordCommand}
        onTTSStart={() => {
          console.log('🔊 TTS 재생 시작');
        }}
        onTTSEnd={() => {
          console.log('✅ TTS 재생 완료');
        }}
      />
    )}
  </div>
);
```

---

## ✅ 3단계: 동작 확인

### 테스트 시나리오

1. **로그인 후 러닝 화면 진입**
   ```
   ✓ 로그인 완료
   ✓ 코스 선택 후 Running 화면 이동
   ```

2. **"러닝 시작" 버튼 클릭**
   ```
   ✓ 마이크 권한 요청 팝업 → "허용" 클릭
   ✓ 우하단에 Wakeword 상태 표시 등장
   ✓ 상태: 👂 "리즘아"라고 불러보세요
   ```

3. **Wakeword 테스트**
   ```
   사용자: "리즘아"
   ↓
   상태 변화: 👂 → 🎤
   화면: "명령을 말씀해 주세요"
   ```

4. **명령어 테스트**
   ```
   사용자: "00한테 파이팅 보내줘"
   ↓
   상태: 🎤 → ⏳ (처리 중)
   ↓
   WebSocket으로 이모티콘 전송
   ↓
   상태: 🔊 (TTS 재생)
   음성: "00님에게 파이팅 이모티콘을 보냈어요"
   ↓
   상태: 👂 (다시 Wakeword 대기)
   ```

5. **연속 명령 테스트**
   ```
   사용자: "리즘아"
   사용자: "00한테 하이파이브 보내줘"
   ↓ (응답 후 자동으로 다시 대기)

   사용자: "리즘아"
   사용자: "00한테 열정 보내줘"
   ↓ (무한 반복 가능)
   ```

6. **러닝 종료**
   ```
   "종료" 버튼 클릭
   ↓
   Wakeword 자동 비활성화
   우하단 Wakeword 상태 표시 사라짐
   ```

---

## 🔍 디버깅 팁

### 콘솔 로그 확인

브라우저 개발자 도구 콘솔에서 다음 로그를 확인:

```
✅ 정상 흐름:
🎬 Wakeword Listening 시작
👂 Wakeword 감지 시도...
📝 인식된 텍스트: 리즘아
🎉 Wakeword 감지! 리즘아
🎤 녹음 시작 (최대 4000ms)
✅ 녹음 완료: 45.23 KB
✅ 음성 명령 결과: {...}
🎯 음성 명령 처리: {...}
✅ 00님에게 💪 이모티콘 전송
🔊 TTS 시작: 00님에게 파이팅 이모티콘을 보냈어요
✅ TTS 완료
👂 Wakeword 감지 시도...
```

### 문제 해결

| 문제 | 원인 | 해결 |
|------|------|------|
| 마이크 권한 팝업이 안 떠요 | HTTPS 아님 또는 권한 차단됨 | HTTPS 사용 또는 브라우저 설정 확인 |
| "리즘아"가 감지 안 돼요 | 주변 소음 또는 발음 불명확 | 조용한 곳에서 명확히 발음 |
| TTS가 안 나와요 (iOS) | 사용자 제스처 컨텍스트 밖 | "러닝 시작" 버튼 클릭 후 테스트 |
| 이모티콘이 안 보내져요 | 타겟 사용자 매칭 실패 | 정확한 이름 사용 또는 로그 확인 |
| 배터리가 빨리 닳아요 | 연속 녹음 중 | `pollingInterval` 늘리기 (3초→5초) |

---

## 📱 모바일 테스트 가이드

### iOS Safari
1. Safari 설정 → 개인정보 보호 → 마이크 접근 허용
2. "러닝 시작" 버튼 클릭 (사용자 제스처 필수)
3. 마이크 권한 팝업 → "허용"
4. 이어폰 연결 권장 (스피커 모드 시 에코 발생 가능)

### Android Chrome
1. Chrome 설정 → 사이트 설정 → 마이크 → 허용
2. "러닝 시작" 버튼 클릭
3. 마이크 권한 팝업 → "허용"
4. 이어폰 연결 권장

---

## 🎨 UI 커스터마이징

### Wakeword 상태 표시 위치 변경

`WakewordListener.tsx`에서:

```css
.wakeword-listener-container {
  position: fixed;
  bottom: 280px;  /* ← 여기 수정 */
  right: 20px;    /* ← 여기 수정 */
  z-index: 999;
}
```

### Wakeword 목록 변경

```typescript
<WakewordListener
  userId={userId}
  wakewords={['헤이 리즘', 'OK 리즘', '리즘아']}  {/* ← 원하는 단어 추가 */}
  // ...
/>
```

### 녹음 시간 조절

`useWakewordDetection` 호출 시:

```typescript
const { state } = useWakewordDetection({
  wakewords: ['리즘아'],
  wakewordDuration: 3000,   // ← Wakeword 감지 녹음 시간 (기본 2500ms)
  commandDuration: 5000,    // ← 명령어 녹음 시간 (기본 4000ms)
  pollingInterval: 4000,    // ← 체크 주기 (기본 3000ms)
  userId,
  // ...
});
```

---

## 🚀 배포 전 체크리스트

- [ ] HTTPS 환경에서 테스트 완료
- [ ] iOS Safari에서 마이크/TTS 정상 동작 확인
- [ ] Android Chrome에서 마이크/TTS 정상 동작 확인
- [ ] 이모티콘 전송 성공 확인
- [ ] 연속 명령 처리 확인
- [ ] 배터리 소모 테스트 (10분 이상 사용)
- [ ] 네트워크 불안정 환경 테스트
- [ ] 백그라운드 전환 시 자동 중지 확인
- [ ] 러닝 종료 시 Wakeword 비활성화 확인

---

## 📞 문제 발생 시

1. **콘솔 로그 확인**
   - 브라우저 개발자 도구 → Console 탭
   - 에러 메시지 확인

2. **네트워크 요청 확인**
   - 개발자 도구 → Network 탭
   - `/api/stt` 및 `/api/voice-command` 요청 상태 확인

3. **상태 디버깅**
   ```typescript
   // Running.tsx에서
   console.log('현재 Wakeword 상태:', isWakewordActive);
   console.log('러닝 상태:', isRunning, isPaused);
   console.log('주변 사용자:', otherUsers);
   ```

---

**✅ 이제 wakeword 기능을 사용할 준비가 완료되었습니다!**

핸즈프리로 러닝하면서 편리하게 이모티콘을 보내보세요! 🏃‍♂️🎙️
