import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ensureSupabase } from "../lib/supabase";
import { useToast } from "../components/Toast";
import { germanAuthError } from "../lib/authErrors";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const sb = ensureSupabase();
    void sb.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard", { replace: true });
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        toast.push("success", "Willkommen bei climbr! Leg dein erstes Projekt an.");
        navigate("/dashboard", { replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, toast]);

  const pwLong = password.length >= 8;
  const pwMatch = password === confirm && confirm.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!pwLong) {
      setErr("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (!pwMatch) {
      setErr("Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      const sb = ensureSupabase();
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      // Wenn E-Mail-Bestätigung in Supabase aktiviert ist, kommt keine Session
      // zurück — sondern eine Aufforderung den Bestätigungs-Link zu klicken.
      if (!data.session) {
        setNeedsConfirmation(true);
      }
    } catch (e) {
      setErr(germanAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  if (needsConfirmation) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Fast geschafft!</h1>
        <p className="mt-2 text-slate2">
          Wir haben dir eine Bestätigungs-E-Mail an <strong>{email}</strong>{" "}
          geschickt. Klick den Link und du wirst direkt eingeloggt.
        </p>
        <p className="mt-2 text-xs text-slate2">
          Keine E-Mail? Schau im Spam-Ordner.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16" data-testid="signup-page">
      <h1 className="text-2xl font-bold">Account anlegen</h1>
      <p className="mt-1 text-sm text-slate2">
        Kostenlos starten — keine Kreditkarte, jederzeit kündbar.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium">
            E-Mail-Adresse
          </label>
          <input
            id="signup-email"
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

        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium">
            Passwort
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            className="input mt-1"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
          <p className={`mt-1 text-xs ${pwLong ? "text-green-600" : "text-slate2"}`}>
            {pwLong ? "✓ Mindestens 8 Zeichen" : "Mindestens 8 Zeichen"}
          </p>
        </div>

        <div>
          <label htmlFor="signup-confirm" className="block text-sm font-medium">
            Passwort bestätigen
          </label>
          <input
            id="signup-confirm"
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
            <p className={`mt-1 text-xs ${pwMatch ? "text-green-600" : "text-red-600"}`}>
              {pwMatch ? "✓ Passwörter stimmen überein" : "Passwörter stimmen nicht überein"}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={busy || !pwLong || !pwMatch}
          data-testid="signup-submit"
        >
          {busy ? "Wird angelegt…" : "Account anlegen"}
        </button>

        {err && (
          <p className="text-sm text-red-600" role="alert">
            {err}
          </p>
        )}

        <p className="text-xs text-slate2">
          Mit dem Anlegen eines Accounts akzeptierst du unsere{" "}
          <Link to="/legal/agb" className="text-primary hover:underline">
            AGB
          </Link>{" "}
          und stimmst der Verarbeitung deiner Daten nach unserer{" "}
          <Link to="/legal/datenschutz" className="text-primary hover:underline">
            Datenschutzerklärung
          </Link>{" "}
          zu.
        </p>
      </form>

      <hr className="my-8 border-slate-200" />

      <div className="text-center text-sm text-slate2">
        Schon einen Account?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Anmelden
        </Link>
      </div>
    </div>
  );
}
