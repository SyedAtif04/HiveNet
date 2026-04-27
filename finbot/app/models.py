import uuid
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from datetime import datetime
from app.database import Base
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import relationship
import uuid


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String, nullable=False)  # income / expense
    amount = Column(Float, nullable=False)
    category = Column(String)
    description = Column(String)
    date = Column(DateTime, default=datetime.utcnow)
    items = relationship("TransactionItem", backref="transaction")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text, nullable=False)
    source = Column(String)  # finance / hr / logistics
    embedding = Column(Vector(384))

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_name = Column(String, unique=True, nullable=False)
    quantity = Column(Integer, default=0)
    unit_price = Column(Float, nullable=True)

    # logbot optimization fields — written by logbot, readable by finbot
    reorder_point = Column(Float, nullable=True)
    safety_stock = Column(Float, nullable=True)
    eoq = Column(Float, nullable=True)
    warehouse_location = Column(String, nullable=True)
    last_updated = Column(DateTime, nullable=True)

class TransactionItem(Base):
    __tablename__ = "transaction_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"))
    product_name = Column(String)
    quantity = Column(Integer)
    price = Column(Float)