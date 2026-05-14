// Daily cron: for each project, fetch the current SERP position for every
// tracked keyword. Primary source is DataForSEO (works for any domain — no GSC
// linkage required). If a project has GSC connected, we still fall back to GSC
// when DataForSEO is unavailable so we don't lose continuity.
//
// When a position changes by >= the user's threshold (default 3 positions, or
// per-project override), we create a `notifications` row and — once per
// user-per-window — send an aggregated e-mail.

import { decryptToken, serverClient } from "../../lib/supabase.js";
import { json } from "../../lib/validation.js";
import { fetchGscPosition } from "../../lib/gsc.js";
import { fetchDomainPositionForKeyword, DataForSeoError } from "../../lib/dataforseo.js";
import { renderRankingChangeEmail, sendEmail } from "../../lib/email.js";

export const config = { runtime: "nodejs" };

const DEFAULT_DELTA = 3;
const CACHE_TTL_SECONDS = 60 * 60 * 12;

interface NotifyAccumulator {
  email: string;
  domain: string;
  rows: { keyword: string; oldPosition: number | null; newPosition: number | null }[];
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }

  const db = serverClient();
  const { data: projects, error: pErr } = await db
    .from("projects")
    .select("id, user_id, domain, gsc_connected, gsc_site_url, gsc_refresh_token_enc, notification_threshold");
  if (pErr) return json({ error: { message: pErr.message } }, { status: 500 });

  let processed = 0;
  let notifications = 0;
  let emailsSent = 0;

  const emailQueue = new Map<string, NotifyAccumulator>();
  const userSettingsCache = new Map<string, {
    email_notifications: boolean;
    ranking_threshold: number;
    notification_frequency: "daily" | "weekly" | "off";
    email: string | null;
  }>();

  async function loadUserSettings(userId: string) {
    if (userSettingsCache.has(userId)) return userSettingsCache.get(userId)!;
    const [{ data: s }, { data: u }] = await Promise.all([
      db.from("settings").select("email_notifications, ranking_threshold, notification_frequency").eq("user_id", userId).maybeSingle(),
      db.from("users").select("email").eq("id", userId).maybeSingle(),
    ]);
    const out = {
      email_notifications: s?.email_notifications ?? true,
      ranking_threshold: s?.ranking_threshold ?? DEFAULT_DELTA,
      notification_frequency: (s?.notification_frequency ?? "daily") as "daily" | "weekly" | "off",
      email: u?.email ?? null,
    };
    userSettingsCache.set(userId, out);
    return out;
  }

  for (const project of projects ?? []) {
    const userSettings = await loadUserSettings(project.user_id);
    if (userSettings.notification_frequency === "off") {
      // Still record positions, just skip notifications.
    }
    const threshold = project.notification_threshold ?? userSettings.ranking_threshold ?? DEFAULT_DELTA;

    const { data: kws } = await db
      .from("keywords")
      .select("keyword")
      .eq("project_id", project.id);

    let gscRefreshToken: string | null = null;
    if (project.gsc_connected && project.gsc_refresh_token_enc) {
      try { gscRefreshToken = await decryptToken(project.gsc_refresh_token_enc); }
      catch (err) { console.error("cron: decrypt failed", project.id, (err as Error).message); }
    }

    for (const { keyword } of kws ?? []) {
      let position: number | null = null;
      try {
        position = await fetchDomainPositionForKeyword(keyword, project.domain, "de", {
          db, cacheTtlSeconds: CACHE_TTL_SECONDS,
        });
      } catch (err) {
        // Fall back to GSC if available, otherwise skip this keyword.
        if (err instanceof DataForSeoError) {
          console.warn("cron: dataforseo failed", project.id, keyword, err.message);
        } else {
          console.error("cron: serp fetch errored", project.id, keyword, (err as Error).message);
        }
        if (gscRefreshToken && project.gsc_site_url) {
          try {
            position = await fetchGscPosition({
              refreshToken: gscRefreshToken,
              siteUrl: project.gsc_site_url,
              keyword,
            });
          } catch (err2) {
            console.error("cron: gsc fallback failed", project.id, keyword, (err2 as Error).message);
            continue;
          }
        } else {
          continue;
        }
      }

      await db.from("rankings").insert({ project_id: project.id, keyword, position });

      const { data: prev } = await db
        .from("rankings")
        .select("position")
        .eq("project_id", project.id)
        .eq("keyword", keyword)
        .order("recorded_at", { ascending: false })
        .range(1, 1)
        .maybeSingle();

      const prevPos = prev?.position ?? null;
      if (position != null && prevPos != null && Math.abs(position - prevPos) >= threshold) {
        await db.from("notifications").insert({
          project_id: project.id,
          keyword,
          old_position: prevPos,
          new_position: position,
        });
        notifications++;

        if (userSettings.email_notifications && userSettings.notification_frequency !== "off" && userSettings.email) {
          const acc: NotifyAccumulator = emailQueue.get(project.user_id) ?? {
            email: userSettings.email,
            domain: project.domain,
            rows: [],
          };
          acc.rows.push({ keyword, oldPosition: prevPos, newPosition: position });
          emailQueue.set(project.user_id, acc);
        }
      }
      processed++;
    }
  }

  for (const [userId, acc] of emailQueue) {
    if (acc.rows.length === 0) continue;
    const settings = userSettingsCache.get(userId);
    // Throttle: don't re-email the same user more than once per day (or week).
    const minHoursBetween = settings?.notification_frequency === "weekly" ? 24 * 7 : 24;
    const { data: lastSent } = await db
      .from("settings")
      .select("last_notification_email_at")
      .eq("user_id", userId)
      .maybeSingle();
    const lastAt = lastSent?.last_notification_email_at ? new Date(lastSent.last_notification_email_at).getTime() : 0;
    if (Date.now() - lastAt < minHoursBetween * 60 * 60 * 1000) continue;

    const tpl = renderRankingChangeEmail({ domain: acc.domain, rows: acc.rows });
    const res = await sendEmail({ to: acc.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
    if (res.ok) {
      emailsSent++;
      await db.from("settings").update({ last_notification_email_at: new Date().toISOString() }).eq("user_id", userId);
    }
  }

  return json({ ok: true, processed, notifications, emailsSent });
}
