from pathlib import Path
import pickle

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = BASE_DIR / "data" / "complaints.csv"
MODEL_DIR = BASE_DIR / "saved_models"
MODEL_PATH = MODEL_DIR / "text_model.pkl"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.pkl"


def train_text_classifier() -> None:
    data = pd.read_csv(DATA_PATH)

    x_train = data["text"]
    y_train = data["category"]

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=8000, sublinear_tf=True)
    x_vectorized = vectorizer.fit_transform(x_train)

    model = LogisticRegression(max_iter=1000, C=5.0, class_weight="balanced")
    model.fit(x_vectorized, y_train)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    with MODEL_PATH.open("wb") as model_file:
        pickle.dump(model, model_file)

    with VECTORIZER_PATH.open("wb") as vectorizer_file:
        pickle.dump(vectorizer, vectorizer_file)

    print("Text model trained")


if __name__ == "__main__":
    train_text_classifier()
