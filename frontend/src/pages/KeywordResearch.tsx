import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { useToast } from "../components/Toast";
import {
  runKeywordResearch,
  listKeywordResearch,
  type ApiError,
  type KeywordResearchResponse,
  type KeywordResearchSummary,
} from "../lib/api";
import { csvCell, triggerCsvDownload } from "../lib/csv";

function fmtNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE").format(n);
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

function difficultyBadge(score: number | null | undefined) {
  if (score == null) return <span className="text-slate2">—</span>;
  const colors =
    score < 30 ? "bg-green-50 text-green-700"
    : score < 60 ? "bg-amber-50 text-amber-700"
    : "bg-red-50 text-red-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>
      KD {score}
    </span>
  );
}

export default function KeywordResearch() {
  const session = useSession();
  const toast = useToast();
  const [keyword, setKeyword] = useState("");
  const [locale, setLocale] = useState<"en" | "de">("de");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<KeywordResearchResponse | null>(null);
  const [history, setHistory] = useState<KeywordResearchSummary[]>([]);
  const [planLimit, setPlanLimit] = useState<{ limit: number; plan: string; message: string } | null>(null);

  useEffect(() => {
    if (session.loading || !session.token) return;
    void loadHistory(session.token);
  }, [session.loading, session.token]);

  async function loadHistory(token: string) {
    try {
      const { items } = await listKeywordResearch(token);
      setHistory(items);
    } catch (e) {
      // Non-critical — silently log.
      console.error("history load failed", e);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session.token) return;
    const k = keyword.trim();
    if (!k) return;
    setBusy(true);
    setResult(null);
    setPlanLimit(null);
    try {
      const data = await runKeywordResearch(session.token, { keyword: k, locale });
      setResult(data);
      toast.push("success", `Keyword-Daten geladen für "${k}"`);
      void loadHistory(session.token);
    } catch (e) {
      const apiErr = e as ApiError;
      if (apiErr.code === "PLAN_LIMIT_REACHED") {
        const body = apiErr.body as { error: { limit: number; plan: string; message: string } };
        setPlanLimit({ limit: body.error.limit, plan: body.error.plan, message: body.error.message });
      } else if (apiErr.code === "RATE_LIMITED") {
        toast.push("error", apiErr.message);
      } else {
        toast.push("error", e instanceof Error ? e.message : "Keyword research failed");
      }
    } finally {
      setBusy(false);
    }
  }

  function downloadCsv() {
    if (!result) return;
    const rows: string[][] = [
      ["keyword", "search_volume", "cpc", "keyword_difficulty", "competition"],
    ];
    if (result.metrics) {
      rows.push([
        result.metrics.keyword,
        result.metrics.search_volume?.toString() ?? "",
        result.metrics.cpc?.toString() ?? "",
        result.metrics.keyword_difficulty?.toString() ?? "",
        result.metrics.competition?.toString() ?? "",
      ]);
    }
    for (const r of result.related) {
      rows.push([
        r.keyword,
        r.search_volume?.toString() ?? "",
        r.cpc?.toString() ?? "",
        r.keyword_difficulty?.toString() ?? "",
        r.competition?.toString() ?? "",
      ]);
    }
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    triggerCsvDownload(csv, `keywords-${result.keyword.replace(/[^a-z0-9]+/gi, "-")}.csv`);
  }

  if (!session.loading && !session.token) {
    return <Navigate to="/login" replace state={{ next: "/keywords" }} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header>
        <h1 className="text-3xl font-bold">Keyword Research</h1>
        <p className="mt-1 text-slate2">
          Suchvolumen, CPC, Keyword Difficulty und Top-10-SERP — powered by DataForSEO.
        </p>
      </header>

      <form onSubmit={onSubmit} className="card mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="kw-input" className="block text-sm font-medium">Keyword oder Phrase</label>
          <input
            id="kw-input"
            type="text"
            className="input mt-1"
            placeholder="z.B. leather backpack"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            maxLength={120}
            disabled={busy}
            required
          />
        </div>
        <div>
          <label htmlFor="kw-locale" className="block text-sm font-medium">Region</label>
          <select
            id="kw-locale"
            className="input mt-1"
            value={locale}
            onChange={(e) => setLocale(e.target.value as "en" | "de")}
            disabled={busy}
          >
            <option value="de">DE / Deutsch</option>
            <option value="en">US / English</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={busy || !keyword.trim()}>
          {busy ? "Lädt…" : "Analyse starten"}
        </button>
      </form>

      {planLimit && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm" role="alert">
          <p className="font-medium text-amber-800">{planLimit.message}</p>
          <p className="mt-1 text-amber-700">
            <a href="/pricing" className="font-medium underline">Upgrade deinen Plan</a> für mehr Keyword-Recherchen.
          </p>
        </div>
      )}

      {busy && (
        <p className="mt-6 text-slate2" role="status">
          Hole Daten von DataForSEO… (das kann ein paar Sekunden dauern)
        </p>
      )}

      {result && (
        <section className="mt-8 space-y-6">
          <div className="flex justify-end">
            <button onClick={downloadCsv} className="btn-ghost text-sm">
              CSV exportieren
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Suchvolumen / Monat" value={fmtNumber(result.metrics?.search_volume)} />
            <MetricCard label="CPC" value={fmtCurrency(result.metrics?.cpc)} />
            <MetricCard
              label="Wettbewerb"
              value={result.metrics?.competition != null ? `${Math.round(result.metrics.competition * 100)}%` : "—"}
            />
            <MetricCard
              label="Keyword Difficulty"
              value={result.metrics?.keyword_difficulty != null ? `${result.metrics.keyword_difficulty}/100` : "—"}
            />
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold">Top 10 SERP-Ergebnisse</h2>
            {result.serp.length === 0 ? (
              <p className="mt-2 text-slate2">Keine SERP-Daten verfügbar.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {result.serp.map((r) => (
                  <li key={`${r.position}-${r.url}`} className="border-l-2 border-primary-100 pl-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono text-slate2">#{r.position}</span>
                      <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline break-all">
                        {r.title || r.url}
                      </a>
                    </div>
                    <p className="text-xs text-slate2">{r.domain}</p>
                    {r.snippet && <p className="mt-1 text-sm text-slate-600">{r.snippet}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold">Verwandte Keywords</h2>
            {result.related.length === 0 ? (
              <p className="mt-2 text-slate2">Keine verwandten Keywords gefunden.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-slate2">
                      <th className="pb-2 pr-4">Keyword</th>
                      <th className="pb-2 pr-4">Volumen</th>
                      <th className="pb-2 pr-4">CPC</th>
                      <th className="pb-2 pr-4">KD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.related.map((r, i) => (
                      <tr key={`${r.keyword}-${i}`} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{r.keyword}</td>
                        <td className="py-2 pr-4">{fmtNumber(r.search_volume)}</td>
                        <td className="py-2 pr-4">{fmtCurrency(r.cpc)}</td>
                        <td className="py-2 pr-4">{difficultyBadge(r.keyword_difficulty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Letzte Suchen</h2>
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {history.slice(0, 10).map((h) => (
              <li key={h.id} className="flex items-center justify-between p-3 text-sm">
                <button
                  className="text-left font-medium text-primary hover:underline"
                  onClick={() => { setKeyword(h.keyword); }}
                >
                  {h.keyword}
                </button>
                <span className="text-xs text-slate2">
                  Vol {fmtNumber(h.search_volume)} · CPC {fmtCurrency(h.cpc)} · {new Date(h.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase text-slate2">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
