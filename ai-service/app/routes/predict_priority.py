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
    location: str = ""
    population: str = "medium"  # low | medium | high | very_high


@router.post("/predict-priority")
def priority_api(data: PriorityRequest):
    model = load_model()

    # ── Step 1: ML score on text + category ──────────────
    inp      = data.text + " " + data.category
    ml_pred  = model.predict([inp])[0]
    proba    = model.predict_proba([inp])[0]
    classes  = model.classes_.tolist()
    scores   = dict(zip(classes, proba))
    ml_conf  = round(float(max(proba)) * 100, 1)

    # Convert to numeric: high=3, medium=2, low=1
    score_map = {"high": 3, "medium": 2, "low": 1}
    ml_score  = score_map.get(ml_pred, 2)

    # ── Step 2: Location risk score ───────────────────────
    HIGH_RISK_ZONES = [
        "hospital", "school", "college", "railway", "station",
        "airport", "court", "police", "fire station", "market",
        "bus stand", "highway", "flyover", "bridge", "temple",
        "mosque", "church", "playground", "park", "slum",
        "chowk", "crossing", "junction", "main road",
    ]
    MEDIUM_RISK_ZONES = [
        "colony", "nagar", "ward", "sector", "block",
        "apartment", "society", "road", "street", "lane",
    ]

    loc_lower = data.location.lower()
    if any(z in loc_lower for z in HIGH_RISK_ZONES):
        loc_score = 3   # high risk zone
    elif any(z in loc_lower for z in MEDIUM_RISK_ZONES):
        loc_score = 2
    elif loc_lower.strip():
        loc_score = 1.5  # has location but no known zone
    else:
        loc_score = 0    # no location provided

    # ── Step 3: Category base risk ────────────────────────
    CATEGORY_RISK = {
        "emergency":       3,
        "fire":            3,
        "building":        2.5,
        "water":           2,
        "electricity":     2,
        "road":            1.5,
        "pollution":       1.5,
        "animal":          1.5,
        "tree":            1.5,
        "garbage":         1,
        "public_property": 1,
        "other":           1,
    }
    cat_score = CATEGORY_RISK.get(data.category, 1.5)

    # ── Step 4: Population multiplier ────────────────────
    POP_MULTIPLIER = {"low": 0.8, "medium": 1.0, "high": 1.2, "very_high": 1.4}
    pop_mult = POP_MULTIPLIER.get(data.population, 1.0)

    # ── Step 5: Weighted final score ─────────────────────
    # Weights: ML=40%, location=35%, category=25%
    final_score = (ml_score * 0.40 + loc_score * 0.35 + cat_score * 0.25) * pop_mult

    if final_score >= 2.5:
        priority = "high"
    elif final_score >= 1.6:
        priority = "medium"
    else:
        priority = "low"

    # Build reasoning
    reasons = []
    if ml_pred == "high" or scores.get("high", 0) > 0.4:
        reasons.append("complaint text indicates urgency")
    if loc_score == 3:
        reasons.append("high-risk location (hospital/school/highway)")
    elif loc_score == 2:
        reasons.append("residential/commercial area")
    if cat_score >= 2.5:
        reasons.append(f"{data.category} is a critical category")
    if pop_mult > 1.0:
        reasons.append(f"high population density area")

    return {
        "priority":   priority,
        "confidence": ml_conf,
        "score":      round(final_score, 2),
        "reasoning":  reasons,
        "signals": {
            "ml":         ml_pred,
            "location":   "high" if loc_score == 3 else "medium" if loc_score >= 1.5 else "low",
            "category":   data.category,
            "population": data.population,
        }
    }
