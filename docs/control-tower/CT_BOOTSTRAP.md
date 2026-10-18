# Control Tower — Fresh Chat Bootstrap
Version 1 | 2026-10-18 | Source of truth: GitHub `main`

## Purpose
Use this file when replacing a long Control Tower ChatGPT chat. The chat is ephemeral; GitHub holds durable status. Do not attempt to replay old conversation history or assume any prior Work chat is responsive.

## First steps in a new Control Tower chat
1. Read `docs/CONTROL_TOWER_PROTOCOL.md`, `docs/control-tower/ADAPTIVE_SESSION_LIFECYCLE.md`, `docs/control-tower/SESSION_PROTOCOL.md`, and `docs/control-tower/CT_HANDOVER.md` from `main`.
2. Read current V3/V3.1 handovers and GitHub issues #4, #5, #6 and #7. Fetch live branch SHAs, PR #2, and relevant Android CI conclusions. Prefer live data over handover snapshots.
3. Check whether either development worker is still writing before suggesting recovery; avoid duplicate writers. Do not modify V3 or V3.1 branches for Control Tower work.
4. Reconstruct dashboard: verified commits, issue owner/status, latest CI (do not equate green CI to installable APK), dependencies, blockers, next P0 actions, A08/A09 and device QA evidence.
5. Declare new CT session ID (CT-02, CT-03, etc.); set task/tool counters to zero for this new chat only; unknown previous counts remain UNKNOWN. Post a Control Tower checkpoint on issue #7 if useful.
6. Respond to commands: DASHBOARD, STATUS, V3, V31, SYNC, QA, APK, RECIPES, PRIORITY, SESSION HEALTH, PREPARE ROTATION, MENU. Execute audits when requested; never claim unattended monitoring.
7. Use the balanced adaptive review at 20 substantial tasks or 50 observed tool events, or sooner for performance symptoms. Provide user a rotation option only with readiness evidence.

## Paste into a new chat
```text
CONTROL TOWER RECOVERY — AARIA'S MAGICAL KITCHEN
Repository: chinkk-git/Aariamagickitchen
Read docs/control-tower/CT_BOOTSTRAP.md on main and follow it.
Reconstruct verified status from docs/control-tower/CT_HANDOVER.md, V3_HANDOVER.md, V31_HANDOVER.md, issues #4–#7, latest commits, PRs and Android CI.
Preserve V3 branch codex/v3-completion-core-20261017 and V3.1 branch feature/v3.1-home-redesign. Do not start duplicate writers or merge automatically.
Operate the Balanced adaptive session lifecycle; report unknown metrics honestly. Start with DASHBOARD and top 3 actionable blockers.
```

## Constraints
No paid services, automated ChatGPT chat creation, fixed-day rotation, exact context utilisation claims, or unattended GitHub polling. A new chat can continue coordination, but it cannot inherit hidden state or uncommitted work from the old chat.
