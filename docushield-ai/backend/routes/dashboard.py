from flask import Blueprint, jsonify

from models import document as store

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@bp.get("/stats")
def stats():
    return jsonify(store.dashboard_stats())


@bp.get("/charts")
def charts():
    return jsonify(store.dashboard_charts())
