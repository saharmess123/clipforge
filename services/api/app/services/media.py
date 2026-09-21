import json
import subprocess
from pathlib import Path


def inspect_video(video_path: Path) -> dict[str, float | int]:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height:format=duration",
        "-of",
        "json",
        str(video_path),
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False,
            timeout=15,
        )
    except FileNotFoundError as error:
        raise RuntimeError("FFprobe is not installed or is not on PATH.") from error
    except subprocess.TimeoutExpired as error:
        raise ValueError("Video inspection timed out.") from error

    if result.returncode != 0:
        raise ValueError("The uploaded file is not a valid video.")

    payload = json.loads(result.stdout)
    streams = payload.get("streams", [])

    if not streams:
        raise ValueError("The uploaded file has no video stream.")

    stream = streams[0]
    width = int(stream["width"])
    height = int(stream["height"])
    duration = float(payload["format"].get("duration", 0))

    return {
        "width": width,
        "height": height,
        "duration_seconds": round(duration, 2),
    }