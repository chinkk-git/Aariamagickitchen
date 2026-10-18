# Aaria Control Tower — GitHub Orchestration Protocol v1

## Authority and scope
This document is the shared coordination contract for the two Work sessions. GitHub Issues are the task queue and GitHub commits, pull requests, CI logs and artifacts are evidence. A created issue is **not** proof that a Work session received, started or completed it. No background agent is automatically activated by this protocol.

- V3 owner/worktree: `codex/v3-completion-core-20261017` — Android APK, security, signing, profiles, updates, core flows.
- V3.1 owner/worktree: `feature/v3.1-home-redesign` — homepage, map, international recipes, artwork, child experience.
- Control Tower: prioritizes issues, checks branch divergence, dependencies, acceptance criteria, CI, and release gates. No edits to the two development branches from orchestration.
- Stable base: `feature/platform-v3`. Integration occurs only after V3 stable SHA is documented and verified. V3.1 currently descends from V3; recompare before integration.
- Cost: no paid services, subscriptions, third-party paid agents or unapproved infrastructure. GitHub Actions minutes/storage may have quota or billing consequences; use existing workflows, avoid polling/cron by default.

## Task protocol
Every issue must include: `Owner: V3|V3.1|Integration`, `Priority: P0|P1|P2`, `Status: queued|in-progress|blocked|review|verified`, `Depends on: #N|none`, `Branch`, `Acceptance criteria`, and `Evidence`. Prefer issues over branch-specific task files. Link commits/PRs with issue number. Never mark verified on assertion alone.

## Work-session handshake (one-time per session)
At the start of each active Work session: read this file from `main` and the repository's open Control Tower issues; select issues owned by your workstream whose dependencies are verified. Post an issue comment stating `ACK / owner / branch / intended deliverables`. Implement in your own branch. Post `PROGRESS` and `BLOCKED` comments with evidence; attach commits, CI run URLs and artifact references. Close an issue only after acceptance criteria and tests are verified. When there are no actionable issues, report `IDLE` rather than invent work. Re-read issues at natural checkpoints; this is not a continuously running listener.

## Mandatory gates
1. Preserve all 95 approved recipe IDs and their original functionality; inspect the production catalogue before new IDs.
2. Maintain approved Aaria, Mommy, Daddy and Friends artwork, matching production recipe-step style.
3. Child safety A08 and age 8–10 experience A09 must pass; no timers.
4. Offline-first Android APK is primary; English (UK) and pt-BR; no paid services.
5. Signing continuity, secure content updates, profile migration, rollback protection and child-friendly What's New tour.
6. CI success is not equivalent to installation/device QA. Record each separately.

## Status evidence format
`STATUS: queued|in-progress|blocked|review|verified`
`OWNER: V3|V3.1|Integration`
`BRANCH: <branch>`
`COMMIT: <sha or none>`
`CI: <run URL and conclusion or not run>`
`APK: <artifact URL and install result or not tested>`
`A08/A09: <test evidence or pending>`
`BLOCKERS: <specific obstacle or none>`
`NEXT: <one action>`

## Dependency and release policy
- V3 stable Android baseline must be verified before final integration.
- V3.1 can develop independently but must not modify V3's branch.
- World Adventure production content requires an audit of all 95 existing recipes, then duplicate/schema/nutrition/allergen/artwork checks.
- Integration must preserve V3 security/profile/update architecture and pass both automated and device smoke tests.
- No automatic merging, release signing key changes or deployment without required platform/security approvals.
