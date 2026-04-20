# server.py
from fastapi import FastAPI, UploadFile, File
from auth.routes import router as user_router
from core.routes import router as core_router
from fastapi.middleware.cors import CORSMiddleware
from inference import predict_image
from analysis.routes import router as analysis_router

from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ✅ Single allow_origins — wildcard covers everything
    allow_credentials=False,  # ⚠️ Must be False when using wildcard "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(core_router)
app.include_router(analysis_router)

@app.post("/predict-mood")
async def predict_mood(image: UploadFile = File(...)):
    image_bytes = await image.read()
    return predict_image(image_bytes)