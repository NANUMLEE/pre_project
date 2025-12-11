import whisper

# 1. 모델 불러오기
model = whisper.load_model("small")  # "tiny", "base"로 바꿔봐도 됨

# 2. 음성 파일을 텍스트로 변환
result = model.transcribe("test.m4a", language="ko")

# 3. 결과 출력
print("인식 결과:", result["text"])