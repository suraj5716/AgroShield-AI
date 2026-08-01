import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.database import init_db, Farm, SessionLocal
from main import app

client = TestClient(app)

DEFAULT_CROPS = [
    {"name": "Main Tomato Field", "crop_type": "tomato", "latitude": 28.6139, "longitude": 77.2090, "area_hectares": 2.5},
    {"name": "Wheat Plot A", "crop_type": "wheat", "latitude": 28.7041, "longitude": 77.1025, "area_hectares": 5.0},
    {"name": "Potato Block", "crop_type": "potato", "latitude": 28.5500, "longitude": 77.2800, "area_hectares": 3.0},
    {"name": "Grape Vineyard", "crop_type": "grapes", "latitude": 28.6100, "longitude": 77.2300, "area_hectares": 1.5},
]

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    db = SessionLocal()
    try:
        if db.query(Farm).count() == 0:
            for farm_data in DEFAULT_CROPS:
                db.add(Farm(**farm_data))
            db.commit()
    finally:
        db.close()
    yield

def test_root_endpoint():
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "AgroShield AI"
    assert data["status"] == "operational"

def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"

def test_list_farms():
    resp = client.get("/api/farms")
    assert resp.status_code == 200
    farms = resp.json()
    assert isinstance(farms, list)
    assert len(farms) > 0
    assert "name" in farms[0]
    assert "crop_type" in farms[0]

def test_get_weather():
    resp = client.get("/api/weather?farm_id=1")
    assert resp.status_code == 200
    data = resp.json()
    assert "forecast" in data
    assert "stress_analysis" in data
    assert len(data["forecast"]) > 0

def test_disease_risk():
    resp = client.get("/api/disease-risk?farm_id=1")
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_risk_score" in data
    assert "current_risk" in data
    assert "daily_risks" in data

def test_spray_window():
    resp = client.get("/api/spray-window?farm_id=1")
    assert resp.status_code == 200
    data = resp.json()
    assert "hourly_windows" in data
    assert "best_window" in data

def test_chat():
    resp = client.post("/api/chat", data={"message": "Hello", "session_id": "test_session"})
    assert resp.status_code == 200
    data = resp.json()
    assert "response" in data
    assert data["session_id"] == "test_session"

def test_chat_history():
    resp = client.get("/api/chat-history?session_id=test_session")
    assert resp.status_code == 200
    messages = resp.json()
    assert isinstance(messages, list)

def test_ndvi():
    resp = client.get("/api/ndvi?farm_id=1")
    assert resp.status_code == 200
    data = resp.json()
    assert "ndvi_grid" in data
    assert "avg_ndvi" in data

def test_create_farm():
    resp = client.post("/api/farms", data={
        "name": "Test Field", "crop_type": "rice",
        "latitude": 20.0, "longitude": 78.0, "area_hectares": 2.0
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Field"
    assert data["crop_type"] == "rice"
