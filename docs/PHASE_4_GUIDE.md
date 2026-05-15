# Phase 4 — Manuelle Schritte für Marvin

> Diese Anleitung listet alles auf, was **du selbst** machen musst.
> Claude kümmert sich um den Code, aber bestimmte Dinge (Secrets,
> Legal-Inhalte, Vercel-Konfiguration) muss ein Mensch erledigen.
>
> Pro Bereich gibt es eine eigene Checkliste. Hak ab was erledigt ist.

---

## Bereich 1 — Dashboard / AppShell

### 1.1 Lokal ausprobieren

```bash
# 1. Dependencies installieren (falls noch nicht passiert)
npm ci
npm --prefix frontend ci

# 2. Frontend starten (nutzt deine .env.local für Supabase)
npm run dev:frontend-only

# 3. Im Browser: http://localhost:5173
#    - Mit deinem Test-Account einloggen
#    - Du landest auf /dashboard mit dem neuen Layout
#    - Links: Sidebar mit Projekten
#    - Oben: TopNav mit Glocke (Notifications), Avatar
```

**Was du visuell prüfen solltest:**

- [ ] Nach Login: Übersichts-Cards oben (Projekte, Letzter Audit, Keyword-Bewegungen)
- [ ] Cards-Werte stimmen mit dem überein, was du in der DB hast
- [ ] Projekt-Tabelle zeigt deine Projekte mit farbigem Score-Badge
- [ ] Klick auf Projekt-Zeile geht zu `/projects/[id]`
- [ ] Sidebar lässt sich einklappen (Burger-Button oben links)
- [ ] Glocken-Icon zeigt Unread-Count
- [ ] Mobile: Sidebar wird zu Off-Canvas-Drawer
- [ ] Leerzustand: wenn keine Projekte → Empty State mit CTA

### 1.2 Tests laufen lassen

```bash
# Unit-Tests (Vitest)
npm test

# Playwright Smoke (lokal mit headed UI)
npx playwright install --with-deps  # einmalig
npm run test:e2e

# Falls Tests fehlschlagen:
#   - npm test -- --reporter=verbose
#   - npx playwright test --debug
```

Soll-Stand: alle Unit-Tests grün, Smoke-Test grün.

---

## Bereich 2 — Learning-Layer (folgt)

Wird in nächster Iteration umgesetzt. Stub-Daten liegen schon in
`frontend/src/data/learning.ts`.

**Manuelle Schritte (vorbereitend, optional jetzt schon):**

- [ ] Überlege dir 1–2 Sätze pro Konzept, falls du die Standard-Texte
      anpassen willst (alle Texte stehen in `learning.ts`).

---

## Bereich 3 — Account / Einstellungen (folgt)

**Wichtig:** Die im Phase-4-Prompt vorgeschlagene Migration `0004_profiles.sql`
ist nicht nötig — die `settings`-Tabelle existiert schon (siehe
`infra/supabase/migrations/0001_init.sql`).

**Manuelle Schritte:**

- [ ] Entscheide ob "Account löschen" wirklich Hard-Delete (DSGVO!) oder
      Soft-Delete (Status-Flag) sein soll. Empfehlung: Hard-Delete via
      `supabase.auth.admin.deleteUser()` in einer Server-Function.

---

## Bereich 4 — Legal-Seiten

Sobald die Legal-Seiten von Claude generiert sind (Impressum, Datenschutz,
AGB), **musst du die Platzhalter ersetzen**. Die Platzhalter sind
deutlich markiert als `[PLATZHALTER]`.

### 4.1 Impressum (`/legal/impressum`)

- [ ] `[VOLLSTÄNDIGER NAME]` → dein Klarname
- [ ] `[STRASSE UND HAUSNUMMER]` → Geschäftsadresse (Privatadresse falls
      Einzelunternehmer ohne Geschäftssitz — alternativ ladungsfähige
      Anschrift via Impressum-Service)
- [ ] `[PLZ ORT]`
- [ ] `[E-MAIL-ADRESSE]` → z.B. `kontakt@climbr.io`
- [ ] Optional: Telefon, USt-IdNr., Handelsregister
- [ ] Verantwortlich nach § 55 RStV: meist du selbst

**DSGVO-Check:** Geschäftliche Webseiten in DE brauchen ein Impressum
(§ 5 TMG). Bei Einzelunternehmen ohne separate Geschäftsadresse: nutze
ggf. einen Impressums-Service (z.B. impressum-service.de) für ~10€/Monat.

### 4.2 Datenschutzerklärung (`/legal/datenschutz`)

- [ ] Verantwortlicher: dein Name + Adresse + E-Mail
- [ ] Hosting-Anbieter: Vercel (USA — SCCs), Supabase (EU-Region
      Frankfurt sicherstellen!), OpenAI (USA — SCCs)
- [ ] **Wichtig:** Wenn Supabase-Projekt **nicht** in EU-Region: in
      Vercel/Supabase-Dashboard umziehen oder neues EU-Projekt anlegen.
      Aktuell prüfen: https://supabase.com/dashboard → dein Projekt →
      Settings → General → Region. Sollte `eu-central-1` (Frankfurt) sein.
- [ ] Cookie-Hinweis: Wir nutzen nur technisch notwendige Session-Cookies
      (Supabase Auth) — kein Tracking
- [ ] Kontakt für Auskunfts-/Löschanträge

### 4.3 AGB (`/legal/agb`)

- [ ] Anbieter-Adresse
- [ ] Gerichtsstand: dein Wohnsitz/Geschäftssitz
- [ ] Free-Tier-Limits: aktuell 3 Projekte / 5 Keywords / 10 Audits pro
      Monat — prüfe ob das deinen Geschäftsplänen entspricht

### 4.4 Cookie-Banner

Der Cookie-Banner ist DSGVO-konform vorbereitet (kein Dark Pattern, beide
Buttons gleich groß). Du musst nichts ändern, **es sei denn** du planst
später Tracking (z.B. Plausible, Matomo) — dann erweitere den Banner um
eine "Analyse-Cookies"-Option.

---

## Bereich 5 — SEO Wiki

Die 21 Artikel werden von Claude generiert. **Du musst:**

- [ ] Inhalte fachlich prüfen — Claude ist gut, aber kein SEO-Experte.
      Besonders prüfen: Core Web Vitals (Werte ändern sich), Google
      Business Profil (UI-Änderungen), Mobile-First (aktueller Stand).
- [ ] Eigene Erfahrungen einbauen — wenn du selbst Praxis-Tipps hast,
      ergänze sie in `frontend/src/data/wiki/[slug].ts`.
- [ ] (Optional) Bilder/Screenshots ergänzen — Wiki-Template unterstützt
      `<img>` in Markdown-Body.

---

## Bereich 6 — Auth-Flow

### 6.1 Supabase E-Mail-Templates auf Deutsch

Supabase-Dashboard → Authentication → Email Templates → für jede
Vorlage:

- [ ] **Confirm signup** auf Deutsch übersetzen
- [ ] **Magic Link** auf Deutsch
- [ ] **Reset Password** auf Deutsch
- [ ] Absender-Name auf "climbr.io" setzen (Settings → SMTP)
- [ ] Falls eigener SMTP-Server: konfigurieren (sonst nutzt Supabase
      einen Standard-Versender mit niedrigem Sendekontingent)

Beispiel-Text "Reset Password":

```
Hallo,

du hast eine Passwort-Zurücksetzung für deinen climbr.io-Account
angefordert. Klick auf den Link, um ein neues Passwort zu setzen:

{{ .ConfirmationURL }}

Der Link ist 60 Minuten gültig. Wenn du das nicht warst, ignoriere
diese E-Mail einfach.

— Dein climbr.io-Team
```

### 6.2 Passwort-Reset-Route in Supabase whitelisten

- [ ] Supabase-Dashboard → Authentication → URL Configuration
- [ ] **Site URL:** `https://climbr.io` (oder dein Vercel-Domain)
- [ ] **Redirect URLs hinzufügen:**
  - `http://localhost:5173/auth/callback`
  - `https://climbr.io/auth/callback`
  - `https://*-claude-climbr.vercel.app/auth/callback` (Preview Deployments)

---

## Bereich 7 — CI / Workflows

Die im Phase-4-Prompt erwähnten Workflows **existieren schon**:

- `.github/workflows/ci.yml`
- `.github/workflows/preview-deploy.yml`
- `.github/workflows/playwright-demo.yml`

**Was du prüfen musst (GitHub Secrets):**

- [ ] Repo-Settings → Secrets and variables → Actions → die folgenden
      Secrets müssen gesetzt sein:
  - `VERCEL_TOKEN` (Account → Settings → Tokens)
  - `VERCEL_ORG_ID` (in Vercel CLI: `vercel link` zeigt es an, oder
        Dashboard → Settings → General → Team-ID)
  - `VERCEL_PROJECT_ID` (Dashboard → Projekt → Settings → General →
        Project ID)
  - `SUPABASE_URL` (Dashboard → Settings → API → Project URL)
  - `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API →
        service_role secret — **streng geheim!**)
  - `OPENAI_API_KEY` — wird in CI durch `MOCK_OPENAI=true` umgangen;
        nur für Production nötig
  - `GSC_CLIENT_ID` / `GSC_CLIENT_SECRET` — analog für GSC

---

## Allgemein — Nach jedem Bereich

```bash
# 1. Lokal testen
npm test
npm run test:e2e

# 2. In neue PR pushen (Claude erstellt die Branches, du mergst)
#    Reihenfolge: Bereich 1 → 2 → 3 → 4 → 5 → 6
#    (Bereich 7 ist schon erledigt)

# 3. Auf Vercel Preview-Deployment prüfen, bevor du in main mergst
```

---

## Wenn was schiefgeht

| Problem                                        | Lösung                                                                       |
|------------------------------------------------|------------------------------------------------------------------------------|
| `Supabase env vars missing` im Browser         | `.env.local` im Repo-Root anlegen mit `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| `useSession` returns `null` obwohl eingeloggt  | Cookies löschen + neu einloggen; Supabase-Session evtl. abgelaufen           |
| Playwright "browser not installed"             | `npx playwright install --with-deps`                                          |
| Vitest schlägt mit "Cannot find module" fehl   | `npm ci` neu — Lockfile ist die Source-of-Truth                              |
| TypeScript-Fehler in der Konsole               | `npm run typecheck` zeigt alle Fehler — Claude beheben lassen                |

---

## Kontakt

Wenn du in einer neuen Claude-Session weitermachst:

> "Lies `CLAUDE_PROJECT_CONTEXT.md` und `docs/PHASE_4_GUIDE.md` zuerst.
> Wir sind bei Phase 4 — Bereich X."
