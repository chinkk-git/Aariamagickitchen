# V3 Requirements Traceability Matrix
States: NOT STARTED / IN PROGRESS / BLOCKED / VERIFIED. Link actual code/test/evidence during implementation. Audit basis: `feature/platform-v3` baseline `b057f8603f7950f5e5b5699732a346ee9e453f25`; changes merged via PR #1 at `c8e490fbd45e0631f51ccfff69a27d769028a10f`. Run 39057437535 passed unit tests and debug build; no device tests.

| ID | Requirement | Responsible area | Required evidence | State |
|---|---|---|---|---|
| R001 | Brand My Magical Kitchen throughout app | WP00 | UI screenshots + app label | NOT STARTED |
| R002 | Audience 8–12 inclusive language | WP00/WP09 | content review | NOT STARTED |
| R003 | Onboarding name + CHEF_A/CHEF_B only | WP00 | UI + persistence tests | NOT STARTED |
| R004 | No gender field collected | WP00 | schema/privacy audit | NOT STARTED |
| R005 | Multiple isolated local profiles | WP00/WP04 | profile isolation tests | NOT STARTED |
| R006 | Legacy Aaria data migration | WP00/WP04 | verified shipped-source key/schema, representative fixture, idempotency/integrity checks | NOT STARTED — actual storage key/schema and fixture are not confirmed from the shipped HTML or installed data |
| R007 | Fixed supporting cast M1/D1/F1–F4 | WP03 | character reference and scene QA | NOT STARTED |
| R008 | Both chef variants in applicable scenes | WP03 | scene registry completeness | NOT STARTED |
| R009 | Correct ingredients and finished dishes | WP03 | recipe-to-artwork QA | NOT STARTED |
| R010 | Landscape and tablet layouts | WP02/WP03 | device screenshots/tests | NOT STARTED |
| R011 | Offline recipes and progress | WP04 | airplane-mode tests | NOT STARTED |
| R012 | Authenticated data-only content packs | WP05 | signature/hash/security tests | NOT STARTED |
| R013 | Atomic activation and rollback | WP05 | fault injection | NOT STARTED |
| R014 | Signed APK upgrades preserve data | WP06 | device upgrade test | NOT STARTED |
| R015 | Play Protect ON and parent guide | WP08 | real-device evidence | PARTIAL EVIDENCE |
| R016 | Accurate What's New for each update | WP07 | tour and replay tests | NOT STARTED |
| R017 | Child cooking safety/allergen accuracy | WP09 | content/safety review | NOT STARTED |
| R018 | No cooking timers | ALL | code/UI audit | NOT STARTED |
| R019 | Existing approved features preserved | ALL | baseline regression | NOT STARTED |
| R020 | Autonomous independently reviewed cluster | WP11 | agent files, CI, audit log | IN PROGRESS — session-scoped independent audit/review used; persisted profiles not found in audited tree |
| R021 | Continuous learning with validation | WP11 | learning register + tests | NOT STARTED |
| R022 | Verified signed family release | WP10 | build provenance + QA | NOT STARTED |

| R023 | Content manifest authenticated with bundled public key | WP05 | tamper/wrong-key/replay tests | NOT STARTED |
| R024 | Content packs reject scripts, traversal and decompression bombs | WP05 | negative security tests | NOT STARTED |
| R025 | APK signer/package/version continuity and adult confirmation | WP06 | package/version source; release APK signer lineage; installed APK comparison; upgrade/device tests | IN PROGRESS — package/version inspected; two CI debug artifact certificates differ (runs 39036629623 and 39057437535); production/installed signer and upgrade remain unverified. Certificate fingerprints were extracted from v2 blocks but APK signatures were not fully verified (`apksigner` unavailable). |
| R026 | Atomic update activation and rollback | WP05 | crash/disk-full tests | NOT STARTED |
| R027 | WebView release hardening and least privilege | WP02 | `MainActivity.kt`, `AppAssetsUrlPolicy.kt`, `AppAssetsUrlPolicyTest.kt`; CI run 39057437535; bridge/navigation device tests | IN PROGRESS — mixed content, Safe Browsing, file URL access, debuggable-only inspection, and exact appassets origin/path policy implemented; five unit tests and CI pass. Bridge-origin/runtime/device review remains open. |
| R028 | Transactional Aaria-to-multiprofile migration | WP00/WP04 | idempotency/integrity tests | NOT STARTED |

## Evidence boundary

`IN PROGRESS` means partial work/evidence exists, not acceptance. CI run 39057437535 passed the WebView URL-policy unit tests and debug build; debug APK and HTML artifacts 12110495010/12110216216 are available through 2026-11-16. No device tests were run. Content authentication, migration, anti-rollback, and signed upgrade behavior remain `NOT STARTED` until implemented and tested.
