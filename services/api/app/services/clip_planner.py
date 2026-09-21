DEFAULT_CLIP_LENGTH_SECONDS = 30
MIN_CLIP_LENGTH_SECONDS = 5


def suggest_clips(
    duration_seconds: float,
    clip_length_seconds: int = DEFAULT_CLIP_LENGTH_SECONDS,
) -> list[dict]:
    if clip_length_seconds < MIN_CLIP_LENGTH_SECONDS:
        raise ValueError(
            f"Clip length must be at least {MIN_CLIP_LENGTH_SECONDS} seconds."
        )

    clips = []
    start_seconds = 0.0
    clip_number = 1

    while start_seconds < duration_seconds:
        end_seconds = min(
            start_seconds + clip_length_seconds,
            duration_seconds,
        )
        clip_duration = end_seconds - start_seconds

        if clip_duration < MIN_CLIP_LENGTH_SECONDS and clips:
            clips[-1]["end_seconds"] = round(end_seconds, 2)
            clips[-1]["duration_seconds"] = round(
                end_seconds - clips[-1]["start_seconds"],
                2,
            )
            break

        clips.append(
            {
                "clip_id": f"clip-{clip_number}",
                "start_seconds": round(start_seconds, 2),
                "end_seconds": round(end_seconds, 2),
                "duration_seconds": round(clip_duration, 2),
                "status": "draft",
            }
        )

        start_seconds = end_seconds
        clip_number += 1

    return clips