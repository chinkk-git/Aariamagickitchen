# My Magical Kitchen V3 — Work Start and Continuation Prompts

## Short start prompt (paste into ChatGPT Work)
Use connected GitHub for `chinkk-git/Aariamagickitchen`. I authorize routine documentation/code/PR/merge actions within repository permissions and approved quality gates. Read the attached V3 docs package, create/update its `docs/` files, and treat `docs/AARIA_V3_MASTER_PLAN.md` as binding requirements. Audit existing agent profiles and the approved baseline; do not assume nine persisted agents exist. Establish autonomous Planner→Executor→independent Reviewer→QA→Learning governance in version control, then implement the next eligible V3 work package. Do not ask for routine approvals. Preserve all existing approved recipes and artwork. Record commits, test evidence, defects, lessons and next actions in GitHub. Do not bypass security or claim tests that did not run.

## Short continuation prompt
Resume My Magical Kitchen V3 using `docs/AARIA_V3_MASTER_PLAN.md`, `docs/V3_IMPLEMENTATION_STATUS.md`, `docs/V3_REQUIREMENTS_MATRIX.md` and `docs/AGENT_LEARNING_REGISTER.md` in GitHub. Verify actual repository state, continue next uncompleted task autonomously, test/review/fix/retest, update ledgers and report verified deliverables and genuine blockers only.

## Initial setup instructions
1. Attach/upload `MY_MAGICAL_KITCHEN_V3_DOCS_UPDATED.zip` to Work or make the individual Markdown files accessible. Do not assume Work can retrieve earlier chats or sandbox files.
2. Extract and commit documentation under `docs/` in `chinkk-git/Aariamagickitchen`. Compare against existing docs; preserve relevant existing requirements. Use a working branch, CI and independently reviewed merges as authorized.
3. Read master plan and supporting specifications. Discover and reconcile existing agent definitions; avoid duplicates.
4. Build traceability, inventory assets, protect baseline, then begin implementation. Maintain real test evidence.
5. External Android installation and device-only tests may require a person; describe exact steps rather than fabricating success.

## Boundaries
Autonomy means independent engineering decisions within approved scope, not changing product requirements, disabling Play Protect, committing signing secrets, bypassing Android confirmation, or pretending to operate when Work/CI is not running.

## Mandatory security reference
Read and implement `docs/V3_ANDROID_SECURITY_UPDATE_ARCHITECTURE.md` before building update distribution. Treat signed content verification, signer-preserving APK upgrades, WebView security, non-destructive migrations and Play Protect ON device tests as release blockers until verified.

## Current verified starting point (2026-10-17)

The V3 documents are committed on the working branch; implementation branch `codex/v3-webview-hardening-20261017` contains WebView hardening and passing URL-policy unit tests (CI run 39057437535). The audited baseline had no persisted agent profiles; task-scoped independent audits do not constitute a durable autonomous cluster. Two CI debug APK certificate fingerprints differ; production/installed signer continuity remains unknown. CI run 39057437535 has test artifacts 12110495010 (debug APK) and 12110216216 (HTML), available through 2026-11-16. A proposed legacy-storage key/schema is not verified from the shipped HTML or installed data; confirm it before migration. Continue from the live status and requirements registers. Prioritize trusted signer recovery, transactional profile migration, authenticated data-only content updates and anti-rollback. Do not claim device, release, migration or updater acceptance without evidence.



## Current continuation checkpoint — 2026-10-17
The owner reports the new APK signing key is configured and the signed update test succeeded. Continue from branch `codex/v3-completion-core-20261017`, latest known head `56e08ba321535645953bcc216bfd485125cb922b`. Fixes on this branch address the phone-reported recursive profile-render crash and standalone HTML profile persistence. Local Node syntax and profile reset/persistence tests pass; hosted CI for the latest head and a fresh signed APK from that exact source are still required. Do not use the older signed artifact to claim the chooser fix. Keep the approved V2 baseline and content publisher trust-root work distinct from APK signing.
