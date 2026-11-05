"""Text cleaning / normalisation shared by training and inference."""
import re
import pandas as pd

_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_HYPHEN_BREAK = re.compile(r"(\w)-\n(\w)")
_MULTI_SPACE = re.compile(r"[ \t\u00a0]+")
_MULTI_NL = re.compile(r"\n{3,}")
_URL = re.compile(r"https?://\S+|www\.\S+", re.I)
_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")


def clean_extracted_text(text: str) -> str:
    """Remove formatting artefacts left by PDF/DOCX extraction (kept readable for preview)."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _CONTROL.sub(" ", text)
    text = _HYPHEN_BREAK.sub(r"\1\2", text)
    text = _MULTI_SPACE.sub(" ", text)
    text = "\n".join(line.strip() for line in text.split("\n"))
    text = _MULTI_NL.sub("\n\n", text)
    return text.strip()


def normalize_for_model(text: str) -> str:
    """Normalise text for TF-IDF: lowercase, mask URLs/e-mails, collapse whitespace."""
    text = _URL.sub(" urltoken ", text)
    text = _EMAIL.sub(" emailtoken ", text)
    text = text.lower()
    text = re.sub(r"[^a-z0-9%\s'-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_dataset(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    required = {"text", "risk_label", "category"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing columns: {sorted(missing)}")
    df = df.dropna(subset=["text", "risk_label"]).copy()
    df["clean_text"] = df["text"].astype(str).map(normalize_for_model)
    return df
