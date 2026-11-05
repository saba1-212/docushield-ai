"""
Two clearly separate kinds of explanation:

1. MODEL explanation  - which terms pushed the Logistic Regression model toward its prediction.
   Contribution of term j = TF-IDF weight(j) x coefficient(predicted class, j).
2. POLICY alerts      - deterministic regex rules written by a person. They are independent of the model
   and can fire (or not) regardless of what the model predicted.
"""
import re
import numpy as np

from ml.predict import get_risk_pipeline

# ----------------------------------------------------------------- model explanation


def model_explanation(normalized_text: str, predicted_risk: str, top_k: int = 10) -> dict:
    pipe = get_risk_pipeline()
    vec, clf = pipe.named_steps["tfidf"], pipe.named_steps["clf"]
    X = vec.transform([normalized_text])
    names = np.array(vec.get_feature_names_out())
    class_idx = list(clf.classes_).index(predicted_risk)
    coef = clf.coef_[class_idx]

    row = X.tocoo()
    present = row.col
    weights = row.data
    contrib = weights * coef[present]

    order = np.argsort(-contrib)
    supporting = [
        {"term": str(names[present[i]]), "weight": round(float(weights[i]), 4), "contribution": round(float(contrib[i]), 4)}
        for i in order if contrib[i] > 0
    ][:top_k]
    opposing = [
        {"term": str(names[present[i]]), "weight": round(float(weights[i]), 4), "contribution": round(float(contrib[i]), 4)}
        for i in order[::-1] if contrib[i] < 0
    ][:5]
    important = [
        {"term": str(names[present[i]]), "weight": round(float(weights[i]), 4)}
        for i in np.argsort(-weights)[:10]
    ]
    return {
        "method": "Logistic Regression coefficient x TF-IDF weight (per-term contribution to the predicted class)",
        "predicted_class": predicted_risk,
        "supporting_terms": supporting,
        "opposing_terms": opposing,
        "important_terms": important,
        "vocabulary_coverage": int(len(present)),
    }


# ----------------------------------------------------------------- policy-based keyword alerts

POLICY_RULES = [
    ("third_party_sale", "Third-party data sale / sharing", "High",
     r"\b(sell|rent|trade|share)\b[^.]{0,80}\b(personal (data|information)|your data|user data)\b[^.]{0,80}\b(third part|advertis|data broker|affiliates|partners)",
     "Personal data may be sold or shared with outside parties, which raises privacy and consent concerns."),
    ("unlimited_liability", "Unlimited liability / uncapped indemnity", "High",
     r"\b(unlimited liability|liability[^.]{0,40}unlimited|without (any )?cap|uncapped|indemnif[^.]{0,80}(all|any) claims)",
     "No ceiling on financial exposure; legal teams typically require a liability cap."),
    ("liability_exclusion", "Broad exclusion of liability", "High",
     r"\b(excludes? all liability|disclaims? all (responsibility|liability)|waives? all warranties)",
     "Extremely broad liability disclaimers may be unenforceable or unacceptable to your organisation."),
    ("auto_renewal", "Automatic renewal", "Medium",
     r"\b(renews? automatically|automatic(ally)? renew|auto-?renew)",
     "Contract continues automatically; check the notice window and any cancellation penalties."),
    ("renewal_penalty", "Cancellation penalty / restricted cancellation", "High",
     r"\b(cancellation|cancel(led)?)\b[^.]{0,120}\b(penalty|registered letter|forfeit)|\bpenalty equal to\b",
     "Cancellation is restricted or penalised, which can lock the organisation into the contract."),
    ("perpetual_license", "Perpetual / irrevocable licence", "High",
     r"\b(perpetual|irrevocabl[ey])\b[^.]{0,60}\b(licen[cs]e|right)",
     "Rights granted cannot be withdrawn, potentially transferring long-term control of your content or IP."),
    ("class_action_waiver", "Class-action waiver / forced arbitration", "High",
     r"\b(class action|binding (individual )?arbitration|waive[s]? (your|any) right)",
     "Limits the ability to bring collective legal claims or use the courts."),
    ("indefinite_retention", "Indefinite data retention", "High",
     r"\b(retain(ed)?|stor(e|ed)|keep)\b[^.]{0,60}\b(indefinite(ly)?|forever|without (a )?time limit)",
     "Data is kept without a defined retention limit, conflicting with data-minimisation principles."),
    ("no_breach_notice", "No breach notification", "High",
     r"\bnot (be )?(obliged|required|liable)[^.]{0,60}\b(notify|notification)[^.]{0,80}\b(breach|incident)",
     "Absence of a breach notification duty conflicts with GDPR-style requirements."),
    ("sensitive_data", "Sensitive data categories", "High",
     r"\b(health (records?|data)|biometric|genetic data|precise location|sexual orientation|religio(n|us) belief)",
     "Special-category data is processed or shared; stricter legal conditions normally apply."),
    ("noncompete", "Non-compete restriction", "Medium",
     r"\bnon-?compete\b",
     "Restricts future work; enforceability depends on duration, geography, and local law."),
    ("unilateral_change", "Unilateral changes to terms", "Medium",
     r"\b(unilaterally|at any time)\b[^.]{0,40}\b(modify|change|amend|update)|\bmodify (these|the) terms\b[^.]{0,40}without (prior )?notice",
     "One party can change the terms without agreement; check notice and consent mechanisms."),
    ("cross_border", "Cross-border data transfer", "Medium",
     r"\b(transfer(red)?|transmit(ted)?)\b[^.]{0,80}\b(outside|any country|international|cross-border|european economic area)",
     "International transfers may require safeguards such as standard contractual clauses."),
    ("subprocessor", "Sub-processors / subcontracting", "Medium",
     r"\b(sub-?processors?|subcontract)",
     "Third parties may handle your data or deliverables; verify approval and flow-down obligations."),
    ("ip_assignment", "Broad IP assignment", "Medium",
     r"\b(assigned entirely|assigns? all)\b[^.]{0,80}\b(intellectual property|work product|inventions)|intellectual property[^.]{0,80}assigned",
     "Ownership of created works is transferred; check scope (e.g., work outside working hours)."),
    ("ad_tracking", "Advertising cookies / tracking", "Medium",
     r"\b(cookies?|tracking)\b[^.]{0,80}\b(advertis|marketing|personalis)",
     "Tracking for advertising typically requires consent under GDPR/ePrivacy."),
]

# Sensitive-data PATTERNS (found in the document itself). Values are masked, never stored in full.
PII_PATTERNS = [
    ("ssn_like", "US Social Security number pattern", "High", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("card_like", "Payment card number pattern", "High", re.compile(r"\b(?:\d[ -]?){13,16}\b")),
    ("iban_like", "IBAN-like bank account number", "High", re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b")),
]

_COMPILED = [(i, l, s, re.compile(p, re.I), e) for i, l, s, p, e in POLICY_RULES]
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")


def _sentence_for(text: str, start: int, end: int, limit: int = 260) -> str:
    left = max(text.rfind(".", 0, start), text.rfind("\n", 0, start))
    right_candidates = [x for x in (text.find(".", end), text.find("\n", end)) if x != -1]
    right = min(right_candidates) if right_candidates else len(text)
    snippet = text[left + 1: right + 1].strip()
    return snippet if len(snippet) <= limit else snippet[:limit - 1].rstrip() + "…"


def _luhn(num: str) -> bool:
    digits = [int(c) for c in num if c.isdigit()]
    if not 13 <= len(digits) <= 19:
        return False
    total, alt = 0, False
    for d in reversed(digits):
        if alt:
            d *= 2
            if d > 9:
                d -= 9
        total += d
        alt = not alt
    return total % 10 == 0


def policy_alerts(text: str, max_per_rule: int = 2) -> list:
    """Deterministic keyword / pattern alerts, independent of the ML model."""
    alerts = []
    for rule_id, label, severity, rx, why in _COMPILED:
        found = []
        for m in rx.finditer(text):
            found.append(_sentence_for(text, m.start(), m.end()))
            if len(found) >= max_per_rule:
                break
        if found:
            alerts.append({"id": rule_id, "label": label, "severity": severity, "explanation": why,
                           "matches": found, "source": "policy_rule"})
    for rule_id, label, severity, rx in PII_PATTERNS:
        hits = []
        for m in rx.finditer(text):
            raw = m.group(0)
            if rule_id == "card_like" and not _luhn(raw):
                continue
            hits.append("•••• " + re.sub(r"\D", "", raw)[-4:] if rule_id != "iban_like" else raw[:4] + " ••••")
        if hits:
            alerts.append({"id": rule_id, "label": label, "severity": severity,
                           "explanation": f"{len(hits)} value(s) matching this pattern were found. Values are masked and never stored in full.",
                           "matches": hits[:3], "source": "pattern"})
    order = {"High": 0, "Medium": 1, "Low": 2}
    alerts.sort(key=lambda a: order[a["severity"]])
    return alerts
