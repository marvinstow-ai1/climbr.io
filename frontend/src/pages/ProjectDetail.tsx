import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { ensureSupabase } from "../lib/supabase";
import { useToast } from "../components/Toast";
import Tabs from "../components/Tabs";
import AuditsTab from "../components/project/AuditsTab";
import RankingsTab from "../components/project/RankingsTab";
import NotificationsTab from "../components/project/NotificationsTab";
import OverviewTab from "../components/project/OverviewTab";

interface Project {
  id: string;
  domain: string;
  gsc_connected: boolean;
  gsc_connected_at: string | null;
  created_at: string;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const session = useSession();
  const toast = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const sb = ensureSupabase();
      const { data, error } = await sb
        .from("projects")
        .select("id, domain, gsc_connected, gsc_connected_at, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setError("Project not found or you don't have access.");
        return;
      }
      setProject(data as Project);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    }
  }, [id]);

  useEffect(() => {
    if (session.loading) return;
    if (!session.token) return;
    void load();
  }, [session.loading, session.token, load]);

  if (!session.loading && !session.token) {
    return <Navigate to="/login" replace state={{ next: `/projects/${id}` }} />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-red-600" role="alert">{error}</p>
        <Link to="/dashboard" className="mt-4 inline-block text-primary underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-slate2">Loading project…</p>
      </div>
    );
  }

  if (!id || !session.token) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate2">Project</p>
          <h1 className="text-3xl font-bold">{project.domain}</h1>
          <p className="mt-1 text-xs text-slate2">
            Created {new Date(project.created_at).toLocaleDateString()}
          </p>
        </div>
        {project.gsc_connected && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
            title={project.gsc_connected_at ? `Last sync ${new Date(project.gsc_connected_at).toLocaleString()}` : undefined}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
            GSC connected
            {project.gsc_connected_at && (
              <span className="text-green-600">
                · {new Date(project.gsc_connected_at).toLocaleDateString()}
              </span>
            )}
          </span>
        )}
      </header>

      <div className="mt-8">
        <Tabs
          tabs={[
            {
              id: "overview",
              label: "Overview",
              content: (
                <OverviewTab
                  projectId={id}
                  token={session.token}
                  domain={project.domain}
                  onNotify={(k, m) => toast.push(k, m)}
                />
              ),
            },
            {
              id: "audits",
              label: "Audits",
              content: (
                <AuditsTab
                  projectId={id}
                  domain={project.domain}
                  token={session.token}
                  onNotify={(k, m) => toast.push(k, m)}
                />
              ),
            },
            {
              id: "rankings",
              label: "Rankings",
              content: (
                <RankingsTab
                  projectId={id}
                  token={session.token}
                  gscConnected={project.gsc_connected}
                  onNotify={(k, m) => toast.push(k, m)}
                />
              ),
            },
            {
              id: "notifications",
              label: "Notifications",
              content: (
                <NotificationsTab
                  projectId={id}
                  token={session.token}
                  onNotify={(k, m) => toast.push(k, m)}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
