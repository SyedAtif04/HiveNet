"""Semantic intent router for FinBot.

Embeds the user query and computes cosine similarity against pre-defined
intent description strings. Returns the best-matching intent and its confidence.
Falls back to UNKNOWN when max similarity < CONFIDENCE_THRESHOLD.
"""

import numpy as np
from app.services.finance import get_model

CONFIDENCE_THRESHOLD = 0.30

_INTENT_DESCRIPTIONS: dict[str, str] = {
    "EXPENSE_TOP_CATEGORY": "Which expense category has most total spending category summary breakdown distribution",
    "PROFIT_TREND": "Show profit trend growth decline over time monthly profit analysis",
    "MONTHLY_INCOME_PEAK": "Which month had highest lowest best worst income revenue peak",
    "FINANCIAL_SUMMARY": "Give financial summary overview total income expenses performance net profit margin",
    "FORECAST_NEXT": "Forecast predict next month quarter year income expenses profit future",
    "CATEGORY_BREAKDOWN": "Break down expenses income by category spending distribution",
    "INVENTORY_STATUS": "Inventory stock levels low stock out of stock products reorder",
    "TRANSACTION_RECENT": "Show recent latest last transactions purchases sales history",
    "TOP_TRANSACTION": "Biggest largest highest single transaction invoice payment by amount value",
}

# Computed once at import time
_intent_names: list[str] = []
_intent_embeddings: np.ndarray | None = None


def _build_index() -> None:
    global _intent_names, _intent_embeddings
    model = get_model()
    _intent_names = list(_INTENT_DESCRIPTIONS.keys())
    descriptions = list(_INTENT_DESCRIPTIONS.values())
    embs = model.encode(descriptions, normalize_embeddings=True)
    _intent_embeddings = np.array(embs)


def route(query: str) -> tuple[str, float]:
    """Return (intent_name, confidence) for the given query string."""
    global _intent_embeddings
    if _intent_embeddings is None:
        _build_index()

    model = get_model()
    q_emb = model.encode([query], normalize_embeddings=True)[0]  # shape (384,)

    scores = _intent_embeddings @ q_emb  # cosine similarity (embeddings are L2-normed)
    best_idx = int(np.argmax(scores))
    best_score = float(scores[best_idx])

    if best_score < CONFIDENCE_THRESHOLD:
        return "UNKNOWN", best_score

    return _intent_names[best_idx], best_score
