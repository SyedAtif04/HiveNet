"""SQLAlchemy engine connected to the shared Neon PostgreSQL database."""

import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Load .env from logbot root
load_dotenv(Path(__file__).parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set. Check logbot/.env")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_inventory():
    """
    Safely add logbot's optimization columns to the shared inventory table.
    Uses ADD COLUMN IF NOT EXISTS — safe to run on every startup.
    """
    new_columns = [
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_point FLOAT",
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS safety_stock FLOAT",
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS eoq FLOAT",
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_location VARCHAR",
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP",
    ]
    with engine.begin() as conn:
        for stmt in new_columns:
            conn.execute(text(stmt))


def init_db():
    """Create logbot-only tables and extend the shared inventory table."""
    from core import models  # noqa: F401 — registers all ORM classes
    Base.metadata.create_all(bind=engine)
    migrate_inventory()
