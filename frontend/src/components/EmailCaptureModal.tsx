import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void> | void;
}

export default function EmailCaptureModal({ open, onClose, onSubmit }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await onSubmit(email.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-ink">Almost done.</h2>
        <p className="mt-2 text-slate2">
          Enter your email to get the full report. We'll save it to your account
          so you can come back later.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="email"
            required
            placeholder="you@your-shop.com"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            autoFocus
          />
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Saving…" : "Get full report"}
          </button>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <p className="text-xs text-slate2">
            By continuing you agree to the privacy policy. Data hosted in the EU.
          </p>
        </form>
      </div>
    </div>
  );
}
