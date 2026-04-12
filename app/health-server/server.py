# server.py
from fastapi import FastAPI, UploadFile, File
from auth.routes import router as user_router
from core.routes import router as core_router
from fastapi.middleware.cors import CORSMiddleware
from inference import predict_image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", 
                   "http://127.0.0.1:8081",
                   "http://localhost:1900"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(core_router)  # handles /activity, /wellness, /risk, /predict-food, /streak

@app.post("/predict-mood")
async def predict_mood(image: UploadFile = File(...)):
    image_bytes = await image.read()
    return predict_image(image_bytes)