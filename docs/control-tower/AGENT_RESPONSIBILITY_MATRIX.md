# A00–A10 Agent Responsibility and Routing Audit
Audit date: 2026-10-19. Coordination owner: A00. This document supplements, not replaces, docs/CONTROL_TOWER_PROTOCOL.md and the unmerged governance PR #8.

## As-is evidence and proposed minimal reorganization
The main branch has Control Tower, session, adaptive lifecycle and A10 protocols; active GitHub issues #4–#7 own delivery streams. No independent executable A00–A09 agent-definition files were found in the audited main tree. Therefore the roles below are *governance assignments*, not a claim that eleven independently running software agents were instantiated. Preserve A00–A10 IDs; do not create A11 without a demonstrated improvement gap.

| Group | Agent | As-is verified | Adopted responsibility / boundary |
|---|---|---|---|
| Control Tower | A00 Program Orchestrator | GitHub issues and Control Tower protocol | Priority, single work-package accountability, dependency and escalation; never edits V3/V3.1 branches |
| Delivery | A01 Delivery Planner | Issue checklists and handovers | Work packages, sequencing, explicit acceptance criteria |
| Delivery | A02 Engineering Lead / Executor | Two existing branch owners | Coordinate each active branch owner; no additional concurrent writer |
| Delivery | A03 Independent Technical Reviewer | Existing review/checkpoint requirements | Independent architecture, code and evidence review; never self-approve |
| Engineering | A04 Android Platform & Release | V3 issue #4 | APK, signer continuity, upgrade/profile migration, signed content packs, rollback and parent updates |
| Engineering | A05 UI/UX & Artwork Integration | V3.1 issue #5 | Approved visuals, 55-atlas integration, offline renderer and orientation |
| Engineering | A06 Recipe Content & Data | V3.1 issue #6 | Original 95 records, nutrition/allergens, language and candidate 96–98 audit |
| Engineering | A07 Test Automation & QA | GitHub Actions and acceptance checklists | Emulator/physical device, screenshot, regression and CI evidence |
| Independent quality | A08 Child Protection & Safety | Mandatory gate in existing protocol | Independent child safety, allergen and privacy veto |
| Independent quality | A09 Child Experience (8–10) | Mandatory gate in existing protocol | Independent usability, accessibility and visual approval veto |
| Monitoring | A10 Delivery Monitoring & Recovery | Existing hourly ChatGPT task and A10_RECOVERY.md | Exception-only heartbeat, bounded recovery and handover; no duplicate automation |

## Active accountable work packages (one accountable agent each)
| Work package | Accountable | Supporting | Independent review | Branch / tracking | Next gate |
|---|---|---|---|---|---|
| V3-03 same-signer upgrade/profile | A04 | A07, A02 | A03, A08/A09 as relevant | codex/v3-completion-core-20261017 / #4 | Correct certificate digest parser, verify v6→v7 on emulator with profile persistence |
| V3-04–06 content trust, rollback, parent updates | A04 | A07 | A03 and A08 | same / #4 | Trusted publisher key, device failure injection, parent gate; external signer remains protected |
| V3-07–10 regression/release evidence | A07 | A04, A06 | A03, A08, A09 | same / #4 | CI + device + independent gates |
| V31-01–09 Home, World and step art | A05 | A07 | A03, A08, A09 | feature/v3.1-home-redesign / #5 | Integrate verified 55 atlases into actual offline APK renderer, per-ID screenshot/accessibility QA |
| WR-01–08 recipe/world provenance | A06 | A05, A07 | A03, A08, A09 | same V3.1 branch / #6 | India regression; 96–98 remain draft until safety, duplicate and provenance sign-off |
| INT-01–06 integration | A00 (coordination only) | A01, A02, A04–A07 | A03, A08, A09 | #7 | BLOCKED pending all branch acceptance and explicit user authorization |

A02 coordinates implementation inside the **already active** V3 and V3.1 Work sessions; assignments to A04/A05/A06/A07 are logical responsibilities within those owners, not permission to start competing branch writers.

## Current audit checkpoint
- V3 HEAD bf43641a8f06c7d1ef6fcdc93943d40295c00008; check current Actions before acceptance. Earlier run 39186016870 failed SHA-256 certificate fingerprint extraction. No verified v6→v7 acceptance at audit.
- V3.1 HEAD 8af9d76ab339b18b33c9e15929b161bbb3f55c68; latest CI run 39191099617 passed. Preserve all 95 recipes; 40 runtime-mapped step atlases and 55 additional draft atlases (IDs 11–65, 330 SVG panels) reported; staged does not mean integrated or approved.
- Expected ZIP SHA-256 30dcd8d741e9e990302342eb78fcb5bfb0154f6f26b6ff72b94cee85552fc8ab. Availability to executing Work environment **not verified**; worker must obtain and hash before using.
- PR #8 is open/unmerged. Its evidence validator and atlas handoff should be validated and reviewed independently before any merge; this audit does not duplicate its proposed files.
- A10 hourly exception task remains the only scheduled monitoring mechanism. It cannot directly launch or verify ChatGPT Work execution. Issue comments are asynchronous instructions, not proof of worker activation.

## Mandatory lifecycle and proof
Plan → Implement → Test → Independent Review → Remediate → Verify → Record Evidence → Close.
Every issue checkpoint: work package, accountable agent, branch, full 40-character SHA, CI link and conclusion, APK artifact, emulator/physical-device evidence, A08/A09 decisions, blocker and next owner. No approval by implementer alone. No V3/V3.1 cross-edit, no merge or production change without authorization. Do not claim a session started until Work UI/acknowledgement confirms it.
