import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../../lib/useSession";
import { ensureSupabase } from "../../lib/supabase";
import { NotificationDropdown } from "./NotificationDropdown";

interface Props {
  onToggleSidebar: () => void;
}

export function TopNav({ onToggleSidebar }: Props) {
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    const sb = ensureSupabase();
    await sb.auth.signOut();
    window.location.href = "/login";
  }

  const initial = session.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Seitenleiste umschalten"
          data-testid="sidebar-toggle"
          className="rounded-md p-2 text-slate2 hover:bg-slate-100 lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M3 5h14v2H3zM3 9h14v2H3zM3 13h14v2H3z" />
          </svg>
        </button>

        <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold text-ink">
          <span className="inline-block h-7 w-7 rounded-md bg-primary" aria-hidden="true" />
          climbr.io
        </Link>

        <nav aria-label="Hauptnavigation" className="ml-6 hidden items-center gap-1 md:flex">
          <NavItem to="/dashboard">Dashboard</NavItem>
          <NavItem to="/wiki">Wiki</NavItem>
          <NavItem to="/einstellungen">Einstellungen</NavItem>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NotificationDropdown />

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Konto-Menü"
              data-testid="account-menu-button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary"
            >
              {initial}
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                >
                  <div className="border-b border-slate-100 px-3 py-2 text-xs text-slate2">
                    {session.email ?? "Nicht eingeloggt"}
                  </div>
                  <Link
                    to="/einstellungen"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-ink hover:bg-slate-50"
                  >
                    Einstellungen
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    data-testid="signout-button"
                    className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-slate-50"
                  >
                    Abmelden
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-1.5 text-sm transition ${
          isActive ? "bg-primary-50 text-primary" : "text-slate2 hover:bg-slate-100 hover:text-ink"
        }`
      }
    >
      {children}
    </NavLink>
  );
}
