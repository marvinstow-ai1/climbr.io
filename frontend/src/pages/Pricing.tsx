import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { useToast } from "../components/Toast";
import { getBillingState, openPortal, startCheckout, type ApiError, type BillingState } from "../lib/api";

interface PlanDef {
  key: "free" | "starter" | "pro";
  name: string;
  price: string;
  blurb: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: PlanDef[] = [
  {
    key: "free",
    name: "Free",
    price: "€0",
    blurb: "Zum Ausprobieren",
    features: [
      "3 Audits / Monat",
      "5 getrackte Keywords",
      "10 Keyword-Recherchen / Monat",
      "3 Wettbewerber-Analysen / Monat",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    price: "€19/mo",
    blurb: "Für Solo-Operatoren",
    highlight: true,
    features: [
      "30 Audits / Monat",
      "25 Keywords",
      "100 Keyword-Recherchen / Monat",
      "30 Wettbewerber-Analysen / Monat",
      "GSC-Integration",
      "E-Mail-Alerts",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "€49/mo",
    blurb: "Für Agenturen & Power-User",
    features: [
      "1000 Audits / Monat",
      "100 Keywords",
      "2000 Keyword-Recherchen / Monat",
      "500 Wettbewerber-Analysen / Monat",
      "Weekly PDF reports",
      "Priority support",
    ],
  },
];

export default function Pricing() {
  const session = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState<"starter" | "pro" | "portal" | null>(null);

  useEffect(() => {
    if (session.loading || !session.token) return;
    void getBillingState(session.token).then(setState).catch(() => {});
  }, [session.loading, session.token]);

  useEffect(() => {
    const status = params.get("status");
    if (status === "cancel") {
      toast.push("info", "Checkout abgebrochen — kein Plan geändert.");
      params.delete("status");
      setParams(params);
    }
  }, [params, setParams, toast]);

  async function subscribe(plan: "starter" | "pro") {
    if (!session.token) {
      navigate("/login", { state: { next: "/pricing" } });
      return;
    }
    setBusy(plan);
    try {
      const { url } = await startCheckout(session.token, { plan });
      window.location.href = url;
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "PRICE_NOT_CONFIGURED") {
        toast.push("error", "Stripe-Preis-ID nicht konfiguriert. Siehe PHASE3-SETUP.md.");
      } else {
        toast.push("error", err.message ?? "Checkout konnte nicht gestartet werden.");
      }
      setBusy(null);
    }
  }

  async function manage() {
    if (!session.token) return;
    setBusy("portal");
    try {
      const { url } = await openPortal(session.token);
      window.location.href = url;
    } catch (e) {
      const err = e as ApiError;
      toast.push("error", err.message ?? "Portal konnte nicht geöffnet werden.");
      setBusy(null);
    }
  }

  const currentPlan = state?.plan ?? "free";

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold text-center">Einfaches Pricing</h1>
      <p className="mt-2 text-center text-slate2">
        14 Tage Pro-Trial inklusive — jederzeit kündbar.
      </p>

      {state && currentPlan !== "free" && (
        <div className="mt-6 rounded-lg border border-primary-100 bg-primary-50/50 p-4 text-center text-sm">
          Du nutzt aktuell den <span className="font-semibold">{currentPlan}</span>-Plan
          {state.subscription.cancel_at_period_end && state.subscription.current_period_end &&
            ` (gekündigt zum ${new Date(state.subscription.current_period_end).toLocaleDateString("de-DE")})`}
          .
          {" "}
          <button onClick={manage} className="font-medium text-primary underline" disabled={busy === "portal"}>
            {busy === "portal" ? "Öffne…" : "Abo verwalten"}
          </button>
        </div>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.key === currentPlan;
          const cta = p.key === "free"
            ? isCurrent ? "Dein aktueller Plan" : "Free-Tier nutzen"
            : isCurrent ? "Aktiv" : `${p.name} starten`;
          return (
            <div
              key={p.key}
              className={`card flex flex-col ${p.highlight ? "border-primary-500 ring-2 ring-primary-100" : ""}`}
            >
              {p.highlight && (
                <span className="self-start rounded-full bg-primary px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                  Empfohlen
                </span>
              )}
              <h2 className="mt-2 text-xl font-semibold">{p.name}</h2>
              <p className="text-xs text-slate2">{p.blurb}</p>
              <p className="mt-2 text-3xl font-bold">{p.price}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate2">
                {p.features.map((f) => <li key={f}>• {f}</li>)}
              </ul>
              {p.key === "free" ? (
                <button className="btn-ghost mt-6 w-full" disabled>{cta}</button>
              ) : isCurrent ? (
                <button onClick={manage} className="btn-ghost mt-6 w-full" disabled={busy === "portal"}>
                  {busy === "portal" ? "Öffne…" : "Abo verwalten"}
                </button>
              ) : (
                <button
                  onClick={() => subscribe(p.key as "starter" | "pro")}
                  className={p.highlight ? "btn-primary mt-6 w-full" : "btn-ghost mt-6 w-full"}
                  disabled={busy === p.key}
                >
                  {busy === p.key ? "Lädt…" : cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-slate2">
        Sichere Zahlung via Stripe · 14-Tage Geld-zurück bei jährlicher Zahlung
      </p>
    </div>
  );
}
