"""Upload validation, the 5-step analysis workflow, similar documents and reviews."""
import logging
import os
import re
import shutil
import tempfile
import uuid
import zipfile

import config
from ml import explainability, predict
from ml.data_preprocessing import clean_extracted_text
from ml.document_extraction import ExtractionError, extract_text
from ml.feature_extraction import cosine_similarities
from models import document as store
from services.errors import ApiError

log = logging.getLogger("docushield")  # NOTE: never log document text


# ------------------------------------------------------------------ upload
def sanitize_filename(name: str) -> str:
    name = os.path.basename((name or "").replace("\\", "/"))
    name = re.sub(r"[\x00-\x1f\x7f<>:\"|?*]", "", name).strip(". ")
    base, ext = os.path.splitext(name)
    base = re.sub(r"\s+", " ", base)[:100] or "document"
    return base + ext.lower()


def _validate_signature(path: str, ext: str):
    with open(path, "rb") as fh:
        head = fh.read(8192)
    if ext == "pdf":
        if b"%PDF-" not in head[:1024]:
            raise ApiError("File content is not a valid PDF.", 415, "invalid_content")
    elif ext == "docx":
        if not zipfile.is_zipfile(path):
            raise ApiError("File content is not a valid Word (.docx) document.", 415, "invalid_content")
        with zipfile.ZipFile(path) as z:
            if "word/document.xml" not in z.namelist():
                raise ApiError("File content is not a valid Word (.docx) document.", 415, "invalid_content")
    elif ext == "txt":
        if b"\x00" in head:
            raise ApiError("File content is not plain text.", 415, "invalid_content")


def process_upload(file_storage):
    if file_storage is None or not file_storage.filename:
        raise ApiError("No file was provided.", 400, "no_file")
    name = sanitize_filename(file_storage.filename)
    ext = os.path.splitext(name)[1].lstrip(".").lower()
    if ext not in config.ALLOWED_TYPES:
        raise ApiError(f"Unsupported file type '.{ext}'. Supported: PDF, DOCX, TXT.", 415, "unsupported_type")
    mime = (file_storage.mimetype or "").lower()
    if mime not in config.ALLOWED_TYPES[ext] and mime not in config.GENERIC_MIMES:
        raise ApiError(f"File type does not match its extension (received {mime}).", 415, "mime_mismatch")

    os.makedirs(config.TMP_DIR, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=config.TMP_DIR, suffix="." + ext)
    stored_path = None
    try:
        size = 0
        with os.fdopen(fd, "wb") as out:
            while True:
                chunk = file_storage.stream.read(64 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > config.MAX_FILE_BYTES:
                    raise ApiError(f"File is too large (limit {config.MAX_FILE_BYTES // (1024 * 1024)} MB).", 413, "file_too_large")
                out.write(chunk)
        if size == 0:
            raise ApiError("The file is empty.", 400, "empty_file")

        _validate_signature(tmp_path, ext)
        try:
            raw = extract_text(tmp_path, ext)
        except ExtractionError as e:
            raise ApiError(str(e), 422, "extraction_failed")

        text = clean_extracted_text(raw)[: config.MAX_STORED_TEXT_CHARS]
        words = len(text.split())
        if len(text) < config.MIN_TEXT_CHARS or words < config.MIN_TEXT_WORDS:
            hint = " It may be a scanned image-only PDF (OCR is not supported)." if ext == "pdf" else ""
            raise ApiError("Not enough readable text could be extracted to classify this document." + hint, 422, "insufficient_text")

        stored_name = f"{uuid.uuid4().hex}.{ext}"
        os.makedirs(config.UPLOAD_DIR, exist_ok=True)
        stored_path = os.path.join(config.UPLOAD_DIR, stored_name)
        shutil.move(tmp_path, stored_path)
        doc_id = store.insert_document(name, stored_name, ext, mime, size, text, words)
        return {"id": doc_id, "name": name, "file_type": ext, "file_size": size, "word_count": words,
                "text_preview": text[:500]}
    except Exception:
        if stored_path and os.path.exists(stored_path):
            os.remove(stored_path)
        raise
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)  # temporary processing file is always cleaned up


# ------------------------------------------------------------------ analysis
def review_decision(risk: str, confidence: float, threshold: float):
    reasons = []
    if confidence < threshold:
        reasons.append(f"Low model confidence ({confidence * 100:.1f}% is below the {threshold * 100:.0f}% threshold)")
    if risk == "High":
        reasons.append("High-risk document requires human verification")
    if reasons:
        return "Pending", "; ".join(reasons)
    return "Not Required", None


def analyze_document(doc_id: int):
    row = store.get_row(doc_id)
    if row is None:
        raise ApiError("Document not found.", 404, "not_found")
    if row["analyzed"]:
        return get_document_detail(doc_id)

    text = row["extracted_text"]  # step 1 (extraction) happened at upload; text is treated purely as data
    pred = predict.predict(text)                       # steps 2-4: preprocess, classify, confidence
    terms = explainability.model_explanation(pred["normalized_text"], pred["risk"])
    alerts = explainability.policy_alerts(text)
    threshold = store.get_threshold()
    status, reason = review_decision(pred["risk"], pred["confidence"], threshold)   # step 5
    store.save_analysis(doc_id, pred, terms, alerts, threshold, status, reason)
    log.info("analyzed document id=%s risk=%s confidence=%.3f review=%s", doc_id, pred["risk"], pred["confidence"], status)
    return get_document_detail(doc_id)


def find_similar(doc_id: int, text: str, top_n: int = 5, min_similarity: float = 0.15):
    rows = store.candidates_for_similarity(doc_id)
    if not rows:
        return []
    from ml.data_preprocessing import normalize_for_model
    vec = predict.get_vectorizer()
    sims = cosine_similarities(vec, normalize_for_model(text), [normalize_for_model(r["extracted_text"]) for r in rows])
    ranked = sorted(zip(rows, sims), key=lambda x: -x[1])
    return [{"id": r["id"], "name": r["original_name"], "risk": r["risk"], "category": r["category"],
             "similarity": round(s, 4)} for r, s in ranked[:top_n] if s >= min_similarity]


def get_document_detail(doc_id: int):
    row = store.get_row(doc_id)
    if row is None or not row["analyzed"]:
        raise ApiError("Document not found.", 404, "not_found")
    d = store.serialize(row, detail=True)
    d["similar_documents"] = find_similar(doc_id, row["extracted_text"])
    return d


def remove_document(doc_id: int):
    row = store.get_row(doc_id)
    if row is None:
        raise ApiError("Document not found.", 404, "not_found")
    path = os.path.join(config.UPLOAD_DIR, os.path.basename(row["stored_name"]))
    store.delete_row(doc_id)
    if os.path.exists(path):
        os.remove(path)


# ------------------------------------------------------------------ review
def submit_review(doc_id: int, payload: dict):
    row = store.get_row(doc_id)
    if row is None or not row["analyzed"]:
        raise ApiError("Document not found.", 404, "not_found")
    if row["review_status"] == "Not Required":
        raise ApiError("This document was auto-classified and is not in the manual review queue.", 409, "not_in_queue")
    final_risk = payload.get("final_risk")
    if final_risk not in config.RISK_LEVELS:
        raise ApiError("final_risk must be one of: Low, Medium, High.", 400, "invalid_risk")
    comment = payload.get("comment", "")
    if comment is None:
        comment = ""
    if not isinstance(comment, str) or len(comment) > 2000:
        raise ApiError("Comment must be text of at most 2000 characters.", 400, "invalid_comment")
    reviewed = payload.get("reviewed", True)
    if not isinstance(reviewed, bool):
        raise ApiError("reviewed must be true or false.", 400, "invalid_reviewed")
    if reviewed and final_risk != row["ai_risk"] and not comment.strip():
        raise ApiError("Please add a comment explaining why the AI risk category was changed.", 400, "comment_required")
    store.save_review(doc_id, final_risk, comment.strip(), reviewed)
    return get_document_detail(doc_id)
