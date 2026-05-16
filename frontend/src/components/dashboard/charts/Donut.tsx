/**
 * Dependency-free donut chart. Render order matches the `slices` array —
 * the first slice starts at 12 o'clock and progresses clockwise.
 */

export interface DonutSlice {
  key: string;
  value: number;
  /** CSS color (hex or rgba). */
  color: string;
  label: string;
}

interface Props {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  /** Headline shown in the center. */
  centerValue?: string;
  centerLabel?: string;
}

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function Donut({ slices, size = 180, thickness = 22, centerValue, centerLabel }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - thickness / 2 - 2;

  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Verteilung">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
        <text x={cx} y={cy} textAnchor="middle" className="fill-ink-muted" fontSize={11} dy="0.35em">
          keine Daten
        </text>
      </svg>
    );
  }

  let start = -Math.PI / 2; // 12 Uhr
  const segments = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = (s.value / total) * Math.PI * 2;
      const end = start + sweep;
      const large = sweep > Math.PI ? 1 : 0;
      const p1 = polar(cx, cy, r, start);
      const p2 = polar(cx, cy, r, end);
      const d = `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
      const out = { ...s, d, sweep };
      start = end;
      return out;
    });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="Verteilung"
    >
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={thickness} />
      {segments.map((seg) => (
        <path
          key={seg.key}
          d={seg.d}
          fill="none"
          stroke={seg.color}
          strokeWidth={thickness}
          strokeLinecap="butt"
        />
      ))}
      {centerValue && (
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-ink"
          fontSize={22}
          fontWeight={700}
        >
          {centerValue}
        </text>
      )}
      {centerLabel && (
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-ink-muted"
          fontSize={10}
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}
