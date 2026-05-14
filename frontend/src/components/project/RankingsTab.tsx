import { useCallback, useEffect, useState } from "react";
import { ensureSupabase } from "../../lib/supabase";
import {
  addKeyword as apiAddKeyword,
  deleteKeyword as apiDeleteKeyword,
  type ApiError,
} from "../../lib/api";
import Sparkline from "../Sparkline";
import type { ToastKind } from "../Toast";

interface KeywordRow {
  id: string;
  keyword: string;
  history: (number | null)[]; // chronological
  latest: number | null;
  prev: number | null;
}

interface Props {
  projectId: string;
  token: string;
  gscConnected: boolean;
  onNotify: (kind: ToastKind, message: string) => void;
}

interface PlanLimitState {
  limit: number;
  plan: string;
  message: string;
}

const HISTORY_POINTS = 14;

export default function RankingsTab({ projectId, token, gscConnected, onNotify }: Props) {
  const [rows, setRows] = useState<KeywordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKw, setNewKw] = useState("");
  const [busy, setBusy] = useState(false);
  const [planLimit, setPlanLimit] = useState<PlanLimitState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sb = ensureSupabase();
      const { data: kws, error: kErr } = await sb
        .from("keywords")
        .select("id, keyword")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (kErr) throw kErr;
      const kwList = (kws ?? []) as { id: string; keyword: string }[];

      if (kwList.length === 0) {
        setRows([]);
        return;
      }

      const { data: rankings, error: rErr } = await sb
        .from("rankings")
        .select("keyword, position, recorded_at")
        .eq("project_id", projectId)
        .order("recorded_at", { ascending: true });
      if (rErr) throw rErr;
      const all = (rankings ?? []) as { keyword: string; position: number | null; recorded_at: string }[];

      const byKw = new Map<string, (number | null)[]>();
      for (const r of all) {
        const list = byKw.get(r.keyword) ?? [];
        list.push(r.position);
        byKw.set(r.keyword, list);
      }

      const next: KeywordRow[] = kwList.map((k) => {
        const history = (byKw.get(k.keyword) ?? []).slice(-HISTORY_POINTS);
        const latest = history.length > 0 ? history[history.length - 1] ?? null : null;
        const prev = history.length > 1 ? history[history.length - 2] ?? null : null;
        return { id: k.id, keyword: k.keyword, history, latest, prev };
      });
      setRows(next);
    } catch (e) {
      onNotify("error", e instanceof Error ? e.message : "Failed to load rankings");
    } finally {
      setLoading(false);
    }
  }, [projectId, onNotify]);

  useEffect(() => { void load(); }, [load]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const keyword = newKw.trim();
    if (!keyword) return;
    setBusy(true);

    // Optimistic insert.
    const tempId = `temp-${Date.now()}`;
    const optimistic: KeywordRow = { id: tempId, keyword, history: [], latest: null, prev: null };
    setRows((r) => [...r, optimistic]);
    setNewKw("");

    try {
      const created = await apiAddKeyword(token, { projectId, keyword });
      setRows((r) => r.map((row) => (row.id === tempId ? { ...row, id: created.id } : row)));
      onNotify("success", `Tracking "${keyword}"`);
    } catch (err) {
      // Roll back.
      setRows((r) => r.filter((row) => row.id !== tempId));
      const apiErr = err as ApiError;
      if (apiErr.code === "PLAN_LIMIT_REACHED") {
        const body = apiErr.body as { error: { limit: number; plan: string; message: string } };
        setPlanLimit({ limit: body.error.limit, plan: body.error.plan, message: body.error.message });
      } else if (apiErr.code === "DUPLICATE_KEYWORD") {
        onNotify("error", "That keyword is already tracked.");
      } else {
        onNotify("error", apiErr.message ?? "Could not add keyword");
      }
      setNewKw(keyword);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: KeywordRow) {
    if (row.id.startsWith("temp-")) return;
    const snapshot = rows;
    setRows((r) => r.filter((x) => x.id !== row.id));
    try {
      await apiDeleteKeyword(token, row.id);
      onNotify("info", `Removed "${row.keyword}"`);
      setPlanLimit(null);
    } catch (err) {
      setRows(snapshot);
      const apiErr = err as ApiError;
      onNotify("error", apiErr.message ?? "Could not remove keyword");
    }
  }

  return (
    <div className="space-y-6">
      {!gscConnected && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Connect Google Search Console on the{" "}
          <a href="/dashboard" className="font-medium underline">dashboard</a>{" "}
          to pull real ranking positions. Until then we'll save your keywords but
          show empty sparklines.
        </div>
      )}

      {planLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm" role="alert">
          <p className="font-medium text-amber-800">{planLimit.message}</p>
          <p className="mt-1 text-amber-700">
            <a href="/pricing" className="font-medium underline">Upgrade your plan</a> or remove a keyword to free a slot.
          </p>
        </div>
      )}

      <form onSubmit={onAdd} className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="new-keyword" className="block text-sm font-medium">Add keyword</label>
          <input
            id="new-keyword"
            type="text"
            className="input mt-1"
            placeholder="leather backpack"
            value={newKw}
            maxLength={120}
            onChange={(e) => setNewKw(e.target.value)}
            disabled={busy}
            aria-describedby="kw-help"
          />
          <p id="kw-help" className="mt-1 text-xs text-slate2">
            {rows.length} tracked
          </p>
        </div>
        <button type="submit" className="btn-primary" disabled={busy || !newKw.trim()}>
          {busy ? "Adding…" : "Add keyword"}
        </button>
      </form>

      {loading ? (
        <p className="text-slate2">Loading rankings…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate2">No keywords tracked yet. Add one above.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {rows.map((row) => {
            const delta = row.latest != null && row.prev != null ? row.prev - row.latest : null;
            const deltaLabel =
              delta == null ? "—"
              : delta === 0 ? "·"
              : delta > 0 ? `▲ ${delta}`
              : `▼ ${Math.abs(delta)}`;
            const deltaColor =
              delta == null || delta === 0 ? "text-slate2"
              : delta > 0 ? "text-green-600"
              : "text-red-600";
            return (
              <li key={row.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">{row.keyword}</p>
                  <p className="text-xs text-slate2">
                    {row.latest != null ? `Position #${row.latest}` : "No data yet"}
                    {delta != null && delta !== 0 && (
                      <> · <span className={deltaColor}>{deltaLabel}</span></>
                    )}
                  </p>
                </div>
                <div aria-hidden className="shrink-0">
                  <Sparkline points={row.history} label={`${row.keyword} trend`} />
                </div>
                <button
                  onClick={() => onDelete(row)}
                  className="btn-ghost"
                  aria-label={`Remove keyword ${row.keyword}`}
                  disabled={row.id.startsWith("temp-")}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
