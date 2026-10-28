import mysql.connector
from flask import Blueprint, jsonify, request

from database import get_connection

favorites_create_bp = Blueprint("favorites_create", __name__)


@favorites_create_bp.route("/api/favorites", methods=["POST"])
def create_favorite():

    # Step 1: Read the JSON body (silent=True returns None instead of crashing)
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON."
        }), 400

    # Step 2: Read and clean the fields
    city = str(data.get("city") or "").strip()
    country = str(data.get("country") or "").strip().upper()
    nickname = str(data.get("nickname") or "").strip() or None

    # Step 3: Validate
    if not city:
        return jsonify({
            "status": "error",
            "message": "City is required."
        }), 400

    if len(city) > 100:
        return jsonify({
            "status": "error",
            "message": "City must be 100 characters or fewer."
        }), 400

    if len(country) != 2 or not country.isalpha():
        return jsonify({
            "status": "error",
            "message": "Country must be a 2-letter code, for example IN."
        }), 400

    if nickname and len(nickname) > 100:
        return jsonify({
            "status": "error",
            "message": "Nickname must be 100 characters or fewer."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        # Step 4: Insert using a parameterized query (prevents SQL injection)
        cursor.execute(
            "INSERT INTO favorites (city, country, nickname) "
            "VALUES (%s, %s, %s)",
            (city, country, nickname)
        )
        connection.commit()
        new_id = cursor.lastrowid

        # Step 5: Read the saved row back so the response is exactly what is stored
        cursor.execute(
            "SELECT id, city, country, nickname, created_at "
            "FROM favorites WHERE id = %s",
            (new_id,)
        )
        favorite = cursor.fetchone()
        favorite["created_at"] = favorite["created_at"].isoformat()

        return jsonify({
            "status": "success",
            "message": "Favourite city added.",
            "data": favorite
        }), 201

    except mysql.connector.IntegrityError as error:
        # Error 1062 = duplicate entry (city + country already exists)
        if error.errno == 1062:
            return jsonify({
                "status": "error",
                "message": "This city is already in your favourites."
            }), 409
        return jsonify({
            "status": "error",
            "message": "The database rejected this data."
        }), 400

    except mysql.connector.Error as error:
        print(error)
        return jsonify({
            "status": "error",
            "message": "Database error. Please try again later."
        }), 503

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()