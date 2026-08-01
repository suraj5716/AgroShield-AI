import io
import json
import uuid
import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.database import get_db, Farm, WeatherCache, DiseasePrediction, ChatHistory
from backend.services.weather_service import get_forecast
from backend.services.gemini_service import get_gemini_response, diagnose_pest_image
from backend.ml.disease_model import predict_disease_risk

router = APIRouter(prefix="/api")

DEFAULT_CROPS = [
    {"name": "Main Tomato Field", "crop_type": "tomato", "latitude": 28.6139, "longitude": 77.2090, "area_hectares": 2.5},
    {"name": "Wheat Plot A", "crop_type": "wheat", "latitude": 28.7041, "longitude": 77.1025, "area_hectares": 5.0},
    {"name": "Potato Block", "crop_type": "potato", "latitude": 28.5500, "longitude": 77.2800, "area_hectares": 3.0},
    {"name": "Grape Vineyard", "crop_type": "grapes", "latitude": 28.6100, "longitude": 77.2300, "area_hectares": 1.5},
]

def seed_default_farms():
    db = next(get_db())
    try:
        existing = db.query(Farm).count()
        if existing == 0:
            for farm_data in DEFAULT_CROPS:
                farm = Farm(**farm_data)
                db.add(farm)
            db.commit()
    finally:
        db.close()

@router.get("/farms")
def list_farms(db: Session = Depends(get_db)):
    farms = db.query(Farm).all()
    return [{"id": f.id, "name": f.name, "crop_type": f.crop_type,
             "latitude": f.latitude, "longitude": f.longitude,
             "area_hectares": f.area_hectares,
             "planting_date": f.planting_date.isoformat() if f.planting_date else None}
            for f in farms]

@router.post("/farms")
def create_farm(name: str = Form(...), crop_type: str = Form(...),
                latitude: float = Form(...), longitude: float = Form(...),
                area_hectares: float = Form(1.0), db: Session = Depends(get_db)):
    farm = Farm(name=name, crop_type=crop_type, latitude=latitude,
                longitude=longitude, area_hectares=area_hectares)
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return {"id": farm.id, "name": farm.name, "crop_type": farm.crop_type,
            "latitude": farm.latitude, "longitude": farm.longitude, "area_hectares": farm.area_hectares}

@router.get("/weather")
def get_weather(farm_id: int = Query(...), days: int = Query(7, ge=1, le=30),
                db: Session = Depends(get_db)):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    cached = db.query(WeatherCache).filter(
        WeatherCache.farm_id == farm_id
    ).order_by(WeatherCache.fetched_at.desc()).first()

    if cached and (datetime.now(timezone.utc) - cached.fetched_at.replace(tzinfo=timezone.utc)).total_seconds() < 3600:
        forecast = cached.forecast_data
    else:
        forecast = get_forecast(farm.latitude, farm.longitude, days)
        if cached:
            db.delete(cached)
        new_cache = WeatherCache(farm_id=farm_id, forecast_data=forecast)
        db.add(new_cache)
        db.commit()

    stress_analysis = analyze_climate_stress(forecast, farm.crop_type)
    return {"farm_id": farm_id, "farm_name": farm.name, "crop_type": farm.crop_type,
            "forecast": forecast, "stress_analysis": stress_analysis}

def analyze_climate_stress(forecast: list, crop: str):
    stress_factors = []
    overall_stress = "Low"

    heat_stress_days = sum(1 for d in forecast if d["temp_max"] > 35)
    cold_stress_days = sum(1 for d in forecast if d["temp_min"] < 5)
    high_humidity_days = sum(1 for d in forecast if d["humidity"] > 85)
    heavy_rain_days = sum(1 for d in forecast if d["precip_mm"] > 20)
    high_wind_days = sum(1 for d in forecast if d["wind_speed"] > 25)
    drought_days = sum(1 for d in forecast if d["precip_mm"] == 0 and d["temp_max"] > 32)

    if heat_stress_days > 3:
        stress_factors.append({"type": "Heat Stress", "severity": "High" if heat_stress_days > 5 else "Medium",
                               "detail": f"{heat_stress_days} days with max temp >35°C"})
    if cold_stress_days > 2:
        stress_factors.append({"type": "Cold Stress", "severity": "High" if cold_stress_days > 4 else "Medium",
                               "detail": f"{cold_stress_days} days with min temp <5°C"})
    if high_humidity_days > 4:
        stress_factors.append({"type": "Disease Pressure", "severity": "High" if high_humidity_days > 6 else "Medium",
                               "detail": f"Humidity >85% for {high_humidity_days} days"})
    if heavy_rain_days > 2:
        stress_factors.append({"type": "Waterlogging Risk", "severity": "High",
                               "detail": f"{heavy_rain_days} days with >20mm rain"})
    if high_wind_days > 1:
        stress_factors.append({"type": "Wind Damage", "severity": "Medium",
                               "detail": f"{high_wind_days} days with winds >25 km/h"})
    if drought_days > 4:
        stress_factors.append({"type": "Drought Risk", "severity": "High" if drought_days > 7 else "Medium",
                               "detail": f"{drought_days} hot, dry days expected"})

    stress_counts = sum(1 for f in stress_factors if f["severity"] == "High")
    if stress_counts >= 2 or len(stress_factors) >= 3:
        overall_stress = "High"
    elif stress_factors:
        overall_stress = "Medium"

    return {"overall_stress": overall_stress, "factors": stress_factors, "total_risk_days": len(stress_factors)}

@router.get("/disease-risk")
def get_disease_risk(farm_id: int = Query(...), db: Session = Depends(get_db)):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    forecast = get_forecast(farm.latitude, farm.longitude, 14)
    daily_risks = []
    overall_risk_score = 0.0

    for day in forecast[:7]:
        risk = predict_disease_risk(
            crop=farm.crop_type,
            temp_min=day["temp_min"],
            temp_max=day["temp_max"],
            avg_humidity=day["humidity"],
            leaf_wetness_hours=day["leaf_wetness_hours"],
            consecutive_rain_days=sum(1 for d in forecast if d["precip_mm"] > 2),
            avg_wind_speed=day["wind_speed"],
            solar_radiation=day["solar_radiation"],
        )
        daily_risks.append({"date": day["date"], **risk})
        overall_risk_score = max(overall_risk_score, risk["risk_score"])

    latest_risk = daily_risks[0] if daily_risks else {}

    is_risk_db = DiseasePrediction(
        farm_id=farm_id,
        risk_score=latest_risk.get("risk_score", 0),
        risk_level=latest_risk.get("risk_level", "Low"),
        disease_name=latest_risk.get("disease_name", ""),
        triggers=latest_risk.get("triggers", []),
        recommendations=latest_risk.get("recommendations", ""),
        forecast_days=daily_risks,
    )
    db.add(is_risk_db)
    db.commit()

    return {
        "farm_id": farm_id,
        "farm_name": farm.name,
        "crop_type": farm.crop_type,
        "overall_risk_score": round(overall_risk_score, 3),
        "overall_risk_level": "High" if overall_risk_score > 0.6 else ("Medium" if overall_risk_score > 0.3 else "Low"),
        "current_risk": latest_risk,
        "daily_risks": daily_risks,
        "recommendations": latest_risk.get("recommendations", ""),
    }

@router.get("/spray-window")
def get_spray_window(farm_id: int = Query(...), product_type: str = Query("fungicide"),
                     db: Session = Depends(get_db)):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    forecast = get_forecast(farm.latitude, farm.longitude, 7)
    hourly_windows = []

    for day in forecast[:5]:
        for hour in range(6, 21):
            wind = day["wind_speed"] + np.random.uniform(-2, 2)
            rain_prob = day["precip_prob"]
            humidity = day["humidity"]
            temp = day["avg_temp"]
            uv = day["uv_index"]

            suitability_scores = {
                "wind": 100 if 3 <= wind <= 15 else (50 if wind < 3 else (20 if wind > 25 else 60)),
                "rain": 100 if rain_prob < 0.3 else (50 if rain_prob < 0.5 else 10),
                "humidity": 100 if 40 <= humidity <= 80 else (50 if humidity < 40 else 70),
                "temp": 100 if 15 <= temp <= 30 else (30 if temp < 10 or temp > 35 else 70),
                "uv": 100 if uv < 6 else (50 if uv < 8 else 20),
            }

            overall = sum(suitability_scores.values()) / len(suitability_scores)
            score = round(overall, 0)

            status = "optimal" if score >= 80 else ("restricted" if score < 50 else "suboptimal")

            hourly_windows.append({
                "date": day["date"],
                "hour": hour,
                "score": score,
                "status": status,
                "wind_kph": round(wind, 1),
                "rain_prob": round(rain_prob, 2),
                "humidity": round(humidity, 1),
                "temp_c": round(temp, 1),
                "uv_index": uv,
                "product_type_hint": product_type,
            })

    optimal_hours = [w for w in hourly_windows if w["status"] == "optimal"]

    return {
        "farm_id": farm_id,
        "farm_name": farm.name,
        "crop_type": farm.crop_type,
        "product_type": product_type,
        "hourly_windows": hourly_windows,
        "optimal_windows": optimal_hours[:10],
        "best_window": optimal_hours[0] if optimal_hours else hourly_windows[0],
        "summary": f"Found {len(optimal_hours)} optimal spray hours in the next 5 days"
        if optimal_hours else "No optimal windows found. Consider early morning or late evening.",
    }

@router.post("/chat")
def chat(message: str = Form(...), farm_id: Optional[int] = Form(None),
         language: str = Form("en"), session_id: str = Form("default"),
         db: Session = Depends(get_db)):
    farm = None
    context = {}
    if farm_id:
        farm = db.query(Farm).filter(Farm.id == farm_id).first()
        if farm:
            forecast = get_forecast(farm.latitude, farm.longitude, 3)
            context = {"farm": {"crop_type": farm.crop_type, "latitude": farm.latitude,
                                "longitude": farm.longitude}, "weather": forecast}

    response = get_gemini_response(message, language, context)

    chat_entry = ChatHistory(farm_id=farm_id, session_id=session_id, role="user",
                             content=message, language=language)
    db.add(chat_entry)
    chat_entry_resp = ChatHistory(farm_id=farm_id, session_id=session_id, role="assistant",
                                  content=response, language=language)
    db.add(chat_entry_resp)
    db.commit()

    return {"response": response, "session_id": session_id,
            "farm_id": farm_id, "language": language}

@router.get("/chat-history")
def get_chat_history(session_id: str = Query("default"), limit: int = Query(50),
                     db: Session = Depends(get_db)):
    messages = db.query(ChatHistory).filter(
        ChatHistory.session_id == session_id
    ).order_by(ChatHistory.timestamp).limit(limit).all()
    return [{"role": m.role, "content": m.content, "language": m.language,
             "timestamp": m.timestamp.isoformat()} for m in messages]

@router.post("/pest-detect")
async def pest_detect(file: UploadFile = File(...), farm_id: Optional[int] = Form(None),
                      language: str = Form("en"), db: Session = Depends(get_db)):
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max 10MB.")

    result = diagnose_pest_image(contents, file.filename or "image.jpg", language)

    return {"diagnosis": result, "file_name": file.filename, "farm_id": farm_id}

@router.get("/ndvi")
def get_ndvi(farm_id: int = Query(...), db: Session = Depends(get_db)):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    np.random.seed(farm_id)
    grid_size = 20
    base_ndvi = 0.5 + 0.3 * (1 - abs(farm.latitude - 28.6) / 5)

    ndvi_grid = []
    for i in range(grid_size):
        row = []
        for j in range(grid_size):
            variation = np.random.normal(0, 0.12)
            spatial_pattern = 0.1 * np.sin(i / 3) * np.cos(j / 4)
            ndvi = max(0, min(1, base_ndvi + variation + spatial_pattern))
            row.append(round(ndvi, 3))
        ndvi_grid.append(row)

    avg_ndvi = round(np.mean(ndvi_grid), 3)
    health_status = "Excellent" if avg_ndvi > 0.7 else ("Good" if avg_ndvi > 0.5 else (
        "Fair" if avg_ndvi > 0.3 else "Poor"))

    return {
        "farm_id": farm_id,
        "farm_name": farm.name,
        "crop_type": farm.crop_type,
        "ndvi_grid": ndvi_grid,
        "avg_ndvi": avg_ndvi,
        "health_status": health_status,
        "grid_size": grid_size,
        "bounds": [
            [farm.latitude - 0.01, farm.longitude - 0.01],
            [farm.latitude + 0.01, farm.longitude + 0.01],
        ],
    }
