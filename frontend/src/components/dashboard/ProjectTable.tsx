import { Link } from "react-router-dom";
import type { DashboardAudit, DashboardProject } from "./types";
import { scoreBucket } from "./metrics";

interface Row {
  project: DashboardProject;
  latestAudit: DashboardAudit | null;
  keywordCount: number;
}

interface Props {
  rows: Row[];
  busyProjectId?: string | null;
  onConnectGsc?: (projectId: string) => void;
  onDisconnectGsc?: (projectId: string) => void;
}

export function ProjectTable({ rows, busyProjectId, onConnectGsc, onDisconnectGsc }: Props) {
  return (
    <div className="card overflow-hidden p-0" data-testid="project-table-wrapper">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">Deine Projekte</h3>
          <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            {rows.length}
          </span>
        </div>
        <Link
          to="/projects/new"
          className="text-xs font-medium text-accent hover:underline"
        >
          + Neues Projekt
        </Link>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="project-table">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              <th scope="col" className="px-5 py-2 font-semibold">Domain</th>
              <th scope="col" className="px-3 py-2 font-semibold">Score</th>
              <th scope="col" className="px-3 py-2 font-semibold">Keywords</th>
              <th scope="col" className="hidden px-3 py-2 font-semibold md:table-cell">Letzter Audit</th>
              <th scope="col" className="px-5 py-2 text-right font-semibold">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ project, latestAudit, keywordCount }) => {
              const busy = busyProjectId === project.id;
              return (
                <tr key={project.id} className="border-t border-line">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-violet-dim text-xs font-semibold text-violet"
                        aria-hidden="true"
                      >
                        {project.domain.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <Link
                          to={`/projects/${project.id}`}
                          className="block truncate font-medium text-ink hover:text-accent"
                        >
                          {project.domain}
                        </Link>
                        {project.gsc_connected && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-teal">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden="true" />
                            GSC verbunden
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {latestAudit && latestAudit.score != null ? (
                      <ScorePill score={latestAudit.score} />
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-ink-muted">{keywordCount}</td>
                  <td className="hidden px-3 py-3 text-ink-muted md:table-cell">
                    {latestAudit
                      ? new Date(latestAudit.created_at).toLocaleDateString("de-DE")
                      : "noch keiner"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {project.gsc_connected
                        ? onDisconnectGsc && (
                            <button
                              type="button"
                              onClick={() => onDisconnectGsc(project.id)}
                              disabled={busy}
                              className="text-xs text-ink-muted hover:text-ink disabled:opacity-50"
                              data-testid={`disconnect-gsc-${project.id}`}
                            >
                              {busy ? "…" : "GSC trennen"}
                            </button>
                          )
                        : onConnectGsc && (
                            <button
                              type="button"
                              onClick={() => onConnectGsc(project.id)}
                              disabled={busy}
                              className="text-xs text-violet hover:underline disabled:opacity-50"
                              data-testid={`connect-gsc-${project.id}`}
                            >
                              {busy ? "…" : "GSC verbinden"}
                            </button>
                          )}
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        Öffnen →
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const bucket = scoreBucket(score);
  const klass =
    bucket === "good"
      ? "bg-accent-dim text-accent"
      : bucket === "ok"
        ? "bg-amber-dim text-amber"
        : "bg-rose-dim text-rose";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold ${klass}`}
    >
      {score}
    </span>
  );
}
