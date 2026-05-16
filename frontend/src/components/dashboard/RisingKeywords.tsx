import { Link } from "react-router-dom";
import { useMemo } from "react";
import { computeRisingKeywords } from "./metrics";
import type { DashboardProject, DashboardRanking } from "./types";

interface Props {
  rankings: DashboardRanking[];
  projects: DashboardProject[];
}

/**
 * Top-Keywords mit der größten Verbesserung in den letzten 7 Tagen.
 * Visuell angelehnt an den „Rising Keywords"-Block der SEO-Suite-Vorlage:
 * Rang-Badge, Keyword, Projekt-Domain, „Volumen"-Indikator (= Tracking-
 * Aktivität pro Keyword), Score-Balken (= Sichtbarkeit aus aktueller
 * Position) und Position mit Delta-Pfeil.
 */
export function RisingKeywords({ rankings, projects }: Props) {
  const items = useMemo(
    () => computeRisingKeywords(rankings, { windowDays: 7, limit: 5, direction: "up" }),
    [rankings],
  );
  const losers = useMemo(
    () => computeRisingKeywords(rankings, { windowDays: 7, limit: 3, direction: "down" }),
    [rankings],
  );

  const projectsById = useMemo(() => {
    const m = new Map<string, DashboardProject>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  // „Volume"-Proxy: Anzahl der Messungen pro Keyword in den letzten 30 Tagen.
  const sampleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const r of rankings) {
      if (new Date(r.recorded_at).getTime() < cutoff) continue;
      const key = `${r.project_id}::${r.keyword}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [rankings]);

  const maxSamples = Math.max(1, ...Array.from(sampleCounts.values()));

  return (
    <div className="card overflow-hidden p-0">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">Rising Keywords</h3>
          <span className="rounded-md bg-accent-dim px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            7 Tage
          </span>
        </div>
        <span className="text-xs text-ink-muted">
          {items.length} aufwärts · {losers.length} abwärts
        </span>
      </header>

      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-ink-muted">
          Noch keine bewegten Keywords. Sobald die Tracker historische Daten
          gesammelt haben, erscheinen hier deine Aufsteiger.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-5 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Keyword</th>
              <th className="hidden px-3 py-2 font-semibold md:table-cell">Projekt</th>
              <th className="hidden px-3 py-2 font-semibold lg:table-cell">Tracking</th>
              <th className="px-3 py-2 font-semibold">Sichtbarkeit</th>
              <th className="px-5 py-2 text-right font-semibold">Position</th>
            </tr>
          </thead>
          <tbody>
            {items.map((k, i) => {
              const project = projectsById.get(k.projectId);
              const samples = sampleCounts.get(`${k.projectId}::${k.keyword}`) ?? 0;
              const samplesPct = (samples / maxSamples) * 100;
              const visibility = Math.max(0, Math.min(100, 100 - k.current));
              return (
                <tr key={`${k.projectId}::${k.keyword}`} className="border-t border-line">
                  <td className="px-5 py-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-xs font-semibold text-ink">
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-ink">{k.keyword}</span>
                  </td>
                  <td className="hidden px-3 py-3 text-ink-muted md:table-cell">
                    {project ? (
                      <Link
                        to={`/projects/${project.id}`}
                        className="hover:text-accent hover:underline"
                      >
                        {project.domain}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-violet"
                          style={{ width: `${samplesPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-muted">{samples}×</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${visibility}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-muted">{Math.round(visibility)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className="font-semibold text-ink">#{k.current}</span>
                      <span className="rounded-md bg-accent-dim px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                        ▲ {k.delta}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
