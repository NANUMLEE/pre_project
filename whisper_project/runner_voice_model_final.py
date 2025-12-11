# runner_voice_model.py
# -*- coding: utf-8 -*-

from enum import Enum
from typing import List, Dict, Optional
import io
import asyncio

import whisper
import edge_tts


# =========================
# 공통 타입 / 상수 정의
# =========================

class EmojiType(str, Enum):
    FIGHTING = "FIGHTING"
    HIGHFIVE = "HIGHFIVE"
    FIRE = "FIRE"


# 화면용 아이콘 (필요하면 프론트에서 사용)
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

DEFAULT_EMOJI = EmojiType.FIGHTING


class Intent(str, Enum):
    NEARBY_RUNNERS_STATUS = "NEARBY_RUNNERS_STATUS"   # 주변 누가/몇 명 뛰고 있어?
    SEND_EMOJI_ALL = "SEND_EMOJI_ALL"                 # 전체 러너에게 이모티콘
    SEND_EMOJI_SINGLE = "SEND_EMOJI_SINGLE"           # 특정 러너에게 이모티콘
    UNKNOWN = "UNKNOWN"


# 러너 타입: {"id": "1", "name": "김시현"}
Runner = Dict[str, str]


# =========================
# 1. Whisper STT + 명령어 분류 (네 STT 코드 기반)
# =========================

# Whisper 모델 로드 (프로그램 시작 시 1번만)
stt_model = whisper.load_model("small")


def extract_emoji_type_from_text(text_no_space: str) -> Optional[str]:
    """
    STT에서 나온 텍스트 기준 이모티콘 타입 추출 (문자열 버전).
    - "FIGHTING" / "HIGHFIVE" / "FIRE" 또는 None
    """
    if "화이팅" in text_no_space or "파이팅" in text_no_space:
        return "FIGHTING"
    if "하이파이브" in text_no_space or "하이파입" in text_no_space:  # 오인식 대비
        return "HIGHFIVE"
    if "불꽃" in text_no_space or "불꽃이모티콘" in text_no_space:
        return "FIRE"
    return None


def classify_command(text: str) -> dict:
    """
    Whisper가 인식한 text를 받아서
    intent / scope / target_name / emoji_type 을 추출해서 dict로 반환.
    (네가 만든 STT 분류 로직 기반)
    """
    t = text.replace(" ", "")

    result = {
        "intent": "UNKNOWN",
        "scope": None,        # ALL / TARGET / None
        "target_name": None,  # 특정 러너 이름/표현
        "emoji_type": None,   # "FIGHTING" / "HIGHFIVE" / "FIRE"
        "raw_text": text.strip()
    }

    # 1) 주변 러너 정보 요청 - 누가?
    if ("주변" in t or "근처" in t or "누가" in t) and ("뛰고있" in t or "뛰고있어" in t or "뛰고" in t):
        result["intent"] = "ASK_NEARBY_RUNNER_WHO"
        return result

    # 1-1) 주변 러너 수 요청
    if ("주변" in t or "근처" in t) and ("몇명" in t or "몇분" in t):
        result["intent"] = "ASK_NEARBY_RUNNER_COUNT"
        return result

    # 2) 이모티콘 보내기
    if "이모티콘" in t and ("보내" in t or "보네" in t or "보니" in t or "전송" in t):

        emoji = extract_emoji_type_from_text(t)
        result["emoji_type"] = emoji

        # 전체 러너에게
        if "전체러너" in t or ("전체" in t and "러너" in t):
            result["intent"] = "SEND_EMOJI_BROADCAST"
            result["scope"] = "ALL"
            return result

        # ~한테 ~이모티콘 보내줘 (특정 대상)
        if "한테" in t:
            result["intent"] = "SEND_EMOJI_DIRECT"
            result["scope"] = "TARGET"

            # "XXX한테 ..." 의 XXX 부분을 target_name 으로 사용
            try:
                before_hante = text.split("한테")[0]
                result["target_name"] = before_hante.strip()
            except Exception:
                result["target_name"] = None

            return result

    return result


def process_audio(audio_path: str) -> dict:
    """
    오디오 경로를 받아서:
    1) Whisper로 텍스트 인식
    2) 명령어 분류
    를 한 번에 수행하고 결과 dict 반환.
    """
    w = stt_model.transcribe(audio_path, language="ko")
    text = w["text"].strip()
    command_info = classify_command(text)
    return command_info


# =========================
# 2. 명령어 기반 비즈니스 로직 (TTS 쪽 로직에서 가져옴)
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
    지금은 데모라서 print만,
    나중에 FCM, WebSocket, 서버 연동을 여기서 하면 됨.
    """
    spoken = EMOJI_SPOKEN[emoji_type]
    icon = EMOJI_ICON[emoji_type]
    print(f"[DEBUG] send_emoji_to_runners: ids={runner_ids}, emoji={spoken} {icon}")


def map_stt_intent_to_business_intent(stt_intent: str) -> Intent:
    """
    STT 분류 결과의 intent 문자열을 비즈니스 Intent Enum으로 매핑.
    """
    if stt_intent in ("ASK_NEARBY_RUNNER_WHO", "ASK_NEARBY_RUNNER_COUNT"):
        return Intent.NEARBY_RUNNERS_STATUS
    if stt_intent == "SEND_EMOJI_BROADCAST":
        return Intent.SEND_EMOJI_ALL
    if stt_intent == "SEND_EMOJI_DIRECT":
        return Intent.SEND_EMOJI_SINGLE
    return Intent.UNKNOWN


def map_emoji_str_to_enum(emoji_str: Optional[str]) -> EmojiType:
    """
    STT 분류 결과의 "FIGHTING"/"HIGHFIVE"/"FIRE" 문자열을 EmojiType Enum으로 변환.
    """
    if emoji_str == "FIGHTING":
        return EmojiType.FIGHTING
    if emoji_str == "HIGHFIVE":
        return EmojiType.HIGHFIVE
    if emoji_str == "FIRE":
        return EmojiType.FIRE
    return DEFAULT_EMOJI


def handle_command_from_stt(command_info: dict,
                            nearby_runners: List[Runner]) -> str:
    """
    STT 분류 결과(command_info)와 주변 러너 리스트를 기반으로
    최종적으로 TTS로 읽을 문장을 생성.
    """
    stt_intent = command_info["intent"]
    biz_intent = map_stt_intent_to_business_intent(stt_intent)

    # 1) 주변 러너 상황
    if biz_intent == Intent.NEARBY_RUNNERS_STATUS:
        return runners_status_sentence(nearby_runners)

    # 2) 전체 러너에게 이모티콘
    if biz_intent == Intent.SEND_EMOJI_ALL:
        if not nearby_runners:
            return "주변에 러너가 존재하지 않습니다."

        emoji_type = map_emoji_str_to_enum(command_info.get("emoji_type"))
        runner_ids = [r.get("id", "") for r in nearby_runners]
        send_emoji_to_runners(runner_ids, emoji_type)
        return f"{len(nearby_runners)}명에게 이모티콘을 보냈습니다."

    # 3) 특정 러너에게 이모티콘
    if biz_intent == Intent.SEND_EMOJI_SINGLE:
        target_name = command_info.get("target_name", "")
        emoji_type = map_emoji_str_to_enum(command_info.get("emoji_type"))

        target = next(
            (r for r in nearby_runners if r.get("name", "") == target_name),
            None
        )
        if not target:
            return "주변에 러너가 존재하지 않습니다."

        send_emoji_to_runners([target.get("id", "")], emoji_type)
        spoken_name = target.get("name", target_name) or "해당 러너"
        return f"{spoken_name}에게 이모티콘을 보냈습니다."

    # 4) 알 수 없는 명령
    return "무슨 말인지 잘 이해하지 못했어요. 다시 한 번 말씀해 주세요."


# =========================
# 3. Edge TTS로 텍스트 → 음성(mp3)
# =========================

async def text_to_speech(text: str, out_path: str = "response.mp3") -> io.BytesIO:
    """
    입력된 한국어 문장을 edge-tts로 mp3 바이트로 변환.
    디버그용으로 파일도 저장.
    """
    communicate = edge_tts.Communicate(text, "ko-KR-SunHiNeural")
    mp3_bytes = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_bytes.write(chunk["data"])
    mp3_bytes.seek(0)

    # 디버그용 파일 저장
    try:
        with open(out_path, "wb") as f:
            f.write(mp3_bytes.getvalue())
        print(f"[DEBUG] {out_path} saved, size:", len(mp3_bytes.getvalue()), "bytes")
    except Exception as e:
        print("[DEBUG] failed to save mp3 file:", e)

    return mp3_bytes


# =========================
# 4. 전체 파이프라인 실행 함수
# =========================

async def run_pipeline(audio_path: str,
                       nearby_runners: List[Runner],
                       out_path: str = "response.mp3") -> dict:
    """
    1) Whisper STT로 음성 → 텍스트 + 명령어 분류
    2) 명령어 & 주변 러너 기반 응답 문장 생성
    3) Edge TTS로 음성(mp3) 생성

    반환: {
      "command_info": ...,
      "tts_text": ...,
      "mp3_path": out_path
    }
    """
    # 1) STT + 명령어 분류
    command_info = process_audio(audio_path)
    print("🎧 STT 원본 텍스트:", command_info["raw_text"])
    print("🧠 STT intent:", command_info["intent"],
          "/ emoji:", command_info["emoji_type"],
          "/ target:", command_info["target_name"])

    # 2) 비즈니스 로직으로 최종 TTS 문장 생성
    tts_text = handle_command_from_stt(command_info, nearby_runners)
    print("🗣 TTS 문장:", tts_text)

    # 3) TTS 음성 생성 (mp3 파일 저장)
    await text_to_speech(tts_text, out_path=out_path)

    return {
        "command_info": command_info,
        "tts_text": tts_text,
        "mp3_path": out_path,
    }


# =========================
# 5. 간단 테스트용 main
# =========================

if __name__ == "__main__":
    # 1) 테스트용 음성 파일 경로 (네 녹음 파일로 바꿔서 사용)
    audio_path = r"C:\Users\sinhy\OneDrive\바탕 화면\project\whisper_project\voice\녹음(2).m4a"

    # 2) 테스트용 주변 러너 리스트 (실제로는 서버/DB에서 가져오게 됨)
    nearby_runners = [
        {"id": "1", "name": "김시현"},
        {"id": "2", "name": "박신혜"},
        {"id": "3", "name": "윤서진"},
        {"id": "4", "name": "이나눔"},
    ]

    # 3) 파이프라인 실행
    result = asyncio.run(
        run_pipeline(audio_path, nearby_runners, out_path="response.mp3")
    )

    print("\n✅ 파이프라인 완료!")
    print("   - 생성된 mp3 파일:", result["mp3_path"])
