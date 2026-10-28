import mysql.connector
from flask import Blueprint, jsonify, request

from database import get_connection

favorites_update_bp = Blueprint("favorites_update", __name__)


@favorites_update_bp.route("/api/favorites/<int:favorite_id>", methods=["PUT"])
def update_favorite(favorite_id):

    # Step 1: Read and check the JSON body
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON."
        }), 400

    # Step 2: Clean the fields
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

        # Step 4: Does this record exist?
        cursor.execute(
            "SELECT id FROM favorites WHERE id = %s",
            (favorite_id,)
        )
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": f"Favourite city with ID {favorite_id} not found."
            }), 404

        # Step 5: Update only this record (parameterized query)
        cursor.execute(
            "UPDATE favorites SET city = %s, country = %s, nickname = %s "
            "WHERE id = %s",
            (city, country, nickname, favorite_id)
        )
        connection.commit()

        # Step 6: Return the updated record
        cursor.execute(
            "SELECT id, city, country, nickname, created_at "
            "FROM favorites WHERE id = %s",
            (favorite_id,)
        )
        favorite = cursor.fetchone()
        favorite["created_at"] = favorite["created_at"].isoformat()

        return jsonify({
            "status": "success",
            "message": "Favourite city updated.",
            "data": favorite
        }), 200

    except mysql.connector.IntegrityError as error:
        # 1062 = this city + country already exists on another record
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