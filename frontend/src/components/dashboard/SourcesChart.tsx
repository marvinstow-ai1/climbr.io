import { Donut, type DonutSlice } from "./charts/Donut";
import { computeScoreDistribution } from "./metrics";
import type { DashboardAudit, DashboardProject } from "./types";

interface Props {
  projects: DashboardProject[];
  audits: DashboardAudit[];
}

/**
 * „Sources"-Pendant im SEO-Suite-Vorbild: zeigt die Verteilung der Projekte
 * nach Audit-Score-Bucket (Gut/Ausbaufähig/Kritisch/Kein Audit). Lime steht
 * für „gut", die matten Komplementärtöne für die anderen Buckets.
 */
export function SourcesChart({ projects, audits }: Props) {
  const dist = computeScoreDistribution(projects, audits);
  const total = dist.total;

  const slices: DonutSlice[] = [
    { key: "good", value: dist.good, color: "#D4F26B", label: "Gut" },
    { key: "ok", value: dist.ok, color: "#F2C26B", label: "Ausbaufähig" },
    { key: "bad", value: dist.bad, color: "#D49DA5", label: "Kritisch" },
    { key: "unknown", value: dist.unknown, color: "#B49DD4", label: "Kein Audit" },
  ];

  const dominant = slices.reduce((max, s) => (s.value > max.value ? s : max), slices[0]!);
  const percent = total > 0 ? Math.round((dominant.value / total) * 100) : 0;

  return (
    <div className="card flex h-full flex-col p-5">
      <header className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Score-Verteilung</h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Projekte gruppiert nach letztem Audit.
          </p>
        </div>
      </header>

      <div className="mt-3 flex flex-1 items-center justify-center">
        <Donut
          slices={slices}
          centerValue={total > 0 ? `${percent}%` : "—"}
          centerLabel={total > 0 ? dominant.label : "noch leer"}
        />
      </div>

      <ul className="mt-4 space-y-1.5 text-xs">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-ink-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </span>
            <span className="font-medium text-ink">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
