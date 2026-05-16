import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ensureSupabase } from "../lib/supabase";
import { germanAuthError } from "../lib/authErrors";

type Mode = "password" | "magic-link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("password");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const navigate = useNavigate();

  // Wenn bereits eingeloggt: direkt auf Dashboard.
  useEffect(() => {
    const sb = ensureSupabase();
    void sb.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard", { replace: true });
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate("/dashboard", { replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const sb = ensureSupabase();
      if (mode === "password") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Navigation passiert über onAuthStateChange.
      } else {
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        setMagicSent(true);
      }
    } catch (e) {
      setErr(germanAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  if (magicSent) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">E-Mail überprüfen</h1>
        <p className="mt-2 text-ink-muted">
          Wir haben dir einen Anmelde-Link an <strong>{email}</strong> geschickt.
          Schau auch im Spam-Ordner.
        </p>
        <button
          type="button"
          onClick={() => setMagicSent(false)}
          className="mt-4 text-sm text-accent hover:underline"
        >
          Andere E-Mail-Adresse nutzen
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16" data-testid="login-page">
      <h1 className="text-2xl font-bold">Anmelden</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Willkommen zurück bei climbr.io.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium">
            E-Mail-Adresse
          </label>
          <input
            id="login-email"
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

        {mode === "password" && (
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="block text-sm font-medium">
                Passwort
              </label>
              <Link
                to="/passwort-vergessen"
                className="text-xs text-accent hover:underline"
              >
                Passwort vergessen?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className="input mt-1"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={busy}
          data-testid="login-submit"
        >
          {busy
            ? "Bitte warten…"
            : mode === "password"
              ? "Anmelden"
              : "Magic Link senden"}
        </button>

        {err && (
          <p className="text-sm text-red-400" role="alert">
            {err}
          </p>
        )}

        <div className="text-center text-xs text-ink-muted">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "password" ? "magic-link" : "password");
              setErr(null);
            }}
            className="hover:underline"
          >
            {mode === "password"
              ? "Lieber per Magic Link anmelden? →"
              : "← Zurück zur Passwort-Anmeldung"}
          </button>
        </div>
      </form>

      <hr className="my-8 border-line" />

      <div className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm">
        <p className="font-medium text-ink">Neu hier?</p>
        <p className="mt-1 text-ink-muted">
          Erstelle einen kostenlosen Account — keine Kreditkarte nötig.
        </p>
        <Link to="/signup" className="mt-2 inline-block text-accent hover:underline">
          Account anlegen →
        </Link>
      </div>
    </div>
  );
}
