# DocuShield AI — Intelligent Document Risk & Compliance Classifier

A full-stack prototype that extracts text from PDF / DOCX / TXT documents, classifies them as **Low / Medium / High risk** with a trained
TF-IDF + Logistic Regression model, explains the prediction, finds similar documents, and routes uncertain or high-risk documents to a
**manual review queue**. Everything is persisted in SQLite and every screen reads real data from the REST API.

> **Honest scope note.** The model is trained on a small **synthetic demonstration dataset** (`backend/datasets/sample_documents.csv`,
> generated from hand-written clause templates). It is **not** real enterprise compliance data, hold-out scores are optimistic, and the
> classifier is a prototype, not production-grade. AI results are preliminary and do not replace professional compliance review.

## Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Lucide React, Framer Motion, Recharts, React Router |
| Backend | Python, Flask, REST API |
| ML | scikit-learn (TF-IDF + Logistic Regression), cosine similarity, coefficient-based explanations, regex policy rules |
| Documents | pypdf, python-docx, plain TXT |
| Storage | SQLite (metadata, predictions, confidence, review decisions, settings) |

## Quick start

### 1. Backend (Python 3.10+)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py                      # http://127.0.0.1:5000
```
On first start the model is trained automatically from the sample dataset (takes a few seconds). To retrain manually and see metrics:
```bash
python -m ml.train_model
```

### 2. Frontend (Node 18+)
```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173  (proxies /api to :5000)
```
Optional production build served by Flask itself: `npm run build`, then open http://127.0.0.1:5000.

The first screen asks for a display name. This is a **local profile only** (no accounts/passwords); it powers the profile menu and Logout.

## Testing the full workflow (spec §17)
Automated backend test (real Flask app, real model, real SQLite in a temp file):
```bash
cd backend && python -m pytest tests -q        # or: python tests/test_workflow.py
```
Manual run in the UI, using files in `sample_documents/`:

1. Start backend and frontend.
2. **Analyze Document** → drop `high_risk_privacy_policy.pdf`, `medium_risk_vendor_agreement.docx`, `low_risk_data_processing_addendum.txt`, `borderline_terms_of_use.txt`.
3. Each file shows extracted word count and a text preview. Click **Analyze**.
4. Open each result: risk level, real model confidence, probabilities.
5. Inspect **Model explanation** (ML) and **Policy keyword alerts** (rules) — clearly separated panels.
6. Check **Manual Review**: the privacy policy (High) and the borderline terms (low confidence) are queued.
7. Open one, change the final category (a comment is then required), **Mark as Reviewed & Save**. The original AI prediction is stored separately.
8. Check **Document History** (filters, search, sort, delete) and the **Dashboard** — counts and charts update.
9. `scanned_image_only.pdf` demonstrates the graceful "not enough readable text" error.

| Sample file | Typical result |
|---|---|
| `high_risk_privacy_policy.pdf` | High, ~99% → review (high risk always verified by a human) |
| `medium_risk_vendor_agreement.docx` | Medium, ~97% → auto-classified |
| `low_risk_data_processing_addendum.txt` | Low, ~83% → auto-classified |
| `borderline_terms_of_use.txt` | Medium, ~53% → review (below 80% threshold) |

## How classification works
1. **Extraction** – pypdf / python-docx / TXT; whitespace and hyphenation artefacts cleaned; too-little-text (e.g. scanned PDFs) is rejected.
2. **Preprocessing** – lower-casing, URL/e-mail masking, whitespace normalisation.
3. **Classification** – TF-IDF (1–2-grams) → multinomial Logistic Regression trained on the labelled CSV.
4. **Confidence** – the model's maximum predicted-class probability (uncalibrated; labelled as such in the UI). Nothing is invented or random.
5. **Review decision** – `confidence < threshold` **or** `High` risk → manual review. Threshold is configurable in Settings (default 80%) and applies to future analyses.

**Explainability**
* *Model explanation* – per-term contribution = TF-IDF weight × Logistic Regression coefficient for the predicted class.
* *Policy alerts* – independent deterministic regex rules (third-party data sale, unlimited liability, auto-renewal, etc.) plus masked sensitive-data patterns (SSN-like, Luhn-valid card numbers, IBAN-like). They can fire regardless of the model.
* *Similar documents* – TF-IDF cosine similarity against previously analyzed documents.

## API
`POST /api/documents/upload` · `POST /api/documents/analyze` · `GET /api/documents` (q, risk, review_status, date_from, date_to, sort, page) ·
`GET /api/documents/{id}` · `DELETE /api/documents/{id}` · `GET /api/dashboard/stats` · `GET /api/dashboard/charts` ·
`GET /api/reviews` · `POST /api/reviews/{id}` · `GET|PUT /api/settings` · `GET /api/model/info` · `GET /api/health`

## Security & reliability
Extension + declared MIME + file-signature validation; 10 MB limit; sanitised display names and random stored file names; uploads processed via a
temp file that is always cleaned up; document text is treated strictly as data (never executed, never used as instructions); no document
content in logs; parameterised SQL; JSON error responses; encrypted/corrupt/scanned PDFs handled with clear errors.

## Known limitations
* No OCR – scanned PDFs are rejected with an explanation.
* No real authentication; the "profile" is a local display name.
* Synthetic training data; the model reflects the clause wording of the demonstration set. Replace `sample_documents.csv` (columns `text, risk_label, category`) with real labelled data and run `python -m ml.train_model` for real use.
* Confidence is an uncalibrated model probability.
* Changing the threshold does not re-evaluate already-analyzed documents.

## Project structure
```
docushield-ai/
├── frontend/   src/{components,pages,layouts,services,hooks,utils}, App.jsx, package.json, vite/tailwind config
├── backend/    app.py, config.py, routes/, models/, services/, database/, uploads/, requirements.txt
│   ├── ml/     data_preprocessing.py, document_extraction.py, feature_extraction.py, train_model.py, predict.py, explainability.py
│   ├── datasets/  sample_documents.csv (+ generate_sample_dataset.py)
│   └── tests/  test_workflow.py
├── sample_documents/   test PDF / DOCX / TXT files (+ make_samples.py)
└── README.md
```
