import os
import math
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
WEATHER_PROVIDER = os.getenv("WEATHER_API_PROVIDER", "openweathermap")

SEASONS = {
    (1, 2): {"base_temp": 14, "humidity": 60, "precip": 25, "season": "winter"},
    (3, 5): {"base_temp": 24, "humidity": 45, "precip": 12, "season": "spring"},
    (6, 9): {"base_temp": 30, "humidity": 70, "precip": 120, "season": "summer"},
    (10, 12): {"base_temp": 20, "humidity": 55, "precip": 40, "season": "autumn"},
}

def get_season_params(month: int):
    for (start, end), params in SEASONS.items():
        if start <= month <= end:
            return params
    return SEASONS[(3, 5)]

def generate_simulated_forecast(lat: float, lng: float, days: int = 14):
    now = datetime.now(timezone.utc)
    month = now.month
    season = get_season_params(month)

    lat_factor = 1.0 - (abs(lat) - 20) / 50 if abs(lat) > 20 else 1.0
    coastal_factor = 1.0 if abs(lat) < 40 else 0.8

    base_temp = season["base_temp"] * (0.9 + 0.2 * lat_factor)
    base_humidity = season["humidity"] * coastal_factor
    base_precip_prob = min(season["precip"] / 100, 0.8)

    forecasts = []
    for i in range(days):
        date = now + timedelta(days=i)
        daily_variation = random.uniform(-3, 3)
        temp_min = round(base_temp + daily_variation - random.uniform(2, 6), 1)
        temp_max = round(base_temp + daily_variation + random.uniform(4, 10), 1)

        humidity = min(100, max(20, base_humidity + random.uniform(-15, 15)))
        precip_prob = min(1.0, base_precip_prob + random.uniform(-0.2, 0.2))

        cloud_cover = random.randint(10, 90)
        solar_radiation = max(50, min(800, 600 * (1 - cloud_cover / 100) + random.uniform(-50, 50)))

        wind_speed = round(random.uniform(2, 20) * coastal_factor, 1)

        leaf_wetness = round(humidity * random.uniform(0.3, 0.8) / 10, 1)

        precip_mm = 0.0
        if random.random() < precip_prob:
            precip_mm = round(random.uniform(0.5, 25), 1)

        forecasts.append({
            "date": date.strftime("%Y-%m-%d"),
            "temp_min": temp_min,
            "temp_max": temp_max,
            "avg_temp": round((temp_min + temp_max) / 2, 1),
            "humidity": round(humidity, 1),
            "precip_mm": precip_mm,
            "precip_prob": round(precip_prob, 2),
            "wind_speed": wind_speed,
            "wind_gust": round(wind_speed * random.uniform(1.2, 1.8), 1),
            "solar_radiation": round(solar_radiation, 1),
            "cloud_cover": cloud_cover,
            "leaf_wetness_hours": leaf_wetness,
            "uv_index": min(11, round(solar_radiation / 80, 1)),
            "condition": _get_condition(precip_mm, cloud_cover),
        })

    return forecasts

def _get_condition(precip_mm: float, cloud_cover: int):
    if precip_mm > 10:
        return "Heavy Rain"
    elif precip_mm > 2:
        return "Rain"
    elif precip_mm > 0:
        return "Light Rain"
    elif cloud_cover > 80:
        return "Overcast"
    elif cloud_cover > 50:
        return "Cloudy"
    elif cloud_cover > 20:
        return "Partly Cloudy"
    else:
        return "Sunny"

def fetch_live_forecast(lat: float, lng: float, days: int = 14):
    if not WEATHER_API_KEY:
        return generate_simulated_forecast(lat, lng, days)

    try:
        if WEATHER_PROVIDER == "openweathermap":
            url = "https://api.openweathermap.org/data/2.5/forecast"
            params = {"lat": lat, "lon": lng, "appid": WEATHER_API_KEY, "units": "metric", "cnt": min(days * 8, 40)}
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                return _parse_openweathermap(resp.json(), days)
        elif WEATHER_PROVIDER == "tomorrowio":
            url = "https://api.tomorrow.io/v4/timelines"
            params = {
                "location": f"{lat},{lng}",
                "apikey": WEATHER_API_KEY,
                "fields": ["temperature", "humidity", "precipitationIntensity", "windSpeed",
                          "solarGHI", "cloudCover", "uvIndex"],
                "units": "metric",
                "timesteps": "1d",
                "startTime": "now",
                "endTime": f"nowPlus{days}d",
            }
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                return _parse_tomorrowio(resp.json(), days)
    except Exception:
        pass

    return generate_simulated_forecast(lat, lng, days)

def _parse_openweathermap(data: dict, days: int):
    daily = {}
    for item in data.get("list", []):
        dt = datetime.fromtimestamp(item["dt"], tz=timezone.utc)
        day = dt.strftime("%Y-%m-%d")
        if day not in daily:
            daily[day] = {"temps": [], "humidity": [], "wind": [], "precip": 0, "cloud": [], "count": 0}
        daily[day]["temps"].append(item["main"]["temp"])
        daily[day]["humidity"].append(item["main"]["humidity"])
        daily[day]["wind"].append(item["wind"]["speed"])
        if "rain" in item and "3h" in item["rain"]:
            daily[day]["precip"] += item["rain"]["3h"]
        daily[day]["cloud"].append(item["clouds"]["all"])
        daily[day]["count"] += 1

    forecasts = []
    for day, vals in list(daily.items())[:days]:
        solar = max(50, min(800, 600 * (1 - sum(vals["cloud"]) / len(vals["cloud"]) / 100)))
        leaf_wetness = round(sum(vals["humidity"]) / len(vals["humidity"]) * random.uniform(0.3, 0.5) / 10, 1)
        forecasts.append({
            "date": day,
            "temp_min": round(min(vals["temps"]), 1),
            "temp_max": round(max(vals["temps"]), 1),
            "avg_temp": round(sum(vals["temps"]) / len(vals["temps"]), 1),
            "humidity": round(sum(vals["humidity"]) / len(vals["humidity"]), 1),
            "precip_mm": round(vals["precip"], 1),
            "precip_prob": round(min(1.0, vals["precip"] / 20), 2),
            "wind_speed": round(sum(vals["wind"]) / len(vals["wind"]), 1),
            "wind_gust": round(max(vals["wind"]) * 1.5, 1),
            "solar_radiation": round(solar, 1),
            "cloud_cover": round(sum(vals["cloud"]) / len(vals["cloud"])),
            "leaf_wetness_hours": leaf_wetness,
            "uv_index": min(11, round(solar / 80, 1)),
            "condition": _get_condition(vals["precip"], sum(vals["cloud"]) / len(vals["cloud"])),
        })
    return forecasts

def _parse_tomorrowio(data: dict, days: int):
    forecasts = []
    timelines = data.get("data", {}).get("timelines", [])
    for timeline in timelines:
        for interval in timeline.get("intervals", [])[:days]:
            vals = interval.get("values", {})
            temp = vals.get("temperature", 20)
            humidity = vals.get("humidity", 60)
            precip = vals.get("precipitationIntensity", 0) * 24
            wind = vals.get("windSpeed", 5)
            solar = vals.get("solarGHI", 400)
            cloud = vals.get("cloudCover", 50)
            uv = vals.get("uvIndex", 5)
            leaf_wetness = round(humidity * random.uniform(0.3, 0.5) / 10, 1)
            forecasts.append({
                "date": interval["startTime"][:10],
                "temp_min": round(temp - random.uniform(3, 7), 1),
                "temp_max": round(temp + random.uniform(3, 7), 1),
                "avg_temp": round(temp, 1),
                "humidity": round(humidity, 1),
                "precip_mm": round(precip, 1),
                "precip_prob": round(min(1.0, precip / 20), 2),
                "wind_speed": round(wind, 1),
                "wind_gust": round(wind * 1.5, 1),
                "solar_radiation": round(solar, 1),
                "cloud_cover": round(cloud),
                "leaf_wetness_hours": leaf_wetness,
                "uv_index": uv,
                "condition": _get_condition(precip, cloud),
            })
    return forecasts if forecasts else generate_simulated_forecast(0, 0, days)

def get_forecast(lat: float, lng: float, days: int = 14):
    return fetch_live_forecast(lat, lng, days)
