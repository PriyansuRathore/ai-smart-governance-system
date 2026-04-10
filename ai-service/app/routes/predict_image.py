import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.image_classifier import predict_image_base64

router = APIRouter()

class ImageRequest(BaseModel):
    image: str            # base64 data URL
    filename: str = ""    # original filename for text-based hint
    description: str = "" # complaint description text — most reliable signal

@router.post("/predict-image")
def predict_image_api(data: ImageRequest):
    if not data.image and not data.filename:
        raise HTTPException(status_code=400, detail="image or filename is required")

    result = predict_image_base64(data.image, filename=data.filename, description=data.description)
    hf_configured = bool(os.environ.get("HF_API_KEY", "").strip()) and \
                    os.environ.get("HF_API_KEY") != "your_hf_api_key_here"

    return {
        "category":      result["category"],
        "label":         result["label"],
        "confidence":    result["confidence"],
        "source":        result["source"],
        "hf_configured": hf_configured,
    }
