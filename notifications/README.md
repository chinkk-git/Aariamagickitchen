# Aaria V3.6 Magical Notifications — staged foundation

## Branch and release boundary

This feature is isolated on `feature/v3.6-magical-notifications`, based on main at `f1debf7e5db8afc434d5b3e1b7c403f11bc6b19f`. Production is not changed. The notification feature must remain unavailable until backend configuration and privacy consent are ready.

## Proposed service architecture

- GitHub Pages continues to host the app and service worker.
- A Cloudflare Worker provides a small authenticated Web Push API; Cloudflare D1 stores only push endpoint/key material, locale, category preferences and consent validity, plus idempotent announcement records.
- VAPID private key, subject and publishing token are Worker secrets. Never put them in app assets.
- GitHub Actions publishes only after the existing production deployment succeeds. It supplies a unique announcement ID and exact production SHA; the Worker rejects duplicate IDs.
- The app uses standard Push API and a user-initiated permission flow. iOS/iPadOS delivery is limited to supported Home Screen web apps; ordinary Safari tabs and third-party in-app browser contexts must show installation guidance.

## Important implementation gates

1. Cloudflare account/resources and secrets do not exist in this workspace. Worker deployment and delivery cannot be tested until the owner creates or authorizes free Cloudflare resources and configures secrets.
2. This is a child-directed app. Device permission is not parental consent. Before enabling subscription, the owner must approve a consent workflow that meets applicable laws and provides a verifiable consent receipt; the current client deliberately leaves remote subscribe disabled. The Worker rejects registration without a receipt. This scaffold does not claim legal compliance.
3. Text Size deep linking is deliberately gated. Enable only after the separate V3.5 Font Size PR is merged and production deployment is confirmed. Then sync the branch, connect the route event, and test all five sizes.
4. Keep announcement publication disabled until release CI can prove the exact production SHA and relevant feature/recipe IDs are live.

## Subscription data and retention

The schema contains no name, age, email, account ID, location, or tracking identifier. The endpoint is a delivery address and is treated as sensitive. Retain only while subscribed; delete immediately on unsubscribe or push-service 404/410. Announcement history is non-user-specific and idempotent by ID. Operational logs should include counts/status only, never endpoints or payload contents.

## Initial release

No Text Size announcement is configured or sent in this branch. No push notifications can be delivered before a consent workflow, provider credentials, and release-gated publisher are configured.
