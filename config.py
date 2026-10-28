import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# OpenWeather settings
API_KEY = os.getenv("OPENWEATHER_API_KEY", "").strip()

GEOCODING_URL = "https://api.openweathermap.org/geo/1.0/direct"
WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

PLACEHOLDER_KEYS = {
    "",
    "your_openweather_api_key_here",
    "your_new_rotated_api_key",
    "your_new_rotated_api_key_value",
}

# MySQL settings
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "Puneeth@1"),
    "database": os.getenv("DB_NAME", "weatherhub_db"),
}