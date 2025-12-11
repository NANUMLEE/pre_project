# runner_voice_model.py
# -*- coding: utf-8 -*-

from enum import Enum
from typing import List, Dict, Optional
import io
import asyncio
import tempfile
import os

import whisper


# =========================
# 공통 타입 / 상수 정의
# =========================

class EmojiType(str, Enum):
    FIGHTING = "FIGHTING"
    HIGHFIVE = "HIGHFIVE"
    FIRE = "FIRE"


# 화면용 아이콘 (프론트에서 써도 됨)
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
# 1. Whisper STT + 명령어 분류
# =========================

# Whisper 모델 로드 (프로그램 시작 시 1번만)
stt_model = whisper.load_model("small")


def extract_emoji_type_from_text(text_no_space: str) -> Optional[str]:
    """
    STT 텍스트(공백 제거본)에서 이모티콘 타입 추출.
    - "FIGHTING" / "HIGHFIVE" / "FIRE" 또는 None
    """
    if "화이팅" in text_no_space or "파이팅" in text_no_space:
        return "FIGHTING"
    if "하이파이브" in text_no_space or "하이파입" in text_no_space:
        return "HIGHFIVE"
    if "불꽃" in text_no_space or "불꽃이모티콘" in text_no_space:
        return "FIRE"
    return None


def classify_command(text: str) -> dict:
    """
    Whisper가 인식한 텍스트를 받아서
    intent / scope / target_name / emoji_type 등을 추출.
    """
    t = text.replace(" ", "")

    result = {
        "intent": "UNKNOWN",   # ASK_NEARBY_RUNNER_WHO, ASK_NEARBY_RUNNER_COUNT, SEND_EMOJI_BROADCAST, SEND_EMOJI_DIRECT ...
        "scope": None,         # ALL / TARGET / None
        "target_name": None,   # 특정 러너 이름
        "target_id": None,     # ✨ 특정 러너 ID (fuzzy matching 결과)
        "emoji_type": None,    # "FIGHTING" / "HIGHFIVE" / "FIRE"
        "raw_text": text.strip()
    }

    # 1) 주변 러너 정보 요청 - '누가 뛰고 있어?'
    if ("주변" in t or "근처" in t or "누가" in t) and ("뛰고있" in t or "뛰고있어" in t or "뛰고" in t):
        result["intent"] = "ASK_NEARBY_RUNNER_WHO"
        return result

    # 1-1) 주변 러너 수 요청 - '몇 명 있어?'
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

            try:
                before_hante = text.split("한테")[0]
                result["target_name"] = before_hante.strip()
            except Exception:
                result["target_name"] = None

            return result

    return result


def process_audio_path(audio_path: str) -> dict:
    """
    (내부용) 오디오 파일 경로를 받아서:
    1) Whisper로 텍스트 인식
    2) 명령어 분류
    """
    w = stt_model.transcribe(audio_path, language="ko")
    text = w["text"].strip()
    command_info = classify_command(text)
    return command_info


# =========================
# 2. 비즈니스 로직 (주변 러너, 이모티콘)
# =========================

def runners_status_sentence(runners: List[Runner]) -> str:
    """
    주변 러너 상황에 대한 TTS 문장 생성.
    - 없으면: "주변에 러너가 존재하지 않습니다."
    - 있으면: "김시현, 박신혜 등 n명이 뛰고 있습니다."
    """
    count = len(runners)
    if count == 0:
        return "주변에 러너가 존재하지 않습니다."

    names = [r.get("name", "러너") for r in runners]
    shown = names[:4]

    # TTS가 읽기 쉽도록 이름에 띄어쓰기 추가 (합성어 발음 문제 해결)
    # 예: "민트러너" → "민트 러너"
    spaced_names = []
    for name in shown:
        # 2-4글자마다 띄어쓰기 추가 (자연스러운 발음을 위해)
        if len(name) > 4:
            # 긴 이름은 중간에 띄어쓰기 추가
            mid = len(name) // 2
            spaced_name = name[:mid] + " " + name[mid:]
        else:
            spaced_name = name
        spaced_names.append(spaced_name)

    names_str = ", ".join(spaced_names)

    return f"{names_str} 등 {count}명이 뛰고 있습니다."


def send_emoji_to_runners(runner_ids: List[str],
                          emoji_type: EmojiType,
                          from_user_id: Optional[str] = None) -> None:
    """
    실제 이모티콘 전송 자리.
    지금은 print만 하고, 나중에 WebSocket 브로드캐스트로 교체하면 됨.
    """
    spoken = EMOJI_SPOKEN[emoji_type]
    icon = EMOJI_ICON[emoji_type]
    print(f"[DEBUG] send_emoji_to_runners: from={from_user_id}, ids={runner_ids}, emoji={spoken} {icon}")


def map_stt_intent_to_business_intent(stt_intent: str) -> Intent:
    """
    STT 분류 intent 문자열을 비즈니스 Intent Enum으로 매핑.
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
    "FIGHTING"/"HIGHFIVE"/"FIRE" 문자열을 EmojiType Enum으로 변환.
    """
    if emoji_str == "FIGHTING":
        return EmojiType.FIGHTING
    if emoji_str == "HIGHFIVE":
        return EmojiType.HIGHFIVE
    if emoji_str == "FIRE":
        return EmojiType.FIRE
    return DEFAULT_EMOJI


def handle_command_from_stt(command_info: dict,
                            nearby_runners: List[Runner],
                            from_user_id: Optional[str] = None) -> tuple[str, Optional[str]]:
    """
    STT 분류 결과(command_info)와 주변 러너 리스트를 기반으로
    최종적으로 TTS로 읽을 문장을 생성.
    이 함수 안에서 send_emoji_to_runners를 호출해서 실제 이모티콘 전송까지 가능.

    반환:
        (tts_text, target_id): TTS 문장과 대상 러너 ID (있는 경우)
    """
    stt_intent = command_info["intent"]
    biz_intent = map_stt_intent_to_business_intent(stt_intent)

    # 1) 주변 러너 상황(누가 / 몇 명)
    if biz_intent == Intent.NEARBY_RUNNERS_STATUS:
        return runners_status_sentence(nearby_runners), None

    # 2) 전체 러너에게 이모티콘
    if biz_intent == Intent.SEND_EMOJI_ALL:
        if not nearby_runners:
            return "주변에 러너가 존재하지 않습니다.", None

        emoji_type = map_emoji_str_to_enum(command_info.get("emoji_type"))
        runner_ids = [r.get("id", "") for r in nearby_runners]
        send_emoji_to_runners(runner_ids, emoji_type, from_user_id=from_user_id)
        # 띄어쓰기 추가로 TTS 발음 개선
        return f"{len(nearby_runners)} 명에게 이모티콘을 보냈습니다.", None

    # 3) 특정 러너에게 이모티콘
    if biz_intent == Intent.SEND_EMOJI_SINGLE:
        target_name = command_info.get("target_name", "")
        emoji_type = map_emoji_str_to_enum(command_info.get("emoji_type"))

        # 이름 비교 시 띄어쓰기 무시 (STT는 "민트 러너", DB는 "민트러너")
        target_name_normalized = target_name.replace(" ", "").lower()

        # 개선된 이름 매칭 로직 (정확 일치 → 부분 일치 → 유사도 매칭 순서로 시도)
        target = None

        # 1. 정확히 일치하는 이름 찾기
        for r in nearby_runners:
            runner_name_normalized = r.get("name", "").replace(" ", "").lower()
            if runner_name_normalized == target_name_normalized:
                target = r
                print(f"[DEBUG] 정확 매칭 성공: {target_name} → {r.get('name')}")
                break

        # 2. 부분 일치 찾기 (예: "김시현" → "시현")
        if not target:
            for r in nearby_runners:
                runner_name_normalized = r.get("name", "").replace(" ", "").lower()
                # 양방향 부분 일치 체크
                if target_name_normalized in runner_name_normalized or runner_name_normalized in target_name_normalized:
                    target = r
                    print(f"[DEBUG] 부분 매칭 성공: {target_name} → {r.get('name')}")
                    break

        # 3. 유사도 매칭 (Levenshtein Distance)
        if not target:
            # Levenshtein Distance 계산 함수
            def levenshtein_distance(s1: str, s2: str) -> int:
                if len(s1) < len(s2):
                    return levenshtein_distance(s2, s1)
                if len(s2) == 0:
                    return len(s1)
                previous_row = range(len(s2) + 1)
                for i, c1 in enumerate(s1):
                    current_row = [i + 1]
                    for j, c2 in enumerate(s2):
                        insertions = previous_row[j + 1] + 1
                        deletions = current_row[j] + 1
                        substitutions = previous_row[j] + (c1 != c2)
                        current_row.append(min(insertions, deletions, substitutions))
                    previous_row = current_row
                return previous_row[-1]

            best_match = None
            best_distance = float('inf')

            for r in nearby_runners:
                runner_name_normalized = r.get("name", "").replace(" ", "").lower()
                distance = levenshtein_distance(target_name_normalized, runner_name_normalized)
                max_distance = max(2, len(runner_name_normalized) // 3)  # 길이의 1/3 또는 최소 2

                if distance <= max_distance and distance < best_distance:
                    best_match = r
                    best_distance = distance

            if best_match:
                target = best_match
                print(f"[DEBUG] 유사도 매칭 성공: {target_name} → {best_match.get('name')} (거리: {best_distance})")

        if not target:
            return "주변에 러너가 존재하지 않습니다.", None

        target_id = target.get("id", "")
        send_emoji_to_runners([target_id], emoji_type, from_user_id=from_user_id)

        # TTS 발음을 위해 이름 처리
        raw_name = target.get("name", target_name) or "해당 러너"
        # 긴 이름은 중간에 띄어쓰기 추가 (발음 개선)
        if len(raw_name) > 4:
            mid = len(raw_name) // 2
            spoken_name = raw_name[:mid] + " " + raw_name[mid:]
        else:
            spoken_name = raw_name

        # "님"과 이름 사이에 띄어쓰기 추가 (억양 개선)
        return f"{spoken_name} 님에게 이모티콘을 보냈습니다.", target_id

    # 4) 알 수 없는 명령
    return "무슨 말인지 잘 이해하지 못했어요. 다시 한 번 말씀해 주세요.", None


# =========================
# 3. 메모리 기반 전체 파이프라인
# =========================

async def run_pipeline_bytes_no_tts(audio_bytes: bytes,
                                     nearby_runners: List[Runner],
                                     from_user_id: Optional[str] = None) -> dict:
    """
    STT + Intent 분류만 수행 (TTS 생성 제거)
    Web Speech API로 전환하면서 서버에서는 텍스트만 반환

    Args:
        audio_bytes: 음성 바이트
        nearby_runners: 주변 러너 목록
        from_user_id: 현재 사용자 ID

    Returns:
        {
            "command_info": {...},
            "tts_text": "응답 텍스트"
        }
    """
    # Whisper가 파일 경로를 받는 구조라 임시 파일로 한 번 저장
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(audio_bytes)
            tmp.flush()
            tmp_path = tmp.name

        # 1) STT + 명령어 분류
        command_info = process_audio_path(tmp_path)
        print("🎧 STT 원본 텍스트:", command_info["raw_text"])
        print("🧠 STT intent:", command_info["intent"],
              "/ emoji:", command_info["emoji_type"],
              "/ target:", command_info["target_name"])

        # 2) 비즈니스 로직으로 TTS 문장 생성 (파일은 만들지 않음)
        tts_text, target_id = handle_command_from_stt(command_info, nearby_runners, from_user_id=from_user_id)
        print("🗣 TTS 문장:", tts_text)

        # target_id가 있으면 command_info에 추가
        if target_id:
            command_info["target_id"] = target_id
            print("🎯 Target ID:", target_id)

        return {
            "command_info": command_info,
            "tts_text": tts_text,
        }

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as e:
                print("[DEBUG] 임시 파일 삭제 실패:", e)


# =========================
# 4. 로컬 테스트용 main (선택)
#    - 파일을 bytes로 읽어 run_pipeline_bytes_no_tts 테스트
# =========================

if __name__ == "__main__":
    # 1) 테스트용 음성 파일 (녹음해둔 m4a/webm 등)
    test_audio_path = r"C:\Users\sinhy\OneDrive\바탕 화면\project\whisper_project\voice\녹음(2).m4a"

    with open(test_audio_path, "rb") as f:
        audio_bytes = f.read()

    # 2) 테스트용 주변 러너
    nearby_runners = [
        {"id": "1", "name": "김시현"},
        {"id": "2", "name": "박신혜"},
        {"id": "3", "name": "윤서진"},
        {"id": "4", "name": "이나눔"},
    ]

    result = asyncio.run(
        run_pipeline_bytes_no_tts(audio_bytes, nearby_runners, from_user_id="me")
    )

    print("\n✅ 파이프라인 완료!")
    print("   - intent:", result["command_info"]["intent"])
    print("   - TTS 문장:", result["tts_text"])

