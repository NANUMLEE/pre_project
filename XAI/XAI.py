# !pip install pymysql sqlalchemy pandas numpy scikit-learn tensorflow

# xai_explain.py

import pandas as pd
import numpy as np
from sqlalchemy import create_engine
import tensorflow as tf
import joblib
from datetime import timedelta

# =========================
# 0) 공통 설정
# =========================
DB_USER = "root"
DB_PW   = "1234"
DB_HOST = "localhost"
DB_NAME = "runnerism"     # ← 실제 DB명 확인
SEQ_LEN = 10

feature_cols = ['distance_km', 'pace_km', 'avg_heart_rate', 'duration_sec']

# =========================
# 1) LSTM 아티팩트 로드
# =========================
def load_lstm_artifacts():
    model = tf.keras.models.load_model("XAI/lstm_distance.keras")
    scaler = joblib.load("XAI/lstm_scaler.pkl")
    return model, scaler

# =========================
# 2) DB에서 특정 유저 히스토리 로드
# =========================
def load_user_history_from_db(user_id: int):
    engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PW}@{DB_HOST}/{DB_NAME}")
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
    df['start_time'] = pd.to_datetime(df['start_time'])
    return df

# =========================
# 3) LSTM 예측용 함수 (XAI에서 사용)
# =========================
def predict_next_distance_for_user(user_id: int):
    # DB + 모델/스케일러 모두 여기서 로드
    history_df = load_user_history_from_db(user_id)
    model, scaler = load_lstm_artifacts()

    if len(history_df) < SEQ_LEN:
        raise ValueError(f"user {user_id} has only {len(history_df)} records (<{SEQ_LEN})")

    recent = history_df.tail(SEQ_LEN)
    X_recent = recent[feature_cols].values  # (SEQ_LEN, 4)

    X_recent_scaled = scaler.transform(X_recent)
    X_input = X_recent_scaled.reshape(1, SEQ_LEN, len(feature_cols))

    y_pred = model.predict(X_input)[0, 0]
    return float(y_pred), history_df

# =========================
# 4) XAI: 최근 vs 이전 패턴 비교
# =========================
def split_recent_past(df, recent_n: int = 5):
    df = df.sort_values("start_time")
    if len(df) <= recent_n:
        return df.copy(), pd.DataFrame(columns=df.columns)
    recent = df.tail(recent_n)
    past   = df.iloc[:-recent_n]
    return recent, past

def summarize_block(block: pd.DataFrame):
    if block.empty:
        return {
            "avg_distance": 0,
            "avg_pace": 0,
            "avg_hr": 0,
            "count": 0
        }
    return {
        "avg_distance": block["distance_km"].mean(),
        "avg_pace": block["pace_km"].mean(),
        "avg_hr": block["avg_heart_rate"].mean(),
        "count": len(block)
    }

# =========================
# 5) 설명 문장 생성 로직
# =========================
def build_explanation(past_stats, recent_stats, next_km=None):
    lines = []

    # 1) 기본 요약
    lines.append(f"최근 {recent_stats['count']}회 운동 기준으로 설명을 드릴게요.")
    lines.append(
        f"- 최근 평균 거리: {recent_stats['avg_distance']:.1f} km "
        f"(과거 평균 {past_stats['avg_distance']:.1f} km)"
    )
    lines.append(
        f"- 최근 평균 페이스: {recent_stats['avg_pace']:.1f} min/km "
        f"(과거 평균 {past_stats['avg_pace']:.1f} min/km)"
    )
    lines.append(
        f"- 최근 평균 심박수: {recent_stats['avg_hr']:.0f} bpm "
        f"(과거 평균 {past_stats['avg_hr']:.0f} bpm)"
    )

    # 2) 추세 해석
    if recent_stats['avg_distance'] > past_stats['avg_distance'] + 0.5:
        lines.append("→ 예전보다 평균 달리는 거리가 조금씩 늘어나고 있어요. 체력이 상승하는 추세입니다.")
    elif recent_stats['avg_distance'] < past_stats['avg_distance'] - 0.5:
        lines.append("→ 최근에는 예전보다 거리 자체는 다소 줄어든 편입니다. 피로도 관리나 일정 변화의 영향일 수 있어요.")
    else:
        lines.append("→ 거리 면에서는 예전과 비슷한 수준을 유지하고 있습니다.")

    if recent_stats['avg_pace'] < past_stats['avg_pace'] - 0.2:
        lines.append("→ 페이스가 유의미하게 빨라지고 있습니다. 속도가 붙고 있어요.")
    elif recent_stats['avg_pace'] > past_stats['avg_pace'] + 0.2:
        lines.append("→ 최근에는 예전보다 약간 느리게 달리고 있습니다. 대신 안정적인 호흡과 유지력이 좋아졌을 수 있어요.")
    else:
        lines.append("→ 페이스 변화는 크지 않고, 비슷한 수준을 유지하는 중입니다.")

    if recent_stats['avg_hr'] < past_stats['avg_hr'] - 3:
        lines.append("→ 같은 강도로 달려도 심박수가 예전보다 낮게 나오고 있어, 심폐 지구력이 좋아진 모습입니다.")
    elif recent_stats['avg_hr'] > past_stats['avg_hr'] + 3:
        lines.append("→ 최근 평균 심박수가 다소 높은 편입니다. 강도가 세졌거나 피로가 누적되었을 수 있어요.")
    else:
        lines.append("→ 심박수도 큰 변동 없이 비슷한 패턴을 유지하고 있습니다.")

    # 3) LSTM 예측 값이 있으면 추가 설명
    if next_km is not None:
        lines.append("")
        lines.append(f"AI(LSTM)가 예측한 다음 러닝 예상 거리는 약 {next_km:.1f} km 입니다.")
        if next_km > recent_stats['avg_distance'] + 1:
            lines.append("→ 평소보다 살짝 긴 거리를 달릴 수 있을 것으로 예상돼요. 컨디션을 봐가며 도전해보세요.")
        elif next_km < recent_stats['avg_distance'] - 1:
            lines.append("→ 다음 러닝은 평소보다 짧게 가져가는 편이 좋을 수 있습니다. 회복 위주의 러닝을 추천드려요.")
        else:
            lines.append("→ 다음 러닝도 최근 패턴과 비슷한 거리에서 진행될 가능성이 큽니다.")

    return "\n".join(lines)

# =========================
# 6) 전체 XAI 함수
# =========================
def explain_running_pattern_for_user(user_id: int, next_month_km: float | None = None):
    """
    1) DB에서 user_id의 running_record 히스토리 로드
    2) LSTM 예측(없으면 생략)
    3) 과거 vs 최근 패턴 비교
    4) 자연어 설명 리턴
    """
    # 1. 유저 히스토리 로딩
    history_df = load_user_history_from_db(user_id)
    if history_df.empty:
        return f"user {user_id}에 대한 러닝 기록이 없습니다."

    # 2. 최근/이전 나누기
    recent, past = split_recent_past(history_df, recent_n=5)
    recent_stats = summarize_block(recent)
    past_stats   = summarize_block(past if not past.empty else recent)

    # 3. next_month_km가 None이면 LSTM으로 예측
    if next_month_km is None:
        try:
            next_km, _ = predict_next_distance_for_user(user_id)
        except Exception as e:
            print(f"[경고] LSTM 예측 실패: {e}")
            next_km = None
    else:
        next_km = next_month_km

    # 4. 설명 문자열 생성
    explanation_text = build_explanation(past_stats, recent_stats, next_km)

    return {
        "user_id": user_id,
        "past_stats": past_stats,
        "recent_stats": recent_stats,
        "next_distance_pred": next_km,
        "explanation": explanation_text
    }

# =========================
# 7) 직접 테스트
# =========================
if __name__ == "__main__":
    try:
        user_id = int(input("조회할 user_id를 입력하세요: "))
    except:
        print("잘못된 입력입니다. 숫자를 입력해주세요.")
        exit()

    result = explain_running_pattern_for_user(user_id)
    print("======== XAI RESULT ========")
    print(result["explanation"])