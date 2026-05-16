import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureSupabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

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
    try {
      const sb = ensureSupabase();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="card-elevated">
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-dim text-accent">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Check your email</h1>
          <p className="mt-2 text-sm text-ink-muted">We sent a magic link to <span className="text-ink">{email}</span>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <div className="card-elevated">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Log in</h1>
        <p className="mt-2 text-sm text-ink-muted">We'll email you a magic link. No password required.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn-primary w-full">Send magic link</button>
          {err && <p className="text-sm text-red-400">{err}</p>}
        </form>
      </div>
    </div>
  );
}
