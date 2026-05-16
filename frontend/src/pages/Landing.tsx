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
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-ink-muted backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-glow-sm" />
          Free tier · No card required
        </div>

        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
          SEO audit in{" "}
          <span className="text-accent">60 seconds</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base text-ink-muted">
          AI-powered SEO audits for small shops and freelancers. Get a prioritized
          fix list with quick wins — no signup required to start.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 flex max-w-xl flex-col gap-2 sm:flex-row"
        >
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

        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        {phase === "running" && (
          <p className="mt-6 text-sm text-ink-muted">
            Checking your site (30–90s) — sit tight.
          </p>
        )}

        <p className="mt-10 text-xs text-ink-subtle">
          3 audits / month free · Hosted in the EU
        </p>
      </section>

      {phase === "preview" && preview && (
        <section className="mx-auto max-w-3xl px-6 pb-24">
          <div className="card-elevated">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                  SEO score
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-ink">
                  {preview.score}
                  <span className="text-2xl text-ink-subtle">/100</span>
                </p>
              </div>
              <button
                onClick={() => setShowEmail(true)}
                className="btn-primary"
              >
                Unlock full report
              </button>
            </div>

            <p className="mt-5 text-sm text-ink-muted">{preview.preview.summary}</p>

            <div className="mt-8">
              <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                Top fixes (preview)
              </h2>
              <div className="mt-3 space-y-3">
                {preview.preview.topFixes.map((fix, i) => (
                  <FixCard key={i} fix={fix} />
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-accent/20 bg-accent-dim p-4 text-sm text-ink">
              <strong className="font-medium text-accent">Almost done.</strong>{" "}
              <span className="text-ink-muted">
                Enter your email to unlock the complete report — all fixes, quick
                wins, and copy-paste examples.
              </span>
              <button
                onClick={() => setShowEmail(true)}
                className="ml-2 font-medium text-accent underline-offset-4 hover:underline"
              >
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
