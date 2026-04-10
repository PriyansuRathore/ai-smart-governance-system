from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import predict_image, predict_priority, predict_text

app = FastAPI(title="AI Governance Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_text.router)
app.include_router(predict_image.router)
app.include_router(predict_priority.router)

@app.get("/")
def home():
    return {"message": "AI Service Running"}
