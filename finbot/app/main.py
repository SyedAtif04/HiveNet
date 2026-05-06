from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import Base
from app.routes import transactions
from app.routes import summary
from app.routes import ocr


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(transactions.router)


Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "FinBot running"}

app.include_router(summary.router)

app.include_router(ocr.router)