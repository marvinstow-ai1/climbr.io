import { useCallback, useEffect, useState } from "react";
import { ensureSupabase } from "../../lib/supabase";
import { markNotificationsSeen } from "../../lib/api";
import type { ToastKind } from "../Toast";

interface Row {
  id: string;
  keyword: string;
  old_position: number | null;
  new_position: number | null;
  seen: boolean;
  created_at: string;
}

interface Props {
  projectId: string;
  token: string;
  onNotify: (kind: ToastKind, message: string) => void;
}

export default function NotificationsTab({ projectId, token, onNotify }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sb = ensureSupabase();
      const { data, error } = await sb
        .from("notifications")
        .select("id, keyword, old_position, new_position, seen, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e) {
      onNotify("error", e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [projectId, onNotify]);

  useEffect(() => { void load(); }, [load]);

  async function markSeen(ids: string[]) {
    if (ids.length === 0) return;
    const snapshot = rows;
    setRows((r) => r.map((n) => (ids.includes(n.id) ? { ...n, seen: true } : n)));
    try {
      await markNotificationsSeen(token, ids);
    } catch (e) {
      setRows(snapshot);
      onNotify("error", e instanceof Error ? e.message : "Could not mark seen");
    }
  }

  const unseen = rows.filter((r) => !r.seen);

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;
  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No notifications yet. We'll let you know when a tracked keyword moves
        by 3+ positions.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {unseen.length > 0 && (
        <div className="flex justify-end">
          <button onClick={() => markSeen(unseen.map((u) => u.id))} className="btn-ghost text-sm">
            Mark all as seen
          </button>
        </div>
      )}
      <ul className="space-y-2">
        {rows.map((n) => {
          const delta = n.old_position != null && n.new_position != null ? n.old_position - n.new_position : null;
          const improved = delta != null && delta > 0;
          return (
            <li
              key={n.id}
              className={`card flex items-center justify-between gap-4 ${n.seen ? "opacity-50" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink break-words">{n.keyword}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {n.old_position ?? "—"} → {n.new_position ?? "—"}
                  {delta != null && (
                    <span className={improved ? "ml-2 text-accent" : "ml-2 text-red-400"}>
                      {improved ? "▲" : "▼"} {Math.abs(delta)}
                    </span>
                  )}
                  · {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.seen && (
                <button onClick={() => markSeen([n.id])} className="btn-ghost text-sm">
                  Mark seen
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
