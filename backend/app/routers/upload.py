from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Job
import uuid, os, shutil
from app.core.config import settings
from app.services.ml_services import run_full_pipeline
from app.auth_deps import get_current_admin

router = APIRouter()

@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    _admin: int = Depends(get_current_admin),
):
    if not file.filename.endswith(".csv"):
        return {"error": "Only CSV files are supported"}

    job_id = str(uuid.uuid4())
    job = Job(id=job_id, status="processing", filename=file.filename)
    db.add(job)
    db.commit()

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = f"{settings.UPLOAD_DIR}/{job_id}_{file.filename}"
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    background_tasks.add_task(run_full_pipeline, job_id, filepath)

    return {
        "job_id":   job_id,
        "status":   "processing",
        "message":  "Dataset uploaded successfully. Pipeline is running."
    }