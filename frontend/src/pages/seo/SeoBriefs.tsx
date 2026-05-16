import { useEffect, useState } from "react";
import { useSession } from "../../lib/useSession";
import { useToast } from "../../components/Toast";
import { SeoLayout } from "../../components/seo/SeoLayout";
import { generateBriefApi, listBriefs, type ContentBriefRow } from "../../lib/seoApi";

export default function SeoBriefs() {
  return (
    <SeoLayout
      title="Content-Briefings"
      subtitle="Erstelle in einem Klick einen kompakten Briefing-Plan für ein Keyword oder eine Seite."
    >
      {(projectId) => (projectId ? <BriefsBody projectId={projectId} /> : null)}
    </SeoLayout>
  );
}

function BriefsBody({ projectId }: { projectId: string }) {
  const session = useSession();
  const toast = useToast();
  const [briefs, setBriefs] = useState<ContentBriefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  async function refresh() {
    if (!session.token) return;
    try {
      const { briefs: rows } = await listBriefs(session.token, projectId);
      setBriefs(rows);
      if (rows.length > 0 && openId == null) setOpenId(rows[0]!.id);
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session.loading || !session.token) return;
    setLoading(true);
    setOpenId(null);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.loading, session.token, projectId]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!session.token || keyword.trim().length < 2) return;
    setBusy(true);
    try {
      const res = await generateBriefApi(session.token, {
        projectId,
        keyword: keyword.trim(),
        pageUrl: pageUrl.trim() || undefined,
      });
      toast.push("success", "Briefing erstellt.");
      setBriefs((prev) => [res.brief, ...prev]);
      setOpenId(res.brief.id);
      setKeyword("");
      setPageUrl("");
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Briefing fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
      <section className="space-y-4">
        <form onSubmit={generate} className="rounded-lg border border-line bg-bg-raised/60 p-4 space-y-3">
          <h2 className="text-base font-semibold text-ink">Neues Briefing</h2>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Keyword</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="z.B. yoga matte naturkautschuk"
              className="rounded-md border border-line bg-bg-elevated px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Bestehende Seite (optional)</span>
            <input
              type="url"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="https://example.de/seite"
              className="rounded-md border border-line bg-bg-elevated px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Wird erstellt…" : "Briefing erstellen"}
          </button>
        </form>

        <div className="rounded-lg border border-line bg-bg-raised/40 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Bisherige Briefings</h3>
          {loading ? (
            <p className="mt-2 text-sm text-ink-muted">Lade…</p>
          ) : briefs.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">Noch keine Briefings.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {briefs.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(b.id)}
                    className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition ${
                      openId === b.id ? "bg-accent-dim text-accent" : "text-ink hover:bg-white/[0.04]"
                    }`}
                  >
                    {b.keyword}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        {openId ? (
          <BriefDetail brief={briefs.find((b) => b.id === openId) ?? null} />
        ) : (
          <div className="rounded-lg border border-line bg-bg-raised/40 p-6 text-center text-sm text-ink-muted">
            Wähle ein Briefing oder erstelle ein neues.
          </div>
        )}
      </section>
    </div>
  );
}

function BriefDetail({ brief }: { brief: ContentBriefRow | null }) {
  if (!brief) return <div className="text-ink-muted">Briefing nicht gefunden.</div>;
  const b = brief.brief;
  return (
    <article className="space-y-5 rounded-lg border border-line bg-bg-raised/60 p-5">
      <header>
        <h2 className="text-xl font-bold text-ink">{brief.keyword}</h2>
        <p className="mt-1 text-xs text-ink-subtle">
          Erstellt am {new Date(brief.created_at).toLocaleString("de-DE")}
          {brief.model && brief.model !== "mock" ? ` • ${brief.model}` : " • Beispiel-Briefing"}
        </p>
      </header>

      <Section title="Suchabsicht">
        <p className="text-sm text-ink">{translateIntent(b.intent)}</p>
      </Section>

      <Section title="Ziel-Keyword">
        <p className="text-sm text-ink">{b.targetKeyword}</p>
      </Section>

      <Section title="Sekundäre Keywords">
        <div className="flex flex-wrap gap-1.5">
          {b.secondaryKeywords.map((k) => (
            <span key={k} className="rounded-full border border-line bg-white/[0.03] px-2.5 py-0.5 text-xs text-ink">{k}</span>
          ))}
        </div>
      </Section>

      <Section title="Title-Vorschläge">
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
          {b.titleSuggestions.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </Section>

      <Section title="H1">
        <p className="text-sm text-ink">{b.h1}</p>
      </Section>

      <Section title="Empfohlener Aufbau">
        <ol className="space-y-2">
          {b.pageStructure.map((s, i) => (
            <li key={i} className="rounded-md border border-line bg-bg-elevated/60 p-3">
              <div className="text-xs uppercase tracking-wide text-ink-subtle">{s.type.toUpperCase()}</div>
              <div className="text-sm font-medium text-ink">{s.heading}</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-muted">
                {s.bullets.map((bullet, j) => <li key={j}>{bullet}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="FAQ-Ideen">
        <ul className="space-y-2">
          {b.faq.map((f, i) => (
            <li key={i} className="rounded-md border border-line bg-bg-elevated/60 p-3 text-sm">
              <div className="font-medium text-ink">{f.q}</div>
              <div className="mt-1 text-ink-muted">{f.a}</div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Interne Verlinkung">
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
          {b.internalLinks.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h3>
      {children}
    </section>
  );
}

function translateIntent(intent: string): string {
  switch (intent) {
    case "informational": return "Informationsabsicht – Nutzer:innen wollen lernen oder vergleichen.";
    case "transactional": return "Transaktionsabsicht – Nutzer:innen wollen kaufen oder buchen.";
    case "commercial": return "Kommerzielle Recherche – kurz vor der Kaufentscheidung.";
    case "navigational": return "Navigationsabsicht – sucht eine bestimmte Seite/Marke.";
    default: return intent;
  }
}
