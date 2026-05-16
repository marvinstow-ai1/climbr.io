// Dependency-free sparkline. Inverts the Y axis for ranking data so that
// "lower position = higher line" matches user mental models (#1 is at top).

interface Props {
  /** Series in chronological order. `null` = not in top 100. */
  points: (number | null)[];
  width?: number;
  height?: number;
  /** When true, treat points as ranking positions (smaller is better). */
  invert?: boolean;
  label?: string;
}

export default function Sparkline({ points, width = 120, height = 32, invert = true, label }: Props) {
  const series = points.length > 0 ? points : [null, null];
  const valid = series.filter((p): p is number => typeof p === "number");

  if (valid.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label ?? "No ranking data yet"}
        className="text-ink-subtle/40"
      >
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeDasharray="3 3" />
      </svg>
    );
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = Math.max(1, max - min);

  const step = series.length > 1 ? width / (series.length - 1) : width;
  const path = series.map((p, i) => {
    const x = i * step;
    if (p == null) return null;
    const t = (p - min) / range;
    const y = invert ? t * (height - 4) + 2 : (1 - t) * (height - 4) + 2;
    return { x, y, i };
  });

  // Build a path string, breaking on null gaps.
  let d = "";
  let mode: "M" | "L" = "M";
  for (const pt of path) {
    if (!pt) { mode = "M"; continue; }
    d += ` ${mode}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    mode = "L";
  }

  const last = [...path].reverse().find((p) => p) ?? null;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={label ?? "Ranking trend"}
      className="text-accent"
    >
      <path d={d.trim()} fill="none" stroke="currentColor" strokeWidth={1.5} />
      {last && <circle cx={last.x} cy={last.y} r={2.5} fill="currentColor" />}
    </svg>
  );
}
