import os
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import init_db
from backend.routes import router, seed_default_farms

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_default_farms()
    yield

app = FastAPI(title="AgroShield AI", version="1.0.0",
              description="AI-powered agricultural assistant API",
              lifespan=lifespan)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {"name": "AgroShield AI", "version": "1.0.0", "status": "operational"}

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
