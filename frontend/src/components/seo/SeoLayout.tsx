import { useOutletContext } from "react-router-dom";
import { useState } from "react";
import type { AppShellContext } from "../layout/AppShell";
import { ProjectPicker } from "./ProjectPicker";
import { SeoNav } from "./SeoNav";

interface Props {
  title: string;
  subtitle?: string;
  children: (projectId: string | null) => React.ReactNode;
  /** Hide the project picker (e.g. for global pages like /seo). */
  hideProject?: boolean;
}

/**
 * Shared layout shell for /seo/* pages. Owns the project picker so each
 * page renders only its content.
 */
export function SeoLayout({ title, subtitle, children, hideProject }: Props) {
  const { projects, projectsLoading } = useOutletContext<AppShellContext>();
  const [projectId, setProjectId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
        </div>
        {!hideProject && (
          <ProjectPicker
            projects={projects}
            loading={projectsLoading}
            value={projectId}
            onChange={setProjectId}
          />
        )}
      </header>
      <SeoNav />
      <div className="mt-6">{children(projectId)}</div>
    </div>
  );
}
