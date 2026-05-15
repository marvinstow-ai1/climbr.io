import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { useToast } from "../components/Toast";
import { getBillingState, openPortal, type ApiError, type BillingState } from "../lib/api";

const PLAN_NAMES = { free: "Free", starter: "Starter", pro: "Pro" } as const;

const STATUS_LABEL: Record<string, string> = {
  trialing: "Trial läuft",
  active: "Aktiv",
  past_due: "Zahlung überfällig",
  canceled: "Gekündigt",
  unpaid: "Unbezahlt",
  incomplete: "Unvollständig",
  incomplete_expired: "Abgelaufen",
  paused: "Pausiert",
};

export default function Billing() {
  const session = useSession();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);

  useEffect(() => {
    if (session.loading || !session.token) return;
    let cancelled = false;
    void getBillingState(session.token).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => { cancelled = true; };
  }, [session.loading, session.token, refreshAttempts]);

  // When we land here from a successful checkout, the webhook may not have
  // fired yet → poll for up to ~15s.
  useEffect(() => {
    const status = params.get("status");
    if (status !== "success") return;
    toast.push("success", "Zahlung erfolgreich! Aktualisiere Plan…");
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      setRefreshAttempts((n) => n + 1);
      if (attempts >= 6 || state?.plan !== "free") {
        clearInterval(interval);
        params.delete("status");
        setParams(params, { replace: true });
      }
    }, 2500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function manage() {
    if (!session.token) return;
    setBusy(true);
    try {
      const { url } = await openPortal(session.token);
      window.location.href = url;
    } catch (e) {
      const err = e as ApiError;
      toast.push("error", err.message ?? "Portal konnte nicht geöffnet werden.");
      setBusy(false);
    }
  }

  if (!session.loading && !session.token) {
    return <Navigate to="/login" replace state={{ next: "/billing" }} />;
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-slate2">Lädt Billing-Status…</p>
      </div>
    );
  }

  const trialActive = state.subscription.trial_end && new Date(state.subscription.trial_end) > new Date();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="mt-1 text-slate2">Verwalte deinen Plan und sieh deine Zahlungs-Historie.</p>
      </header>

      <section className="card mt-8">
        <p className="text-xs uppercase text-slate2">Aktueller Plan</p>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-3xl font-bold">{PLAN_NAMES[state.plan]}</span>
          {state.subscription.status && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {STATUS_LABEL[state.subscription.status] ?? state.subscription.status}
            </span>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-slate2">Audits / Monat</dt>
          <dd className="font-medium">{state.limits.auditsPerMonth.toLocaleString("de-DE")}</dd>
          <dt className="text-slate2">Tracked Keywords (pro Projekt)</dt>
          <dd className="font-medium">{state.limits.keywords}</dd>
          <dt className="text-slate2">Keyword-Recherchen / Monat</dt>
          <dd className="font-medium">{state.limits.keywordResearchPerMonth.toLocaleString("de-DE")}</dd>
          <dt className="text-slate2">Wettbewerber-Analysen / Monat</dt>
          <dd className="font-medium">{state.limits.competitorAnalysesPerMonth.toLocaleString("de-DE")}</dd>
        </dl>

        {trialActive && state.subscription.trial_end && (
          <p className="mt-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Trial läuft bis {new Date(state.subscription.trial_end).toLocaleDateString("de-DE")}.
          </p>
        )}

        {state.subscription.cancel_at_period_end && state.subscription.current_period_end && (
          <p className="mt-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Abo gekündigt — endet am {new Date(state.subscription.current_period_end).toLocaleDateString("de-DE")}.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {state.subscription.has_customer ? (
            <button onClick={manage} className="btn-primary" disabled={busy}>
              {busy ? "Öffne Stripe…" : "Im Stripe-Portal verwalten"}
            </button>
          ) : (
            <Link to="/pricing" className="btn-primary">Plan wählen</Link>
          )}
          {state.plan !== "pro" && (
            <Link to="/pricing" className="btn-ghost">{state.plan === "free" ? "Upgraden" : "Plan wechseln"}</Link>
          )}
        </div>
      </section>

      <p className="mt-6 text-xs text-slate2">
        Zahlungen, Rechnungen und Zahlungsmethoden werden im Stripe Customer Portal verwaltet.
      </p>
    </div>
  );
}
