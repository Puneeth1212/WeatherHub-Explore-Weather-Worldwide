import mysql.connector
from flask import Flask, jsonify, render_template

from current_weather import current_weather_bp
from weather_forecast import forecast_bp
from favorites_create import favorites_create_bp
from favorites_read import favorites_read_bp
from favorites_update import favorites_update_bp
from favorites_delete import favorites_delete_bp
from database import get_connection
from errors import register_error_handlers

# Create the Flask application
app = Flask(__name__)

# Connect the blueprints
app.register_blueprint(current_weather_bp)
app.register_blueprint(forecast_bp)
app.register_blueprint(favorites_create_bp)
app.register_blueprint(favorites_read_bp)
app.register_blueprint(favorites_update_bp)
app.register_blueprint(favorites_delete_bp)

# Consistent JSON errors
register_error_handlers(app)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "success",
        "message": "WeatherHub backend is running"
    }), 200


@app.route("/api/health/db", methods=["GET"])
def database_health_check():
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM favorites")
        count = cursor.fetchone()[0]
        cursor.close()
        connection.close()

        return jsonify({
            "status": "success",
            "message": "Connected to MySQL",
            "favorites_count": count
        }), 200

    except mysql.connector.Error as error:
        print(error)
        return jsonify({
            "status": "error",
            "message": "Unable to connect to the database."
        }), 503


if __name__ == "__main__":
    app.run(debug=True)