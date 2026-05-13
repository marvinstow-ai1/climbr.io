const plans = [
  { name: "Free", price: "€0", features: ["3 audits / month", "5 tracked keywords", "AI report"] },
  { name: "Starter", price: "€19/mo", features: ["30 audits / month", "25 keywords", "GSC integration", "Email alerts"] },
  { name: "Pro", price: "€49/mo", features: ["Unlimited audits", "100 keywords", "Weekly PDF reports", "Priority support"] },
];

export default function Pricing() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold text-center">Simple pricing</h1>
      <p className="mt-2 text-center text-slate2">Billing not yet enabled — Free tier available now.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className="card">
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <p className="mt-2 text-3xl font-bold">{p.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate2">
              {p.features.map((f) => <li key={f}>• {f}</li>)}
            </ul>
            <button className="btn-ghost mt-6 w-full" disabled>Coming soon</button>
          </div>
        ))}
      </div>
    </div>
  );
}
