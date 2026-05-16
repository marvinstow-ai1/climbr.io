import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { ensureSupabase } from "../lib/supabase";
import { resetOnboarding } from "../lib/onboarding";
import { useToast } from "../components/Toast";
import { ExplainerBox } from "../components/learning/ExplainerBox";

interface SettingsData {
  profile: { email: string | null };
  plan: {
    name: "free" | "starter" | "pro";
    limits: { keywords: number; auditsPerMonth: number };
  };
  usage: { projects: number; auditsThisMonth: number };
  notifications: { email_notifications: boolean };
}

interface ProjectGsc {
  id: string;
  domain: string;
  gsc_connected: boolean;
}

const PLAN_LABEL: Record<"free" | "starter" | "pro", string> = {
  free: "Kostenlos",
  starter: "Starter",
  pro: "Pro",
};

export default function Einstellungen() {
  const session = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<SettingsData | null>(null);
  const [projects, setProjects] = useState<ProjectGsc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingNotif, setSavingNotif] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (session.loading || !session.token) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/settings", {
          headers: { authorization: `Bearer ${session.token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as SettingsData;
        if (!cancelled) setData(body);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Einstellungen konnten nicht geladen werden.");
      }

      try {
        const sb = ensureSupabase();
        const { data: ps, error } = await sb
          .from("projects")
          .select("id, domain, gsc_connected")
          .order("created_at", { ascending: false });
        if (!error && !cancelled) setProjects((ps ?? []) as ProjectGsc[]);
      } catch {
        // Optional — Settings funktioniert auch ohne GSC-Sektion.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.loading, session.token]);

  async function toggleEmailNotifications(enabled: boolean) {
    if (!session.token || !data) return;
    setSavingNotif(true);
    const prev = data.notifications.email_notifications;
    setData({ ...data, notifications: { email_notifications: enabled } });
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${session.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ email_notifications: enabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.push("success", enabled ? "E-Mail-Benachrichtigungen aktiviert." : "E-Mail-Benachrichtigungen deaktiviert.");
    } catch (e) {
      setData({ ...data, notifications: { email_notifications: prev } });
      toast.push("error", e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSavingNotif(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (pw.length < 8) {
      setPwError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (pw !== pwConfirm) {
      setPwError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setPwBusy(true);
    try {
      const sb = ensureSupabase();
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) throw error;
      setPw("");
      setPwConfirm("");
      toast.push("success", "Passwort aktualisiert.");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Passwort konnte nicht geändert werden.");
    } finally {
      setPwBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="mt-4 text-red-400" role="alert">{loadError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="mt-4 text-ink-muted">Lade…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6" data-testid="settings-page">
      <h1 className="text-2xl font-bold sm:text-3xl">Einstellungen</h1>

      <Section title="Profil">
        <Row label="E-Mail-Adresse">
          <span data-testid="settings-email">{data.profile.email ?? "—"}</span>
        </Row>

        <form onSubmit={changePassword} className="mt-4 space-y-3">
          <h3 className="text-sm font-medium text-ink">Passwort ändern</h3>
          <div>
            <label htmlFor="new-pw" className="block text-xs text-ink-muted">Neues Passwort</label>
            <input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              className="input mt-1"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              minLength={8}
              required
            />
            <p className={`mt-1 text-xs ${pw.length >= 8 ? "text-accent" : "text-ink-muted"}`}>
              {pw.length >= 8 ? "✓ Mindestens 8 Zeichen" : "Mindestens 8 Zeichen"}
            </p>
          </div>
          <div>
            <label htmlFor="confirm-pw" className="block text-xs text-ink-muted">Bestätigen</label>
            <input
              id="confirm-pw"
              type="password"
              autoComplete="new-password"
              className="input mt-1"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {pwError && <p className="text-sm text-red-400" role="alert">{pwError}</p>}
          <button
            type="submit"
            className="btn-primary"
            disabled={pwBusy || pw.length < 8 || pw !== pwConfirm}
            data-testid="change-password-button"
          >
            {pwBusy ? "Wird gespeichert…" : "Passwort speichern"}
          </button>
        </form>

        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-sm font-medium text-ink">Tutorial neu starten</h3>
          <p className="mt-1 text-xs text-ink-muted">
            Zeigt die Onboarding-Tour erneut, wenn du das Dashboard aufrufst.
          </p>
          <button
            type="button"
            onClick={() => {
              resetOnboarding();
              toast.push("info", "Tutorial wird neu gestartet.");
              navigate("/dashboard");
            }}
            className="btn-ghost mt-2 text-sm"
            data-testid="restart-tutorial-button"
          >
            Tutorial neu starten
          </button>
        </div>

        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-sm font-medium text-ink">Account löschen</h3>
          <p className="mt-1 text-xs text-ink-muted">
            Beim Löschen werden alle deine Projekte, Audits und Keywords
            dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-2 text-sm text-red-400 hover:underline"
              data-testid="delete-account-button"
            >
              Account löschen
            </button>
          ) : (
            <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm">
              <p className="text-red-300">
                Sicher? Diese Aktion ist endgültig. Account-Löschung ist noch
                nicht produktiv freigeschaltet — bitte kontaktiere uns per E-Mail
                wenn du dein Konto sofort löschen möchtest.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btn-ghost text-xs"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Mein Plan">
        <Row label="Aktueller Plan">
          <span
            data-testid="settings-plan"
            className="inline-flex items-center rounded-md bg-accent-dim px-2 py-0.5 text-sm font-medium text-accent"
          >
            {PLAN_LABEL[data.plan.name]}
          </span>
        </Row>
        <Row label="Projekte">
          <span data-testid="usage-projects">
            {data.usage.projects}
          </span>{" "}
          aktiv
        </Row>
        <Row label="Keywords pro Projekt">
          max. {data.plan.limits.keywords}
        </Row>
        <Row label="Audits diesen Monat">
          <span data-testid="usage-audits">{data.usage.auditsThisMonth}</span>{" "}
          von {data.plan.limits.auditsPerMonth} genutzt
        </Row>
        <p className="mt-4 rounded-lg border border-line bg-white/[0.02] p-3 text-sm text-ink-muted">
          Mehr Keywords, mehr Audits, mehr Kontrolle —{" "}
          <button
            type="button"
            disabled
            className="font-medium text-accent opacity-50"
            title="Kommt bald"
          >
            jetzt upgraden
          </button>{" "}
          <span className="text-xs">(kommt bald)</span>
        </p>
      </Section>

      <Section title="Google Search Console">
        <ExplainerBox
          storageKey="gsc-why-connect"
          title="Warum GSC verbinden?"
          explanation="Google Search Console ist Googles eigenes Tool, das dir zeigt, wofür deine Seite gefunden wird, welche Position du hast und welche Probleme Google sieht. Die Verbindung ist kostenlos."
          whyItMatters="Mit GSC zeigt climbr.io echte Positions-Daten aus Google — statt geschätzter Werte. Du siehst sofort welche Keywords wirklich Traffic bringen."
          nextStep="Klick unten auf 'GSC verbinden' bei einem deiner Projekte. Du wirst zu Google weitergeleitet, gibst climbr.io Leserechte und kommst dann zurück."
        />
        {projects.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            Du hast noch keine Projekte. Sobald du eines anlegst, kannst du es
            hier mit GSC verbinden.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-line">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-medium">{p.domain}</span>
                <span
                  className={
                    p.gsc_connected
                      ? "inline-flex items-center gap-1 text-xs text-accent"
                      : "text-xs text-ink-muted"
                  }
                >
                  {p.gsc_connected ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
                      verbunden
                    </>
                  ) : (
                    "nicht verbunden"
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          GSC verbinden oder trennen geht aktuell direkt im Dashboard oder auf
          der Projekt-Seite.
        </p>
      </Section>

      <Section title="Benachrichtigungen">
        <Toggle
          id="email-notifications"
          label="E-Mail-Benachrichtigungen bei Ranking-Änderungen"
          description="Wir senden dir eine kurze E-Mail, wenn sich eines deiner getrackten Keywords um 3+ Plätze bewegt."
          checked={data.notifications.email_notifications}
          disabled={savingNotif}
          onChange={(v) => void toggleEmailNotifications(v)}
        />
        <div className="mt-4 opacity-60">
          <Toggle
            id="weekly-summary"
            label="Wöchentliche Zusammenfassung"
            description="Übersicht aller Bewegungen, neuer Audits und Empfehlungen — jeden Montag."
            checked={false}
            disabled
            onChange={() => undefined}
          />
          <p className="ml-9 mt-1 text-xs text-ink-muted">Kommt bald.</p>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{children}</span>
    </div>
  );
}

function Toggle({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        data-testid={`toggle-${id}`}
        className="mt-1 h-4 w-4 rounded border-line-strong text-accent focus:ring-accent/30"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-muted">{description}</span>}
      </span>
    </label>
  );
}
