import { Link } from "react-router-dom";

export function EmptyDashboard() {
  return (
    <div
      data-testid="empty-dashboard"
      className="card flex flex-col items-center gap-3 py-12 text-center"
    >
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-dim text-3xl text-accent"
      >
        🚀
      </div>
      <h3 className="text-xl font-semibold text-ink">
        Noch kein Projekt angelegt
      </h3>
      <p className="max-w-md text-ink-muted">
        Starte jetzt deinen ersten SEO-Check — dauert 30 Sekunden. Wir analysieren
        deine Domain, finden die wichtigsten Verbesserungspunkte und erklären dir
        jeden Schritt.
      </p>
      <Link to="/projects/new" className="btn-primary mt-2">
        Erstes Projekt anlegen
      </Link>
    </div>
  );
}
