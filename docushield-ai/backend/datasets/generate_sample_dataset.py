"""
Generates datasets/sample_documents.csv  --  A SYNTHETIC DEMONSTRATION DATASET.

These documents are assembled from hand-written clause templates. They are NOT real
enterprise compliance data, and a model trained on them is a prototype, not production-grade.
Run:  python datasets/generate_sample_dataset.py
"""
import csv
import os
import random

SEED = 7
N_PER_CLASS = 130
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_documents.csv")

CATEGORIES = {
    "Privacy Policy": {
        "intro": [
            "This Privacy Policy describes how we collect, use, and disclose personal information when you use our website and services.",
            "Our Privacy Notice explains what personal data we process about visitors and customers and the choices available to you.",
            "This privacy statement sets out the categories of personal information we gather and the purposes for which we use it.",
        ],
        "own": [
            "We collect information you provide directly, such as your name and email address, and information collected automatically through cookies.",
            "This policy applies to all visitors, registered users, and customers of our online platform.",
            "Questions about this privacy policy can be sent to our data protection contact.",
        ],
    },
    "Terms of Service": {
        "intro": [
            "By accessing or using the Service you agree to be bound by these Terms of Service.",
            "These Terms of Service govern your access to and use of our platform, applications, and related services.",
            "Please read these Terms of Use carefully before creating an account or using the Service.",
        ],
        "own": [
            "You must be at least eighteen years old and are responsible for keeping your account credentials confidential.",
            "You agree not to misuse the Service, interfere with its operation, or attempt unauthorised access.",
            "The Service is provided on an as available basis and features may change over time.",
        ],
    },
    "Non-Disclosure Agreement": {
        "intro": [
            "This Non-Disclosure Agreement is entered into between the Disclosing Party and the Receiving Party to protect confidential information.",
            "This Confidentiality Agreement governs the exchange of proprietary information between the parties for the Permitted Purpose.",
            "The parties wish to explore a potential business relationship and agree to the following confidentiality terms.",
        ],
        "own": [
            "Confidential Information means any non-public technical, financial, or business information disclosed by the Disclosing Party.",
            "The Receiving Party shall use Confidential Information solely for the Permitted Purpose and shall return or destroy it upon request.",
            "Confidential Information does not include information that is publicly available or independently developed.",
        ],
    },
    "Employment Contract": {
        "intro": [
            "This Employment Agreement is made between the Employer and the Employee and sets out the terms of employment.",
            "The Employee is hereby offered the position described in this employment contract subject to the conditions below.",
            "This Contract of Employment records the main terms and conditions of the Employee's appointment.",
        ],
        "own": [
            "The Employee shall receive an annual base salary paid in equal monthly instalments and is eligible for the benefits plan.",
            "The Employee will report to the department head and shall perform the duties reasonably assigned.",
            "The probationary period is six months, during which performance will be reviewed regularly.",
        ],
    },
    "Vendor Agreement": {
        "intro": [
            "This Master Services Agreement is entered into between the Customer and the Vendor for the provision of the Services.",
            "This Vendor Agreement sets out the terms under which the Supplier will deliver the Services described in the attached Schedule.",
            "The Customer engages the Supplier to provide the services, and the parties agree to the following commercial terms.",
        ],
        "own": [
            "The Vendor shall deliver the Services in accordance with the service levels set out in Schedule A.",
            "Fees are invoiced monthly in arrears and are payable within thirty days of the invoice date.",
            "Each party shall appoint a relationship manager to oversee delivery of the Services.",
        ],
    },
    "Data Processing Agreement": {
        "intro": [
            "This Data Processing Agreement forms part of the main agreement between the Controller and the Processor.",
            "This DPA sets out the obligations of the Processor when processing personal data on behalf of the Controller.",
            "The parties agree to this Data Processing Addendum to ensure compliance with applicable data protection law.",
        ],
        "own": [
            "The Processor shall process Personal Data only on documented instructions from the Controller.",
            "The subject matter, duration, and nature of the processing are described in Annex 1 to this Agreement.",
            "Personnel authorised to process Personal Data are bound by confidentiality obligations.",
        ],
    },
}

HIGH = [
    "The Company may sell, rent, or share your personal data with third parties, including advertisers and data brokers, without obtaining your separate consent.",
    "Supplier's liability under this Agreement shall be unlimited, and Customer shall indemnify Supplier against all claims, losses, and damages of any kind without any cap.",
    "You irrevocably waive your right to participate in any class action and agree that all disputes will be resolved through binding individual arbitration.",
    "This Agreement renews automatically for successive three-year terms and can only be cancelled by registered letter sent exactly ninety days before renewal, otherwise a penalty equal to all remaining fees applies.",
    "The user grants the Company a perpetual, irrevocable, worldwide, royalty-free license to use, modify, and sublicense all submitted content for any purpose.",
    "Personal data will be retained indefinitely and may be transferred to any country without notification or additional safeguards.",
    "The Processor is not obliged to notify the Controller of any personal data breach and disclaims all responsibility for security incidents.",
    "Sensitive categories of data, including health records, biometric identifiers, and precise location, may be collected and disclosed to affiliates and partners for marketing purposes.",
    "The Employee agrees to a worldwide non-compete restriction lasting five years after termination, with no compensation during the restricted period.",
    "The Company may unilaterally modify these terms at any time without notice, and continued use constitutes acceptance of every change.",
    "The Recipient's confidentiality obligations are one-sided and survive indefinitely, while the Discloser may freely disclose the Recipient's information to third parties.",
    "Sub-processors may be engaged at any time without informing or obtaining approval from the Controller, and audits by the Controller are expressly prohibited.",
    "The Customer waives all warranties and remedies, and the Vendor may suspend the services immediately without refund for any reason.",
    "Intellectual property created by the Employee, including work done outside working hours, is assigned entirely to the Company without compensation.",
    "We may disclose your personal information to any third party we choose, including for purposes unrelated to the original collection.",
    "The Supplier excludes all liability for data loss, security incidents, and regulatory fines, even where caused by its own negligence.",
]
MEDIUM = [
    "The Agreement renews automatically for successive one-year terms unless either party gives written notice of non-renewal at least thirty days before the end of the term.",
    "Each party's total liability is limited to the fees paid in the twelve months preceding the claim, except in cases of gross negligence.",
    "Personal data may be retained for up to twenty-four months after account closure for analytics and legal purposes.",
    "Data may be transferred outside the European Economic Area, subject to standard contractual clauses where required.",
    "The Employee agrees to a non-compete restriction of twelve months within the same country.",
    "We share limited usage information with selected service providers who assist us with hosting and analytics under contractual obligations.",
    "The Company may update these terms with thirty days notice by email, and continued use after the notice period means acceptance.",
    "Confidential Information may be disclosed to employees and subcontractors who need to know it, provided they are bound by confidentiality obligations of similar scope.",
    "Disputes shall first be submitted to mediation and, if unresolved after sixty days, may be brought before the courts of the agreed jurisdiction.",
    "The Vendor may subcontract parts of the Services with prior written notice to the Customer and remains responsible for subcontractor performance.",
    "Cookies and similar technologies are used to personalise advertising, and users can opt out through browser settings or the preference centre.",
    "Late payments incur interest of one and a half percent per month, and services may be suspended after fifteen days of non-payment.",
    "The Processor shall notify the Controller of a personal data breach within five business days of becoming aware of it.",
    "User content remains owned by the user, but the Company receives a license to host and display it for the duration of the service and a reasonable period afterwards.",
    "Confidentiality obligations continue for five years after termination, and either party may disclose information where required by a court order.",
    "The Supplier's indemnity covers third-party intellectual property claims but is capped at two times the annual fees.",
]
LOW = [
    "Each party shall keep Confidential Information secure using the same degree of care it applies to its own confidential information, and no less than reasonable care.",
    "Either party may terminate this Agreement for convenience by giving thirty days written notice, with a pro-rata refund of prepaid fees.",
    "We collect personal data only with your explicit consent and only for the purposes described in this notice.",
    "Personal data is encrypted in transit and at rest, and access is restricted to authorised personnel.",
    "You may access, correct, export, or delete your personal data at any time through your account settings or by contacting our privacy team.",
    "We do not sell personal data to third parties.",
    "Each party's liability is mutual and limited to direct damages, and nothing in this Agreement limits liability that cannot be limited by law.",
    "This Agreement is governed by the laws of the agreed jurisdiction and any disputes shall be resolved by the competent courts.",
    "The Processor shall notify the Controller without undue delay and within twenty-four hours of becoming aware of a personal data breach.",
    "The Controller may audit the Processor's compliance on reasonable notice, and sub-processors require prior written authorisation.",
    "Intellectual property rights in pre-existing materials remain with the originating party, and each party retains ownership of its own work product.",
    "Personal data is deleted within thirty days of a verified request or when it is no longer necessary for the stated purpose.",
    "The Employee is entitled to twenty-five days of paid annual leave, and either party may end employment with the notice period required by law.",
    "The Company reviews its security controls annually and is certified under recognised information security standards.",
    "Changes to these terms will be communicated at least sixty days in advance, and users may close their account without penalty.",
    "Confidential Information must be returned or securely destroyed within thirty days after the Agreement ends.",
]
FILLER = [
    "Defined terms have the meanings given in Section 1 of this document.",
    "This document was last reviewed in the current calendar year.",
    "Headings are for convenience only and do not affect interpretation.",
    "Notices must be sent in writing to the contact address listed on the cover page.",
    "No failure to exercise a right operates as a waiver of that right.",
    "If any provision is held invalid, the remaining provisions continue in full force.",
]


def build(rng, risk, category):
    c = CATEGORIES[category]
    if risk == "High":
        body = rng.sample(HIGH, rng.randint(2, 4)) + rng.sample(MEDIUM, rng.randint(0, 2)) + rng.sample(LOW, rng.randint(1, 2))
    elif risk == "Medium":
        body = rng.sample(MEDIUM, rng.randint(2, 4)) + rng.sample(LOW, rng.randint(1, 3))
    else:
        body = rng.sample(LOW, rng.randint(3, 5)) + (rng.sample(MEDIUM, 1) if rng.random() < 0.2 else [])
    body += rng.sample(c["own"], rng.randint(1, 2)) + rng.sample(FILLER, rng.randint(0, 2))
    rng.shuffle(body)
    return " ".join([rng.choice(c["intro"])] + body)


def main():
    rng = random.Random(SEED)
    cats = list(CATEGORIES)
    rows = []
    for risk in ("Low", "Medium", "High"):
        for i in range(N_PER_CLASS):
            cat = cats[i % len(cats)]
            rows.append({"text": build(rng, risk, cat), "risk_label": risk, "category": cat})
    rng.shuffle(rows)
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["text", "risk_label", "category"])
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} synthetic demonstration documents to {OUT}")


if __name__ == "__main__":
    main()
