from fastapi import FastAPI, UploadFile, File, Form, HTTPException
import shutil
import os
from extractor import analyze_blood_report, analyze_xray_image

app = FastAPI(title="MEDIkiosk-AI Multimodal Medical Engine")
TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.post("/analyze")
async def analyze_document(
    doc_type: str = Form(...),
    file: UploadFile = File(...)
):
    temp_path = os.path.join(TEMP_DIR, file.filename)
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        if doc_type == "X_RAY":
            result = analyze_xray_image(temp_path)
            return {"type": "X_RAY", "data": result}
        else:
            result = analyze_blood_report(temp_path)
            return {"type": "BLOOD_REPORT", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)