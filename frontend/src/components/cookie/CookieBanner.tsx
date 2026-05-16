import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { readConsent, writeConsent, REOPEN_EVENT } from "./consent";

export { reopenCookieBanner } from "./consent";

/**
 * DSGVO-konformer Cookie-Banner. Kein Dark Pattern — beide Buttons sind
 * gleich groß und gleich prominent. Da wir nur technisch notwendige
 * Session-Cookies setzen, dient der Banner primär der Transparenz; eine
 * Ablehnung ändert nichts an der Funktionalität.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState<boolean>(() => readConsent() === null);

  useEffect(() => {
    function onReopen() {
      setVisible(true);
    }
    window.addEventListener(REOPEN_EVENT, onReopen);
    return () => window.removeEventListener(REOPEN_EVENT, onReopen);
  }, []);

  if (!visible) return null;

  function accept() {
    writeConsent("accepted");
    setVisible(false);
  }
  function reject() {
    writeConsent("rejected");
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie-Hinweis"
      data-testid="cookie-banner"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-xl border border-line bg-white/[0.03] backdrop-blur-md p-4 shadow-lg sm:p-5"
    >
      <h2 className="text-sm font-semibold text-ink">Cookies und Datenschutz</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Wir nutzen technisch notwendige Cookies für den Login und die Session.
        Keine Tracking- oder Werbe-Cookies. Mehr in unserer{" "}
        <Link to="/legal/datenschutz" className="text-accent underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={accept}
          data-testid="cookie-accept"
          className="btn-primary flex-1 text-sm"
        >
          Verstanden
        </button>
        <button
          type="button"
          onClick={reject}
          data-testid="cookie-reject"
          className="btn-ghost flex-1 text-sm"
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
