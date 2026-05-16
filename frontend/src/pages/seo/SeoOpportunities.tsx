import { useEffect, useState } from "react";
import { useSession } from "../../lib/useSession";
import { useToast } from "../../components/Toast";
import { SeoLayout } from "../../components/seo/SeoLayout";
import {
  listOpportunities,
  scanOpportunities,
  createTaskFromOpportunity,
  type Opportunity,
} from "../../lib/seoApi";

const TYPE_LABEL: Record<Opportunity["type"], string> = {
  high_impressions_low_ctr: "Viele Impressionen, kaum Klicks",
  striking_distance: "Knapp vor Seite 1",
  declining_clicks: "Klicks gesunken",
  stagnant_impressions: "Sichtbar, aber keine Klicks",
  missing_meta: "Title oder Description fehlt",
};

const PRIORITY_ORDER: Record<Opportunity["priority"], number> = { high: 0, medium: 1, low: 2 };

export default function SeoOpportunities() {
  return (
    <SeoLayout
      title="Chancen"
      subtitle="climbr durchsucht deine Search-Console-Daten nach Seiten und Suchanfragen mit Optimierungspotenzial."
    >
      {(projectId) => (projectId ? <OpportunitiesBody projectId={projectId} /> : null)}
    </SeoLayout>
  );
}

function OpportunitiesBody({ projectId }: { projectId: string }) {
  const session = useSession();
  const toast = useToast();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<"all" | Opportunity["type"]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    if (!session.token) return;
    try {
      const { opportunities } = await listOpportunities(session.token, projectId);
      setOpps(opportunities);
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session.loading || !session.token) return;
    setLoading(true);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.loading, session.token, projectId]);

  async function rescan() {
    if (!session.token) return;
    setScanning(true);
    try {
      const res = await scanOpportunities(session.token, projectId);
      toast.push("success", `${res.inserted} Chance(n) gefunden${res.gsc ? "" : " (Beispieldaten – GSC nicht verbunden)"}.`);
      await refresh();
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Analyse fehlgeschlagen.");
    } finally {
      setScanning(false);
    }
  }

  async function toTask(id: string) {
    if (!session.token) return;
    setBusyId(id);
    try {
      await createTaskFromOpportunity(session.token, id);
      toast.push("success", "Aufgabe erstellt.");
      setOpps((prev) => prev.map((o) => (o.id === id ? { ...o, status: "taskified" } : o)));
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Konvertierung fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = (filter === "all" ? opps : opps.filter((o) => o.type === filter))
    .filter((o) => o.status !== "dismissed")
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.score - a.score);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>Alle ({opps.length})</FilterPill>
          {(Object.keys(TYPE_LABEL) as Opportunity["type"][]).map((t) => {
            const count = opps.filter((o) => o.type === t).length;
            if (count === 0) return null;
            return (
              <FilterPill key={t} active={filter === t} onClick={() => setFilter(t)}>
                {TYPE_LABEL[t]} ({count})
              </FilterPill>
            );
          })}
        </div>
        <button className="btn-primary" onClick={() => void rescan()} disabled={scanning}>
          {scanning ? "Analyse läuft…" : "Chancen neu analysieren"}
        </button>
      </div>

      {loading ? (
        <div className="text-ink-muted">Lade Chancen…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-line bg-bg-raised/40 p-6 text-center text-sm text-ink-muted">
          Noch keine Chancen erkannt. Klick auf <b>Chancen neu analysieren</b>, um deine
          Search-Console-Daten zu durchsuchen.
        </div>
      ) : (
        <ul className="space-y-3" data-testid="opportunities-list">
          {filtered.map((o) => (
            <li key={o.id} className="rounded-lg border border-line bg-bg-raised/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge p={o.priority} />
                    <span className="text-xs text-ink-muted">{TYPE_LABEL[o.type]}</span>
                  </div>
                  <h3 className="mt-2 truncate text-base font-medium text-ink">
                    {o.query ? `„${o.query}“` : "Suchanfrage unbekannt"}
                  </h3>
                  {o.page_url && (
                    <a
                      href={o.page_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-xs text-accent hover:underline"
                    >
                      {o.page_url}
                    </a>
                  )}
                  <p className="mt-2 text-sm text-ink-muted">
                    {(o.data?.reason as string | undefined) ?? ""}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-muted sm:grid-cols-4">
                    <Metric label="Impressionen" value={o.impressions?.toLocaleString("de-DE") ?? "–"} />
                    <Metric label="Klicks" value={o.clicks?.toString() ?? "–"} />
                    <Metric label="CTR" value={o.ctr != null ? `${(o.ctr * 100).toFixed(1)}%` : "–"} />
                    <Metric label="Position" value={o.position != null ? o.position.toFixed(1) : "–"} />
                  </dl>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <div className="text-xs text-ink-subtle">Wirkung: {labelImpact(o.impact)}</div>
                  <div className="text-xs text-ink-subtle">Aufwand: {labelEffort(o.effort)}</div>
                  {o.status === "taskified" ? (
                    <span className="rounded-full bg-accent-dim px-2.5 py-0.5 text-xs font-medium text-accent">
                      Aufgabe erstellt
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      onClick={() => void toTask(o.id)}
                      disabled={busyId === o.id}
                    >
                      In Aufgabe umwandeln
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition ${
        active ? "bg-accent text-black" : "border border-line text-ink-muted hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}

function PriorityBadge({ p }: { p: Opportunity["priority"] }) {
  const cls = p === "high"
    ? "bg-accent text-black"
    : p === "medium"
      ? "bg-white/10 text-ink"
      : "bg-white/5 text-ink-muted";
  const label = p === "high" ? "Hoch" : p === "medium" ? "Mittel" : "Niedrig";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>Priorität: {label}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function labelImpact(i: Opportunity["impact"]): string {
  return i === "high" ? "hoch" : i === "medium" ? "mittel" : "niedrig";
}
function labelEffort(e: Opportunity["effort"]): string {
  return e === "low" ? "gering" : e === "medium" ? "mittel" : "hoch";
}
