import { useEffect, useState } from "react";
import { useSession } from "../../lib/useSession";
import { useToast } from "../../components/Toast";
import { SeoLayout } from "../../components/seo/SeoLayout";
import {
  listTasks,
  updateTaskStatus,
  deleteTask,
  type SeoTask,
} from "../../lib/seoApi";

const STATUS_LABEL: Record<SeoTask["status"], string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt",
  ignored: "Ignoriert",
};

const COLUMNS: SeoTask["status"][] = ["open", "in_progress", "done"];

export default function SeoTasks() {
  return (
    <SeoLayout
      title="Aufgaben"
      subtitle="Konkrete nächste Schritte in einfacher Sprache – aus echten SEO-Daten abgeleitet."
    >
      {(projectId) => (projectId ? <TasksBody projectId={projectId} /> : null)}
    </SeoLayout>
  );
}

function TasksBody({ projectId }: { projectId: string }) {
  const session = useSession();
  const toast = useToast();
  const [tasks, setTasks] = useState<SeoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function refresh() {
    if (!session.token) return;
    try {
      const { tasks: rows } = await listTasks(session.token, projectId);
      setTasks(rows);
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Aufgaben konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session.loading || !session.token) return;
    setLoading(true);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.loading, session.token, projectId]);

  async function setStatus(id: string, status: SeoTask["status"]) {
    if (!session.token) return;
    const prev = tasks;
    setTasks((rows) => rows.map((t) => (t.id === id ? { ...t, status, done_at: status === "done" ? new Date().toISOString() : null } : t)));
    try {
      await updateTaskStatus(session.token, id, status);
    } catch (e) {
      setTasks(prev);
      toast.push("error", e instanceof Error ? e.message : "Status konnte nicht geändert werden.");
    }
  }

  async function remove(id: string) {
    if (!session.token) return;
    const prev = tasks;
    setTasks((rows) => rows.filter((t) => t.id !== id));
    try {
      await deleteTask(session.token, id);
    } catch (e) {
      setTasks(prev);
      toast.push("error", e instanceof Error ? e.message : "Aufgabe konnte nicht gelöscht werden.");
    }
  }

  if (loading) {
    return <div className="text-ink-muted">Lade Aufgaben…</div>;
  }
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-bg-raised/40 p-6 text-center text-sm text-ink-muted">
        Noch keine Aufgaben. Öffne <b>Chancen</b> und wandle erkannte Optimierungspotenziale in
        Aufgaben um.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col);
        return (
          <section key={col} className="rounded-lg border border-line bg-bg-raised/40 p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
                {STATUS_LABEL[col]}
              </h2>
              <span className="text-xs text-ink-subtle">{colTasks.length}</span>
            </header>
            <ul className="space-y-2">
              {colTasks.map((t) => (
                <li key={t.id} className="rounded-md border border-line bg-bg-elevated p-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-ink">{t.title}</h3>
                      <EffortBadge e={t.effort} />
                    </div>
                  </button>
                  {expanded === t.id && (
                    <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs text-ink-muted">
                      {t.why && (
                        <p><span className="font-medium text-ink">Warum:</span> {t.why}</p>
                      )}
                      {t.expected_impact && (
                        <p><span className="font-medium text-ink">Wirkung:</span> {t.expected_impact}</p>
                      )}
                      {t.suggested_action && (
                        <p><span className="font-medium text-ink">Was tun:</span> {t.suggested_action}</p>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {COLUMNS.filter((s) => s !== col).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void setStatus(t.id, s)}
                        className="rounded-md border border-line px-2 py-1 text-[11px] text-ink-muted hover:bg-white/[0.04]"
                      >
                        → {STATUS_LABEL[s]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => void setStatus(t.id, "ignored")}
                      className="rounded-md border border-line px-2 py-1 text-[11px] text-ink-subtle hover:bg-white/[0.04]"
                    >
                      Ignorieren
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(t.id)}
                      className="ml-auto text-[11px] text-red-300/80 hover:underline"
                    >
                      Löschen
                    </button>
                  </div>
                </li>
              ))}
              {colTasks.length === 0 && (
                <li className="rounded-md border border-dashed border-line/60 p-3 text-center text-xs text-ink-subtle">
                  – leer –
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function EffortBadge({ e }: { e: SeoTask["effort"] }) {
  const label = e === "low" ? "leicht" : e === "medium" ? "mittel" : "aufwendig";
  return <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-ink-muted">{label}</span>;
}
