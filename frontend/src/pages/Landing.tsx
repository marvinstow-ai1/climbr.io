import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { runAudit, type AuditPreview } from "../lib/api";
import EmailCaptureModal from "../components/EmailCaptureModal";
import FixCard from "../components/FixCard";

type Phase = "idle" | "running" | "preview" | "captured";

export default function Landing() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AuditPreview | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) return;
    setPhase("running");
    try {
      const res = await runAudit({ url: url.trim() });
      setPreview(res);
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("idle");
    }
  }

  async function handleEmailCapture(email: string) {
    if (!preview) return;
    // Re-run with email so we link the audit to the capture_email shadow column.
    // For Phase 1 the audit is already saved; we use a follow-up POST so the
    // user can then unlock the full report via /api/audit/[id]?email=...
    await fetch("/api/audit/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, email }),
    });
    setShowEmail(false);
    setPhase("captured");
    navigate(`/audit/${preview.auditId}?email=${encodeURIComponent(email)}`);
  }

  return (
    <>
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-12 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-ink sm:text-6xl">
          SEO audit in <span className="text-primary">60 seconds</span>
        </h1>
        <p className="mt-5 text-lg text-slate2">
          AI-powered SEO audits for small shops and freelancers. Get a prioritized
          fix list with quick wins — no signup required to start.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="url"
            inputMode="url"
            placeholder="https://your-shop.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input sm:flex-1"
            required
            disabled={phase === "running"}
          />
          <button type="submit" className="btn-primary" disabled={phase === "running"}>
            {phase === "running" ? "Auditing…" : "Run free audit"}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {phase === "running" && (
          <p className="mt-6 text-sm text-slate2">
            Checking your site (may take 30–90s) — grab a coffee ☕
          </p>
        )}

        <p className="mt-8 text-xs text-slate2">
          Free tier: 3 audits / month. Data hosted in the EU. No card required.
        </p>
      </section>

      {phase === "preview" && preview && (
        <section className="mx-auto max-w-3xl px-6 pb-20">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate2">SEO score</p>
                <p className="text-4xl font-bold text-ink">{preview.score}<span className="text-xl text-slate2">/100</span></p>
              </div>
              <button
                onClick={() => setShowEmail(true)}
                className="btn-primary"
              >
                Unlock full report
              </button>
            </div>
            <p className="mt-4 text-slate2">{preview.preview.summary}</p>
            <div className="mt-6 space-y-4">
              <h2 className="text-lg font-semibold">Top fixes (preview)</h2>
              {preview.preview.topFixes.map((fix, i) => (
                <FixCard key={i} fix={fix} />
              ))}
            </div>
            <div className="mt-6 rounded-lg bg-sunset-50 p-4 text-sm">
              <strong>Almost done.</strong> Enter your email to unlock the
              complete report — including all fixes, quick wins, and exact
              examples to copy-paste.
              <button onClick={() => setShowEmail(true)} className="ml-2 underline">
                Get full report
              </button>
            </div>
          </div>
        </section>
      )}

      <EmailCaptureModal
        open={showEmail}
        onClose={() => setShowEmail(false)}
        onSubmit={handleEmailCapture}
      />
    </>
  );
}
