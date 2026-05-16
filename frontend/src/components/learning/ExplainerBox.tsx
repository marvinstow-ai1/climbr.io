import { useEffect, useRef, useState } from "react";
import { hasSeenExplainer, markExplainerSeen } from "./storage";

interface Props {
  /** Stabile ID — wird für den localStorage-State genutzt. */
  storageKey: string;
  title: string;
  /** Kurze Definition: Was bedeutet das? */
  explanation: string;
  /** Konsequenz für die Suchmaschine. */
  whyItMatters?: string;
  /** Konkreter erster Schritt. */
  nextStep?: string;
  /** Wenn true: ignoriert den localStorage-State und ist immer offen am Anfang. */
  forceOpen?: boolean;
}

/**
 * Ausklappbarer Erklär-Block für SEO-Konzepte. Merkt sich pro
 * `storageKey` ob der User die Box schon mal aufgeklappt hat — beim
 * ersten Besuch ist sie automatisch offen, danach standardmäßig zu.
 */
export function ExplainerBox({
  storageKey,
  title,
  explanation,
  whyItMatters,
  nextStep,
  forceOpen,
}: Props) {
  const [open, setOpen] = useState(() => forceOpen || !hasSeenExplainer(storageKey));
  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    if (open) markExplainerSeen(storageKey);
  }, [open, storageKey]);

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white"
      data-testid={`explainer-${storageKey}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`explainer-body-${storageKey}`}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary"
          >
            ?
          </span>
          {title}
        </span>
        <span
          aria-hidden="true"
          className={`text-slate2 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          id={`explainer-body-${storageKey}`}
          className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm text-slate2"
        >
          <p>{explanation}</p>
          {whyItMatters && (
            <p>
              <strong className="text-ink">Warum wichtig:</strong> {whyItMatters}
            </p>
          )}
          {nextStep && (
            <p>
              <strong className="text-ink">Nächster Schritt:</strong> {nextStep}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
