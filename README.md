# climbr.io — AI SEO Audit MVP (Phase 1)

AI-powered SEO audits for small shops and freelancers. Enter a URL, get a
prioritized fix list with quick wins, a 0–100 score, and (optionally) ranking
data from Google Search Console.

**Status:** Phase 1 MVP scaffold. Mocked AI by default. Real OpenAI / GSC are
flag-gated and wired but disabled until keys are provided.

## Stack

- **Frontend:** Vite + React + TypeScript + TailwindCSS
- **Backend:** Vercel Edge Functions (`/api/*`)
- **DB / Auth:** Supabase (EU region — `eu-central-1` / `frankfurt`)
- **AI:** OpenAI GPT-4o (mocked in dev)
- **Rankings:** Google Search Console OAuth (stubbed in MVP)
- **Cron:** Vercel Cron (daily ranking pull + audit TTL cleanup)

## Repo layout

```
.
├── api/                       # Vercel edge functions (auto-detected by Vercel)
│   ├── audit/run.ts           # POST — run an audit
│   ├── audit/[id].ts          # GET — fetch audit + AI report
│   ├── gsc/connect.ts         # OAuth start (stub)
│   ├── rankings/track.ts      # add tracked keyword
│   ├── notifications.ts       # list / mark seen
│   ├── cron/daily-rankings.ts # cron — GSC pull + diff
│   ├── cron/cleanup-audits.ts # cron — 180-day TTL
│   └── health.ts
├── lib/                       # Backend shared code
│   ├── crawl.ts               # HTML → SEO signals parser
│   ├── ai.ts                  # OpenAI client + prompt builder (mockable)
│   ├── supabase.ts            # Service-role server client
│   ├── ratelimit.ts           # In-memory + Supabase IP rate limit
│   └── validation.ts          # zod schemas for API I/O
├── frontend/                  # Vite React app
│   ├── src/pages/             # Landing, Dashboard, AuditReport, …
│   ├── src/components/
│   └── src/lib/
├── infra/supabase/migrations/ # SQL migrations (run via supabase CLI)
├── scripts/seed.ts            # seed a demo user + audit
├── tests/                     # vitest unit + integration
└── vercel.json                # cron + build config
```

> **Naming note:** the brief asks for a `backend/` directory; on Vercel,
> functions must live in `/api/` at the project root. We treat the root
> `package.json` plus `/api/` plus `/lib/` as the "backend package".

## Local dev

### 1. Prereqs

- Node 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local DB) — optional;
  you can also point at a remote Supabase EU project.
- A Vercel account (for `vercel dev` to run edge functions locally).

### 2. Install

```sh
npm install            # root (backend) deps
npm install --prefix frontend
```

### 3. Env

```sh
cp .env.example .env.local
```

Required for **mock mode** (default): nothing — just leave `USE_MOCK_AI=true`.

Required for **real mode**:

| Var                          | Where used        | Notes                          |
| ---------------------------- | ----------------- | ------------------------------ |
| `SUPABASE_URL`               | server + client   |                                |
| `SUPABASE_ANON_KEY`          | client            | safe to expose                 |
| `SUPABASE_SERVICE_ROLE_KEY`  | server only       | **never** expose to client     |
| `OPENAI_API_KEY`             | server            | set `USE_MOCK_AI=false`        |
| `GSC_CLIENT_ID`              | server            |                                |
| `GSC_CLIENT_SECRET`          | server            | encrypted at rest in DB        |
| `TOKEN_ENCRYPTION_KEY`       | server            | 32-byte hex, used for GSC refresh tokens |
| `OAUTH_STATE_SECRET`         | server            | 32-byte hex, HMAC-signs OAuth `state`      |
| `SMTP_URL`                   | server (optional) | for notification emails        |

### 4. DB migrations

```sh
supabase start                                              # local stack
supabase db reset                                           # applies infra/supabase/migrations/*
# OR for remote:
supabase link --project-ref <your-eu-project-ref>
supabase db push
```

### 5. Run

```sh
# Terminal 1 — frontend
npm run dev --prefix frontend       # http://localhost:5173

# Terminal 2 — edge functions
vercel dev                          # http://localhost:3000 — proxies /api/*
```

The frontend's Vite dev server proxies `/api/*` to `vercel dev` (see
`frontend/vite.config.ts`).

### 6. Seed + smoke test

```sh
npm run seed                        # creates demo user + sample audit
npm test                            # vitest
```

## Flipping from mock AI → real OpenAI

In `.env.local`:

```
USE_MOCK_AI=false
OPENAI_API_KEY=sk-...
```

Restart `vercel dev`. The `lib/ai.ts` module reads the flag at request time.

## Adding DataForSEO later

`lib/rankings.ts` (to be added in Phase 2) exposes a `getRankings(project)`
function. Today it returns GSC data or an empty array. To add DataForSEO:

1. Set `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` in env.
2. Implement `lib/dataforseo.ts` with the SERP endpoint call.
3. In `lib/rankings.ts`, fall back to DataForSEO when GSC is not connected.

No frontend changes required — the ranking tracker UI is provider-agnostic.

## Privacy & GDPR

- **Region:** Supabase project must be created in `eu-central-1` (Frankfurt).
- **Token encryption:** GSC refresh tokens are encrypted with AES-256-GCM
  using `TOKEN_ENCRYPTION_KEY` before insert; only server has the key.
- **Retention:** audits older than 180 days are deleted by the daily cron
  (`/api/cron/cleanup-audits`). Configurable via `AUDIT_TTL_DAYS`.
- **Right to erasure:** `DELETE /api/user/data` removes all rows for the
  authenticated user (cascades via FKs).
- **Consent:** signup form includes a GSC-consent checkbox; OAuth flow only
  starts when explicitly clicked.

### GSC token storage, rotation, and revocation

- **Where:** `projects.gsc_refresh_token_enc` — AES-256-GCM ciphertext (96-bit
  IV + ciphertext + 128-bit GCM tag, base64). Generated by `lib/supabase.ts:encryptToken`.
- **Who can read:** server only. The column is explicitly revoked from the
  `anon` and `authenticated` Postgres roles in `0003_gsc_columns.sql`, so even
  a misconfigured RLS policy can't leak the column to the frontend.
- **In transit / logs:** tokens are never returned to the client (the callback
  redirects with only a status flag) and never logged. `lib/gsc.ts` sanitizes
  upstream error bodies before they reach `console.error`.
- **OAuth state:** the `state` param is HMAC-SHA256 signed with
  `OAUTH_STATE_SECRET` (separate from the encryption key) and expires after
  10 minutes — prevents CSRF and replay.
- **Rotating the encryption key:** rotating `TOKEN_ENCRYPTION_KEY` invalidates
  all stored ciphertexts. The supported path is: (1) deploy a new key, (2)
  call `POST /api/gsc/disconnect?projectId=...` for each affected project to
  clear and revoke at Google, (3) ask the user to re-connect. A migration
  helper (re-encrypt with old key → new key) is a Phase-2 task.
- **Revoking a user's access:** `POST /api/gsc/disconnect?projectId=...` calls
  `https://oauth2.googleapis.com/revoke` (best-effort) and hard-deletes the
  encrypted token + property URL from the project row. Users can additionally
  revoke at https://myaccount.google.com/permissions.

### AVV / DPA template (suggested wording)

> Im Rahmen der Nutzung von climbr.io werden personenbezogene Daten gemäß
> Art. 28 DSGVO im Auftrag des Verantwortlichen verarbeitet. Auftragsverarbeiter
> sind: Supabase (EU/Frankfurt), Vercel (EU), OpenAI (US — Standardvertrags-
> klauseln). Eine vollständige AVV wird auf Anfrage ausgehändigt.

## Microcopy

| Slot                  | EN                                                                   | DE                                                                |
| --------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Hero headline         | SEO audit in 60 seconds                                              | SEO-Audit in 60 Sekunden                                          |
| Hero CTA              | Run free audit                                                       | Kostenloses Audit starten                                         |
| Loading state         | Checking your site (may take 30–90s) — grab a coffee ☕              | Wir prüfen deine Seite (30–90s) — Zeit für einen Kaffee ☕         |
| Email prompt          | Almost done — enter your email to get the full report                | Fast geschafft — gib deine E-Mail ein, um den vollen Report zu sehen |

## Color palette

- Primary Blue: `#2B8AF3`
- Sunset Accent: `#FF8A4B`
- Ink (text): `#0F172A`
- Slate (muted): `#64748B`
- Surface: `#F8FAFC`

## Deploy

```sh
vercel link
vercel env pull
vercel --prod
```

Set the same env vars in the Vercel dashboard. The cron jobs in `vercel.json`
will start running on first deploy.

## CI

GitHub Actions on PR runs:
- TypeScript build (`tsc --noEmit`) on both packages
- `vitest run` for unit + integration tests

See `.github/workflows/ci.yml`.
