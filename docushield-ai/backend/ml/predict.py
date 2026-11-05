"""Load the trained models and classify documents."""
import json
import os
import threading

import joblib
import sklearn

import config
from ml.data_preprocessing import normalize_for_model

_lock = threading.Lock()
_bundle = None


def ensure_model():
    """Load the saved model; train it on the sample dataset first if it does not exist yet."""
    global _bundle
    with _lock:
        if _bundle is None:
            loaded = None
            if os.path.exists(config.MODEL_PATH):
                try:
                    loaded = joblib.load(config.MODEL_PATH)
                    if loaded.get("sklearn_version") != sklearn.__version__:
                        loaded = None  # trained with another scikit-learn version -> retrain
                except Exception:
                    loaded = None
            if loaded is None:
                from ml.train_model import train
                train()
                loaded = joblib.load(config.MODEL_PATH)
            _bundle = loaded
    return _bundle


def reload_model():
    global _bundle
    with _lock:
        _bundle = None
    return ensure_model()


def get_vectorizer():
    return ensure_model()["risk_model"].named_steps["tfidf"]


def get_risk_pipeline():
    return ensure_model()["risk_model"]


def predict(clean_text: str) -> dict:
    """Return predicted risk (+ class probabilities) and document category for already-cleaned text."""
    b = ensure_model()
    norm = normalize_for_model(clean_text)
    risk_pipe, cat_pipe = b["risk_model"], b["category_model"]

    proba = risk_pipe.predict_proba([norm])[0]
    classes = list(risk_pipe.classes_)
    probs = {c: float(p) for c, p in zip(classes, proba)}
    risk = max(probs, key=probs.get)

    cproba = cat_pipe.predict_proba([norm])[0]
    ci = int(cproba.argmax())
    return {
        "risk": risk,
        "confidence": probs[risk],
        "probabilities": {k: round(probs.get(k, 0.0), 4) for k in config.RISK_LEVELS},
        "category": str(cat_pipe.classes_[ci]),
        "category_confidence": float(cproba[ci]),
        "normalized_text": norm,
    }


def load_metrics() -> dict:
    ensure_model()
    if os.path.exists(config.METRICS_PATH):
        with open(config.METRICS_PATH, encoding="utf-8") as fh:
            return json.load(fh)
    return {}
