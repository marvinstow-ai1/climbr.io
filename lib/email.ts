// Minimal SMTP-via-fetch sender. We avoid the `nodemailer` dep so this stays
// edge-compatible. If SMTP_URL is unset (e.g. local dev), the helper logs the
// message and returns OK — never blocks the calling flow.
//
// In production we expect SMTP_URL to point at a Resend / Postmark-style HTTP
// endpoint. The wire format below is Resend's; swap if you use a different
// provider.

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean }> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    console.log("[email] SMTP_URL not set — skipping send", { to: input.to, subject: input.subject });
    return { ok: false };
  }
  // Resend-style HTTPS API: SMTP_URL = "https://api.resend.com/emails::API_KEY"
  // We accept "<endpoint>::<api-key>" so we don't need a separate env var.
  const [endpointRaw, apiKey] = smtpUrl.split("::");
  if (!endpointRaw || !apiKey) {
    console.warn("[email] SMTP_URL not in expected '<endpoint>::<key>' format");
    return { ok: false };
  }
  const from = process.env.EMAIL_FROM ?? "climbr.io <no-reply@climbr.io>";
  try {
    const r = await fetch(endpointRaw, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text ?? stripHtml(input.html),
      }),
    });
    if (!r.ok) {
      console.warn("[email] send failed", r.status);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[email] send threw", (err as Error).message);
    return { ok: false };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function renderRankingChangeEmail(args: {
  domain: string;
  rows: { keyword: string; oldPosition: number | null; newPosition: number | null }[];
  appUrl?: string;
}): { subject: string; html: string; text: string } {
  const appUrl = args.appUrl ?? "https://climbr.io";
  const improved = args.rows.filter((r) => r.oldPosition != null && r.newPosition != null && r.oldPosition > r.newPosition);
  const dropped = args.rows.filter((r) => r.oldPosition != null && r.newPosition != null && r.oldPosition < r.newPosition);
  const subject = `${args.domain}: ${improved.length} up, ${dropped.length} down`;
  const list = (rs: typeof args.rows) =>
    rs.map((r) => `<li><strong>${escapeHtml(r.keyword)}</strong>: ${r.oldPosition ?? "—"} → ${r.newPosition ?? "—"}</li>`).join("");
  const html = `
    <div style="font-family: Inter, system-ui, sans-serif; color: #0F172A; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #2B8AF3;">Ranking-Bewegungen für ${escapeHtml(args.domain)}</h2>
      ${improved.length > 0 ? `<h3>📈 Verbesserungen</h3><ul>${list(improved)}</ul>` : ""}
      ${dropped.length > 0 ? `<h3>📉 Verluste</h3><ul>${list(dropped)}</ul>` : ""}
      <p style="margin-top: 24px;"><a href="${appUrl}/dashboard" style="color: #2B8AF3;">Dashboard öffnen</a></p>
      <p style="color: #64748B; font-size: 12px;">Du erhältst diese E-Mail, weil ein getracktes Keyword sich um mindestens dein Schwellwert bewegt hat. <a href="${appUrl}/settings/notifications">Einstellungen ändern</a>.</p>
    </div>
  `;
  const text = `Ranking-Bewegungen für ${args.domain}\n\n` +
    (improved.length > 0 ? `Verbesserungen:\n${improved.map((r) => `- ${r.keyword}: ${r.oldPosition} -> ${r.newPosition}`).join("\n")}\n\n` : "") +
    (dropped.length > 0 ? `Verluste:\n${dropped.map((r) => `- ${r.keyword}: ${r.oldPosition} -> ${r.newPosition}`).join("\n")}\n\n` : "") +
    `${appUrl}/dashboard`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
