from app.models.text_classifier import train_text_classifier
from app.models.priority_model import train_priority_classifier

if __name__ == "__main__":
    print("=== Training text classifier ===")
    train_text_classifier()
    print("\n=== Training priority classifier ===")
    train_priority_classifier()
    print("\nAll models trained successfully.")
