import { Link, NavLink } from "react-router-dom";

/**
 * Minimaler Header für die öffentlichen Routen (Landing, Login, Signup,
 * Pricing, anonymer Audit-Report, Wiki). Die authentifizierten Routen
 * nutzen stattdessen <AppShell> mit voller TopNav + Sidebar.
 */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/60 backdrop-blur-xl">
      <nav
        aria-label="Hauptnavigation"
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5"
      >
        <Link to="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-ink">
          <span className="inline-block h-6 w-6 rounded-md bg-accent shadow-glow-sm" aria-hidden="true" />
          climbr.io
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <NavItem to="/wiki">Wiki</NavItem>
          <NavItem to="/#audit">Audit starten</NavItem>
          <NavItem to="/pricing">Preise</NavItem>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link to="/login" className="rounded-md px-3 py-1.5 text-ink-muted transition-colors hover:text-ink">
            Anmelden
          </Link>
          <Link to="/signup" className="btn-ghost">Registrieren</Link>
        </div>
      </nav>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  // `/#audit` is just a same-page anchor on the Landing, so render as a
  // plain anchor instead of NavLink to avoid React-Router intercepting it.
  if (to.startsWith("/#")) {
    return (
      <a
        href={to}
        className="rounded-md px-3 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        {children}
      </a>
    );
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-1.5 text-sm transition-colors ${
          isActive ? "text-ink" : "text-ink-muted hover:text-ink"
        }`
      }
    >
      {children}
    </NavLink>
  );
}
