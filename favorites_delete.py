import mysql.connector
from flask import Blueprint, jsonify

from database import get_connection

favorites_delete_bp = Blueprint("favorites_delete", __name__)


@favorites_delete_bp.route("/api/favorites/<int:favorite_id>", methods=["DELETE"])
def delete_favorite(favorite_id):
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        # Step 1: Get the record first so we can show what was deleted
        cursor.execute(
            "SELECT id, city, country, nickname "
            "FROM favorites WHERE id = %s",
            (favorite_id,)
        )
        favorite = cursor.fetchone()

        if favorite is None:
            return jsonify({
                "status": "error",
                "message": f"Favourite city with ID {favorite_id} not found."
            }), 404

        # Step 2: Delete only the matching record
        cursor.execute(
            "DELETE FROM favorites WHERE id = %s",
            (favorite_id,)
        )
        connection.commit()

        # Step 3: Confirm
        return jsonify({
            "status": "success",
            "message": "Favourite city deleted.",
            "data": favorite
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