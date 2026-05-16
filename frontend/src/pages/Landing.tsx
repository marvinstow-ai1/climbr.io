import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { runAudit, type AuditPreview } from "../lib/api";
import EmailCaptureModal from "../components/EmailCaptureModal";
import FixCard from "../components/FixCard";

type Phase = "idle" | "running" | "preview" | "captured";

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: "01 — Audit",
    title: "Findet, was Google sieht.",
    body:
      "Ein Klick crawlt deine Seite, prüft Title, Meta, Headings, Bilder, Performance und Strukturierte Daten — in unter 90 Sekunden.",
  },
  {
    eyebrow: "02 — Quick Wins",
    title: "Sortiert nach Impact.",
    body:
      "Statt 100 Punkte abzuhaken bekommst du eine priorisierte Liste mit den 3–5 Fixes, die wirklich messbar Ranking bringen.",
  },
  {
    eyebrow: "03 — Tracking",
    title: "Sieht dein Ranking wachsen.",
    body:
      "Verknüpfe Google Search Console und beobachte deine Keywords über die Zeit. Wir melden uns, sobald sich etwas bewegt.",
  },
];

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
      setError(err instanceof Error ? err.message : "Etwas ist schiefgelaufen.");
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
      {/* Hero */}
      <section
        id="audit"
        className="mx-auto max-w-4xl scroll-mt-24 px-6 pt-24 pb-16 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-ink-muted backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-glow-sm" />
          Free Tier · Keine Kreditkarte
        </div>

        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-ink sm:text-6xl md:text-7xl">
          Werde gefunden,{" "}
          <span className="text-accent">wo gesucht wird.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-ink-muted sm:text-lg">
          KI-gestützte SEO-Audits für kleine Shops und Freelancer. Du bekommst
          eine priorisierte Fix-Liste mit Quick Wins — ohne Account, in unter
          90 Sekunden.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl border border-line bg-white/[0.03] p-2 backdrop-blur-md sm:flex-row sm:rounded-full"
        >
          <input
            type="url"
            inputMode="url"
            placeholder="https://dein-shop.de"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-xl border-0 bg-transparent px-5 py-3 text-base text-ink placeholder:text-ink-subtle focus:outline-none sm:flex-1 sm:rounded-full"
            required
            disabled={phase === "running"}
          />
          <button
            type="submit"
            className="rounded-xl bg-accent px-6 py-3 text-sm font-medium tracking-tight text-black transition-all hover:bg-accent-hover hover:shadow-glow-sm disabled:opacity-50 sm:rounded-full"
            disabled={phase === "running"}
          >
            {phase === "running" ? "Analysiere…" : "Free Audit starten"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">{error}</p>
        )}

        {phase === "running" && (
          <p className="mt-6 text-sm text-ink-muted">
            Deine Seite wird gecrawlt (30–90 Sekunden) — einen Moment.
          </p>
        )}

        <p className="mt-10 text-xs text-ink-subtle">
          3 Audits / Monat gratis · Hosting in der EU · DSGVO-konform
        </p>
      </section>

      {/* Preview-Karte (nach abgeschlossenem Audit) */}
      {phase === "preview" && preview && (
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="card-elevated">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                  SEO-Score
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-ink">
                  {preview.score}
                  <span className="text-2xl text-ink-subtle">/100</span>
                </p>
              </div>
              <button onClick={() => setShowEmail(true)} className="btn-primary">
                Vollständigen Bericht freischalten
              </button>
            </div>

            <p className="mt-5 text-sm text-ink-muted">{preview.preview.summary}</p>

            <div className="mt-8">
              <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                Top-Fixes (Vorschau)
              </h2>
              <div className="mt-3 space-y-3">
                {preview.preview.topFixes.map((fix, i) => (
                  <FixCard key={i} fix={fix} />
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-accent/20 bg-accent-dim p-4 text-sm text-ink">
              <strong className="font-medium text-accent">Fast fertig.</strong>{" "}
              <span className="text-ink-muted">
                E-Mail eintragen und vollständigen Bericht erhalten — alle Fixes,
                Quick Wins und Copy-Paste-Beispiele.
              </span>
              <button
                onClick={() => setShowEmail(true)}
                className="ml-2 font-medium text-accent underline-offset-4 hover:underline"
              >
                Bericht öffnen
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Slide-Platzhalter — befüllt sich später mit echten Screenshots/Bildern */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
            So funktioniert's
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Drei Schritte vom Audit zum Ranking.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {SLIDES.map((slide) => (
            <article
              key={slide.eyebrow}
              className="group relative overflow-hidden rounded-2xl border border-line bg-white/[0.03] p-6 backdrop-blur-md transition-colors hover:border-line-strong hover:bg-white/[0.05]"
            >
              {/* Bild-/Screenshot-Platzhalter */}
              <div className="aspect-[4/3] w-full rounded-xl border border-line bg-gradient-to-br from-white/[0.03] to-transparent" />

              <p className="mt-5 text-xs font-medium uppercase tracking-wider text-accent">
                {slide.eyebrow}
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">
                {slide.title}
              </h3>
              <p className="mt-2 text-sm text-ink-muted">{slide.body}</p>
            </article>
          ))}
        </div>
      </section>

      <EmailCaptureModal
        open={showEmail}
        onClose={() => setShowEmail(false)}
        onSubmit={handleEmailCapture}
      />
    </>
  );
}
