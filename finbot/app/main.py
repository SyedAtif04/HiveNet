from fastapi import FastAPI
from app.database import engine
from app.models import Base
from app.routes import transactions
from app.routes import summary
from app.routes import ocr



app = FastAPI()


app.include_router(transactions.router)


Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "FinBot running"}

app.include_router(summary.router)

app.include_router(ocr.router)