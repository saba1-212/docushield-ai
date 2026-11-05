"""
Train + evaluate the TF-IDF / Logistic Regression classifiers and save them.

    python -m ml.train_model

Two models are trained on the labelled sample dataset:
  * risk model      -> Low / Medium / High
  * category model  -> document type (used for the dashboard category chart)
Evaluation uses a stratified hold-out split plus 5-fold cross-validation; the shipped model is then
re-fitted on 100% of the data. Metrics are written to ml/artifacts/metrics.json.
"""
import json
import os
import sys
from datetime import datetime, timezone

import joblib
import numpy as np
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, precision_recall_fscore_support,
                             classification_report)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config  # noqa: E402
from ml.data_preprocessing import load_dataset  # noqa: E402
from ml.feature_extraction import build_vectorizer  # noqa: E402

RISK_ORDER = ["Low", "Medium", "High"]


def make_pipeline():
    return Pipeline([
        ("tfidf", build_vectorizer()),
        ("clf", LogisticRegression(C=8.0, max_iter=3000, class_weight="balanced")),
    ])


def evaluate(X, y, labels, seed=42):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=seed)
    pipe = make_pipeline().fit(X_tr, y_tr)
    pred = pipe.predict(X_te)
    p, r, f, s = precision_recall_fscore_support(y_te, pred, labels=labels, zero_division=0)
    wp, wr, wf, _ = precision_recall_fscore_support(y_te, pred, average="weighted", zero_division=0)
    cv = cross_val_score(make_pipeline(), X, y, cv=StratifiedKFold(5, shuffle=True, random_state=seed), scoring="accuracy")
    return {
        "labels": labels,
        "test_size": int(len(y_te)),
        "train_size": int(len(y_tr)),
        "accuracy": round(float(accuracy_score(y_te, pred)), 4),
        "precision_weighted": round(float(wp), 4),
        "recall_weighted": round(float(wr), 4),
        "f1_weighted": round(float(wf), 4),
        "cv_accuracy_mean": round(float(cv.mean()), 4),
        "cv_accuracy_std": round(float(cv.std()), 4),
        "confusion_matrix": confusion_matrix(y_te, pred, labels=labels).tolist(),
        "per_class": [
            {"label": l, "precision": round(float(p[i]), 4), "recall": round(float(r[i]), 4),
             "f1": round(float(f[i]), 4), "support": int(s[i])}
            for i, l in enumerate(labels)
        ],
    }


def train(dataset_path=config.DATASET_PATH, model_path=config.MODEL_PATH, metrics_path=config.METRICS_PATH):
    df = load_dataset(dataset_path)
    X = df["clean_text"].tolist()

    risk_metrics = evaluate(X, df["risk_label"].tolist(), RISK_ORDER)
    categories = sorted(df["category"].unique().tolist())
    cat_metrics = evaluate(X, df["category"].tolist(), categories)

    risk_model = make_pipeline().fit(X, df["risk_label"].tolist())
    cat_model = make_pipeline().fit(X, df["category"].tolist())

    trained_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump({"risk_model": risk_model, "category_model": cat_model, "trained_at": trained_at,
                 "sklearn_version": sklearn.__version__}, model_path)

    metrics = {
        "trained_at": trained_at,
        "algorithm": "TF-IDF (1-2 grams, sublinear TF) + Logistic Regression (multinomial, class-weight balanced)",
        "confidence_measure": "Maximum predicted class probability from Logistic Regression (uncalibrated model probability).",
        "dataset": {
            "name": "sample_documents.csv",
            "size": int(len(df)),
            "class_counts": {k: int(v) for k, v in df["risk_label"].value_counts().items()},
            "nature": "SYNTHETIC demonstration dataset assembled from hand-written clause templates. "
                      "It is not real enterprise compliance data.",
        },
        "evaluation_note": "Metrics are from a stratified 80/20 hold-out split and 5-fold cross-validation. "
                           "The deployed model is re-fitted on all samples. Because the dataset is small and synthetic, "
                           "scores are optimistic and the model is a prototype, not production-grade.",
        "risk": risk_metrics,
        "category": cat_metrics,
        "categories": categories,
    }
    with open(metrics_path, "w", encoding="utf-8") as fh:
        json.dump(metrics, fh, indent=2)
    return metrics


if __name__ == "__main__":
    m = train()
    r = m["risk"]
    print(f"Trained on {m['dataset']['size']} synthetic documents")
    print(f"Risk model  accuracy={r['accuracy']}  weighted F1={r['f1_weighted']}  CV={r['cv_accuracy_mean']}±{r['cv_accuracy_std']}")
    print(f"Category model accuracy={m['category']['accuracy']}")
    print("Confusion matrix (rows=true, cols=pred, order Low/Medium/High):")
    for row in r["confusion_matrix"]:
        print("  ", row)
    print(f"Saved model -> {config.MODEL_PATH}")
