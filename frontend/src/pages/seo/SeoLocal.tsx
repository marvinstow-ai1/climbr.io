import { useEffect, useState } from "react";
import { useSession } from "../../lib/useSession";
import { useToast } from "../../components/Toast";
import { SeoLayout } from "../../components/seo/SeoLayout";
import {
  createTaskManual,
  listTasks,
  updateTaskStatus,
  type SeoTask,
} from "../../lib/seoApi";

interface LocalItem {
  key: string;
  title: string;
  why: string;
  action: string;
  category: "location" | "gbp" | "keywords" | "trust";
}

const CHECKLIST: LocalItem[] = [
  {
    key: "location-page",
    title: "Standortseite je Filiale erstellen",
    why: "Eigene Seite pro Standort mit Adresse, Öffnungszeiten und Anfahrt liefert Google klare lokale Signale.",
    action: "Lege pro Standort eine Unterseite an (z.B. /standorte/berlin) mit Name, Adresse, Telefon, Öffnungszeiten und Karte.",
    category: "location",
  },
  {
    key: "gbp-claim",
    title: "Google-Unternehmensprofil beanspruchen & vollständig ausfüllen",
    why: "Ein vollständig gepflegtes GBP-Profil ist der wichtigste Hebel im Local Pack.",
    action: "Logge dich bei Google Business Profile ein, prüfe Adresse, Kategorie, Telefon, Website und lade aktuelle Fotos hoch.",
    category: "gbp",
  },
  {
    key: "gbp-posts",
    title: "Monatlich einen GBP-Beitrag veröffentlichen",
    why: "Aktivität signalisiert Google, dass das Profil gepflegt wird, und erscheint direkt in der Suche.",
    action: "Erstelle einen kurzen Beitrag (Angebot, Neuigkeit oder Veranstaltung) mit Bild und Call-to-Action.",
    category: "gbp",
  },
  {
    key: "city-service",
    title: "Service + Stadt: Keyword-Liste erstellen",
    why: "Lokale Suchanfragen folgen oft dem Muster „Dienstleistung + Stadt“ (z.B. „Friseur München“).",
    action: "Liste deine 3-5 Hauptleistungen × wichtigste Städte/Stadtteile und plane je eine Landingpage.",
    category: "keywords",
  },
  {
    key: "reviews-prompt",
    title: "Bestandskunden um eine Google-Bewertung bitten",
    why: "Aktuelle positive Bewertungen sind ein starker Ranking-Faktor im Local Pack.",
    action: "Schicke 10 zufriedenen Kund:innen einen direkten Link zur Bewertung (über das Google-Profil).",
    category: "trust",
  },
  {
    key: "nap-consistent",
    title: "NAP-Daten in allen Verzeichnissen prüfen",
    why: "Inkonsistente Adressdaten verwirren Google und schwächen das Vertrauen.",
    action: "Prüfe Name, Adresse, Telefon auf Website, GBP, Branchenverzeichnissen und Social Media – alles identisch.",
    category: "trust",
  },
  {
    key: "local-schema",
    title: "Strukturierte Daten (LocalBusiness) ergänzen",
    why: "Schema.org-Markup hilft Google, Geschäftsdetails korrekt zu interpretieren.",
    action: "Füge auf der Startseite und jeder Standortseite ein LocalBusiness-JSON-LD-Snippet hinzu.",
    category: "location",
  },
  {
    key: "review-response",
    title: "Auf alle Bewertungen antworten",
    why: "Reagieren – auch auf negative Bewertungen – signalisiert Sorgfalt und stärkt Vertrauen.",
    action: "Plane 15 Minuten pro Woche, um alle neuen Bewertungen kurz, persönlich und sachlich zu beantworten.",
    category: "trust",
  },
];

const CATEGORY_LABEL: Record<LocalItem["category"], string> = {
  location: "Standorte",
  gbp: "Google-Unternehmensprofil",
  keywords: "Stadt-Keywords",
  trust: "Vertrauen & Bewertungen",
};

export default function SeoLocal() {
  return (
    <SeoLayout
      title="Lokales SEO"
      subtitle="Lokale SEO-Routine für DACH-Unternehmen – als Checkliste statt als Technikmodul."
    >
      {(projectId) => (projectId ? <LocalBody projectId={projectId} /> : null)}
    </SeoLayout>
  );
}

function LocalBody({ projectId }: { projectId: string }) {
  const session = useSession();
  const toast = useToast();
  const [tasks, setTasks] = useState<SeoTask[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    if (!session.token) return;
    try {
      const { tasks: rows } = await listTasks(session.token, projectId);
      setTasks(rows.filter((t) => t.lane === "local"));
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Aufgaben konnten nicht geladen werden.");
    }
  }

  useEffect(() => {
    if (session.loading || !session.token) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.loading, session.token, projectId]);

  async function add(item: LocalItem) {
    if (!session.token) return;
    setBusy(item.key);
    try {
      const res = await createTaskManual(session.token, {
        projectId,
        title: item.title,
        why: item.why,
        suggested_action: item.action,
        lane: "local",
        effort: "medium",
      });
      toast.push("success", "Aufgabe zur Liste hinzugefügt.");
      setTasks((prev) => [
        {
          id: res.id,
          opportunity_id: null,
          title: item.title,
          why: item.why,
          expected_impact: null,
          effort: "medium",
          suggested_action: item.action,
          status: "open",
          lane: "local",
          data: { local_key: item.key },
          done_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Aufgabe konnte nicht erstellt werden.");
    } finally {
      setBusy(null);
    }
  }

  async function markDone(taskId: string) {
    if (!session.token) return;
    const prev = tasks;
    setTasks((rows) => rows.map((t) => (t.id === taskId ? { ...t, status: "done", done_at: new Date().toISOString() } : t)));
    try {
      await updateTaskStatus(session.token, taskId, "done");
    } catch (e) {
      setTasks(prev);
      toast.push("error", e instanceof Error ? e.message : "Status konnte nicht geändert werden.");
    }
  }

  const taskByTitle = new Map<string, SeoTask>(tasks.map((t) => [t.title, t]));
  const categories = Array.from(new Set(CHECKLIST.map((i) => i.category)));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-bg-raised/40 p-4 text-sm text-ink-muted">
        Diese Checkliste deckt die wichtigsten Hebel für lokale Sichtbarkeit ab. Klick auf
        einen Punkt, um ihn als Aufgabe in deinen Monatsplan aufzunehmen.
      </div>
      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {CATEGORY_LABEL[cat]}
          </h2>
          <ul className="space-y-2">
            {CHECKLIST.filter((i) => i.category === cat).map((item) => {
              const task = taskByTitle.get(item.title);
              const done = task?.status === "done";
              return (
                <li
                  key={item.key}
                  className={`rounded-lg border p-4 transition ${
                    done ? "border-accent/40 bg-accent-dim" : "border-line bg-bg-raised/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                      <p className="mt-1 text-xs text-ink-muted">{item.why}</p>
                      <p className="mt-2 text-xs text-ink">
                        <span className="font-medium">So gehts:</span> {item.action}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {!task && (
                        <button
                          className="btn-primary text-xs"
                          onClick={() => void add(item)}
                          disabled={busy === item.key}
                        >
                          Zu Aufgaben
                        </button>
                      )}
                      {task && !done && (
                        <button
                          className="btn-ghost text-xs"
                          onClick={() => void markDone(task.id)}
                        >
                          Als erledigt markieren
                        </button>
                      )}
                      {done && (
                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-black">
                          Erledigt
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
