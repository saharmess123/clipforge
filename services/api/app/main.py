from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ClipForge API", version="0.1.0")

PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOADS_DIR = PROJECT_ROOT / "data" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv"}
MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500 MB
CHUNK_SIZE = 1024 * 1024  # 1 MB

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
                    output_file.close()
                    destination.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Video must be 500 MB or smaller.",
                    )

                output_file.write(chunk)
    except HTTPException:
        raise
    except Exception as error:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the uploaded video.",
        ) from error
    finally:
        await video.close()

    return {
        "job_id": job_id,
        "original_filename": original_name,
        "stored_filename": saved_filename,
        "size_bytes": bytes_written,
        "status": "uploaded",
    }