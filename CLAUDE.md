# climbr.io — Context for Claude sessions

Quick-reference for future Claude sessions. Source of truth is the code; this
file is a map. If it disagrees with the code, the code wins — fix this file.

Last synced against branch `claude/sync-docs-codebase-2Zjmq` on 2026-05-14.

## §Stack

- **Frontend:** Vite + React + TypeScript + TailwindCSS (`frontend/`)
- **Backend:** Vercel serverless functions, **Node runtime** (`api/`) — note: not Edge, despite README copy that still says "edge". Every handler exports `config = { runtime: "nodejs" }`; `api/audit/run.ts` additionally sets `maxDuration: 60`.
- **DB / Auth:** Supabase (EU, `eu-central-1` / Frankfurt). Server uses service-role; client uses anon key + user JWT with RLS.
- **AI:** OpenAI (`OPENAI_MODEL`, default `gpt-4o`). Mocked by default (`USE_MOCK_AI=true`).
- **Rankings:** Google Search Console OAuth → Search Analytics API. Refresh tokens AES-256-GCM-encrypted at rest.
- **Cron:** Vercel cron (`vercel.json`) → daily 03:00 rankings, 04:00 cleanup.
- **Local dev:** `node scripts/dev.mjs` runs vite + a direct node API server side-by-side (replaces `vercel dev`, which was unreliable). `npm run dev:api-only` still uses `vercel dev`.

## §Projektstruktur

```
.
├── api/                          # Vercel functions (Node runtime)
│   ├── audit/run.ts              # POST  — run an audit (anon or authed)
│   ├── audit/[id].ts             # GET   — fetch audit + AI report
│   ├── projects.ts               # GET/POST — list / create project (+ initial keywords)
│   ├── rankings/track.ts         # POST/DELETE — add/remove tracked keyword
│   ├── notifications.ts          # GET/POST — list unseen / mark seen
│   ├── gsc/connect.ts            # POST  — start OAuth (returns authorizeUrl)
│   ├── gsc/callback.ts           # GET   — OAuth callback (browser redirect target)
│   ├── gsc/disconnect.ts         # POST  — revoke + clear token
│   ├── cron/daily-rankings.ts    # GSC pull + diff → notifications
│   ├── cron/cleanup-audits.ts    # 180-day TTL + 24h anon-log prune
│   └── health.ts                 # liveness + DB ping
├── lib/                          # Server shared code
│   ├── crawl.ts                  # HTML → SEO signals + heuristic score
│   ├── ai.ts                     # OpenAI client + prompt + mock report
│   ├── supabase.ts               # service-role client + AES-256-GCM token enc/dec
│   ├── ratelimit.ts              # anon IP rate limit via anon_audit_log
│   ├── auth.ts                   # requireAuth(req, db) → { userId, plan }
│   ├── plans.ts                  # Plan limits table (SOURCE OF TRUTH for limits)
│   ├── gsc.ts                    # OAuth state HMAC + token exchange + sites + position
│   └── validation.ts             # zod schemas + json/badRequest/serverError helpers
├── frontend/src/
│   ├── pages/                    # Landing, Login, Signup, Dashboard, ProjectNew, ProjectDetail, AuditReport, Pricing
│   ├── components/               # FixCard, Sparkline, Tabs, Toast, EmailCaptureModal, project/*
│   └── lib/                      # api.ts (client), supabase.ts, useSession.ts
├── infra/supabase/migrations/    # 0001_init.sql, 0002_rls.sql, 0003_gsc_columns.sql
├── ci/mocks/                     # openai-response.json, gsc-rankings.json (for smoke)
├── tests/                        # vitest (unit + integration) + tests/smoke.spec.ts (Playwright)
├── scripts/                      # dev.mjs, seed.ts, get-magic-link.ts
├── vercel.json                   # crons + build/rewrites; devCommand is a no-op
├── playwright.config.ts          # auto-starts `vite preview` on :4173
└── package.json                  # root = backend; frontend has its own package.json
```

> The Vercel build command is `cd frontend && npm install && npm run build`;
> the root `package.json` is the "backend" workspace. `outputDirectory` is
> `frontend/dist`. SPA rewrites send everything not under `/api/` to
> `/index.html`.

## §Env

Single file at repo root (`.env.local`, copied from `.env.example`). Vite reads
it via `envDir: ".."` so `VITE_*` vars reach the browser.

| Var | Used by | Required? | Notes |
| --- | --- | --- | --- |
| `USE_MOCK_AI` | `lib/ai.ts` | no (default `true`) | Set `false` to call OpenAI. |
| `NODE_ENV` | misc | no | |
| `SUPABASE_URL` | server | real mode | |
| `SUPABASE_ANON_KEY` | server (validation only) | real mode | |
| `SUPABASE_SERVICE_ROLE_KEY` | server | real mode | **never expose to client** |
| `VITE_SUPABASE_URL` | client | real mode | |
| `VITE_SUPABASE_ANON_KEY` | client | real mode | |
| `OPENAI_API_KEY` | `lib/ai.ts` | only if `USE_MOCK_AI=false` | |
| `OPENAI_MODEL` | `lib/ai.ts` | no (default `gpt-4o`) | |
| `GSC_CLIENT_ID` | `lib/gsc.ts` | for GSC OAuth | |
| `GSC_CLIENT_SECRET` | `lib/gsc.ts` | for GSC OAuth | |
| `GSC_REDIRECT_URI` | `lib/gsc.ts` | for GSC OAuth | default `http://localhost:3000/api/gsc/callback` |
| `TOKEN_ENCRYPTION_KEY` | `lib/supabase.ts` | for GSC | 32-byte hex; AES-256-GCM key for refresh-token enc. Rotating invalidates all stored ciphertexts. |
| `OAUTH_STATE_SECRET` | `lib/gsc.ts` | for GSC | 32-byte hex; HMAC-SHA256 for OAuth `state`. 10-min TTL. |
| `SMTP_URL` | (planned) | no | not wired yet |
| `AUDIT_TTL_DAYS` | `api/cron/cleanup-audits.ts` | no (default `180`) | |
| `ANON_AUDITS_PER_IP_PER_HOUR` | `lib/ratelimit.ts` | no (default `5`) | |
| `FREE_AUDITS_PER_MONTH` | declared in `.env.example` | **unused at runtime** | superseded by `lib/plans.ts`; safe to drop. |
| `FREE_TRACKED_KEYWORDS` | declared in `.env.example` | **unused at runtime** | superseded by `lib/plans.ts`; safe to drop. |
| `CRON_LOCAL` | `api/cron/daily-rankings.ts` | no | local-test escape hatch |
| `CODESPACES` | `frontend/vite.config.ts` | no | switches HMR to wss/443 |

## §Plan-Limits

Source of truth: `lib/plans.ts`. Keep `frontend/src/pages/Pricing.tsx` in sync.

| Plan    | `keywords` (per project) | `auditsPerMonth` |
| ------- | ------------------------ | ---------------- |
| free    | 5                        | 3                |
| starter | 25                       | 30               |
| pro     | 100                      | 1000             |

- Plan is stored on `public.users.plan` (`text`, check-constrained to the three values, default `'free'`).
- `normalizePlan(unknown)` coerces any unknown value to `'free'`.
- Limit breaches return **HTTP 402** with body shape `planLimitError(...)` — `{ error: { code: "PLAN_LIMIT_REACHED", message, limit, current, plan, resource } }`. Frontend switches on `code` to show the upgrade CTA.
- Enforced in `api/projects.ts` (keywords) and `api/rankings/track.ts` (keywords). Audits-per-month is **not yet enforced** — TODO at the audit/run boundary.

### Anonymous limits (no plan)

- `ANON_AUDITS_PER_IP_PER_HOUR` (default **5**) — rolling 1h window on `public.anon_audit_log`. Fails open on infra error.
- Audit input ceiling: `keywords` array at create-project capped at **20** (hard, pre-plan-check).

## §Schema

Migrations in `infra/supabase/migrations/` — apply via `supabase db push` (remote) or `supabase db reset` (local). All tables in `public`. Auth in `auth.users` (managed by Supabase).

```
auth.users (Supabase managed)
└──▶ public.users      (id PK = auth.users.id; email, plan, locale, created_at)
     trigger on_auth_user_created → handle_new_user() inserts users + settings rows
└──▶ public.settings   (user_id PK; email_notifications, locale)

public.projects        (id, user_id→users, domain, gsc_connected, gsc_refresh_token_enc,
                        gsc_site_url, gsc_property_uri, gsc_connected_at, created_at)
  ├──▶ public.audits           (id, project_id?, capture_email?, url, raw_crawl_json,
  │                              ai_report_json, score 0-100, status, error, created_at)
  │                              status ∈ pending|crawling|analyzing|complete|failed
  │                              project_id NULL = anonymous quick-audit pre-signup
  ├──▶ public.keywords         (id, project_id, keyword, created_at; UNIQUE(project_id, keyword))
  ├──▶ public.rankings         (id, project_id, keyword, position int|null, recorded_at)
  └──▶ public.notifications    (id, project_id, keyword, old_position, new_position, seen, created_at)

public.anon_audit_log  (id, ip, url, created_at)   -- rate-limit ledger; pruned at 24h
```

### RLS (0002_rls.sql)

RLS **enabled** on every table above. Service role bypasses; the frontend uses anon key + user JWT.

- `users`, `settings`: self-only (select/update where `auth.uid() = id`/`= user_id`).
- `projects`: owner all-ops via `user_id = auth.uid()`.
- `audits`: owner-via-project select **only**; writes go through service role. `project_id IS NULL` audits are world-readable by primary key (anon quick-audit flow gates by `capture_email` in code, not RLS).
- `keywords`: owner all-ops via project.
- `rankings`, `notifications`: owner select; `notifications` also has owner update (for `seen`).
- `projects.gsc_refresh_token_enc` column-level: `SELECT` **revoked** from `anon` + `authenticated` (defense in depth — even a broken policy can't leak it).

## §API-Endpoints

All under `/api/`, all Node runtime. Auth = `Authorization: Bearer <supabase JWT>` unless noted.

| Method | Path | Auth | Body / Query | Notes |
| ------ | ---- | ---- | ------------ | ----- |
| POST | `/api/audit/run` | optional | `{ url, email?, projectId?, locale? }` | `maxDuration: 60`. Hard 20s crawl timeout. Anon rate-limited per IP. Returns `{ id, status, score, ... }`. |
| GET | `/api/audit/[id]` | conditional | `?email=…` if anon | Owner check in code: project audit → JWT; anon audit → `email == capture_email`. |
| GET | `/api/projects` | required | — | List caller's projects. |
| POST | `/api/projects` | required | `CreateProjectInput` (domain + keywords[]) | Atomic create + initial keywords. Plan check on keywords → 402. |
| POST | `/api/rankings/track` | required | `{ projectId, keyword }` | Plan check on keyword count → 402. |
| DELETE | `/api/rankings/track` | required | `?id=<keywordId>` | Verifies project ownership. |
| GET | `/api/notifications` | required | — | Unseen only, last 100, `created_at desc`. |
| POST | `/api/notifications` | required | `{ ids: uuid[] }` | Marks seen. Max 100 IDs. |
| POST/GET | `/api/gsc/connect` | required | `?projectId=…` | Returns `{ authorizeUrl }`. State HMAC-signed, 10-min TTL. |
| GET | `/api/gsc/callback` | (state-bound) | `?code=…&state=…` | Exchanges code, encrypts refresh, redirects to `/dashboard?gsc=...`. Never returns tokens. |
| POST | `/api/gsc/disconnect` | required | `?projectId=…` | Best-effort Google `revoke` + clears DB columns. |
| GET/POST | `/api/cron/daily-rankings` | Vercel cron | — | 03:00 UTC daily. Per-project GSC pull; ≥3-position delta → notification. |
| any | `/api/cron/cleanup-audits` | Vercel cron | — | 04:00 UTC daily. Deletes audits older than `AUDIT_TTL_DAYS`; prunes `anon_audit_log` >24h. |
| GET | `/api/health` | none | — | `{ ok, time, mode, db }`, 503 on DB failure. |

### Standard error shapes

- 400: `{ error: { message, details? } }`
- 401: `{ error: { code: "AUTH_REQUIRED" \| "INVALID_TOKEN", message } }`
- 402: `{ error: { code: "PLAN_LIMIT_REACHED", message, limit, current, plan, resource } }`
- 403 / 404 / 405 / 429 / 500: `{ error: { message } }`

## §Auth & GSC

- Login = Supabase magic link (`scripts/get-magic-link.ts` for manual QA). After login the client redirects to `/dashboard` (see `ce9530f`).
- `lib/auth.ts:requireAuth(req, db)` is the canonical entry: returns `{ userId, plan }` or an error `Response` — callers do `if (ctx instanceof Response) return ctx`.
- GSC OAuth state is HMAC-SHA256 with `OAUTH_STATE_SECRET`, encodes `{ projectId, userId, exp }`, 10-min TTL.
- Refresh tokens: AES-256-GCM (`TOKEN_ENCRYPTION_KEY`), stored as base64(IV‖ciphertext‖tag) in `projects.gsc_refresh_token_enc`. Never logged, never returned to the browser. Rotating the key invalidates all stored ciphertexts — re-encrypt migration is Phase 2.

## §Dev commands

```
npm run dev               # vite + node api server (scripts/dev.mjs) — preferred
npm run dev:api-only      # vercel dev :3000 (fallback)
npm run dev:frontend-only # vite only

npm run build             # tsc --noEmit on root (backend typecheck)
npm run typecheck         # alias for build
npm test                  # vitest run
npm run test:e2e          # Playwright smoke (auto-starts vite preview :4173)
npm run test:e2e:ui       # Playwright UI mode

npm run seed              # creates demo@climbr.io + sample audit, prints magic-link URL
npm run magic-link -- you@example.com
```

Frontend separately: `npm --prefix frontend run dev|build|typecheck`.

## §CI / deploy

- `.github/workflows/ci.yml` — every push: backend `tsc --noEmit` + `vitest run` + frontend build (~30s).
- `.github/workflows/preview-deploy.yml` — PR: tests → build → optional Vercel preview deploy (skipped if `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` not set) → Playwright smoke against **local** `vite preview` → PR comment.
- `.github/workflows/playwright-demo.yml` — `workflow_dispatch` ad-hoc smoke.
- Smoke is hermetic: fakes Supabase session in `localStorage`, intercepts `/rest/v1/*` and `/api/*`. See `README-dev.md` for the "why local-only" rationale.

## §Gotchas

- Functions are Node, **not** Edge — README still says edge. `process.env` works because of this (see `b24b0aa`).
- `vercel dev` was unreliable in this repo → `npm run dev` now spawns vite + a direct node API server (`scripts/dev.mjs`, see `8fdf78d`).
- `.env.local` lives at repo root, **not** under `frontend/`. Vite picks `VITE_*` via `envDir: ".."`.
- Audits-per-month plan limit is **declared but not enforced** — wire it in at `api/audit/run.ts` when needed.
- `FREE_AUDITS_PER_MONTH` / `FREE_TRACKED_KEYWORDS` env vars are dead — `lib/plans.ts` is the source of truth.
- README `Repo layout` block predates `api/projects.ts`, `api/gsc/callback.ts`, `api/gsc/disconnect.ts`, `lib/plans.ts`, `lib/auth.ts`, `lib/gsc.ts`, and the `scripts/dev.mjs` change. This file is the up-to-date map.
