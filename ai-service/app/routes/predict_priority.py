from pathlib import Path
import pickle

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

BASE_DIR   = Path(__file__).resolve().parents[2]
MODEL_PATH = BASE_DIR / "saved_models" / "priority_model.pkl"

router = APIRouter()


def load_model():
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail="Priority model not found. Run: python train.py")
    with MODEL_PATH.open("rb") as f:
        return pickle.load(f)


class PriorityRequest(BaseModel):
    text: str
    category: str = "other"


@router.post("/predict-priority")
def priority_api(data: PriorityRequest):
    model = load_model()
    inp      = data.text + " " + data.category
    priority = model.predict([inp])[0]
    proba    = model.predict_proba([inp])[0]
    confidence = round(float(max(proba)) * 100, 1)
    return {"priority": priority, "confidence": confidence}
