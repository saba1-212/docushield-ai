"""Text extraction for PDF, DOCX and TXT. Uploaded content is only ever *read* as data."""
import zipfile

from pypdf import PdfReader
from docx import Document

import config


class ExtractionError(Exception):
    """User-presentable extraction failure (never contains document content)."""


def extract_pdf(path: str) -> str:
    try:
        reader = PdfReader(path)
        if reader.is_encrypted:
            try:
                ok = reader.decrypt("")
            except Exception:
                ok = 0
            if not ok:
                raise ExtractionError("This PDF is password-protected. Remove the password and upload it again.")
        pages = reader.pages
        if len(pages) > config.MAX_PDF_PAGES:
            raise ExtractionError(f"PDF has too many pages (limit {config.MAX_PDF_PAGES}).")
        parts = []
        for page in pages:
            try:
                parts.append(page.extract_text() or "")
            except Exception:
                parts.append("")
        return "\n\n".join(parts)
    except ExtractionError:
        raise
    except Exception:
        raise ExtractionError("The PDF could not be read. It may be corrupted.")


def extract_docx(path: str) -> str:
    try:
        with zipfile.ZipFile(path) as z:
            if sum(i.file_size for i in z.infolist()) > 150 * 1024 * 1024:
                raise ExtractionError("The Word document expands to an unsafe size and was rejected.")
        doc = Document(path)
        parts = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text.strip()]
                if cells:
                    parts.append(" | ".join(cells))
        return "\n".join(parts)
    except ExtractionError:
        raise
    except Exception:
        raise ExtractionError("The Word document could not be read. It may be corrupted.")


def extract_txt(path: str) -> str:
    with open(path, "rb") as fh:
        raw = fh.read()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    raise ExtractionError("The text file encoding is not supported.")


def extract_text(path: str, ext: str) -> str:
    ext = ext.lower()
    if ext == "pdf":
        return extract_pdf(path)
    if ext == "docx":
        return extract_docx(path)
    if ext == "txt":
        return extract_txt(path)
    raise ExtractionError("Unsupported file type.")
