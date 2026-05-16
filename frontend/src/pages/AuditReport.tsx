import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getAudit, type FullAudit } from "../lib/api";
import FixCard from "../components/FixCard";

export default function AuditReport() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const email = params.get("email") ?? undefined;

  const [audit, setAudit] = useState<FullAudit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getAudit(id, { email })
      .then(setAudit)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id, email]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-red-400">Error: {error}</p>
      </div>
    );
  }
  if (!audit) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-ink-muted">Loading audit…</p>
      </div>
    );
  }

  const report = audit.ai_report_json;
  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-ink-muted">Status: {audit.status}. Report not yet ready.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Audit for</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink break-all">{audit.url}</h1>
      </header>

      <section className="card-elevated flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">SEO score</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight text-ink">
            {audit.score ?? report.score}
            <span className="text-2xl text-ink-subtle">/100</span>
          </p>
        </div>
        <div className="text-right text-xs text-ink-subtle">
          <p>{report.model}</p>
          <p className="mt-0.5">{new Date(report.generatedAt).toLocaleString()}</p>
        </div>
      </section>

      <section className="card">
        <p className="text-sm text-ink-muted">{report.summary}</p>
      </section>

      {report.quickWins.length > 0 && (
        <section className="card">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">Quick wins (≤ 10 min)</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted marker:text-accent">
            {report.quickWins.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">Top fixes</h2>
        {report.topFixes.map((fix, i) => <FixCard key={i} fix={fix} />)}
      </section>

      {report.furtherReading.length > 0 && (
        <section className="card">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">Further reading</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {report.furtherReading.map((r, i) => (
              <li key={i}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-4 hover:underline">
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
