from pydantic import BaseModel
from typing import Optional


class TransactionCreate(BaseModel):
    type: str
    amount: float
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None  