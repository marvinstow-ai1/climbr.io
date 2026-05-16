import { LegalLayout, Placeholder } from "../../components/legal/LegalLayout";

export default function AGB() {
  return (
    <LegalLayout title="Allgemeine Geschäftsbedingungen" lastUpdated="2026-05-16">
      <h2>1. Geltungsbereich</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung
        des Online-Dienstes climbr.io, betrieben durch{" "}
        <Placeholder>VOLLSTÄNDIGER NAME</Placeholder> (nachfolgend „Anbieter").
        Mit der Registrierung erklärst du dich mit diesen AGB einverstanden.
      </p>

      <h2>2. Leistungsbeschreibung</h2>
      <p>
        climbr.io ist ein Online-Tool zur SEO-Analyse von Webseiten. Wir
        crawlen die von dir angegebenen URLs, erzeugen auf Basis automatisierter
        Auswertung und KI-Modellen einen Bericht mit Empfehlungen und tracken
        optional Keyword-Positionen über die Google Search Console API.
      </p>
      <p>
        <strong>Keine Garantie für Rankings:</strong> Suchmaschinen-Rankings
        hängen von zahlreichen Faktoren ab, die außerhalb der Kontrolle des
        Anbieters liegen. Wir geben keine Zusicherung, dass die Umsetzung
        unserer Empfehlungen zu einer bestimmten Position oder zu mehr
        Sichtbarkeit führt.
      </p>

      <h2>3. Registrierung und Account</h2>
      <p>
        Für die Nutzung ist ein Account erforderlich. Du verpflichtest dich,
        bei der Registrierung wahrheitsgemäße Angaben zu machen und dein
        Passwort vertraulich zu behandeln. Du bist verantwortlich für alle
        Aktivitäten, die unter deinem Account stattfinden.
      </p>

      <h2>4. Nutzungsbedingungen</h2>
      <ul>
        <li>
          Du verpflichtest dich, climbr.io nicht für rechtswidrige Zwecke zu
          nutzen.
        </li>
        <li>
          Automatisiertes Scraping der Plattform, das Reverse-Engineering der
          API oder die Weitergabe von Zugangsdaten an Dritte ist untersagt.
        </li>
        <li>
          Du darfst climbr.io nur für eigene Domains oder Domains, für die du
          eine ausdrückliche Berechtigung des Eigentümers hast, einsetzen.
        </li>
      </ul>

      <h2>5. Plan-Limits (Free-Tier)</h2>
      <p>
        Der kostenfreie Plan bietet im Standardumfang:
      </p>
      <ul>
        <li>bis zu 3 Projekte</li>
        <li>bis zu 5 getrackte Keywords pro Projekt</li>
        <li>bis zu 10 Audits pro Kalendermonat</li>
      </ul>
      <p>
        Der Anbieter behält sich vor, die Limits anzupassen. Über Änderungen
        informieren wir dich rechtzeitig per E-Mail.
      </p>

      <h2>6. Haftungsausschluss</h2>
      <p>
        Die in climbr.io angezeigten Empfehlungen sind algorithmisch erzeugte
        Hinweise und stellen <strong>keine Rechts-, Steuer- oder
        Unternehmensberatung</strong> dar. Die Umsetzung erfolgt auf eigenes
        Risiko. Wir haften nicht für indirekte Schäden, entgangenen Gewinn
        oder Datenverluste, die durch die Nutzung des Dienstes entstehen,
        soweit gesetzlich zulässig.
      </p>
      <p>
        Bei grober Fahrlässigkeit und Vorsatz haftet der Anbieter unbeschränkt.
        Für leichte Fahrlässigkeit haftet der Anbieter nur bei Verletzung
        wesentlicher Vertragspflichten und begrenzt auf den typischen,
        vorhersehbaren Schaden.
      </p>

      <h2>7. Datenschutz</h2>
      <p>
        Die Verarbeitung deiner personenbezogenen Daten ist in der separaten{" "}
        <a href="/legal/datenschutz">Datenschutzerklärung</a> beschrieben.
      </p>

      <h2>8. Verfügbarkeit</h2>
      <p>
        Der Anbieter ist um eine möglichst hohe Verfügbarkeit bemüht, gibt
        jedoch keine Verfügbarkeits-Garantie ab. Wartungsarbeiten oder
        kurzfristige Ausfälle (z.B. bei Drittanbietern wie Supabase oder
        Vercel) sind möglich.
      </p>

      <h2>9. Änderungen der AGB</h2>
      <p>
        Wir behalten uns vor, diese AGB anzupassen. Über wesentliche Änderungen
        informieren wir dich mindestens zwei Wochen vor Inkrafttreten per
        E-Mail. Widersprichst du den geänderten Bedingungen nicht innerhalb
        dieser Frist, gelten sie als angenommen.
      </p>

      <h2>10. Kündigung</h2>
      <p>
        Du kannst deinen Account jederzeit über die Einstellungen löschen.
        Mit der Löschung werden alle deine Projekte, Audits und Keywords
        unwiderruflich entfernt. Eine Wiederherstellung ist nicht möglich.
      </p>

      <h2>11. Anwendbares Recht und Gerichtsstand</h2>
      <p>
        Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter
        Ausschluss des UN-Kaufrechts. Gerichtsstand für Streitigkeiten mit
        Kaufleuten oder juristischen Personen des öffentlichen Rechts ist{" "}
        <Placeholder>STADT</Placeholder>.
      </p>

      <h2>12. Salvatorische Klausel</h2>
      <p>
        Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit
        der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen
        Bestimmung tritt die gesetzliche Regelung.
      </p>
    </LegalLayout>
  );
}
