from pathlib import Path
from urllib.parse import urlparse

import yt_dlp


ALLOWED_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.youtu.be",
}


def validate_youtube_url(source_url: str) -> None:
    parsed_url = urlparse(source_url)

    if parsed_url.scheme not in {"http", "https"}:
        raise ValueError("Use a complete http or https YouTube URL.")

    hostname = (parsed_url.hostname or "").lower()

    if hostname not in ALLOWED_HOSTS:
        raise ValueError("Only YouTube URLs are supported.")


def download_youtube_video(source_url: str, download_directory: Path) -> dict:
    """Download one public YouTube video and return its local file details."""

    validate_youtube_url(source_url)
    download_directory.mkdir(parents=True, exist_ok=True)

    options = {
        "format": "bv*[height<=720]+ba/b[height<=720]/b",
        "merge_output_format": "mp4",
        "outtmpl": str(download_directory / "%(id)s.%(ext)s"),
        "noplaylist": True,
        "restrictfilenames": True,
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 30,
        "max_filesize": 500 * 1024 * 1024,

        # Required by modern YouTube extraction.
        "js_runtimes": {
            "node": {},
        },
    }

    try:
        with yt_dlp.YoutubeDL(options) as downloader:
            video_info = downloader.extract_info(
                source_url,
                download=True,
            )
    except yt_dlp.utils.DownloadError as error:
        raise ValueError(
            "Could not download this YouTube video. "
            "Check that it is public and available in your region."
        ) from error

    video_id = video_info.get("id")

    if not video_id:
        raise ValueError(
            "Could not identify the downloaded YouTube video."
        )

    downloaded_files = sorted(
        download_directory.glob(f"{video_id}.*"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )

    video_path = next(
        (
            path
            for path in downloaded_files
            if path.suffix.lower()
            in {".mp4", ".mov", ".mkv", ".webm"}
        ),
        None,
    )

    if video_path is None:
        raise ValueError(
            "The YouTube download did not create a video file."
        )

    return {
        "video_path": video_path,
        "title": video_info.get("title") or "YouTube video",
        "source_url": source_url,
    }