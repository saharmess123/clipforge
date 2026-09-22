from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


def create_clips_archive(
    export_paths: list[Path],
    archive_path: Path,
) -> None:
    """Create a ZIP archive containing the rendered clip files."""

    if not export_paths:
        raise ValueError("There are no exported clips to add to an archive.")

    archive_path.parent.mkdir(parents=True, exist_ok=True)

    with ZipFile(archive_path, "w", compression=ZIP_DEFLATED) as archive:
        for export_path in export_paths:
            if not export_path.exists():
                raise ValueError(
                    f"Export file does not exist: {export_path.name}"
                )

            archive.write(export_path, arcname=export_path.name)