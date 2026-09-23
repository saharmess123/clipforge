import subprocess
from pathlib import Path

from app.services.subject_tracker import (
    find_subject_track,
)


def _build_tracking_expression(
    tracking_points: list[
        tuple[float, float]
    ],
) -> str:
    """
    Build an FFmpeg expression that smoothly moves
    the crop between detected subject positions.
    """

    if not tracking_points:
        return "0.5"

    if len(tracking_points) == 1:
        return (
            f"{tracking_points[0][1]:.4f}"
        )

    expression = (
        f"{tracking_points[-1][1]:.4f}"
    )

    for index in range(
        len(tracking_points) - 2,
        -1,
        -1,
    ):
        time_0, center_0 = (
            tracking_points[index]
        )

        time_1, center_1 = (
            tracking_points[index + 1]
        )

        span = max(
            0.001,
            time_1 - time_0,
        )

        center_delta = (
            center_1 - center_0
        )

        interpolated = (
            f"({center_0:.4f}"
            f"+({center_delta:.4f})"
            f"*(t-{time_0:.3f})"
            f"/{span:.3f})"
        )

        expression = (
            f"if("
            f"lt(t\\,{time_1:.3f})\\,"
            f"{interpolated}\\,"
            f"{expression}"
            f")"
        )

    return expression


def render_vertical_clip(
    input_path: Path,
    output_path: Path,
    start_seconds: float,
    end_seconds: float,
) -> None:

    duration_seconds = (
        end_seconds - start_seconds
    )

    if duration_seconds <= 0:
        raise ValueError(
            "Clip end time must be greater than its start time."
        )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    tracking_points = find_subject_track(
        input_path,
        start_seconds,
        end_seconds,
    )

    subject_expression = (
        _build_tracking_expression(
            tracking_points
        )
    )
    
    crop_x_expression = (
        "max(0\\,"
        "min(iw-ow\\,"
        f"(({subject_expression})*iw)"
        "-(ow/2)"
        "))"
    )

    video_filter = (
        "setpts=PTS-STARTPTS,"
        "crop="
        "trunc(ih*9/16/2)*2:"
        "ih:"
        f"{crop_x_expression}:"
        "0,"
        "scale="
        "1080:1920:"
        "flags=lanczos,"
        "setsar=1"
    )

    command = [
        "ffmpeg",
        "-y",

        "-ss",
        str(start_seconds),

        "-i",
        str(input_path),

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
        raise RuntimeError(
            "FFmpeg is not installed or is not on PATH."
        ) from error

    except subprocess.TimeoutExpired as error:

        output_path.unlink(
            missing_ok=True
        )

        raise RuntimeError(
            "Video rendering timed out."
        ) from error

    if result.returncode != 0:

        output_path.unlink(
            missing_ok=True
        )

        error_message = (
            result.stderr
            .strip()[-2000:]
        )

        raise RuntimeError(
            "FFmpeg could not render "
            "the vertical clip.\n"
            f"{error_message}"
        )