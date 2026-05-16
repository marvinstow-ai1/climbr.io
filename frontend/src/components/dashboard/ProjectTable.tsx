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
    <div className="overflow-x-auto rounded-xl border border-line bg-white/[0.03] backdrop-blur-md shadow-sm">
      <table className="w-full text-sm" data-testid="project-table">
        <thead className="border-b border-line bg-white/[0.02] text-xs uppercase tracking-wider text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-semibold">Domain</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">Score</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">Keywords</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">Letzter Audit</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Aktion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ project, latestAudit, keywordCount }) => {
            const busy = busyProjectId === project.id;
            return (
              <tr key={project.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <Link
                    to={`/projects/${project.id}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {project.domain}
                  </Link>
                  {project.gsc_connected && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-ink-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
                      GSC
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {latestAudit && latestAudit.score != null ? (
                    <ScorePill score={latestAudit.score} />
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">{keywordCount}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {latestAudit
                    ? new Date(latestAudit.created_at).toLocaleDateString("de-DE")
                    : "noch keiner"}
                </td>
                <td className="px-4 py-3 text-right">
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
                            className="text-xs text-accent hover:underline disabled:opacity-50"
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
  );
}

function ScorePill({ score }: { score: number }) {
  const bucket = scoreBucket(score);
  const klass =
    bucket === "good"
      ? "bg-accent-dim text-accent"
      : bucket === "ok"
        ? "bg-amber-500/10 text-amber-300"
        : "bg-red-500/10 text-red-300";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold ${klass}`}
    >
      {score}
    </span>
  );
}
