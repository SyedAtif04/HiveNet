"""Semantic intent router for LogBot.

Embeds the user query and computes cosine similarity against pre-defined
intent description strings. Returns the best-matching intent and its confidence.
Falls back to UNKNOWN when max similarity < CONFIDENCE_THRESHOLD.
"""

import numpy as np

CONFIDENCE_THRESHOLD = 0.30

_INTENT_DESCRIPTIONS: dict[str, str] = {
    "STOCKOUT_RISK": "Items at risk of stockout out of stock critical inventory zero quantity",
    "REORDER_DECISIONS": "What needs reorder purchase order decisions recommendations urgent order",
    "INVENTORY_OVERVIEW": "Inventory overview total stock SKU summary levels all products",
    "SUPPLIER_PERFORMANCE": "Supplier vendor performance reliability ranking lead time best worst",
    "DEMAND_FORECAST": "Demand forecast predict next month quarter units consumption projected",
    "ACTIVE_ALERTS": "Active alerts warnings critical supply chain issues unresolved",
    "OPTIMIZATION_METRICS": "Safety stock reorder point EOQ economic order quantity optimization ROP",
    "SPECIFIC_SKU": "Tell me about a specific product SKU item stock level details info",
}

_model = None
_intent_names: list[str] = []
_intent_embeddings: np.ndarray | None = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _build_index() -> None:
    global _intent_names, _intent_embeddings
    model = _get_model()
    _intent_names = list(_INTENT_DESCRIPTIONS.keys())
    descriptions = list(_INTENT_DESCRIPTIONS.values())
    embs = model.encode(descriptions, normalize_embeddings=True)
    _intent_embeddings = np.array(embs)


def route(query: str) -> tuple[str, float]:
    """Return (intent_name, confidence) for the given query string."""
    global _intent_embeddings
    if _intent_embeddings is None:
        _build_index()

    model = _get_model()
    q_emb = model.encode([query], normalize_embeddings=True)[0]

    scores = _intent_embeddings @ q_emb
    best_idx = int(np.argmax(scores))
    best_score = float(scores[best_idx])

    if best_score < CONFIDENCE_THRESHOLD:
        return "UNKNOWN", best_score

    return _intent_names[best_idx], best_score
