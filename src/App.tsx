import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { upload } from "@vercel/blob/client";
import {
  Check,
  Copy,
  ExternalLink,
  Film,
  LockKeyhole,
  LogOut,
  Monitor,
  Trash2,
  Upload,
  Wifi,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  adminPin,
  isAdminPinConfigured,
  isSupabaseConfigured,
  supabase,
} from "./lib/supabase";

function useSyncedText() {
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(100);
  const [videoUrl, setVideoUrl] = useState("");
  const [connection, setConnection] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  useEffect(() => {
    if (!supabase) {
      setConnection("disconnected");
      return;
    }

    let active = true;
    void supabase
      .from("display_state")
      .select("text, font_size, video_url")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setConnection("disconnected");
          return;
        }
        setText(data.text);
        setFontSize(data.font_size);
        setVideoUrl(data.video_url ?? "");
      });

    const channel = supabase
      .channel("display-state")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "display_state",
          filter: "id=eq.1",
        },
        (payload) => {
          const updatedText = payload.new.text;
          if (typeof updatedText === "string") setText(updatedText);
          const updatedFontSize = payload.new.font_size;
          if (typeof updatedFontSize === "number") {
            setFontSize(updatedFontSize);
          }
          const updatedVideoUrl = payload.new.video_url;
          if (typeof updatedVideoUrl === "string" || updatedVideoUrl === null) {
            setVideoUrl(updatedVideoUrl ?? "");
          }
        },
      )
      .subscribe((status) => {
        if (!active) return;
        setConnection(status === "SUBSCRIBED" ? "connected" : "disconnected");
      });

    return () => {
      active = false;
      void supabase?.removeChannel(channel);
    };
  }, []);

  return [
    text,
    setText,
    fontSize,
    setFontSize,
    videoUrl,
    setVideoUrl,
    connection,
  ] as const;
}

function SupabaseSetup() {
  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-950">
      <section className="mx-auto mt-16 max-w-xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Wifi size={21} />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Connect TextTV to Supabase</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Add your Supabase project URL and publishable/anon key to the local
          environment, then run the SQL setup in{" "}
          <strong>supabase/schema.sql</strong>.
        </p>
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Required variables: <strong>VITE_SUPABASE_URL</strong>,{" "}
          <strong>VITE_SUPABASE_ANON_KEY</strong>, and{" "}
          <strong>VITE_ADMIN_PIN</strong>.
        </p>
      </section>
    </main>
  );
}

function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminPin) return;
    if (pin === adminPin) {
      setError("");
      onSuccess();
      return;
    }
    setError("Incorrect PIN.");
    setPin("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <section className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Monitor size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TextTV</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your PIN to open the admin dashboard.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="mb-2 block text-sm font-medium" htmlFor="pin">
            Admin PIN
          </label>
          <input
            id="pin"
            autoFocus
            autoComplete="current-password"
            inputMode="numeric"
            pattern="[0-9]*"
            type="password"
            required
            maxLength={8}
            value={pin}
            onChange={(event) =>
              setPin(event.target.value.replace(/\D/g, "").slice(0, 8))
            }
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-xl tracking-[0.5em] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            placeholder="••••••"
          />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <LockKeyhole size={17} />
            Continue
          </button>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            This PIN is a basic dashboard screen lock, not secure account
            authentication.
          </p>
        </form>
      </section>
    </main>
  );
}

function AdminGate() {
  const [unlocked, setUnlocked] = useState(false);

  if (!isSupabaseConfigured || !isAdminPinConfigured) return <SupabaseSetup />;
  if (!unlocked) return <PinScreen onSuccess={() => setUnlocked(true)} />;

  return <Admin onLock={() => setUnlocked(false)} />;
}

function Admin({ onLock }: { onLock: () => void }) {
  const [
    text,
    setText,
    fontSize,
    setFontSize,
    videoUrl,
    setVideoUrl,
    connection,
  ] = useSyncedText();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const displayUrl = useMemo(() => `${window.location.origin}/display`, []);

  async function updateDisplay() {
    if (!supabase) return;
    setSyncError("");
    const { data, error } = await supabase
      .from("display_state")
      .update({
        text,
        font_size: fontSize,
        video_url: videoUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .select("id")
      .maybeSingle();
    if (error) {
      setSyncError(error.message);
      return;
    }
    if (!data) {
      setSyncError(
        "No row was updated. Run the current supabase/schema.sql in your Supabase SQL Editor.",
      );
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function uploadVideo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Choose an MP4, WebM, or MOV video.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setUploadError("Videos must be 500 MB or smaller.");
      return;
    }
    if (!adminPin) {
      setUploadError("Configure the admin PIN before uploading videos.");
      return;
    }

    setUploadError("");
    setUploadProgress(0);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const blob = await upload(`videos/${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/video-upload",
        clientPayload: adminPin,
        multipart: true,
        onUploadProgress: ({ percentage }) =>
          setUploadProgress(Math.round(percentage)),
      });
      setVideoUrl(blob.url);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Video upload failed.",
      );
    } finally {
      setUploadProgress(null);
    }
  }

  const connectionLabel =
    connection === "connected"
      ? "Realtime Service connected"
      : connection === "disconnected"
        ? "Realtime Service connection unavailable"
        : "Connecting to Realtime Service...";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Monitor size={19} />
            </div>
            <div>
              <div className="font-bold leading-none">TextTV</div>
              <div className="mt-1 text-xs text-slate-500">Admin Dashboard</div>
            </div>
          </div>
          <button
            onClick={onLock}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={16} />
            Lock dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-5 py-6">
        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Display Text</h2>
                <span
                  className={`text-xs ${connection === "connected" ? "text-emerald-600" : connection === "disconnected" ? "text-red-600" : "text-amber-600"}`}
                >
                  {connectionLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                This text appears on every connected display.
              </p>
            </div>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type something to display..."
              className="min-h-52 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-base leading-7 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="display-font-size"
                  className="text-sm font-medium"
                >
                  Display font size
                </label>
                <span className="text-sm font-semibold text-blue-700">
                  {fontSize}%
                </span>
              </div>
              <input
                id="display-font-size"
                type="range"
                min={50}
                max={200}
                step={5}
                value={fontSize}
                onChange={(event) =>
                  setFontSize(event.currentTarget.valueAsNumber)
                }
                className="w-full accent-blue-600"
                aria-label="Display font size percentage"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>50%</span>
                <span>200%</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-400">
                {syncError || `${text.length} characters`}
              </span>
              <div className="flex gap-2">
                <a
                  href="/display"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50"
                >
                  <ExternalLink size={16} />
                  Open Display
                </a>
                <button
                  onClick={updateDisplay}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {saved ? <Check size={16} /> : <Monitor size={16} />}
                  {saved ? "Updated" : "Update Display"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-semibold">Live Preview</h2>
              <p className="mt-1 text-sm text-slate-500">
                Approximate TV appearance.
              </p>
            </div>
            <div
              className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black p-5 text-center font-bold leading-tight text-white"
              style={{ fontSize: `${1.5 * (fontSize / 100)}rem` }}
            >
              {videoUrl && (
                <video
                  className="absolute inset-0 size-full object-cover"
                  src={videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}
              <span className="relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {text || <span className="text-white/70">No text</span>}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">
                  {uploadProgress === null ? (
                    <Upload size={16} />
                  ) : (
                    <Film size={16} />
                  )}
                  {uploadProgress === null
                    ? videoUrl
                      ? "Replace video"
                      : "Upload video"
                    : `Uploading ${uploadProgress}%`}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(event) => void uploadVideo(event)}
                    disabled={uploadProgress !== null}
                    className="sr-only"
                  />
                </label>
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => setVideoUrl("")}
                    className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                MP4, WebM, or MOV · up to 500 MB. The video loops silently on
                the display.
              </p>
              {uploadError && (
                <p className="mt-2 text-xs text-red-600">{uploadError}</p>
              )}
              {videoUrl && !uploadError && (
                <p className="mt-2 truncate text-xs text-emerald-700">
                  Video ready. Click Update Display to publish it.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 self-start font-semibold">
              <Wifi size={17} className="text-blue-600" />
              TV Connection
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-3">
              <QRCodeSVG value={displayUrl} size={190} level="M" />
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              Scan to open this display on any internet-connected device.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Display Connection</h2>
            <div className="mt-4 space-y-3">
              <InfoRow label="Sync status" value={connectionLabel} />
              <InfoRow label="Display URL" value={displayUrl} />
            </div>
            <button
              onClick={copyUrl}
              className="mt-5 flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy Display URL"}
            </button>
            <p className="mt-4 text-xs leading-5 text-slate-400">
              The display reads the shared text directly from Supabase and does
              not require the PIN.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 break-all font-mono text-sm text-slate-900">
        {value}
      </div>
    </div>
  );
}

function Display() {
  const [text, , fontSize, , videoUrl] = useSyncedText();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scale = fontSize / 100;
  const displayFontSize = text
    ? `clamp(${3 * scale}rem, ${9 * scale}vw, ${12 * scale}rem)`
    : `clamp(${1.5 * scale}rem, ${4 * scale}vw, ${4 * scale}rem)`;

  async function fullscreen() {
    try {
      if (!document.fullscreenElement)
        await document.documentElement.requestFullscreen();
      setIsFullscreen(Boolean(document.fullscreenElement));
    } catch {}
  }

  useEffect(() => {
    const updateFullscreenState = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "f") void fullscreen();
    };
    updateFullscreenState();
    void fullscreen();
    document.addEventListener("fullscreenchange", updateFullscreenState);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <main
      className="tv-page"
      onDoubleClick={fullscreen}
      title="Press F for fullscreen"
    >
      {videoUrl && (
        <video
          className="absolute inset-0 size-full object-cover"
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
        />
      )}
      <div
        className={`tv-text relative z-10 ${!text ? "tv-empty" : ""}`}
        style={{ fontSize: displayFontSize }}
      >
        {text || "Waiting for display text..."}
      </div>
      {!isFullscreen && (
        <button
          onClick={() => void fullscreen()}
          className="fixed bottom-5 right-5 rounded-xl bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur transition hover:bg-white"
        >
          Tap to enter fullscreen
        </button>
      )}
    </main>
  );
}

export default function App() {
  if (window.location.pathname === "/display") {
    return isSupabaseConfigured ? <Display /> : <SupabaseSetup />;
  }
  return <AdminGate />;
}
