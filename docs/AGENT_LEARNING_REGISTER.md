# Agent Learning Register
Evidence-based learning register. First verified process finding recorded 2026-10-17; no model-weight retraining is implied.

| Date | Incident/task | Root cause and evidence | Change made | Regression test | Reviewer | Metric before/after | Commit |
|---|---|---|---|---|---|---|---|
| 2026-10-17 | V3 docs/bootstrap audit | The V3 requirements package was only in the uploaded ZIP; audited `feature/platform-v3` tree (179 entries, SHA `b057f8603f7950f5e5b5699732a346ee9e453f25`) had no root `docs/` directory. | Add the eight governed V3 docs under root `docs/`; record source audit and evidence boundaries. | GitHub tree check: verify all eight required paths exist and no application files changed in docs commit; reviewer check pending. | Independent governance reviewer confirmed repository inventory and docs review; GitHub tree check pending | Root V3 docs: 0 → 8; no app source changed | Initial docs commit: `7782696666380b8e47d80ca69c1e9370be6ea759`; ledger update commit pending |

## Rules
- Log evidence, not speculation.
- Make process/profile improvements as version-controlled diffs.
- Independent reviewer verifies new tests and absence of degraded safety.
- Revert harmful improvements.
- No model-weight retraining is implied by this register.

| 2026-10-17 | CI evidence classification | Successful run 39036629623 is `assembleDebug`; a green debug workflow was easy to conflate with release/signing readiness. Run metadata and workflow source verified. | Separate debug-pipeline evidence from release acceptance in status and requirements; keep signing/upgrade requirements open. | Status identifies build variant and missing signer/device/security evidence. | Android security auditor | Debug build: PASS; signer/device security: unverified | Captured in docs correction `f18d42469005e09f551364416cd034a3200affc0` |
| 2026-10-17 | WebView allowlist review | Initial implementation used a host-based route check that did not fully account for authority parsing edge cases. Independent review highlighted explicit/malformed port and user-info authority cases. | Centralize exact HTTPS authority and safe path checks in `AppAssetsUrlPolicy`; use it for navigation and resource interception, reject bad paths with local errors. | Five JUnit URL-policy tests pass in CI run 39057437535; includes origin, ports/userinfo, safe/missing assets and traversal/malformed paths. | Independent governance reviewer rechecked branch source; no device integration test yet. | Shared helper, five unit tests; CI runs tests before APK build. | `ee02895aaff8b9f30dd5dbb269076b35896ce61b` |
| 2026-10-17 | Debug signer continuity check | Two successful CI debug APKs came from different run artifacts; relying on debug variant success could suggest signer continuity. | Compare v2-block certificate fingerprints and record exact limits; leave production signer and installed APK continuity unverified. | Run 39036629623: `F3:E0:64:4F:A1:7C:55:7D:A3:EE:81:85:43:6B:CC:38:77:4D:76:AE:E6:17:F1:1C:2A:ED:2A:85:84:2E:28:74`; run 39057437535: `D8:37:E2:2F:2A:FB:17:A6:52:6B:E9:5F:ED:AE:A3:DD:09:7D:BA:15:58:7D:E8:4E:D1:AC:8C:F4:05:5C:AC:D8`. OpenSSL certificate extraction only; `apksigner` unavailable, so not full signature verification. | Independent Android audit | Debug signer continuity: FAIL (certificate identities differ); production/installed identity: unknown. | Recorded in `V3_IMPLEMENTATION_STATUS.md`; details commit pending |

## Follow-up

The eight docs paths and independent documentation review are verified. The WebView change is an Android source/test improvement, not release acceptance. Keep production signing, installed APK comparison, content updates, profile migration, rollback and device testing open.
