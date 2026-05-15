import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ensureSupabase } from "../../lib/supabase";
import { useSession } from "../../lib/useSession";

interface Notification {
  id: string;
  project_id: string;
  keyword: string;
  old_position: number | null;
  new_position: number | null;
  seen: boolean;
  created_at: string;
}

export function NotificationDropdown() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session.loading || !session.token) return;
    let cancelled = false;
    void (async () => {
      try {
        const sb = ensureSupabase();
        const { data, error } = await sb
          .from("notifications")
          .select("id, project_id, keyword, old_position, new_position, seen, created_at")
          .order("created_at", { ascending: false })
          .limit(5);
        if (error) throw error;
        if (!cancelled) setItems((data ?? []) as Notification[]);
      } catch {
        // Silent fail — notifications are non-critical for shell render
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.loading, session.token]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const unreadCount = items.filter((n) => !n.seen).length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Benachrichtigungen${unreadCount > 0 ? ` (${unreadCount} ungelesen)` : ""}`}
        data-testid="notifications-button"
        className="relative rounded-md p-2 text-slate2 hover:bg-slate-100"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a5 5 0 00-5 5v3.382l-1.447 2.894A1 1 0 004.447 15h11.106a1 1 0 00.894-1.724L15 10.382V7a5 5 0 00-5-5zM8 17a2 2 0 104 0H8z" />
        </svg>
        {unreadCount > 0 && (
          <span
            data-testid="notifications-unread-badge"
            className="absolute right-1 top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-sunset px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            data-testid="notifications-dropdown"
            className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            <div className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-ink">
              Benachrichtigungen
            </div>
            {items.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate2">
                Keine neuen Benachrichtigungen.
              </div>
            ) : (
              <ul className="max-h-80 overflow-auto py-1">
                {items.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={`/projects/${n.project_id}?tab=benachrichtigungen`}
                      onClick={() => setOpen(false)}
                      className={`block border-b border-slate-50 px-3 py-2 text-sm hover:bg-slate-50 ${
                        n.seen ? "text-slate2" : "text-ink"
                      }`}
                    >
                      <div className="font-medium">{n.keyword}</div>
                      <div className="text-xs text-slate2">
                        {formatDelta(n.old_position, n.new_position)} ·{" "}
                        {new Date(n.created_at).toLocaleDateString("de-DE")}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate2">
              {items[0] ? (
                <Link
                  to={`/projects/${items[0].project_id}?tab=benachrichtigungen`}
                  onClick={() => setOpen(false)}
                  className="text-primary hover:underline"
                >
                  Alle anzeigen
                </Link>
              ) : (
                <span>Keine Benachrichtigungen vorhanden.</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatDelta(oldPos: number | null, newPos: number | null): string {
  if (oldPos == null || newPos == null) return "Position aktualisiert";
  const delta = oldPos - newPos;
  if (delta > 0) return `▲ ${delta} Plätze nach oben (${oldPos} → ${newPos})`;
  if (delta < 0) return `▼ ${Math.abs(delta)} Plätze nach unten (${oldPos} → ${newPos})`;
  return `Position unverändert (${newPos})`;
}
