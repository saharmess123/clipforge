from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.schemas import ClipUpdate
from app.services.archive import create_clips_archive
from app.services.clip_planner import MIN_CLIP_LENGTH_SECONDS, suggest_clips
from app.services.job_store import create_job, get_job, save_job
from app.services.media import inspect_video
from app.services.renderer import render_vertical_clip

app = FastAPI(title="ClipForge API", version="0.1.0")

PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOADS_DIR = PROJECT_ROOT / "data" / "uploads"
EXPORTS_DIR = PROJECT_ROOT / "data" / "exports"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv"}
MAX_UPLOAD_BYTES = 500 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024
EXPECTED_ASPECT_RATIO = 16 / 9
ASPECT_RATIO_TOLERANCE = 0.03

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)


def get_required_job(job_id: str) -> dict:
    job = get_job(job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    return job


def get_required_clip(job: dict, clip_id: str) -> dict:
    clip = next(
        (saved_clip for saved_clip in job["clips"] if saved_clip["clip_id"] == clip_id),
        None,
    )

    if clip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clip not found.",
        )

    return clip


def get_input_path(job: dict) -> Path:
    input_path = UPLOADS_DIR / job["stored_filename"]

    if not input_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The uploaded source video could not be found.",
        )

    return input_path


def get_export_path(job_id: str, clip_id: str) -> Path:
    return EXPORTS_DIR / job_id / f"{clip_id}.mp4"


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

    job = {
        "job_id": job_id,
        "original_filename": original_name,
        "stored_filename": saved_filename,
        "size_bytes": bytes_written,
        "video": video_metadata,
        "status": "uploaded",
        "clips": [],
    }

    create_job(job)

    return job


@app.post("/api/jobs/{job_id}/clips/suggest")
def suggest_job_clips(job_id: str, clip_length_seconds: int = 30):
    job = get_required_job(job_id)

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


@app.patch("/api/jobs/{job_id}/clips/{clip_id}")
def update_clip_timing(
    job_id: str,
    clip_id: str,
    update: ClipUpdate,
):
    job = get_required_job(job_id)
    clip = get_required_clip(job, clip_id)

    video_duration = job["video"]["duration_seconds"]

    if update.end_seconds > video_duration:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Clip end time cannot be after the source video duration.",
        )

    clip_duration = update.end_seconds - update.start_seconds

    if clip_duration < MIN_CLIP_LENGTH_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Clips must be at least {MIN_CLIP_LENGTH_SECONDS} seconds long."
            ),
        )

    clip["start_seconds"] = round(update.start_seconds, 2)
    clip["end_seconds"] = round(update.end_seconds, 2)
    clip["duration_seconds"] = round(clip_duration, 2)
    clip["status"] = "draft"
    clip.pop("export_filename", None)

    save_job(job)

    return clip


@app.post("/api/jobs/{job_id}/clips/{clip_id}/export")
def export_clip(job_id: str, clip_id: str):
    job = get_required_job(job_id)
    clip = get_required_clip(job, clip_id)
    input_path = get_input_path(job)
    output_path = get_export_path(job_id, clip_id)

    try:
        render_vertical_clip(
            input_path=input_path,
            output_path=output_path,
            start_seconds=clip["start_seconds"],
            end_seconds=clip["end_seconds"],
        )
    except (RuntimeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error

    clip["status"] = "exported"
    clip["export_filename"] = output_path.name
    job["status"] = "exported"
    save_job(job)

    return {
        "clip": clip,
        "download_url": f"/api/jobs/{job_id}/clips/{clip_id}/download",
    }


@app.get("/api/jobs/{job_id}/clips/{clip_id}/download")
def download_clip(job_id: str, clip_id: str):
    job = get_required_job(job_id)
    clip = get_required_clip(job, clip_id)
    export_filename = clip.get("export_filename")

    if not export_filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This clip has not been exported yet.",
        )

    output_path = EXPORTS_DIR / job_id / export_filename

    if not output_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The exported clip file could not be found.",
        )

    return FileResponse(
        path=output_path,
        media_type="video/mp4",
        filename=output_path.name,
    )


@app.post("/api/jobs/{job_id}/export")
def export_all_clips(job_id: str):
    job = get_required_job(job_id)

    if not job["clips"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Generate clip suggestions before exporting.",
        )

    input_path = get_input_path(job)
    exported_paths: list[Path] = []

    try:
        for clip in job["clips"]:
            output_path = get_export_path(job_id, clip["clip_id"])

            render_vertical_clip(
                input_path=input_path,
                output_path=output_path,
                start_seconds=clip["start_seconds"],
                end_seconds=clip["end_seconds"],
            )

            clip["status"] = "exported"
            clip["export_filename"] = output_path.name
            exported_paths.append(output_path)

        archive_path = EXPORTS_DIR / job_id / f"{job_id}-clips.zip"
        create_clips_archive(exported_paths, archive_path)
    except (RuntimeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error

    job["status"] = "exported"
    job["archive_filename"] = archive_path.name
    save_job(job)

    return {
        "job_id": job_id,
        "clip_count": len(exported_paths),
        "download_url": f"/api/jobs/{job_id}/download",
    }


@app.get("/api/jobs/{job_id}/download")
def download_all_clips(job_id: str):
    job = get_required_job(job_id)
    archive_filename = job.get("archive_filename")

    if not archive_filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ZIP archive has been created for this job yet.",
        )

    archive_path = EXPORTS_DIR / job_id / archive_filename

    if not archive_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The ZIP archive could not be found.",
        )

    return FileResponse(
        path=archive_path,
        media_type="application/zip",
        filename=archive_path.name,
    )