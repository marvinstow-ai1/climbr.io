/**
 * PATCH /api/settings/notifications — toggelt email_notifications für
 * den aktuellen User.
 */

import { z } from "zod";
import { serverClient } from "../../lib/supabase.js";
import { requireAuth } from "../../lib/auth.js";
import { badRequest, json } from "../../lib/validation.js";

export const config = { runtime: "nodejs" };

const Input = z.object({
  email_notifications: z.boolean(),
});

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "PATCH") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }

  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid JSON body");
  }
  const parsed = Input.safeParse(body);
  if (!parsed.success) return badRequest("invalid input", parsed.error.flatten());

  // Upsert defensively — the trigger creates a settings row on signup,
  // but older accounts created before that trigger ran might be missing it.
  const { error } = await db
    .from("settings")
    .upsert(
      { user_id: ctx.userId, email_notifications: parsed.data.email_notifications },
      { onConflict: "user_id" },
    );
  if (error) return json({ error: { message: error.message } }, { status: 500 });

  return json({ email_notifications: parsed.data.email_notifications });
}
