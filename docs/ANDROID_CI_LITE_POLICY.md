# AARIA-ANDROID-CI-LITE-001

**Status:** Permanent owner-approved Android CI policy  
**Scope:** V3.5 and future Aaria Android versions  
**Cost target:** Zero-cost GitHub-hosted CI only

## Routine Android build acceptance

Routine CI must remain short and functional:

1. Build the Android app and package the current application content.
2. Run the focused source and adapter checks needed for the changed app/content paths. V3.5 content checks stay scoped to the international catalogue and shared country mapping; full G3 regression is not a routine build requirement.
3. Assemble an installable review APK and record its package identity, version, signer fingerprint and SHA-256.
4. On the V3.5 branch, install the APK with replacement enabled, launch the main Activity, confirm the WebView DevTools endpoint is ready, exercise Home, Settings, World and representative country routes, verify All Recipes exposes 116 unique records, open canonical recipe #116, and check focused fatal/ANR/renderer-crash logs.
5. Capture bounded logcat and process diagnostics only when a smoke check fails.

The current smoke runner is `tools/v3/run-v35-android-smoke.sh`; its route assertions live in `tools/v3/smoke-v35-android.mjs`.

## Screenshots

Automated screenshot capture, image comparison and snapshot generation are not required or run by routine Android CI. Capture screenshots only when the owner explicitly requests visual debugging.

## Duplicate run protection

The Android workflow uses a concurrency group keyed by workflow and source SHA, with cancellation disabled. A lightweight preflight checks prior runs of this workflow for the same SHA and skips duplicate APK assembly. A GitHub Actions read-only token is used only for that run lookup.

## Content validation scope

Run focused recipe, localization, country-mapping and artwork checks when their source data, manifests, artwork or dependent validators change. Keep these checks scoped to relevant content and routes. Do not repeat unchanged original-recipe audits or full screenshot/G3 regressions as part of routine APK CI. For release-candidate acceptance, retain the required exact catalog and shared country-map evidence.

## Release safety

CI-lite does not waive production release requirements:

- Preserve the authorized package ID and production signing certificate.
- Keep production signing inputs in protected CI secrets; never print or commit credentials.
- Verify production signer identity, APK hash and version code before acceptance.
- Verify data-preserving upgrade behavior over the authorized V3.4 baseline before claiming upgrade safety.
- Keep A08 child safety, A09 child experience, accessibility, security, nutrition/allergens and artwork-rights decisions separate. Never mark unverified or independently reviewed gates as passed.
- Do not merge to main, alter production pages or publish a production release without owner authorization.

An already-running workflow is never cancelled just to change CI policy. A policy-only commit may use `[skip ci]`; the next eligible Android build uses this policy.
