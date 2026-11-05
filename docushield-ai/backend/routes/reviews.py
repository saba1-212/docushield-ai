from flask import Blueprint, jsonify, request

from models import document as store
from services import document_service as svc
from services.errors import ApiError

bp = Blueprint("reviews", __name__, url_prefix="/api/reviews")


@bp.get("")
def queue():
    status = request.args.get("status") or None
    if status and status not in ("Pending", "Reviewed"):
        raise ApiError("status must be Pending or Reviewed.", 400)
    items, total = store.list_documents(review_status=status, only_review=True, sort="newest", page=1, page_size=100)
    return jsonify({"items": items, "total": total})


@bp.post("/<int:doc_id>")
def submit(doc_id):
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ApiError("A JSON body is required.", 400)
    return jsonify(svc.submit_review(doc_id, body))
