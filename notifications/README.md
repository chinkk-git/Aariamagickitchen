# Aaria V3.6 Magical Notifications — staged foundation

## Branch and release boundary

This work is isolated on `feature/v3.6-magical-notifications`. The deployed Font Size responsive hotfix `dcf0301ea0c2c3a896e67805ae1957b2ca1f0042` is integrated into this branch; production has not received the notifications feature. Wrangler config explicitly sets `PARENT_CONSENT_MODEL_APPROVED=false`. Push remains fail-closed until an owner/privacy-approved protected change sets it to `true`; otherwise the Worker does not expose the public VAPID key, verify consent, accept subscriptions, permit test sends or publish announcements.

## Proposed service architecture

- GitHub Pages remains the app host and serves the standard service worker.
- A Cloudflare Worker provides the authenticated Web Push API. D1 stores endpoint/key material, locale, category preferences, a signed-consent receipt hash and expiry, and per-announcement delivery state keyed by a one-way endpoint hash. Cloudflare Queues split fan-out into 50-subscription pages and process no more than 20 delivery messages per consumer batch; duplicate delivery messages are suppressed by a unique announcement/endpoint-hash record. Consent is rechecked immediately before delivery, and an hourly bounded cleanup removes expired consent subscriptions even when there are no announcements.
- VAPID private key, consent-signing key and publisher token stay in Worker secrets. Never include them in public application code.
- A `deployment_status` GitHub Actions workflow compares deployed `manifest.json` versions, creates bilingual drafts from new recipe IDs/countries/approved feature metadata, and queues them only for a successful Pages deployment. Worker announcement IDs and recipient delivery records make deployment retries idempotent. The authenticated `/v1/status/{announcementId}` route reports final accepted/failed/removed/skipped counts after asynchronous processing; queue acceptance is not proof of device delivery.
- Push subscriptions require a cryptographically signed guardian-consent receipt. The client cannot self-assert parental consent. No receipt issuer exists yet, so subscription creation currently fails closed.
- PR #78 and production hotfix PR #80 are merged; current deployed baseline is `dcf0301ea0c2c3a896e67805ae1957b2ca1f0042`. The notification branch includes Settings → Accessibility → Text Size deep linking, the notification interface, and focused route/scale browser checks.
- The PWA identity is intentionally unchanged (`id: ./`, `scope: ./`, `start_url: ./index.html`). The Worker uses the existing install scope and the compatible `aaria-web-v3.5-85f537591449-r2` cache key expected by the deployed V3.5 page adapter. Activation does not delete caches or navigate/reload open clients. A new app version can be used on the next ordinary launch; when a running new adapter needs a restart it offers an optional Restart now/Later prompt. The focused workflow simulates an install from the deployed baseline, checks preserved `aariaPrivateKitchenV4`, text size and notification preferences, upgrades the worker, and reopens the same app scope. This is automated browser evidence only; it does not replace physical Android/iOS tests.

## iOS/iPadOS and browser support

Web Push is supported on iOS/iPadOS 16.4+ for Home Screen web apps. A regular Safari tab or an in-app browser must not be represented as a supported background-push installation. The settings screen provides in-app-browser guidance. Android support depends on a standards-compatible browser and explicit permission. Device-level tests remain outstanding.

## External setup still required

1. Owner creates/authorizes a Cloudflare Free account, Worker, D1 database and two Queues; this branch does not create an account or activate paid services.
2. Configure the D1 database ID, deploy the Worker, and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `ADMIN_TOKEN`, and `CONSENT_SIGNING_SECRET` in Worker settings/secrets.
3. Select/approve a verifiable guardian-consent mechanism and deploy its signed receipt issuer. Do not set `AARIA_PARENT_CONSENT_MODEL_APPROVED=true` until privacy/legal review confirms the actual flow and notice.
4. Add repository variable `AARIA_NOTIFICATION_WORKER_URL`, variable `AARIA_PARENT_CONSENT_MODEL_APPROVED`, and secret `AARIA_NOTIFICATION_PUBLISH_TOKEN`. Allow only the exact Worker hostname in the app CSP when client subscription is enabled.
5. Complete the trusted consent-issuer integration, privacy approvals, operational abuse/rate controls and external deployment tests. The device test route is guarded by a fresh signed receipt, an active matching subscription, an allowlisted in-app route and a per-device cooldown; it does not use or expose the admin token.

## Free-tier capacity (current Cloudflare docs)

Cloudflare currently lists Workers Free at 100,000 requests/day and 50 external subrequests per invocation. D1 Free lists 5 million rows read/day, 100,000 rows written/day and 5 GB total storage. Queues are available on Free with 10,000 operations/day and 24-hour message retention. Delivery is bounded to 20 push attempts per Queue consumer invocation; this code does not offer an SLA. Exhausted delivery/fan-out messages go to a second consumer that marks the delivery or announcement partial in D1; monitor that consumer, the queue backlog and quotas. Do not switch to a paid plan without approval.

## Data minimization and retention

The schema contains no name, age, email, account ID or location. Push endpoints, key material and endpoint hashes are sensitive delivery data. Delete subscriptions on unsubscribe or push-service HTTP 404/410. Delivery history stores only announcement ID, endpoint hash, category, state, timestamps, attempt count and numeric error code; keep operational logs to aggregate counts/status and never log endpoints, keys, receipts, or payload contents. The owner/privacy reviewer must approve and configure a delivery-history retention/cleanup period before production.

## Initial release

The deployed Text Size feature is eligible for a bilingual announcement draft, but no announcement has been sent. No remote push can be delivered until the provider, VAPID secrets, signed guardian-consent issuer and repository secrets are configured. No Android/iPhone/iPad device PASS is claimed.


## Owner setup runbook — do not perform until approved

The following uses Cloudflare's Free plan only. The owner creates the account/resources and enters secrets directly into Cloudflare/GitHub; never paste secret values into a commit, issue, chat, or the public Pages app.

1. In a trusted terminal, from `notifications-worker/`, install the declared package dependencies with `npm install`.
2. Create the database: `npx wrangler d1 create aaria-notifications`. Copy the returned database ID directly into `d1_databases[0].database_id` in `wrangler.toml`; do not commit the ID as a secret (it is a resource identifier).
3. Apply all four D1 migrations once with `npx wrangler d1 migrations apply aaria-notifications --remote`.
4. Create the free Queue resources: `npx wrangler queues create aaria-notification-delivery` and `npx wrangler queues create aaria-notification-dead-letter`. Wrangler config binds the delivery queue as producer/consumer, routes messages exhausted after five retries to the dead-letter queue, and adds a bounded dead-letter consumer that records terminal delivery/fan-out errors.
5. Generate one VAPID key pair with `npx web-push generate-vapid-keys`. Keep the private key in a password manager or other owner-controlled secret store. Set Worker variables `VAPID_PUBLIC_KEY` and `VAPID_SUBJECT` (an owner-approved contact URI). Wrangler config sets `PARENT_CONSENT_MODEL_APPROVED=false`; do not change it until owner/privacy approval and protected review authorize enabling the service. Set Worker secrets `VAPID_PRIVATE_KEY`, `ADMIN_TOKEN`, and `CONSENT_SIGNING_SECRET` using Cloudflare's Worker secrets UI or `npx wrangler secret put <NAME>`. The public key remains hidden by `/v1/config` while consent approval is false; private keys and administrative/signing tokens must remain secret.
6. Deploy from `notifications-worker/` with `npx wrangler deploy`; record the exact Worker URL. Confirm `GET <Worker URL>/v1/config` returns a null public key and that consent, subscription, test-send and publish endpoints fail closed while approval is false. Do not enable client enrollment at this stage.
7. In GitHub repository **Settings → Secrets and variables → Actions**, configure:
   - **Variable** `AARIA_NOTIFICATION_WORKER_URL`: exact deployed Worker base URL.
   - **Variable** `AARIA_PARENT_CONSENT_MODEL_APPROVED`: leave unset/false until the actual consent workflow and privacy notice are approved. It is not a substitute for the Worker-side protected approval flag.
   - **Secret** `AARIA_NOTIFICATION_PUBLISH_TOKEN`: the same high-entropy value entered as Worker `ADMIN_TOKEN`.
   Set the exact Worker origin in the app's `connect-src` CSP only when a reviewed client subscription integration is deployed.

### Guardian-consent issuer contract and privacy sign-off

The current Worker accepts only a signed token shaped as `base64url(JSON).base64url(HMAC-SHA256)`, signed over the encoded JSON with `CONSENT_SIGNING_SECRET`. The payload must contain `iss: "aaria-parent-consent"`, `approved: true`, `guardianVerified: true`, an opaque stable `guardianId` (20–256 characters), `deviceManagement: true` for enrollment/dashboard actions, locale `en-GB` or `pt-BR`, a `receiptId` of 1–120 characters, integer `iat` and `exp`; issuance may be at most 60 seconds in the future, expiry must be current, and lifetime cannot exceed 366 days. The Worker stores only SHA-256 hashes of the receipt and guardian identifier. The same signing secret is configured only in the trusted issuer and Worker. The app must never create or sign its own consent receipt, and an OS permission prompt is not guardian consent. No trusted issuer or legal/privacy approval exists yet, so push remains disabled.

Before approving the model, the owner/privacy reviewer must identify the controller and applicable jurisdictions; review how the issuer verifies a parent/guardian and withdraws consent; approve receipt lifetime and retention/deletion periods; identify Cloudflare and browser push providers, data transfers, rights/contact and incident handling; and approve the completed EN-GB/PT-BR notice and child-focused privacy assessment. Until all points are signed off, keep `AARIA_PARENT_CONSENT_MODEL_APPROVED` unset and the subscription UI disabled.

After approval, the client still needs a reviewed consent-issuer integration, explicit parent-led flow, explicit user action before calling `Notification.requestPermission()`, subscription refresh/resubscribe handling, authenticated-safe unsubscribe UI and rate/abuse controls. The guarded test path uses a fresh signed guardian receipt tied to the active device subscription, sends only fixed localized test text to an allowlisted in-app route, and permits at most one test per device per minute. It never accepts arbitrary notification text or exposes `ADMIN_TOKEN` in client code. Test these on real Android Chrome/PWA and iOS/iPadOS 16.4+ Home Screen installations. Do not claim device acceptance without recorded device evidence.

### Android PWA live acceptance procedure

Run this only after the guardian-verification issuer, privacy approval, Worker/D1/Queues/VAPID setup and approved client adapter are in place. Until then, leave the Wrangler and repository approval flags false; no subscription or notification permission prompt should be available.

1. On a supported Android phone, open the production HTTPS origin in Chrome, install Aaria from Chrome's install flow, and launch it from the Home Screen/app icon. Record Android version, Chrome version, installed app identity and tested release SHA. Do not copy the push endpoint or consent receipt into an issue or chat.
2. In Settings → Notifications, select categories. A parent/guardian completes the approved consent flow. Tap **Enable or update push notifications** to reach the OS permission prompt; grant it. Confirm status says this device is subscribed.
3. Select the **Notifications** test destination and tap **Send test notification**. The app obtains a fresh signed receipt, refreshes this device's subscription, then calls the Worker without an admin token. Put Aaria in the background and repeat after fully closing it. Confirm one localized test notification appears; tap it and verify Aaria focuses/launches to Notifications.
4. Select **New recipes 111–116** and send a test. Background/close the app, tap the notification, and verify the New Recipes screen contains exactly IDs 111–116. Select **Accessibility · Text Size**, repeat, and verify Settings → Accessibility → Text Size opens. Test **What's New** the same way. Wait at least 60 seconds between test sends; the Worker returns HTTP 429 during the per-subscription cooldown.
5. Verify the notification's route is consumed on cold start and does not redirect to Home. At Text Size, check 100%, 125%, 150%, 175% and 200%, then return to the app. Repeat in EN-GB and PT-BR if both profiles are available.
6. Disable notifications in Aaria, confirm the local browser subscription is removed and the Worker returns success; resubscribe only after a new guardian-consent step. Record pass/fail, timestamps, route, locale, device/browser versions and observed screen. Redact endpoint/key/receipt/token values from all evidence.

The procedure verifies a real Android device only when these steps are actually performed and evidence is recorded. The automated browser route test is not proof of Android background delivery. The same consent/setup gates apply to physical iPhone/iPad Home Screen testing; no iOS device result should be inferred from Android evidence.

### Required zero-reinstall device upgrade procedure

Start with Aaria already installed from the current production deployment on the same Android/iPhone/iPad. Record the production manifest ID, scope and start URL, but do not uninstall, clear site data, or remove the Home Screen icon. Before the candidate release, record a small set of existing recipe progress, a favorite, any My Creations/Planner entry available on that test profile, language, and text size. Open the existing installed app while online and let it receive the candidate release. If it offers **Restart now**, verify **Later** keeps the running app usable, then choose restart when ready. Confirm the Home Screen icon still opens the same app identity and that every recorded value is unchanged. Confirm the inbox/settings appear in that same install, authorize one adult test device through the approved consent issuer, background the app, send the one-device test, tap it, and verify recipe #112; record provider acceptance separately from observed display and route. Repeat after a full close/relaunch, in EN-GB and PT-BR. Complete separately on Android Chrome/PWA, iPhone Home Screen web app, and iPad Home Screen web app. No reinstall or data clearing is permitted.

The CI upgrade simulation starts from the frozen deployed source tree and updates the same browser origin/scope without uninstalling or clearing storage. It verifies app identity, the installed data keys, and that service-worker activation does not force a navigation. It does not emulate Android/iOS operating-system installation, permission prompts, background delivery, push providers, or device tap behavior. Physical device evidence remains required for those claims.


## Client subscription flow contract

The client lifecycle module is `js/notifications-push-v36.js`. It stays unavailable unless a public runtime configuration sets `window.AARIA_NOTIFICATION_CONFIG = { enabled: true, workerUrl: "https://<approved-worker-host>" }` and an owner-approved consent adapter provides `window.AariaGuardianConsent.requestConsentReceipt({locale,categories})` plus `requestGuardianManagementReceipt({locale,purpose})`. Load the adapter before the push lifecycle module. The adapter must conduct the actual guardian-verification process and return a signed receipt; it must not be a local checkbox. No token, VAPID private key or Worker admin token belongs in this runtime configuration.

The client first asks that adapter for a receipt on an explicit button action, fetches the public VAPID key and verifies the receipt with `POST /v1/consent/verify`. Only after server verification does a second explicit button call the browser's permission API and create/update the push subscription. Receipts stay in memory and are re-verified on registration; they are not stored in local storage. Unsubscribe removes the server row when online and always disables the local browser subscription; if the server removal cannot be confirmed, the UI offers retry. A browser-reported subscription change requires a fresh guardian verification and explicit renewal action. The Worker removes expired endpoints when delivery returns HTTP 404 or 410. The test button requires a fresh signed receipt, refreshes the consent-bound subscription, sends only static localized content to an allowlisted route and is limited to one test per device per minute. The client never sends the Worker admin token.

Until the approved adapter/configuration and all privacy/security gates exist, the client controls remain disabled and no OS notification prompt is requested. The Worker independently fails closed while `PARENT_CONSENT_MODEL_APPROVED` is unset or false.

### Guardian device management and first magical notification

Each enrolled endpoint is linked to one random persistent device ID, a guardian-entered device name, platform class, OS permission status and signed-consent expiry. The guardian dashboard lists only devices that have registered through this flow; it cannot discover installed but unregistered PWAs. Device ownership is checked server-side. Last contact is updated only when that device's active subscription calls the Worker heartbeat endpoint. Revocation deletes the associated subscription and marks the registry entry revoked.

The first magical notification is a single fixed release message to one explicitly selected active device, with destination `/recipe/112`. The Worker inserts one globally unique `aaria-first-vietnam-tofu-pho-112-v1` send record before delivery; repeated requests return HTTP 409 and do not send again. The Worker records push-service acceptance separately from parent-observed receipt/navigation. The confirmation endpoint records a result reported by the guardian; it is not device telemetry and must not be represented as independently verified delivery. If canonical recipe #112 cannot be opened, the route falls back to `/world/VNM`. EN-GB/PT-BR fixed messages are in the Worker. The first send control remains hidden unless the configured guardian-management adapter returns a valid scoped receipt and all server-side release gates are approved.

### Official notification icon and Android badge

Push notifications set `icon` to the exact existing manifest asset `./aaria-pwa-icon-192.png` (manifest purpose `any`); the service worker's core cache includes it so the same URL remains available across worker upgrades/offline startup. No icon was generated or substituted. The current approved manifest/assets contain no monochrome badge variant, so `badge` is omitted rather than using the full-colour application icon as an Android monochrome badge. If an approved monochrome asset becomes available, add its manifest/cache path and update the icon contract. Verify actual rendering on Android and supported iOS Home Screen devices; browser automation does not prove OS-level icon rendering.

### Queue delivery and operational verification

`POST /v1/publish` stores an idempotent release record and queues fan-out; HTTP 202 means queued only. Fan-out reads at most 50 eligible subscriptions at a time, creates one delivery record per announcement and endpoint hash, and queues each delivery. A single delivery consumer invocation processes at most 20 messages; transient push failures retry up to five attempts, 404/410 removes the endpoint, expired consent is removed by an hourly cursor-based cleanup queue, changed categories are skipped, and terminal counts are stored in D1. The DLQ consumer marks a delivery or announcement partial after infrastructure retries are exhausted. Query `GET /v1/status/<announcementId>` with the Worker admin bearer token to see `queued`, `sent`, or `partial` and aggregate counts. Never use that admin token in the public app. Monitor both queues' backlog and the DLQ consumer; a completed “sent” state means the push service accepted the request, not that a device displayed it.
