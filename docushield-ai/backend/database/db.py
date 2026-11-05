"""SQLite access layer. All application state is persisted here."""
import os
import sqlite3
from flask import g

import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER NOT NULL,
    upload_date TEXT NOT NULL,
    extracted_text TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    analyzed INTEGER NOT NULL DEFAULT 0,
    analyzed_at TEXT,
    category TEXT,
    category_confidence REAL,
    ai_risk TEXT,
    confidence REAL,
    probabilities TEXT,
    model_terms TEXT,
    policy_alerts TEXT,
    threshold_used REAL,
    review_status TEXT NOT NULL DEFAULT 'Not Required',
    review_reason TEXT,
    final_risk TEXT,
    review_comment TEXT,
    reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_documents_analyzed ON documents(analyzed, upload_date);
CREATE INDEX IF NOT EXISTS idx_documents_review ON documents(review_status);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def _connect():
    os.makedirs(os.path.dirname(config.DB_PATH), exist_ok=True)
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def get_db():
    if "db" not in g:
        g.db = _connect()
    return g.db


def close_db(_exc=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db():
    conn = _connect()
    try:
        conn.executescript(SCHEMA)
        conn.execute(
            "INSERT OR IGNORE INTO settings(key, value) VALUES('confidence_threshold', ?)",
            (str(config.DEFAULT_CONFIDENCE_THRESHOLD),),
        )
        conn.commit()
    finally:
        conn.close()
