"""Document persistence: queries, serialisation, statistics."""
import json
from datetime import datetime, timedelta, timezone

import config
from database.db import get_db

# The risk that counts for statistics: the human decision once reviewed, otherwise the AI prediction.
EFFECTIVE_RISK = "CASE WHEN review_status='Reviewed' AND final_risk IS NOT NULL THEN final_risk ELSE ai_risk END"

STATUS_LABEL = {"Not Required": "Auto-Classified", "Pending": "Pending Review", "Reviewed": "Reviewed"}

RECOMMENDED_ACTION = {
    "Low": "No major risk indicators detected. Proceed with standard checks.",
    "Medium": "Review the identified clauses and verify them against the relevant policies.",
    "High": "Prioritise human compliance review before approval.",
}
DISCLAIMER = ("AI results are preliminary and do not replace professional compliance or legal review.")


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _j(value, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default


def serialize(row, detail=False):
    d = {
        "id": row["id"],
        "name": row["original_name"],
        "file_type": row["file_type"],
        "file_size": row["file_size"],
        "upload_date": row["upload_date"],
        "analyzed_at": row["analyzed_at"],
        "word_count": row["word_count"],
        "category": row["category"],
        "ai_risk": row["ai_risk"],
        "confidence": row["confidence"],
        "final_risk": row["final_risk"],
        "effective_risk": row["final_risk"] if (row["review_status"] == "Reviewed" and row["final_risk"]) else row["ai_risk"],
        "review_status": row["review_status"],
        "status": STATUS_LABEL.get(row["review_status"], row["review_status"]),
        "review_reason": row["review_reason"],
        "review_comment": row["review_comment"],
        "reviewed_at": row["reviewed_at"],
    }
    if detail:
        d.update({
            "category_confidence": row["category_confidence"],
            "probabilities": _j(row["probabilities"], {}),
            "model_explanation": _j(row["model_terms"], {}),
            "policy_alerts": _j(row["policy_alerts"], []),
            "threshold_used": row["threshold_used"],
            "extracted_text": row["extracted_text"],
            "recommended_action": RECOMMENDED_ACTION.get(row["ai_risk"]),
            "disclaimer": DISCLAIMER,
        })
    else:
        d["text_preview"] = (row["extracted_text"] or "")[:300]
    return d


# ------------------------------------------------------------------ settings
def get_threshold():
    row = get_db().execute("SELECT value FROM settings WHERE key='confidence_threshold'").fetchone()
    try:
        return float(row["value"])
    except (TypeError, ValueError):
        return config.DEFAULT_CONFIDENCE_THRESHOLD


def set_threshold(value: float):
    db = get_db()
    db.execute("INSERT INTO settings(key,value) VALUES('confidence_threshold',?) "
               "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (str(value),))
    db.commit()


# ------------------------------------------------------------------ CRUD
def insert_document(name, stored_name, ext, mime, size, text, words):
    db = get_db()
    cur = db.execute(
        "INSERT INTO documents(original_name, stored_name, file_type, mime_type, file_size, upload_date, extracted_text, word_count) "
        "VALUES (?,?,?,?,?,?,?,?)", (name, stored_name, ext, mime, size, now_iso(), text, words))
    db.commit()
    return cur.lastrowid


def get_row(doc_id):
    return get_db().execute("SELECT * FROM documents WHERE id=?", (doc_id,)).fetchone()


def delete_row(doc_id):
    db = get_db()
    db.execute("DELETE FROM documents WHERE id=?", (doc_id,))
    db.commit()


def save_analysis(doc_id, pred, model_terms, alerts, threshold, review_status, reason):
    db = get_db()
    db.execute(
        "UPDATE documents SET analyzed=1, analyzed_at=?, category=?, category_confidence=?, ai_risk=?, confidence=?, "
        "probabilities=?, model_terms=?, policy_alerts=?, threshold_used=?, review_status=?, review_reason=? WHERE id=?",
        (now_iso(), pred["category"], pred["category_confidence"], pred["risk"], pred["confidence"],
         json.dumps(pred["probabilities"]), json.dumps(model_terms), json.dumps(alerts), threshold,
         review_status, reason, doc_id))
    db.commit()


def save_review(doc_id, final_risk, comment, reviewed):
    db = get_db()
    if reviewed:
        db.execute("UPDATE documents SET final_risk=?, review_comment=?, review_status='Reviewed', reviewed_at=? WHERE id=?",
                   (final_risk, comment, now_iso(), doc_id))
    else:
        db.execute("UPDATE documents SET final_risk=?, review_comment=?, review_status='Pending', reviewed_at=NULL WHERE id=?",
                   (final_risk, comment, doc_id))
    db.commit()


def list_documents(q=None, risk=None, review_status=None, date_from=None, date_to=None,
                   sort="newest", page=1, page_size=20, only_review=False, category=None):
    where, args = ["analyzed=1"], []
    if only_review:
        where.append("review_status IN ('Pending','Reviewed')")
    if q:
        where.append("original_name LIKE ? ESCAPE '\\'")
        args.append("%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%")
    if risk:
        where.append(f"({EFFECTIVE_RISK}) = ?")
        args.append(risk)
    if category:
        where.append("category = ?")
        args.append(category)
    if review_status:
        where.append("review_status = ?")
        args.append(review_status)
    if date_from:
        where.append("substr(upload_date,1,10) >= ?")
        args.append(date_from)
    if date_to:
        where.append("substr(upload_date,1,10) <= ?")
        args.append(date_to)
    clause = " AND ".join(where)
    order = "ASC" if sort == "oldest" else "DESC"
    db = get_db()
    total = db.execute(f"SELECT COUNT(*) c FROM documents WHERE {clause}", args).fetchone()["c"]
    rows = db.execute(
        f"SELECT * FROM documents WHERE {clause} ORDER BY upload_date {order}, id {order} LIMIT ? OFFSET ?",
        args + [page_size, (page - 1) * page_size]).fetchall()
    return [serialize(r) for r in rows], total


def candidates_for_similarity(exclude_id, limit=500):
    return get_db().execute(
        f"SELECT id, original_name, extracted_text, ({EFFECTIVE_RISK}) AS risk, category FROM documents "
        "WHERE analyzed=1 AND id != ? ORDER BY id DESC LIMIT ?", (exclude_id, limit)).fetchall()


# ------------------------------------------------------------------ dashboard
def dashboard_stats():
    db = get_db()
    r = db.execute(
        f"SELECT COUNT(*) total,"
        f" SUM(CASE WHEN ({EFFECTIVE_RISK})='Low' THEN 1 ELSE 0 END) low,"
        f" SUM(CASE WHEN ({EFFECTIVE_RISK})='Medium' THEN 1 ELSE 0 END) medium,"
        f" SUM(CASE WHEN ({EFFECTIVE_RISK})='High' THEN 1 ELSE 0 END) high,"
        f" SUM(CASE WHEN review_status='Pending' THEN 1 ELSE 0 END) pending,"
        f" SUM(CASE WHEN review_status='Reviewed' THEN 1 ELSE 0 END) reviewed "
        "FROM documents WHERE analyzed=1").fetchone()
    return {
        "total": r["total"] or 0, "low": r["low"] or 0, "medium": r["medium"] or 0, "high": r["high"] or 0,
        "manual_review_pending": r["pending"] or 0, "reviewed": r["reviewed"] or 0,
    }


def dashboard_charts(days=14):
    db = get_db()
    dist = dashboard_stats()
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    rows = db.execute(
        f"SELECT substr(analyzed_at,1,10) d, ({EFFECTIVE_RISK}) risk, COUNT(*) c FROM documents "
        "WHERE analyzed=1 AND substr(analyzed_at,1,10) >= ? GROUP BY d, risk", (start.isoformat(),)).fetchall()
    by_day = {}
    for r in rows:
        by_day.setdefault(r["d"], {"Low": 0, "Medium": 0, "High": 0})[r["risk"]] = r["c"]
    trend = []
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        v = by_day.get(d, {"Low": 0, "Medium": 0, "High": 0})
        trend.append({"date": d, "low": v["Low"], "medium": v["Medium"], "high": v["High"],
                      "total": v["Low"] + v["Medium"] + v["High"]})
    cats = db.execute("SELECT category name, COUNT(*) count FROM documents WHERE analyzed=1 GROUP BY category ORDER BY count DESC").fetchall()
    return {
        "risk_distribution": [{"name": "Low", "value": dist["low"]}, {"name": "Medium", "value": dist["medium"]},
                              {"name": "High", "value": dist["high"]}],
        "trend": trend,
        "categories": [{"name": c["name"], "count": c["count"]} for c in cats],
    }
