// GET  /api/settings/notifications — load the caller's notification settings.
// POST /api/settings/notifications — update threshold / frequency / per-project overrides.

import { serverClient } from "../../lib/supabase.js";
import { NotificationSettingsInput, badRequest, json } from "../../lib/validation.js";
import { requireAuth } from "../../lib/auth.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  if (req.method === "GET") {
    const { data: settings } = await db
      .from("settings")
      .select("email_notifications, ranking_threshold, notification_frequency")
      .eq("user_id", ctx.userId)
      .maybeSingle();
    const { data: projects } = await db
      .from("projects")
      .select("id, domain, notification_threshold")
      .eq("user_id", ctx.userId);
    return json({
      settings: settings ?? {
        email_notifications: true,
        ranking_threshold: 3,
        notification_frequency: "daily",
      },
      projects: projects ?? [],
    });
  }

  if (req.method !== "POST") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("invalid JSON body"); }
  const parsed = NotificationSettingsInput.safeParse(body);
  if (!parsed.success) return badRequest("invalid input", parsed.error.flatten());

  const updates: Record<string, unknown> = {};
  if (parsed.data.rankingThreshold != null) updates.ranking_threshold = parsed.data.rankingThreshold;
  if (parsed.data.notificationFrequency) updates.notification_frequency = parsed.data.notificationFrequency;
  if (typeof parsed.data.emailNotifications === "boolean") updates.email_notifications = parsed.data.emailNotifications;

  if (Object.keys(updates).length > 0) {
    const { error } = await db
      .from("settings")
      .update(updates)
      .eq("user_id", ctx.userId);
    if (error) return json({ error: { message: error.message } }, { status: 500 });
  }

  if (parsed.data.projectThresholds) {
    for (const row of parsed.data.projectThresholds) {
      const { error } = await db
        .from("projects")
        .update({ notification_threshold: row.threshold })
        .eq("id", row.projectId)
        .eq("user_id", ctx.userId);
      if (error) return json({ error: { message: error.message } }, { status: 500 });
    }
  }

  return json({ ok: true });
}
