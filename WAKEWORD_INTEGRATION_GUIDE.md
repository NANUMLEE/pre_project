# 🎙️ Wakeword 기반 음성 트리거 통합 가이드

## 📋 목차
1. [전체 아키텍처](#전체-아키텍처)
2. [신규 파일 설명](#신규-파일-설명)
3. [Running.tsx 통합 방법](#runningtsx-통합-방법)
4. [버튼 기반 vs Wakeword 기반 비교](#버튼-기반-vs-wakeword-기반-비교)
5. [모바일 환경 대응](#모바일-환경-대응)
6. [트러블슈팅](#트러블슈팅)

---

## 🏗️ 전체 아키텍처

### 시스템 구성도

```
┌─────────────────────────────────────────────────────────┐
│                  Running 화면 (러닝 중)                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [시작 버튼] ──┬──> 기존 러닝 로직 (GPS, Timer 등)      │
│                │                                          │
│                └──> Wakeword Listener 활성화 (신규)      │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  WakewordListener (신규 컴포넌트)                │    │
│  │  - "리즘아" 대기 (연속 감지)                     │    │
│  │  - 감지 → 명령어 녹음 → 처리 → TTS 응답        │    │
│  │  - 응답 완료 → 다시 "리즘아" 대기              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  [VoiceCommandButton] (기존 버튼 기반)                   │
│  - 수동 클릭으로도 여전히 사용 가능                      │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 상태 흐름도

```
[러닝 시작 버튼 클릭]
         ↓
    마이크 권한 요청
         ↓
┌──────────────────────┐
│ LISTENING_WAKEWORD    │ ←──────────┐
│ (2.5초 녹음 + STT)    │            │
└──────────────────────┘            │
         ↓ (wakeword 감지)          │
┌──────────────────────┐            │
│ RECORDING_COMMAND     │            │
│ (4초 명령어 녹음)     │            │
└──────────────────────┘            │
         ↓                           │
┌──────────────────────┐            │
│ PROCESSING            │            │
│ (intent 파싱)         │            │
└──────────────────────┘            │
         ↓                           │
┌──────────────────────┐            │
│ SPEAKING              │            │
│ (Web Speech TTS)      │            │
└──────────────────────┘            │
         ↓ (TTS 완료)               │
         └────────────────────────┘
```

---

## 📦 신규 파일 설명

### 1. `utils/audioRecorder.ts`

**역할**: 오디오 녹음 유틸리티 클래스

**주요 클래스**:
- `AudioRecorder`: MediaRecorder 래퍼
  - `start(options)`: 녹음 시작
  - `stop()`: 녹음 종료 및 Blob 반환
  - `isRecording()`: 녹음 중 확인

- `SimpleVAD`: Voice Activity Detection (선택 사항)
  - `getVolume()`: 현재 음량 레벨
  - `isSpeaking()`: 음성 활동 감지

**사용 예시**:
```typescript
const recorder = new AudioRecorder();

// 3초 녹음
await recorder.start({ maxDuration: 3000 });
const audioBlob = await recorder.stop();

// 서버로 전송
const formData = new FormData();
formData.append('file', audioBlob, 'audio.webm');
```

---

### 2. `hooks/useWakewordDetection.ts`

**역할**: Wakeword 기반 음성 인터랙션 로직

**핵심 기능**:
1. **Wakeword Listening Loop**
   - 3초 녹음 → Whisper STT → "헤이 리즘" 포함 확인 (유사도 매칭 지원)
   - 3초마다 반복
   - Levenshtein Distance 기반 유사도 매칭 (편집 거리 30% 이내 허용)

2. **명령어 처리**
   - Wakeword 감지 시 4초 녹음
   - 서버 API 호출 (`/api/voice-command`)
   - Intent 파싱 및 이모티콘 전송

3. **TTS 응답**
   - Web Speech API로 음성 응답
   - 재생 완료 후 자동으로 Wakeword listening 복귀

**사용 예시**:
```typescript
const { state, startListening, stopListening } = useWakewordDetection({
  wakewords: ['헤이 리즘', '헤이리즘', '헤이 리즘아'],
  wakewordDuration: 3000,    // 3초 (더 긴 문구를 위해 증가)
  commandDuration: 4000,     // 4초
  pollingInterval: 3000,     // 3초마다 체크
  userId: 'user123',
  onCommandResult: (result) => {
    console.log('명령 결과:', result);
    // 이모티콘 전송, UI 업데이트 등
  },
  onTTSStart: () => {
    // TTS 시작 시 마이크 일시 중단 가능
  },
  onTTSEnd: () => {
    // TTS 종료 시 마이크 재활성화 가능
  }
});

// 사용자 제스처(버튼 클릭) 후 시작
startListening();
```

**상태 타입**:
```typescript
type VoiceState =
  | 'IDLE'                    // 비활성
  | 'LISTENING_WAKEWORD'      // Wakeword 대기
  | 'RECORDING_COMMAND'       // 명령어 녹음
  | 'PROCESSING'              // 처리 중
  | 'SPEAKING'                // TTS 재생
  | 'ERROR';                  // 오류
```

---

### 3. `components/WakewordListener.tsx`

**역할**: Wakeword 리스너 UI 컴포넌트

**기능**:
- 실시간 상태 표시 (이모지 + 메시지)
- 자동 활성화 (컴포넌트 마운트 시 자동으로 wakeword listening 시작)
- 플로팅 형태로 화면 우하단에 표시 (bottom: 280px)

**Props**:
```typescript
interface WakewordListenerProps {
  userId: string;
  wakewords?: string[];                           // 기본값: ['헤이 리즘', '헤이리즘', '헤이 리즘아']
  onCommandResult?: (result: VoiceCommandResult) => void;
  onTTSStart?: () => void;
  onTTSEnd?: () => void;
}
```

**주요 특징**:
- useEffect를 통해 컴포넌트 마운트 시 자동으로 startListening() 호출
- 언마운트 시 자동으로 stopListening() 호출하여 정리

**UI 상태별 표시**:
- 😴 대기 중 (IDLE)
- 👂 "헤이 리즘"이라고 불러보세요 (LISTENING_WAKEWORD)
- 🎤 명령을 말씀해 주세요 (RECORDING_COMMAND)
- ⏳ 처리 중... (PROCESSING)
- 🔊 응답 중... (SPEAKING)
- ❌ 오류 발생 (ERROR)

---

## 🔧 Running.tsx 통합 방법

### Step 1: Import 추가

```typescript
// Running.tsx 상단에 추가
import WakewordListener from '../WakewordListener';
import type { VoiceCommandResult } from '../../hooks/useWakewordDetection';
```

### Step 2: State 추가

```typescript
export function Running({ course, onComplete, onBack }: RunningProps) {
  // 기존 state들...

  // ✨ Wakeword 관련 state (신규)
  const [isWakewordActive, setIsWakewordActive] = useState(false);

  // ... 나머지 코드
```

### Step 3: Running 페이지 진입 시 자동으로 Wakeword 활성화

```typescript
// ✨ Running 페이지 진입 시 Wakeword 자동 활성화 (러닝은 수동 시작)
useEffect(() => {
  if (isLoggedIn) {
    console.log('🎙️ Running 페이지 진입 → Wakeword 미리 활성화');
    setIsWakewordActive(true);
  }

  // 페이지 떠날 때 Wakeword 비활성화
  return () => {
    console.log('⏹️ Running 페이지 종료 → Wakeword 비활성화');
    setIsWakewordActive(false);
  };
}, [isLoggedIn]);

// 러닝 시작은 별도로 처리
const handleStart = () => {
  if (!isLoggedIn) {
    alert('러닝을 시작하려면 먼저 로그인하세요.');
    return;
  }

  setIsRunning(true);
  setIsPaused(false);
  console.log('🏃 러닝 시작! (Wakeword는 이미 활성화됨)');
};
```

### Step 4: "러닝 종료" 처리

```typescript
const handleStopConfirm = () => {
  // 기존 종료 로직...
  // Wakeword는 Running 페이지를 떠날 때 자동으로 비활성화됨 (useEffect의 cleanup)

  if (duration > 0) {
    const newRun: Run = { /* ... */ };
    onComplete(newRun);
  }
};
```

**참고**: Wakeword 비활성화는 Step 3의 useEffect cleanup 함수에서 자동으로 처리됩니다.

### Step 5: 이모티콘 전송 콜백 처리

```typescript
// ✨ Wakeword 명령어 결과 처리 핸들러 (신규)
const handleWakewordCommand = (result: VoiceCommandResult) => {
  console.log('🎯 Wakeword 명령 처리:', result);

  // 이모티콘 전송 명령어 처리
  if (result.intent === 'send_emoji' && result.emojiType && result.targetName) {
    // 타겟 사용자 찾기
    const targetUser = otherUsers.find(user =>
      user.name?.includes(result.targetName!) ||
      user.userId?.includes(result.targetName!)
    );

    if (targetUser) {
      // 이모티콘 전송
      sendEmoji(targetUser.id, result.emojiType);
      console.log(`✅ ${targetUser.name}님에게 ${result.emojiType} 전송`);
    } else {
      console.warn(`⚠️ "${result.targetName}" 사용자를 찾을 수 없습니다`);
    }
  }
};
```

### Step 6: WakewordListener 컴포넌트 추가

```typescript
return (
  <div className="min-h-screen bg-[#2e2d52] text-white flex flex-col overflow-hidden relative rounded-3xl">
    {/* Header */}
    {/* ... 기존 헤더 코드 ... */}

    {/* Map Area */}
    {/* ... 기존 지도 코드 ... */}

    {/* Stats Section */}
    {/* ... 기존 통계 코드 ... */}

    {/* 음성 명령 플로팅 버튼 (기존) */}
    {isLoggedIn && userId && (
      <VoiceCommandButton
        userId={userId}
        compact={true}
        onResult={handleWakewordCommand}
      />
    )}

    {/* ✨ Wakeword 리스너 (신규) */}
    {isLoggedIn && userId && isWakewordActive && (
      <WakewordListener
        userId={userId}
        wakewords={['헤이 리즘', '헤이리즘', '헤이 리즘아']}
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

### Step 7: 완료!

위의 단계들을 모두 완료하면 다음과 같이 동작합니다:

1. **Running 페이지 진입**
   - 자동으로 Wakeword 리스너가 활성화됨
   - 화면 우하단에 "헤이 리즘"이라고 불러보세요 표시

2. **러닝 시작**
   - "시작" 버튼 클릭 시 러닝 시작
   - Wakeword는 이미 활성화되어 있으므로 즉시 사용 가능

3. **음성 명령 사용**
   - "헤이 리즘, 00한테 파이팅 보내줘"
   - 자동으로 명령 인식 및 처리

4. **페이지 종료**
   - Running 페이지를 떠나면 자동으로 Wakeword 비활성화

---

## 🔄 버튼 기반 vs Wakeword 기반 비교

### 기존: 버튼 기반 (VoiceCommandButton)

```
사용자 액션:
1. 플로팅 버튼 클릭 (🎙️)
2. 녹음 중... (🎤)
3. 다시 클릭하여 종료
4. 서버 처리 → TTS 응답

특징:
✅ 명시적 제어 가능
✅ 녹음 시간을 사용자가 결정
❌ 매번 버튼을 눌러야 함
❌ 러닝 중 버튼 조작이 불편
```

### 신규: Wakeword 기반 (WakewordListener)

```
사용자 액션:
1. Running 페이지 진입 시 자동으로 Wakeword 활성화
2. 이후 "헤이 리즘, 00한테 파이팅 보내줬"라고 말하기만 하면 됨
3. 자동으로 처리 → TTS 응답
4. 다시 자동으로 Wakeword 대기 상태로 복귀

특징:
✅ 핸즈프리 (버튼 없이 음성만으로 제어)
✅ 러닝 중 자연스러운 인터랙션
✅ 연속적인 대화 가능
✅ 유사도 매칭으로 인식률 향상 (Levenshtein Distance)
✅ Running 페이지 진입 시 자동 활성화
❌ 배터리 소모 증가 (연속 녹음)
❌ 주변 소음에 민감
```

### 통합 전략: 두 방식 모두 제공

- **Wakeword**: 러닝 중 핸즈프리 인터랙션 (기본)
- **버튼**: 명시적 제어가 필요할 때 (보조)

사용자는 상황에 맞게 선택 가능:
- 조용한 환경 → Wakeword 사용
- 시끄러운 환경 → 버튼 사용

---

## 📱 모바일 환경 대응

### 1. 마이크 권한 (필수)

**문제**: 모바일 브라우저는 보안상 사용자 제스처 없이 마이크 접근 불가

**해결**: 반드시 버튼 클릭 후 활성화

```typescript
// ❌ 나쁜 예: 페이지 로드 시 자동 시작
useEffect(() => {
  startListening(); // iOS Safari에서 차단됨!
}, []);

// ✅ 좋은 예: 사용자 제스처(버튼 클릭) 후 시작
const handleStart = () => {
  setIsRunning(true);
  setIsWakewordActive(true); // "러닝 시작" 버튼 클릭 후 활성화
};
```

### 2. iOS Safari 주의사항

#### 문제 1: SpeechSynthesis 음성 목록 로드 지연

```typescript
// ❌ 나쁜 예
const voices = window.speechSynthesis.getVoices(); // 빈 배열 반환 가능

// ✅ 좋은 예
export function getKoreanVoice(): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();

    if (voices.length > 0) {
      resolve(voices.find(v => v.lang === 'ko-KR') || null);
      return;
    }

    // iOS Safari: voiceschanged 이벤트 대기
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices.find(v => v.lang === 'ko-KR') || null);
    };
  });
}
```

#### 문제 2: TTS 재생 중 새 음성 시작 시 중단

```typescript
// ✅ 항상 이전 음성 중단 후 시작
window.speechSynthesis.cancel();  // 기존 TTS 중단
window.speechSynthesis.speak(utterance);  // 새 TTS 시작
```

### 3. TTS 재생 중 마이크 충돌 방지

**문제**: TTS 스피커 출력이 마이크에 잡혀서 에코/피드백 발생

**해결 방법 1**: TTS 재생 중 Wakeword listening 일시 중단

```typescript
const { state, startListening, stopListening } = useWakewordDetection({
  // ...
  onTTSStart: () => {
    // TTS 시작 시 wakeword listening 일시 중단
    console.log('🔊 TTS 재생 중 - Wakeword 감지 중단');
  },
  onTTSEnd: () => {
    // TTS 종료 시 자동으로 wakeword listening 재개
    console.log('✅ TTS 완료 - Wakeword 감지 재개');
  }
});
```

**해결 방법 2**: 이어폰 사용 권장

사용자에게 이어폰 사용을 권장하는 UI 추가:

```typescript
{!hasHeadphones && (
  <div className="headphone-recommendation">
    💡 이어폰 사용 시 음성 인식이 더 정확합니다
  </div>
)}
```

### 4. 배터리 최적화

**문제**: 연속 녹음 → 배터리 소모 증가

**최적화 전략**:

```typescript
// 1. Wakeword 체크 주기 조절 (3초 → 5초)
const { state } = useWakewordDetection({
  pollingInterval: 5000,  // 배터리 절약
  // ...
});

// 2. 러닝 일시정지 시 Wakeword 비활성화
useEffect(() => {
  if (isPaused) {
    setIsWakewordActive(false);
  } else if (isRunning) {
    setIsWakewordActive(true);
  }
}, [isPaused, isRunning]);

// 3. 화면이 백그라운드로 가면 자동 중지
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      setIsWakewordActive(false);
      console.log('📱 백그라운드 → Wakeword 중지');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

### 5. 네트워크 오류 대응

```typescript
// useWakewordDetection.ts 내부에서 재시도 로직
const sendToWhisper = async (audioBlob: Blob, retries = 3): Promise<string> => {
  for (let i = 0; i < retries; i++) {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      const response = await fetch(`${API_BASE_URL}/api/stt`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.text || '';
      }
    } catch (error) {
      console.error(`❌ STT 시도 ${i + 1}/${retries} 실패:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기 후 재시도
    }
  }
  return '';
};
```

---

## 🔍 트러블슈팅

### 문제 1: "헤이 리즘"이 감지되지 않아요

**원인**:
- 주변 소음이 큼
- 발음이 명확하지 않음
- Whisper STT 정확도 문제

**해결**:
```typescript
// 1. Wakeword 목록 확장 (이미 적용됨)
wakewords={['헤이 리즘', '헤이리즘', '헤이 리즘아']}

// 2. 녹음 시간 이미 3초로 설정됨
wakewordDuration: 3000

// 3. 유사도 매칭 이미 적용됨 (Levenshtein Distance)
// - 편집 거리가 길이의 30% 이내이거나 최소 2 이하면 매칭
// - 예: "헤이리줌", "헤리즘", "헤이림" 등도 인식 가능

// 4. 추가 녹음 시간 연장이 필요하면:
const { state } = useWakewordDetection({
  wakewordDuration: 3500,  // 3.5초로 증가
  // ...
});
```

**팁**: "헤이 리즘"을 또박또박 발음하면 인식률이 높아집니다.

### 문제 2: TTS가 재생되지 않아요 (iOS Safari)

**원인**: speechSynthesis.speak()가 사용자 제스처 컨텍스트 밖에서 호출됨

**해결**:
```typescript
// ✅ 첫 TTS는 반드시 사용자 제스처 직후 실행
const handleStart = async () => {
  setIsRunning(true);

  // 초기 TTS로 음성 컨텍스트 확보
  await speakWithWebSpeech('음성 인식이 시작됩니다');

  // 이후 Wakeword 활성화
  setIsWakewordActive(true);
};
```

### 문제 3: 배터리 소모가 너무 커요

**해결**:
```typescript
// 1. 체크 주기를 늘림
pollingInterval: 5000,  // 3초 → 5초

// 2. VAD (Voice Activity Detection) 사용
// - 음성이 감지될 때만 STT 전송
// - audioRecorder.ts의 SimpleVAD 활용

// 3. 일정 시간 무활동 시 자동 중지
useEffect(() => {
  let inactivityTimer: number;

  if (state === 'LISTENING_WAKEWORD') {
    inactivityTimer = window.setTimeout(() => {
      console.log('⏰ 10분간 활동 없음 → Wakeword 자동 중지');
      stopListening();
    }, 600000); // 10분
  }

  return () => clearTimeout(inactivityTimer);
}, [state]);
```

### 문제 4: 이모티콘이 전송되지 않아요

**원인**: 타겟 사용자 이름 매칭 실패

**해결**:
```typescript
// Fuzzy 매칭 적용
const findUserByName = (name: string): UserLocation | null => {
  const normalized = name.toLowerCase().replace(/\s/g, '');

  return otherUsers.find(user => {
    const userName = (user.name || user.userId || '').toLowerCase().replace(/\s/g, '');

    // 정확히 일치
    if (userName === normalized) return true;

    // 부분 일치
    if (userName.includes(normalized) || normalized.includes(userName)) return true;

    // 첫 글자 일치 (예: "김철수" → "김")
    if (userName.startsWith(normalized[0])) return true;

    return false;
  }) || null;
};
```

### 문제 5: 연속으로 명령을 내릴 수 없어요

**원인**: TTS 재생 완료 후 Wakeword listening으로 복귀하는 데 시간이 걸림

**해결**:
```typescript
// useWakewordDetection.ts에서 TTS 완료 즉시 다음 체크 시작
utterance.onend = () => {
  console.log('✅ TTS 완료');
  onTTSEnd?.();
  resolve();

  // 즉시 다음 wakeword 체크 시작 (딜레이 없이)
  if (isActiveRef.current) {
    setState('LISTENING_WAKEWORD');
    wakewordLoop(); // 즉시 실행
  }
};
```

---

## ✅ 테스트 체크리스트

### 기능 테스트
- [ ] "러닝 시작" 버튼 클릭 → Wakeword 활성화
- [ ] "리즘아" 말하면 명령어 모드로 전환
- [ ] "00한테 파이팅 보내줘" → 이모티콘 전송 성공
- [ ] TTS 응답 재생 확인
- [ ] TTS 완료 후 다시 Wakeword 대기 상태 복귀
- [ ] 버튼 기반 음성 명령도 여전히 작동
- [ ] 러닝 종료 시 Wakeword 자동 비활성화

### 모바일 환경 테스트
- [ ] iOS Safari에서 마이크 권한 요청 정상
- [ ] iOS Safari에서 TTS 재생 정상
- [ ] Android Chrome에서 마이크 권한 요청 정상
- [ ] Android Chrome에서 TTS 재생 정상
- [ ] 이어폰 연결 시 에코 없음
- [ ] 스피커 모드에서 TTS 재생 시 마이크 피드백 확인

### 엣지 케이스 테스트
- [ ] 네트워크 끊김 시 재시도 로직 작동
- [ ] 주변 소음 환경에서도 Wakeword 감지
- [ ] 배터리 절약 모드에서도 정상 작동
- [ ] 앱 백그라운드 전환 시 Wakeword 자동 중지
- [ ] 포어그라운드 복귀 시 Wakeword 재활성화

---

## 📚 참고 자료

### Web Speech API
- [MDN: Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [MDN: SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)

### MediaRecorder API
- [MDN: MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

### iOS Safari 특수 사항
- [Apple WebKit: Audio Autoplay Policy](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)

---

## 🎯 다음 단계

### 고급 기능 추가 아이디어

1. **실제 Wakeword 라이브러리 사용**
   - [Porcupine](https://picovoice.ai/platform/porcupine/) 같은 전문 wakeword detection 엔진
   - 오프라인 동작 가능
   - Whisper 호출 횟수 대폭 감소 → 비용/배터리 절약

2. **대화 컨텍스트 유지**
   - "00한테 파이팅 보내줘" → "하이파이브도 보내줘" (타겟 유지)
   - 이전 명령어 기억

3. **러닝 통계 음성 조회**
   - "지금 페이스 알려줘"
   - "총 거리 얼마야?"

4. **음성으로 코스 제어**
   - "일시정지"
   - "다시 시작"
   - "러닝 종료"

---

**🎉 이제 Wakeword 기반 음성 트리거를 완벽하게 통합할 준비가 되었습니다!**
