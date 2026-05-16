import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { ensureSupabase } from "../lib/supabase";
import { useSession } from "../lib/useSession";
import { useToast } from "../components/Toast";
import type { AppShellContext } from "../components/layout/AppShell";
import { OverviewCards } from "../components/dashboard/OverviewCards";
import { ProjectTable } from "../components/dashboard/ProjectTable";
import { EmptyDashboard } from "../components/dashboard/EmptyDashboard";
import { VisibilityTrend } from "../components/dashboard/VisibilityTrend";
import { SourcesChart } from "../components/dashboard/SourcesChart";
import { RisingKeywords } from "../components/dashboard/RisingKeywords";
import {
  computeAverageScore,
  computeKeywordMovements,
  pickLatestAudit,
} from "../components/dashboard/metrics";
import type {
  DashboardAudit,
  DashboardRanking,
} from "../components/dashboard/types";

const GSC_STATUS_COPY: Record<string, { kind: "ok" | "warn" | "err"; text: string }> = {
  connected:        { kind: "ok",   text: "Google Search Console verbunden ✓" },
  denied:           { kind: "warn", text: "Verbindung abgebrochen — du hast Googles Einwilligung verweigert." },
  bad_state:        { kind: "err",  text: "Verbindungslink ist abgelaufen oder ungültig — bitte erneut versuchen." },
  bad_request:      { kind: "err",  text: "Fehlende Parameter im Google-Callback." },
  forbidden:        { kind: "err",  text: "Projekt-Berechtigung konnte nicht geprüft werden." },
  no_refresh_token: { kind: "err",  text: "Google hat keinen Refresh-Token zurückgegeben. Bitte den Zugriff im Google-Konto widerrufen und erneut versuchen." },
  no_property:      { kind: "warn", text: "Keine verifizierte GSC-Property für diese Domain gefunden." },
  save_failed:      { kind: "err",  text: "Verbindung konnte nicht gespeichert werden. Bitte erneut versuchen." },
  failed:           { kind: "err",  text: "Verbindung fehlgeschlagen. Bitte erneut versuchen." },
};

export default function Dashboard() {
  const session = useSession();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { projects, projectsLoading } = useOutletContext<AppShellContext>();
  const [audits, setAudits] = useState<DashboardAudit[]>([]);
  const [rankings, setRankings] = useState<DashboardRanking[]>([]);
  const [keywordCounts, setKeywordCounts] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

  const gscStatus = params.get("gsc");

  async function connectGsc(projectId: string) {
    if (!session.token) return;
    setBusyProjectId(projectId);
    try {
      const res = await fetch(`/api/gsc/connect?projectId=${projectId}`, {
        method: "POST",
        headers: { authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      const { authorizeUrl } = (await res.json()) as { authorizeUrl: string };
      window.location.href = authorizeUrl;
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "GSC-Verbindung fehlgeschlagen.");
      setBusyProjectId(null);
    }
  }

  async function disconnectGsc(projectId: string) {
    if (!session.token) return;
    setBusyProjectId(projectId);
    try {
      const res = await fetch(`/api/gsc/disconnect?projectId=${projectId}`, {
        method: "POST",
        headers: { authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.push("info", "GSC getrennt.");
      window.location.reload();
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "GSC konnte nicht getrennt werden.");
    } finally {
      setBusyProjectId(null);
    }
  }

  useEffect(() => {
    if (session.loading || !session.token) return;
    let cancelled = false;
    void (async () => {
      try {
        const sb = ensureSupabase();
        const [a, r, k] = await Promise.all([
          sb
            .from("audits")
            .select("id, project_id, url, score, status, created_at")
            .order("created_at", { ascending: false })
            .limit(50),
          sb
            .from("rankings")
            .select("project_id, keyword, position, recorded_at")
            .order("recorded_at", { ascending: false })
            .limit(500),
          sb.from("keywords").select("project_id"),
        ]);

        if (cancelled) return;
        if (a.error) throw a.error;
        if (r.error) throw r.error;
        if (k.error) throw k.error;

        setAudits((a.data ?? []) as DashboardAudit[]);
        setRankings((r.data ?? []) as DashboardRanking[]);

        const counts: Record<string, number> = {};
        for (const row of (k.data ?? []) as { project_id: string }[]) {
          counts[row.project_id] = (counts[row.project_id] ?? 0) + 1;
        }
        setKeywordCounts(counts);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Daten konnten nicht geladen werden.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.loading, session.token]);

  const latestAudit = useMemo(() => pickLatestAudit(audits), [audits]);
  const movements = useMemo(() => computeKeywordMovements(rankings, 7), [rankings]);
  const averageScore = useMemo(
    () => computeAverageScore(projects, audits),
    [projects, audits],
  );
  const totalKeywords = useMemo(
    () => Object.values(keywordCounts).reduce((s, n) => s + n, 0),
    [keywordCounts],
  );

  const rows = useMemo(
    () =>
      projects.map((project) => ({
        project,
        latestAudit:
          audits.find((a) => a.project_id === project.id && a.status === "complete") ?? null,
        keywordCount: keywordCounts[project.id] ?? 0,
      })),
    [projects, audits, keywordCounts],
  );

  const banner = gscStatus ? GSC_STATUS_COPY[gscStatus] : null;

  useEffect(() => {
    if (banner) {
      toast.push(banner.kind === "ok" ? "success" : banner.kind === "warn" ? "info" : "error", banner.text);
      params.delete("gsc");
      params.delete("projectId");
      setParams(params, { replace: true });
    }
  }, [banner]);

  const isEmpty = !projectsLoading && projects.length === 0;

  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8"
      data-testid="dashboard-page"
    >
      <DashboardHeader />

      {loadError && (
        <p className="mt-4 rounded-lg border border-rose-dim bg-rose-dim px-4 py-2 text-sm text-rose" role="alert">
          {loadError}
        </p>
      )}

      {isEmpty ? (
        <section className="mt-6">
          <EmptyDashboard />
        </section>
      ) : (
        <>
          <section className="mt-6">
            <OverviewCards
              projects={projects}
              latestAudit={latestAudit}
              movements={movements}
              averageScore={averageScore}
              totalKeywords={totalKeywords}
            />
          </section>

          <section className="mt-4 rounded-xl border border-accent/30 bg-accent-dim p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">SEO-Workflow starten</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Verbindungen prüfen, Chancen entdecken, Aufgaben abarbeiten —
                  alles in einem geführten Monatsplan.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/seo/workflow" className="btn-primary text-sm">Monatsplan öffnen</Link>
                <Link to="/seo" className="btn-ghost text-sm">Verbindungen</Link>
              </div>
            </div>
          </section>

          <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <VisibilityTrend rankings={rankings} />
            </div>
            <div>
              <SourcesChart projects={projects} audits={audits} />
            </div>
          </section>

          <section className="mt-4">
            <RisingKeywords rankings={rankings} projects={projects} />
          </section>

          <section className="mt-4">
            {projectsLoading ? (
              <p className="text-ink-muted">Lade…</p>
            ) : (
              <ProjectTable
                rows={rows}
                busyProjectId={busyProjectId}
                onConnectGsc={connectGsc}
                onDisconnectGsc={disconnectGsc}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function DashboardHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-subtle">
          Workspace · Übersicht
        </div>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Performance
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <label className="relative hidden sm:block">
          <span className="sr-only">Projekte durchsuchen</span>
          <input
            type="search"
            placeholder="Projekte, Keywords durchsuchen…"
            className="input h-9 w-64 py-2 pl-9 text-sm"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-ink-muted"
          >
            <path d="M9 3a6 6 0 014.47 10.03l3.25 3.25-1.42 1.41-3.24-3.25A6 6 0 119 3zm0 2a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        </label>
        <Link to="/projects/new" className="btn-primary h-9 px-4 py-2 text-sm">
          + Neues Projekt
        </Link>
      </div>
    </div>
  );
}
