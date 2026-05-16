import { Link, NavLink } from "react-router-dom";
import type { DashboardProject } from "../dashboard/types";

interface Props {
  projects: DashboardProject[];
  loading: boolean;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ projects, loading, open, onClose }: Props) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Seitenleiste schließen"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-ink/30 lg:hidden"
        />
      )}
      <aside
        aria-label="Projekt-Navigation"
        data-testid="sidebar"
        className={`fixed inset-y-0 left-0 top-14 z-20 w-64 border-r border-line bg-white/[0.03] backdrop-blur-md p-4 transition-transform lg:static lg:top-0 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Projekte
            </h2>
            <ul className="mt-2 space-y-0.5" data-testid="sidebar-project-list">
              {loading && (
                <li className="px-2 py-1.5 text-sm text-ink-muted">Lade…</li>
              )}
              {!loading && projects.length === 0 && (
                <li className="px-2 py-1.5 text-sm text-ink-muted">
                  Noch keine Projekte
                </li>
              )}
              {projects.map((p) => (
                <li key={p.id}>
                  <NavLink
                    to={`/projects/${p.id}`}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `block truncate rounded-md px-2 py-1.5 text-sm transition ${
                        isActive
                          ? "bg-accent-dim font-medium text-accent"
                          : "text-ink hover:bg-white/[0.02]"
                      }`
                    }
                  >
                    {p.domain}
                  </NavLink>
                </li>
              ))}
            </ul>
            <Link
              to="/projects/new"
              onClick={onClose}
              data-testid="sidebar-new-project"
              className="mt-3 flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-accent hover:bg-accent-dim"
            >
              <span aria-hidden="true">+</span>
              <span>Neues Projekt</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
