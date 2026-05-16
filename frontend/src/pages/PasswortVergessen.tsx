import { useState } from "react";
import { Link } from "react-router-dom";
import { ensureSupabase } from "../lib/supabase";
import { germanAuthError } from "../lib/authErrors";

export default function PasswortVergessen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const sb = ensureSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/passwort-neu`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setErr(germanAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center" data-testid="reset-sent">
        <h1 className="text-2xl font-bold">E-Mail überprüfen</h1>
        <p className="mt-2 text-ink-muted">
          Wenn ein Account zu <strong>{email}</strong> existiert, haben wir dir
          eine E-Mail mit einem Link zum Zurücksetzen des Passworts geschickt.
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Schau auch im Spam-Ordner. Der Link ist 60 Minuten gültig.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm text-accent hover:underline">
          ← Zurück zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Passwort vergessen</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Trag deine E-Mail-Adresse ein — wir schicken dir einen Link, mit dem
        du ein neues Passwort setzen kannst.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium">
            E-Mail-Adresse
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            className="input mt-1"
            placeholder="du@beispiel.de"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Wird gesendet…" : "Link anfordern"}
        </button>

        {err && <p className="text-sm text-red-400" role="alert">{err}</p>}
      </form>

      <div className="mt-6 text-center text-sm">
        <Link to="/login" className="text-ink-muted hover:text-ink">
          ← Zurück zur Anmeldung
        </Link>
      </div>
    </div>
  );
}
