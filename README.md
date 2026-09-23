# ClipForge

ClipForge is a local full-stack video clipping application that transforms long-form horizontal videos into editable vertical clips for Shorts, Reels, and TikTok.

It supports both local video uploads and public YouTube URLs, automatically suggests clip segments, lets users manually adjust clip timing, performs subject-aware vertical reframing, and exports individual MP4 clips or all clips together as a ZIP archive.

## Features

- Upload local MP4, MOV, or MKV videos
- Import public YouTube videos
- Validate source video resolution and duration
- Automatically generate clip suggestions
- Manually adjust clip start and end times
- Convert 16:9 footage to 9:16 vertical video
- Subject-aware reframing using OpenCV
- FFmpeg-based rendering
- Export individual clips as MP4
- Export all clips as a ZIP archive
- Responsive light/dark user interface
- Local processing with free and open-source tools

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

### Backend

- Python 3.11
- FastAPI
- OpenCV
- MediaPipe
- FFmpeg
- yt-dlp

## Project Structure

```text
clipforge/
â”œâ”€â”€ apps/
â”‚   â””â”€â”€ web/
â”‚       â”œâ”€â”€ public/
â”‚       â”‚   â””â”€â”€ clipforge-hero.png
â”‚       â””â”€â”€ src/
â”‚           â””â”€â”€ app/
â”‚               â””â”€â”€ page.tsx
â”‚
â”œâ”€â”€ services/
â”‚   â””â”€â”€ api/
â”‚       â”œâ”€â”€ app/
â”‚       â”‚   â”œâ”€â”€ services/
â”‚       â”‚   â”‚   â”œâ”€â”€ archive.py
â”‚       â”‚   â”‚   â”œâ”€â”€ clip_planner.py
â”‚       â”‚   â”‚   â”œâ”€â”€ job_store.py
â”‚       â”‚   â”‚   â”œâ”€â”€ media.py
â”‚       â”‚   â”‚   â”œâ”€â”€ renderer.py
â”‚       â”‚   â”‚   â”œâ”€â”€ subject_tracker.py
â”‚       â”‚   â”‚   â””â”€â”€ youtube.py
â”‚       â”‚   â”œâ”€â”€ main.py
â”‚       â”‚   â””â”€â”€ schemas.py
â”‚       â””â”€â”€ requirements.txt
â”‚
â”œâ”€â”€ data/
â”œâ”€â”€ .gitignore
â””â”€â”€ README.md
```

## Requirements

Before running ClipForge, install:

- Python 3.11+
- Node.js
- npm
- FFmpeg
- Git

FFmpeg must be available from the system PATH.

Verify FFmpeg:

```bash
ffmpeg -version
```

Verify Node.js:

```bash
node --version
```

Verify Python:

```bash
python --version
```

On Windows, if Python is not globally available but the virtual environment already exists, you can verify it with:

```powershell
.\services\api\.venv\Scripts\python.exe --version
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/saharmess123/clipforge.git
cd clipforge
```

## Backend Setup

Open a terminal and move to the API directory:

```powershell
cd services/api
```

Create a Python virtual environment:

```powershell
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
python -m pip install -r requirements.txt
```

Start the FastAPI backend:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The backend will run at:

```text
http://127.0.0.1:8000
```

FastAPI interactive documentation is available at:

```text
http://127.0.0.1:8000/docs
```

## Frontend Setup

Open a second terminal from the project root:

```powershell
cd apps/web
```

Install the frontend dependencies:

```powershell
npm install
```

Start the Next.js development server:

```powershell
npm run dev
```

Open ClipForge in your browser:

```text
http://localhost:3000
```

## How to Use

ClipForge supports two ways of adding a source video.

### Option 1 â€” Upload a Local Video

1. Open ClipForge in the browser.
2. Select **Upload file**.
3. Choose an MP4, MOV, or MKV video.
4. Click **Upload video**.
5. Wait for the backend to validate the video.
6. Click **Suggest clips**.

### Option 2 â€” Import from YouTube

1. Select **YouTube URL**.
2. Paste a public YouTube video URL.
3. Click **Import video**.
4. Wait for ClipForge to download and validate the source.
5. Click **Suggest clips**.

## Clip Generation

After a source video is validated, click **Suggest clips**.

ClipForge analyzes the video duration and creates a collection of editable clip segments.

Each generated clip contains:

- Start time
- End time
- Duration
- Current status
- Individual export controls

## Editing Clip Duration

Every suggested clip can be adjusted before export.

Change the **Start** and **End** values and click **Edit timing**.

The backend validates the requested range before saving it.

This allows users to customize the exact duration of each generated clip instead of being limited to automatically suggested timestamps.

## Subject-Aware Vertical Reframing

ClipForge transforms horizontal 16:9 footage into vertical 9:16 video.

Instead of relying entirely on a fixed center crop, the processing pipeline uses OpenCV and subject-tracking information to determine where the important visible subject is located throughout the selected clip.

The tracking data is used by the FFmpeg rendering pipeline to adjust the horizontal crop position while converting the footage to vertical format.

When a reliable subject cannot be detected, ClipForge safely falls back toward centered framing.

The final output is rendered at:

```text
1080 Ã— 1920
```

with a:

```text
9:16
```

aspect ratio.

## Exporting Clips

### Export an Individual Clip

Click **Export** on a generated clip.

ClipForge will:

1. Read the selected start and end timestamps.
2. Analyze the clip for subject positioning.
3. Calculate the vertical crop.
4. Render the result with FFmpeg.
5. Encode the clip as an MP4.
6. Provide the resulting file for download.

### Export All Clips

Click **Export all as ZIP**.

ClipForge renders the generated clips and packages them into a single ZIP archive for download.

Rendering time depends on:

- Source video duration
- Number of generated clips
- Source video resolution
- Available CPU resources
- Available disk space

Long videos can take several minutes to process.

## API Endpoints

### Health Check

```http
GET /health
```

### Upload Video

```http
POST /api/jobs/upload
```

### Import YouTube Video

```http
POST /api/jobs/youtube
```

### Generate Clip Suggestions

```http
POST /api/jobs/{job_id}/clips/suggest
```

### Update Clip Timing

```http
PATCH /api/jobs/{job_id}/clips/{clip_id}
```

### Export Individual Clip

```http
POST /api/jobs/{job_id}/clips/{clip_id}/export
```

### Download Individual Clip

```http
GET /api/jobs/{job_id}/clips/{clip_id}/download
```

### Export All Clips

```http
POST /api/jobs/{job_id}/export
```

### Download ZIP Archive

```http
GET /api/jobs/{job_id}/download
```

## Processing Pipeline

```text
Source Video
     â”‚
     â–¼
Upload or YouTube Import
     â”‚
     â–¼
Video Validation
     â”‚
     â–¼
Clip Suggestions
     â”‚
     â–¼
Manual Timing Adjustment
     â”‚
     â–¼
Subject Detection / Tracking
     â”‚
     â–¼
Dynamic 9:16 Crop Calculation
     â”‚
     â–¼
FFmpeg Rendering
     â”‚
     â–¼
MP4 Export
     â”‚
     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º ZIP Batch Export
```

## Architecture

ClipForge separates the user interface from the video-processing backend.

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚       Next.js Frontend      â”‚
â”‚                             â”‚
â”‚ Upload / YouTube            â”‚
â”‚ Clip Editing                â”‚
â”‚ Export Controls             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
               â”‚
               â”‚ HTTP / REST
               â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚        FastAPI Backend      â”‚
â”‚                             â”‚
â”‚ Job Management              â”‚
â”‚ Video Validation            â”‚
â”‚ Clip Planning               â”‚
â”‚ Export Endpoints            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
               â”‚
               â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚     Processing Services     â”‚
â”‚                             â”‚
â”‚ OpenCV / MediaPipe          â”‚
â”‚ Subject Tracking            â”‚
â”‚ FFmpeg                      â”‚
â”‚ yt-dlp                      â”‚
â”‚ ZIP Creation                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Design Decisions

### Local Processing

ClipForge was intentionally designed around local video processing.

The core workflow does not require a paid cloud video-processing service or a paid AI API.

This keeps the project:

- Reproducible
- Privacy-friendly
- Free to run
- Easy to evaluate locally

### FFmpeg

FFmpeg handles the main media-processing operations, including:

- Video trimming
- Cropping
- Scaling
- Audio preservation
- H.264 encoding
- Vertical MP4 generation

### OpenCV and MediaPipe

Computer-vision tooling is used to locate and follow important visible subjects.

This allows the vertical crop to respond to subject position instead of always cropping the exact center of the original frame.

### FastAPI

FastAPI provides the REST backend responsible for:

- Uploads
- YouTube imports
- Job state
- Clip generation
- Timing updates
- Rendering
- Downloads
- Batch export

### Next.js

Next.js provides a responsive interface that allows the complete workflow to be used without command-line interaction.

The interface includes:

- Upload and YouTube source modes
- Light and dark themes
- Clip suggestions
- Editable timestamps
- Individual exports
- Batch ZIP export

## Local Data

Runtime files are stored locally under the `data/` directory.

This can include:

- Uploaded videos
- Downloaded YouTube videos
- Rendered clips
- ZIP archives
- Temporary processing files

The `data/` directory is excluded from Git through `.gitignore` so generated media is not committed to the repository.

## Git-Ignored Files

The repository excludes local and generated files such as:

```text
services/api/.venv/
apps/web/node_modules/
apps/web/.next/
data/
*.mp4
*.mov
*.zip
.env
.env.local
```

This keeps the repository lightweight and prevents local environment files, generated videos, and secrets from being committed.

## Limitations

- Processing speed depends on the user's hardware.
- Long or high-resolution source videos require more rendering time and disk space.
- Public YouTube video availability depends on the source video's accessibility.
- Changes to YouTube may occasionally require an updated version of `yt-dlp`.
- Subject detection quality depends on the visibility and position of the subject.
- If subject tracking is unreliable, ClipForge falls back toward centered framing.
- The current application is designed primarily for local execution.

## Privacy

ClipForge performs its core video-processing workflow locally.

Uploaded and imported videos are processed by the local FastAPI backend and are not sent to a paid external AI service as part of the core clipping workflow.

## Development

### Run the Backend

```powershell
cd services/api
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Run the Frontend

In a second terminal:

```powershell
cd apps/web
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Repository

GitHub:

```text
https://github.com/saharmess123/clipforge
```

## Author

**Sahar Messaoudi**

Full-Stack Developer


