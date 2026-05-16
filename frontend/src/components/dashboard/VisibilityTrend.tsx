import { useMemo, useState } from "react";
import { BarLineChart } from "./charts/BarLineChart";
import { computeVisibilityTrend } from "./metrics";
import type { DashboardRanking } from "./types";

interface Props {
  rankings: DashboardRanking[];
}

const RANGES = [
  { key: "7", label: "7 Tage", days: 7 },
  { key: "14", label: "14 Tage", days: 14 },
  { key: "30", label: "30 Tage", days: 30 },
] as const;

/**
 * „Visibility Trend" — Mittlere Suchposition pro Tag, invertiert als
 * Sichtbarkeits-Score (höher = besser). Die letzte Säule wird in Lime
 * hervorgehoben, die übrigen in mattem Violett gehalten; eine helle Linie
 * zeigt den geglätteten 5-Tages-Trend.
 */
export function VisibilityTrend({ rankings }: Props) {
  const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]["key"]>("14");
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1]!;

  const points = useMemo(
    () => computeVisibilityTrend(rankings, range.days),
    [rankings, range.days],
  );

  const hasData = points.some((p) => p.score != null);
  const latest = [...points].reverse().find((p) => p.score != null) ?? null;
  const previous = (() => {
    const withData = points.filter((p) => p.score != null);
    if (withData.length < 2) return null;
    return withData[0];
  })();
  const delta =
    latest && previous && previous.score != null && latest.score != null
      ? Math.round((latest.score - previous.score) * 10) / 10
      : null;

  return (
    <div className="card flex h-full flex-col p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Sichtbarkeits-Trend</h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Durchschnittliche Ranking-Position, invertiert (100 = Top-1).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {delta != null && (
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                delta > 0
                  ? "bg-accent-dim text-accent"
                  : delta < 0
                    ? "bg-rose-dim text-rose"
                    : "bg-white/[0.04] text-ink-muted"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
          <div
            role="tablist"
            aria-label="Zeitraum"
            className="flex rounded-md border border-line bg-white/[0.02] p-0.5 text-xs"
          >
            {RANGES.map((r) => (
              <button
                key={r.key}
                role="tab"
                aria-selected={r.key === rangeKey}
                type="button"
                onClick={() => setRangeKey(r.key)}
                className={`rounded px-2 py-1 transition ${
                  r.key === rangeKey
                    ? "bg-accent-dim text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-4 flex items-baseline gap-3">
        <div className="text-3xl font-bold text-ink">
          {latest?.score != null ? Math.round(latest.score) : "—"}
        </div>
        <div className="text-xs text-ink-muted">aktueller Tageswert</div>
      </div>

      <div className="mt-2 flex-1">
        {hasData ? (
          <BarLineChart data={points.map((p) => ({ label: p.label, value: p.score }))} />
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-line text-sm text-ink-muted">
            Noch keine Ranking-Daten. Sobald deine Keywords gemessen wurden,
            erscheint hier der Verlauf.
          </div>
        )}
      </div>
    </div>
  );
}
