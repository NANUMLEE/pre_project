# TTS.py
# -*- coding: utf-8 -*-

from enum import Enum
from typing import List, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import io
import edge_tts


# =========================
# 기본 타입 / 상수 정의
# =========================

class EmojiType(str, Enum):
    FIGHTING = "FIGHTING"
    HIGHFIVE = "HIGHFIVE"
    FIRE = "FIRE"


DEFAULT_EMOJI = EmojiType.FIGHTING

# 화면용 아이콘 (필요하면 프론트/다른 서버에서 사용)
EMOJI_ICON = {
    EmojiType.FIGHTING: "💪",
    EmojiType.HIGHFIVE: "🙌",
    EmojiType.FIRE: "🔥",
}

# TTS가 실제로 말할 텍스트
EMOJI_SPOKEN = {
    EmojiType.FIGHTING: "화이팅",
    EmojiType.HIGHFIVE: "하이파이브",
    EmojiType.FIRE: "불꽃",
}


class Intent(str, Enum):
    NEARBY_RUNNERS_STATUS = "NEARBY_RUNNERS_STATUS"
    SEND_EMOJI_ALL = "SEND_EMOJI_ALL"
    SEND_EMOJI_SINGLE = "SEND_EMOJI_SINGLE"
    UNKNOWN = "UNKNOWN"


# 러너 타입: {"id": "1", "name": "김시현"}
Runner = Dict[str, str]


# =========================
# 요청 바디 스키마 (FastAPI)
# =========================

class VoiceCommandRequest(BaseModel):
    text: str
    # 예: [{"id": "1", "name": "김시현"}, {"id": "2", "name": "박신혜"}]
    nearby_runners: List[Dict[str, str]] = []


class EmojiNotifyRequest(BaseModel):
    # 이모티콘을 보낸 사람 (러너 이름)
    sender_name: str
    # 어떤 이모티콘인지 (텍스트나 이모지: "화이팅", "🔥" 등)
    emoji_text: str


# =========================
# 명령/이모티콘 파싱 유틸
# =========================

def extract_emoji_type(raw_text: str) -> EmojiType:
    """
    텍스트 안에서 이모티콘 타입(화이팅/하이파이브/불꽃)을 추출.
    - "화이팅", "하이파이브", "불꽃"
    - "💪", "🙌", "🔥"
    둘 다 인식 가능.
    못 찾으면 DEFAULT_EMOJI 리턴.
    """
    t = raw_text.replace(" ", "").lower()

    # 한글 키워드 기준
    if "화이팅" in t:
        return EmojiType.FIGHTING
    if "하이파이브" in t:
        return EmojiType.HIGHFIVE
    if "불꽃" in t:
        return EmojiType.FIRE

    # 실제 이모지 들어왔을 경우
    if "💪" in raw_text:
        return EmojiType.FIGHTING
    if "🙌" in raw_text:
        return EmojiType.HIGHFIVE
    if "🔥" in raw_text:
        return EmojiType.FIRE

    # 아무것도 없으면 기본값
    return DEFAULT_EMOJI


def parse_command(text: str) -> Dict:
    """
    STT에서 받은 자연어 문장을 Intent + 파라미터로 변환.
    서비스에서 들어오는 실제 한국어 문장을 기준으로 최소 패턴만 처리.
    """
    t = text.replace(" ", "")

    # 1) 전체 러너에게 이모티콘
    # 예: "전체 러너한테 화이팅 이모티콘 보내줘"
    if "전체러너한테" in t and "이모티콘보내줘" in t:
        emoji_type = extract_emoji_type(text)
        return {
            "intent": Intent.SEND_EMOJI_ALL,
            "emoji_type": emoji_type,
        }

    # 2) 특정 러너에게 이모티콘
    # 예: "김시현한테 화이팅 이모티콘 보내줘"
    if "한테" in t and "이모티콘보내줘" in t:
        try:
            # "김시현한테화이팅이모티콘보내줘" → "김시현"
            name_part = t.split("한테")[0]
            emoji_type = extract_emoji_type(text)
            return {
                "intent": Intent.SEND_EMOJI_SINGLE,
                "target_name": name_part,
                "emoji_type": emoji_type,
            }
        except Exception:
            pass

    # 3) 주변 러너 상황 묻는 경우 (두 문장 모두 같은 응답 사용)
    # - "주변 누가 뛰고 있어"
    # - "주변 러너 몇 명 있어"
    if "주변누가뛰고있어" in t or "주변러너몇명있어" in t:
        return {"intent": Intent.NEARBY_RUNNERS_STATUS}

    # 4) 그 외
    return {"intent": Intent.UNKNOWN}


# =========================
# 비즈니스 로직
# =========================

def runners_status_sentence(runners: List[Runner]) -> str:
    """
    주변 러너 상황에 대한 TTS 문장 생성.
    - 러너가 없으면:
        "주변에 러너가 존재하지 않습니다."
    - 있으면:
        "김시현, 박신혜, 윤서진, 이나눔 등 n명이 뛰고 있습니다."
    """
    count = len(runners)
    if count == 0:
        return "주변에 러너가 존재하지 않습니다."

    names = [r.get("name", "러너") for r in runners]
    shown = names[:4]
    names_str = ", ".join(shown)

    return f"{names_str} 등 {count}명이 뛰고 있습니다."


def send_emoji_to_runners(runner_ids: List[str], emoji_type: EmojiType) -> None:
    """
    실제 이모티콘 발송 자리.
    지금은 데모라서 print만 하고,
    나중에 FCM, WebSocket, 사내 메시징 로직을 여기서 호출하면 됨.
    """
    spoken = EMOJI_SPOKEN[emoji_type]
    icon = EMOJI_ICON[emoji_type]
    print(f"[DEBUG] send_emoji_to_runners: ids={runner_ids}, emoji={spoken} {icon}")


def handle_command_with_runners(text: str,
                                nearby_runners: List[Runner]) -> str:
    """
    전체 음성 명령 처리:
    - text: STT에서 인식한 문자열
    - nearby_runners: 현재 GPS 10km 이내에 있는 러너 리스트
    최종적으로 TTS로 읽을 한국어 문장을 리턴.

    TTS 문장 패턴:
    - 김시현, 박신혜, 윤서진, 이나눔 등 n명이 뛰고 있습니다.
    - n명에 이모티콘을 보냈습니다.
    - 주변에 러너가 존재하지 않습니다.
    """
    parsed = parse_command(text)
    intent: Intent = parsed["intent"]

    # 1) 주변 러너 상황
    if intent == Intent.NEARBY_RUNNERS_STATUS:
        return runners_status_sentence(nearby_runners)

    # 2) 전체 러너에게 이모티콘
    if intent == Intent.SEND_EMOJI_ALL:
        if not nearby_runners:
            return "주변에 러너가 존재하지 않습니다."

        emoji_type: EmojiType = parsed["emoji_type"]
        runner_ids = [r.get("id", "") for r in nearby_runners]
        send_emoji_to_runners(runner_ids, emoji_type)
        return f"{len(nearby_runners)}명에 이모티콘을 보냈습니다."

    # 3) 특정 러너에게 이모티콘
    if intent == Intent.SEND_EMOJI_SINGLE:
        target_name = parsed.get("target_name", "")
        emoji_type: EmojiType = parsed["emoji_type"]

        # 이름으로 매칭 (실제로는 id 기반이 더 안전)
        target = next(
            (r for r in nearby_runners if r.get("name", "") == target_name),
            None
        )
        if not target:
            return "주변에 러너가 존재하지 않습니다."

        send_emoji_to_runners([target.get("id", "")], emoji_type)
        # 스펙: "n명에 이모티콘을 보냈습니다." 패턴 유지
        return "1명에 이모티콘을 보냈습니다."

    # 4) 알 수 없는 명령
    return "무슨 말인지 잘 이해하지 못했어요. 다시 한 번 말씀해 주세요."


# =========================
# TTS (edge-tts)
# =========================

async def text_to_speech(text: str) -> io.BytesIO:
    """
    입력된 한국어 문장을 edge-tts로 mp3 바이트로 변환.
    debug_tts.mp3 로도 저장해서 재생 여부 확인 가능.
    """
    communicate = edge_tts.Communicate(text, "ko-KR-SunHiNeural")
    mp3_bytes = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_bytes.write(chunk["data"])
    mp3_bytes.seek(0)

    # 🔍 디버그용 파일 저장 (현재 폴더에 debug_tts.mp3 생김)
    try:
        with open("debug_tts.mp3", "wb") as f:
            f.write(mp3_bytes.getvalue())
        print("[DEBUG] debug_tts.mp3 saved, size:", len(mp3_bytes.getvalue()), "bytes")
    except Exception as e:
        print("[DEBUG] failed to save debug_tts.mp3:", e)

    return mp3_bytes


# =========================
# FastAPI 앱 설정
# =========================

app = FastAPI(
    title="Runner TTS Service",
    description="STT 명령 → 러너 서비스 로직 → TTS 응답 서버",
    version="0.2.0",
)

# CORS (프론트/다른 서버에서 호출 가능하게)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 중에는 * 허용, 배포 시엔 도메인 제한 추천
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# 🔊 GET으로 바로 테스트할 수 있는 간단한 엔드포인트
@app.get("/test-voice")
async def test_voice():
    """
    브라우저에서 바로 GET으로 테스트:
    http://localhost:8000/test-voice

    → mp3 응답 (테스트 문장)
    """
    tts_text = "테스트 음성입니다. 러너리즘 TTS 서버가 잘 동작하고 있습니다."
    mp3_bytes = await text_to_speech(tts_text)
    return StreamingResponse(
        mp3_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": 'inline; filename="test_voice.mp3"'},
    )


@app.post("/voice-command")
async def voice_command(req: VoiceCommandRequest):
    """
    STT 서버 or 프론트에서 호출할 API.

    예시 요청:
    {
      "text": "주변 누가 뛰고 있어",
      "nearby_runners": [
        {"id": "1", "name": "김시현"},
        {"id": "2", "name": "박신혜"},
        {"id": "3", "name": "윤서진"},
        {"id": "4", "name": "이나눔"}
      ]
    }

    → TTS 문장:
      "김시현, 박신혜, 윤서진, 이나눔 등 4명이 뛰고 있습니다."
    """
    # 1) 비즈니스 로직으로 최종 TTS 문장 생성
    tts_text = handle_command_with_runners(
        text=req.text,
        nearby_runners=req.nearby_runners,
    )

    # 2) edge-tts로 음성 변환
    mp3_bytes = await text_to_speech(tts_text)

    # 3) mp3 스트리밍 응답
    return StreamingResponse(
        mp3_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": 'inline; filename="voice_command.mp3"'},
    )


@app.post("/emoji-notify")
async def emoji_notify(req: EmojiNotifyRequest):
    """
    이모티콘 WebSocket 이벤트가 발생했을 때 호출하는 TTS API.

    예시 요청:
    {
      "sender_name": "김시현",
      "emoji_text": "🔥"
    }

    → TTS 문장:
      "~가 ~이모티콘을 보냈습니다."
      예: "김시현가 불꽃 이모티콘을 보냈습니다."
    """
    # 1) 이모티콘 타입 판별 (화이팅/하이파이브/불꽃)
    emoji_type = extract_emoji_type(req.emoji_text)

    # 2) 실제로 말할 텍스트 (아이콘 X, 말만)
    spoken = EMOJI_SPOKEN[emoji_type]

    # 3) 최종 TTS 문장
    tts_text = f"{req.sender_name}님이 {spoken} 이모티콘을 보냈습니다."

    # 4) TTS 변환
    mp3_bytes = await text_to_speech(tts_text)

    # 5) mp3 스트리밍 응답
    return StreamingResponse(
        mp3_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": 'inline; filename=\"emoji_notify.mp3\"'},
    )


# 기본서버주소 http://127.0.0.1:8000, http://localhost:8000/docs
# 엔드포인트
# 헬스체크 - http://localhost:8000/health
# STT 명령 → TTS 응답 - POST http://localhost:8000/voice-command
# WebSocket 이모티콘 알림 TTS - POST http://localhost:8000/emoji-notify
# 테스트 음성 GET - http://localhost:8000/test-voice
