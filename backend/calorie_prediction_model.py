# -*- coding: utf-8 -*-
"""
러닝 칼로리 예측 모델 (RandomForest)
- 저장된 pkl 파일을 로드해서 칼로리 예측
- main.py에서 직접 import해서 사용 가능
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pandas as pd
import numpy as np
import pickle
import os

# ================================================================
# 1) 모델 로드
# ================================================================
def load_calorie_model():
    """저장된 RandomForest 칼로리 예측 모델 로드"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "randomforest_calorie_model.pkl")

    try:
        if not os.path.exists(model_path):
            print(f"모델 파일을 찾을 수 없습니다: {model_path}")
            return None

        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        return model
    except Exception as e:
        print(f"모델 로드 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


# 서버 시작 시 모델 로드
calorie_model = load_calorie_model()


# ================================================================
# 2) 피처 전처리 함수
# ================================================================
def prepare_features_for_prediction(user_id, gender, age, height_cm, weight_kg, running_time_min, distance_km):
    """
    칼로리 예측을 위한 입력 피처 준비

    Parameters:
    - user_id: 사용자 ID (DB의 user_id)
    - gender: 성별 ("Male" 또는 "Female")
    - age: 나이
    - height_cm: 키 (cm)
    - weight_kg: 몸무게 (kg)
    - running_time_min: 러닝 시간 (분)
    - distance_km: 러닝 거리 (km)

    Returns:
    - 예측용 피처 DataFrame
    """
    try:
        # BMI 계산
        height_m = height_cm / 100
        bmi = weight_kg / (height_m ** 2)

        # DataFrame 생성 (모델이 학습할 때 사용한 모든 피처 포함)
        features_df = pd.DataFrame({
            'id': [int(user_id)],  # DB의 user_id 사용
            'Gender': [gender],
            'Age': [int(age)],
            'Height': [int(height_cm)],
            'Weight': [int(weight_kg)],
            'BMI': [float(bmi)],
            'Running_time': [float(running_time_min)],
            'Distance': [float(distance_km)]
        })

        # Gender 원-핫 인코딩 (Male을 기준으로)
        features_encoded = pd.get_dummies(features_df, columns=['Gender'], drop_first=True)

        # Gender_Male 컬럼이 없으면 추가 (Female인 경우)
        if 'Gender_Male' not in features_encoded.columns:
            features_encoded['Gender_Male'] = 0

        return features_encoded
    except Exception as e:
        print(f"피처 전처리 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


# ================================================================
# 3) 칼로리 예측 함수
# ================================================================
def predict_calories(user_id, gender, age, height_cm, weight_kg, running_time_min, distance_km):
    """
    사용자 정보와 러닝 데이터로 칼로리 예측

    Parameters:
    - user_id: 사용자 ID (DB의 user_id)
    - gender: 성별 ("Male" 또는 "Female")
    - age: 나이
    - height_cm: 키 (cm)
    - weight_kg: 몸무게 (kg)
    - running_time_min: 러닝 시간 (분)
    - distance_km: 러닝 거리 (km)

    Returns:
    - 예측된 칼로리 (float)
    """
    if calorie_model is None:
        return None

    try:
        # 피처 준비
        features_df = prepare_features_for_prediction(
            user_id, gender, age, height_cm, weight_kg, running_time_min, distance_km
        )

        if features_df is None:
            return None

        # 예측
        predicted_calories = calorie_model.predict(features_df)[0]

        # 음수 방지 (예측값이 음수면 0으로 설정)
        predicted_calories = max(0, float(predicted_calories))

        return round(predicted_calories, 2)
    except Exception as e:
        print(f"칼로리 예측 실패: {str(e)}")
        return None


# ================================================================
# 4) 코스별 칼로리 예측 함수 (main.py에서 사용)
# ================================================================
def add_calories_to_courses(courses_list, user_id=None, user_gender=None, user_age=None,
                            user_height_cm=None, user_weight_kg=None):
    """
    코스 리스트에 칼로리 정보 추가

    Parameters:
    - courses_list: 코스 딕셔너리 리스트
    - user_id: 사용자 ID (DB의 user_id)
    - user_gender: 사용자 성별
    - user_age: 사용자 나이
    - user_height_cm: 사용자 키
    - user_weight_kg: 사용자 몸무게

    Returns:
    - 칼로리 정보가 추가된 코스 리스트
    """
    if not courses_list:
        return courses_list

    # 사용자 정보가 없으면 기본값 사용 (평균 값)
    if user_id is None:
        user_id = 1
    if user_gender is None:
        user_gender = "Male"
    if user_age is None:
        user_age = 35
    if user_height_cm is None:
        user_height_cm = 170
    if user_weight_kg is None:
        user_weight_kg = 70

    enhanced_courses = []

    for course in courses_list:
        try:
            # 거리 파싱
            distance_raw = course.get("거리", "5km")
            if isinstance(distance_raw, str):
                distance_km = float(distance_raw.strip().replace('km', '').replace('Km', '').strip())
            else:
                distance_km = float(distance_raw) if distance_raw else 5.0

            # 러닝 시간 추정 (평균 페이스 6분/km 기준)
            running_time_min = distance_km * 6.0

            # 칼로리 예측
            predicted_calories = predict_calories(
                user_id, user_gender, user_age, user_height_cm, user_weight_kg,
                running_time_min, distance_km
            )

            # 칼로리 정보 추가
            course_with_calories = course.copy()
            course_with_calories['예상_칼로리'] = predicted_calories if predicted_calories else 0
            enhanced_courses.append(course_with_calories)

        except Exception as e:
            print(f"코스 {course.get('러닝코스 명', 'Unknown')} 칼로리 예측 실패: {str(e)}")
            course['예상_칼로리'] = 0
            enhanced_courses.append(course)

    return enhanced_courses