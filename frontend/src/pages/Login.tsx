import { useState } from "react";
import { ensureSupabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const sb = ensureSupabase();
      const { error } = await sb.auth.signInWithOtp({ email });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-slate2">We sent a magic link to {email}.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Log in</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input
          type="email"
          className="input"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn-primary w-full">Send magic link</button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </form>
    </div>
  );
}
