import { useEffect, useState } from "react";
import { ensureSupabase } from "../../lib/supabase";
import { csvCell, triggerCsvDownload } from "../../lib/csv";

interface Props {
  projectId: string;
  keyword: string;
  onClose: () => void;
}

interface Row {
  recorded_at: string;
  position: number | null;
}

export default function KeywordHistoryModal({ projectId, keyword, onClose }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = ensureSupabase();
    void sb
      .from("rankings")
      .select("recorded_at, position")
      .eq("project_id", projectId)
      .eq("keyword", keyword)
      .order("recorded_at", { ascending: true })
      .limit(180)
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        setRows((data ?? []) as Row[]);
      });
  }, [projectId, keyword]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function exportCsv() {
    if (!rows) return;
    const csv = [["recorded_at", "position"], ...rows.map((r) => [r.recorded_at, r.position?.toString() ?? ""])]
      .map((r) => r.map(csvCell).join(","))
      .join("\n");
    triggerCsvDownload(csv, `history-${keyword.replace(/[^a-z0-9]+/gi, "-")}.csv`);
  }

  const chart = rows ? buildChart(rows) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Ranking-Historie für ${keyword}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase text-slate2">Keyword</p>
            <h2 className="text-2xl font-bold">{keyword}</h2>
          </div>
          <button onClick={onClose} className="text-slate2 hover:text-ink" aria-label="Schließen">✕</button>
        </div>

        {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
        {!rows && !error && <p className="mt-4 text-slate2">Lade Historie…</p>}
        {rows && rows.length === 0 && <p className="mt-4 text-slate2">Keine Historie verfügbar.</p>}

        {rows && rows.length > 0 && chart && (
          <>
            <div className="mt-6">
              <svg viewBox={`0 0 ${chart.w} ${chart.h}`} className="h-48 w-full text-primary">
                {chart.gridY.map((y, i) => (
                  <line key={i} x1={0} y1={y} x2={chart.w} y2={y} stroke="#E2E8F0" strokeWidth={0.5} />
                ))}
                <path d={chart.path} fill="none" stroke="currentColor" strokeWidth={1.5} />
                {chart.points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={2} fill="currentColor" />
                ))}
              </svg>
              <div className="mt-1 flex justify-between text-[10px] text-slate2">
                <span>{rows[0]!.recorded_at.slice(0, 10)}</span>
                <span>{rows[rows.length - 1]!.recorded_at.slice(0, 10)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-sm">
              <p className="text-slate2">
                Letzte 180 Datenpunkte · Bester Rang #{chart.best} · Schlechtester Rang #{chart.worst}
              </p>
              <button onClick={exportCsv} className="btn-ghost text-sm">CSV exportieren</button>
            </div>

            <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-slate-200 text-sm">
              <table className="w-full">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate2">
                  <tr>
                    <th className="px-3 py-2">Datum</th>
                    <th className="px-3 py-2">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="px-3 py-1.5">{new Date(r.recorded_at).toLocaleString("de-DE")}</td>
                      <td className="px-3 py-1.5 font-mono">
                        {r.position == null ? <span className="text-slate2">— (außerhalb Top 100)</span> : `#${r.position}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function buildChart(rows: Row[]) {
  const w = 600;
  const h = 180;
  const padX = 8;
  const padY = 12;
  const valid = rows.filter((r): r is { recorded_at: string; position: number } => r.position != null);
  if (valid.length === 0) return null;
  const positions = valid.map((r) => r.position);
  const best = Math.min(...positions);
  const worst = Math.max(...positions);
  const range = Math.max(1, worst - best);
  const step = rows.length > 1 ? (w - padX * 2) / (rows.length - 1) : 0;
  const points = rows
    .map((r, i) => {
      if (r.position == null) return null;
      const x = padX + i * step;
      const t = (r.position - best) / range;
      const y = padY + t * (h - padY * 2); // inverted: lower position number = higher on chart
      return { x, y };
    })
    .filter((p): p is { x: number; y: number } => p != null);

  let path = "";
  for (let i = 0; i < points.length; i++) {
    path += `${i === 0 ? "M" : "L"}${points[i]!.x.toFixed(1)},${points[i]!.y.toFixed(1)} `;
  }

  const gridY = [padY, h / 2, h - padY];

  return { w, h, path, points, best, worst, gridY };
}
