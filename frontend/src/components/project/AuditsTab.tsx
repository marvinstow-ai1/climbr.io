import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ensureSupabase } from "../../lib/supabase";
import { runProjectAudit, type ApiError } from "../../lib/api";
import type { ToastKind } from "../Toast";

interface AuditRow {
  id: string;
  url: string;
  status: string;
  score: number | null;
  created_at: string;
  error: string | null;
}

interface Props {
  projectId: string;
  domain: string;
  token: string;
  onNotify: (kind: ToastKind, message: string) => void;
}

export default function AuditsTab({ projectId, domain, token, onNotify }: Props) {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [urlInput, setUrlInput] = useState(`https://${domain}/`);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sb = ensureSupabase();
      const { data, error } = await sb
        .from("audits")
        .select("id, url, status, score, created_at, error")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setAudits((data ?? []) as AuditRow[]);
    } catch (e) {
      onNotify("error", e instanceof Error ? e.message : "Failed to load audits");
    } finally {
      setLoading(false);
    }
  }, [projectId, onNotify]);

  useEffect(() => { void load(); }, [load]);

  async function onRun(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    try {
      await runProjectAudit(token, { url: urlInput.trim(), projectId });
      onNotify("success", "Audit complete");
      await load();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === "PLAN_LIMIT_REACHED") {
        onNotify("error", apiErr.message);
      } else if (apiErr.status === 429) {
        onNotify("error", "Rate-limited. Please wait a minute and retry.");
      } else {
        onNotify("error", apiErr.message ?? "Audit failed");
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onRun} className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="audit-url" className="block text-sm font-medium text-ink">URL to audit</label>
          <input
            id="audit-url"
            type="url"
            inputMode="url"
            className="input mt-2"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            required
            disabled={running}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={running || !urlInput.trim()}>
          {running ? "Auditing…" : "Run new audit"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading audits…</p>
      ) : audits.length === 0 ? (
        <p className="text-sm text-ink-muted">No audits yet. Run one above to get started.</p>
      ) : (
        <ul className="space-y-2">
          {audits.map((a) => (
            <li key={a.id} className="card flex items-center justify-between gap-4 transition-colors hover:bg-white/[0.05]">
              <div className="min-w-0 flex-1">
                <Link to={`/audit/${a.id}`} className="font-medium text-ink hover:text-accent transition-colors break-all">
                  {a.url}
                </Link>
                <p className="mt-1 text-xs text-ink-muted">
                  {new Date(a.created_at).toLocaleString()} · {a.status}
                  {a.error && <span className="text-red-400"> — {a.error}</span>}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {a.score != null ? (
                  <span className="text-2xl font-semibold text-ink">{a.score}<span className="text-sm text-ink-subtle">/100</span></span>
                ) : (
                  <span className="text-sm text-ink-subtle">—</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
