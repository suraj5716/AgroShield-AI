import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

MODEL_PATH = os.path.join(os.path.dirname(__file__), "disease_model.pkl")
ENCODER_PATH = os.path.join(os.path.dirname(__file__), "crop_encoder.pkl")

DISEASES_BY_CROP = {
    "tomato": {
        "diseases": ["Early Blight", "Late Blight", "Septoria Leaf Spot", "Bacterial Spot"],
        "triggers": {
            "Early Blight": ["Temperature 20-30°C", "High humidity >70%", "Leaf wetness >10h"],
            "Late Blight": ["Temperature 10-20°C", "Humidity >90% for 12h+", "Rain >10mm"],
            "Septoria Leaf Spot": ["Warm humid weather", "Temperatures 20-25°C", "Rain splash spread"],
            "Bacterial Spot": ["Temperature 25-30°C", "High humidity", "Wind-driven rain"],
        },
        "recommendations": {
            "Early Blight": "Apply Mancozeb or Chlorothalonil. Remove infected leaves. Ensure proper spacing.",
            "Late Blight": "Apply copper-based fungicide immediately. Destroy infected plants. Apply Metalaxyl.",
            "Septoria Leaf Spot": "Apply Chlorothalonil or copper fungicide. Practice crop rotation.",
            "Bacterial Spot": "Apply copper-based bactericide. Use disease-free seeds. Avoid overhead irrigation.",
        },
    },
    "wheat": {
        "diseases": ["Rust", "Powdery Mildew", "Fusarium Head Blight", "Septoria Tritici"],
        "triggers": {
            "Rust": ["Temperature 15-22°C", "Humidity >60%", "Moderate rainfall"],
            "Powdery Mildew": ["Temperature 15-22°C", "High humidity >80%", "Dense canopy"],
            "Fusarium Head Blight": ["Temperature 25°C", "Humidity >90%", "Rain during flowering"],
            "Septoria Tritici": ["Temperature 15-20°C", "Prolonged leaf wetness", "Moderate rainfall"],
        },
        "recommendations": {
            "Rust": "Apply propiconazole or tebuconazole. Use resistant varieties. Early planting.",
            "Powdery Mildew": "Apply sulfur or triazole fungicides. Reduce plant density. Avoid excess N.",
            "Fusarium Head Blight": "Apply prothioconazole at flowering. Avoid planting after corn. Till residue.",
            "Septoria Tritici": "Apply strobilurin fungicide. Use resistant varieties. Foliar spray at flag leaf.",
        },
    },
    "potato": {
        "diseases": ["Late Blight", "Early Blight", "Black Scurf", "Common Scab"],
        "triggers": {
            "Late Blight": ["Temperature 10-20°C", "Humidity >90% for 12h+", "Rainfall >10mm/day"],
            "Early Blight": ["Temperature 22-30°C", "Alternating wet-dry cycles", "Poor nutrition"],
            "Black Scurf": ["Cool soil temperature", "High soil moisture", "Infected seed tubers"],
            "Common Scab": ["Dry soil at tuber initiation", "Soil pH >5.5", "High organic matter"],
        },
        "recommendations": {
            "Late Blight": "Apply Chlorothalonil or Mancozeb weekly. Use resistant varieties. Hill soil well.",
            "Early Blight": "Apply Azoxystrobin or Boscalid. Maintain good nutrition. Irrigate consistently.",
            "Black Scurf": "Use certified disease-free seed. Treat seed with fludioxonil. Avoid cold, wet soils.",
            "Common Scab": "Maintain consistent soil moisture. Lower soil pH to 5.0-5.5. Use resistant varieties.",
        },
    },
    "grapes": {
        "diseases": ["Powdery Mildew", "Downy Mildew", "Botrytis Bunch Rot", "Black Rot"],
        "triggers": {
            "Powdery Mildew": ["Temperature 20-30°C", "Humidity 40-70%", "Shaded canopy"],
            "Downy Mildew": ["Temperature 18-25°C", "Rain >10mm", "Humidity >90% for 8h+"],
            "Botrytis Bunch Rot": ["Cool wet weather at flowering", "Humidity >80%", "Dense clusters"],
            "Black Rot": ["Temperature 20-30°C", "Prolonged wetness >12h", "Rain >5mm"],
        },
        "recommendations": {
            "Powdery Mildew": "Apply sulfur or myclobutanil. Ensure canopy ventilation. Use resistant varieties.",
            "Downy Mildew": "Apply copper or mancozeb before rain. Apply metalaxyl post-infection. Good trellising.",
            "Botrytis Bunch Rot": "Apply fenhexamid or boscalid at bloom. Thin clusters. Improve air circulation.",
            "Black Rot": "Apply myclobutanil or mancozeb from shoot growth. Remove mummified berries. Prune properly.",
        },
    },
}

def generate_synthetic_data(n_samples=5000):
    np.random.seed(42)
    data = []
    crops = list(DISEASES_BY_CROP.keys())

    for _ in range(n_samples):
        crop = np.random.choice(crops)
        diseases_info = DISEASES_BY_CROP[crop]
        disease = np.random.choice(diseases_info["diseases"])

        temp_min = np.random.uniform(5, 30)
        temp_max = temp_min + np.random.uniform(2, 15)
        avg_humidity = np.random.uniform(30, 100)
        leaf_wetness_hours = np.random.uniform(0, 24)
        consecutive_rain_days = np.random.randint(0, 10)
        avg_wind_speed = np.random.uniform(0, 30)
        solar_radiation = np.random.uniform(100, 800)

        risk_features = {
            "temp_range": temp_max - temp_min,
            "avg_humidity": avg_humidity,
            "leaf_wetness_hours": leaf_wetness_hours,
            "consecutive_rain_days": consecutive_rain_days,
            "avg_temp": (temp_min + temp_max) / 2,
            "avg_wind_speed": avg_wind_speed,
            "solar_radiation": solar_radiation,
        }

        risk_score = 0.0
        if avg_humidity > 80:
            risk_score += 0.3
        if leaf_wetness_hours > 10:
            risk_score += 0.25
        if consecutive_rain_days > 3:
            risk_score += 0.2
        if temp_max - temp_min > 10:
            risk_score += 0.1
        if 10 < (temp_min + temp_max) / 2 < 25:
            risk_score += 0.15

        risk_score = min(risk_score + np.random.uniform(-0.1, 0.1), 1.0)
        risk_score = max(risk_score, 0.0)
        risk_label = "High" if risk_score > 0.6 else ("Medium" if risk_score > 0.3 else "Low")

        data.append({
            **risk_features,
            "crop": crop,
            "disease": disease,
            "risk_score": risk_score,
            "risk_label": risk_label,
        })

    return pd.DataFrame(data)

def train_and_save_model():
    df = generate_synthetic_data()
    features = ["temp_range", "avg_humidity", "leaf_wetness_hours",
                "consecutive_rain_days", "avg_temp", "avg_wind_speed", "solar_radiation"]

    X = df[features].values
    y = df["risk_score"].values

    crop_encoder = LabelEncoder()
    crop_encoded = crop_encoder.fit_transform(df["crop"])

    X_combined = np.column_stack([X, crop_encoded])

    X_train, X_test, y_train, y_test = train_test_split(X_combined, y, test_size=0.2, random_state=42)

    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    y_train_class = (y_train > 0.3).astype(int)
    model.fit(X_train, y_train_class)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    with open(ENCODER_PATH, "wb") as f:
        pickle.dump(crop_encoder, f)

    return model, crop_encoder

def load_or_train_model():
    if os.path.exists(MODEL_PATH) and os.path.exists(ENCODER_PATH):
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        with open(ENCODER_PATH, "rb") as f:
            crop_encoder = pickle.load(f)
        return model, crop_encoder
    return train_and_save_model()

def predict_disease_risk(crop: str, temp_min: float, temp_max: float,
                         avg_humidity: float, leaf_wetness_hours: float,
                         consecutive_rain_days: int, avg_wind_speed: float = 10.0,
                         solar_radiation: float = 400.0):
    model, crop_encoder = load_or_train_model()

    crop_lower = crop.lower()
    if crop_lower not in crop_encoder.classes_:
        return {"risk_score": 0.3, "risk_level": "Medium",
                "disease_name": "General Crop Stress",
                "triggers": ["Seasonal conditions", "Crop-specific patterns not found"],
                "recommendations": "Monitor crop regularly. Ensure good field hygiene."}

    crop_encoded = crop_encoder.transform([crop_lower])[0]
    features = np.array([[temp_max - temp_min, avg_humidity, leaf_wetness_hours,
                          consecutive_rain_days, (temp_min + temp_max) / 2,
                          avg_wind_speed, solar_radiation, crop_encoded]])

    risk_class = model.predict(features)[0]
    risk_proba = model.predict_proba(features)[0]

    risk_score = float(risk_proba[1]) if risk_class == 1 else float(risk_proba[0]) * 0.3
    risk_level = "High" if risk_score > 0.6 else ("Medium" if risk_score > 0.3 else "Low")

    diseases_info = DISEASES_BY_CROP.get(crop_lower, {})
    diseases = diseases_info.get("diseases", ["General Crop Stress"])

    if risk_level == "Low":
        disease_name = "None (Low Risk)"
        triggers = ["Conditions not favorable for disease development"]
        recommendations = "No preventative action needed. Continue regular scouting."
    else:
        disease_name = diseases[0] if diseases else "General Crop Stress"
        if risk_score > 0.6 and len(diseases) > 1:
            disease_name = diseases[1]

        triggers = diseases_info.get("triggers", {}).get(disease_name,
            ["Weather conditions favor disease development"])
        recommendations = diseases_info.get("recommendations", {}).get(disease_name,
            "Apply broad-spectrum fungicide. Monitor crop daily.")

    return {
        "risk_score": round(risk_score, 3),
        "risk_level": risk_level,
        "disease_name": disease_name,
        "triggers": triggers,
        "recommendations": recommendations,
    }
