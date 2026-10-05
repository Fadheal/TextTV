import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Copy,
  Check,
  Monitor,
  LockKeyhole,
  LogOut,
  Wifi,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const STORAGE_TEXT = "texttv.displayText";
const STORAGE_PIN = "texttv.pin";
const STORAGE_AUTH = "texttv.auth";

function hashPin(pin: string) {
  let hash = 2166136261;
  for (let i = 0; i < pin.length; i++) {
    hash ^= pin.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function getText() {
  return localStorage.getItem(STORAGE_TEXT) ?? "";
}

function useSyncedText() {
  const [text, setText] = useState(getText);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/text")
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load display text");
        return response.json() as Promise<{ text: string }>;
      })
      .then((data) => {
        if (!active) return;
        setText(data.text);
        localStorage.setItem(STORAGE_TEXT, data.text);
      })
      .catch(() => setConnected(false));

    const events = new EventSource("/api/events");
    events.onopen = () => setConnected(true);
    events.onerror = () => setConnected(false);
    events.onmessage = (event) => {
      const data = JSON.parse(event.data) as { text: string };
      setText(data.text);
      localStorage.setItem(STORAGE_TEXT, data.text);
    };

    return () => {
      active = false;
      events.close();
    };
  }, []);

  return [text, setText, connected] as const;
}

function PinScreen({
  setup,
  onSuccess,
}: {
  setup: boolean;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (pin.length < 4) {
      setError("Use at least 4 digits.");
      return;
    }

    if (setup) {
      localStorage.setItem(STORAGE_PIN, hashPin(pin));
      localStorage.setItem(STORAGE_AUTH, "1");
      onSuccess();
      return;
    }

    if (hashPin(pin) === localStorage.getItem(STORAGE_PIN)) {
      localStorage.setItem(STORAGE_AUTH, "1");
      onSuccess();
    } else {
      setError("Incorrect PIN.");
      setPin("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <section className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Monitor size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TextTV</h1>
          <p className="mt-1 text-sm text-slate-500">
            {setup
              ? "Create a PIN for the admin dashboard."
              : "Enter your admin PIN."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-2 block text-sm font-medium">PIN</label>
          <input
            autoFocus
            inputMode="numeric"
            type="password"
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-xl tracking-[0.5em] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            placeholder="••••"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            onClick={submit}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[.99]"
          >
            <LockKeyhole size={17} />
            {setup ? "Create PIN" : "Continue"}
          </button>
        </div>
      </section>
    </main>
  );
}

function Admin() {
  const [text, setText, connected] = useSyncedText();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ip, setIp] = useState("Loading...");
  const [syncError, setSyncError] = useState("");

  const displayUrl = useMemo(() => `${window.location.origin}/display`, []);

  useEffect(() => {
    setIp(window.location.hostname || "localhost");
  }, []);

  async function updateDisplay() {
    setSyncError("");
    try {
      const response = await fetch("/api/text", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("Update failed");
      localStorage.setItem(STORAGE_TEXT, text);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setSyncError("Sync server unavailable. Check that TextTV is running.");
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function logout() {
    localStorage.removeItem(STORAGE_AUTH);
    window.location.reload();
  }

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
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={16} />
            Sign out
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
                  className={`text-xs ${connected ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {connected
                    ? "Sync server connected"
                    : "Connecting to sync server…"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                This text appears on every connected display.
              </p>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type something to display..."
              className="min-h-52 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-base leading-7 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-400">
                {syncError || `${text.length} characters`}
              </span>
              <div className="flex gap-2">
                <a
                  href="/display"
                  target="_blank"
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
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black p-5 text-center text-2xl font-bold leading-tight text-white sm:text-3xl">
              {text || <span className="text-white/20">No text</span>}
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
              Open this URL on any device that can reach the TextTV server.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Connection Information</h2>
            <div className="mt-4 space-y-3">
              <InfoRow label="Local IP / Host" value={ip} />
              <InfoRow label="Port" value={window.location.port || "80"} />
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
              TextTV runs its own sync server. Devices on other networks need a
              private VPN or another secure route to this server.
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
  const [text] = useSyncedText();

  async function fullscreen() {
    try {
      if (!document.fullscreenElement)
        await document.documentElement.requestFullscreen();
    } catch {}
  }

  useEffect(() => {
    const timer = window.setTimeout(fullscreen, 400);
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "f") fullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <main
      className="tv-page"
      onDoubleClick={fullscreen}
      title="Press F for fullscreen"
    >
      <div className={`tv-text ${!text ? "tv-empty" : ""}`}>
        {text || "Waiting for display text..."}
      </div>
    </main>
  );
}

export default function App() {
  const path = window.location.pathname;

  if (path === "/display") return <Display />;

  const setup = !localStorage.getItem(STORAGE_PIN);
  const [authenticated, setAuthenticated] = useState(
    localStorage.getItem(STORAGE_AUTH) === "1",
  );

  if (!authenticated) {
    return <PinScreen setup={setup} onSuccess={() => setAuthenticated(true)} />;
  }

  return <Admin />;
}
