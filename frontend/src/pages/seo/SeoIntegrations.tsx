import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../../lib/useSession";
import { useToast } from "../../components/Toast";
import { SeoLayout } from "../../components/seo/SeoLayout";
import {
  listIntegrations,
  saveIntegration,
  deleteIntegration,
  testIntegration,
  type IntegrationStatus,
  type IntegrationProvider,
} from "../../lib/seoApi";

interface ProviderConfig {
  provider: IntegrationProvider;
  name: string;
  description: string;
  inputLabel: string;
  inputType: "password" | "text";
  inputPlaceholder: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    provider: "gsc",
    name: "Google Search Console",
    description: "Echte Klick-, Impressions- und Positionsdaten direkt aus Google. Pro Projekt verbinden.",
    inputLabel: "",
    inputType: "text",
    inputPlaceholder: "",
  },
  {
    provider: "openai",
    name: "OpenAI",
    description: "Generiert Content-Briefings auf Basis deiner SEO-Daten. Eigenen Key hinterlegen oder den Server-Key nutzen.",
    inputLabel: "API-Key",
    inputType: "password",
    inputPlaceholder: "sk-...",
  },
];

export default function SeoIntegrations() {
  return (
    <SeoLayout
      title="Verbindungen"
      subtitle="Verbinde deine Datenquellen, damit climbr aus echten Zahlen Handlungsempfehlungen ableiten kann."
      hideProject
    >
      {() => <IntegrationsBody />}
    </SeoLayout>
  );
}

function IntegrationsBody() {
  const session = useSession();
  const toast = useToast();
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<IntegrationProvider | null>(null);

  async function refresh() {
    if (!session.token) return;
    try {
      const { integrations } = await listIntegrations(session.token);
      setStatuses(integrations);
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Status konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session.loading || !session.token) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.loading, session.token]);

  if (session.loading || loading) {
    return <div className="text-ink-muted">Lade Integrationsstatus…</div>;
  }

  const byProvider = new Map(statuses.map((s) => [s.provider, s]));

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-line bg-bg-raised/40 p-4 text-sm text-ink-muted">
        climbr.io arbeitet datenbasiert. Je mehr Quellen du verbindest, desto präziser werden
        Chancen, Aufgaben und Briefings. Alle Zugangsdaten werden verschlüsselt gespeichert.
      </p>
      {PROVIDERS.map((cfg) => (
        <ProviderCard
          key={cfg.provider}
          cfg={cfg}
          status={byProvider.get(cfg.provider) ?? null}
          busy={busy === cfg.provider}
          onSave={async (credentials) => {
            if (!session.token) return;
            setBusy(cfg.provider);
            try {
              await saveIntegration(session.token, cfg.provider, credentials);
              toast.push("success", `${cfg.name} verbunden.`);
              await refresh();
            } catch (e) {
              toast.push("error", e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
            } finally {
              setBusy(null);
            }
          }}
          onTest={async () => {
            if (!session.token) return;
            setBusy(cfg.provider);
            try {
              const res = await testIntegration(session.token, cfg.provider);
              toast.push(res.ok ? "success" : "error", res.message);
              await refresh();
            } catch (e) {
              toast.push("error", e instanceof Error ? e.message : "Test fehlgeschlagen.");
            } finally {
              setBusy(null);
            }
          }}
          onDisconnect={async () => {
            if (!session.token) return;
            setBusy(cfg.provider);
            try {
              await deleteIntegration(session.token, cfg.provider);
              toast.push("success", `${cfg.name} getrennt.`);
              await refresh();
            } catch (e) {
              toast.push("error", e instanceof Error ? e.message : "Trennen fehlgeschlagen.");
            } finally {
              setBusy(null);
            }
          }}
        />
      ))}
      <DataForSeoServerCard status={byProvider.get("dataforseo") ?? null} />
    </div>
  );
}

function DataForSeoServerCard({ status }: { status: IntegrationStatus | null }) {
  const connected = status?.status === "connected";
  return (
    <article className="rounded-lg border border-line bg-bg-raised/60 p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Keyword-Daten</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Suchvolumen und verwandte Keywords liefert climbr.io zentral – keine
            Konfiguration nötig. Wird automatisch im Briefing-Generator und bei der
            Chancen-Analyse genutzt.
          </p>
        </div>
        <StatusPill status={connected ? "connected" : "disconnected"} />
      </header>
    </article>
  );
}

function ProviderCard({
  cfg,
  status,
  busy,
  onSave,
  onTest,
  onDisconnect,
}: {
  cfg: ProviderConfig;
  status: IntegrationStatus | null;
  busy: boolean;
  onSave: (credentials: string) => Promise<void>;
  onTest: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}) {
  const [value, setValue] = useState("");

  const isGsc = cfg.provider === "gsc";
  const connected = status?.status === "connected";

  return (
    <article className="rounded-lg border border-line bg-bg-raised/60 p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{cfg.name}</h2>
          <p className="mt-1 text-sm text-ink-muted">{cfg.description}</p>
        </div>
        <StatusPill status={status?.status ?? "disconnected"} />
      </header>

      {status?.last_error && (
        <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {status.last_error}
        </p>
      )}

      {isGsc ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link to="/einstellungen" className="btn-ghost">Projekt mit GSC verbinden</Link>
          <button type="button" className="btn-ghost" onClick={() => void onTest()} disabled={busy}>
            Verbindung prüfen
          </button>
          {status?.meta && typeof status.meta === "object" && "connectedProjects" in status.meta && (
            <span className="text-ink-muted">
              {String(status.meta.connectedProjects)} Projekt(e) verbunden
            </span>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,auto]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">{cfg.inputLabel}</span>
            <input
              type={cfg.inputType}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={cfg.inputPlaceholder}
              className="rounded-md border border-line bg-bg-elevated px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={busy || value.length < 8}
              onClick={async () => {
                await onSave(value);
                setValue("");
              }}
            >
              {connected ? "Aktualisieren" : "Verbinden"}
            </button>
            {connected && (
              <>
                <button type="button" className="btn-ghost" onClick={() => void onTest()} disabled={busy}>
                  Testen
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/20"
                  onClick={() => void onDisconnect()}
                  disabled={busy}
                >
                  Trennen
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {status?.last_tested_at && (
        <p className="mt-3 text-xs text-ink-subtle">
          Zuletzt getestet: {new Date(status.last_tested_at).toLocaleString("de-DE")}
        </p>
      )}
    </article>
  );
}

function StatusPill({ status }: { status: IntegrationStatus["status"] }) {
  if (status === "connected") {
    return <span className="rounded-full bg-accent-dim px-2.5 py-0.5 text-xs font-medium text-accent">verbunden</span>;
  }
  if (status === "error") {
    return <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-300">Fehler</span>;
  }
  return <span className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-xs text-ink-muted">nicht verbunden</span>;
}
