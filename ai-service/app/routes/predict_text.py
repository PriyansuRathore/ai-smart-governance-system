from pathlib import Path
import pickle

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.utils.preprocess import clean_text

BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH      = BASE_DIR / "saved_models" / "text_model.pkl"
VECTORIZER_PATH = BASE_DIR / "saved_models" / "vectorizer.pkl"

router = APIRouter()

DEPARTMENT_MAP = {
    "road":            "Public Works Department",
    "water":           "Water Supply Department",
    "garbage":         "Sanitation Department",
    "electricity":     "Electricity Department",
    "emergency":       "Emergency & Medical Services",
    "fire":            "Fire Department",
    "building":        "Civil Engineering Department",
    "tree":            "Parks & Horticulture Department",
    "animal":          "Animal Control Department",
    "public_property": "Municipal Corporation",
    "pollution":       "Environment Department",
    "other":           "General Administration",
}


def load_artifacts():
    if not MODEL_PATH.exists() or not VECTORIZER_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="Model not found. Run: python train.py",
        )
    with MODEL_PATH.open("rb") as f:
        model = pickle.load(f)
    with VECTORIZER_PATH.open("rb") as f:
        vectorizer = pickle.load(f)
    return model, vectorizer


class TextRequest(BaseModel):
    text: str


@router.post("/predict-text")
def predict_text(data: TextRequest):
    model, _ = load_artifacts()
    cleaned  = clean_text(data.text)
    category = model.predict([cleaned])[0]
    proba    = model.predict_proba([cleaned])[0]
    confidence = round(float(max(proba)) * 100, 1)
    return {
        "category":   category,
        "department": DEPARTMENT_MAP.get(category, DEPARTMENT_MAP["other"]),
        "confidence": confidence,
    }
