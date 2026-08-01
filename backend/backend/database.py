import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, JSON
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///agroshield.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    crop_type = Column(String(50), nullable=False)
    area_hectares = Column(Float, default=4.5)
    village = Column(String(100), default="Surat")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    crop_stage = Column(String(50), default="Flowering")
    health_score = Column(Integer, default=90)
    last_irrigation = Column(String(50), default="Yesterday")
    weather_station = Column(String(100), default="Surat Station")
    status = Column(String(20), default="healthy")
    planting_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class WeatherCache(Base):
    __tablename__ = "weather_cache"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, nullable=False)
    forecast_data = Column(JSON, nullable=False)
    fetched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class DiseasePrediction(Base):
    __tablename__ = "disease_predictions"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, nullable=False)
    prediction_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)
    disease_name = Column(String(100), nullable=True)
    triggers = Column(JSON, nullable=True)
    recommendations = Column(Text, nullable=True)
    forecast_days = Column(JSON, nullable=True)

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, nullable=True)
    session_id = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    language = Column(String(10), default="en")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

def init_db():
    Base.metadata.create_all(bind=engine)
