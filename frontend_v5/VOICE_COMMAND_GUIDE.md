# 🎤 음성 명령 시스템 통합 가이드

러닝 앱의 음성 명령 기능 전체 시스템 구현 가이드입니다.

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [폴더 구조](#폴더-구조)
3. [백엔드 설정](#백엔드-설정)
4. [프론트엔드 설정](#프론트엔드-설정)
5. [실행 방법](#실행-방법)
6. [API 명세](#api-명세)
7. [사용 가능한 명령어](#사용-가능한-명령어)
8. [문제 해결](#문제-해결)

---

## 🎯 시스템 개요

### 아키텍처
```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│  Frontend   │ ───> │   main.py   │ ───> │ ws_server.py │
│  (React)    │      │  (FastAPI)  │      │ (WebSocket)  │
└─────────────┘      └─────────────┘      └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Whisper    │
                     │   STT Model  │
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Edge TTS   │
                     └──────────────┘
```

### 처리 흐름
1. **프론트엔드**: 사용자가 버튼을 누르고 음성 녹음
2. **main.py**: 음성 bytes를 받아 Whisper로 STT 수행
3. **명령어 분류**: 텍스트를 분석하여 intent 결정
4. **비즈니스 로직**: ws_server에서 주변 러너 정보 조회
5. **TTS 생성**: Edge TTS로 응답 음성 생성
6. **이모티콘 전송**: 필요시 ws_server를 통해 이모티콘 전송
7. **프론트엔드**: TTS 음성 자동 재생 및 결과 표시

---

## 📁 폴더 구조

```
project/
├── backend/
│   ├── main.py                    # FastAPI 메인 서버 (포트 8000)
│   ├── ws_server.py               # WebSocket 서버 (포트 8080)
│   ├── tts/                       # TTS 음성 파일 저장 디렉토리
│   └── data/                      # 러닝 코스/장소 데이터
│
├── whisper_project/
│   ├── runner_voice_model_memory.py   # 음성 처리 파이프라인
│   └── TTS/                       # TTS 관련 모듈
│
└── frontend_v5/
    └── src/
        ├── components/
        │   ├── VoiceCommandButton.tsx    # 음성 명령 버튼 컴포넌트
        │   └── VoiceCommandPage.tsx      # 음성 명령 페이지
        └── App.tsx
```

---

## 🔧 백엔드 설정

### 1. Python 패키지 설치

```bash
# 필수 패키지
pip install fastapi uvicorn
pip install openai-whisper
pip install edge-tts
pip install httpx
pip install sqlalchemy pymysql
pip install python-multipart
```

### 2. main.py (FastAPI 서버)

**주요 기능:**
- ✅ `/api/voice-command` - 음성 명령 처리 엔드포인트
- ✅ TTS 파일 저장 및 `/tts` 경로로 서빙
- ✅ ws_server와 HTTP 통신하여 주변 러너 정보 조회
- ✅ 이모티콘 전송 요청 처리

**실행 방법:**
```bash
cd backend
python main.py
```

서버가 `http://localhost:8000`에서 실행됩니다.

### 3. ws_server.py (WebSocket 서버)

**주요 기능:**
- ✅ WebSocket을 통한 실시간 위치 공유
- ✅ `/api/nearby-runners/{user_id}` - 주변 러너 조회 API
- ✅ `/api/send-emoji` - 이모티콘 전송 API
- ✅ 사용자 이름 DB 조회

**실행 방법:**
```bash
cd backend
python ws_server.py
```

서버가 `http://localhost:8080`에서 실행됩니다.

### 4. runner_voice_model_memory.py

**핵심 함수: `run_pipeline_bytes`**

```python
async def run_pipeline_bytes(
    audio_bytes: bytes,           # 음성 데이터 (메모리 기반)
    nearby_runners: List[Runner], # 주변 러너 목록
    out_path: str,                # TTS 저장 경로
    from_user_id: Optional[str]   # 요청 사용자 ID
) -> dict:
    """
    음성 처리 파이프라인:
    1. Whisper STT (bytes → text)
    2. 명령어 분류 (text → intent)
    3. 비즈니스 로직 (intent → tts_text)
    4. Edge TTS (tts_text → mp3)
    """
```

**중요:** 파일 경로가 아닌 **메모리 bytes**를 직접 처리합니다.

---

## 🎨 프론트엔드 설정

### 1. 필수 패키지

```bash
cd frontend_v5
npm install
```

### 2. VoiceCommandButton.tsx

**기능:**
- 누르고 있는 동안 녹음 (`mousedown` / `touchstart`)
- 떼면 녹음 종료 및 서버 전송 (`mouseup` / `touchend`)
- MediaRecorder로 `audio/webm` 형식 녹음
- FormData로 서버에 업로드
- 응답 받아 TTS 자동 재생

**사용 예시:**
```tsx
import VoiceCommandButton from './components/VoiceCommandButton';

function MyComponent() {
  const handleResult = (result) => {
    console.log('음성 명령 결과:', result);
  };

  return (
    <VoiceCommandButton
      userId="1"
      onResult={handleResult}
    />
  );
}
```

### 3. VoiceCommandPage.tsx

**기능:**
- VoiceCommandButton 통합
- 명령어 가이드 표시
- 명령 히스토리 관리
- 사용자 ID 자동 로드

**App.tsx에 추가:**
```tsx
import VoiceCommandPage from './components/VoiceCommandPage';

function App() {
  return (
    <div>
      {/* 기존 컴포넌트들 */}
      <VoiceCommandPage />
    </div>
  );
}
```

---

## 🚀 실행 방법

### 전체 시스템 실행

**1단계: MySQL 서버 실행**
```bash
# MySQL이 실행 중인지 확인
# DB: Users
# 비밀번호: 12345
```

**2단계: 백엔드 서버 실행 (2개 터미널)**

터미널 1:
```bash
cd backend
python main.py
# ✅ http://localhost:8000 에서 실행
```

터미널 2:
```bash
cd backend
python ws_server.py
# ✅ http://localhost:8080 에서 실행
```

**3단계: 프론트엔드 실행**

터미널 3:
```bash
cd frontend_v5
npm run dev
# ✅ http://localhost:3000 에서 실행
```

### 실행 확인

브라우저에서 다음 URL들이 정상 작동하는지 확인:
- ✅ `http://localhost:8000/` → Runnerism API 메시지
- ✅ `http://localhost:8080/health` → WebSocket 서버 상태
- ✅ `http://localhost:3000` → React 앱

---

## 📡 API 명세

### 1. POST /api/voice-command (main.py)

**요청:**
```
Content-Type: multipart/form-data

- userId: string (사용자 ID)
- file: Blob (audio/webm)
```

**응답:**
```json
{
  "intent": "ASK_NEARBY_RUNNER_WHO",
  "rawText": "주변에 누가 뛰고 있어",
  "ttsText": "김시현, 박신혜 등 4명이 뛰고 있습니다.",
  "audioUrl": "/tts/response_1_20251204_160523_a1b2c3d4.mp3",
  "emojiType": null,
  "targetName": null
}
```

**Intent 종류:**
- `ASK_NEARBY_RUNNER_WHO` - 주변 러너 목록 조회
- `ASK_NEARBY_RUNNER_COUNT` - 주변 러너 수 조회
- `SEND_EMOJI_BROADCAST` - 전체에게 이모티콘
- `SEND_EMOJI_DIRECT` - 특정인에게 이모티콘
- `UNKNOWN` - 알 수 없는 명령

### 2. GET /api/nearby-runners/{user_id} (ws_server.py)

**요청:**
```
GET /api/nearby-runners/1?radius_km=10.0
```

**응답:**
```json
{
  "user_id": "1",
  "user_location": {
    "latitude": 37.5665,
    "longitude": 126.9780
  },
  "radius_km": 10.0,
  "runners": [
    {
      "id": "2",
      "name": "김시현",
      "distance_km": 2.5
    },
    {
      "id": "3",
      "name": "박신혜",
      "distance_km": 5.2
    }
  ]
}
```

### 3. POST /api/send-emoji (ws_server.py)

**요청:**
```json
{
  "from_user_id": "1",
  "to_user_ids": ["2", "3"],  // 또는 ["ALL"]
  "emoji_type": "FIGHTING"     // FIGHTING, HIGHFIVE, FIRE
}
```

**응답:**
```json
{
  "success": true,
  "sent_count": 2,
  "message": "2명에게 이모티콘을 보냈습니다"
}
```

---

## 🎤 사용 가능한 명령어

### 1. 주변 러너 조회

| 명령어 | Intent | 설명 |
|-------|--------|------|
| "주변에 누가 뛰고 있어?" | ASK_NEARBY_RUNNER_WHO | 주변 러너 이름 목록 |
| "근처에 누가 있어?" | ASK_NEARBY_RUNNER_WHO | 주변 러너 이름 목록 |
| "주변에 몇 명 있어?" | ASK_NEARBY_RUNNER_COUNT | 주변 러너 수 |
| "근처에 몇 명 뛰고 있어?" | ASK_NEARBY_RUNNER_COUNT | 주변 러너 수 |

### 2. 이모티콘 전송

| 명령어 | Intent | 설명 |
|-------|--------|------|
| "전체에게 화이팅 보내줘" | SEND_EMOJI_BROADCAST | 모두에게 💪 |
| "전체 러너한테 하이파이브 보내줘" | SEND_EMOJI_BROADCAST | 모두에게 🙌 |
| "김시현한테 화이팅 보내줘" | SEND_EMOJI_DIRECT | 특정인에게 💪 |
| "박신혜한테 하이파이브 보내줘" | SEND_EMOJI_DIRECT | 특정인에게 🙌 |
| "이나눔한테 불꽃 이모티콘 보내줘" | SEND_EMOJI_DIRECT | 특정인에게 🔥 |

### 이모티콘 종류

| 타입 | 아이콘 | 키워드 |
|------|--------|--------|
| FIGHTING | 💪 | 화이팅, 파이팅 |
| HIGHFIVE | 🙌 | 하이파이브 |
| FIRE | 🔥 | 불꽃 |

---

## 🔍 문제 해결

### 1. 마이크 권한 오류

**증상:** "마이크 접근 권한이 필요합니다"

**해결:**
- 브라우저 설정 → 사이트 권한 → 마이크 허용
- HTTPS 사용 (로컬은 localhost로 자동 허용됨)

### 2. CORS 오류

**증상:** `Access-Control-Allow-Origin` 오류

**해결:**
main.py에서 CORS 설정 확인:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. WebSocket 연결 실패

**증상:** ws_server.py와 통신 불가

**확인:**
```bash
# ws_server 실행 확인
curl http://localhost:8080/health

# 응답 예시:
# {"status":"healthy","connected_clients":0,...}
```

### 4. Whisper 모델 로딩 느림

**증상:** 첫 실행 시 STT 느림

**원인:** Whisper 모델 다운로드 중

**해결:**
- 첫 실행 후 모델이 캐시됨 (~140MB)
- 이후 빠르게 실행됨

### 5. TTS 파일 재생 안 됨

**증상:** audioUrl이 404 오류

**확인:**
```bash
# tts 디렉토리 존재 확인
ls backend/tts/

# StaticFiles 마운트 확인 (main.py)
app.mount("/tts", StaticFiles(directory=TTS_DIR), name="tts")
```

### 6. DB 연결 오류

**증상:** MySQL 연결 실패

**확인:**
- main.py: `DB_URL = "mysql+pymysql://root:12345@localhost/Users"`
- ws_server.py: `DB_URL = "mysql+pymysql://root:12345@localhost/Users"`
- 비밀번호가 동일한지 확인

---

## 📊 성능 최적화

### Whisper 모델 선택
```python
# 현재 사용: small (속도 ↑, 정확도 ○)
stt_model = whisper.load_model("small")

# 대안:
# - tiny: 매우 빠름, 정확도 낮음
# - base: 빠름, 정확도 보통
# - medium: 느림, 정확도 높음
# - large: 매우 느림, 정확도 매우 높음
```

### TTS 캐싱
동일한 문장은 캐시하여 재사용 가능 (선택 사항)

---

## 🎯 추가 개선 사항

### 1. 음성 명령 확장
```python
# runner_voice_model_memory.py의 classify_command 함수 수정
def classify_command(text: str) -> dict:
    # 새로운 명령어 추가
    if "페이스" in t and "알려줘" in t:
        result["intent"] = "ASK_MY_PACE"
        return result
```

### 2. UI 커스터마이징
VoiceCommandButton.tsx의 스타일 수정

### 3. 에러 처리 강화
- 네트워크 끊김 처리
- 음성 인식 실패 시 재시도
- 타임아웃 설정

---

## 📝 라이선스 & 크레딧

### 사용 기술
- **Whisper** (OpenAI) - STT
- **Edge TTS** (Microsoft) - TTS
- **FastAPI** - 백엔드 프레임워크
- **React** - 프론트엔드 프레임워크

---

## 🆘 지원

문제가 발생하면:
1. 콘솔 로그 확인 (브라우저 & 서버)
2. API 엔드포인트 직접 테스트
3. 각 서버가 정상 실행 중인지 확인

**Happy Running! 🏃‍♂️🎤**
