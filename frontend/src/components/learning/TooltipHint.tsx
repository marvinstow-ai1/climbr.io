import { useId } from "react";

interface Props {
  /** Der Hinweis-Text. */
  hint: string;
  /** Beschreibender Label für Screenreader, falls anders als hint. */
  label?: string;
}

/**
 * Kleines `?`-Icon, das beim Hover/Focus den `hint` zeigt. Implementiert
 * via `<details>` oder CSS hat seine Tücken — wir nutzen den nativen
 * `title`-Tooltip plus eine visuelle Variante für Touch, die per Focus
 * erscheint. Screenreader bekommen den hint über `aria-label`.
 */
export function TooltipHint({ hint, label }: Props) {
  const id = useId();
  return (
    <span className="relative inline-flex items-center align-middle">
      <button
        type="button"
        aria-describedby={id}
        aria-label={label ?? hint}
        title={hint}
        className="peer flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold leading-none text-slate2 hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
      >
        ?
      </button>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-56 -translate-x-1/2 rounded-md bg-ink px-3 py-1.5 text-xs leading-snug text-white shadow-lg peer-hover:block peer-focus:block"
      >
        {hint}
      </span>
    </span>
  );
}
