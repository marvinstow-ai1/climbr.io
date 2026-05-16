import { NavLink, useSearchParams } from "react-router-dom";

const ITEMS: { to: string; label: string }[] = [
  { to: "/seo/workflow", label: "Monatsplan" },
  { to: "/seo", label: "Verbindungen" },
  { to: "/seo/opportunities", label: "Chancen" },
  { to: "/seo/tasks", label: "Aufgaben" },
  { to: "/seo/briefs", label: "Content-Briefings" },
  { to: "/seo/local", label: "Lokales SEO" },
  { to: "/seo/reports", label: "Fortschritt" },
];

/**
 * Tab-style navigation for the SEO workflow section. Keeps the
 * `project` query param sticky as the user moves between sub-pages.
 */
export function SeoNav() {
  const [params] = useSearchParams();
  const project = params.get("project");
  const suffix = project ? `?project=${project}` : "";
  return (
    <nav
      data-testid="seo-nav"
      className="-mx-2 mt-4 flex flex-wrap items-center gap-1 overflow-x-auto border-b border-line pb-3"
    >
      {ITEMS.map((it) => (
        <NavLink
          key={it.to}
          to={`${it.to}${suffix}`}
          end={it.to === "/seo"}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition ${
              isActive
                ? "bg-accent-dim font-medium text-accent"
                : "text-ink-muted hover:bg-white/[0.04] hover:text-ink"
            }`
          }
        >
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
