"""TF-IDF feature construction and cosine similarity."""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel


def build_vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=2,
        max_df=0.9,
        stop_words="english",
        max_features=6000,
    )


def cosine_similarities(vectorizer: TfidfVectorizer, query_text: str, other_texts: list) -> list:
    """Cosine similarity (0..1) between one document and many, using the trained TF-IDF space."""
    if not other_texts:
        return []
    q = vectorizer.transform([query_text])
    m = vectorizer.transform(other_texts)
    return linear_kernel(q, m).ravel().tolist()  # vectors are L2-normalised => cosine
