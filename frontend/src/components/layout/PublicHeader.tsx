import { Link } from "react-router-dom";

/**
 * Minimaler Header für die öffentlichen Routen (Landing, Login, Signup,
 * Pricing, anonymer Audit-Report). Die authentifizierten Routen nutzen
 * stattdessen <AppShell> mit voller TopNav + Sidebar.
 */
export function PublicHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav
        aria-label="Hauptnavigation"
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
      >
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-ink">
          <span className="inline-block h-7 w-7 rounded-md bg-primary" aria-hidden="true" />
          climbr.io
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link to="/login" className="text-slate2 hover:text-ink">Anmelden</Link>
          <Link to="/signup" className="btn-ghost">Registrieren</Link>
        </div>
      </nav>
    </header>
  );
}
