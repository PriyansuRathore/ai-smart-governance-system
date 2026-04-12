from pathlib import Path
import pickle

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline, FeatureUnion

from app.utils.preprocess import clean_text

BASE_DIR        = Path(__file__).resolve().parents[2]
DATA_PATH       = BASE_DIR / "data" / "complaints.csv"
MODEL_DIR       = BASE_DIR / "saved_models"
MODEL_PATH      = MODEL_DIR / "text_model.pkl"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.pkl"


def train_text_classifier() -> None:
    data = pd.read_csv(DATA_PATH)
    data["text"] = data["text"].astype(str).apply(clean_text)

    x_train = data["text"]
    y_train = data["category"]

    # Word-level TF-IDF (1-3 grams) — captures phrases like "water pipe leaking"
    word_tfidf = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 3),
        max_features=12000,
        sublinear_tf=True,
        min_df=1,
    )

    # Character-level TF-IDF (3-5 chars) — handles typos, partial words, Hindi transliteration
    char_tfidf = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        max_features=8000,
        sublinear_tf=True,
        min_df=1,
    )

    features = FeatureUnion([
        ("word", word_tfidf),
        ("char", char_tfidf),
    ])

    pipeline = Pipeline([
        ("features", features),
        ("clf", LogisticRegression(
            max_iter=2000,
            C=8.0,
            class_weight="balanced",
            solver="lbfgs",
        )),
    ])

    pipeline.fit(x_train, y_train)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    with MODEL_PATH.open("wb") as f:
        pickle.dump(pipeline, f)

    with VECTORIZER_PATH.open("wb") as f:
        pickle.dump(None, f)

    print("Text model trained on %d samples, %d categories" % (len(x_train), len(y_train.unique())))

    tests = [
        ("nali toot gayi", "water"),
        ("bijli nahi hai", "electricity"),
        ("sadak mein gaddha hai", "road"),
        ("kachra pada hai", "garbage"),
        ("there is a massive hole on the road", "road"),
        ("water pipe leaking near temple", "water"),
        ("street light not working", "electricity"),
        ("garbage not collected", "garbage"),
        ("traffic jam on main road", "road"),
        ("aag lag gayi building mein", "fire"),
        ("accident hua road pe khoon beh raha", "emergency"),
        ("ped gir gaya road pe", "tree"),
        ("awara kutte attack kar rahe", "animal"),
        ("factory se dhuaan aa raha", "pollution"),
    ]
    print("\nSelf-test (Hindi/Hinglish + English):")
    correct = 0
    for text, expected in tests:
        pred = pipeline.predict([clean_text(text)])[0]
        status = "OK  " if pred == expected else "FAIL"
        if pred == expected:
            correct += 1
        print("  [%s] '%s' -> %s (expected: %s)" % (status, text[:45], pred, expected))
    print("\nAccuracy: %d/%d = %d%%" % (correct, len(tests), round(correct / len(tests) * 100)))


if __name__ == "__main__":
    train_text_classifier()
