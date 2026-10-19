# Delivery governance — enforceable contract (GOV-01 through GOV-05)
Version 1 | 2026-10-18 | Proposed coordination change; effective only after review and merge to main.

## Inventory and reuse decisions
| Existing source | Reuse | Gap addressed |
|---|---|---|
| docs/CONTROL_TOWER_PROTOCOL.md | Authority, issues #4–#7, branch ownership, gates | Define explicit completion/approval semantics |
| docs/control-tower/SESSION_PROTOCOL.md | ACK, checkpoints, single writer, handover | Do not create another session protocol |
| docs/control-tower/ADAPTIVE_SESSION_LIFECYCLE.md | Session health/rotation review | No fake session liveness or automatic chat restart |
| docs/control-tower/A10_RECOVERY.md | Hourly monitoring, retry ledger and budgets | Exception-only output, on-demand dashboard |
| docs/control-tower/V3_HANDOVER.md and V31_HANDOVER.md | Workstream snapshots | Do not duplicate status tables |
| GitHub issues #4/#5/#6/#7 | Authoritative task queue and integration dependencies | No second backlog |
| Existing CI | Build and regression evidence | Require device, visual and independent review evidence separately |

## GOV-01 — Delivery authority
Control Tower is the **single delivery coordinator**, not an extra autonomous writer. Product owner owns priorities, visual direction and release acceptance; V3 owns `codex/v3-completion-core-20261017`; V3.1 owns `feature/v3.1-home-redesign`; integration owns #7 after dependencies are verified. A08 and A09 remain independent mandatory reviewers. A10 observes and performs only the narrow recovery actions in its existing protocol; it cannot approve scope, close security gates, merge, sign or publish. Use existing issues as the queue. Each task must have owner, issue, branch, dependency, acceptance and evidence. Acknowledgement is not a branch lock.

## GOV-02 — Definition of Done and evidence
States: QUEUED -> IN_PROGRESS -> REVIEW -> VERIFIED; BLOCKED may be entered from any nonverified state. A CI success does **not** mean VERIFIED.
Every verification checkpoint must specify:
- `ISSUE`, `OWNER`, `BRANCH`, `HEAD_SHA`, `ACCEPTANCE_CRITERIA`, `CHANGED_PATHS`, `CI_URL`, `CI_CONCLUSION`
- `APK_ARTIFACT`, `APK_SIGNER_CLASS` (debug/production/unknown), `DEVICE_TEST` (pass/fail/not-run), `REGRESSION` (pass/fail/not-run), `VISUAL_REVIEW` (pass/fail/not-applicable/not-run)
- `A08`, `A09` (pass/fail/pending/not-applicable with rationale and evidence), `SECURITY_GATES` (pass/fail/pending/not-applicable), `BLOCKERS`, `NEXT`.
Missing proof must be `NOT VERIFIED`, not silently interpreted as PASS. CI evidence must match the recorded commit SHA. A debug APK cannot prove production-signer continuity. V3 security/update/profile work needs device and relevant security evidence; V3.1 visuals need screenshot comparison and A09; recipes need A08 allergen/safety and A09 review. Release #7 requires both streams verified, real Android acceptance, signing continuity, rollback and user-authorized release. Never relax tests to produce a green build.

## GOV-03 — Artwork provenance and coverage
Reuse existing runtime manifests and IDs, not a new asset database. For each original recipe ID 1–95 and asset role (dish, hero, step atlas, ingredients/tools where required), classify independently:
- GENERATED: file created, not necessarily wired;
- MAPPED: referenced by catalogue/manifest;
- INTEGRATED: included in APK/runtime and renders at intended route;
- VISUALLY_VERIFIED: screenshot checked against approved character, scene, safety and ingredients;
- APPROVED: A09 and applicable A08 acceptance recorded with evidence.
These are stages, not synonyms. Count unique IDs per role and stage. Report numerator/95 and separately any draft IDs 96+; do not include drafts in 95 denominator. Missing artwork, placeholders, untracked files and duplicate IDs must be visible. Never infer APPROVED from fallback thumbnail or CI packaging alone. Existing V3.1 handover reported 37 structured hero/atlas bundles, five fallback thumbnails and missing IDs 89/93/94 as a point-in-time snapshot; re-audit live manifest before publishing current counts.

## GOV-04 — Scope freeze and integration
V3 scope: APK baseline, profiles/migration, signer continuity, secure content packs, rollback, offline core, parent-confirmed updates, guided What's New and regression. V3.1 scope: approved magical home, original characters, recipe scenes, world map/passport and gated candidate content. New enhancements go to future backlog; only defect fixes, safety/security corrections and already-approved acceptance gaps enter current scope. No cross-branch edits. Integration #7 only after #4–#6 verified and current branch divergence reviewed; record source SHAs, merge conflicts, regression, security, A08/A09, device and APK evidence. Never auto-merge or alter signing keys.

## GOV-05 — A10 exception-driven monitoring
Retain existing hourly automation and its strict retry budget. Normal hourly output: concise `A10 | V3 <state> | V3.1 <state> | CI <state> | ACTION <none/one item>`; do not generate the full project dashboard hourly. On new blocker, suspected stall, eligible transient retry or approval need, include evidence URL and explicit next action. On user command `A10 status`, reconstruct the full dashboard from current GitHub issue/commit/CI/artifact data; show release readiness, artwork stages, A08/A09, recovery health and top three priorities. GitHub inactivity is not proof of Work session failure. A10 cannot start a new Work session. Keep existing one-per-run/two-per-branch-per-24h retry constraints, evidence ledger and no-cost checks.

## Governance acceptance simulations
1. Green CI but no Android device test -> REVIEW / NOT VERIFIED.
2. Generated and mapped artwork but no APK render or A09 -> not APPROVED.
3. V3.1 branch change to V3 security files -> reject ownership violation and escalate.
4. CI screenshot assertion fails -> no A10 retry; development fixes assertion root cause.
5. Transient emulator provisioning failure with evidence and budget -> one eligible A10 retry only after ledger entry.
6. No GitHub activity for 60m -> SUSPECTED STALLED, not confirmed Work failure.
7. Integration attempted before #4–#6 verified -> BLOCKED.
8. A10 status -> full on-demand dashboard; routine heartbeat -> concise exception-only report.

## Rollout and validation
This is a governance-only change. Review the existing workflow files and live manifests before introducing automation. Validate these eight cases in a nonproduction dry run; attach issue evidence. Do not modify V3/V3.1 implementation branches, deploy, merge, rotate sessions or provision credentials as part of governance adoption.
