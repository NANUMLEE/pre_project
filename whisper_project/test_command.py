import whisper

model = whisper.load_model("small")

# 이모티콘 타입 뽑는 함수
def extract_emoji_type(text_no_space: str) -> str | None:
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
    intent / scope / target_name / emoji_type 을 추출해서 dict로 반환
    """
    t = text.replace(" ", "")

    # 기본 구조
    result = {
        "intent": "UNKNOWN",
        "scope": None,        # ALL / TARGET / None
        "target_name": None,  # 특정 러너 이름/표현
        "emoji_type": None,   # FIGHTING / HIGHFIVE / FIRE
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

        emoji = extract_emoji_type(t)
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

            # 아주 단순하게: "XXX한테" 앞부분을 target으로 추출
            try:
                before_hante = text.split("한테")[0]
                # 예: "민수한테" → "민수"
                # 예: "앞에 있는 사람한테" → "앞에 있는 사람"
                result["target_name"] = before_hante.strip()
            except Exception:
                result["target_name"] = None

            return result

    # 여기에 다른 규칙들 추가 가능
    return result


def process_audio(audio_path: str) -> dict:
    """
    오디오 경로를 받아서:
    1) Whisper로 텍스트 인식
    2) 명령어 분류
    를 한 번에 수행하고 결과 dict 반환
    """
    w = model.transcribe(audio_path, language="ko")
    text = w["text"].strip()
    command_info = classify_command(text)
    return command_info


if __name__ == "__main__":
    audio_path = r"C:\Users\sinhy\OneDrive\바탕 화면\project\whisper_project\녹음(3).m4a"
    result = process_audio(audio_path)

    print("🎧 원본 텍스트:", result["raw_text"])
    print("🧠 인텐트(intent):", result["intent"])
    print("📍 scope:", result["scope"])
    print("👤 target_name:", result["target_name"])
    print("✨ emoji_type:", result["emoji_type"])
