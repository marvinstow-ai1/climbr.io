/**
 * /api/settings — Account-Endpoint (kombiniert auf einer Vercel-Function).
 *
 *   GET   /api/settings                 -> Profil + Plan + Verbrauch + Notifications
 *   PATCH /api/settings/notifications   -> togelt email_notifications
 *
 * Die `/notifications`-URL wird per `vercel.json`-rewrite auf diese Function
 * geroutet, dispatched wird über Methode + Pfad. So bleibt die öffentliche
 * URL stabil, ohne dass wir am Hobby-Plan-Function-Limit anschlagen.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { serverClient } from "../lib/supabase.js";
import { requireAuth } from "../lib/auth.js";
import { safeHandler } from "../lib/safeHandler.js";
import { limitsFor } from "../lib/plans.js";
import { badRequest, json } from "../lib/validation.js";

export const config = { runtime: "nodejs" };

const NotificationsInput = z.object({
  email_notifications: z.boolean(),
});

async function _handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const sub = url.searchParams.get("_sub");
  const isNotifications = sub === "notifications" || url.pathname.endsWith("/notifications");

  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

  if (isNotifications) {
    if (req.method !== "PATCH") {
      return json({ error: { message: "method not allowed" } }, { status: 405 });
    }
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("invalid JSON body"); }
    const parsed = NotificationsInput.safeParse(body);
    if (!parsed.success) return badRequest("invalid input", parsed.error.flatten());

    const { error } = await db
      .from("settings")
      .upsert(
        { user_id: ctx.userId, email_notifications: parsed.data.email_notifications },
        { onConflict: "user_id" },
      );
    if (error) return json({ error: { message: error.message } }, { status: 500 });
    return json({ email_notifications: parsed.data.email_notifications });
  }

  if (req.method !== "GET") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }

  const limits = limitsFor(ctx.plan);

  const [userRow, settingsRow, projectsCount, auditsThisMonth] = await Promise.all([
    db.from("users").select("email").eq("id", ctx.userId).maybeSingle(),
    db.from("settings").select("email_notifications, locale").eq("user_id", ctx.userId).maybeSingle(),
    db.from("projects").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId),
    countAuditsThisMonth(db, ctx.userId),
  ]);

  return json({
    profile: {
      email: userRow.data?.email ?? null,
    },
    plan: {
      name: ctx.plan,
      limits: {
        keywords: limits.keywords,
        auditsPerMonth: limits.auditsPerMonth,
      },
    },
    usage: {
      projects: projectsCount.count ?? 0,
      auditsThisMonth,
    },
    notifications: {
      email_notifications: settingsRow.data?.email_notifications ?? true,
    },
  });
}

async function countAuditsThisMonth(db: SupabaseClient, userId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const { count } = await db
    .from("audits")
    .select("id, projects!inner(user_id)", { count: "exact", head: true })
    .eq("projects.user_id", userId)
    .gte("created_at", start.toISOString());
  return count ?? 0;
}

export default safeHandler("api/settings", _handler);

