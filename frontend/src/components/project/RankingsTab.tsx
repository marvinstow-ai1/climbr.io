import { useCallback, useEffect, useState } from "react";
import { ensureSupabase } from "../../lib/supabase";
import {
  addKeyword as apiAddKeyword,
  deleteKeyword as apiDeleteKeyword,
  type ApiError,
} from "../../lib/api";
import Sparkline from "../Sparkline";
import type { ToastKind } from "../Toast";
import { ExplainerBox } from "../learning/ExplainerBox";
import { TooltipHint } from "../learning/TooltipHint";
import { LEARNING_ENTRIES } from "../../data/learning";

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
      onNotify("error", e instanceof Error ? e.message : "Rankings konnten nicht geladen werden.");
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
      onNotify("success", `"${keyword}" wird jetzt getrackt.`);
    } catch (err) {
      // Roll back.
      setRows((r) => r.filter((row) => row.id !== tempId));
      const apiErr = err as ApiError;
      if (apiErr.code === "PLAN_LIMIT_REACHED") {
        const body = apiErr.body as { error: { limit: number; plan: string; message: string } };
        setPlanLimit({ limit: body.error.limit, plan: body.error.plan, message: body.error.message });
      } else if (apiErr.code === "DUPLICATE_KEYWORD") {
        onNotify("error", "Dieses Keyword wird bereits getrackt.");
      } else {
        onNotify("error", apiErr.message ?? "Keyword konnte nicht hinzugefügt werden.");
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
      onNotify("info", `"${row.keyword}" entfernt.`);
      setPlanLimit(null);
    } catch (err) {
      setRows(snapshot);
      const apiErr = err as ApiError;
      onNotify("error", apiErr.message ?? "Keyword konnte nicht entfernt werden.");
    }
  }

  const rankingsExplainer = LEARNING_ENTRIES["rankings"]!;

  return (
    <div className="space-y-6">
      <ExplainerBox
        storageKey={rankingsExplainer.key}
        title={rankingsExplainer.title}
        explanation={rankingsExplainer.what}
        whyItMatters={rankingsExplainer.whyItMatters}
        nextStep={rankingsExplainer.nextStep}
      />

      {!gscConnected && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Verbinde Google Search Console im{" "}
          <a href="/dashboard" className="font-medium underline">Dashboard</a>{" "}
          um echte Ranking-Positionen abzurufen. Bis dahin speichern wir deine
          Keywords, zeigen aber leere Sparklines.
        </div>
      )}

      {planLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm" role="alert">
          <p className="font-medium text-amber-800">{planLimit.message}</p>
          <p className="mt-1 text-amber-700">
            <a href="/pricing" className="font-medium underline">Plan upgraden</a>{" "}
            oder ein Keyword entfernen um Platz zu schaffen.
          </p>
        </div>
      )}

      <form onSubmit={onAdd} className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="new-keyword" className="flex items-center gap-1.5 text-sm font-medium">
            Keyword hinzufügen
            <TooltipHint hint="Keywords sind die Begriffe, nach denen deine Kunden bei Google suchen. Tipp: Wähle Begriffe, die dein Produkt oder deine Dienstleistung genau beschreiben." />
          </label>
          <input
            id="new-keyword"
            type="text"
            className="input mt-1"
            placeholder="lederrucksack damen"
            value={newKw}
            maxLength={120}
            onChange={(e) => setNewKw(e.target.value)}
            disabled={busy}
            aria-describedby="kw-help"
          />
          <p id="kw-help" className="mt-1 text-xs text-slate2">
            {rows.length} {rows.length === 1 ? "Keyword" : "Keywords"} getrackt
          </p>
        </div>
        <button type="submit" className="btn-primary" disabled={busy || !newKw.trim()}>
          {busy ? "Wird hinzugefügt…" : "Hinzufügen"}
        </button>
      </form>

      {loading ? (
        <p className="text-slate2">Lade Rankings…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate2">Noch keine Keywords getrackt. Füg oben eines hinzu.</p>
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
            const deltaTooltip =
              delta == null || delta === 0
                ? undefined
                : delta > 0
                  ? `Dein Keyword ist ${delta} ${delta === 1 ? "Platz" : "Plätze"} nach oben gerutscht — mehr Sichtbarkeit bei Google.`
                  : `Dein Keyword ist ${Math.abs(delta)} ${Math.abs(delta) === 1 ? "Platz" : "Plätze"} nach unten gerutscht — weniger Sichtbarkeit.`;
            return (
              <li key={row.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">{row.keyword}</p>
                  <p className="text-xs text-slate2">
                    {row.latest != null ? `Position #${row.latest}` : "Noch keine Daten"}
                    {delta != null && delta !== 0 && (
                      <>
                        {" · "}
                        <span className={deltaColor} title={deltaTooltip}>
                          {deltaLabel}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div
                  className="shrink-0"
                  title="Diese Kurve zeigt deine Position in Google über die letzten 14 Tage. Je niedriger die Zahl, desto weiter vorne bist du."
                >
                  <Sparkline points={row.history} label={`${row.keyword} trend`} />
                </div>
                <button
                  onClick={() => onDelete(row)}
                  className="btn-ghost"
                  aria-label={`Keyword ${row.keyword} entfernen`}
                  disabled={row.id.startsWith("temp-")}
                >
                  Entfernen
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
