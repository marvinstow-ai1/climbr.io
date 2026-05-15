import { useCallback, useEffect, useState } from "react";
import {
  getDashboardSnapshot,
  type DashboardSnapshot,
} from "../../lib/api";
import Sparkline from "../Sparkline";
import type { ToastKind } from "../Toast";

interface Props {
  projectId: string;
  token: string;
  domain: string;
  onNotify: (kind: ToastKind, message: string) => void;
}

function fmtNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE").format(n);
}

export default function OverviewTab({ projectId, token, domain, onNotify }: Props) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force: boolean) => {
    if (force) setRefreshing(true); else setLoading(true);
    try {
      const { snapshot, cached } = await getDashboardSnapshot(token, projectId, { refresh: force });
      setSnapshot(snapshot);
      setCached(cached);
      if (force) {
        onNotify("success", "Dashboard aktualisiert");
      } else if (cached) {
        const ageH = Math.round((Date.now() - new Date(snapshot.refreshed_at).getTime()) / (60 * 60 * 1000));
        if (ageH > 6) {
          onNotify("info", `Daten von vor ${ageH}h — drücke Refresh für aktuelle Zahlen.`);
        }
      }
    } catch (e) {
      onNotify("error", e instanceof Error ? e.message : "Konnte Dashboard nicht laden");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, token, onNotify]);

  useEffect(() => { void load(false); }, [load]);

  if (loading && !snapshot) {
    return <p className="text-slate2">Lade Dashboard…</p>;
  }
  if (!snapshot) {
    return (
      <div className="card">
        <p className="text-slate2">Noch keine Live-Daten vorhanden.</p>
        <button onClick={() => load(true)} className="btn-primary mt-3" disabled={refreshing}>
          {refreshing ? "Hole Daten…" : "Jetzt abrufen"}
        </button>
      </div>
    );
  }

  const trafficPoints = snapshot.traffic_trend.map((p) => p.traffic);
  const trafficNow = snapshot.organic_traffic;
  const trafficPrev = snapshot.traffic_trend.length > 1
    ? snapshot.traffic_trend[snapshot.traffic_trend.length - 2]?.traffic ?? null
    : null;
  const trafficDelta = trafficNow != null && trafficPrev != null ? trafficNow - trafficPrev : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate2">
            Domain: <span className="font-medium text-ink">{domain}</span>
            {snapshot.refreshed_at && (
              <> · Stand: {new Date(snapshot.refreshed_at).toLocaleString("de-DE")}</>
            )}
            {cached && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase">cached</span>}
          </p>
        </div>
        <button onClick={() => load(true)} className="btn-ghost text-sm" disabled={refreshing}>
          {refreshing ? "Aktualisiere…" : "Refresh"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Organischer Traffic / Monat"
          value={fmtNumber(snapshot.organic_traffic)}
          delta={trafficDelta}
        />
        <Metric
          label="Organische Keywords"
          value={fmtNumber(snapshot.organic_keywords_count)}
        />
        <div className="card">
          <p className="text-xs uppercase text-slate2">Traffic-Trend (30 Tage)</p>
          <div className="mt-2 h-12">
            <Sparkline points={trafficPoints} label={`${domain} Traffic`} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MovementsList
          title="Top Gewinner"
          rows={snapshot.top_gainers}
          emptyText="Keine Aufsteiger im letzten Lauf."
          tone="positive"
        />
        <MovementsList
          title="Top Verlierer"
          rows={snapshot.top_losers}
          emptyText="Keine Absteiger im letzten Lauf."
          tone="negative"
        />
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold">Wettbewerber-Bewegungen</h3>
        {snapshot.competitor_moves.length === 0 ? (
          <p className="mt-2 text-sm text-slate2">Keine Daten.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {snapshot.competitor_moves.slice(0, 8).map((c) => {
              const sign = c.change == null ? null : c.change > 0 ? "▲" : c.change < 0 ? "▼" : "·";
              const color = c.change == null
                ? "text-slate2"
                : c.change > 0 ? "text-green-600"
                : c.change < 0 ? "text-red-600"
                : "text-slate2";
              return (
                <li key={c.domain} className="flex items-center justify-between">
                  <span className="font-medium">{c.domain}</span>
                  <span className={`text-xs ${color}`}>
                    {sign} {c.change != null ? fmtNumber(Math.abs(c.change)) : "—"} Traffic
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  const sign = delta == null ? null : delta > 0 ? "▲" : delta < 0 ? "▼" : null;
  const color = delta == null
    ? "text-slate2"
    : delta > 0 ? "text-green-600"
    : delta < 0 ? "text-red-600"
    : "text-slate2";
  return (
    <div className="card">
      <p className="text-xs uppercase text-slate2">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {delta != null && delta !== 0 && (
        <p className={`mt-0.5 text-xs ${color}`}>
          {sign} {new Intl.NumberFormat("de-DE").format(Math.abs(delta))}
        </p>
      )}
    </div>
  );
}

function MovementsList({
  title,
  rows,
  emptyText,
  tone,
}: {
  title: string;
  rows: { keyword: string; old_position: number | null; new_position: number | null }[];
  emptyText: string;
  tone: "positive" | "negative";
}) {
  const tint = tone === "positive" ? "text-green-600" : "text-red-600";
  return (
    <div className="card">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate2">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {rows.map((r) => {
            const delta = r.old_position != null && r.new_position != null ? r.old_position - r.new_position : null;
            return (
              <li key={r.keyword} className="flex items-center justify-between">
                <span className="font-medium truncate max-w-[60%]" title={r.keyword}>{r.keyword}</span>
                <span className="text-xs text-slate2">
                  {r.old_position ?? "—"} → {r.new_position ?? "—"}
                  {delta != null && delta !== 0 && (
                    <span className={`ml-2 ${tint}`}>
                      {tone === "positive" ? "+" : ""}{delta}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
