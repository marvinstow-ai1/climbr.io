# climbr.io — Developer Notes

Companion to the user-facing README. Covers the smoke / E2E setup and CI
behavior.

## Playwright smoke

End-to-end smoke test at `tests/smoke.spec.ts`. Walks: create project →
fill keywords → run audit → see audit row → switch to Rankings tab → see
keywords + sparklines. Captures four screenshots into
`playwright-report/screenshots/`.

### What's mocked

The smoke is fully self-contained: **no Supabase, no OpenAI, no Vercel
credentials required.**

- A fake Supabase session is written to `localStorage` via
  `page.addInitScript` so the app boots authenticated.
- `**/rest/v1/**` (Supabase REST) is intercepted with `page.route` and
  served from an in-memory mock store.
- `**/api/audit/run`, `**/api/projects`, `**/api/rankings/track` and
  `**/api/notifications` are intercepted and mutate the same store. The
  audit response is the canned payload from
  `ci/mocks/openai-response.json`. Sparkline history comes from
  `ci/mocks/gsc-rankings.json`.

Real Supabase URL placeholders (`VITE_SUPABASE_URL=http://localhost:54321`)
are used at build time so the Supabase JS client picks the expected
`sb-localhost-auth-token` storage key.

### Run locally

One-time setup:

```sh
npm install                              # root deps (Playwright + tooling)
npm install --prefix frontend            # frontend deps
npx playwright install --with-deps chromium
```

Run the smoke:

```sh
npm run test:e2e                         # headless
npm run test:e2e:ui                      # Playwright UI (interactive)
```

The Playwright config auto-starts `vite preview` on port 4173 with the
build env baked in. Set `PREVIEW_URL` to skip the local server and run
against a remote URL:

```sh
PREVIEW_URL=https://my-pr-preview.vercel.app npm run test:e2e
```

After a run, the HTML report is at `playwright-report/index.html` and
screenshots at `playwright-report/screenshots/*.png`. Useful for the demo
recording — the four PNGs cover the full create→audit→rankings loop.

### CI workflows

Two workflows, separate triggers:

| File                                       | Trigger              | Purpose                                                                 |
| ------------------------------------------ | -------------------- | ----------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                 | every push           | Backend `tsc --noEmit` + `vitest run` + frontend build. ~30 s.          |
| `.github/workflows/preview-deploy.yml`     | `pull_request`       | Full pipeline: tests → build → Vercel preview deploy → smoke → PR comment. |
| `.github/workflows/playwright-demo.yml`    | `workflow_dispatch`  | Ad-hoc smoke against an arbitrary URL (staging, prod).                  |

**`preview-deploy.yml`** is the headline PR workflow. Steps:

1. Install root + frontend deps.
2. Backend typecheck + vitest.
3. Frontend build.
4. **Optional** Vercel preview deploy — skipped when secrets aren't set.
5. Playwright smoke against a **local** `vite preview` (always, regardless
   of the Vercel step — see "Why local-only" below).
6. Upload `playwright-report/` + `smoke-screenshots/` artifacts.
7. Post (or update) one PR comment with the preview URL + artifact links.

**Why the smoke runs against the local preview, not the Vercel one**

The smoke depends on:
- A fake Supabase session injected into `localStorage` under the key
  `sb-localhost-auth-token`. Real Vercel previews would derive a
  different key from the project's actual `VITE_SUPABASE_URL`.
- `page.route` interception of `/rest/v1/*` and the app's `/api/*`. A
  real preview makes these requests to a real backend; intercepting them
  defeats the point of deploying.

So: the smoke verifies **frontend ↔ frontend-API contract** in isolation.
The Vercel preview URL is for **humans** to click through manually.

If you need an automated smoke against a real backend, that's a separate
Phase-2 work item (test-mode auth bypass + real Supabase test project).

**Manual smoke against a specific URL**

```sh
gh workflow run "Playwright Smoke (manual)" -f preview_url=https://staging.climbr.io
```

Pointed at a non-local URL, the smoke will still inject the fake session
and intercept routes — useful only if the target uses the same Supabase
URL prefix as the local build.

### Required secrets (optional path only)

| Secret                | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `VERCEL_TOKEN`        | Authorize the `vercel deploy` step                    |
| `VERCEL_ORG_ID`       | Picked up by `vercel pull` to identify the org        |
| `VERCEL_PROJECT_ID`   | Picked up by `vercel pull` to identify the project    |

All three must be set together. Missing any one skips the deploy and
falls back to the local-preview path.

### Adding new mock data

- Audit shape: extend `ci/mocks/openai-response.json` to match the
  `AuditPreview` type from `frontend/src/lib/api.ts`.
- Ranking history: append entries to `ci/mocks/gsc-rankings.json`. The
  smoke spec's `seedRankings()` reads `positions` chronologically and
  attaches one ranking row per day.

If you add new app API endpoints that the smoke flow touches, intercept
them inside `setupMocks()` in `tests/smoke.spec.ts`. Use the existing
`/api/projects` handler as a template.

### Recording a demo GIF/MP4

Re-run the smoke with video on:

```sh
PWVIDEO=on npm run test:e2e
# or simply
CI=true npm run test:e2e        # the config enables retain-on-failure video in CI
```

Playwright writes a `.webm` per test under `test-results/`. Convert to
GIF with:

```sh
ffmpeg -i test-results/<run>/video.webm -vf "fps=15,scale=900:-1" demo.gif
```

For a hand-narrated Loom-style recording, follow the demo script in
`docs/demo-script.md` (TBD) and record the screen manually.

## Other helpful commands

```sh
npm run typecheck                 # backend tsc --noEmit
npm test                          # vitest run (unit + integration)
npm run typecheck --prefix frontend
npm run build --prefix frontend
```
