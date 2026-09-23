from pathlib import Path

import cv2


SAMPLE_INTERVAL_SECONDS = 0.5
MAX_TRACK_POINTS = 80
MIN_FACE_SIZE = (40, 40)

MIN_MOTION_AREA_RATIO = 0.0025
MAX_GLOBAL_MOTION_RATIO = 0.65

SMOOTHING_ALPHA = 0.35


def _load_face_detector():
    haarcascades_dir = getattr(
        getattr(cv2, "data", None),
        "haarcascades",
        None,
    )

    if not haarcascades_dir:
        return None

    cascade_path = (
        Path(haarcascades_dir)
        / "haarcascade_frontalface_default.xml"
    )

    if not cascade_path.exists():
        return None

    detector = cv2.CascadeClassifier(str(cascade_path))

    if detector.empty():
        return None

    return detector


def _face_center_x(
    grayscale,
    frame_width: float,
    detector,
) -> float | None:
    if detector is None:
        return None

    faces = detector.detectMultiScale(
        grayscale,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=MIN_FACE_SIZE,
    )

    if len(faces) == 0:
        return None

    largest_face = max(
        faces,
        key=lambda face: face[2] * face[3],
    )

    x, _, width, _ = largest_face

    return (x + width / 2) / frame_width


def _motion_center_x(
    previous_grayscale,
    grayscale,
    frame_width: float,
    frame_height: float,
) -> float | None:
    if previous_grayscale is None:
        return None

    difference = cv2.absdiff(
        previous_grayscale,
        grayscale,
    )

    difference = cv2.GaussianBlur(
        difference,
        (5, 5),
        0,
    )

    _, motion_mask = cv2.threshold(
        difference,
        25,
        255,
        cv2.THRESH_BINARY,
    )

    kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (5, 5),
    )

    motion_mask = cv2.morphologyEx(
        motion_mask,
        cv2.MORPH_CLOSE,
        kernel,
        iterations=2,
    )

    motion_mask = cv2.dilate(
        motion_mask,
        kernel,
        iterations=2,
    )

    contour_result = cv2.findContours(
        motion_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    contours = contour_result[-2]

    frame_area = frame_width * frame_height
    min_motion_area = (
        frame_area * MIN_MOTION_AREA_RATIO
    )

    candidates = [
        contour
        for contour in contours
        if cv2.contourArea(contour)
        >= min_motion_area
    ]

    if not candidates:
        return None

    largest_contour = max(
        candidates,
        key=cv2.contourArea,
    )

    x, _, width, height = cv2.boundingRect(
        largest_contour
    )

    # If almost the entire frame changed, it is probably
    # camera motion rather than one subject.
    if (
        (width * height) / frame_area
        >= MAX_GLOBAL_MOTION_RATIO
    ):
        return None

    return (x + width / 2) / frame_width


def find_subject_track(
    video_path: Path,
    start_seconds: float,
    end_seconds: float,
) -> list[tuple[float, float]]:
    """
    Return tracking points as:

        (relative_time_seconds, horizontal_center_ratio)

    Human faces are preferred.

    If no face is visible, motion detection is used as a
    lightweight key-element tracker.

    Positions are smoothed to avoid a shaky crop.
    """

    duration_seconds = (
        end_seconds - start_seconds
    )

    if duration_seconds <= 0:
        raise ValueError(
            "Clip end time must be greater than its start time."
        )

    capture = cv2.VideoCapture(
        str(video_path)
    )

    if not capture.isOpened():
        return [
            (0.0, 0.5),
            (duration_seconds, 0.5),
        ]

    frames_per_second = (
        capture.get(cv2.CAP_PROP_FPS)
        or 30.0
    )

    frame_width = capture.get(
        cv2.CAP_PROP_FRAME_WIDTH
    )

    frame_height = capture.get(
        cv2.CAP_PROP_FRAME_HEIGHT
    )

    if (
        frame_width <= 0
        or frame_height <= 0
    ):
        capture.release()

        return [
            (0.0, 0.5),
            (duration_seconds, 0.5),
        ]

    detector = _load_face_detector()

    sample_interval = max(
        SAMPLE_INTERVAL_SECONDS,
        duration_seconds / MAX_TRACK_POINTS,
    )

    frame_step = max(
        1,
        int(
            round(
                frames_per_second
                * sample_interval
            )
        ),
    )

    start_frame = max(
        0,
        int(
            start_seconds
            * frames_per_second
        ),
    )

    end_frame = max(
        start_frame,
        int(
            end_seconds
            * frames_per_second
        ),
    )

    capture.set(
        cv2.CAP_PROP_POS_FRAMES,
        start_frame,
    )

    tracking_points: list[
        tuple[float, float]
    ] = []

    previous_grayscale = None
    last_center = 0.5

    frame_number = start_frame
    next_sample_frame = start_frame

    try:
        while frame_number <= end_frame:
            success, frame = capture.read()

            if not success:
                break

            if frame_number >= next_sample_frame:
                grayscale = cv2.cvtColor(
                    frame,
                    cv2.COLOR_BGR2GRAY,
                )

                face_center = _face_center_x(
                    grayscale,
                    frame_width,
                    detector,
                )

                if face_center is not None:
                    detected_center = face_center

                else:
                    motion_center = (
                        _motion_center_x(
                            previous_grayscale,
                            grayscale,
                            frame_width,
                            frame_height,
                        )
                    )

                    detected_center = (
                        motion_center
                        if motion_center is not None
                        else last_center
                    )

                detected_center = min(
                    1.0,
                    max(
                        0.0,
                        detected_center,
                    ),
                )

                relative_time = min(
                    duration_seconds,
                    max(
                        0.0,
                        (
                            frame_number
                            - start_frame
                        )
                        / frames_per_second,
                    ),
                )

                tracking_points.append(
                    (
                        relative_time,
                        detected_center,
                    )
                )

                last_center = detected_center
                previous_grayscale = grayscale

                next_sample_frame += (
                    frame_step
                )

            frame_number += 1

    finally:
        capture.release()

    if not tracking_points:
        return [
            (0.0, 0.5),
            (duration_seconds, 0.5),
        ]

    smoothed_points: list[
        tuple[float, float]
    ] = []

    smoothed_center = (
        tracking_points[0][1]
    )

    for timestamp, center in tracking_points:

        smoothed_center = (
            SMOOTHING_ALPHA * center
            + (
                1.0 - SMOOTHING_ALPHA
            )
            * smoothed_center
        )

        smoothed_points.append(
            (
                round(timestamp, 3),
                round(smoothed_center, 4),
            )
        )

    if smoothed_points[0][0] > 0:
        smoothed_points.insert(
            0,
            (
                0.0,
                smoothed_points[0][1],
            ),
        )

    if (
        smoothed_points[-1][0]
        < duration_seconds
    ):
        smoothed_points.append(
            (
                round(
                    duration_seconds,
                    3,
                ),
                smoothed_points[-1][1],
            )
        )

    return smoothed_points