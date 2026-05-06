"""spaCy NLP service for FinBot.

Provides entity extraction (dates, quantities, product-like nouns) and
follow-up detection from user queries. Loaded once at import time.

Setup (run once in finbot venv):
    python -m spacy download en_core_web_sm
"""

import re
import difflib
from dataclasses import dataclass, field

_nlp = None

_MONTH_NAMES = {
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
}

_FOLLOWUP_PRONOUNS = {"it", "that", "this", "those", "them", "they", "same"}


@dataclass
class QueryParseResult:
    entities: list[str] = field(default_factory=list)   # noun-chunk / product-like strings
    dates: list[str] = field(default_factory=list)       # e.g. ["March", "Q1 2026"]
    quantities: list[float] = field(default_factory=list)
    is_followup: bool = False


def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
        except (ImportError, OSError):
            _nlp = None  # spaCy not installed or model not downloaded; graceful degradation
    return _nlp


def _extract_dates_regex(text: str) -> list[str]:
    """Regex-based date extraction as fallback when spaCy isn't available."""
    dates = []
    month_re = re.compile(
        r"\b(january|february|march|april|may|june|july|august|september|october|"
        r"november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec"
        r"|q[1-4])(?:\s+\d{4})?\b",
        re.I,
    )
    for m in month_re.finditer(text):
        dates.append(m.group(0))
    return dates


def parse_query(text: str) -> QueryParseResult:
    """Parse a user query and return structured entities, dates, quantities, and follow-up flag."""
    result = QueryParseResult()
    nlp = _get_nlp()

    if nlp is None:
        # Graceful degradation: regex-only date extraction
        result.dates = _extract_dates_regex(text)
        words = text.lower().split()
        result.is_followup = (
            len(words) <= 8
            and bool(_FOLLOWUP_PRONOUNS.intersection(words[:3]))
        )
        return result

    doc = nlp(text)

    # Named entities
    for ent in doc.ents:
        if ent.label_ in {"PRODUCT", "ORG", "PERSON", "GPE", "NORP", "FAC", "WORK_OF_ART"}:
            result.entities.append(ent.text)
        elif ent.label_ == "DATE":
            result.dates.append(ent.text)
        elif ent.label_ == "CARDINAL":
            try:
                result.quantities.append(float(ent.text.replace(",", "")))
            except ValueError:
                pass

    # Noun chunks that look like product names (multi-token, title-case-ish)
    for chunk in doc.noun_chunks:
        if len(chunk) > 1:
            chunk_text = chunk.text
            # Accept if it has any proper-noun or title-cased token
            if any(t.pos_ == "PROPN" or t.text[0].isupper() for t in chunk if t.text.isalpha()):
                if chunk_text not in result.entities:
                    result.entities.append(chunk_text)

    # Regex date fallback for any dates spaCy missed
    regex_dates = _extract_dates_regex(text)
    for d in regex_dates:
        if not any(d.lower() in existing.lower() for existing in result.dates):
            result.dates.append(d)

    # Follow-up detection: short pronoun-led queries
    words = [t.text.lower() for t in doc]
    result.is_followup = (
        len(words) <= 8
        and bool(_FOLLOWUP_PRONOUNS.intersection(words[:3]))
    )

    return result


def fuzzy_match_entity(entity: str, known_names: list[str], threshold: float = 0.75) -> str | None:
    """Return the best-matching known name for `entity`, or None if below threshold."""
    if not known_names:
        return None
    entity_lower = entity.lower()
    best_match = None
    best_ratio = 0.0
    for name in known_names:
        ratio = difflib.SequenceMatcher(None, entity_lower, name.lower()).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = name
    return best_match if best_ratio >= threshold else None
