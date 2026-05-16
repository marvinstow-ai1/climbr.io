import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ensureSupabase } from "../lib/supabase";
import { germanAuthError } from "../lib/authErrors";

/**
 * Empfangsseite für den Passwort-Reset-Link.
 *
 * Supabase setzt beim Klick auf den Reset-Link einen Access-Token in den
 * URL-Hash; supabase-js parsed das beim Laden automatisch und stellt eine
 * temporäre Session her. In dieser Session können wir updateUser({ password })
 * aufrufen — und der User ist danach wieder mit neuem Passwort eingeloggt.
 */
export default function PasswortNeu() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const sb = ensureSupabase();
    void sb.auth.getSession().then(({ data }) => {
      setSessionReady(!!data.session);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setSessionReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const pwLong = pw.length >= 8;
  const pwMatch = pw === confirm && confirm.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!pwLong || !pwMatch) return;
    setBusy(true);
    try {
      const sb = ensureSupabase();
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) throw error;
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setErr(germanAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!sessionReady) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Link ungültig oder abgelaufen</h1>
        <p className="mt-2 text-ink-muted">
          Der Link zum Passwort-Zurücksetzen ist abgelaufen oder wurde schon
          verwendet. Bitte fordere einen neuen an.
        </p>
        <Link
          to="/passwort-vergessen"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          Neuen Link anfordern →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Neues Passwort setzen</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="new-pw" className="block text-sm font-medium">Neues Passwort</label>
          <input
            id="new-pw"
            type="password"
            autoComplete="new-password"
            className="input mt-1"
            minLength={8}
            required
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            disabled={busy}
          />
          <p className={`mt-1 text-xs ${pwLong ? "text-accent" : "text-ink-muted"}`}>
            {pwLong ? "✓ Mindestens 8 Zeichen" : "Mindestens 8 Zeichen"}
          </p>
        </div>

        <div>
          <label htmlFor="confirm-pw" className="block text-sm font-medium">Bestätigen</label>
          <input
            id="confirm-pw"
            type="password"
            autoComplete="new-password"
            className="input mt-1"
            minLength={8}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
          />
          {confirm.length > 0 && (
            <p className={`mt-1 text-xs ${pwMatch ? "text-accent" : "text-red-400"}`}>
              {pwMatch ? "✓ Passwörter stimmen überein" : "Passwörter stimmen nicht überein"}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={busy || !pwLong || !pwMatch}
        >
          {busy ? "Wird gespeichert…" : "Neues Passwort speichern"}
        </button>

        {err && <p className="text-sm text-red-400" role="alert">{err}</p>}
      </form>
    </div>
  );
}
