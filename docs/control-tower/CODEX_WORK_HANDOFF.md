# Codex / ChatGPT Work coding-worker handoff — acceptance contract

Status: **NOT CONNECTED FOR UNATTENDED DISPATCH** (2026-10-19). This is a protocol for an explicitly launched Codex/Work session, not a claim that GitHub Actions can wake one. Do not store API keys or enable paid AI services.

## Already live-tested
- GitHub issue-label dispatch: Actions 39333088986 SUCCESS.
- Exclusive claim/reject/release: Actions 39342827465 SUCCESS; competing claim rejected; lease released.
- Deterministic Actions worker automatically committed and created draft PR #24: Actions 39343834929 SUCCESS.
- PR #24 deterministic validation: user screenshot confirms all checks passed. This deterministic test **did not use AI**.

## Exact first coding-worker acceptance test
1. Operator opens an eligible Codex/ChatGPT Work coding session with repository access and explicitly assigns **Issue #25** (isolated non-Android test task). One-time start is required unless a supported auto-start integration is installed and independently verified.
2. Worker reads this protocol, Issue #9 and #25; verifies the branch/lease and proves sole ownership before writing.
3. Worker makes one small documented change only on its isolated test branch; creates a **draft** PR through GitHub; links SHA and PR in #25. No application source, APK signing, production branch or secrets touched.
4. GitHub PR CI validates. A separate Control Tower check confirms the change actually implements the issue acceptance contract (not merely a placeholder), the worker identity is authentic, and the task is recorded VERIFIED.
5. Mark **AI WORKER PASS** only if a real Codex/Work session performed the code change. Deterministic Actions scripts cannot substitute for this proof.
6. Unattended dispatch is **separate**: to claim it, show an issue event starting the worker without human Work-session launch. No such path is currently verified.

## Production work
After worker acceptance, keep V3, V3.1 and integration writers separate, use pinned SHAs and leases, require independent A03/A08/A09. Release only independently VERIFIED work, preserve 95 original recipes and installed app, and never distribute an APK built from a failed CI SHA.

## Free-only constraint
Use only existing included/free resources. No paid hosted coding agent, API key, paid runner, extra recurring polling or subscription change. Verify account-level GitHub spending limits separately.
