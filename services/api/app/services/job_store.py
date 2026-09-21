import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[4]
JOBS_DIR = PROJECT_ROOT / "data" / "jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)


def create_job(job: dict) -> None:
    job_path = JOBS_DIR / f"{job['job_id']}.json"
    job_path.write_text(json.dumps(job, indent=2), encoding="utf-8")


def get_job(job_id: str) -> dict | None:
    job_path = JOBS_DIR / f"{job_id}.json"

    if not job_path.exists():
        return None

    return json.loads(job_path.read_text(encoding="utf-8"))


def save_job(job: dict) -> None:
    create_job(job)