/**
 * End-to-end smoke: create project -> run audit -> view rankings.
 *
 * The backend is fully mocked via `page.route` so the test is deterministic
 * and runs without Supabase / OpenAI / Vercel keys. We:
 *   1. Inject a fake Supabase session into localStorage so the app boots
 *      "logged in" (the `sb-localhost-auth-token` key is what the Supabase
 *      JS client looks for when VITE_SUPABASE_URL points at localhost).
 *   2. Intercept `/rest/v1/*` to back project/audit/keyword/ranking reads
 *      with an in-memory mock store.
 *   3. Intercept the app's edge functions (`/api/projects`, `/api/audit/run`,
 *      `/api/rankings/track`) to mutate the mock store + return canned
 *      payloads (see ci/mocks/openai-response.json).
 *
 * Screenshots are saved to `playwright-report/screenshots/` and bundled into
 * the artifact uploaded by the CI workflow.
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = "playwright-report/screenshots";

// Playwright runs tests from the repo root; use that anchor instead of
// __dirname/import.meta.url (both are awkward under our "type": "module" setup).
const REPO_ROOT = process.cwd();
const openaiMock = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "ci/mocks/openai-response.json"), "utf-8"),
);
const gscMock = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "ci/mocks/gsc-rankings.json"), "utf-8"),
) as { keywords: { keyword: string; positions: number[] }[] };

const TEST_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "tester@climbr.io",
};

const TEST_PROJECT_ID = "00000000-0000-0000-0000-0000000000aa";
const TEST_AUDIT_ID = openaiMock.auditId as string;
const TEST_DOMAIN = "example-shop.com";
const TEST_KEYWORDS = ["red sneakers", "running shoes", "blue trainers"];

// In-memory mock state — mutated by /api/* POSTs, read back by /rest/v1/* GETs.
interface MockState {
  projects: Array<Record<string, unknown>>;
  keywords: Array<Record<string, unknown>>;
  rankings: Array<Record<string, unknown>>;
  audits: Array<Record<string, unknown>>;
  notifications: Array<Record<string, unknown>>;
}

function freshState(): MockState {
  return { projects: [], keywords: [], rankings: [], audits: [], notifications: [] };
}

function jsonRoute(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

// --- Auth injection --------------------------------------------------------

async function injectSession(page: Page) {
  // The callback below is serialized and runs in the browser context, so we
  // cast `globalThis` to bypass Node-side type-checking (no DOM lib in scope).
  await page.addInitScript((user) => {
    const session = {
      access_token: "fake-jwt-for-smoke-test",
      refresh_token: "fake-refresh",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: user.id,
        aud: "authenticated",
        role: "authenticated",
        email: user.email,
        app_metadata: { provider: "email" },
        user_metadata: {},
        identities: [],
        created_at: new Date().toISOString(),
      },
    };
    // The Supabase JS client v2 derives storageKey from VITE_SUPABASE_URL's
    // host. http://localhost:54321 -> "localhost" -> key below.
    (globalThis as unknown as { localStorage: { setItem: (k: string, v: string) => void } })
      .localStorage.setItem("sb-localhost-auth-token", JSON.stringify(session));
  }, TEST_USER);
}

// --- Route handlers --------------------------------------------------------

async function setupMocks(page: Page, state: MockState) {
  // Supabase auth user endpoint — called occasionally by the client.
  await page.route("**/auth/v1/user**", (route) =>
    jsonRoute(route, { id: TEST_USER.id, email: TEST_USER.email, aud: "authenticated", role: "authenticated" }),
  );

  // Generic Supabase REST handler. The client embeds the table in the path and
  // the filters in query string. We switch on the table only — the filters are
  // applied as a best-effort with our `applyFilters` helper.
  await page.route("**/rest/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.replace(/^.*\/rest\/v1\//, "").split("?")[0]!.split("/")[0]!;
    const method = route.request().method();

    // Some endpoints get hit by other paths (e.g. `rpc/...`) — pass them.
    const known = [
      "projects", "audits", "keywords", "rankings", "notifications", "users",
      "keyword_research", "competitor_analysis", "dashboard_snapshots", "traffic_history",
      "settings",
    ];
    if (!known.includes(table)) {
      return jsonRoute(route, []);
    }

    const tableState = (state as unknown as Record<string, Array<Record<string, unknown>>>)[table] ?? [];
    if (method === "GET") {
      return jsonRoute(route, applyFilters(tableState, url.searchParams));
    }
    if (method === "POST") {
      // Supabase REST inserts come this way; our app POSTs via /api/* though,
      // so this is just a safe fallback.
      const payload = JSON.parse((route.request().postData() ?? "[]"));
      const rows = Array.isArray(payload) ? payload : [payload];
      tableState.push(...rows);
      return jsonRoute(route, rows, 201);
    }
    if (method === "PATCH") {
      // Used by notifications "mark seen" when going through Supabase client
      // (we proxy via /api/notifications, but support both).
      return jsonRoute(route, [], 200);
    }
    if (method === "DELETE") {
      return jsonRoute(route, [], 204);
    }
    return jsonRoute(route, []);
  });

  // App edge functions.
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() === "GET") {
      return jsonRoute(route, { projects: state.projects });
    }
    const body = JSON.parse(route.request().postData() ?? "{}") as {
      domain: string;
      keywords?: string[];
    };
    const project = {
      id: TEST_PROJECT_ID,
      user_id: TEST_USER.id,
      domain: body.domain,
      gsc_connected: false,
      gsc_connected_at: null,
      created_at: new Date().toISOString(),
    };
    state.projects.push(project);
    const keywords = (body.keywords ?? []).map((k, i) => ({
      id: `00000000-0000-0000-0000-${String(i).padStart(12, "k")}`,
      project_id: project.id,
      keyword: k,
      created_at: new Date().toISOString(),
    }));
    state.keywords.push(...keywords);
    // Seed mock ranking history so the sparkline has something to draw.
    seedRankings(state, project.id, keywords.map((k) => k.keyword as string));
    return jsonRoute(route, { project, keywords }, 201);
  });

  await page.route("**/api/audit/run", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as { url: string; projectId?: string };
    const audit = {
      id: TEST_AUDIT_ID,
      project_id: body.projectId ?? null,
      url: body.url,
      status: "complete",
      score: openaiMock.score,
      raw_crawl_json: {},
      ai_report_json: { ...openaiMock.preview, score: openaiMock.score, model: "mock", generatedAt: new Date().toISOString() },
      capture_email: null,
      created_at: new Date().toISOString(),
      error: null,
    };
    state.audits.push(audit);
    return jsonRoute(route, openaiMock);
  });

  await page.route("**/api/rankings/track", async (route) => {
    if (route.request().method() === "DELETE") return jsonRoute(route, { ok: true });
    const body = JSON.parse(route.request().postData() ?? "{}") as { projectId: string; keyword: string };
    const id = `00000000-0000-0000-0000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`;
    const row = { id, project_id: body.projectId, keyword: body.keyword, created_at: new Date().toISOString() };
    state.keywords.push(row);
    seedRankings(state, body.projectId, [body.keyword]);
    return jsonRoute(route, row, 201);
  });

  await page.route("**/api/notifications", (route) => jsonRoute(route, { notifications: state.notifications }));

  // Phase 2 mocks — deterministic fake responses so the new pages render.
  await page.route("**/api/keywords/research", async (route) => {
    if (route.request().method() === "GET") return jsonRoute(route, { items: [] });
    const body = JSON.parse(route.request().postData() ?? "{}") as { keyword: string };
    return jsonRoute(route, {
      id: "00000000-0000-0000-0000-000000000aa1",
      keyword: body.keyword,
      locale: "de",
      metrics: { keyword: body.keyword, search_volume: 1200, cpc: 1.42, competition: 0.4, keyword_difficulty: 35 },
      serp: Array.from({ length: 10 }, (_, i) => ({
        position: i + 1, title: `Result ${i + 1}`, url: `https://example${i + 1}.com/`,
        domain: `example${i + 1}.com`, snippet: `Snippet ${i + 1}`,
      })),
      related: [
        { keyword: `${body.keyword} test`, search_volume: 300, cpc: 0.8, competition: 0.2, keyword_difficulty: 20 },
      ],
    });
  });

  await page.route("**/api/competitors/analyze", async (route) => {
    if (route.request().method() === "GET") return jsonRoute(route, { items: [] });
    const body = JSON.parse(route.request().postData() ?? "{}") as { domain: string };
    const snap = (d: string) => ({
      domain: d,
      overview: { domain: d, organic_keywords_count: 1000, organic_traffic: 5000, paid_traffic: 100 },
      keywords: [{ keyword: "k1", position: 3, search_volume: 1000, traffic: 200, url: `https://${d}/k1` }],
      competitors: [{ domain: `c1-${d}`, intersections: 50, organic_traffic: 8000 }],
      backlinks: { backlinks: 1000, referring_domains: 100, rank: 500 },
    });
    return jsonRoute(route, {
      id: "00000000-0000-0000-0000-000000000bb1",
      locale: "de",
      primary: snap(body.domain),
      compare: null,
    });
  });

  await page.route("**/api/dashboard/**", async (route) => {
    return jsonRoute(route, {
      snapshot: {
        project_id: TEST_PROJECT_ID,
        organic_traffic: 1000,
        organic_keywords_count: 200,
        traffic_trend: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          traffic: 1000 + i * 50,
        })),
        top_gainers: [{ keyword: "k1", old_position: 10, new_position: 4 }],
        top_losers: [{ keyword: "k2", old_position: 3, new_position: 9 }],
        competitor_moves: [{ domain: "rival.com", change: 100, traffic: 5000 }],
        refreshed_at: new Date().toISOString(),
      },
      cached: false,
    });
  });

  await page.route("**/api/settings/notifications", async (route) => {
    if (route.request().method() === "GET") {
      return jsonRoute(route, {
        settings: { email_notifications: true, ranking_threshold: 3, notification_frequency: "daily" },
        projects: state.projects.map((p) => ({ id: p.id, domain: p.domain, notification_threshold: null })),
      });
    }
    return jsonRoute(route, { ok: true });
  });
}

// Filter rows by Supabase's `?col=eq.value` syntax — covers the queries our
// app makes (eq + order). Filters we don't recognize are ignored.
function applyFilters(rows: Array<Record<string, unknown>>, params: URLSearchParams) {
  let out = [...rows];
  for (const [key, val] of params.entries()) {
    if (key === "order" || key === "select" || key === "limit") continue;
    const m = val.match(/^eq\.(.+)$/);
    if (!m) continue;
    out = out.filter((r) => String(r[key]) === m[1]);
  }
  const order = params.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    if (col) {
      const asc = dir !== "desc";
      out.sort((a, b) => {
        const av = a[col] as string | number;
        const bv = b[col] as string | number;
        return av === bv ? 0 : (av > bv ? 1 : -1) * (asc ? 1 : -1);
      });
    }
  }
  const limit = params.get("limit");
  if (limit) out = out.slice(0, Number(limit));
  return out;
}

function seedRankings(state: MockState, projectId: string, keywords: string[]) {
  const now = Date.now();
  for (const keyword of keywords) {
    const fixture = gscMock.keywords.find((k) => k.keyword === keyword);
    if (!fixture) continue;
    fixture.positions.forEach((position, i) => {
      const recorded_at = new Date(now - (fixture.positions.length - i) * 24 * 60 * 60 * 1000).toISOString();
      state.rankings.push({ project_id: projectId, keyword, position, recorded_at });
    });
  }
}

// --- Helpers ---------------------------------------------------------------

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}`, fullPage: true });
}

// --- The test --------------------------------------------------------------

test.describe("climbr.io smoke", () => {
  test("create project -> run audit -> see rankings", async ({ page }) => {
    const state = freshState();
    await injectSession(page);
    await setupMocks(page, state);

    // Helpful console output if something does fail in CI logs.
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[browser:error]", msg.text());
    });
    page.on("pageerror", (err) => console.log("[browser:pageerror]", err.message));

    // (a) Open the app.
    await page.goto("/projects/new");

    // (b) The dashboard route requires auth; the injected session should keep
    // us on /projects/new instead of redirecting to /login.
    await expect(page).toHaveURL(/\/projects\/new$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /create project/i })).toBeVisible();

    await screenshot(page, "new-project-form.png");

    // (c) Fill the form.
    await page.getByLabel(/domain/i).fill(TEST_DOMAIN);
    for (let i = 0; i < TEST_KEYWORDS.length; i++) {
      // The form starts with one input (i=0). Subsequent rows need the "Add another keyword" click.
      if (i > 0) await page.getByRole("button", { name: /add another keyword/i }).click();
      await page.getByLabel(new RegExp(`^Keyword ${i + 1}$`, "i")).fill(TEST_KEYWORDS[i]!);
    }
    await page.getByRole("button", { name: /^create project$/i }).click();

    // (d) Redirect to /projects/[id] and toast appears.
    await expect(page).toHaveURL(new RegExp(`/projects/${TEST_PROJECT_ID}$`), { timeout: 10_000 });
    await expect(page.getByText(/project created/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("heading", { name: new RegExp(TEST_DOMAIN, "i") })).toBeVisible();

    await screenshot(page, "project-page-after-create.png");

    // (e) Run a new audit from the Audits tab (it's the default tab).
    await page.getByRole("button", { name: /run new audit/i }).click();
    // Score badge appears in the audit row once /api/audit/run resolves.
    await expect(page.getByText(`${openaiMock.score}`).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/audit complete/i)).toBeVisible({ timeout: 5_000 });

    await screenshot(page, "audit-result.png");

    // (f) Rankings tab: keywords visible + at least one sparkline rendered.
    await page.getByRole("tab", { name: /rankings/i }).click();
    for (const kw of TEST_KEYWORDS) {
      await expect(page.getByText(kw, { exact: true })).toBeVisible();
    }
    // Sparkline component renders an <svg role="img" aria-label="<kw> trend">.
    const sparklines = page.locator('svg[aria-label$="trend"]');
    await expect(sparklines.first()).toBeVisible();
    expect(await sparklines.count()).toBeGreaterThanOrEqual(TEST_KEYWORDS.length);

    await screenshot(page, "rankings-tab.png");
  });

  test("keyword research page renders metrics, SERP and related", async ({ page }) => {
    const state = freshState();
    await injectSession(page);
    await setupMocks(page, state);

    await page.goto("/keywords");
    await expect(page.getByRole("heading", { name: /keyword research/i })).toBeVisible();

    await page.getByLabel(/keyword oder phrase/i).fill("leather backpack");
    await page.getByRole("button", { name: /analyse starten/i }).click();

    // Top-10 SERP entries.
    await expect(page.getByText("example1.com")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/related|verwandt/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /csv exportieren/i })).toBeVisible();

    await screenshot(page, "keyword-research.png");
  });

  test("competitors page renders domain snapshot", async ({ page }) => {
    const state = freshState();
    await injectSession(page);
    await setupMocks(page, state);

    await page.goto("/competitors");
    await expect(page.getByRole("heading", { name: /wettbewerber/i })).toBeVisible();

    await page.getByLabel(/^domain$/i).fill("example-shop.com");
    await page.getByRole("button", { name: /^analysieren$/i }).click();

    await expect(page.getByRole("heading", { name: "example-shop.com" })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/c1-example-shop\.com/)).toBeVisible();

    await screenshot(page, "competitors.png");
  });

  test("notification settings page loads + saves", async ({ page }) => {
    const state = freshState();
    await injectSession(page);
    await setupMocks(page, state);

    await page.goto("/settings/notifications");
    await expect(page.getByRole("heading", { name: /benachrichtigungs/i })).toBeVisible();
    await expect(page.getByLabel(/frequenz/i)).toBeVisible();
    await page.getByRole("button", { name: /änderungen speichern/i }).click();
    await expect(page.getByText(/gespeichert/i)).toBeVisible({ timeout: 5_000 });

    await screenshot(page, "notification-settings.png");
  });
});
