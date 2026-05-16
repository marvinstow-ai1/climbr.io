import type { ReactNode } from "react";

interface Props {
  title: string;
  /**
   * Stand-Datum als ISO-String (z.B. "2026-05-15") — wird darunter als
   * "Stand: 15. Mai 2026" formatiert.
   */
  lastUpdated: string;
  children: ReactNode;
}

/**
 * Geteilter Look für Impressum / Datenschutz / AGB. Einheitliche
 * Typografie, ein Heading + Datum, fließender Text.
 */
export function LegalLayout({ title, lastUpdated, children }: Props) {
  const date = new Date(lastUpdated);
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header>
        <h1 className="text-3xl font-bold text-ink">{title}</h1>
        <p className="mt-1 text-xs text-ink-muted">
          Stand:{" "}
          {date.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>
      <div className="prose prose-slate mt-6 max-w-none text-sm leading-relaxed text-ink-muted [&_a]:text-accent [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mb-1 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-ink [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_strong]:text-ink">
        {children}
      </div>
    </article>
  );
}

/**
 * Platzhalter-Span — wird in Legal-Texten verwendet wo Marvin später
 * eigene Daten einfügen muss (Name, Adresse, USt-Id, etc.). Visuell
 * deutlich hervorgehoben damit niemand vergisst zu ersetzen.
 */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span
      className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-amber-200"
      title="Platzhalter — bitte ersetzen vor Launch"
    >
      [{children}]
    </span>
  );
}
