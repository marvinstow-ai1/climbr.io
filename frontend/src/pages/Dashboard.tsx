import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { ensureSupabase } from "../lib/supabase";
import { useSession } from "../lib/useSession";
import { useToast } from "../components/Toast";
import type { AppShellContext } from "../components/layout/AppShell";
import { OverviewCards } from "../components/dashboard/OverviewCards";
import { ProjectTable } from "../components/dashboard/ProjectTable";
import { EmptyDashboard } from "../components/dashboard/EmptyDashboard";
import {
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

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
      data-testid="dashboard-page"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Dashboard</h1>
        <Link to="/projects/new" className="btn-primary">+ Neues Projekt</Link>
      </div>

      {loadError && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {loadError}
        </p>
      )}

      <section className="mt-6">
        <OverviewCards
          projects={projects}
          latestAudit={latestAudit}
          movements={movements}
        />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Deine Projekte</h2>
        {projectsLoading ? (
          <p className="text-slate2">Lade…</p>
        ) : projects.length === 0 ? (
          <EmptyDashboard />
        ) : (
          <ProjectTable
            rows={rows}
            busyProjectId={busyProjectId}
            onConnectGsc={connectGsc}
            onDisconnectGsc={disconnectGsc}
          />
        )}
      </section>
    </div>
  );
}
