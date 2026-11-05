"""DocuShield AI - Flask application entry point.   Run:  python app.py"""
import logging
import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

import config
from database.db import close_db, init_db
from services.errors import ApiError

FRONTEND_DIST = os.path.join(os.path.dirname(config.BASE_DIR), "frontend", "dist")


def create_app():
    app = Flask(__name__, static_folder=None)

    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "https://docushield-ai-delta.vercel.app",
                "https://docushield-ai.vercel.app",
                "https://docushield-ai-git-main-saba1-212s-projects.vercel.app"
            ]
        }
    })

    app.config["MAX_CONTENT_LENGTH"] = config.MAX_FILE_BYTES + 1024 * 1024

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
    os.makedirs(config.TMP_DIR, exist_ok=True)
    init_db()
    from ml.predict import ensure_model
    ensure_model()  # loads (or trains on first run)

    from routes import dashboard, documents, reviews, settings
    for m in (documents, dashboard, reviews, settings):
        app.register_blueprint(m.bp)
    app.teardown_appcontext(close_db)

    @app.after_request
    def headers(resp):
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["Cache-Control"] = "no-store" if resp.mimetype == "application/json" else resp.headers.get("Cache-Control", "")
        return resp

    @app.errorhandler(ApiError)
    def api_error(e):
        return jsonify({"error": e.message, "code": e.code}), e.status

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({"error": f"File is too large (limit {config.MAX_FILE_BYTES // (1024 * 1024)} MB).", "code": "file_too_large"}), 413

    @app.errorhandler(HTTPException)
    def http_error(e):
        return jsonify({"error": e.description, "code": e.name.lower().replace(" ", "_")}), e.code

    @app.errorhandler(Exception)
    def unexpected(e):
        app.logger.exception("Unhandled error (%s)", type(e).__name__)
        return jsonify({"error": "Something went wrong on the server.", "code": "server_error"}), 500

    # Optionally serve the built frontend (npm run build) from the same server.
    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def spa(path):
        if path.startswith("api/"):
            return jsonify({"error": "Not found", "code": "not_found"}), 404
        if os.path.isdir(FRONTEND_DIST):
            full = os.path.join(FRONTEND_DIST, path)
            if path and os.path.isfile(full):
                return send_from_directory(FRONTEND_DIST, path)
            return send_from_directory(FRONTEND_DIST, "index.html")
        return jsonify({"message": "DocuShield AI API is running. Start the frontend with `npm run dev` in /frontend."})

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=int(os.environ.get("PORT", 5000)), debug=False)
