from flask import jsonify
from werkzeug.exceptions import HTTPException

MESSAGES = {
    400: "Bad request.",
    404: "The requested resource was not found.",
    405: "This HTTP method is not allowed for this endpoint.",
    415: "Unsupported content type. Send JSON.",
}


def register_error_handlers(app):

    # Flask's own errors (404, 405, ...) -> JSON
    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return jsonify({
            "status": "error",
            "message": MESSAGES.get(error.code, error.name)
        }), error.code

    # Anything unexpected -> clean JSON 500 (details stay in the terminal only)
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception(error)
        return jsonify({
            "status": "error",
            "message": "Something went wrong on the server."
        }), 500