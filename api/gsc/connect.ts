// GSC OAuth — Phase 1 stub.
// Generates the Google consent URL; callback handler stores the encrypted
// refresh token. Real callback wiring lives in /api/gsc/callback (TODO).

import { json } from "../../lib/validation.js";

export const config = { runtime: "edge" };

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: { message: "method not allowed" } }, { status: 405 });
  }
  const clientId = process.env.GSC_CLIENT_ID;
  const redirect = process.env.GSC_REDIRECT_URI;
  if (!clientId || !redirect) {
    return json({ error: { message: "GSC OAuth not configured" } }, { status: 501 });
  }
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) return json({ error: { message: "projectId required" } }, { status: 400 });

  const state = projectId; // TODO: sign with HMAC to prevent CSRF
  const oauth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  oauth.searchParams.set("client_id", clientId);
  oauth.searchParams.set("redirect_uri", redirect);
  oauth.searchParams.set("response_type", "code");
  oauth.searchParams.set("scope", SCOPE);
  oauth.searchParams.set("access_type", "offline");
  oauth.searchParams.set("prompt", "consent");
  oauth.searchParams.set("state", state);

  return json({ authorizeUrl: oauth.toString() });
}
