import tensorflow as tf
import joblib
import pandas as pd
from DB import get_engine

SEQ_LEN = 10
feature_cols = ['distance_km', 'pace_km', 'avg_heart_rate', 'duration_sec']

# 모델 로딩 (서버 시작 시 1번만)
import os
import tensorflow as tf
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # LSTM.py의 절대경로
MODEL_PATH = os.path.join(BASE_DIR, "lstm_distance.keras")
SCALER_PATH = os.path.join(BASE_DIR, "lstm_scaler.pkl")

model = tf.keras.models.load_model(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)

def load_user_history(user_id: int):
    engine = get_engine()

    query = """
    SELECT
        user_id,
        start_time,
        distance_km,
        pace_km,
        TIME_TO_SEC(duration_time) AS duration_sec,
        avg_heart_rate
    FROM running_record
    WHERE user_id = %(uid)s
    ORDER BY start_time
    """
    df = pd.read_sql(query, engine, params={"uid": user_id})
    df["start_time"] = pd.to_datetime(df["start_time"])
    return df

def predict_next_distance(user_id: int):
    df = load_user_history(user_id)

    if len(df) < SEQ_LEN:
        raise Exception("기록이 충분하지 않습니다.")

    recent = df.tail(SEQ_LEN)[feature_cols].values
    X_scaled = scaler.transform(recent).reshape(1, SEQ_LEN, len(feature_cols))
    pred = model.predict(X_scaled)[0][0]

    return float(pred), df

# if __name__ == "__main__":
#     pred, df = predict_next_distance(1)
#     print("예측 거리:", pred)
