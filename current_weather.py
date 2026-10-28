import requests
from flask import Blueprint, jsonify, request

from config import API_KEY, GEOCODING_URL, WEATHER_URL, PLACEHOLDER_KEYS

current_weather_bp = Blueprint("current_weather", __name__)


@current_weather_bp.route("/api/weather/current", methods=["GET"])
def current_weather():

    # Read query parameters
    city = request.args.get("city", "").strip()
    country = request.args.get("country", "").strip().upper()

    # Validate city
    if not city:
        return jsonify({
            "status": "error",
            "message": "Please provide a city name."
        }), 400

    # Validate API key configuration
    if API_KEY.lower() in PLACEHOLDER_KEYS:
        return jsonify({
            "status": "error",
            "message": "OpenWeather API key is not configured. "
                       "Please check your .env file."
        }), 500

    # Prepare location query
    location_query = f"{city},{country}" if country else city

    try:
        # Step 1: Find the city coordinates
        geo_response = requests.get(
            GEOCODING_URL,
            params={
                "q": location_query,
                "limit": 1,
                "appid": API_KEY
            },
            timeout=10
        )

        # Handle Geocoding API errors
        if geo_response.status_code == 401:
            return jsonify({
                "status": "error",
                "message": "OpenWeather rejected the API key. "
                           "Check its validity and activation status."
            }), 502

        if geo_response.status_code == 429:
            return jsonify({
                "status": "error",
                "message": "OpenWeather API rate limit reached."
            }), 503

        if geo_response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": "Unable to search for the requested city."
            }), 502

        locations = geo_response.json()

        # Check whether the city was found
        if not locations:
            return jsonify({
                "status": "error",
                "message": "City not found. Please check the city name."
            }), 404

        latitude = locations[0]["lat"]
        longitude = locations[0]["lon"]

        # Step 2: Fetch current weather using coordinates
        weather_response = requests.get(
            WEATHER_URL,
            params={
                "lat": latitude,
                "lon": longitude,
                "appid": API_KEY,
                "units": "metric"
            },
            timeout=10
        )

        # Handle Current Weather API errors
        if weather_response.status_code == 401:
            return jsonify({
                "status": "error",
                "message": "OpenWeather rejected the API key. "
                           "Check its validity and activation status."
            }), 502

        if weather_response.status_code == 429:
            return jsonify({
                "status": "error",
                "message": "OpenWeather API rate limit reached."
            }), 503

        if weather_response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": "Unable to retrieve current weather."
            }), 502

        weather = weather_response.json()

        # Step 3: Extract the required weather information
        main = weather["main"]
        condition = weather["weather"][0]
        wind = weather.get("wind", {})
        system = weather.get("sys", {})

        # Step 4: Return a clean JSON response
        return jsonify({
            "status": "success",
            "data": {
                "city": weather["name"],
                "country": system.get("country"),
                "latitude": latitude,
                "longitude": longitude,
                "temperature_c": main["temp"],
                "feels_like_c": main["feels_like"],
                "minimum_temperature_c": main.get("temp_min"),
                "maximum_temperature_c": main.get("temp_max"),
                "humidity_percent": main["humidity"],
                "pressure_hpa": main["pressure"],
                "wind_speed_mps": wind.get("speed"),
                "visibility_m": weather.get("visibility"),
                "description": condition["description"],
                "icon": condition["icon"],
                "sunrise": system.get("sunrise"),
                "sunset": system.get("sunset"),
                "observed_at": weather.get("dt")
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
            "message": "Received an invalid response from the weather service."
        }), 502