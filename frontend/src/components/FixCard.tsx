import type { AuditFix } from "../lib/api";

const priorityChip: Record<AuditFix["priority"], string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-700",
};

export default function FixCard({ fix }: { fix: AuditFix }) {
  return (
    <details className="rounded-lg border border-slate-200 p-4 open:bg-surface">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-3">
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${priorityChip[fix.priority]}`}>
            {fix.priority}
          </span>
          <span className="font-medium text-ink">{fix.title}</span>
        </span>
        <span className="text-xs text-slate2">~{fix.estimatedMinutes} min</span>
      </summary>
      <div className="mt-3 space-y-3 text-sm text-slate2">
        <p><strong className="text-ink">Warum wichtig:</strong> {fix.why}</p>
        <div>
          <strong className="text-ink">So setzt du das um:</strong>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            {fix.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
        {fix.example && (
          <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
{fix.example}
          </pre>
        )}
      </div>
    </details>
  );
}
