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

### CI

`.github/workflows/playwright-demo.yml` runs on every PR. Steps:

1. Install root + frontend deps, install Chromium.
2. **Optional**: if `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   are all set as repository secrets, deploy a Vercel preview and use
   that as `PREVIEW_URL`. Otherwise fall back to the local `vite preview`
   path (no secrets required).
3. Run `npx playwright test tests/smoke.spec.ts --project=chromium`.
4. Upload two artifacts on every run (pass or fail):
   - `playwright-report` — full HTML report (open `index.html`).
   - `smoke-screenshots` — just the four PNG screenshots for quick preview.

Use the **workflow_dispatch** trigger to point the smoke at any URL
manually (e.g. for production sanity-checks):

```
gh workflow run "Playwright Smoke + Demo Recording" -f preview_url=https://staging.climbr.io
```

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
