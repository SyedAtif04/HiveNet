import uuid
from sqlalchemy import Column, String, Float, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from datetime import datetime
from app.database import Base
from pgvector.sqlalchemy import Vector


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String, nullable=False)  # income / expense
    amount = Column(Float, nullable=False)
    category = Column(String)
    description = Column(String)
    date = Column(DateTime, default=datetime.utcnow)

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text, nullable=False)
    source = Column(String)  # finance / hr / logistics
    embedding = Column(Vector(384))