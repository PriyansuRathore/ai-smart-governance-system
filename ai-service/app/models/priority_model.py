from pathlib import Path
import pickle

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

BASE_DIR   = Path(__file__).resolve().parents[2]
DATA_PATH  = BASE_DIR / "data" / "complaints_priority.csv"
MODEL_DIR  = BASE_DIR / "saved_models"
MODEL_PATH = MODEL_DIR / "priority_model.pkl"


def train_priority_classifier() -> None:
    data = pd.read_csv(DATA_PATH)

    # Use both text and category as features
    data["input"] = data["text"] + " " + data["category"]

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
        ("clf",   LogisticRegression(max_iter=1000, class_weight="balanced")),
    ])

    pipeline.fit(data["input"], data["priority"])

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with MODEL_PATH.open("wb") as f:
        pickle.dump(pipeline, f)

    print("Priority model trained")
    print("Classes:", pipeline.classes_.tolist())

    # Quick self-test
    tests = [
        ("accident due to high speed on road", "road"),
        ("pothole on main street", "road"),
        ("road marking faded", "road"),
        ("sewage overflow entering homes", "water"),
        ("tap water delayed by one hour", "water"),
        ("live wire sparking near children", "electricity"),
        ("streetlight flickering", "electricity"),
        ("toxic waste near water source", "garbage"),
        ("dustbin not emptied today", "garbage"),
    ]
    print("\nSelf-test:")
    for text, cat in tests:
        pred = pipeline.predict([text + " " + cat])[0]
        proba = pipeline.predict_proba([text + " " + cat])[0]
        conf = round(max(proba) * 100, 1)
        print(f"  {text[:45]:45} -> {pred:6} ({conf}%)")


if __name__ == "__main__":
    train_priority_classifier()
