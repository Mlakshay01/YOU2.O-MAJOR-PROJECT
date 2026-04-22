from fastapi import FastAPI
from auth.routes import router as user_router
from core.routes import router as core_router
from analysis.routes import router as analysis_router
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(core_router)
app.include_router(analysis_router)

@app.get("/")
def root():
    return {"status": "ok"}