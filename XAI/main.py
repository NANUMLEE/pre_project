from fastapi import FastAPI
from LSTM import predict_next_distance
from XAI import explain_running_pattern_for_user

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Runnerism AI API Server is running"}

@app.get("/predict/{user_id}")
def predict(user_id: int):
    try:
        pred, _ = predict_next_distance(user_id)
        return {"user_id": user_id, "next_distance_km": pred}
    except Exception as e:
        return {"error": str(e)}

@app.get("/explain/{user_id}")
def explain(user_id: int):
    result = explain_running_pattern_for_user(user_id)
    return result