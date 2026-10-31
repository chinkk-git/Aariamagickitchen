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
