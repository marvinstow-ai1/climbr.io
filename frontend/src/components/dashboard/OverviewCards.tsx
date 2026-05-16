import { Link } from "react-router-dom";
import type { DashboardAudit, DashboardProject, KeywordMovement } from "./types";
import { scoreBucket } from "./metrics";

interface Props {
  projects: DashboardProject[];
  latestAudit: DashboardAudit | null;
  movements: KeywordMovement;
}

export function OverviewCards({ projects, latestAudit, movements }: Props) {
  return (
    <div
      data-testid="overview-cards"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <Card title="Projekte">
        <div className="text-3xl font-bold text-ink">{projects.length}</div>
        <div className="mt-1 text-sm text-ink-muted">
          {projects.length === 1 ? "aktives Projekt" : "aktive Projekte"}
        </div>
        <Link
          to="/projects/new"
          className="mt-3 inline-flex text-sm font-medium text-accent hover:underline"
        >
          + Neues Projekt
        </Link>
      </Card>

      <Card title="Letzter Audit">
        {latestAudit && latestAudit.score != null ? (
          <>
            <ScoreBadge score={latestAudit.score} />
            <div className="mt-1 truncate text-sm text-ink-muted">{latestAudit.url}</div>
            <div className="mt-2 text-xs text-ink-muted">
              {new Date(latestAudit.created_at).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
            <Link
              to={`/audit/${latestAudit.id}`}
              className="mt-3 inline-flex text-sm font-medium text-accent hover:underline"
            >
              Report öffnen →
            </Link>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            Noch kein Audit gelaufen. Leg ein Projekt an und starte deinen ersten Check.
          </p>
        )}
      </Card>

      <Card title="Keyword-Bewegungen (7 Tage)">
        {movements.positive === 0 && movements.negative === 0 ? (
          <p className="text-sm text-ink-muted">
            Noch keine Keyword-Daten. Füge Keywords zu einem Projekt hinzu.
          </p>
        ) : (
          <div className="flex items-baseline gap-4">
            <div>
              <div
                className="text-2xl font-bold text-accent"
                data-testid="movement-positive"
              >
                ▲ {movements.positive}
              </div>
              <div className="text-xs text-ink-muted">nach oben</div>
            </div>
            <div>
              <div
                className="text-2xl font-bold text-red-400"
                data-testid="movement-negative"
              >
                ▼ {movements.negative}
              </div>
              <div className="text-xs text-ink-muted">nach unten</div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const bucket = scoreBucket(score);
  const klass =
    bucket === "good"
      ? "bg-accent-dim text-accent"
      : bucket === "ok"
        ? "bg-amber-500/10 text-amber-300"
        : "bg-red-500/10 text-red-300";
  return (
    <span
      data-testid="latest-audit-score"
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xl font-bold ${klass}`}
    >
      {score}
    </span>
  );
}
