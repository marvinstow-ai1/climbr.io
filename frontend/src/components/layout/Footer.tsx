import { Link } from "react-router-dom";
import { reopenCookieBanner } from "../cookie/CookieBanner";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate2">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>© {new Date().getFullYear()} climbr.io</span>
        <span aria-hidden="true">·</span>
        <Link to="/legal/impressum" className="hover:text-ink">Impressum</Link>
        <span aria-hidden="true">·</span>
        <Link to="/legal/datenschutz" className="hover:text-ink">Datenschutz</Link>
        <span aria-hidden="true">·</span>
        <Link to="/legal/agb" className="hover:text-ink">AGB</Link>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={reopenCookieBanner}
          className="hover:text-ink"
          data-testid="footer-cookie-settings"
        >
          Cookie-Einstellungen
        </button>
      </div>
    </footer>
  );
}
