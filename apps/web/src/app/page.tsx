"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";

type Theme = "light" | "dark";
type SourceMode = "upload" | "youtube";

type Clip = {
  clip_id: string;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  status: string;
  output_filename?: string;
  export_filename?: string;
};

type UploadResult = {
  job_id: string;
  original_filename: string;
  stored_filename?: string;
  size_bytes: number;
  status: string;
  source_url?: string;

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

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;

  const minutes = Math.floor(safe / 60);
  const remaining = Math.floor(safe % 60);

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*                                   ICONS                                    */
/* -------------------------------------------------------------------------- */

function LogoIcon() {
  return (
    <svg
      viewBox="0 0 40 40"
      className="h-8 w-8"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 7h17l7 7-7 7H15L8 14V7Z"
        fill="currentColor"
      />

      <path
        d="M32 33H15l-7-7 7-7h10l7 7v7Z"
        fill="currentColor"
        opacity=".5"
      />
    </svg>
  );
}

function UploadIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="m9.5 14.5 5-5M8 17l-1.5 1.5a3.18 3.18 0 1 1-4.5-4.5l3-3a3.18 3.18 0 0 1 4.5 0M16 7l1.5-1.5A3.18 3.18 0 1 1 22 10l-3 3a3.18 3.18 0 0 1-4.5 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="m12 3 1.2 4.2L17 9l-3.8 1.8L12 15l-1.2-4.2L7 9l3.8-1.8L12 3ZM18.5 15l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3ZM5 14l.8 2.7 2.7.8-2.7.8L5 21l-.8-2.7-2.7-.8 2.7-.8L5 14Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M20 14.3A8 8 0 0 1 9.7 4a8.4 8.4 0 1 0 10.3 10.3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.5" />

      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VideoStepIcon() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="5"
        width="17"
        height="14"
        rx="2.5"
      />

      <path
        d="M9 12h6M12 9v6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReframeStepIcon() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M7 3H4a1 1 0 0 0-1 1v3M17 3h3a1 1 0 0 1 1 1v3M7 21H4a1 1 0 0 1-1-1v-3M17 21h3a1 1 0 0 0 1-1v-3"
        strokeLinecap="round"
      />

      <circle cx="12" cy="10" r="2.5" />

      <path
        d="M7.5 17c.9-2.3 2.4-3.5 4.5-3.5s3.6 1.2 4.5 3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExportStepIcon() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2.5"
      />

      <path
        d="M9 12h6m0 0-2.5-2.5M15 12l-2.5 2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    PAGE                                    */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const [theme, setTheme] =
    useState<Theme>("light");

  const [sourceMode, setSourceMode] =
    useState<SourceMode>("upload");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [youtubeUrl, setYoutubeUrl] =
    useState("");

  const [uploadResult, setUploadResult] =
    useState<UploadResult | null>(null);

  const [clips, setClips] =
    useState<Clip[]>([]);

  const [draftTimes, setDraftTimes] =
    useState<
      Record<
        string,
        {
          start_seconds: string;
          end_seconds: string;
        }
      >
    >({});

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [isUploading, setIsUploading] =
    useState(false);

  const [
    isImportingYoutube,
    setIsImportingYoutube,
  ] = useState(false);

  const [isSuggesting, setIsSuggesting] =
    useState(false);

  const [savingClipId, setSavingClipId] =
    useState("");

  const [exportingClipId, setExportingClipId] =
    useState("");

  const [isExportingAll, setIsExportingAll] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* Theme                                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const savedTheme =
      window.localStorage.getItem(
        "clipforge-theme",
      );

    if (
      savedTheme === "light" ||
      savedTheme === "dark"
    ) {
      setTheme(savedTheme);
      return;
    }

    if (
      window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches
    ) {
      setTheme("dark");
    }
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next =
        current === "light"
          ? "dark"
          : "light";

      window.localStorage.setItem(
        "clipforge-theme",
        next,
      );

      return next;
    });
  }

  const dark = theme === "dark";

  /* ------------------------------------------------------------------------ */
  /* Theme classes                                                            */
  /* ------------------------------------------------------------------------ */

  const pageClass = dark
    ? "bg-[#100e0f] text-[#f8f2ed]"
    : "bg-[#f4ece3] text-[#171311]";

  const navClass = dark
    ? "border-white/[0.08] bg-[#100e0f]/85"
    : "border-[#49372e]/10 bg-[#fbf5ee]/86";

  const cardClass = dark
    ? "border-white/[0.09] bg-[#171416]/90"
    : "border-[#4d392e]/10 bg-[#fffaf5]/92";

  const cardSolidClass = dark
    ? "border-white/[0.09] bg-[#1a1719]"
    : "border-[#4d392e]/10 bg-[#fffaf6]";

  const mutedClass = dark
    ? "text-[#a99e98]"
    : "text-[#75675e]";

  const subtleClass = dark
    ? "text-[#7d746f]"
    : "text-[#9a8b81]";

  const inputClass = dark
    ? "border-white/[0.11] bg-[#100e10] text-white placeholder:text-[#645d59]"
    : "border-[#4d392e]/12 bg-[#fffdfa] text-[#171311] placeholder:text-[#a99a8f]";

  /* ------------------------------------------------------------------------ */
  /* Reset                                                                    */
  /* ------------------------------------------------------------------------ */

  function resetJobState() {
    setUploadResult(null);
    setClips([]);
    setDraftTimes({});
    setErrorMessage("");
    setSuccessMessage("");
  }

  /* ------------------------------------------------------------------------ */
  /* Upload                                                                   */
  /* ------------------------------------------------------------------------ */

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setYoutubeUrl("");

    resetJobState();
  }

  async function handleUpload() {
    if (!selectedFile) {
      setErrorMessage(
        "Choose a video before uploading.",
      );

      return;
    }

    setIsUploading(true);

    setErrorMessage("");
    setSuccessMessage("");
    setUploadResult(null);
    setClips([]);
    setDraftTimes({});

    const formData =
      new FormData();

    formData.append(
      "video",
      selectedFile,
    );

    try {
      const response = await fetch(
        `${API_URL}/api/jobs/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload.detail ??
            "Upload failed.",
        );
      }

      setUploadResult(
        payload,
      );

      setSuccessMessage(
        "Video uploaded and validated.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* YouTube                                                                  */
  /* ------------------------------------------------------------------------ */

  async function handleYouTubeImport() {
    const cleanUrl =
      youtubeUrl.trim();

    if (!cleanUrl) {
      setErrorMessage(
        "Paste a YouTube URL first.",
      );

      return;
    }

    setIsImportingYoutube(
      true,
    );

    setErrorMessage("");
    setSuccessMessage("");
    setUploadResult(null);
    setClips([]);
    setDraftTimes({});

    try {
      const response = await fetch(
        `${API_URL}/api/jobs/youtube`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            source_url:
              cleanUrl,
          }),
        },
      );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload.detail ??
            "Could not import YouTube video.",
        );
      }

      setUploadResult(
        payload,
      );

      setSelectedFile(
        null,
      );

      setSuccessMessage(
        "YouTube video imported and validated.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not import YouTube video.",
      );
    } finally {
      setIsImportingYoutube(
        false,
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Suggest clips                                                            */
  /* ------------------------------------------------------------------------ */

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
          method:
            "POST",
        },
      );

      const payload:
        | JobResult
        | {
            detail?: string;
          } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          "detail" in payload
            ? payload.detail ??
                "Could not suggest clips."
            : "Could not suggest clips.",
        );
      }

      const job =
        payload as JobResult;

      setClips(
        job.clips,
      );

      setDraftTimes(
        Object.fromEntries(
          job.clips.map(
            (clip) => [
              clip.clip_id,

              {
                start_seconds:
                  String(
                    clip.start_seconds,
                  ),

                end_seconds:
                  String(
                    clip.end_seconds,
                  ),
              },
            ],
          ),
        ),
      );

      setSuccessMessage(
        `${job.clips.length} clip suggestions are ready.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not suggest clips.",
      );
    } finally {
      setIsSuggesting(
        false,
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Edit clip                                                                */
  /* ------------------------------------------------------------------------ */

  function updateDraftTime(
    clipId: string,

    field:
      | "start_seconds"
      | "end_seconds",

    value: string,
  ) {
    setDraftTimes(
      (current) => ({
        ...current,

        [clipId]: {
          ...current[
            clipId
          ],

          [field]:
            value,
        },
      }),
    );
  }

  async function handleSaveClip(
    clipId: string,
  ) {
    if (!uploadResult) {
      return;
    }

    const draft =
      draftTimes[clipId];

    if (!draft) {
      return;
    }

    const startSeconds =
      Number(
        draft.start_seconds,
      );

    const endSeconds =
      Number(
        draft.end_seconds,
      );

    if (
      !Number.isFinite(
        startSeconds,
      ) ||
      !Number.isFinite(
        endSeconds,
      )
    ) {
      setErrorMessage(
        "Enter valid numeric start and end times.",
      );

      return;
    }

    setSavingClipId(
      clipId,
    );

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/jobs/${uploadResult.job_id}/clips/${clipId}`,
        {
          method:
            "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            start_seconds:
              startSeconds,

            end_seconds:
              endSeconds,
          }),
        },
      );

      const payload:
        | Clip
        | {
            detail?: string;
          } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          "detail" in payload
            ? payload.detail ??
                "Could not save this clip."
            : "Could not save this clip.",
        );
      }

      const savedClip =
        payload as Clip;

      setClips(
        (current) =>
          current.map(
            (clip) =>
              clip.clip_id ===
              clipId
                ? savedClip
                : clip,
          ),
      );

      setDraftTimes(
        (current) => ({
          ...current,

          [clipId]: {
            start_seconds:
              String(
                savedClip.start_seconds,
              ),

            end_seconds:
              String(
                savedClip.end_seconds,
              ),
          },
        }),
      );

      setSuccessMessage(
        `${clipId.replace(
          "-",
          " ",
        )} timing saved.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not save this clip.",
      );
    } finally {
      setSavingClipId("");
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Export clip                                                              */
  /* ------------------------------------------------------------------------ */

  async function handleExportClip(
    clipId: string,
  ) {
    if (!uploadResult) {
      return;
    }

    setExportingClipId(
      clipId,
    );

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/jobs/${uploadResult.job_id}/clips/${clipId}/export`,
        {
          method:
            "POST",
        },
      );

      const payload: {
        clip?: Clip;
        download_url?: string;
        detail?: string;
      } =
        await response.json();

      if (
        !response.ok ||
        !payload.clip ||
        !payload.download_url
      ) {
        throw new Error(
          payload.detail ??
            "Could not export this clip.",
        );
      }

      setClips(
        (current) =>
          current.map(
            (clip) =>
              clip.clip_id ===
              clipId
                ? payload.clip!
                : clip,
          ),
      );

      setSuccessMessage(
        `${clipId.replace(
          "-",
          " ",
        )} exported successfully.`,
      );

      window.open(
        `${API_URL}${payload.download_url}`,
        "_blank",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not export this clip.",
      );
    } finally {
      setExportingClipId("");
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Export all                                                               */
  /* ------------------------------------------------------------------------ */

  async function handleExportAll() {
    if (
      !uploadResult ||
      clips.length === 0
    ) {
      return;
    }

    setIsExportingAll(
      true,
    );

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/jobs/${uploadResult.job_id}/export`,
        {
          method:
            "POST",
        },
      );

      const payload: {
        clip_count?: number;
        download_url?: string;
        detail?: string;
      } =
        await response.json();

      if (
        !response.ok ||
        !payload.download_url
      ) {
        throw new Error(
          payload.detail ??
            "Could not export all clips.",
        );
      }

      setSuccessMessage(
        `${
          payload.clip_count ??
          clips.length
        } clips exported successfully.`,
      );

      window.open(
        `${API_URL}${payload.download_url}`,
        "_blank",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not export all clips.",
      );
    } finally {
      setIsExportingAll(
        false,
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /*                                    UI                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <main
      className={`relative min-h-screen overflow-x-hidden transition-colors duration-500 ${pageClass}`}
    >
      {/* ================================================================== */}
      {/* BACKGROUND                                                         */}
      {/* ================================================================== */}

      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            dark
              ? `
                  linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)
                `
              : `
                  linear-gradient(rgba(82,56,42,.055) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(82,56,42,.055) 1px, transparent 1px)
                `,

          backgroundSize:
            "48px 48px",
        }}
      />

      <div
        className={`pointer-events-none absolute -left-[270px] top-[430px] h-[580px] w-[580px] rounded-full ${
          dark
            ? "bg-[#e26f4f]/[0.04]"
            : "bg-[#efb69f]/20"
        }`}
      />

      <div
        className={`pointer-events-none absolute -right-[280px] top-[550px] h-[650px] w-[650px] rounded-full ${
          dark
            ? "bg-[#dc9d51]/[0.035]"
            : "bg-[#edc6ab]/20"
        }`}
      />

      <div
        className={`pointer-events-none absolute -left-[150px] top-[-250px] h-[600px] w-[600px] rounded-full blur-[120px] ${
          dark
            ? "bg-[#df7354]/[0.08]"
            : "bg-[#f2bea9]/26"
        }`}
      />

      <div
        className={`pointer-events-none absolute right-[-100px] top-[100px] h-[520px] w-[520px] rounded-full blur-[140px] ${
          dark
            ? "bg-[#d99b50]/[0.05]"
            : "bg-[#efd09e]/25"
        }`}
      />

      {/* ================================================================== */}
      {/* NAV                                                                */}
      {/* ================================================================== */}

      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-2xl ${navClass}`}
      >
        <div className="mx-auto flex max-w-[1450px] items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="text-[#e36d4c]">
              <LogoIcon />
            </span>

            <span className="text-lg font-black tracking-[0.08em]">
              CLIPFORGE
            </span>
          </div>

          <nav
            className={`hidden items-center gap-8 text-sm font-semibold md:flex ${mutedClass}`}
          >
            <a
              href="#create"
              className="transition hover:text-[#df6b4b]"
            >
              Create
            </a>

            <a
              href="#workflow"
              className="transition hover:text-[#df6b4b]"
            >
              Workflow
            </a>

            <a
              href="#clips"
              className="transition hover:text-[#df6b4b]"
            >
              Clips
            </a>
          </nav>

          <button
            type="button"
            onClick={
              toggleTheme
            }
            className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition ${
              dark
                ? "border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.09]"
                : "border-[#4a382e]/10 bg-white/70 shadow-sm hover:bg-white"
            }`}
          >
            {dark ? (
              <SunIcon />
            ) : (
              <MoonIcon />
            )}

            <span>
              {dark
                ? "Light"
                : "Dark"}
            </span>
          </button>
        </div>
      </header>

      {/* ================================================================== */}
      {/* CONTENT                                                            */}
      {/* ================================================================== */}

      <div className="relative z-10 mx-auto max-w-[1450px] px-5 pb-24 sm:px-8 lg:px-10">
        {/* ================================================================ */}
        {/* HERO                                                             */}
        {/* ================================================================ */}

        <section className="grid min-h-[650px] items-center gap-12 py-16 lg:grid-cols-[0.78fr_1.22fr] lg:py-20">
          {/* LEFT */}

          <div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                dark
                  ? "border-[#e36d4c]/25 bg-[#e36d4c]/10 text-[#f3997e]"
                  : "border-[#d4694a]/20 bg-[#efd2c7] text-[#b75237]"
              }`}
            >
              <SparkIcon className="h-4 w-4" />

              Intelligent video clipping
            </div>

            <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[0.93] tracking-[-0.055em] sm:text-6xl lg:text-[5.25rem]">
              From hours
              <br />

              to{" "}
              <span className="text-[#e36d4c]">
                highlights.
              </span>
            </h1>

            <p
              className={`mt-7 max-w-xl text-base leading-7 sm:text-lg ${mutedClass}`}
            >
              Transform long-form
              16:9 video into
              editable,
              subject-aware
              vertical clips ready
              for Shorts, Reels and
              TikTok.
            </p>

            <div className="mt-8">
              <a
                href="#create"
                className="inline-flex items-center gap-3 rounded-xl bg-[#e36d4c] px-7 py-4 font-black text-white shadow-lg shadow-[#e36d4c]/20 transition hover:-translate-y-0.5 hover:bg-[#cf5e40]"
              >
                Start clipping

                <ArrowIcon />
              </a>
            </div>

            <div
              className={`mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm ${mutedClass}`}
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#e36d4c]" />

                Subject tracking
              </span>

              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#d89b48]" />

                YouTube import
              </span>

              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#bf826b]" />

                9:16 export
              </span>
            </div>
          </div>

          {/* RIGHT IMAGE */}

          <div className="relative mx-auto w-full max-w-[820px] lg:ml-auto">
            <div
              className={`absolute -inset-10 -z-10 rounded-[42%_58%_38%_62%/55%_35%_65%_45%] ${
                dark
                  ? "bg-[#e36d4c]/[0.06]"
                  : "bg-[#efb49e]/22"
              }`}
            />

            <div
              className={`relative overflow-hidden rounded-[2rem] border shadow-[0_32px_90px_rgba(80,47,33,.20)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_38px_110px_rgba(80,47,33,.26)] ${
                dark
                  ? "border-white/[0.09]"
                  : "border-[#593c2e]/10"
              }`}
            >
              <Image
                src="/clipforge-hero.png"
                alt="ClipForge horizontal to vertical video conversion"
                width={1640}
                height={920}
                priority
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 3 STEP WORKFLOW                                                  */}
        {/* ================================================================ */}

        <section
          id="workflow"
          className={`relative mb-8 overflow-hidden rounded-[2rem] border p-6 shadow-[0_22px_65px_rgba(80,47,33,.08)] sm:p-8 ${cardClass}`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e36d4c]">
                How it works
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] sm:text-3xl">
                Create professional clips in 3 simple steps.
              </h2>
            </div>

            <p
              className={`max-w-md text-sm leading-6 lg:text-right ${mutedClass}`}
            >
              Turn your long videos into
              vertical, ready-to-share content
              with a simple workflow.
            </p>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {/* STEP 1 */}

            <article
              className={`relative rounded-[1.5rem] border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6 ${cardSolidClass}`}
            >
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <span
                    className={`absolute -left-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                      dark
                        ? "bg-[#e36d4c]/20 text-[#ff9a7d]"
                        : "bg-[#f4d7cc] text-[#d45f40]"
                    }`}
                  >
                    1
                  </span>

                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e36d4c] text-white shadow-lg shadow-[#e36d4c]/20">
                    <VideoStepIcon />
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-lg font-black">
                    Add your video
                  </h3>

                  <p
                    className={`mt-2 text-sm leading-6 ${mutedClass}`}
                  >
                    Upload a local video or
                    import one directly from
                    YouTube.
                  </p>
                </div>
              </div>
            </article>

            {/* STEP 2 */}

            <article
              className={`relative rounded-[1.5rem] border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6 ${cardSolidClass}`}
            >
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <span
                    className={`absolute -left-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                      dark
                        ? "bg-[#e36d4c]/20 text-[#ff9a7d]"
                        : "bg-[#f4d7cc] text-[#d45f40]"
                    }`}
                  >
                    2
                  </span>

                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e36d4c] text-white shadow-lg shadow-[#e36d4c]/20">
                    <ReframeStepIcon />
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-lg font-black">
                    Subject-aware reframing
                  </h3>

                  <p
                    className={`mt-2 text-sm leading-6 ${mutedClass}`}
                  >
                    Automatically keeps your
                    subject in frame and adapts
                    the composition for vertical.
                  </p>
                </div>
              </div>
            </article>

            {/* STEP 3 */}

            <article
              className={`relative rounded-[1.5rem] border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6 ${cardSolidClass}`}
            >
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <span
                    className={`absolute -left-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                      dark
                        ? "bg-[#e36d4c]/20 text-[#ff9a7d]"
                        : "bg-[#f4d7cc] text-[#d45f40]"
                    }`}
                  >
                    3
                  </span>

                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e36d4c] text-white shadow-lg shadow-[#e36d4c]/20">
                    <ExportStepIcon />
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-lg font-black">
                    Edit and export
                  </h3>

                  <p
                    className={`mt-2 text-sm leading-6 ${mutedClass}`}
                  >
                    Fine-tune clip timing,
                    export individual MP4s or
                    download everything as ZIP.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* ================================================================ */}
        {/* CREATE PROJECT                                                   */}
        {/* ================================================================ */}

        <section
          id="create"
          className={`relative mt-8 overflow-hidden rounded-[2rem] border p-5 shadow-[0_25px_70px_rgba(78,50,35,.10)] backdrop-blur-xl sm:p-7 ${cardClass}`}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e36d4c]">
                Create a project
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Add your source video
              </h2>

              <p
                className={`mt-2 text-sm ${mutedClass}`}
              >
                Choose a local file or import
                a public YouTube video.
              </p>
            </div>

            <div
              className={`flex rounded-xl border p-1 ${
                dark
                  ? "border-white/[0.08] bg-black/20"
                  : "border-[#4c382d]/10 bg-[#eee1d7]"
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  setSourceMode(
                    "upload",
                  )
                }
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black transition ${
                  sourceMode ===
                  "upload"
                    ? "bg-[#e36d4c] text-white shadow-md"
                    : mutedClass
                }`}
              >
                <UploadIcon className="h-4 w-4" />

                Upload file
              </button>

              <button
                type="button"
                onClick={() =>
                  setSourceMode(
                    "youtube",
                  )
                }
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black transition ${
                  sourceMode ===
                  "youtube"
                    ? "bg-[#d89b48] text-[#26190e] shadow-md"
                    : mutedClass
                }`}
              >
                <LinkIcon className="h-4 w-4" />

                YouTube URL
              </button>
            </div>
          </div>

          <div className="mt-7">
            {sourceMode ===
            "upload" ? (
              <div>
                <label
                  htmlFor="video-file"
                  className={`group flex min-h-[255px] cursor-pointer flex-col items-center justify-center rounded-[1.6rem] border border-dashed px-6 text-center transition ${
                    dark
                      ? "border-white/[0.13] bg-black/20 hover:border-[#e36d4c]/60"
                      : "border-[#5a4135]/15 bg-[#fff8f2]/75 hover:border-[#d96a4a]"
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e36d4c] text-white shadow-xl shadow-[#e36d4c]/20 transition group-hover:-translate-y-1">
                    <UploadIcon className="h-7 w-7" />
                  </div>

                  <h3 className="mt-5 text-lg font-black">
                    {selectedFile
                      ? selectedFile.name
                      : "Drop your video here"}
                  </h3>

                  <p
                    className={`mt-2 text-sm ${mutedClass}`}
                  >
                    {selectedFile
                      ? formatFileSize(
                          selectedFile.size,
                        )
                      : "or click to browse your computer"}
                  </p>

                  <div
                    className={`mt-5 flex flex-wrap justify-center gap-2 text-xs ${subtleClass}`}
                  >
                    <span className="rounded-full border border-current/10 px-3 py-1">
                      MP4
                    </span>

                    <span className="rounded-full border border-current/10 px-3 py-1">
                      MOV
                    </span>

                    <span className="rounded-full border border-current/10 px-3 py-1">
                      MKV
                    </span>

                    <span className="rounded-full border border-current/10 px-3 py-1">
                      Max 500 MB
                    </span>

                    <span className="rounded-full border border-current/10 px-3 py-1">
                      16:9
                    </span>
                  </div>
                </label>

                <input
                  id="video-file"
                  accept={
                    ACCEPTED_VIDEO_TYPES
                  }
                  className="sr-only"
                  type="file"
                  onChange={
                    handleFileChange
                  }
                />

                <button
                  type="button"
                  disabled={
                    !selectedFile ||
                    isUploading
                  }
                  onClick={
                    handleUpload
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e36d4c] px-5 py-4 font-black text-white shadow-lg shadow-[#e36d4c]/15 transition hover:-translate-y-0.5 hover:bg-[#cf5e40] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <UploadIcon />

                  {isUploading
                    ? "Uploading and validating…"
                    : "Upload video"}
                </button>
              </div>
            ) : (
              <div
                className={`rounded-[1.6rem] border p-6 sm:p-8 ${cardSolidClass}`}
              >
                <div className="mx-auto max-w-3xl py-7">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d89b48]/15 text-[#d89b48]">
                    <LinkIcon className="h-7 w-7" />
                  </div>

                  <h3 className="mt-5 text-2xl font-black">
                    Import from YouTube
                  </h3>

                  <p
                    className={`mt-2 max-w-xl text-sm leading-6 ${mutedClass}`}
                  >
                    Paste one public YouTube
                    video URL and ClipForge will
                    download and validate the
                    source.
                  </p>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="url"
                      value={
                        youtubeUrl
                      }
                      onChange={(
                        event,
                      ) => {
                        setYoutubeUrl(
                          event.target
                            .value,
                        );

                        setSelectedFile(
                          null,
                        );

                        setErrorMessage(
                          "",
                        );

                        setSuccessMessage(
                          "",
                        );
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className={`min-w-0 flex-1 rounded-xl border px-4 py-4 outline-none transition focus:border-[#d89b48] ${inputClass}`}
                    />

                    <button
                      type="button"
                      disabled={
                        !youtubeUrl.trim() ||
                        isImportingYoutube
                      }
                      onClick={
                        handleYouTubeImport
                      }
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#d89b48] px-7 py-4 font-black text-[#26190e] shadow-lg shadow-[#d89b48]/15 transition hover:-translate-y-0.5 hover:bg-[#e2a955] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {isImportingYoutube
                        ? "Importing…"
                        : "Import video"}

                      <ArrowIcon />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
                dark
                  ? "border-[#d89b48]/25 bg-[#d89b48]/10 text-[#efc277]"
                  : "border-[#be8739]/20 bg-[#f1dfc0] text-[#7f571d]"
              }`}
            >
              {successMessage}
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* VIDEO READY                                                      */}
        {/* ================================================================ */}

        {uploadResult && (
          <section
            className={`mt-6 overflow-hidden rounded-[2rem] border shadow-lg ${cardSolidClass}`}
          >
            <div className="grid items-center gap-6 p-5 sm:p-6 lg:grid-cols-[150px_1fr_auto]">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-[linear-gradient(135deg,#cb8c74,#5a3a30_70%)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_25%,rgba(255,218,190,.4),transparent_34%)]" />

                <div className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black text-white">
                  SOURCE
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black">
                    Video ready for clipping
                  </h3>

                  <span className="rounded-full bg-[#d89b48]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#b67e30]">
                    Ready
                  </span>
                </div>

                <p
                  className={`mt-1 truncate text-sm ${mutedClass}`}
                >
                  {
                    uploadResult.original_filename
                  }
                </p>

                <div
                  className={`mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold ${subtleClass}`}
                >
                  <span>
                    {
                      uploadResult.video
                        .width
                    }{" "}
                    ×{" "}
                    {
                      uploadResult.video
                        .height
                    }
                  </span>

                  <span>
                    {formatTime(
                      uploadResult.video
                        .duration_seconds,
                    )}
                  </span>

                  {uploadResult.size_bytes >
                    0 && (
                    <span>
                      {formatFileSize(
                        uploadResult.size_bytes,
                      )}
                    </span>
                  )}

                  <span>
                    {uploadResult.source_url
                      ? "YouTube"
                      : "Local upload"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={
                  isSuggesting
                }
                onClick={
                  handleSuggestClips
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-[#e36d4c] px-7 py-4 font-black text-white shadow-lg shadow-[#e36d4c]/15 transition hover:-translate-y-0.5 hover:bg-[#cf5e40] disabled:opacity-40"
              >
                <SparkIcon />

                {isSuggesting
                  ? "Finding clips…"
                  : "Suggest clips"}
              </button>
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* CLIPS                                                            */}
        {/* ================================================================ */}

        {clips.length > 0 && (
          <section
            id="clips"
            className="mt-16"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e36d4c]">
                  Generated moments
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                    Suggested clips
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${
                      dark
                        ? "bg-white/[0.07] text-[#bcb1aa]"
                        : "bg-[#e6d5ca] text-[#685a51]"
                    }`}
                  >
                    {
                      clips.length
                    }{" "}
                    clips
                  </span>
                </div>

                <p
                  className={`mt-3 text-sm ${mutedClass}`}
                >
                  Fine-tune the timing or export
                  your vertical clips.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  isExportingAll
                }
                onClick={
                  handleExportAll
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-[#d89b48] px-6 py-3.5 font-black text-[#26190e] shadow-lg shadow-[#d89b48]/15 transition hover:-translate-y-0.5 hover:bg-[#e2a955] disabled:opacity-40"
              >
                <DownloadIcon />

                {isExportingAll
                  ? "Rendering all clips…"
                  : "Export all as ZIP"}
              </button>
            </div>

            {isExportingAll && (
              <div
                className={`mt-6 rounded-2xl border p-5 ${cardSolidClass}`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-5 w-5 animate-spin rounded-full border-2 border-[#e36d4c] border-t-transparent" />

                  <div>
                    <p className="font-black">
                      Creating your vertical
                      clips…
                    </p>

                    <p
                      className={`mt-1 text-sm ${mutedClass}`}
                    >
                      Subject tracking and
                      FFmpeg rendering can take
                      several minutes for long
                      videos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {clips.map(
                (
                  clip,
                  index,
                ) => {
                  const draft =
                    draftTimes[
                      clip.clip_id
                    ] ?? {
                      start_seconds:
                        String(
                          clip.start_seconds,
                        ),

                      end_seconds:
                        String(
                          clip.end_seconds,
                        ),
                    };

                  const exported =
                    clip.status.toLowerCase() ===
                    "exported";

                  const filename =
                    clip.export_filename ??
                    clip.output_filename;

                  return (
                    <article
                      key={
                        clip.clip_id
                      }
                      className={`group overflow-hidden rounded-[1.5rem] border shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${cardSolidClass}`}
                    >
                      <div
                        className="relative aspect-[16/8.5] overflow-hidden"
                        style={{
                          background:
                            index %
                              3 ===
                            0
                              ? "linear-gradient(135deg,#ab715c,#613f34 52%,#2b201d)"
                              : index %
                                    3 ===
                                  1
                                ? "linear-gradient(135deg,#cc9663,#7c563d 52%,#38271f)"
                                : "linear-gradient(135deg,#b98069,#744d3e 52%,#30231e)",
                        }}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(255,222,194,.27),transparent_35%)]" />

                        <div className="absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-full bg-black/60 px-2 text-xs font-black text-white">
                          {index +
                            1}
                        </div>

                        <div className="absolute right-3 top-3 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-black text-white">
                          {formatTime(
                            clip.duration_seconds,
                          )}
                        </div>

                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="h-1 overflow-hidden rounded-full bg-white/20">
                            <div className="h-full w-[66%] rounded-full bg-[#ef9c79]" />
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p
                              className={`text-[10px] font-black uppercase tracking-[0.18em] ${subtleClass}`}
                            >
                              Clip{" "}
                              {String(
                                index +
                                  1,
                              ).padStart(
                                2,
                                "0",
                              )}
                            </p>

                            <h3 className="mt-1 text-lg font-black">
                              {formatTime(
                                clip.start_seconds,
                              )}
                              {" → "}
                              {formatTime(
                                clip.end_seconds,
                              )}
                            </h3>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                              exported
                                ? dark
                                  ? "bg-[#d89b48]/15 text-[#e5b15f]"
                                  : "bg-[#efddbc] text-[#92631d]"
                                : dark
                                  ? "bg-white/[0.06] text-[#8e8580]"
                                  : "bg-[#eee2da] text-[#71635a]"
                            }`}
                          >
                            {
                              clip.status
                            }
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <label className="text-xs font-black">
                            Start

                            <input
                              className={`mt-2 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[#e36d4c] ${inputClass}`}
                              min="0"
                              step="0.1"
                              type="number"
                              value={
                                draft.start_seconds
                              }
                              onChange={(
                                event,
                              ) =>
                                updateDraftTime(
                                  clip.clip_id,
                                  "start_seconds",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </label>

                          <label className="text-xs font-black">
                            End

                            <input
                              className={`mt-2 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[#e36d4c] ${inputClass}`}
                              min="0"
                              step="0.1"
                              type="number"
                              value={
                                draft.end_seconds
                              }
                              onChange={(
                                event,
                              ) =>
                                updateDraftTime(
                                  clip.clip_id,
                                  "end_seconds",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </label>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            disabled={
                              savingClipId ===
                              clip.clip_id
                            }
                            onClick={() =>
                              handleSaveClip(
                                clip.clip_id,
                              )
                            }
                            className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-black transition disabled:opacity-40 ${
                              dark
                                ? "border-white/[0.1] hover:bg-white/[0.05]"
                                : "border-[#4d392f]/10 bg-[#fffaf6] hover:bg-[#f2e5dc]"
                            }`}
                          >
                            {savingClipId ===
                            clip.clip_id
                              ? "Saving…"
                              : "Edit timing"}
                          </button>

                          <button
                            type="button"
                            disabled={
                              exportingClipId ===
                              clip.clip_id
                            }
                            onClick={() =>
                              handleExportClip(
                                clip.clip_id,
                              )
                            }
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-black transition disabled:opacity-40 ${
                              exported
                                ? "bg-[#d89b48] text-[#26190e] hover:bg-[#e2a955]"
                                : "bg-[#e36d4c] text-white hover:bg-[#cf5e40]"
                            }`}
                          >
                            <DownloadIcon className="h-4 w-4" />

                            {exportingClipId ===
                            clip.clip_id
                              ? "Exporting…"
                              : exported
                                ? "Download"
                                : "Export"}
                          </button>
                        </div>

                        {filename && (
                          <p
                            className={`mt-3 truncate text-xs ${subtleClass}`}
                          >
                            {
                              filename
                            }
                          </p>
                        )}
                      </div>
                    </article>
                  );
                },
              )}
            </div>

            <div
              className={`sticky bottom-4 mt-8 flex flex-col gap-4 rounded-[1.4rem] border p-4 shadow-2xl backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between ${
                dark
                  ? "border-white/[0.1] bg-[#121012]/90 shadow-black/40"
                  : "border-[#4d392f]/10 bg-[#fffaf5]/90 shadow-[#593c30]/15"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e36d4c]/15 text-[#e36d4c]">
                  <SparkIcon />
                </div>

                <div>
                  <p className="font-black">
                    {
                      clips.length
                    }{" "}
                    clips ready
                  </p>

                  <p
                    className={`mt-0.5 text-xs ${mutedClass}`}
                  >
                    Export all generated clips
                    as one ZIP archive.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={
                  isExportingAll
                }
                onClick={
                  handleExportAll
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-[#d89b48] px-7 py-3.5 font-black text-[#26190e] transition hover:bg-[#e2a955] disabled:opacity-40"
              >
                <DownloadIcon />

                {isExportingAll
                  ? "Rendering…"
                  : `Export all ${clips.length} clips`}
              </button>
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* FOOTER                                                           */}
        {/* ================================================================ */}

        <footer
          className={`mt-20 border-t py-9 ${
            dark
              ? "border-white/[0.07]"
              : "border-[#4d392f]/10"
          }`}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div
              className={`flex items-center gap-2 text-xs font-black tracking-[0.08em] ${mutedClass}`}
            >
              <span className="text-[#e36d4c]">
                <LogoIcon />
              </span>

              CLIPFORGE
            </div>

            <div
              className={`flex flex-wrap gap-x-5 gap-y-2 text-xs ${mutedClass}`}
            >
              <span>FastAPI</span>
              <span>OpenCV</span>
              <span>FFmpeg</span>
              <span>Next.js</span>
            </div>
          </div>

          <div
            className={`mt-6 flex items-center justify-center gap-2 text-xs ${subtleClass}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#e36d4c]" />

            Local video processing with
            FFmpeg + OpenCV
          </div>
        </footer>
      </div>
    </main>
  );
}