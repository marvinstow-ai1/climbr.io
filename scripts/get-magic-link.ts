// Generate a magic-link URL for a Supabase user without sending email.
// Useful for local dev / manual QA when SMTP isn't set up.
//
// Usage:
//   npm run magic-link                              # demo@climbr.io
//   npm run magic-link -- you@example.com
//
// Reads .env.local automatically. Requires SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY to be set there.
//
// The user is created on first run (email_confirm: true). Subsequent runs
// just generate a new login link for the existing user.

// Load .env.local before importing anything that touches process.env.
// Node 20.12+ has loadEnvFile built in; older Node returns undefined and
// the script just relies on whatever's already exported.
try { process.loadEnvFile?.(".env.local"); } catch { /* file missing — that's fine */ }

import { serverClient } from "../lib/supabase.js";

const email = process.argv[2] ?? "demo@climbr.io";

async function main() {
  const db = serverClient();

  // Ensure the user exists. createUser with email_confirm bypasses the
  // "confirm your email" flow that would otherwise block sign-in.
  const { data: list } = await db.auth.admin.listUsers();
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user!;
    console.error(`Created auth user: ${user.id}`);
  } else {
    console.error(`Found existing auth user: ${user.id}`);
  }

  // generateLink returns the action_link the user would click in their
  // inbox. We never actually send the email.
  const { data, error } = await db.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;
  const link = data.properties?.action_link;
  if (!link) {
    throw new Error("generateLink succeeded but action_link was empty");
  }

  console.log(link);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
