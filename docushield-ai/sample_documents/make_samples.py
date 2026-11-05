"""Regenerates the sample test documents:  python make_samples.py"""
import os
from docx import Document
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))

HIGH_PRIVACY = [
    ("Privacy Policy - NovaConnect Social", None),
    ("1. Information we collect", "We collect your name, contacts, health information you share in groups, biometric face templates from photos, and your precise location history. We may also receive data about you from advertisers and data brokers."),
    ("2. How we share information", "NovaConnect may sell or share your personal information with third parties, advertisers, and our corporate affiliates for marketing and profiling purposes. We do not ask for separate consent before doing so."),
    ("3. Retention and transfers", "We keep personal data indefinitely, even after you delete your account. Your data may be transferred to any country in which we or our partners operate, without additional safeguards."),
    ("4. Security incidents", "We are not obliged to notify users or authorities of a data breach, and we accept no responsibility for losses arising from security incidents."),
    ("5. Changes and disputes", "We may change this policy at any time without notice. By using the service you irrevocably waive your right to join a class action and agree to binding individual arbitration."),
]

MEDIUM_VENDOR = [
    "Master Services Agreement - CloudDesk Support Services",
    "This Master Services Agreement is made between Northwind Retail Ltd (the Customer) and CloudDesk Services Inc. (the Vendor) for the provision of helpdesk support services described in Schedule A.",
    "Term and renewal. The initial term is twelve months. The agreement renews automatically for successive twelve-month terms unless either party gives written notice of non-renewal at least thirty days before the term ends.",
    "Fees. The Vendor invoices monthly in arrears. Late payments accrue interest at 1.5% per month and the Vendor may suspend the services if an invoice is more than fifteen days overdue.",
    "Liability. Each party's aggregate liability is limited to the fees paid during the twelve months before the claim arose, other than for gross negligence or wilful misconduct.",
    "Subcontracting. The Vendor may subcontract elements of the services on prior written notice and remains responsible for its subcontractors.",
    "Data. Customer data may be processed in data centres outside the European Economic Area under standard contractual clauses and is retained for up to twenty-four months after termination.",
    "Disputes. The parties will attempt mediation for sixty days before commencing court proceedings in the agreed jurisdiction.",
]

LOW_DPA = """DATA PROCESSING ADDENDUM

This Data Processing Addendum supplements the Services Agreement between Acme Analytics (the Controller) and SecureHost GmbH (the Processor).

1. Instructions. The Processor will process personal data only on the documented instructions of the Controller and only for the purposes set out in Annex 1.

2. Confidentiality. Everyone authorised to process personal data is bound by written confidentiality duties.

3. Security. The Processor maintains encryption of personal data in transit and at rest, restricts access to authorised staff, and reviews its security controls every year. It holds a current ISO 27001 certificate.

4. Sub-processors. The Processor will engage sub-processors only with the prior written authorisation of the Controller and will impose the same obligations on them.

5. Breach notification. The Processor will notify the Controller without undue delay, and in any event within 24 hours, after becoming aware of a personal data breach.

6. Deletion. On request, or when the services end, the Processor will delete all personal data within thirty days and confirm deletion in writing.

7. Audits. The Controller may audit the Processor's compliance on reasonable notice. We do not sell personal data to third parties.
"""

BORDERLINE_TOS = """TERMS OF USE - PhotoNest

Welcome to PhotoNest. By creating an account you accept these Terms of Use. You must be over eighteen and keep your password confidential.

Your content. You keep ownership of the photos you upload. You give PhotoNest a licence to store and display them while your account is active. We may use anonymised, aggregated statistics to improve our products.

Our liability. PhotoNest is provided as is. To the extent allowed by law, our total liability is capped at the subscription fees you paid in the previous year.

Subscriptions. Paid plans renew each month until cancelled. You can cancel at any time from your account page and keep access until the end of the billing period.

Changes. We will email you thirty days before any material change to these terms takes effect. You can close your account if you do not agree.

Disputes. Disagreements are handled first by our support team and then by the courts of the country where you live.
"""


def pdf_high():
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(os.path.join(HERE, "high_risk_privacy_policy.pdf"), pagesize=A4)
    story = [Paragraph(HIGH_PRIVACY[0][0], styles["Title"]), Spacer(1, 12)]
    for h, body in HIGH_PRIVACY[1:]:
        story += [Paragraph(h, styles["Heading3"]), Paragraph(body, styles["BodyText"]), Spacer(1, 8)]
    doc.build(story)


def docx_medium():
    d = Document()
    d.add_heading(MEDIUM_VENDOR[0], 1)
    for p in MEDIUM_VENDOR[1:]:
        d.add_paragraph(p)
    d.save(os.path.join(HERE, "medium_risk_vendor_agreement.docx"))


def txt_files():
    for name, text in (("low_risk_data_processing_addendum.txt", LOW_DPA), ("borderline_terms_of_use.txt", BORDERLINE_TOS)):
        with open(os.path.join(HERE, name), "w", encoding="utf-8") as f:
            f.write(text)


def scanned_like_pdf():
    """A PDF containing only a drawn shape (no text layer) - simulates a scanned document."""
    c = canvas.Canvas(os.path.join(HERE, "scanned_image_only.pdf"), pagesize=A4)
    c.rect(80, 400, 400, 200, fill=1)
    c.save()


if __name__ == "__main__":
    pdf_high(); docx_medium(); txt_files(); scanned_like_pdf()
    print("Sample documents written to", HERE)
