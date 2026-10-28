import requests
from flask import Blueprint, jsonify, request

from config import API_KEY, GEOCODING_URL, FORECAST_URL, PLACEHOLDER_KEYS

forecast_bp = Blueprint("forecast", __name__)


@forecast_bp.route("/api/weather/forecast", methods=["GET"])
def weather_forecast():

    # Read city and country from query parameters
    city = request.args.get("city", "").strip()
    country = request.args.get("country", "").strip().upper()

    # Validate city
    if not city:
        return jsonify({
            "status": "error",
            "message": "Please provide a city name."
        }), 400

    # Validate API key
    if API_KEY.lower() in PLACEHOLDER_KEYS:
        return jsonify({
            "status": "error",
            "message": "OpenWeather API key is not configured."
        }), 500

    location_query = f"{city},{country}" if country else city

    try:
        # Step 1: Find the city's coordinates
        geo_response = requests.get(
            GEOCODING_URL,
            params={
                "q": location_query,
                "limit": 1,
                "appid": API_KEY
            },
            timeout=10
        )

        if geo_response.status_code == 401:
            return jsonify({
                "status": "error",
                "message": "OpenWeather rejected the API key."
            }), 502

        if geo_response.status_code == 429:
            return jsonify({
                "status": "error",
                "message": "Weather API rate limit reached."
            }), 503

        if geo_response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": "Unable to search for this city."
            }), 502

        locations = geo_response.json()

        if not locations:
            return jsonify({
                "status": "error",
                "message": "City not found."
            }), 404

        latitude = locations[0]["lat"]
        longitude = locations[0]["lon"]

        # Step 2: Request the five-day forecast
        forecast_response = requests.get(
            FORECAST_URL,
            params={
                "lat": latitude,
                "lon": longitude,
                "appid": API_KEY,
                "units": "metric"
            },
            timeout=10
        )

        if forecast_response.status_code == 401:
            return jsonify({
                "status": "error",
                "message": "OpenWeather rejected the API key."
            }), 502

        if forecast_response.status_code == 429:
            return jsonify({
                "status": "error",
                "message": "Weather API rate limit reached."
            }), 503

        if forecast_response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": "Unable to retrieve the forecast."
            }), 502

        forecast_data = forecast_response.json()

        # Step 3: Extract the required forecast information
        forecast_list = []

        for item in forecast_data.get("list", []):

            main = item.get("main", {})
            weather_info = item.get("weather", [{}])[0]

            forecast_list.append({
                "forecast_time_utc": item.get("dt_txt"),
                "temperature_c": main.get("temp"),
                "feels_like_c": main.get("feels_like"),
                "humidity_percent": main.get("humidity"),
                "description": weather_info.get("description"),
                "icon": weather_info.get("icon"),
                "wind_speed_mps": item.get("wind", {}).get("speed"),
                "precipitation_probability_percent": round(
                    item.get("pop", 0) * 100
                )
            })

        # Step 4: Return the forecast as JSON
        return jsonify({
            "status": "success",
            "data": {
                "city": forecast_data["city"]["name"],
                "country": forecast_data["city"]["country"],
                "timezone_offset_seconds": forecast_data["city"]["timezone"],
                "forecast_count": len(forecast_list),
                "forecast": forecast_list
            }
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({
            "status": "error",
            "message": "The weather service took too long to respond."
        }), 504

    except requests.exceptions.RequestException:
        return jsonify({
            "status": "error",
            "message": "Unable to connect to the weather service."
        }), 502

    except (ValueError, KeyError, IndexError, TypeError):
        return jsonify({
            "status": "error",
            "message": "Received an invalid forecast response."
        }), 502