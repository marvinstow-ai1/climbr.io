import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ensureSupabase } from "../../lib/supabase";
import { useSession } from "../../lib/useSession";
import type { DashboardProject } from "../dashboard/types";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

/**
 * AppShell is the layout wrapper for all logged-in routes:
 *
 *   <Route element={<AppShell />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *     ...
 *   </Route>
 *
 * It owns the top nav, the sidebar (with the project list — fetched once
 * here and exposed via React Router's outlet context so children can reuse
 * the data without re-fetching), and the footer. Unauthenticated visitors
 * are redirected to /login with the original location preserved.
 */
export function AppShell() {
  const session = useSession();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    if (session.loading || !session.token) {
      setProjectsLoading(session.loading);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const sb = ensureSupabase();
        const { data, error } = await sb
          .from("projects")
          .select("id, domain, gsc_connected, gsc_connected_at, created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!cancelled) setProjects((data ?? []) as DashboardProject[]);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.loading, session.token]);

  if (session.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate2">
        Lade…
      </div>
    );
  }

  if (!session.token) {
    return <Navigate to="/login" replace state={{ next: location.pathname + location.search }} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <TopNav onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="flex flex-1">
        <Sidebar
          projects={projects}
          loading={projectsLoading}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-x-auto">
          <Outlet context={{ projects, projectsLoading } satisfies AppShellContext} />
        </main>
      </div>
      <Footer />
    </div>
  );
}

export interface AppShellContext {
  projects: DashboardProject[];
  projectsLoading: boolean;
}
