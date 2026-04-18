from fastapi import FastAPI
from app.database import engine
from app.models import Base
from app.routes import transactions

# 1. Create app FIRST
app = FastAPI()

# 2. Register routes
app.include_router(transactions.router)

# 3. Create tables
Base.metadata.create_all(bind=engine)

# 4. Root route
@app.get("/")
def root():
    return {"message": "FinBot running"}