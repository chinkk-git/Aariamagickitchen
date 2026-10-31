# Aaria V3.6 Magical Notifications — staged foundation

## Branch and release boundary

This work is isolated on `feature/v3.6-magical-notifications`, based on main at `f1debf7e5db8afc434d5b3e1b7c403f11bc6b19f`. Production is not changed. The push interface remains disabled until the provider and guardian-consent workflow are configured and reviewed.

## Proposed service architecture

- GitHub Pages remains the app host and serves the standard service worker.
- A Cloudflare Worker provides a small authenticated Web Push API; Cloudflare D1 stores only endpoint/key material, locale, category preferences, a signed-consent receipt hash, and idempotent announcement delivery records.
- VAPID private key, consent-signing key and publisher token stay in Worker secrets. Never include them in public application code.
- A `deployment_status` GitHub Actions workflow compares deployed `manifest.json` versions, creates bilingual drafts from new recipe IDs/countries/approved feature metadata, and calls the Worker only for a successful Pages deployment. Worker announcement IDs are idempotent across retries.
- Push subscriptions require a cryptographically signed guardian-consent receipt. The client cannot self-assert parental consent. No receipt issuer exists yet, so subscription creation currently fails closed.
- The Text Size destination exists only as a guarded route event. Integrate it after the separate Font Size PR is merged and its production deployment is confirmed.

## iOS/iPadOS and browser support

Web Push is supported on iOS/iPadOS 16.4+ for Home Screen web apps. A regular Safari tab or an in-app browser must not be represented as a supported background-push installation. The settings screen provides in-app-browser guidance. Android support depends on a standards-compatible browser and explicit permission. Device-level tests remain outstanding.

## External setup still required

1. Owner creates/authorizes a Cloudflare Free account, Worker and D1 database; this branch does not create an account or activate paid services.
2. Configure the D1 database ID, deploy the Worker, and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `ADMIN_TOKEN`, and `CONSENT_SIGNING_SECRET` as Worker secrets.
3. Select/approve a verifiable guardian-consent mechanism and deploy its signed receipt issuer. Do not set `AARIA_PARENT_CONSENT_MODEL_APPROVED=true` until privacy/legal review confirms the actual flow and notice.
4. Add repository variable `AARIA_NOTIFICATION_WORKER_URL`, variable `AARIA_PARENT_CONSENT_MODEL_APPROVED`, and secret `AARIA_NOTIFICATION_PUBLISH_TOKEN`. Allow only the exact Worker hostname in the app CSP when client subscription is enabled.
5. Complete the consent-issuer integration, subscription/unsubscribe UI, test-notification controls, rate/abuse controls and external deployment tests.

## Free-tier capacity (current Cloudflare docs)

Cloudflare currently lists Workers Free at 100,000 requests per day and D1 Free at 5 million rows read/day, 100,000 rows written/day, and 5 GB total storage. Exceeding D1 daily limits causes queries to fail until reset; free usage is not a delivery SLA. Monitor quotas before launch and do not switch to a paid plan without approval.

## Data minimization and retention

The schema contains no name, age, email, account ID or location. Push endpoints and key material are sensitive delivery data. Delete subscriptions on unsubscribe or push-service HTTP 404/410. Keep operational logs to aggregate counts/status and never log endpoints, keys, receipts, or payload contents. A retention period and signed-receipt issuer must be approved before production.

## Initial release

No Text Size announcement is present or sent. No remote push can be delivered until the provider, VAPID secrets, signed guardian-consent issuer and repository secrets are configured. No Android/iPhone/iPad device PASS is claimed.


## Owner setup runbook — do not perform until approved

The following uses Cloudflare's Free plan only. The owner creates the account/resources and enters secrets directly into Cloudflare/GitHub; never paste secret values into a commit, issue, chat, or the public Pages app.

1. In a trusted terminal, from `notifications-worker/`, install the declared package dependencies with `npm install`.
2. Create the database: `npx wrangler d1 create aaria-notifications`. Copy the returned database ID directly into `d1_databases[0].database_id` in `wrangler.toml`; do not commit the ID as a secret (it is a resource identifier).
3. Apply the existing schema remotely: `npx wrangler d1 execute aaria-notifications --remote --file=./migrations/0001_schema.sql`.
4. Generate one VAPID key pair with `npx web-push generate-vapid-keys`. Keep the private key in a password manager or other owner-controlled secret store. Set Worker runtime values `VAPID_PUBLIC_KEY` and `VAPID_SUBJECT` (an owner-approved contact URI). Set Worker secrets `VAPID_PRIVATE_KEY`, `ADMIN_TOKEN`, and `CONSENT_SIGNING_SECRET` using Cloudflare's Worker secrets UI or `npx wrangler secret put <NAME>`. The public key is returned by `/v1/config`; only the private key and administrative/signing tokens must remain secret.
5. Deploy from `notifications-worker/` with `npx wrangler deploy`; record the exact Worker URL. Confirm `GET <Worker URL>/v1/config` returns the public VAPID key and never returns private values. Do not enable client enrollment at this stage.
6. In GitHub repository **Settings → Secrets and variables → Actions**, configure:
   - **Variable** `AARIA_NOTIFICATION_WORKER_URL`: exact deployed Worker base URL.
   - **Variable** `AARIA_PARENT_CONSENT_MODEL_APPROVED`: leave unset/false until the actual consent workflow and privacy notice are approved.
   - **Secret** `AARIA_NOTIFICATION_PUBLISH_TOKEN`: the same high-entropy value entered as Worker `ADMIN_TOKEN`.
   Set the exact Worker origin in the app's `connect-src` CSP only when a reviewed client subscription integration is deployed.

### Guardian-consent issuer contract and privacy sign-off

The current Worker accepts only a signed token shaped as `base64url(JSON).base64url(HMAC-SHA256)`, signed over the encoded JSON with `CONSENT_SIGNING_SECRET`. The payload must contain `iss: "aaria-parent-consent"`, `approved: true`, locale `en-GB` or `pt-BR`, a `receiptId` of 1–120 characters, integer `iat` and `exp`; issuance may be at most 60 seconds in the future, expiry must be current, and lifetime cannot exceed 366 days. The same signing secret is configured only in the trusted issuer and Worker. The app must never create or sign its own consent receipt, and an OS permission prompt is not guardian consent.

Before approving the model, the owner/privacy reviewer must identify the controller and applicable jurisdictions; review how the issuer verifies a parent/guardian and withdraws consent; approve receipt lifetime and retention/deletion periods; identify Cloudflare and browser push providers, data transfers, rights/contact and incident handling; and approve the completed EN-GB/PT-BR notice and child-focused privacy assessment. Until all points are signed off, keep `AARIA_PARENT_CONSENT_MODEL_APPROVED` unset and the subscription UI disabled.

After approval, the client still needs a reviewed consent-issuer integration, explicit parent-led flow, explicit user action before calling `Notification.requestPermission()`, subscription refresh/resubscribe handling, authenticated-safe unsubscribe UI, rate/abuse controls, and a test-notification path that never exposes `ADMIN_TOKEN` in client code. Test these on real Android Chrome/PWA and iOS/iPadOS 16.4+ Home Screen installations. Do not claim device acceptance without recorded device evidence.


## Client subscription flow contract

The client lifecycle module is `js/notifications-push-v36.js`. It stays unavailable unless a public runtime configuration sets `window.AARIA_NOTIFICATION_CONFIG = { enabled: true, workerUrl: "https://<approved-worker-host>" }` and an owner-approved consent adapter provides `window.AariaGuardianConsent.requestConsentReceipt({locale,categories})`. Load the adapter before the push lifecycle module. The adapter must conduct the actual guardian-verification process and return its signed receipt; it must not be a local checkbox. No token, VAPID private key or Worker admin token belongs in this runtime configuration.

The client first asks that adapter for a receipt on an explicit button action, fetches the public VAPID key and verifies the receipt with `POST /v1/consent/verify`. Only after server verification does a second explicit button call the browser's permission API and create/update the push subscription. Receipts stay in memory and are re-verified on registration; they are not stored in local storage. Unsubscribe removes the server row when online and always disables the local browser subscription; if the server removal cannot be confirmed, the UI offers retry. A browser-reported subscription change requires a fresh guardian verification and explicit renewal action. The Worker removes expired endpoints when delivery returns HTTP 404 or 410. The client never sends the Worker admin token and has no public push-test endpoint.

Until the approved adapter/configuration and all privacy/security gates exist, the client controls remain disabled and no OS notification prompt is requested.
