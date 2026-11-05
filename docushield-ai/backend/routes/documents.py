from flask import Blueprint, jsonify, request

from models import document as store
from services import document_service as svc
from services.errors import ApiError

bp = Blueprint("documents", __name__, url_prefix="/api/documents")


def _int(name, default, lo, hi):
    try:
        v = int(request.args.get(name, default))
    except ValueError:
        raise ApiError(f"{name} must be an integer.", 400)
    return max(lo, min(hi, v))


def _date(name):
    v = request.args.get(name)
    if not v:
        return None
    import re
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        raise ApiError(f"{name} must be YYYY-MM-DD.", 400)
    return v


@bp.post("/upload")
def upload():
    return jsonify(svc.process_upload(request.files.get("file"))), 201


@bp.post("/analyze")
def analyze():
    body = request.get_json(silent=True) or {}
    doc_id = body.get("document_id")
    if not isinstance(doc_id, int) or isinstance(doc_id, bool):
        raise ApiError("document_id (integer) is required.", 400)
    return jsonify(svc.analyze_document(doc_id))


@bp.get("")
def list_all():
    risk = request.args.get("risk") or None
    if risk and risk not in ("Low", "Medium", "High"):
        raise ApiError("risk must be Low, Medium or High.", 400)
    rs = request.args.get("review_status") or None
    if rs and rs not in ("Not Required", "Pending", "Reviewed"):
        raise ApiError("review_status must be Not Required, Pending or Reviewed.", 400)
    sort = request.args.get("sort", "newest")
    if sort not in ("newest", "oldest"):
        raise ApiError("sort must be newest or oldest.", 400)
    page, size = _int("page", 1, 1, 100000), _int("page_size", 20, 1, 100)
    items, total = store.list_documents(
        q=(request.args.get("q") or "").strip()[:100] or None, risk=risk, review_status=rs,
        date_from=_date("date_from"), date_to=_date("date_to"), sort=sort, page=page, page_size=size,
        category=request.args.get("category") or None)
    return jsonify({"items": items, "total": total, "page": page, "page_size": size})


@bp.get("/<int:doc_id>")
def detail(doc_id):
    return jsonify(svc.get_document_detail(doc_id))


@bp.delete("/<int:doc_id>")
def delete(doc_id):
    svc.remove_document(doc_id)
    return jsonify({"deleted": doc_id})
