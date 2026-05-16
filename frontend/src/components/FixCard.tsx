import type { AuditFix } from "../lib/api";

const priorityChip: Record<AuditFix["priority"], string> = {
  high: "bg-red-500/10 text-red-300 border border-red-500/20",
  medium: "bg-amber-500/10 text-amber-300 border border-amber-500/20",
  low: "bg-white/[0.04] text-ink-muted border border-line",
};

export default function FixCard({ fix }: { fix: AuditFix }) {
  return (
    <details className="group rounded-lg border border-line bg-white/[0.02] p-4 backdrop-blur-md transition-colors open:border-line-strong open:bg-white/[0.04]">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-left list-none">
        <span className="flex items-center gap-3">
          <span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${priorityChip[fix.priority]}`}>
            {fix.priority}
          </span>
          <span className="text-sm font-medium text-ink">{fix.title}</span>
        </span>
        <span className="text-xs text-ink-subtle">~{fix.estimatedMinutes} min</span>
      </summary>
      <div className="mt-4 space-y-3 text-sm text-ink-muted">
        <p><strong className="font-medium text-ink">Why it matters:</strong> {fix.why}</p>
        <div>
          <strong className="font-medium text-ink">How to fix:</strong>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            {fix.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
        {fix.example && (
          <pre className="overflow-x-auto rounded-md border border-line bg-black/40 p-3 text-xs text-ink">
{fix.example}
          </pre>
        )}
      </div>
    </details>
  );
}
