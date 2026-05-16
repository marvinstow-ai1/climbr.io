const plans = [
  {
    name: "Free",
    price: "€0",
    tagline: "Try the engine",
    features: ["3 audits / month", "5 tracked keywords", "AI report"],
    featured: false,
  },
  {
    name: "Starter",
    price: "€19",
    tagline: "Single shop",
    features: ["30 audits / month", "25 keywords", "GSC integration", "Email alerts"],
    featured: true,
  },
  {
    name: "Pro",
    price: "€49",
    tagline: "Multiple sites",
    features: ["Unlimited audits", "100 keywords", "Weekly PDF reports", "Priority support"],
    featured: false,
  },
];

export default function Pricing() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <header className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Simple pricing</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-ink-muted">
          Start free. Upgrade when you outgrow it. Billing not yet enabled —
          Free tier available now.
        </p>
      </header>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={
              p.featured
                ? "card-elevated relative ring-1 ring-accent/40"
                : "card"
            }
          >
            {p.featured && (
              <span className="absolute -top-2.5 left-6 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black">
                Popular
              </span>
            )}
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{p.tagline}</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">{p.name}</h2>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-ink">
              {p.price}
              <span className="ml-1 text-sm font-normal text-ink-subtle">/ month</span>
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink-muted">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="btn-ghost mt-8 w-full" disabled>Coming soon</button>
          </div>
        ))}
      </div>
    </div>
  );
}
