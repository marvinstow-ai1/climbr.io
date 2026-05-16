import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getAudit, type FullAudit } from "../lib/api";
import FixCard from "../components/FixCard";
import { ExplainerBox } from "../components/learning/ExplainerBox";
import { NextStepCTA } from "../components/learning/NextStepCTA";
import { WikiLink } from "../components/learning/WikiLink";
import { LEARNING_ENTRIES } from "../data/learning";
import { scoreBucket, scoreLabel } from "../components/dashboard/metrics";

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
      .catch((e) => setError(e instanceof Error ? e.message : "Konnte den Audit nicht laden."));
  }, [id, email]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-red-600" role="alert">Fehler: {error}</p>
      </div>
    );
  }
  if (!audit) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-slate2">Lade Audit…</p>
      </div>
    );
  }

  const report = audit.ai_report_json;
  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-slate2">Status: {audit.status}. Bericht ist noch nicht fertig.</p>
      </div>
    );
  }

  const score = audit.score ?? report.score;
  const bucket = scoreBucket(score);
  const seoScoreEntry = LEARNING_ENTRIES["seo-score"]!;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <header>
        <p className="text-sm text-slate2">Audit für</p>
        <h1 className="break-all text-2xl font-bold">{audit.url}</h1>
      </header>

      <section className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-slate2">SEO-Score</p>
          <p className="text-5xl font-bold" data-testid="audit-score">
            {score}
            <span className="text-xl text-slate2">/100</span>
          </p>
          <p className="mt-1 text-sm text-slate2">{scoreLabel(bucket)}</p>
        </div>
        <div className="text-right text-xs text-slate2">
          <p>Modell: {report.model}</p>
          <p>{new Date(report.generatedAt).toLocaleString("de-DE")}</p>
        </div>
      </section>

      <ExplainerBox
        storageKey={seoScoreEntry.key}
        title={seoScoreEntry.title}
        explanation={seoScoreEntry.what}
        whyItMatters={seoScoreEntry.whyItMatters}
        nextStep={seoScoreEntry.nextStep}
      />

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Zusammenfassung</h2>
        <p className="text-slate2">{report.summary}</p>
      </section>

      {report.quickWins.length > 0 && (
        <section className="space-y-3">
          <div className="card">
            <h2 className="mb-3 text-lg font-semibold">Quick Wins (≤ 10 Min.)</h2>
            <ul className="list-disc space-y-1 pl-5 text-slate2">
              {report.quickWins.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
          <NextStepCTA testId="quick-wins-cta">
            Du hast die Quick Wins umgesetzt? Starte in 2 Wochen einen neuen Audit
            und sieh den Unterschied — kleine Verbesserungen werden bei Google in
            der Regel innerhalb von 1–3 Wochen sichtbar.
          </NextStepCTA>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top-Fixes</h2>
        {report.topFixes.map((fix, i) => (
          <FixCard key={i} fix={fix} />
        ))}
        <NextStepCTA testId="top-fixes-cta" title="Wie gehst du vor?">
          Arbeite die Liste von oben nach unten ab — die ersten Punkte haben den
          größten Effekt. Für jeden Begriff den du nicht kennst, gibt es einen
          passenden Wiki-Artikel: <WikiLink slug="title-tag">Title Tag</WikiLink>,{" "}
          <WikiLink slug="meta-description">Meta-Description</WikiLink>,{" "}
          <WikiLink slug="alt-text">Alt-Texte</WikiLink>.
        </NextStepCTA>
      </section>

      {report.furtherReading.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">Weiterlesen</h2>
          <ul className="space-y-1 text-sm">
            {report.furtherReading.map((r, i) => (
              <li key={i}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
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
