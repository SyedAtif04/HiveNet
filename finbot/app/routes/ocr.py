from fastapi import APIRouter, UploadFile, File
import pytesseract
from PIL import Image
import io
from app.services.ocr_parser import parse_bill_text

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

router = APIRouter()

@router.post("/ocr")
async def extract_text(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    text = pytesseract.image_to_string(image)

    parsed = parse_bill_text(text)   # ✅ CALL PARSER

    return {
        "text": text,
        "parsed": parsed   # ✅ RETURN PARSED DATA
    }