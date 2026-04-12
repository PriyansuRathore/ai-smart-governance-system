from dotenv import load_dotenv
load_dotenv()

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import predict_image, predict_priority, predict_text

app = FastAPI(title="AI Governance Service")

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://ai-smart-governance-system.vercel.app",
]

configured_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in (
        configured_origins.split(",")
        if configured_origins.strip()
        else DEFAULT_ALLOWED_ORIGINS
    )
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_text.router)
app.include_router(predict_image.router)
app.include_router(predict_priority.router)

@app.get("/")
def home():
    return {"message": "AI Service Running"}
