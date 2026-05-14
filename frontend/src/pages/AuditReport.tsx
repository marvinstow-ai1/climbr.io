import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getAudit, type FullAudit } from "../lib/api";
import { useSession } from "../lib/useSession";
import FixCard from "../components/FixCard";

export default function AuditReport() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const email = params.get("email") ?? undefined;
  const session = useSession();

  const [audit, setAudit] = useState<FullAudit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    // Wait for the session probe to finish before firing — otherwise the
    // first call goes out tokenless and a project-bound audit 401s before
    // the auth state lands.
    if (session.loading) return;
    getAudit(id, { email, token: session.token ?? undefined })
      .then(setAudit)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id, email, session.loading, session.token]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }
  if (!audit) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-slate2">Loading audit…</p>
      </div>
    );
  }

  const report = audit.ai_report_json;
  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-slate2">Status: {audit.status}. Report not yet ready.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-6">
      <header>
        <p className="text-sm text-slate2">Audit for</p>
        <h1 className="text-2xl font-bold break-all">{audit.url}</h1>
      </header>

      <section className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-slate2">SEO score</p>
          <p className="text-5xl font-bold">{audit.score ?? report.score}<span className="text-xl text-slate2">/100</span></p>
        </div>
        <div className="text-right text-xs text-slate2">
          <p>Model: {report.model}</p>
          <p>{new Date(report.generatedAt).toLocaleString()}</p>
        </div>
      </section>

      <section className="card">
        <p className="text-slate2">{report.summary}</p>
      </section>

      {report.quickWins.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">Quick wins (≤ 10 min)</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate2">
            {report.quickWins.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top fixes</h2>
        {report.topFixes.map((fix, i) => <FixCard key={i} fix={fix} />)}
      </section>

      {report.furtherReading.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">Further reading</h2>
          <ul className="space-y-1 text-sm">
            {report.furtherReading.map((r, i) => (
              <li key={i}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
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
