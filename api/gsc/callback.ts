// OAuth callback for Google Search Console.
// Google redirects the browser here with ?code=...&state=...
// We validate state, exchange the code, encrypt the refresh token, and
// persist it on the project row. The browser is then redirected back to
// the dashboard with a status flag.
//
// No tokens are ever returned in the response body or query string.

import { serverClient, encryptToken } from "../../lib/supabase.js";
import { safeHandler } from "../../lib/safeHandler.js";
import {
  exchangeCode,
  listSites,
  pickPropertyForDomain,
  verifyState,
} from "../../lib/gsc.js";

export const config = { runtime: "nodejs" };

async function _handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response("method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    return redirectToDashboard(req, { gsc: "denied" });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return redirectToDashboard(req, { gsc: "bad_request" });
  }

  const payload = await verifyState(state).catch((err: unknown) => {
    // OAUTH_STATE_SECRET fehlt → verifyState throws. Ohne Catch wäre das
    // ein 500 für den Nutzer (Google-Redirect mit code+state). Jetzt
    // landen wir mit klarer Statusmeldung zurück im Dashboard.
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("gsc callback: verifyState failed:", msg.slice(0, 120));
    return null;
  });
  if (!payload) {
    return redirectToDashboard(req, { gsc: "bad_state" });
  }

  let db;
  try {
    db = serverClient();
  } catch (err) {
    // Supabase-Env fehlt → ohne Catch landet der Nutzer auf einer
    // weißen 500-Seite mitten im OAuth-Flow.
    console.error("gsc callback: serverClient init failed:", err instanceof Error ? err.message : "unknown");
    return redirectToDashboard(req, { gsc: "failed" });
  }

  // Re-check the project still belongs to the same user (defense in depth).
  const { data: project } = await db
    .from("projects")
    .select("id, user_id, domain")
    .eq("id", payload.projectId)
    .maybeSingle();
  if (!project || project.user_id !== payload.userId) {
    return redirectToDashboard(req, { gsc: "forbidden" });
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refreshToken) {
      // Happens when the user already granted consent and Google omits the
      // refresh token. We pushed `prompt=consent` in the authorize URL to
      // avoid this, but guard anyway.
      return redirectToDashboard(req, { gsc: "no_refresh_token", projectId: project.id });
    }

    const sites = await listSites(tokens.accessToken);
    const matched = pickPropertyForDomain(sites, project.domain);
    if (!matched) {
      return redirectToDashboard(req, { gsc: "no_property", projectId: project.id });
    }

    const encrypted = await encryptToken(tokens.refreshToken);

    const { error: upErr } = await db
      .from("projects")
      .update({
        gsc_connected: true,
        gsc_connected_at: new Date().toISOString(),
        gsc_refresh_token_enc: encrypted,
        gsc_site_url: matched.siteUrl,
        gsc_property_uri: matched.siteUrl,
      })
      .eq("id", project.id);
    if (upErr) {
      // Avoid logging the project payload — domain may be PII for the user's customer.
      console.error("gsc callback: project update failed", upErr.message);
      return redirectToDashboard(req, { gsc: "save_failed", projectId: project.id });
    }

    return redirectToDashboard(req, { gsc: "connected", projectId: project.id });
  } catch (err) {
    // Important: don't log err.message verbatim if it might include user input.
    // Our gsc.ts helpers already sanitize, but truncate as belt-and-braces.
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("gsc callback failed:", msg.slice(0, 120));
    return redirectToDashboard(req, { gsc: "failed", projectId: project.id });
  }
}

function redirectToDashboard(req: Request, params: Record<string, string>): Response {
  const origin = new URL(req.url).origin;
  const u = new URL("/dashboard", origin);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { location: u.toString() } });
}

export default safeHandler("api/gsc/callback", _handler);
