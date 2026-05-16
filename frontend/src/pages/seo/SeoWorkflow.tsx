import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../../lib/useSession";
import { useToast } from "../../components/Toast";
import { SeoLayout } from "../../components/seo/SeoLayout";
import {
  getWorkflow,
  updateWorkflowStep,
  scanOpportunities,
  type WorkflowState,
} from "../../lib/seoApi";

interface StepConfig {
  step: WorkflowState["steps"][number]["step"];
  title: string;
  description: string;
  cta?: { label: string; to: (projectId: string) => string; action?: never } | { label: string; action: "scan"; to?: never };
}

const STEPS: StepConfig[] = [
  {
    step: "connect",
    title: "1. Verbinden",
    description: "Verknüpfe Search Console, DataForSEO und OpenAI, damit climbr aus echten Daten arbeitet.",
    cta: { label: "Verbindungen prüfen", to: () => `/seo` },
  },
  {
    step: "discover",
    title: "2. Entdecken",
    description: "Lass climbr deine Daten nach Chancen durchsuchen: schwache Klickraten, knappe Positionen, gefallene Klicks.",
    cta: { label: "Chancen analysieren", action: "scan" },
  },
  {
    step: "optimize",
    title: "3. Optimieren",
    description: "Wandle Chancen in konkrete Aufgaben um und arbeite sie der Reihe nach ab.",
    cta: { label: "Aufgaben öffnen", to: (id) => `/seo/tasks?project=${id}` },
  },
  {
    step: "publish",
    title: "4. Veröffentlichen",
    description: "Erstelle Content-Briefings und setze die Änderungen live.",
    cta: { label: "Briefings öffnen", to: (id) => `/seo/briefs?project=${id}` },
  },
  {
    step: "review",
    title: "5. Auswerten",
    description: "Schau dir an, was die Arbeit dieses Monats gebracht hat – Klicks, Positionen, erledigte Aufgaben.",
    cta: { label: "Fortschritt ansehen", to: (id) => `/seo/reports?project=${id}` },
  },
];

export default function SeoWorkflow() {
  return (
    <SeoLayout
      title="Monatsplan"
      subtitle="Dein SEO-Workflow in fünf Schritten – jeden Monat aufs Neue."
    >
      {(projectId) => (projectId ? <WorkflowBody projectId={projectId} /> : null)}
    </SeoLayout>
  );
}

function WorkflowBody({ projectId }: { projectId: string }) {
  const session = useSession();
  const toast = useToast();
  const [state, setState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    if (!session.token) return;
    try {
      setState(await getWorkflow(session.token, projectId));
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Workflow konnte nicht geladen werden.");
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

  async function setStepStatus(step: WorkflowState["steps"][number]["step"], status: "open" | "in_progress" | "done") {
    if (!session.token || !state) return;
    setBusy(step);
    const prev = state;
    setState({
      ...state,
      steps: state.steps.map((s) => (s.step === step ? { ...s, status, progress: status === "done" ? 100 : status === "in_progress" ? 50 : 0 } : s)),
    });
    try {
      await updateWorkflowStep(session.token, projectId, step, status);
    } catch (e) {
      setState(prev);
      toast.push("error", e instanceof Error ? e.message : "Status konnte nicht geändert werden.");
    } finally {
      setBusy(null);
    }
  }

  async function runScan() {
    if (!session.token) return;
    setBusy("discover");
    try {
      const res = await scanOpportunities(session.token, projectId);
      toast.push("success", `${res.inserted} Chance(n) erkannt${res.gsc ? "" : " (Beispieldaten)"}.`);
      await refresh();
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Analyse fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  if (loading || !state) {
    return <div className="text-ink-muted">Lade Monatsplan…</div>;
  }

  const overall = Math.round(state.steps.reduce((acc, s) => acc + s.progress, 0) / state.steps.length);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-bg-raised/60 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">{formatPeriod(state.period)}</h2>
          <div className="text-sm text-ink-muted">
            Gesamtfortschritt: <span className="font-semibold text-ink">{overall}%</span>
          </div>
        </div>
        <ProgressBar value={overall} />
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-ink-muted sm:grid-cols-4">
          <Stat label="Chancen offen" value={state.counts.opportunitiesOpen} />
          <Stat label="Aufgaben offen" value={state.counts.tasksOpen} />
          <Stat label="Aufgaben erledigt" value={state.counts.tasksDone} />
          <Stat label="Aufgaben gesamt" value={state.counts.tasksTotal} />
        </div>
      </div>

      <ol className="space-y-3">
        {STEPS.map((cfg) => {
          const live = state.steps.find((s) => s.step === cfg.step);
          if (!live) return null;
          const done = live.status === "done";
          return (
            <li
              key={cfg.step}
              className={`rounded-lg border p-5 transition ${
                done
                  ? "border-accent/40 bg-accent-dim"
                  : live.status === "in_progress"
                    ? "border-line-strong bg-bg-raised/70"
                    : "border-line bg-bg-raised/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-ink">{cfg.title}</h3>
                    <StatusPill status={live.status} />
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{cfg.description}</p>
                  <ProgressBar value={live.progress} thin />
                </div>
                <div className="flex flex-col items-end gap-2">
                  {cfg.cta?.action === "scan" ? (
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={() => void runScan()}
                      disabled={busy === "discover"}
                    >
                      {busy === "discover" ? "Analyse läuft…" : cfg.cta.label}
                    </button>
                  ) : cfg.cta?.to ? (
                    <Link to={cfg.cta.to(projectId)} className="btn-primary text-sm">{cfg.cta.label}</Link>
                  ) : null}
                  {!done ? (
                    <button
                      type="button"
                      className="text-xs text-ink-muted hover:text-ink"
                      onClick={() => void setStepStatus(cfg.step, "done")}
                      disabled={busy === cfg.step}
                    >
                      Als erledigt markieren
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-ink-muted hover:text-ink"
                      onClick={() => void setStepStatus(cfg.step, "in_progress")}
                      disabled={busy === cfg.step}
                    >
                      Wieder öffnen
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ProgressBar({ value, thin }: { value: number; thin?: boolean }) {
  return (
    <div className={`mt-3 w-full overflow-hidden rounded-full bg-white/[0.05] ${thin ? "h-1" : "h-2"}`}>
      <div
        className="h-full rounded-full bg-accent transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function StatusPill({ status }: { status: "open" | "in_progress" | "done" }) {
  if (status === "done") return <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-black">erledigt</span>;
  if (status === "in_progress") return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink">in arbeit</span>;
  return <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-ink-muted">offen</span>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  );
}

function formatPeriod(period: string): string {
  const [y, m] = period.split("-");
  const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const idx = Math.max(0, Math.min(11, parseInt(m ?? "1", 10) - 1));
  return `${months[idx] ?? ""} ${y ?? ""}`;
}
