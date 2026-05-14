import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { useToast } from "../components/Toast";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings as Settings,
  type ProjectNotificationOverride,
} from "../lib/api";

export default function NotificationSettingsPage() {
  const session = useSession();
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [projects, setProjects] = useState<ProjectNotificationOverride[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.loading || !session.token) return;
    void load(session.token);
  }, [session.loading, session.token]);

  async function load(token: string) {
    try {
      const data = await getNotificationSettings(token);
      setSettings(data.settings);
      setProjects(data.projects);
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Konnte Einstellungen nicht laden");
    }
  }

  async function save() {
    if (!session.token || !settings) return;
    setBusy(true);
    try {
      await updateNotificationSettings(session.token, {
        rankingThreshold: settings.ranking_threshold,
        notificationFrequency: settings.notification_frequency,
        emailNotifications: settings.email_notifications,
        projectThresholds: projects.map((p) => ({
          projectId: p.id,
          threshold: p.notification_threshold,
        })),
      });
      toast.push("success", "Einstellungen gespeichert");
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (!session.loading && !session.token) {
    return <Navigate to="/login" replace state={{ next: "/settings/notifications" }} />;
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-slate2">Lädt…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header>
        <h1 className="text-3xl font-bold">Benachrichtigungs-Einstellungen</h1>
        <p className="mt-1 text-slate2">
          Lege fest, ab welcher Ranking-Veränderung wir dich benachrichtigen.
        </p>
      </header>

      <section className="card mt-6 space-y-5">
        <label className="flex items-center justify-between">
          <span>
            <span className="block font-medium">E-Mail-Benachrichtigungen</span>
            <span className="block text-xs text-slate2">Wir senden zusammengefasste E-Mails bei Ranking-Bewegungen.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.email_notifications}
            onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
            className="h-5 w-5"
          />
        </label>

        <div>
          <label htmlFor="freq" className="block font-medium">Frequenz</label>
          <select
            id="freq"
            className="input mt-1"
            value={settings.notification_frequency}
            onChange={(e) =>
              setSettings({
                ...settings,
                notification_frequency: e.target.value as Settings["notification_frequency"],
              })
            }
          >
            <option value="daily">Täglich</option>
            <option value="weekly">Wöchentlich</option>
            <option value="off">Aus</option>
          </select>
        </div>

        <div>
          <label htmlFor="thr" className="block font-medium">
            Globaler Schwellwert: <span className="font-mono">{settings.ranking_threshold}</span> Plätze
          </label>
          <input
            id="thr"
            type="range"
            min={1}
            max={20}
            step={1}
            value={settings.ranking_threshold}
            onChange={(e) => setSettings({ ...settings, ranking_threshold: Number(e.target.value) })}
            className="mt-2 w-full"
          />
          <p className="mt-1 text-xs text-slate2">
            Wir benachrichtigen dich, sobald ein Keyword sich um diese Anzahl Plätze nach oben oder unten bewegt.
          </p>
        </div>
      </section>

      {projects.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Pro-Projekt-Überschreibungen</h2>
          <p className="text-sm text-slate2">Leer lassen, um den globalen Schwellwert zu verwenden.</p>
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3">
                <span className="font-medium">{p.domain}</span>
                <input
                  type="number"
                  className="input w-24 text-center"
                  min={1}
                  max={50}
                  value={p.notification_threshold ?? ""}
                  placeholder={`${settings.ranking_threshold}`}
                  onChange={(e) =>
                    setProjects((prev) =>
                      prev.map((x) =>
                        x.id === p.id
                          ? { ...x, notification_threshold: e.target.value === "" ? null : Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex justify-end">
        <button onClick={save} className="btn-primary" disabled={busy}>
          {busy ? "Speichere…" : "Änderungen speichern"}
        </button>
      </div>
    </div>
  );
}
