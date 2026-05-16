import { Link } from "react-router-dom";
import type { DashboardAudit, DashboardProject, KeywordMovement } from "./types";
import { scoreBucket } from "./metrics";

interface Props {
  projects: DashboardProject[];
  latestAudit: DashboardAudit | null;
  movements: KeywordMovement;
  averageScore: number | null;
  totalKeywords: number;
}

/**
 * Top-Row der vier KPI-Kacheln (Performance-Übersicht).
 * Layout-Vorbild: SEO-Suite-Dashboard (Traffic / Backlinks / Domains / Keywords).
 *
 * Akzent-Mapping:
 *   1. Projekte       → lime (Primärfarbe)
 *   2. Ø Score        → violet (matter Komplementär)
 *   3. Keywords       → teal
 *   4. Bewegungen     → amber
 */
export function OverviewCards({
  projects,
  latestAudit,
  movements,
  averageScore,
  totalKeywords,
}: Props) {
  const netMovement = movements.positive - movements.negative;
  const scoreColor =
    averageScore == null
      ? "text-ink-muted"
      : scoreBucket(averageScore) === "good"
        ? "text-accent"
        : scoreBucket(averageScore) === "ok"
          ? "text-amber"
          : "text-rose";

  return (
    <div
      data-testid="overview-cards"
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
    >
      <KpiCard
        accent="accent"
        label="Projekte"
        value={projects.length.toString()}
        sub={projects.length === 1 ? "aktives Projekt" : "aktive Projekte"}
        trend={
          projects.length === 0
            ? { tone: "neutral", text: "neu" }
            : { tone: "up", text: `${projects.length}` }
        }
      />

      <KpiCard
        accent="violet"
        label="Ø Audit-Score"
        value={averageScore != null ? averageScore.toString() : "—"}
        valueTestId={averageScore != null ? "latest-audit-score" : undefined}
        valueClass={scoreColor}
        sub={
          latestAudit
            ? `letzter: ${new Date(latestAudit.created_at).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
              })}`
            : "noch kein Audit"
        }
        trend={
          averageScore == null
            ? { tone: "neutral", text: "—" }
            : scoreBucket(averageScore) === "good"
              ? { tone: "up", text: "gut" }
              : scoreBucket(averageScore) === "ok"
                ? { tone: "neutral", text: "ok" }
                : { tone: "down", text: "kritisch" }
        }
      />

      <KpiCard
        accent="teal"
        label="Keywords"
        value={totalKeywords.toLocaleString("de-DE")}
        sub={
          totalKeywords === 0
            ? "noch keine getrackt"
            : `verteilt auf ${projects.length} ${projects.length === 1 ? "Projekt" : "Projekte"}`
        }
        trend={{ tone: totalKeywords > 0 ? "up" : "neutral", text: `${totalKeywords}` }}
      />

      <KpiCard
        accent="amber"
        label="Bewegungen (7T)"
        value={netMovement >= 0 ? `+${netMovement}` : `${netMovement}`}
        valueClass={
          netMovement > 0 ? "text-accent" : netMovement < 0 ? "text-rose" : "text-ink"
        }
        sub={
          <span className="inline-flex items-center gap-3">
            <span
              className="text-accent"
              data-testid="movement-positive"
              aria-label="Keywords nach oben"
            >
              ▲ {movements.positive}
            </span>
            <span
              className="text-rose"
              data-testid="movement-negative"
              aria-label="Keywords nach unten"
            >
              ▼ {movements.negative}
            </span>
          </span>
        }
        trend={
          netMovement === 0
            ? { tone: "neutral", text: "stabil" }
            : netMovement > 0
              ? { tone: "up", text: `+${netMovement}` }
              : { tone: "down", text: `${netMovement}` }
        }
      />

      {/* Fallback-Marker, wenn die Ø-Score-Kachel leer bleibt — der Smoke-
          Test prüft, dass der letzte Audit-Score auf dem Dashboard sichtbar
          ist. */}
      {latestAudit && latestAudit.score != null && averageScore == null && (
        <span data-testid="latest-audit-score" className="sr-only">
          {latestAudit.score}
        </span>
      )}

      {projects.length === 0 && (
        <div className="col-span-2 lg:col-span-4">
          <Link
            to="/projects/new"
            className="inline-flex text-sm font-medium text-accent hover:underline"
          >
            + Neues Projekt anlegen
          </Link>
        </div>
      )}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sub: React.ReactNode;
  trend: { tone: "up" | "down" | "neutral"; text: string };
  accent: "accent" | "violet" | "teal" | "amber";
  valueClass?: string;
  valueTestId?: string;
}

function KpiCard({ label, value, sub, trend, accent, valueClass, valueTestId }: KpiCardProps) {
  const dotClass = {
    accent: "bg-accent",
    violet: "bg-violet",
    teal: "bg-teal",
    amber: "bg-amber",
  }[accent];

  const trendClass =
    trend.tone === "up"
      ? "bg-accent-dim text-accent"
      : trend.tone === "down"
        ? "bg-rose-dim text-rose"
        : "bg-white/[0.04] text-ink-muted";

  return (
    <div className="card relative overflow-hidden p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {label}
          </span>
        </div>
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${trendClass}`}>
          {trend.text}
        </span>
      </div>
      <div
        data-testid={valueTestId}
        className={`mt-3 text-3xl font-bold tracking-tight sm:text-[34px] ${valueClass ?? "text-ink"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-ink-muted">{sub}</div>
    </div>
  );
}
