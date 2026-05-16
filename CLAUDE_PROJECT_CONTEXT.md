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
| 1       | Dashboard-Redesign (AppShell, Cards, Projektliste) | `claude/climbr-phase-4-setup-j1zSI` | ✅ fertig |
| 2       | Learning-Layer (ExplainerBox, NextStepCTA)        | `claude/climbr-phase-4-setup-j1zSI` | ✅ fertig |
| 3       | Account `/einstellungen`                          | `claude/climbr-phase-4-setup-j1zSI` | ✅ fertig |
| 4       | Legal-Seiten + Cookie-Banner                      | `claude/climbr-phase-4-setup-j1zSI` | ✅ fertig |
| 5       | SEO Wiki (`/wiki`)                                | `claude/climbr-phase-4-setup-j1zSI` | ✅ fertig |
| 6       | Auth-Flow Polish (Passwort-Reset, DE-Microcopy)   | `claude/climbr-phase-4-setup-j1zSI` | ✅ fertig |
| 7       | CI: bereits vorhanden (`ci.yml`, `preview-deploy.yml`, `playwright-demo.yml`) | — | ✅ bereits da |

Phase 4 ist **abgeschlossen** auf dem gemeinsamen Branch
`claude/climbr-phase-4-setup-j1zSI`. Alle Bereiche wurden statt in
separaten PRs in einem fortlaufenden Branch entwickelt — Merge in main
nach finaler Sichtung durch Marvin.

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

## Aktueller Stand (Phase 4 — alle Bereiche fertig)

### Hinzugefügt

**Bereich 1 — Dashboard / AppShell:**
- `frontend/src/components/layout/`: AppShell, TopNav, Sidebar,
  NotificationDropdown, Footer, PublicShell, ComingSoonGuard.
- `frontend/src/pages/Dashboard.tsx`: Übersichts-Cards + Projekt-Tabelle
  mit GSC-Connect-Inline-Actions + Empty-State.
- `frontend/src/components/dashboard/`: OverviewCards, ProjectTable,
  EmptyDashboard + reine Metric-Helper (`pickLatestAudit`,
  `computeKeywordMovements`, `scoreBucket`).

**Bereich 2 — Learning-Layer:**
- `frontend/src/components/learning/`: ExplainerBox (mit per-key
  localStorage-Tracking), NextStepCTA, TooltipHint, WikiLink.
- `frontend/src/data/learning.ts`: Microcopy für 8 SEO-Konzepte.
- Integration: AuditReport (Score-Explainer + NextStep-CTAs nach Quick
  Wins und Top-Fixes, Wiki-Links), RankingsTab (Rankings-Explainer +
  TooltipHints), NotificationsTab (Notifications-Explainer).

**Bereich 3 — Account `/einstellungen`:**
- `api/settings.ts`: GET liefert Profil + Plan + Limits + Verbrauch.
- `api/settings/notifications.ts`: PATCH togelt email_notifications
  (upsert, falls settings-Row noch fehlt).
- `frontend/src/pages/Einstellungen.tsx`: vier Sektionen — Profil
  (E-Mail, Passwort-ändern, Account-löschen-Stub), Mein Plan,
  Google Search Console, Benachrichtigungen.

**Bereich 4 — Legal + Cookie-Banner:**
- `frontend/src/pages/legal/`: Impressum (§5 TMG), Datenschutz
  (Art. 13/14 DSGVO), AGB (12 Abschnitte).
- `frontend/src/components/legal/LegalLayout.tsx`: einheitliche
  Typografie + Placeholder-Span für Marvin-zu-ersetzende Stellen.
- `frontend/src/components/cookie/CookieBanner.tsx`: DSGVO-konform,
  kein Dark Pattern, State in localStorage, Footer-Link zum
  Wiederöffnen.

**Bereich 5 — SEO Wiki:**
- `frontend/src/data/wiki/`: 23 Artikel verteilt auf 5 Kategorien
  (Grundlagen 4, On-Page 6, Technisches 6, Keywords 5, Lokales 2).
- `frontend/src/pages/wiki/`: WikiIndex (Suche + Kategorie-Filter +
  Karten-Grid), WikiArticle (Header + Breadcrumb + Markdown-Body +
  verwandte Artikel).
- `frontend/src/components/wiki/`: WikiCard, WikiBody (mini
  Markdown-Renderer: H2/H3, Absätze, Listen, Code-Blöcke, Tabellen,
  inline-Formatierung).

**Bereich 6 — Auth-Flow Polish:**
- `frontend/src/lib/authErrors.ts`: germanAuthError() mapped
  Supabase-Originalfehler auf deutsche Texte.
- `frontend/src/pages/Login.tsx`: Passwort + Magic-Link parallel,
  "Passwort vergessen?", deutsche Microcopy.
- `frontend/src/pages/Signup.tsx`: eigene Seite mit E-Mail + Passwort
  + Bestätigung + Live-Validation, AGB-Hinweis, Welcome-Toast.
- `frontend/src/pages/PasswortVergessen.tsx`,
  `frontend/src/pages/PasswortNeu.tsx`: Reset-Flow via
  `supabase.resetPasswordForEmail` + PASSWORD_RECOVERY-Event.
- DE-Übersetzungen: ProjectNew, ProjectDetail, AuditsTab,
  RankingsTab, NotificationsTab.

**Übergreifend:**
- ComingSoonGuard auf `/`: Landing-Page bleibt hidden — anon → /login,
  authed → /dashboard.
- 99 Vitest-Tests (von 46 in Phase 3), alle grün.
- Playwright-Smoke-Test auf die deutschen Texte angepasst + um
  Dashboard-Visit + Empty-State-Fall erweitert.

### Manuelle Schritte für Marvin

Siehe `docs/PHASE_4_GUIDE.md` — schrittweise Anleitung für alles, was
außerhalb von Claudes Zugriff liegt:
- Lokal-Test der UI
- Supabase E-Mail-Templates auf Deutsch
- Supabase Redirect-URLs für Passwort-Reset
- Legal-Platzhalter ersetzen (Name, Adresse, USt-Id, Gerichtsstand)
- GitHub-Secrets (VERCEL_*, SUPABASE_*, OPENAI_*)
