"use client";

import { ChangeEvent, useState } from "react";

type Clip = {
  clip_id: string;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  status: string;
  output_filename?: string;
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

type JobResult = UploadResult & {
  clips: Clip[];
};

const API_URL = "http://localhost:8000";
const ACCEPTED_VIDEO_TYPES = ".mp4,.mov,.mkv";

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatSeconds(seconds: number) {
  return `${Number(seconds.toFixed(2))}s`;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [draftTimes, setDraftTimes] = useState<
    Record<string, { start_seconds: string; end_seconds: string }>
  >({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [savingClipId, setSavingClipId] = useState("");
  const [exportingClipId, setExportingClipId] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setUploadResult(null);
    setClips([]);
    setDraftTimes({});
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleUpload() {
    if (!selectedFile) {
      setErrorMessage("Choose a video before uploading.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setUploadResult(null);
    setClips([]);
    setDraftTimes({});

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
      setSuccessMessage("Video uploaded and validated.");
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
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/jobs/${uploadResult.job_id}/clips/suggest`,
        {
          method: "POST",
        },
      );

      const payload: JobResult | { detail?: string } = await response.json();

      if (!response.ok) {
        throw new Error(
          "detail" in payload ? payload.detail ?? "Could not suggest clips." : "Could not suggest clips.",
        );
      }

      const job = payload as JobResult;
      setClips(job.clips);
      setDraftTimes(
        Object.fromEntries(
          job.clips.map((clip) => [
            clip.clip_id,
            {
              start_seconds: String(clip.start_seconds),
              end_seconds: String(clip.end_seconds),
            },
          ]),
        ),
      );
      setSuccessMessage("Clip suggestions are ready. You can adjust their times.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not suggest clips.",
      );
    } finally {
      setIsSuggesting(false);
    }
  }

  function updateDraftTime(
    clipId: string,
    field: "start_seconds" | "end_seconds",
    value: string,
  ) {
    setDraftTimes((current) => ({
      ...current,
      [clipId]: {
        ...current[clipId],
        [field]: value,
      },
    }));
  }

  async function handleSaveClip(clipId: string) {
    if (!uploadResult) {
      return;
    }

    const draft = draftTimes[clipId];

    if (!draft) {
      return;
    }

    const startSeconds = Number(draft.start_seconds);
    const endSeconds = Number(draft.end_seconds);

    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
      setErrorMessage("Enter valid numeric start and end times.");
      return;
    }

    setSavingClipId(clipId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/jobs/${uploadResult.job_id}/clips/${clipId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start_seconds: startSeconds,
            end_seconds: endSeconds,
          }),
        },
      );

      const payload: Clip | { detail?: string } = await response.json();

      if (!response.ok) {
        throw new Error(
          "detail" in payload ? payload.detail ?? "Could not save this clip." : "Could not save this clip.",
        );
      }

      const savedClip = payload as Clip;

      setClips((current) =>
        current.map((clip) =>
          clip.clip_id === clipId ? savedClip : clip,
        ),
      );

      setDraftTimes((current) => ({
        ...current,
        [clipId]: {
          start_seconds: String(savedClip.start_seconds),
          end_seconds: String(savedClip.end_seconds),
        },
      }));

      setSuccessMessage(`${clipId.replace("-", " ")} was saved.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save this clip.",
      );
    } finally {
      setSavingClipId("");
    }
  }

  async function handleExportClip(clipId: string) {
    if (!uploadResult) {
      return;
    }

    setExportingClipId(clipId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/jobs/${uploadResult.job_id}/clips/${clipId}/export`,
        {
          method: "POST",
        },
      );

      const payload: {
        clip?: Clip;
        download_url?: string;
        detail?: string;
      } = await response.json();

      if (!response.ok || !payload.clip || !payload.download_url) {
        throw new Error(payload.detail ?? "Could not export this clip.");
      }

      setClips((current) =>
        current.map((clip) =>
          clip.clip_id === clipId ? payload.clip! : clip,
        ),
      );

      setSuccessMessage(`${clipId.replace("-", " ")} was exported as a vertical MP4.`);

      window.open(`${API_URL}${payload.download_url}`, "_blank");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not export this clip.",
      );
    } finally {
      setExportingClipId("");
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

          {successMessage && (
            <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {successMessage}
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
                    {formatSeconds(uploadResult.video.duration_seconds)}
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
                className="mt-5 w-full rounded-xl border border-cyan-400 px-4 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSuggesting}
                onClick={handleSuggestClips}
                type="button"
              >
                {isSuggesting ? "Creating suggestions…" : "Suggest clips"}
              </button>
            </div>
          )}
        </section>

        {clips.length > 0 && (
          <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Suggested clips</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Adjust timing, then export each vertical clip.
                </p>
              </div>

              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm text-cyan-300">
                {clips.length} {clips.length === 1 ? "clip" : "clips"}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {clips.map((clip, index) => {
                const draft = draftTimes[clip.clip_id] ?? {
                  start_seconds: String(clip.start_seconds),
                  end_seconds: String(clip.end_seconds),
                };

                return (
                  <article
                    className="rounded-xl border border-slate-700 bg-slate-950 p-5"
                    key={clip.clip_id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">Clip {index + 1}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          Current duration: {formatSeconds(clip.duration_seconds)}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium capitalize text-slate-300">
                        {clip.status}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium">
                        Start time (seconds)
                        <input
                          className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400"
                          min="0"
                          onChange={(event) =>
                            updateDraftTime(
                              clip.clip_id,
                              "start_seconds",
                              event.target.value,
                            )
                          }
                          step="0.1"
                          type="number"
                          value={draft.start_seconds}
                        />
                      </label>

                      <label className="text-sm font-medium">
                        End time (seconds)
                        <input
                          className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400"
                          min="0"
                          onChange={(event) =>
                            updateDraftTime(
                              clip.clip_id,
                              "end_seconds",
                              event.target.value,
                            )
                          }
                          step="0.1"
                          type="number"
                          value={draft.end_seconds}
                        />
                      </label>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        className="rounded-lg bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={savingClipId === clip.clip_id}
                        onClick={() => handleSaveClip(clip.clip_id)}
                        type="button"
                      >
                        {savingClipId === clip.clip_id
                          ? "Saving…"
                          : "Save clip timing"}
                      </button>

                      <button
                        className="rounded-lg border border-emerald-400 px-4 py-2.5 font-semibold text-emerald-300 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={exportingClipId === clip.clip_id}
                        onClick={() => handleExportClip(clip.clip_id)}
                        type="button"
                      >
                        {exportingClipId === clip.clip_id
                          ? "Exporting vertical MP4…"
                          : "Export vertical MP4"}
                      </button>
                    </div>

                    {clip.output_filename && (
                      <p className="mt-4 text-sm text-emerald-300">
                        Exported: {clip.output_filename}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}