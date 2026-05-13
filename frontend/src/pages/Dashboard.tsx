import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ensureSupabase } from "../lib/supabase";
import { useSession } from "../lib/useSession";
import { useToast } from "../components/Toast";

interface Project {
  id: string;
  domain: string;
  gsc_connected: boolean;
  gsc_connected_at: string | null;
  created_at: string;
}

const STATUS_COPY: Record<string, { kind: "ok" | "warn" | "err"; text: string }> = {
  connected:        { kind: "ok",   text: "Google Search Console connected ✓" },
  denied:           { kind: "warn", text: "Connection cancelled — you declined the Google consent." },
  bad_state:        { kind: "err",  text: "Connection link expired or invalid — please retry." },
  bad_request:      { kind: "err",  text: "Missing required parameters from Google's callback." },
  forbidden:        { kind: "err",  text: "Project ownership check failed." },
  no_refresh_token: { kind: "err",  text: "Google did not return a refresh token. Revoke access in your Google Account and retry." },
  no_property:      { kind: "warn", text: "We couldn't find a verified GSC property matching this project's domain." },
  save_failed:      { kind: "err",  text: "Could not save the connection. Please retry." },
  failed:           { kind: "err",  text: "Connection failed. Please retry." },
};

export default function Dashboard() {
  const session = useSession();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const gscStatus = params.get("gsc");

  useEffect(() => {
    if (session.loading) return;
    if (!session.token) return;
    void loadProjects();
  }, [session.loading, session.token]);

  async function loadProjects() {
    try {
      const sb = ensureSupabase();
      const { data, error } = await sb
        .from("projects")
        .select("id, domain, gsc_connected, gsc_connected_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProjects(data as Project[]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load projects");
    }
  }

  async function connectGsc(projectId: string) {
    if (!session.token) return;
    setBusyId(projectId);
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
      toast.push("error", e instanceof Error ? e.message : "Failed to start GSC connect");
      setBusyId(null);
    }
  }

  async function disconnectGsc(projectId: string) {
    if (!session.token) return;
    setBusyId(projectId);
    try {
      const res = await fetch(`/api/gsc/disconnect?projectId=${projectId}`, {
        method: "POST",
        headers: { authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.push("info", "GSC disconnected");
      await loadProjects();
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setBusyId(null);
    }
  }

  if (!session.loading && !session.token) {
    return <Navigate to="/login" replace state={{ next: "/dashboard" }} />;
  }

  const banner = gscStatus ? STATUS_COPY[gscStatus] : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link to="/projects/new" className="btn-primary">+ New project</Link>
      </div>

      {banner && (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            banner.kind === "ok" ? "border-green-200 bg-green-50 text-green-800"
              : banner.kind === "warn" ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          <div className="flex items-center justify-between">
            <span>{banner.text}</span>
            <button
              onClick={() => { params.delete("gsc"); params.delete("projectId"); setParams(params); }}
              className="text-xs underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {loadError && <p className="mt-4 text-sm text-red-600" role="alert">{loadError}</p>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Projects</h2>
        {session.loading ? (
          <p className="mt-2 text-slate2">Loading…</p>
        ) : projects.length === 0 ? (
          <div className="card mt-4">
            <p className="text-slate2">
              No projects yet. Create one to start running audits and tracking rankings.
            </p>
            <Link to="/projects/new" className="btn-primary mt-4 inline-block">Create your first project</Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {projects.map((p) => (
              <li key={p.id} className="card flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <Link to={`/projects/${p.id}`} className="font-medium text-primary hover:underline">
                    {p.domain}
                  </Link>
                  <p className="text-sm text-slate2">
                    {p.gsc_connected ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
                        GSC connected
                        {p.gsc_connected_at && (
                          <span className="text-slate2"> · last sync {new Date(p.gsc_connected_at).toLocaleDateString()}</span>
                        )}
                      </span>
                    ) : "GSC not connected"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {p.gsc_connected ? (
                    <button
                      onClick={() => disconnectGsc(p.id)}
                      className="btn-ghost"
                      disabled={busyId === p.id}
                    >
                      {busyId === p.id ? "…" : "Disconnect GSC"}
                    </button>
                  ) : (
                    <button
                      onClick={() => connectGsc(p.id)}
                      className="btn-ghost"
                      disabled={busyId === p.id}
                    >
                      {busyId === p.id ? "Redirecting…" : "Connect GSC"}
                    </button>
                  )}
                  <Link to={`/projects/${p.id}`} className="btn-primary">Open</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
