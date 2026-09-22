"use client";

import { ChangeEvent, useState } from "react";

type Clip = {
  clip_id: string;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  status: string;
};

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

const API_URL = "http://localhost:8000";
const ACCEPTED_VIDEO_TYPES = ".mp4,.mov,.mkv";

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setUploadResult(null);
    setClips([]);
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
    setClips([]);

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const response = await fetch(`${API_URL}/api/jobs/upload`, {
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

  async function handleSuggestClips() {
    if (!uploadResult) {
      return;
    }

    setIsSuggesting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/jobs/${uploadResult.job_id}/clips/suggest?clip_length_seconds=30`,
        {
          method: "POST",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail ?? "Could not suggest clips.");
      }

      setClips(payload.clips ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not suggest clips.",
      );
    } finally {
      setIsSuggesting(false);
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

              <button
                className="mt-5 w-full rounded-xl border border-cyan-400 px-4 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSuggesting}
                onClick={handleSuggestClips}
                type="button"
              >
                {isSuggesting ? "Generating clip suggestions…" : "Suggest clips"}
              </button>
            </div>
          )}
        </section>

        {clips.length > 0 && (
          <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Suggested clips</h2>
                <p className="mt-1 text-sm text-slate-400">
                  You will be able to adjust these ranges before export.
                </p>
              </div>

              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-300">
                {clips.length} clip{clips.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {clips.map((clip, index) => (
                <article
                  className="rounded-xl border border-slate-700 bg-slate-950 p-4"
                  key={clip.clip_id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Clip {index + 1}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {clip.start_seconds}s → {clip.end_seconds}s ·{" "}
                        {clip.duration_seconds}s total
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium capitalize text-slate-300">
                      {clip.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}