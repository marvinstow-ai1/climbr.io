/**
 * Dependency-free bar + line chart used by Visibility Trend.
 *
 * Values that are `null` render as a "no-data" placeholder bar (low, dim)
 * so empty days are still visible without skewing the smoothed line.
 */

interface Point {
  label: string;
  value: number | null;
}

interface Props {
  data: Point[];
  height?: number;
  /** Domain max for the Y axis. Defaults to 100 (visibility score). */
  max?: number;
  /** Window for the smoothed overlay line. */
  smoothWindow?: number;
}

const VIEW_W = 720;

function smooth(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => typeof v === "number");
    if (slice.length === 0) return null;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function BarLineChart({ data, height = 240, max = 100, smoothWindow = 5 }: Props) {
  const padX = 24;
  const padY = 28;
  const padBottom = 28;
  const innerW = VIEW_W - padX * 2;
  const innerH = height - padY - padBottom;

  const n = Math.max(1, data.length);
  const slot = innerW / n;
  const barW = Math.min(28, slot * 0.55);

  const yFor = (v: number) => padY + (1 - Math.max(0, Math.min(max, v)) / max) * innerH;

  const values = data.map((d) => d.value);
  const smoothed = smooth(values, smoothWindow);

  // Build the smoothed-line path (Catmull-Rom style not needed — straight
  // segments with breaks on null look clean at this size).
  let linePath = "";
  let mode: "M" | "L" = "M";
  smoothed.forEach((v, i) => {
    if (v == null) {
      mode = "M";
      return;
    }
    const x = padX + slot * (i + 0.5);
    const y = yFor(v);
    linePath += ` ${mode}${x.toFixed(1)},${y.toFixed(1)}`;
    mode = "L";
  });

  // Y-Achse: 4 horizontale Hilfslinien.
  const gridSteps = 4;
  const grid = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const v = (max / gridSteps) * i;
    return { v, y: yFor(v) };
  });

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      role="img"
      aria-label="Sichtbarkeits-Trend"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4F26B" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#D4F26B" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="bar-grad-mute" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B49DD4" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#B49DD4" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* Hilfslinien */}
      {grid.map((g, i) => (
        <line
          key={i}
          x1={padX}
          x2={VIEW_W - padX}
          y1={g.y}
          y2={g.y}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="2 4"
        />
      ))}
      {grid.map((g, i) => (
        <text
          key={`l-${i}`}
          x={padX - 6}
          y={g.y + 3}
          textAnchor="end"
          className="fill-ink-subtle"
          fontSize={9}
        >
          {Math.round(g.v)}
        </text>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const x = padX + slot * (i + 0.5) - barW / 2;
        const isLatest = i === data.length - 1;
        if (d.value == null) {
          return (
            <rect
              key={i}
              x={x}
              y={padY + innerH - 4}
              width={barW}
              height={4}
              rx={2}
              fill="rgba(255,255,255,0.05)"
            />
          );
        }
        const y = yFor(d.value);
        const h = Math.max(2, padY + innerH - y);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={3}
            fill={isLatest ? "url(#bar-grad)" : "url(#bar-grad-mute)"}
          />
        );
      })}

      {/* Smoothed line */}
      <path
        d={linePath.trim()}
        fill="none"
        stroke="#ECECEE"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* X-Achse: jeden 2./3. Tick beschriften, damit es nicht überlappt. */}
      {data.map((d, i) => {
        const tickEvery = Math.max(1, Math.floor(data.length / 7));
        if (i % tickEvery !== 0) return null;
        const x = padX + slot * (i + 0.5);
        return (
          <text
            key={`x-${i}`}
            x={x}
            y={height - 8}
            textAnchor="middle"
            className="fill-ink-subtle"
            fontSize={9}
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
