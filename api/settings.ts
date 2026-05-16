/**
 * GET /api/settings — Account-Übersicht für die Einstellungen-Seite.
 *
 * Liefert Profil (E-Mail), aktuellen Plan + Limits, aktuelle Verbrauchs-
 * werte (Anzahl Projekte, Audits diesen Monat) und die Benachrichtigungs-
 * einstellungen. Die `settings`-Tabelle existiert bereits seit
 * 0001_init.sql — keine neue Migration nötig.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { serverClient } from "../lib/supabase.js";
import { requireAuth } from "../lib/auth.js";
import { limitsFor } from "../lib/plans.js";
import { json } from "../lib/validation.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }

  const db = serverClient();
  const ctx = await requireAuth(req, db);
  if (ctx instanceof Response) return ctx;

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

