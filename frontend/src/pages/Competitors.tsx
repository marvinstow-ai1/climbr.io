import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { useToast } from "../components/Toast";
import {
  runCompetitorAnalysis,
  listCompetitorAnalysis,
  type ApiError,
  type CompetitorAnalysisResponse,
  type CompetitorAnalysisSummary,
  type DomainSnapshot,
} from "../lib/api";
import { csvCell, triggerCsvDownload } from "../lib/csv";

function fmtNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE").format(n);
}

export default function Competitors() {
  const session = useSession();
  const toast = useToast();
  const [domain, setDomain] = useState("");
  const [compareDomain, setCompareDomain] = useState("");
  const [locale, setLocale] = useState<"en" | "de">("de");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompetitorAnalysisResponse | null>(null);
  const [history, setHistory] = useState<CompetitorAnalysisSummary[]>([]);
  const [planLimit, setPlanLimit] = useState<{ limit: number; plan: string; message: string } | null>(null);

  useEffect(() => {
    if (session.loading || !session.token) return;
    void loadHistory(session.token);
  }, [session.loading, session.token]);

  async function loadHistory(token: string) {
    try {
      const { items } = await listCompetitorAnalysis(token);
      setHistory(items);
    } catch (e) {
      console.error("history load failed", e);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session.token) return;
    setBusy(true);
    setResult(null);
    setPlanLimit(null);
    try {
      const data = await runCompetitorAnalysis(session.token, {
        domain: domain.trim(),
        compareDomain: compareDomain.trim() || undefined,
        locale,
      });
      setResult(data);
      toast.push("success", `Analyse abgeschlossen für ${data.primary.domain}`);
      void loadHistory(session.token);
    } catch (e) {
      const apiErr = e as ApiError;
      if (apiErr.code === "PLAN_LIMIT_REACHED") {
        const body = apiErr.body as { error: { limit: number; plan: string; message: string } };
        setPlanLimit({ limit: body.error.limit, plan: body.error.plan, message: body.error.message });
      } else if (apiErr.code === "RATE_LIMITED") {
        toast.push("error", apiErr.message);
      } else {
        toast.push("error", e instanceof Error ? e.message : "Analyse fehlgeschlagen");
      }
    } finally {
      setBusy(false);
    }
  }

  function downloadCsv() {
    if (!result) return;
    const rows: string[][] = [["domain", "keyword", "position", "search_volume", "traffic", "url"]];
    const push = (snap: DomainSnapshot) => {
      for (const k of snap.keywords) {
        rows.push([
          snap.domain,
          k.keyword,
          k.position.toString(),
          k.search_volume?.toString() ?? "",
          k.traffic?.toString() ?? "",
          k.url ?? "",
        ]);
      }
    };
    push(result.primary);
    if (result.compare) push(result.compare);
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const name = `competitors-${result.primary.domain}${result.compare ? `-vs-${result.compare.domain}` : ""}.csv`;
    triggerCsvDownload(csv, name);
  }

  if (!session.loading && !session.token) {
    return <Navigate to="/login" replace state={{ next: "/competitors" }} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header>
        <h1 className="text-3xl font-bold">Wettbewerber-Analyse</h1>
        <p className="mt-1 text-slate2">
          Top organische Keywords, Traffic-Schätzungen, Backlinks und konkurrierende
          Domains — optional als Direktvergleich zweier Domains.
        </p>
      </header>

      <form onSubmit={onSubmit} className="card mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="d-input" className="block text-sm font-medium">Domain</label>
          <input
            id="d-input"
            type="text"
            className="input mt-1"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            maxLength={253}
            required
            disabled={busy}
          />
        </div>
        <div>
          <label htmlFor="d-compare" className="block text-sm font-medium">Vergleichs-Domain (optional)</label>
          <input
            id="d-compare"
            type="text"
            className="input mt-1"
            placeholder="competitor.com"
            value={compareDomain}
            onChange={(e) => setCompareDomain(e.target.value)}
            maxLength={253}
            disabled={busy}
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="d-locale" className="block text-sm font-medium">Region</label>
            <select
              id="d-locale"
              className="input mt-1"
              value={locale}
              onChange={(e) => setLocale(e.target.value as "en" | "de")}
              disabled={busy}
            >
              <option value="de">DE</option>
              <option value="en">US</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={busy || !domain.trim()}>
            {busy ? "Analyse…" : "Analysieren"}
          </button>
        </div>
      </form>

      {planLimit && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm" role="alert">
          <p className="font-medium text-amber-800">{planLimit.message}</p>
          <p className="mt-1 text-amber-700">
            <a href="/pricing" className="font-medium underline">Upgrade deinen Plan</a> für mehr Wettbewerber-Analysen.
          </p>
        </div>
      )}

      {busy && (
        <p className="mt-6 text-slate2" role="status">
          Hole Daten von DataForSEO… (Backlinks-Abfragen können bis zu 30s dauern)
        </p>
      )}

      {result && (
        <div className="mt-6 flex justify-end">
          <button onClick={downloadCsv} className="btn-ghost text-sm">CSV exportieren</button>
        </div>
      )}

      {result && (
        <section className="mt-4 grid gap-8 md:grid-cols-2">
          <DomainPanel snapshot={result.primary} />
          {result.compare && <DomainPanel snapshot={result.compare} />}
          {!result.compare && (
            <div className="card flex items-center justify-center bg-slate-50 text-slate2">
              <p className="text-sm">
                Vergleichs-Domain eingeben, um beide Domains nebeneinander zu sehen.
              </p>
            </div>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Letzte Analysen</h2>
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {history.slice(0, 10).map((h) => (
              <li key={h.id} className="flex items-center justify-between p-3 text-sm">
                <button
                  className="text-left font-medium text-primary hover:underline"
                  onClick={() => {
                    setDomain(h.domain);
                    setCompareDomain(h.compare_domain ?? "");
                  }}
                >
                  {h.domain}{h.compare_domain ? ` vs ${h.compare_domain}` : ""}
                </button>
                <span className="text-xs text-slate2">
                  Traffic {fmtNumber(h.organic_traffic)} · KWs {fmtNumber(h.organic_keywords_count)} · {new Date(h.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DomainPanel({ snapshot }: { snapshot: DomainSnapshot }) {
  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold">{snapshot.domain}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Organische Keywords" value={fmtNumber(snapshot.overview.organic_keywords_count)} />
          <Stat label="Organischer Traffic / Monat" value={fmtNumber(snapshot.overview.organic_traffic)} />
          <Stat label="Backlinks" value={fmtNumber(snapshot.backlinks.backlinks)} />
          <Stat label="Referring Domains" value={fmtNumber(snapshot.backlinks.referring_domains)} />
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold">Top Keywords</h3>
        {snapshot.keywords.length === 0 ? (
          <p className="mt-2 text-sm text-slate2">Keine Daten.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-slate2">
                <th className="pb-2 pr-2">Keyword</th>
                <th className="pb-2 pr-2">Pos</th>
                <th className="pb-2 pr-2">Vol</th>
                <th className="pb-2 pr-2">Traffic</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.keywords.slice(0, 15).map((k, i) => (
                <tr key={`${k.keyword}-${i}`} className="border-b last:border-0">
                  <td className="py-1.5 pr-2 truncate max-w-[180px]" title={k.keyword}>{k.keyword}</td>
                  <td className="py-1.5 pr-2 font-mono text-xs">#{k.position}</td>
                  <td className="py-1.5 pr-2">{fmtNumber(k.search_volume)}</td>
                  <td className="py-1.5 pr-2">{fmtNumber(k.traffic)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold">Top konkurrierende Domains</h3>
        {snapshot.competitors.length === 0 ? (
          <p className="mt-2 text-sm text-slate2">Keine Daten.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {snapshot.competitors.slice(0, 8).map((c) => (
              <li key={c.domain} className="flex items-center justify-between">
                <span className="font-medium">{c.domain}</span>
                <span className="text-xs text-slate2">
                  {c.intersections} gemeinsame KWs · Traffic {fmtNumber(c.organic_traffic)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate2">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
    </div>
  );
}
