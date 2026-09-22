import subprocess
from pathlib import Path


def render_vertical_clip(
    input_path: Path,
    output_path: Path,
    start_seconds: float,
    end_seconds: float,
) -> None:
    duration_seconds = end_seconds - start_seconds

    if duration_seconds <= 0:
        raise ValueError("Clip end time must be greater than its start time.")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    video_filter = (
        "crop=trunc(ih*9/16/2)*2:ih:(iw-ow)/2:0,"
        "scale=1080:1920:flags=lanczos,"
        "setsar=1"
    )

    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-ss",
        str(start_seconds),
        "-t",
        str(duration_seconds),
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-vf",
        video_filter,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        str(output_path),
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False,
            timeout=300,
        )
    except FileNotFoundError as error:
        raise RuntimeError("FFmpeg is not installed or is not on PATH.") from error
    except subprocess.TimeoutExpired as error:
        output_path.unlink(missing_ok=True)
        raise RuntimeError("Video rendering timed out.") from error

    if result.returncode != 0:
        output_path.unlink(missing_ok=True)
        raise RuntimeError("FFmpeg could not render the vertical clip.")