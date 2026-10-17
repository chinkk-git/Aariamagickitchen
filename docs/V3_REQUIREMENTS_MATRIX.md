# V3 Requirements Traceability Matrix
States: NOT STARTED / IN PROGRESS / BLOCKED / VERIFIED. Link actual code/test/evidence during implementation. Audit basis: `feature/platform-v3` commit `b057f8603f7950f5e5b5699732a346ee9e453f25`; source inspection only, no Android build/device verification.

| ID | Requirement | Responsible area | Required evidence | State |
|---|---|---|---|---|
| R001 | Brand My Magical Kitchen throughout app | WP00 | UI screenshots + app label | NOT STARTED |
| R002 | Audience 8–12 inclusive language | WP00/WP09 | content review | NOT STARTED |
| R003 | Onboarding name + CHEF_A/CHEF_B only | WP00 | UI + persistence tests | NOT STARTED |
| R004 | No gender field collected | WP00 | schema/privacy audit | NOT STARTED |
| R005 | Multiple isolated local profiles | WP00/WP04 | profile isolation tests | NOT STARTED |
| R006 | Legacy Aaria data migration | WP00/WP04 | migration comparison | NOT STARTED |
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
| R025 | APK signer/package/version continuity and adult confirmation | WP06 | source has applicationId `com.aaria.magickitchen.pilot`, versionCode 5; workflow builds debug APK; release signing/upgrade tests absent | IN PROGRESS — identity/version source inspected; signer continuity unverified |
| R026 | Atomic update activation and rollback | WP05 | crash/disk-full tests | NOT STARTED |
| R027 | WebView release hardening and least privilege | WP02 | `MainActivity.kt` source audit; explicit Safe Browsing, mixed-content, navigation allowlist and release security tests still needed | IN PROGRESS — partial settings inspected; release gate open |
| R028 | Transactional Aaria-to-multiprofile migration | WP00/WP04 | idempotency/integrity tests | NOT STARTED |

## Evidence boundary

The `IN PROGRESS` labels above mean source-level work/evidence exists; they do not mean a requirement passed. `feature/platform-v3` includes a debug-APK workflow and an Android pilot, but this session did not run CI, build, or device tests. Content update authentication, profile migration, anti-rollback, and signed upgrade behavior remain `NOT STARTED` until implementation and tests are linked.
