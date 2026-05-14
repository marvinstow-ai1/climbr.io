# climbr.io — Phase 2 Setup-Anleitung

Diese Anleitung beschreibt **Schritt für Schritt**, was du selbst tun musst,
damit Phase 2 (DataForSEO-Integration, Keyword-Research, Wettbewerber-Analyse,
Live-Dashboard, erweiterte Ranking-Benachrichtigungen) komplett funktioniert.

Alles, was Claude selbst nicht erledigen kann (Accounts anlegen, API-Keys
generieren, Migrations im Live-Supabase ausführen), findest du hier mit
exaktem Klickpfad.

---

## 1. DataForSEO-Account anlegen

1. Öffne https://app.dataforseo.com/register
2. Trage E-Mail + Passwort ein und bestätige die E-Mail (Inbox checken).
3. Logge dich ein, du landest im Dashboard.
4. Klicke links im Menü auf **API Access**.
5. Du siehst zwei Werte: **API Login** (deine E-Mail) und **API Password**
   (eine lange zufällige Zeichenfolge — *nicht* dein Account-Passwort).
6. Kopiere beide Werte. Du brauchst sie gleich in den Umgebungsvariablen.
7. **Geld einzahlen**: Klicke links auf **Add Funds** und lade mind. 10 € auf.
   Ohne Guthaben antworten alle Endpoints mit 402-Fehler.

> Tipp: Für lokale Entwicklung kannst du `USE_MOCK_DATAFORSEO=true` setzen.
> Dann liefert die Service-Schicht deterministische Fake-Daten, ohne dass ein
> einziger API-Call rausgeht. Für die Produktion oder echte Testdaten setzt du
> es auf `false` (oder lässt es weg).

---

## 2. Umgebungsvariablen setzen

### Lokal

1. Öffne die Datei `.env.local` im **Root** des Repos (nicht in `frontend/`).
   Falls sie noch nicht existiert: `cp .env.example .env.local`.
2. Trage diese neuen Werte ein:
   ```
   DATAFORSEO_LOGIN=deine-email@example.com
   DATAFORSEO_PASSWORD=das-lange-passwort-aus-dem-dashboard
   USE_MOCK_DATAFORSEO=true   # auf false stellen für echte Calls
   ```
3. Wenn du E-Mail-Benachrichtigungen ausprobieren willst:
   ```
   SMTP_URL=https://api.resend.com/emails::re_xxx
   EMAIL_FROM=climbr.io <no-reply@deine-domain.tld>
   ```
   (Resend-Account: https://resend.com/signup → API Keys → Create API Key.)

### Vercel (Produktion)

1. Gehe zu https://vercel.com/dashboard
2. Wähle das Projekt **climbr.io**.
3. Klicke oben auf **Settings** → links auf **Environment Variables**.
4. Füge jeweils einzeln hinzu (Environment: **Production** + **Preview**):
   - `DATAFORSEO_LOGIN`
   - `DATAFORSEO_PASSWORD`
   - `USE_MOCK_DATAFORSEO` = `false`
   - optional: `SMTP_URL`, `EMAIL_FROM`
5. Klicke nach dem letzten Save oben auf **Deployments** → bei der neuesten
   Production-Bereitstellung auf das **⋯**-Menü → **Redeploy**, damit die
   neuen Variablen wirksam werden.

---

## 3. Supabase-Migration ausführen

Die Phase-2-Migration liegt unter
`infra/supabase/migrations/0004_phase2_dataforseo.sql`. Sie legt die neuen
Tabellen an (`dataforseo_cache`, `keyword_research`, `competitor_analysis`,
`dashboard_snapshots`, `traffic_history`) und erweitert `settings` + `projects`
um die Spalten für Benachrichtigungs-Schwellwerte.

### Variante A: Supabase Dashboard (einfachster Weg)

1. Öffne https://supabase.com/dashboard
2. Wähle dein Climbr-Projekt.
3. Links: **SQL Editor**.
4. **+ New query** → öffne die Datei
   `infra/supabase/migrations/0004_phase2_dataforseo.sql` in deinem Editor
   und kopiere den **gesamten** Inhalt ins SQL-Editor-Fenster.
5. Klicke unten rechts auf **Run** (oder ⌘+Enter).
6. Erfolgsmeldung: *"Success. No rows returned"* — fertig.

### Variante B: Supabase CLI (falls installiert)

```bash
supabase db push
```

### Verifizieren

1. Im Dashboard links auf **Database** → **Tables**.
2. Du solltest folgende neue Tabellen sehen:
   - `dataforseo_cache`
   - `keyword_research`
   - `competitor_analysis`
   - `dashboard_snapshots`
   - `traffic_history`
3. Klicke auf `settings` → der Tab **Columns** sollte jetzt
   `ranking_threshold`, `notification_frequency`,
   `last_notification_email_at` enthalten.

---

## 4. Smoke-Test

### Lokal

```bash
# Im Repo-Root:
npm run dev
```

Dann im Browser:

1. http://localhost:5173/keywords → Keyword eingeben → "Analyse starten".
   Mit `USE_MOCK_DATAFORSEO=true` siehst du Mock-Daten in <1 Sekunde.
2. http://localhost:5173/competitors → Domain eingeben → "Analysieren".
3. http://localhost:5173/dashboard → Projekt öffnen → Tab **Overview**.
4. http://localhost:5173/settings/notifications → Schwellwert anpassen → speichern.

### Cron in Produktion

Die Cron-Jobs (in `vercel.json` definiert) laufen automatisch:

- `0 3 * * *` — `daily-rankings`: zieht für jedes getrackte Keyword die
  aktuelle Position via DataForSEO SERP-API und erzeugt Notifications,
  sobald die Veränderung >= Schwellwert ist. Schickt E-Mail-Zusammenfassungen
  (höchstens 1× pro Tag bzw. Woche je nach User-Einstellung).
- `0 5 * * *` — `refresh-dashboards`: aktualisiert die `dashboard_snapshots`
  inkl. Traffic-Trend und Top-Gewinner/Verlierer für alle Projekte.

Manuelles Triggern (zum Testen):

```bash
curl https://climbr.io/api/cron/daily-rankings
curl https://climbr.io/api/cron/refresh-dashboards
```

---

## 5. Architektur-Überblick (für Referenz)

| Layer | Datei(en) |
|-------|-----------|
| DataForSEO-Service (zentral, server-only) | `lib/dataforseo.ts` |
| E-Mail-Versand (Resend-kompatibel) | `lib/email.ts` |
| API: Keyword Research | `api/keywords/research.ts` |
| API: Competitor Analysis | `api/competitors/analyze.ts` |
| API: Dashboard Snapshot | `api/dashboard/[projectId].ts` |
| API: Notification Settings | `api/settings/notifications.ts` |
| Cron: Daily Rankings | `api/cron/daily-rankings.ts` |
| Cron: Refresh Dashboards | `api/cron/refresh-dashboards.ts` |
| Page: Keyword Research | `frontend/src/pages/KeywordResearch.tsx` |
| Page: Competitors | `frontend/src/pages/Competitors.tsx` |
| Page: Notification Settings | `frontend/src/pages/NotificationSettings.tsx` |
| Project-Tab: Overview (Live-Daten) | `frontend/src/components/project/OverviewTab.tsx` |
| Migration | `infra/supabase/migrations/0004_phase2_dataforseo.sql` |

### Caching-Strategie

Alle DataForSEO-Antworten werden in `dataforseo_cache` (key = SHA-256 von
`endpoint + payload`) zwischengespeichert, mit TTL pro Endpoint (Standard 24h
für Keyword-Daten und Competitor-Analysen, 12h für Cron-SERP-Lookups).
Cache-Treffer kosten kein DataForSEO-Guthaben.

`dashboard_snapshots` ist eine zusätzliche Schicht: Beim Aufruf von
`/api/dashboard/:projectId` wird die gespeicherte Snapshot zurückgegeben,
solange sie < 24h alt ist. Mit `?refresh=1` (oder POST) wird sie zwangsweise
neu gebaut.

### Sicherheit

- Die DataForSEO-Credentials liegen ausschließlich server-seitig (Env-Vars
  auf Vercel) und werden nie an den Browser ausgeliefert.
- `dataforseo_cache` hat **keine** RLS-Policy → für den Client unzugänglich.
- Alle anderen neuen Tabellen sind per Owner-Scope (`auth.uid()`) auf den
  jeweiligen User beschränkt (siehe `0004_phase2_dataforseo.sql`).
- Alle neuen `/api/*`-Endpoints verlangen `Authorization: Bearer <jwt>` →
  Aufrufer wird via Supabase Auth validiert (`lib/auth.ts`).
