"""Chat session management — create, load history, save turns."""

import sys
from pathlib import Path
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session as DBSession

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from core.models import ChatSession, ChatMessage

HISTORY_LIMIT = 6
SESSION_TTL_HOURS = 24


def get_or_create_session(session_id: str | None, bot: str, db: DBSession) -> str:
    """Return an existing session UUID or create a new one."""
    if session_id:
        session = db.query(ChatSession).filter_by(id=session_id, bot=bot).first()
        if session:
            return str(session.id)
    new_session = ChatSession(bot=bot)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return str(new_session.id)


def load_history(session_id: str, db: DBSession, limit: int = HISTORY_LIMIT) -> list[dict]:
    """Return the last `limit` messages for a session, oldest first.

    Returns empty list if session has been inactive longer than SESSION_TTL_HOURS.
    """
    session = db.query(ChatSession).filter_by(id=session_id).first()
    if not session:
        return []
    cutoff = datetime.utcnow() - timedelta(hours=SESSION_TTL_HOURS)
    if session.last_active < cutoff:
        return []

    rows = (
        db.query(ChatMessage)
        .filter_by(session_id=session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {"role": m.role, "content": m.content, "intent": m.intent}
        for m in reversed(rows)
    ]


def get_last_intent(session_id: str, db: DBSession) -> str | None:
    """Return the intent from the most recent assistant turn, or None."""
    row = (
        db.query(ChatMessage)
        .filter_by(session_id=session_id, role="assistant")
        .order_by(ChatMessage.created_at.desc())
        .first()
    )
    return row.intent if row else None


def save_turn(
    session_id: str,
    user_query: str,
    assistant_response: str,
    intent: str,
    db: DBSession,
) -> None:
    """Persist a user + assistant message pair and update last_active."""
    db.add(ChatMessage(session_id=session_id, role="user", content=user_query))
    db.add(ChatMessage(session_id=session_id, role="assistant", content=assistant_response, intent=intent))
    db.query(ChatSession).filter_by(id=session_id).update({"last_active": datetime.utcnow()})
    db.commit()
