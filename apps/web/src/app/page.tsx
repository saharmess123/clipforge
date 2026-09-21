"use client";

import { ChangeEvent, useState } from "react";

type UploadResult = {
  job_id: string;
  original_filename: string;
  size_bytes: number;
  status: string;
  video: {
    width: number;
    height: number;
    duration_seconds: number;
  };
};

const ACCEPTED_VIDEO_TYPES = ".mp4,.mov,.mkv";

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setUploadResult(null);
    setErrorMessage("");
  }

  async function handleUpload() {
    if (!selectedFile) {
      setErrorMessage("Choose a video before uploading.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setUploadResult(null);

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const response = await fetch("http://localhost:8000/api/jobs/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail ?? "Upload failed.");
      }

      setUploadResult(payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-cyan-400">
          CLIPFORGE
        </p>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Turn landscape video into vertical clips.
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          Upload a 16:9 video to create editable vertical clips with
          subject-aware framing.
        </p>

        <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
          <h2 className="text-xl font-semibold">Upload a video</h2>

          <p className="mt-2 text-sm text-slate-400">
            Accepted: MP4, MOV, or MKV · Maximum size: 500 MB · 16:9 only
          </p>

          <label
            className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-600 bg-slate-950 px-6 py-10 text-center transition hover:border-cyan-400"
            htmlFor="video-file"
          >
            <span className="text-base font-medium">
              {selectedFile ? selectedFile.name : "Choose a video file"}
            </span>

            <span className="mt-2 text-sm text-slate-400">
              {selectedFile
                ? formatFileSize(selectedFile.size)
                : "Select a 16:9 horizontal video from your computer"}
            </span>
          </label>

          <input
            accept={ACCEPTED_VIDEO_TYPES}
            className="sr-only"
            id="video-file"
            onChange={handleFileChange}
            type="file"
          />

          <button
            className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedFile || isUploading}
            onClick={handleUpload}
            type="button"
          >
            {isUploading ? "Uploading and validating…" : "Upload video"}
          </button>

          {errorMessage && (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {errorMessage}
            </p>
          )}

          {uploadResult && (
            <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
              <p className="font-semibold text-emerald-300">
                Video uploaded and validated
              </p>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-400">Resolution</dt>
                  <dd className="mt-1 font-medium">
                    {uploadResult.video.width} × {uploadResult.video.height}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-400">Duration</dt>
                  <dd className="mt-1 font-medium">
                    {uploadResult.video.duration_seconds}s
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-400">Status</dt>
                  <dd className="mt-1 font-medium capitalize">
                    {uploadResult.status}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}