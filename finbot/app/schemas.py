from pydantic import BaseModel
from typing import Optional


class ItemCreate(BaseModel):
    product_name: str
    quantity: int
    price: float

class TransactionCreate(BaseModel):
    type: str
    category: str
    description: str
    amount: float
    date: str
    items: list[ItemCreate]

