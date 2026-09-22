from pathlib import Path

import cv2


SAMPLE_INTERVAL_SECONDS = 0.5
MIN_FACE_SIZE = (40, 40)


def find_subject_center_x(video_path: Path) -> float:
    """Return a preferred horizontal subject center as a 0–1 ratio.

    Falls back to the center of the video when face detection is unavailable
    or when no face is detected.
    """

    haarcascades_dir = getattr(getattr(cv2, "data", None), "haarcascades", None)

    if not haarcascades_dir:
        return 0.5

    cascade_path = (
        Path(haarcascades_dir) / "haarcascade_frontalface_default.xml"
    )

    if not cascade_path.exists():
        return 0.5

    face_detector = cv2.CascadeClassifier(str(cascade_path))

    if face_detector.empty():
        return 0.5

    capture = cv2.VideoCapture(str(video_path))

    if not capture.isOpened():
        return 0.5

    frames_per_second = capture.get(cv2.CAP_PROP_FPS) or 30
    frame_width = capture.get(cv2.CAP_PROP_FRAME_WIDTH)

    if frame_width <= 0:
        capture.release()
        return 0.5

    frame_step = max(1, int(frames_per_second * SAMPLE_INTERVAL_SECONDS))
    detected_centers: list[float] = []
    frame_number = 0

    try:
        while True:
            success, frame = capture.read()

            if not success:
                break

            if frame_number % frame_step == 0:
                grayscale = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_detector.detectMultiScale(
                    grayscale,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=MIN_FACE_SIZE,
                )

                if len(faces) > 0:
                    largest_face = max(faces, key=lambda face: face[2] * face[3])
                    x, _, width, _ = largest_face
                    detected_centers.append((x + width / 2) / frame_width)

            frame_number += 1
    finally:
        capture.release()

    if not detected_centers:
        return 0.5

    return round(sum(detected_centers) / len(detected_centers), 4)