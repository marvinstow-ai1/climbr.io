import { useCallback, useEffect, useState } from "react";
import { ensureSupabase } from "../../lib/supabase";
import { markNotificationsSeen } from "../../lib/api";
import type { ToastKind } from "../Toast";
import { ExplainerBox } from "../learning/ExplainerBox";

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
      onNotify("error", e instanceof Error ? e.message : "Benachrichtigungen konnten nicht geladen werden.");
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
      onNotify("error", e instanceof Error ? e.message : "Konnte nicht als gelesen markiert werden.");
    }
  }

  const unseen = rows.filter((r) => !r.seen);

  const explainer = (
    <ExplainerBox
      storageKey="notifications-overview"
      title="Warum bekommst du diese Benachrichtigungen?"
      explanation="Wir beobachten täglich deine Keyword-Positionen. Wenn sich etwas um mehr als 3 Plätze verändert, informieren wir dich — damit du schnell reagieren kannst."
      whyItMatters="Schnelle Reaktionen auf Ranking-Verluste verhindern, dass dir Sichtbarkeit dauerhaft verloren geht. Bewegungen nach oben zeigen, dass deine SEO-Arbeit wirkt."
      nextStep="Bei einem starken Plus: notiere dir, was du vorher geändert hast — das funktioniert wahrscheinlich auf anderen Seiten genauso. Bei einem Minus: prüfe ob du kürzlich Inhalte oder Technik verändert hast."
    />
  );

  if (loading) return <p className="text-ink-muted">Lade…</p>;
  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        {explainer}
        <p className="text-ink-muted">
          Noch keine Benachrichtigungen. Wir melden uns, sobald sich ein
          getracktes Keyword um 3+ Positionen bewegt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {explainer}
      {unseen.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => markSeen(unseen.map((u) => u.id))}
            className="btn-ghost text-sm"
          >
            Alle als gelesen markieren
          </button>
        </div>
      )}
      <ul className="space-y-2">
        {rows.map((n) => {
          const delta =
            n.old_position != null && n.new_position != null
              ? n.old_position - n.new_position
              : null;
          const improved = delta != null && delta > 0;
          return (
            <li
              key={n.id}
              className={`card flex items-center justify-between gap-4 ${n.seen ? "opacity-60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{n.keyword}</p>
                <p className="text-xs text-ink-muted">
                  {n.old_position ?? "—"} → {n.new_position ?? "—"}
                  {delta != null && (
                    <span
                      className={improved ? "ml-2 text-accent" : "ml-2 text-red-400"}
                    >
                      {improved ? "▲" : "▼"} {Math.abs(delta)}
                    </span>
                  )}
                  {" · "}
                  {new Date(n.created_at).toLocaleString("de-DE")}
                </p>
              </div>
              {!n.seen && (
                <button
                  onClick={() => markSeen([n.id])}
                  className="btn-ghost text-sm"
                >
                  Als gelesen
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
