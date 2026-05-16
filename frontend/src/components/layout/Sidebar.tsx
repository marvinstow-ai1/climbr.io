import { Link, NavLink } from "react-router-dom";
import type { DashboardProject } from "../dashboard/types";

interface Props {
  projects: DashboardProject[];
  loading: boolean;
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const ICON_OVERVIEW = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M3 3h7v7H3V3zm0 9h7v5H3v-5zm9-9h5v5h-5V3zm0 7h5v7h-5v-7z" />
  </svg>
);
const ICON_WIKI = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M4 3h9a3 3 0 013 3v11H7a3 3 0 01-3-3V3zm2 2v9a1 1 0 001 1h7a1 1 0 001-1V6a1 1 0 00-1-1H6z" />
  </svg>
);
const ICON_SETTINGS = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M10 6a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4zM8.2 1.6l.3 1.6c.5.1 1 .3 1.5.6l1.4-.9 2.6 2.6-.9 1.4c.3.5.5 1 .6 1.5l1.6.3v3.6l-1.6.3c-.1.5-.3 1-.6 1.5l.9 1.4-2.6 2.6-1.4-.9c-.5.3-1 .5-1.5.6l-.3 1.6h-3.6l-.3-1.6c-.5-.1-1-.3-1.5-.6l-1.4.9-2.6-2.6.9-1.4c-.3-.5-.5-1-.6-1.5L-.1 11.8V8.2l1.6-.3c.1-.5.3-1 .6-1.5l-.9-1.4 2.6-2.6 1.4.9c.5-.3 1-.5 1.5-.6l.3-1.6h3.6z" />
  </svg>
);

const TOP_NAV: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: ICON_OVERVIEW },
  { to: "/wiki", label: "Wiki", icon: ICON_WIKI },
];

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
        className={`fixed inset-y-0 left-0 top-14 z-20 w-64 border-r border-line bg-white/[0.03] backdrop-blur-xl p-3 transition-transform lg:static lg:top-0 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex h-full flex-col gap-5" aria-label="Hauptbereiche">
          <section>
            <SectionHeader>Workspace</SectionHeader>
            <ul className="mt-1 space-y-0.5">
              {TOP_NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    end={item.to === "/dashboard"}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition ${
                        isActive
                          ? "bg-accent-dim text-accent"
                          : "text-ink hover:bg-white/[0.04]"
                      }`
                    }
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <SectionHeader>Projekte</SectionHeader>
              <span className="text-[10px] font-semibold tabular-nums text-ink-subtle">
                {projects.length}
              </span>
            </div>
            <ul className="mt-1 space-y-0.5" data-testid="sidebar-project-list">
              {loading && (
                <li className="px-2.5 py-1.5 text-sm text-ink-muted">Lade…</li>
              )}
              {!loading && projects.length === 0 && (
                <li className="px-2.5 py-1.5 text-xs text-ink-muted">
                  Noch keine Projekte
                </li>
              )}
              {projects.map((p) => (
                <li key={p.id}>
                  <NavLink
                    to={`/projects/${p.id}`}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 truncate rounded-md px-2.5 py-1.5 text-sm transition ${
                        isActive
                          ? "bg-accent-dim font-medium text-accent"
                          : "text-ink hover:bg-white/[0.04]"
                      }`
                    }
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-dim text-[10px] font-semibold text-violet"
                      aria-hidden="true"
                    >
                      {p.domain.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 truncate">{p.domain}</span>
                    {p.gsc_connected && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal"
                        aria-hidden="true"
                        title="GSC verbunden"
                      />
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
            <Link
              to="/projects/new"
              onClick={onClose}
              data-testid="sidebar-new-project"
              className="mt-2 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-accent hover:bg-accent-dim"
            >
              <span aria-hidden="true">+</span>
              <span>Neues Projekt</span>
            </Link>
          </section>

          <section className="mt-auto">
            <SectionHeader>Einstellungen</SectionHeader>
            <ul className="mt-1 space-y-0.5">
              <li>
                <NavLink
                  to="/einstellungen"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition ${
                      isActive
                        ? "bg-accent-dim text-accent"
                        : "text-ink hover:bg-white/[0.04]"
                    }`
                  }
                >
                  <span aria-hidden="true">{ICON_SETTINGS}</span>
                  <span className="flex-1 truncate">Preferences</span>
                </NavLink>
              </li>
            </ul>
          </section>
        </nav>
      </aside>
    </>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
      {children}
    </h2>
  );
}
