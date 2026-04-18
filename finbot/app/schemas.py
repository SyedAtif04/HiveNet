from pydantic import BaseModel
from datetime import datetime


class TransactionCreate(BaseModel):
    type: str
    amount: float
    category: str | None = None
    description: str | None = None
    date: datetime | None = None