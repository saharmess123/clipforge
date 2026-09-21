from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from app.services.clip_planner import suggest_clips
from app.services.job_store import create_job, get_job, save_job
from app.services.media import inspect_video

app = FastAPI(title="ClipForge API", version="0.1.0")

PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOADS_DIR = PROJECT_ROOT / "data" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv"}
MAX_UPLOAD_BYTES = 500 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024
EXPECTED_ASPECT_RATIO = 16 / 9
ASPECT_RATIO_TOLERANCE = 0.03

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/jobs/upload", status_code=status.HTTP_201_CREATED)
async def upload_video(video: UploadFile = File(...)):
    original_name = video.filename or ""
    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .mp4, .mov, and .mkv video files are allowed.",
        )

    job_id = uuid4().hex
    saved_filename = f"{job_id}{extension}"
    destination = UPLOADS_DIR / saved_filename
    bytes_written = 0

    try:
        with destination.open("wb") as output_file:
            while chunk := await video.read(CHUNK_SIZE):
                bytes_written += len(chunk)

                if bytes_written > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Video must be 500 MB or smaller.",
                    )

                output_file.write(chunk)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except Exception as error:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the uploaded video.",
        ) from error
    finally:
        await video.close()

    try:
        video_metadata = inspect_video(destination)
    except (RuntimeError, ValueError) as error:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error

    actual_aspect_ratio = video_metadata["width"] / video_metadata["height"]

    if abs(actual_aspect_ratio - EXPECTED_ASPECT_RATIO) > ASPECT_RATIO_TOLERANCE:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="ClipForge currently accepts 16:9 horizontal videos only.",
        )

    create_job(
        {
            "job_id": job_id,
            "original_filename": original_name,
            "stored_filename": saved_filename,
            "size_bytes": bytes_written,
            "video": video_metadata,
            "status": "uploaded",
            "clips": [],
        }
    )

    return {
        "job_id": job_id,
        "original_filename": original_name,
        "stored_filename": saved_filename,
        "size_bytes": bytes_written,
        "video": video_metadata,
        "status": "uploaded",
    }


@app.post("/api/jobs/{job_id}/clips/suggest")
def suggest_job_clips(job_id: str, clip_length_seconds: int = 30):
    job = get_job(job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    try:
        clips = suggest_clips(
            duration_seconds=job["video"]["duration_seconds"],
            clip_length_seconds=clip_length_seconds,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error

    job["clips"] = clips
    job["status"] = "clips_suggested"
    save_job(job)

    return job