// Seed: creates a demo user, a project, and a sample audit (with mocked AI).
// Run: `npm run seed`. Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from
// .env.local (auto-loaded). At the end, prints a one-click magic-link URL so
// you can sign in as the demo user without SMTP.
//
// Idempotent: re-runs delete the previous demo rows before inserting fresh ones.

try { process.loadEnvFile?.(".env.local"); } catch { /* file missing — that's fine */ }

import { serverClient } from "../lib/supabase.js";
import { crawlUrl } from "../lib/crawl.js";
import { analyze } from "../lib/ai.js";

const DEMO_EMAIL = "demo@climbr.io";
const DEMO_URL = "https://example.com/";

async function main() {
  process.env.USE_MOCK_AI = process.env.USE_MOCK_AI ?? "true";
  const db = serverClient();

  // 1) Ensure auth user exists.
  const { data: existing } = await db.auth.admin.listUsers();
  let user = existing.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email: DEMO_EMAIL,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user!;
  }
  console.log("user:", user.id);

  // 2) Project.
  await db.from("projects").delete().eq("user_id", user.id);
  const { data: project, error: pErr } = await db
    .from("projects")
    .insert({ user_id: user.id, domain: "example.com" })
    .select()
    .single();
  if (pErr) throw pErr;
  console.log("project:", project.id);

  // 3) Sample audit (real crawl + mock AI).
  const crawl = await crawlUrl(DEMO_URL);
  const report = await analyze({ crawl, locale: "en" });
  const { data: audit, error: aErr } = await db
    .from("audits")
    .insert({
      project_id: project.id,
      url: DEMO_URL,
      raw_crawl_json: crawl,
      ai_report_json: report,
      score: report.score,
      status: "complete",
    })
    .select()
    .single();
  if (aErr) throw aErr;
  console.log("audit:", audit.id, "score:", report.score);

  // 4) Sample keywords.
  await db.from("keywords").delete().eq("project_id", project.id);
  await db.from("keywords").insert([
    { project_id: project.id, keyword: "leather backpack" },
    { project_id: project.id, keyword: "handmade wallet" },
  ]);

  // 5) Generate a magic-link URL so the user can sign in without SMTP.
  const { data: link } = await db.auth.admin.generateLink({
    type: "magiclink",
    email: DEMO_EMAIL,
  });

  console.log("\nSeed complete.");
  console.log("Anonymous audit view: /audit/" + audit.id + "?email=" + DEMO_EMAIL);
  if (link.properties?.action_link) {
    console.log("\nSign in as " + DEMO_EMAIL + ":");
    console.log(link.properties.action_link);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
