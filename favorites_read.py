import mysql.connector
from flask import Blueprint, jsonify

from database import get_connection

favorites_read_bp = Blueprint("favorites_read", __name__)


def format_favorite(row):
    """Convert the created_at datetime to text so it can be sent as JSON."""
    if row and row.get("created_at"):
        row["created_at"] = row["created_at"].isoformat()
    return row


# --------------------------------------------------
# GET /api/favorites  -> all favourite cities
# --------------------------------------------------
@favorites_read_bp.route("/api/favorites", methods=["GET"])
def get_all_favorites():
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, city, country, nickname, created_at "
            "FROM favorites ORDER BY created_at DESC, id DESC"
        )
        favorites = [format_favorite(row) for row in cursor.fetchall()]

        # An empty table is still a successful request
        message = ("Favourite cities retrieved."
                   if favorites else "No favourite cities found.")

        return jsonify({
            "status": "success",
            "message": message,
            "count": len(favorites),
            "data": favorites
        }), 200

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


# --------------------------------------------------
# GET /api/favorites/<id>  -> one favourite city
# --------------------------------------------------
@favorites_read_bp.route("/api/favorites/<int:favorite_id>", methods=["GET"])
def get_favorite(favorite_id):
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, city, country, nickname, created_at "
            "FROM favorites WHERE id = %s",
            (favorite_id,)
        )
        favorite = cursor.fetchone()

        if favorite is None:
            return jsonify({
                "status": "error",
                "message": f"Favourite city with ID {favorite_id} not found."
            }), 404

        return jsonify({
            "status": "success",
            "data": format_favorite(favorite)
        }), 200

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