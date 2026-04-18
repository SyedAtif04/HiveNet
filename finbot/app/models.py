import uuid
from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String, nullable=False)  # income / expense
    amount = Column(Float, nullable=False)
    category = Column(String)
    description = Column(String)
    date = Column(DateTime, default=datetime.utcnow)