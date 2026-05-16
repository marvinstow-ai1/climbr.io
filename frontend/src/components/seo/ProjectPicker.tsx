import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import type { DashboardProject } from "../dashboard/types";

interface Props {
  projects: DashboardProject[];
  loading: boolean;
  value: string | null;
  onChange: (id: string | null) => void;
}

/**
 * Persistent project selector for all SEO pages. Reads/writes the
 * `project` query param so refresh and deep-linking work.
 */
export function ProjectPicker({ projects, loading, value, onChange }: Props) {
  const [params, setParams] = useSearchParams();

  // Sync URL <-> value
  useEffect(() => {
    const urlProject = params.get("project");
    if (urlProject && urlProject !== value) {
      onChange(urlProject);
    } else if (!value && !loading && projects.length > 0 && !urlProject) {
      onChange(projects[0]!.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, loading]);

  function handle(id: string) {
    onChange(id);
    const next = new URLSearchParams(params);
    next.set("project", id);
    setParams(next, { replace: true });
  }

  if (loading) {
    return <div className="text-sm text-ink-muted">Projekte werden geladen…</div>;
  }
  if (projects.length === 0) {
    return (
      <div className="rounded-md border border-line bg-bg-raised/40 px-4 py-3 text-sm text-ink-muted">
        Du hast noch kein Projekt. Lege zuerst ein Projekt im Dashboard an.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="seo-project-picker" className="text-ink-muted">Projekt:</label>
      <select
        id="seo-project-picker"
        data-testid="seo-project-picker"
        value={value ?? ""}
        onChange={(e) => handle(e.target.value)}
        className="rounded-md border border-line bg-bg-raised px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.domain}</option>
        ))}
      </select>
    </div>
  );
}
