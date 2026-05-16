import type { AuditFix } from "../lib/api";

const priorityChip: Record<AuditFix["priority"], string> = {
  high: "bg-red-500/10 text-red-300",
  medium: "bg-amber-500/10 text-amber-300",
  low: "bg-white/[0.04] text-ink",
};

export default function FixCard({ fix }: { fix: AuditFix }) {
  return (
    <details className="rounded-lg border border-line p-4 open:bg-bg">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-3">
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${priorityChip[fix.priority]}`}>
            {fix.priority}
          </span>
          <span className="font-medium text-ink">{fix.title}</span>
        </span>
        <span className="text-xs text-ink-muted">~{fix.estimatedMinutes} min</span>
      </summary>
      <div className="mt-3 space-y-3 text-sm text-ink-muted">
        <p><strong className="text-ink">Warum wichtig:</strong> {fix.why}</p>
        <div>
          <strong className="text-ink">So setzt du das um:</strong>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            {fix.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
        {fix.example && (
          <pre className="overflow-x-auto rounded bg-black/40 p-3 text-xs text-ink">
{fix.example}
          </pre>
        )}
      </div>
    </details>
  );
}
