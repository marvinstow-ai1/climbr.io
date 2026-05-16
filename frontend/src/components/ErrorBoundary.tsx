import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level boundary. Without it, a single throw in a useEffect (e.g.
 * `ensureSupabase()` when VITE_SUPABASE_* are missing at build time)
 * unmounts the whole tree → black screen. The boundary turns that into a
 * legible page with the actual diagnostic the user needs.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[climbr] uncaught render error:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const isEnvIssue = /Supabase env vars missing/i.test(this.state.error.message);
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {isEnvIssue ? "Konfiguration fehlt" : "Etwas ist schiefgelaufen"}
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          {isEnvIssue
            ? "Die Supabase-Verbindung ist nicht konfiguriert. Setze VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in den Vercel-Projekt-Einstellungen und triggere einen Redeploy."
            : "Bitte lade die Seite neu. Falls der Fehler bleibt, schreib uns eine Nachricht."}
        </p>
        <pre className="mt-6 max-w-full overflow-x-auto rounded-lg border border-line bg-white/[0.03] p-4 text-left text-xs text-ink-muted backdrop-blur-md">
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-ghost mt-6"
        >
          Neu laden
        </button>
      </div>
    );
  }
}
