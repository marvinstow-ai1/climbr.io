# climbr.io — Project Context für Claude

> Diese Datei ist die zentrale Briefing-Quelle für jede Claude-Session.
> **Immer zuerst komplett lesen.** Updates am Ende jeder Phase pflegen.

---

## Produkt-Idee

climbr.io ist ein **KI-gestütztes SEO-Audit-Tool für kleine Online-Shops
und Kleinunternehmer ohne SEO-Vorkenntnisse**. Zielgruppe sind Leute, die
"SEO" als Fremdwort empfinden, aber wissen, dass ihre Sichtbarkeit bei
Google entscheidend für ihr Geschäft ist.

Kernprinzip: **Jeder Output muss erklärt werden** — was es bedeutet, warum
es wichtig ist, und was der nächste konkrete Schritt ist.

**Sprache:** Ausschließlich Deutsch (UI, Fehler, Wiki, Legal).

**Status:** Pre-Launch. Landing-Page ist hidden; Produkt ist nicht
öffentlich erreichbar.

---

## Tech Stack (unveränderlich)

| Bereich           | Stack                                              |
|-------------------|----------------------------------------------------|
| Frontend          | Vite + React 18 + TypeScript + TailwindCSS         |
| Routing           | react-router-dom v6                                |
| Backend           | Vercel Serverless Functions (`api/*.ts`)           |
| Datenbank         | Supabase (PostgreSQL + RLS)                        |
| Auth              | Supabase Auth                                      |
| AI                | OpenAI GPT-4o (mockbar via `MOCK_OPENAI=true`)     |
| SEO-Daten         | Google Search Console API (mockbar via `MOCK_GSC`) |
| Tests             | Vitest (Unit) + Playwright (E2E Smoke)             |
| CI/CD             | GitHub Actions + Vercel Preview Deployments        |

---

## Repository-Layout

```
.
├── api/                         # Vercel serverless functions (Edge runtime)
│   ├── projects.ts
│   ├── audit/
│   ├── rankings/
│   ├── gsc/
│   └── notifications.ts
├── frontend/                    # Vite + React app
│   └── src/
│       ├── App.tsx
│       ├── pages/               # Top-level routes
│       ├── components/          # UI components (split by domain)
│       └── lib/                 # supabase client, useSession, fetch helpers
├── lib/                         # Server-side shared code (auth, supabase, ai, gsc)
├── infra/supabase/migrations/   # SQL migrations (0001..)
├── tests/                       # Vitest + Playwright tests
├── ci/                          # Mock fixtures used by tests + CI
├── scripts/                     # dev.mjs, seed.ts, magic-link.ts
└── .github/workflows/           # ci.yml, preview-deploy.yml, playwright-demo.yml
```

---

## Phasen-Übersicht

| Phase | Inhalt                                                           | Status         |
|-------|------------------------------------------------------------------|----------------|
| 1     | Anonymer Quick-Audit, Email-Capture                              | ✅ abgeschlossen |
| 2     | Auth, Projekte, Audit-CRUD, AI-Bericht                           | ✅ abgeschlossen |
| 3     | GSC-OAuth, Rankings, Notifications                               | ✅ abgeschlossen |
| 4     | Dashboard-Redesign, Learning-Layer, Wiki, Legal, Account, Auth   | 🚧 in Arbeit    |

### Phase 4 — Teilbereiche

| Bereich | Inhalt                                            | Branch                              | Status |
|---------|---------------------------------------------------|-------------------------------------|--------|
| 1       | Dashboard-Redesign (AppShell, Cards, Projektliste) | `claude/climbr-phase-4-setup-j1zSI` | 🚧 in Arbeit |
| 2       | Learning-Layer (ExplainerBox, NextStepCTA)        | folgt                               | ⏳ offen |
| 3       | Account `/einstellungen`                          | folgt                               | ⏳ offen |
| 4       | Legal-Seiten + Cookie-Banner                      | folgt                               | ⏳ offen |
| 5       | SEO Wiki (`/wiki`)                                | folgt                               | ⏳ offen |
| 6       | Auth-Flow Polish (Passwort-Reset, DE-Microcopy)   | folgt                               | ⏳ offen |
| 7       | CI: bereits vorhanden (`ci.yml`, `preview-deploy.yml`, `playwright-demo.yml`) | — | ✅ bereits da |

> **Hinweis zu Bereich 7:** Die im Phase-4-Prompt erwähnten Workflows
> `preview-deploy.yml` und `playwright-demo.yml` existieren bereits. Vor
> einer eventuellen Überarbeitung prüfen ob die bestehenden CI-Files das
> abdecken, was die Phase-4-Spec verlangt.

---

## Domain-Modell (DB)

| Tabelle         | Zweck                                                   |
|-----------------|---------------------------------------------------------|
| `users`         | Profil-Row (FK auf `auth.users`), Plan, Locale          |
| `projects`      | Domain + GSC-Verknüpfung pro User                       |
| `audits`        | Crawl-Snapshot + AI-Report + Score (0–100)              |
| `keywords`      | Tracked Keywords pro Projekt                            |
| `rankings`      | Tagesposition pro Keyword (GSC oder mock)               |
| `notifications` | Auto-erzeugte Benachrichtigungen bei Ranking-Sprüngen   |
| `settings`      | E-Mail-Benachrichtigungen + Locale pro User             |
| `anon_audit_log`| Rate-Limit-Tracking für anonyme Quick-Audits            |

**RLS:** Alle Tabellen haben Policies auf `auth.uid()`. Service-Role
umgeht RLS — wird nur in Server-Functions (`api/*`) genutzt.

> **Wichtig für Phase 4 Bereich 3 (Account):** Die im Phase-4-Prompt
> vorgeschlagene `profiles`-Tabelle (Migration 0004) **existiert bereits
> als `settings`** (siehe `0001_init.sql`). Statt neue Tabelle anlegen —
> bestehende `settings.email_notifications` verwenden.

---

## Konventionen

- **Sprache UI:** Deutsch. Fehlertexte user-friendly, kein Stacktrace im UI.
- **Tests:** Mock-First. In CI immer `MOCK_OPENAI=true` + `MOCK_GSC=true`.
- **Routing:** Authed-Routen unter AppShell-Layout (TopNav + Sidebar).
- **Secrets:** nur via `.env.local` / Vercel-Env / GitHub-Secrets. Niemals
  im Code.
- **Branches:** `feature/...` oder `claude/...`, nie direkt auf `main`.
- **Commits:** `type(scope): kurz` — `feat`, `fix`, `chore`, `docs`, `test`.
- **A11y:** `aria-label`, `data-testid`, Keyboard-Navigation überall.

---

## Aktueller Stand (Phase 4 — Bereich 1)

### Hinzugefügt

- **AppShell** (`frontend/src/components/layout/`): TopNav, Sidebar,
  Footer, NotificationDropdown. Wird als Route-Wrapper für alle authed
  Routen verwendet.
- **Dashboard-Redesign** (`frontend/src/pages/Dashboard.tsx`):
  Übersichts-Cards + Projekt-Tabelle + Leerzustand. Holt Audits,
  Rankings, Notifications selbst.
- **Komponenten** (`frontend/src/components/dashboard/`):
  `OverviewCards`, `ProjectTable`, `EmptyDashboard`.
- **Tests**: `tests/dashboard.test.ts` (Helper-Unit-Tests),
  Playwright-Smoke um Dashboard-Visit erweitert.

### Bewusst offen / nicht in Bereich 1

- Bereich 2 (Learning-Layer / ExplainerBox) — die Microcopy-Texte sind
  schon in `frontend/src/data/learning.ts` als Stub vorbereitet, werden
  in Bereich 2 in echte Komponenten gebunden.
- Sidebar "+ Neues Projekt" linkt auf bestehende Route `/projects/new`
  (deutsche Route `/projekte/neu` folgt in späterer Phase mit dem
  Routing-Refactor).
- TopNav-Link "Wiki" und "Einstellungen" sind sichtbar aber
  Placeholder-Routen — werden in Bereich 3 / 5 echt.

### Manuelle Schritte für Marvin

Siehe `docs/PHASE_4_GUIDE.md` — schrittweise Anleitung für alles, was
außerhalb von Claudes Zugriff liegt (Vercel-Env, Supabase-Secrets,
DNS, Legal-Platzhalter, etc.).
