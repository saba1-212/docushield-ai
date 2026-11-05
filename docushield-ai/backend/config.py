"""Central configuration for the DocuShield AI backend."""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
TMP_DIR = os.path.join(BASE_DIR, "uploads", ".tmp")
DB_PATH = os.environ.get("DOCUSHIELD_DB", os.path.join(BASE_DIR, "database", "docushield.db"))
DATASET_PATH = os.path.join(BASE_DIR, "datasets", "sample_documents.csv")
MODEL_PATH = os.path.join(BASE_DIR, "ml", "artifacts", "model.joblib")
METRICS_PATH = os.path.join(BASE_DIR, "ml", "artifacts", "metrics.json")

APP_NAME = "DocuShield AI"
APP_VERSION = "1.0.0"

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_STORED_TEXT_CHARS = 300_000
MAX_PDF_PAGES = 300
MIN_TEXT_CHARS = 150   # below this we treat the document as unreadable / scanned
MIN_TEXT_WORDS = 25

# extension -> acceptable declared MIME types (content signature is checked as well)
ALLOWED_TYPES = {
    "pdf": {"application/pdf"},
    "docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    "txt": {"text/plain"},
}
# Some browsers/OSes send these for valid files; accepted only if the file signature also validates.
GENERIC_MIMES = {"application/octet-stream", "application/zip", "application/x-zip-compressed", ""}

RISK_LEVELS = ["Low", "Medium", "High"]
DEFAULT_CONFIDENCE_THRESHOLD = 0.80
MIN_THRESHOLD, MAX_THRESHOLD = 0.50, 0.99
