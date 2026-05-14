// Minimal accessible tablist following the WAI-ARIA tabs pattern.
// Arrow-key navigation; activation on focus (automatic activation).

import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface Props {
  tabs: Tab[];
  initialId?: string;
}

export default function Tabs({ tabs, initialId }: Props) {
  const baseId = useId();
  const [active, setActive] = useState(initialId ?? tabs[0]?.id ?? "");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKey = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      const i = tabs.findIndex((t) => t.id === active);
      if (i < 0) return;
      let next = i;
      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      else return;
      e.preventDefault();
      const id = tabs[next]!.id;
      setActive(id);
      refs.current[id]?.focus();
    },
    [active, tabs],
  );

  return (
    <div>
      <div role="tablist" aria-orientation="horizontal" className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => { refs.current[t.id] = el; }}
              role="tab"
              type="button"
              id={`${baseId}-tab-${t.id}`}
              aria-controls={`${baseId}-panel-${t.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={onKey}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-slate2 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${baseId}-panel-${t.id}`}
          aria-labelledby={`${baseId}-tab-${t.id}`}
          hidden={t.id !== active}
          className="pt-6"
        >
          {t.id === active && t.content}
        </div>
      ))}
    </div>
  );
}
