# climbr.io — Phase 3 Setup-Anleitung (Stripe Billing)

Diese Anleitung beschreibt **Schritt für Schritt**, was du selbst tun musst,
damit Phase 3 (Stripe-Checkout, Customer-Portal, Webhook, Plan-Sync, 14-Tage-Trial)
live geht.

> ⚠️ Mach alles erst im **Stripe Test-Modus** (Toggle oben rechts im Stripe-Dashboard:
> "Test mode"). Erst wenn lokal alles läuft, schaltest du auf Live.

---

## 1. Stripe-Account anlegen + Test-Modus aktivieren

1. Öffne https://dashboard.stripe.com/register und lege einen Account an.
2. Bestätige deine E-Mail (Inbox checken).
3. Im Dashboard oben rechts: stelle sicher, dass der **Test mode**-Toggle
   eingeschaltet ist (orangefarbener Banner oben).
4. Falls Stripe nach "Activate your account" fragt: kannst du im Test-Modus
   ignorieren — du brauchst keine echte Geschäftsadresse für Test-Zahlungen.

---

## 2. Produkte + Preise anlegen

Wir brauchen genau zwei Preise: einen für **Starter (€19/Monat)** und einen
für **Pro (€49/Monat)**.

1. Im Stripe-Dashboard links: **Catalog → Products**.
2. Oben rechts: **+ Add product**.
3. Trage ein:
   - **Name**: `Starter`
   - **Description**: `climbr.io Starter plan`
   - **Pricing model**: *Recurring*
   - **Price**: `19.00`, *EUR*
   - **Billing period**: *Monthly*
4. Klicke unten rechts auf **Save product**.
5. Auf der Produkt-Detail-Seite: kopiere die **Price ID** unter "Pricing"
   (Format: `price_xxx…`). Das ist gleich dein `STRIPE_PRICE_STARTER`.
6. Wiederhole Schritte 2-5 für den Pro-Plan:
   - Name: `Pro`, Price: `49.00 EUR / Monthly`
   - Die Price-ID wird gleich dein `STRIPE_PRICE_PRO`.

---

## 3. API-Keys kopieren

1. Im Dashboard links: **Developers → API keys**.
2. Du siehst zwei Keys:
   - **Publishable key** — brauchst du **nicht** (wir verwenden nur Server-Calls).
   - **Secret key** (`sk_test_xxx…`) — klicke **Reveal test key**, kopieren.
3. Das ist dein `STRIPE_SECRET_KEY`.

---

## 4. Webhook-Endpoint anlegen

Stripe pusht uns Subscription-Status-Updates. Ohne dieses Webhook bleibt
der Plan nach erfolgreicher Zahlung auf "free", weil das Backend keine
Bestätigung kriegt.

### Lokal (Stripe CLI)

1. Installiere die Stripe CLI:
   - macOS: `brew install stripe/stripe-cli/stripe`
   - Linux: https://stripe.com/docs/stripe-cli#install
2. Im Terminal: `stripe login` → Browser öffnet sich → bestätigen.
3. Starte die Webhook-Weiterleitung:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```
4. Die CLI druckt einmal eine Zeile wie:
   ```
   Ready! Your webhook signing secret is whsec_xxxxxxxxxxxx
   ```
   **Kopiere das `whsec_xxx…`** — das wird `STRIPE_WEBHOOK_SECRET`.
5. Lass das CLI-Fenster offen, während du testest.

### Produktion (Vercel)

1. Stripe-Dashboard: **Developers → Webhooks → + Add endpoint**.
2. **Endpoint URL**: `https://<deine-domain>.vercel.app/api/billing/webhook`
   (oder dein eigenes Domain z.B. `https://climbr.io/api/billing/webhook`).
3. **Description**: `climbr.io subscription events`
4. **Listen to**: *Events on your account* → **Select events**, hake folgende an:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `customer.subscription.paused`
   - `customer.subscription.resumed`
5. **Add endpoint** klicken.
6. Auf der Detail-Seite des neuen Endpoints: **Signing secret** → **Reveal**,
   kopieren. Das ist dein **Produktions**-`STRIPE_WEBHOOK_SECRET` (anderer
   Wert als das CLI-Secret aus dem lokalen Setup).

---

## 5. Customer Portal aktivieren

Damit User selbst kündigen / Zahlungsmethoden ändern können:

1. Dashboard: **Settings → Billing → Customer portal**
   (oder direkt https://dashboard.stripe.com/settings/billing/portal).
2. **Activate test link** klicken.
3. Unter **Subscriptions**: aktivieren von
   - *Customers can cancel subscriptions*
   - *Customers can switch plans* (wähle die zwei Preise aus Schritt 2 als
     "Available products")
   - *Customers can update quantities*: aus lassen
4. Unter **Business information**: trage zumindest deinen Firmennamen ein
   (kann später geändert werden).
5. **Save** klicken.

---

## 6. Umgebungsvariablen setzen

### Lokal — `.env.local` im Repo-Root

```
STRIPE_SECRET_KEY=<dein-secret-key-aus-schritt-3>
STRIPE_WEBHOOK_SECRET=<dein-webhook-secret-aus-schritt-4>
STRIPE_PRICE_STARTER=<deine-starter-price-id-aus-schritt-2>
STRIPE_PRICE_PRO=<deine-pro-price-id-aus-schritt-2>
APP_URL=http://localhost:5173
```

Format der Werte zur Orientierung:
- Secret Key beginnt mit `sk_test_…` (Test) bzw. `sk_live_…` (Live)
- Webhook-Secret beginnt mit `whsec_…`
- Price-IDs beginnen mit `price_…`

### Produktion — Vercel Dashboard

1. https://vercel.com/dashboard → Projekt **climbr.io** → **Settings → Environment Variables**.
2. Trage jeweils ein (Environment: **Production** **+** **Preview**):
   - `STRIPE_SECRET_KEY` — der Secret Key aus Schritt 3 (Live-Modus später: `sk_live_…`)
   - `STRIPE_WEBHOOK_SECRET` — Signing-Secret aus Schritt 4
   - `STRIPE_PRICE_STARTER` — Price-ID aus Schritt 2
   - `STRIPE_PRICE_PRO` — Price-ID aus Schritt 2
   - `APP_URL` — z.B. `https://climbr.io`
3. **Save** → **Deployments → Redeploy** auf der neuesten Bereitstellung.

---

## 7. Supabase-Migration ausführen

Migration `0005_stripe_billing.sql` fügt die Stripe-Felder zur `users`-Tabelle
hinzu und legt `billing_events` (Webhook-Audit-Log) an.

1. Supabase-Dashboard → **SQL Editor → + New query**.
2. Inhalt von `infra/supabase/migrations/0005_stripe_billing.sql` einfügen.
3. **Run** (⌘+Enter).
4. Verifizieren: **Database → Tables → users** zeigt jetzt die neuen
   Spalten (`stripe_customer_id`, `subscription_status`, etc.).

---

## 8. End-to-End-Test

### Lokal

In **drei** Terminal-Fenstern:

```bash
# Fenster 1 — der Dev-Server
npm run dev

# Fenster 2 — Stripe-Webhook-Forwarder
stripe listen --forward-to localhost:3000/api/billing/webhook

# Fenster 3 — du gehst zum Browser
```

1. http://localhost:5173/pricing — eingeloggt sein.
2. Klick **Starter starten** → wirst zu Stripe-Checkout weitergeleitet.
3. Test-Kartennummer: `4242 4242 4242 4242`, beliebiges Datum in der Zukunft,
   beliebige CVC.
4. Nach Bezahlung Redirect zu `/billing?status=success`.
5. Im **Fenster 2** siehst du die einkommenden Webhook-Events
   (`checkout.session.completed`, `customer.subscription.created`).
6. Die `/billing`-Seite zeigt nach 2-5 Sekunden den neuen Plan an.
7. Klick **Im Stripe-Portal verwalten** → Redirect zum Customer-Portal.

### Produktion

Identischer Flow, aber Stripe muss im **Live-Modus** sein und du brauchst eine
echte (oder Test-Karte mit Live-Keys, was Stripe nicht erlaubt). Praktischer
Test: lasse Stripe im Test-Modus, deploy mit Test-Keys, mache einen Probekauf
mit `4242…`, schalte dann erst auf Live um.

---

## 9. Was passiert wenn du was vergisst

| Symptom | Wahrscheinliche Ursache |
|---------|--------------------------|
| Checkout-Button sagt "Stripe-Preis-ID nicht konfiguriert" | `STRIPE_PRICE_STARTER`/`_PRO` fehlt in env |
| Stripe-Checkout öffnet sich aber "Internal Server Error" | `STRIPE_SECRET_KEY` fehlt |
| Zahlung erfolgreich, aber Plan bleibt "free" | Webhook nicht eingerichtet, oder `STRIPE_WEBHOOK_SECRET` falsch |
| Webhook landet aber Plan ändert sich nicht | Migration 0005 nicht ausgeführt |
| Customer Portal sagt "No configuration provided" | Portal nicht in Schritt 5 aktiviert |

---

## 10. Architektur-Überblick

| Layer | Datei |
|-------|-------|
| Stripe-Client (REST + Webhook-Verifier) | `lib/stripe.ts` |
| Migration (DB-Schema) | `infra/supabase/migrations/0005_stripe_billing.sql` |
| API: aktueller Plan + Status | `api/billing/me.ts` |
| API: Checkout starten | `api/billing/checkout.ts` |
| API: Customer-Portal-Link | `api/billing/portal.ts` |
| API: Webhook-Receiver | `api/billing/webhook.ts` |
| Frontend: Pricing-Seite (mit Checkout) | `frontend/src/pages/Pricing.tsx` |
| Frontend: Billing-Seite | `frontend/src/pages/Billing.tsx` |

**Sicherheit**:
- `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` werden **nur server-seitig**
  gelesen. Beide tauchen nicht im Frontend-Bundle auf.
- Webhook-Payloads werden mit HMAC-SHA-256 verifiziert
  (`lib/stripe.ts → verifyWebhookSignature`) bevor irgendetwas in die DB
  geschrieben wird. Zeitfenster: 5 Minuten.
- `event_id` ist unique-constrained → Replay-Attacks und Stripe-Retries
  sind idempotent.
- `billing_events` ist per RLS auf den eigenen User beschränkt
  (Owner-Read-Only); Writes nur über Service-Role.
