# calorie_predictor.py
import numpy as np
import joblib
from catboost import CatBoostRegressor
from datetime import datetime
import os

# ====================================
# 1. 전처리 함수 (BMI 포함)
# ====================================
def preprocess_user_input(age, height, weight, start_time, end_time):

    # 타입 보정
    age = float(age)
    height = float(height)
    weight = float(weight)

    # 문자열 → datetime 변환 자동 처리
    if isinstance(start_time, str):
        start_time = datetime.fromisoformat(start_time.replace(" ", "T"))
    if isinstance(end_time, str):
        end_time = datetime.fromisoformat(end_time.replace(" ", "T"))

    # duration 계산
    duration = (end_time - start_time).total_seconds() / 60

    # BMI 계산
    bmi = weight / ((height / 100)**2)

    return [duration, weight, height, bmi, age]

# ====================================
# 2. 모델 로딩 (cbm → pkl 순서로 로딩)
# ====================================
def load_model():
    """
    저장된 CatBoost 모델을 불러오는 함수
    우선순위: .cbm → .pkl
    """
    # 현재 파일의 디렉토리 경로
    base_dir = os.path.dirname(os.path.abspath(__file__))

    model = CatBoostRegressor()

    try:
        cbm_path = os.path.join(base_dir, "catboost_calorie_model.cbm")
        model.load_model(cbm_path)
        print("✔ CatBoost .cbm 모델 로드 완료")
        return model
    except Exception:
        pass

    try:
        pkl_path = os.path.join(base_dir, "catboost_calorie_model.pkl")
        model = joblib.load(pkl_path)
        print("✔ CatBoost .pkl 모델 로드 완료")
        return model
    except Exception:
        raise FileNotFoundError(
            "❌ catboost_calorie_model.cbm 또는 .pkl 파일을 찾을 수 없습니다."
        )

# 모델 1회 로딩 (FastAPI에서도 효율적)
model = load_model()

# ====================================
# 3. 예측 함수
# ====================================
def predict_calorie(age, height, weight, start_time, end_time):
    """
    입력값을 받아 칼로리를 예측하는 함수
    """
    X = np.array([
        preprocess_user_input(age, height, weight, start_time, end_time)
    ])

    pred = model.predict(X)

    return float(pred[0])

#catboost_calorie_model.cbm → CatBoost native 모델 (속도 빠르고 안정적)
#catboost_calorie_model.pkl → joblib 기반 모델 (범용 Python 호환)