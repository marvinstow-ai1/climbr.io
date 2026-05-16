import { useEffect, useState } from "react";
import { useSession } from "../../lib/useSession";
import { useToast } from "../../components/Toast";
import { SeoLayout } from "../../components/seo/SeoLayout";
import { getReport, type ReportPayload } from "../../lib/seoApi";

export default function SeoReports() {
  return (
    <SeoLayout
      title="Fortschritt"
      subtitle="Was hat sich diesen Monat verändert? Auf Deutsch, ohne Fachjargon."
    >
      {(projectId) => (projectId ? <ReportBody projectId={projectId} /> : null)}
    </SeoLayout>
  );
}

function ReportBody({ projectId }: { projectId: string }) {
  const session = useSession();
  const toast = useToast();
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session.loading || !session.token) return;
    setLoading(true);
    void (async () => {
      try {
        setReport(await getReport(session.token!, projectId));
      } catch (e) {
        toast.push("error", e instanceof Error ? e.message : "Bericht konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.loading, session.token, projectId]);

  if (loading || !report) return <div className="text-ink-muted">Lade Bericht…</div>;

  const m = report.metrics;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-bg-raised/60 p-5">
        <div className="text-xs uppercase tracking-wide text-ink-muted">{formatPeriod(report.period)}</div>
        <h2 className="mt-2 text-lg text-ink leading-relaxed">{report.summary}</h2>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Klicks (28 T.)"
          value={m.clicks?.toLocaleString("de-DE") ?? "–"}
          delta={m.delta?.clicks ?? null}
        />
        <MetricCard
          label="Impressionen (28 T.)"
          value={m.impressions?.toLocaleString("de-DE") ?? "–"}
          delta={m.delta?.impressions ?? null}
        />
        <MetricCard
          label="Klickrate"
          value={m.ctr != null ? `${(m.ctr * 100).toFixed(1)}%` : "–"}
        />
        <MetricCard
          label="Ø Position"
          value={m.avgPosition != null ? m.avgPosition.toFixed(1) : "–"}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SmallStat
          label="Aufgaben erledigt"
          value={`${m.tasksDone} / ${m.tasksTotal}`}
          hint={`${m.completionRate}% abgeschlossen`}
        />
        <SmallStat
          label="Keywords verbessert"
          value={String(m.keywordImproved)}
          hint={m.keywordDeclined > 0 ? `${m.keywordDeclined} verschlechtert` : "ohne Verschlechterung"}
        />
        <SmallStat
          label="Offene Aufgaben"
          value={String(m.tasksOpen)}
          hint={m.tasksOpen === 0 ? "alles abgearbeitet" : "warten auf dich"}
        />
      </section>

      {report.previous && (
        <section className="rounded-lg border border-line bg-bg-raised/40 p-4 text-sm text-ink-muted">
          Vergleichsdaten aus dem letzten Bericht sind verfügbar – Veränderungen sind in den
          Kennzahlen oben mit ↑/↓ markiert.
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="rounded-lg border border-line bg-bg-raised/60 p-4">
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
      {delta != null && delta !== 0 && (
        <div className={`mt-1 text-xs ${delta > 0 ? "text-accent" : "text-red-300"}`}>
          {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toLocaleString("de-DE")}
        </div>
      )}
    </div>
  );
}

function SmallStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg-raised/40 p-4">
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{hint}</div>
    </div>
  );
}

function formatPeriod(period: string): string {
  const [y, m] = period.split("-");
  const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const idx = Math.max(0, Math.min(11, parseInt(m ?? "1", 10) - 1));
  return `${months[idx] ?? ""} ${y ?? ""}`;
}
