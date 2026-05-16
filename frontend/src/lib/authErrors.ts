/**
 * Maps Supabase Auth error messages to user-friendly German strings.
 *
 * Supabase liefert die Originalfehler auf Englisch ("Invalid login
 * credentials", "Email rate limit exceeded", …). Wir kennen die
 * häufigsten und übersetzen sie. Alles andere fällt auf einen
 * generischen Hinweis zurück — den Originalwortlaut zeigen wir
 * bewusst nicht, weil er für Endnutzer wenig hilfreich ist.
 */
export function germanAuthError(input: unknown): string {
  const msg = input instanceof Error ? input.message : typeof input === "string" ? input : "";
  const norm = msg.toLowerCase();

  if (norm.includes("invalid login") || norm.includes("invalid credentials")) {
    return "E-Mail oder Passwort falsch.";
  }
  if (norm.includes("email not confirmed") || norm.includes("email rate limit")) {
    return "Zu viele Versuche. Bitte warte ein paar Minuten oder prüfe dein E-Mail-Postfach.";
  }
  if (norm.includes("user already") || norm.includes("already registered")) {
    return "Diese E-Mail-Adresse ist schon registriert. Versuch dich stattdessen anzumelden.";
  }
  if (norm.includes("password") && (norm.includes("weak") || norm.includes("short"))) {
    return "Das Passwort ist zu schwach. Mindestens 8 Zeichen — am besten mit Zahlen und Sonderzeichen.";
  }
  if (norm.includes("network") || norm.includes("failed to fetch")) {
    return "Keine Internetverbindung. Bitte später erneut versuchen.";
  }
  if (norm.includes("token") && norm.includes("expired")) {
    return "Dein Link ist abgelaufen. Bitte fordere einen neuen an.";
  }
  return "Etwas ist schiefgelaufen. Bitte versuche es in einem Moment erneut.";
}
