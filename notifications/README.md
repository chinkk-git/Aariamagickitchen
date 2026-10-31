# Aaria V3.6 Magical Notifications — staged foundation

## Branch and release boundary

This work is isolated on `feature/v3.6-magical-notifications`. It now includes the deployed Font Size baseline `d9a5f491516e6dd67a4d3a9d6e1f4282145ffcf0`; production has not received the notifications feature. Push is fail-closed: the Worker requires `PARENT_CONSENT_MODEL_APPROVED=true` before it exposes the public VAPID key, verifies consent, accepts subscriptions, permits test sends or publishes announcements.

## Proposed service architecture

- GitHub Pages remains the app host and serves the standard service worker.
- A Cloudflare Worker provides the authenticated Web Push API. D1 stores endpoint/key material, locale, category preferences, a signed-consent receipt hash and expiry, and per-announcement delivery state keyed by a one-way endpoint hash. Cloudflare Queues split fan-out into 50-subscription pages and process no more than 20 delivery messages per consumer batch; duplicate delivery messages are suppressed by a unique announcement/endpoint-hash record. Consent is rechecked immediately before delivery, and expired receipts are revoked and skipped.
- VAPID private key, consent-signing key and publisher token stay in Worker secrets. Never include them in public application code.
- A `deployment_status` GitHub Actions workflow compares deployed `manifest.json` versions, creates bilingual drafts from new recipe IDs/countries/approved feature metadata, and queues them only for a successful Pages deployment. Worker announcement IDs and recipient delivery records make deployment retries idempotent. The authenticated `/v1/status/{announcementId}` route reports final accepted/failed/removed/skipped counts after asynchronous processing; queue acceptance is not proof of device delivery.
- Push subscriptions require a cryptographically signed guardian-consent receipt. The client cannot self-assert parental consent. No receipt issuer exists yet, so subscription creation currently fails closed.
- PR #78 merged and its GitHub Pages deployment succeeded at `d9a5f491516e6dd67a4d3a9d6e1f4282145ffcf0`. The notification branch includes the Settings → Accessibility → Text Size event integration, cache entries and a focused five-size cold-start browser test. This test is part of the focused PR workflow.

## iOS/iPadOS and browser support

Web Push is supported on iOS/iPadOS 16.4+ for Home Screen web apps. A regular Safari tab or an in-app browser must not be represented as a supported background-push installation. The settings screen provides in-app-browser guidance. Android support depends on a standards-compatible browser and explicit permission. Device-level tests remain outstanding.

## External setup still required

1. Owner creates/authorizes a Cloudflare Free account, Worker, D1 database and two Queues; this branch does not create an account or activate paid services.
2. Configure the D1 database ID, deploy the Worker, and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `ADMIN_TOKEN`, and `CONSENT_SIGNING_SECRET` in Worker settings/secrets.
3. Select/approve a verifiable guardian-consent mechanism and deploy its signed receipt issuer. Do not set `AARIA_PARENT_CONSENT_MODEL_APPROVED=true` until privacy/legal review confirms the actual flow and notice.
4. Add repository variable `AARIA_NOTIFICATION_WORKER_URL`, variable `AARIA_PARENT_CONSENT_MODEL_APPROVED`, and secret `AARIA_NOTIFICATION_PUBLISH_TOKEN`. Allow only the exact Worker hostname in the app CSP when client subscription is enabled.
5. Complete the trusted consent-issuer integration, privacy approvals, operational abuse/rate controls and external deployment tests. The public client does not expose the admin-only test endpoint.

## Free-tier capacity (current Cloudflare docs)

Cloudflare currently lists Workers Free at 100,000 requests/day and 50 external subrequests per invocation. D1 Free lists 5 million rows read/day, 100,000 rows written/day and 5 GB total storage. Queues are available on Free with 10,000 operations/day and 24-hour message retention. Delivery is bounded to 20 push attempts per Queue consumer invocation; this code does not offer an SLA, and an exhausted message can reach the configured dead-letter queue. Monitor quotas and dead-letter messages; do not switch to a paid plan without approval.

## Data minimization and retention

The schema contains no name, age, email, account ID or location. Push endpoints, key material and endpoint hashes are sensitive delivery data. Delete subscriptions on unsubscribe or push-service HTTP 404/410. Delivery history stores only announcement ID, endpoint hash, category, state, timestamps, attempt count and numeric error code; keep operational logs to aggregate counts/status and never log endpoints, keys, receipts, or payload contents. The owner/privacy reviewer must approve and configure a delivery-history retention/cleanup period before production.

## Initial release

The deployed Text Size feature is eligible for a bilingual announcement draft, but no announcement has been sent. No remote push can be delivered until the provider, VAPID secrets, signed guardian-consent issuer and repository secrets are configured. No Android/iPhone/iPad device PASS is claimed.


## Owner setup runbook — do not perform until approved

The following uses Cloudflare's Free plan only. The owner creates the account/resources and enters secrets directly into Cloudflare/GitHub; never paste secret values into a commit, issue, chat, or the public Pages app.

1. In a trusted terminal, from `notifications-worker/`, install the declared package dependencies with `npm install`.
2. Create the database: `npx wrangler d1 create aaria-notifications`. Copy the returned database ID directly into `d1_databases[0].database_id` in `wrangler.toml`; do not commit the ID as a secret (it is a resource identifier).
3. Apply both D1 migrations once with `npx wrangler d1 migrations apply aaria-notifications --remote`.
4. Create the free Queue resources: `npx wrangler queues create aaria-notification-delivery` and `npx wrangler queues create aaria-notification-dead-letter`. The Wrangler config binds the first as producer/consumer and routes messages exhausted after five retries to the dead-letter queue.
5. Generate one VAPID key pair with `npx web-push generate-vapid-keys`. Keep the private key in a password manager or other owner-controlled secret store. Set Worker variables `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` (an owner-approved contact URI), and `PARENT_CONSENT_MODEL_APPROVED=false`. Set Worker secrets `VAPID_PRIVATE_KEY`, `ADMIN_TOKEN`, and `CONSENT_SIGNING_SECRET` using Cloudflare's Worker secrets UI or `npx wrangler secret put <NAME>`. The public key remains hidden by `/v1/config` while consent approval is false; private keys and administrative/signing tokens must remain secret.
6. Deploy from `notifications-worker/` with `npx wrangler deploy`; record the exact Worker URL. Confirm `GET <Worker URL>/v1/config` returns a null public key and that consent, subscription, test-send and publish endpoints fail closed while approval is false. Do not enable client enrollment at this stage.
7. In GitHub repository **Settings → Secrets and variables → Actions**, configure:
   - **Variable** `AARIA_NOTIFICATION_WORKER_URL`: exact deployed Worker base URL.
   - **Variable** `AARIA_PARENT_CONSENT_MODEL_APPROVED`: leave unset/false until the actual consent workflow and privacy notice are approved. The same value must be explicitly set to `true` in Worker variables only after approval; otherwise the Worker remains disabled.
   - **Secret** `AARIA_NOTIFICATION_PUBLISH_TOKEN`: the same high-entropy value entered as Worker `ADMIN_TOKEN`.
   Set the exact Worker origin in the app's `connect-src` CSP only when a reviewed client subscription integration is deployed.

### Guardian-consent issuer contract and privacy sign-off

The current Worker accepts only a signed token shaped as `base64url(JSON).base64url(HMAC-SHA256)`, signed over the encoded JSON with `CONSENT_SIGNING_SECRET`. The payload must contain `iss: "aaria-parent-consent"`, `approved: true`, locale `en-GB` or `pt-BR`, a `receiptId` of 1–120 characters, integer `iat` and `exp`; issuance may be at most 60 seconds in the future, expiry must be current, and lifetime cannot exceed 366 days. The same signing secret is configured only in the trusted issuer and Worker. The app must never create or sign its own consent receipt, and an OS permission prompt is not guardian consent.

Before approving the model, the owner/privacy reviewer must identify the controller and applicable jurisdictions; review how the issuer verifies a parent/guardian and withdraws consent; approve receipt lifetime and retention/deletion periods; identify Cloudflare and browser push providers, data transfers, rights/contact and incident handling; and approve the completed EN-GB/PT-BR notice and child-focused privacy assessment. Until all points are signed off, keep `AARIA_PARENT_CONSENT_MODEL_APPROVED` unset and the subscription UI disabled.

After approval, the client still needs a reviewed consent-issuer integration, explicit parent-led flow, explicit user action before calling `Notification.requestPermission()`, subscription refresh/resubscribe handling, authenticated-safe unsubscribe UI, rate/abuse controls, and a test-notification path that never exposes `ADMIN_TOKEN` in client code. Test these on real Android Chrome/PWA and iOS/iPadOS 16.4+ Home Screen installations. Do not claim device acceptance without recorded device evidence.


## Client subscription flow contract

The client lifecycle module is `js/notifications-push-v36.js`. It stays unavailable unless a public runtime configuration sets `window.AARIA_NOTIFICATION_CONFIG = { enabled: true, workerUrl: "https://<approved-worker-host>" }` and an owner-approved consent adapter provides `window.AariaGuardianConsent.requestConsentReceipt({locale,categories})`. Load the adapter before the push lifecycle module. The adapter must conduct the actual guardian-verification process and return its signed receipt; it must not be a local checkbox. No token, VAPID private key or Worker admin token belongs in this runtime configuration.

The client first asks that adapter for a receipt on an explicit button action, fetches the public VAPID key and verifies the receipt with `POST /v1/consent/verify`. Only after server verification does a second explicit button call the browser's permission API and create/update the push subscription. Receipts stay in memory and are re-verified on registration; they are not stored in local storage. Unsubscribe removes the server row when online and always disables the local browser subscription; if the server removal cannot be confirmed, the UI offers retry. A browser-reported subscription change requires a fresh guardian verification and explicit renewal action. The Worker removes expired endpoints when delivery returns HTTP 404 or 410. The client never sends the Worker admin token and has no public push-test endpoint.

Until the approved adapter/configuration and all privacy/security gates exist, the client controls remain disabled and no OS notification prompt is requested. The Worker independently fails closed while `PARENT_CONSENT_MODEL_APPROVED` is unset or false.

### Queue delivery and operational verification

`POST /v1/publish` stores an idempotent release record and queues fan-out; HTTP 202 means queued only. Fan-out reads at most 50 eligible subscriptions at a time, creates one delivery record per announcement and endpoint hash, and queues each delivery. A single delivery consumer invocation processes at most 20 messages; transient push failures retry up to five attempts, 404/410 removes the endpoint, expired consent or changed categories is skipped, and terminal counts are stored in D1. Query `GET /v1/status/<announcementId>` with the Worker admin bearer token to see `queued`, `sent`, or `partial` and aggregate counts. Never use that admin token in the public app. Inspect the Cloudflare Queue dead-letter queue after setup; messages there need owner/operator investigation. A completed “sent” state means the push service accepted the request, not that a device displayed it.
