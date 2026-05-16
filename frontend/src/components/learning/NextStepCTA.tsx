import type { ReactNode } from "react";

interface Props {
  /** Kurze Überschrift, z.B. "Was machst du jetzt damit?" */
  title?: string;
  /** Der eigentliche Handlungs-Vorschlag (Text oder JSX mit Link). */
  children: ReactNode;
  /** Optional: Test-ID-Suffix für eindeutige Targets in Tests. */
  testId?: string;
}

/**
 * Eigenständiger CTA-Block, der unter Audit-Ergebnissen, Quick Wins
 * oder Keyword-Bewegungen erscheint und dem User den nächsten Schritt
 * vorschlägt. Bewusst freundlich und konkret — keine Slogans.
 */
export function NextStepCTA({ title = "Was machst du jetzt damit?", children, testId }: Props) {
  return (
    <div
      className="flex gap-3 rounded-lg border border-accent-100 bg-accent-dim px-4 py-3 text-sm text-ink"
      data-testid={testId ?? "next-step-cta"}
      role="note"
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white"
      >
        →
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <div className="mt-1 text-ink-muted">{children}</div>
      </div>
    </div>
  );
}
