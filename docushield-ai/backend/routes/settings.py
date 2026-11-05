import sqlite3

from flask import Blueprint, jsonify, request

import config
from ml import predict
from models import document as store
from services.errors import ApiError
from database.db import get_db

bp = Blueprint("settings", __name__, url_prefix="/api")


@bp.get("/health")
def health():
    ok_db = True
    try:
        get_db().execute("SELECT 1").fetchone()
    except sqlite3.Error:
        ok_db = False
    model_ok = True
    try:
        predict.ensure_model()
    except Exception:
        model_ok = False
    return jsonify({"status": "ok" if ok_db and model_ok else "degraded", "database": ok_db, "model_loaded": model_ok,
                    "version": config.APP_VERSION}), (200 if ok_db and model_ok else 503)


@bp.get("/settings")
def get_settings():
    return jsonify({
        "confidence_threshold": store.get_threshold(),
        "min_threshold": config.MIN_THRESHOLD, "max_threshold": config.MAX_THRESHOLD,
        "supported_types": [{"extension": "." + e, "mime_types": sorted(m)} for e, m in config.ALLOWED_TYPES.items()],
        "max_file_mb": config.MAX_FILE_BYTES // (1024 * 1024),
        "categories": [
            {"name": "Low", "description": "No major risk indicators detected. Standard checks apply."},
            {"name": "Medium", "description": "Some clauses warrant review against policy."},
            {"name": "High", "description": "Significant risk indicators. Always routed to human review."},
        ],
        "app": {"name": config.APP_NAME, "version": config.APP_VERSION,
                "description": "AI-assisted document risk & compliance classifier (prototype)."},
    })


@bp.put("/settings")
def update_settings():
    body = request.get_json(silent=True) or {}
    try:
        value = float(body.get("confidence_threshold"))
    except (TypeError, ValueError):
        raise ApiError("confidence_threshold must be a number between 0.5 and 0.99.", 400)
    if not (config.MIN_THRESHOLD <= value <= config.MAX_THRESHOLD):
        raise ApiError(f"confidence_threshold must be between {config.MIN_THRESHOLD} and {config.MAX_THRESHOLD}.", 400)
    store.set_threshold(round(value, 2))
    return get_settings()


@bp.get("/model/info")
def model_info():
    metrics = predict.load_metrics()
    return jsonify(metrics)
