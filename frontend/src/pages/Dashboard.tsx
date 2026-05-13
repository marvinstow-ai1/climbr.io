export default function Dashboard() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-slate2">
        Your projects and audits will appear here. (Stubbed in MVP — wire to
        Supabase `projects` table once auth is enabled.)
      </p>
    </div>
  );
}
