import { LegalLayout, Placeholder } from "../../components/legal/LegalLayout";

export default function Datenschutz() {
  return (
    <LegalLayout title="Datenschutzerklärung" lastUpdated="2026-05-16">
      <p>
        Diese Datenschutzerklärung informiert dich gemäß Art. 13 und 14 DSGVO
        darüber, welche personenbezogenen Daten wir bei der Nutzung von
        climbr.io erheben, zu welchem Zweck wir sie verarbeiten und welche
        Rechte dir zustehen.
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>
        <Placeholder>VOLLSTÄNDIGER NAME</Placeholder>
        <br />
        <Placeholder>STRASSE UND HAUSNUMMER</Placeholder>
        <br />
        <Placeholder>PLZ ORT</Placeholder>
        <br />
        E-Mail: <Placeholder>datenschutz@climbr.io</Placeholder>
      </p>

      <h2>2. Welche Daten wir erheben</h2>
      <ul>
        <li>
          <strong>Account-Daten:</strong> E-Mail-Adresse, gehashtes Passwort,
          Sprach- und Benachrichtigungs-Einstellungen.
        </li>
        <li>
          <strong>Projekt-Daten:</strong> Domains, die du analysieren lässt,
          getrackte Keywords und Ergebnisse der SEO-Audits.
        </li>
        <li>
          <strong>Google Search Console (optional):</strong> falls du GSC
          verbindest, lesen wir mit deiner Einwilligung Ranking-Daten zu
          deinen Keywords aus deinen verifizierten GSC-Properties aus. Der
          OAuth-Refresh-Token wird verschlüsselt (AES-256-GCM) gespeichert.
        </li>
        <li>
          <strong>Technische Daten:</strong> IP-Adresse (gekürzt nach
          7 Tagen), Browser- und Betriebssystem-Informationen, Zeitpunkt des
          Zugriffs — in Server-Logs für maximal 30 Tage.
        </li>
      </ul>

      <h2>3. Zweck und Rechtsgrundlage</h2>
      <p>
        Wir verarbeiten deine Daten ausschließlich zur Erbringung des
        vertraglich vereinbarten Dienstes (SEO-Analyse und Keyword-Tracking)
        sowie zum Versand der von dir aktivierten Benachrichtigungen.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
        und — bei der GSC-Verbindung — Art. 6 Abs. 1 lit. a DSGVO
        (Einwilligung).
      </p>

      <h2>4. Speicherdauer</h2>
      <p>
        Account-Daten und Projekt-Daten werden gespeichert, bis du dein Konto
        löschst. Server-Logs werden nach 30 Tagen automatisch entfernt.
        Audit-Berichte werden 90 Tage nach Erzeugung archiviert; alte Audits
        löschen wir automatisch per Cronjob.
      </p>

      <h2>5. Empfänger und Drittanbieter</h2>
      <p>
        Wir nutzen folgende Auftragsverarbeiter (mit Auftragsverarbeitungs­
        verträgen nach Art. 28 DSGVO):
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> (Datenbank und Authentifizierung) —
          gehostet in Frankfurt am Main (EU). Anbieter: Supabase Inc., USA,
          Datenverarbeitung erfolgt jedoch in der EU.
        </li>
        <li>
          <strong>Vercel Inc.</strong> (Hosting des Frontends und der
          Serverless-Funktionen) — USA. Verarbeitung erfolgt unter den
          EU-Standardvertragsklauseln (SCCs).
        </li>
        <li>
          <strong>OpenAI</strong> (Erzeugung der AI-Audit-Berichte) — USA.
          Wir übergeben nur die technischen Crawl-Ergebnisse (Title-Tags,
          Meta-Daten, Seitenstruktur), niemals deine E-Mail-Adresse oder
          Account-Daten. Verarbeitung unter SCCs.
        </li>
        <li>
          <strong>Google LLC</strong> (Search Console, nur bei aktiver
          GSC-Verbindung) — USA. Verarbeitung unter SCCs.
        </li>
      </ul>

      <h2>6. Deine Rechte</h2>
      <p>Du hast jederzeit das Recht auf:</p>
      <ul>
        <li>Auskunft über die zu deiner Person gespeicherten Daten (Art. 15)</li>
        <li>Berichtigung unrichtiger Daten (Art. 16)</li>
        <li>Löschung deiner Daten (Art. 17)</li>
        <li>Einschränkung der Verarbeitung (Art. 18)</li>
        <li>Datenübertragbarkeit (Art. 20)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21)</li>
        <li>
          Widerruf einer einmal erteilten Einwilligung mit Wirkung für die
          Zukunft (Art. 7 Abs. 3)
        </li>
        <li>
          Beschwerde bei einer Aufsichtsbehörde (Art. 77) — zuständig ist
          die Datenschutzbehörde deines Bundeslandes.
        </li>
      </ul>
      <p>
        Zur Ausübung deiner Rechte genügt eine formlose E-Mail an{" "}
        <Placeholder>datenschutz@climbr.io</Placeholder>.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Wir setzen ausschließlich technisch notwendige Cookies (Session-Cookies
        für das Login). Diese Cookies sind nach Art. 25 Abs. 2 TTDSG ohne
        Einwilligung zulässig, da sie für die von dir angeforderte Funktion
        zwingend erforderlich sind. Wir verwenden <strong>keine</strong>{" "}
        Tracking-, Analyse- oder Werbe-Cookies.
      </p>

      <h2>8. Weitergabe an Dritte</h2>
      <p>
        Eine Weitergabe deiner Daten an Dritte zu Werbe- oder Verkaufszwecken
        findet nicht statt. Eine Offenlegung erfolgt nur, wenn wir gesetzlich
        dazu verpflichtet sind (z.B. auf richterliche Anordnung).
      </p>

      <h2>9. Sicherheit</h2>
      <p>
        Alle Datenübertragungen erfolgen TLS-verschlüsselt. Passwörter werden
        nur gehasht gespeichert (bcrypt, via Supabase Auth). OAuth-Refresh-Tokens
        werden mit AES-256-GCM verschlüsselt. Der Server-Zugang ist auf
        autorisierte Personen beschränkt.
      </p>
    </LegalLayout>
  );
}
