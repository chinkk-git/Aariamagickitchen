# Aaria's Magical Kitchen — V4 Rich Interactive Experience Master Plan
Status: PROPOSED / planning baseline (not implemented)
Date: 2026-10-18
Target: Android APK (phone/tablet); ages 8–10; British English and pt-BR.
Branch: feature/v4-rich-experience-plan
Base: codex/v3-completion-core-20261017

## 1. Vision and version boundary
V4 adds rich media, interactive motion, narrated recipe guidance, character reactions, achievements, and child-safe cooking microgames. V3 is the stable foundation: 95 recipes, existing approved artwork/characters, security/update system, profiles, planner, Spin My Week, shopping lists, camera capture, quizzes, offline support and accessibility. V4 must not block V3 release, regress existing functions, or silently change approved identity. Preserve V3 production baseline and release signing identity.

## 2. Requirements register
| ID | Requirement | Priority | Acceptance evidence |
|---|---|---|---|
| V4-01 | Interactive magical kitchen home (Rive/Lottie or equivalent) | P0 | Phone/tablet portrait/landscape QA, accessibility and FPS measurements |
| V4-02 | Approved Aaria, Mommy, Daddy and Friends in interactive scenes | P0 | Character-bible comparison; no identity drift |
| V4-03 | All 95 recipes have complete, correctly matched static art before animation scale-up | P0 | Per-recipe asset and ingredient/step match audit |
| V4-04 | Animated ingredient and cooking-step interactions | P0 | Safety and recipe-step accuracy review |
| V4-05 | Optional narration in British English and pt-BR | P0 | Language, pronunciation, volume, mute and offline QA |
| V4-06 | Optional ambience, sound effects and music | P1 | Independent toggles, focus and mute tests |
| V4-07 | Animated stars, badges and celebrations | P1 | Reduced-motion and no-sound alternatives |
| V4-08 | Short video demonstrations for selected steps | P1 | Approved visual consistency, no misleading technique, offline playback |
| V4-09 | Magic Pantry interaction upgrade | P1 | Touch target, navigation and device QA |
| V4-10 | Motion enhancements for Spin My Week and planner | P1 | Functional regression checks; no timer |
| V4-11 | Optional kitchen puzzles and cooking microgames | P2 | Age 8–10 testing; cooking remains central |
| V4-12 | Child-friendly guided What's New for both APK and content updates | P0 | Update-tour tests for both update types |
| V4-13 | Offline-first media, versioned signed content packs, integrity and rollback protection | P0 | Signature/tamper/rollback/offline tests |
| V4-14 | Parental sharing and media/privacy controls | P0 | Child protection gate and consent-flow tests |

## 3. Proposed tools and procurement gates
- ChatGPT Images / Canva: approved character/ingredient/scene illustrations; bulk asset production after pilot approval.
- Runway: controlled image-to-video and animation experiments; validate continuity, motion safety, quality and rights.
- HeyGen: optional avatar-led videos only if approved cartoon identity remains stable.
- Rive: interactive kitchen and character state machines; Android runtime compatibility and licensing review.
- Lottie: lightweight celebration/transitions; check reduced motion.
- ElevenLabs or equivalent: pre-generated EN-GB and pt-BR narration; verify voice rights, child-safety and pronunciation.
- Android Media3: on-device media playback, lifecycle and caching.
All vendors are candidates, not approved dependencies. Evaluate costs, licensing, privacy, rate limits, retention, export formats, reproducibility, availability and device performance before selection. Never expose API keys in the APK.

## 4. Media production pipeline
Planner -> Asset Spec (recipe ID, step ID, character refs, scene, aspect ratio, ingredient/utensil mapping, narration locale, safety) -> Generation -> Automated media validation -> Human/agent visual review -> A08 Child Protection gate -> A09 Child Experience gate -> QA -> Signed manifest and content pack -> Staged rollout -> Telemetry/feedback -> Learning register.
Keep deterministic filenames and provenance (source prompt, model/tool version, generation timestamp, asset hash, rights, reviewer, locale, recipe/step mapping). Generated videos are illustrative, never a substitute for accurate safe cooking instructions.

## 5. Runtime and security architecture
- APK-first Android app, not a standalone HTML distribution. Reuse existing secure update architecture rather than inventing an independent updater.
- Content pack manifest contains pack/version, compatible APK range, asset hashes, signatures, language, size, recipe/step IDs, media type and fallback references.
- Verify signatures and asset integrity before activation; atomically install; retain last-known-good; prevent rollback to vulnerable or incompatible versions; preserve signing continuity.
- Download over authenticated/validated transport; allow user/parent to manage downloads; default to offline-capable approved static artwork when media unavailable.
- Protect profile migration and local settings; no automatic uploading of child photos or voice. Camera-first capture, with explicit parental sharing controls.
- Media autoplay should be conservative; offer captions, mute, reduced motion, low-data mode and clear replay controls.
- No smart cooking timer, no hands-free countdown and no preschool-style UI.

## 6. Release phases and gates
### Phase 0 — V3 readiness
Freeze V3 functional baseline; audit all 95 static recipe art sets and existing V3 bugs; record regression baseline. Gate: V3 stable enough to branch without hiding unfinished defects.
### Phase 1 — Technical proof of concept
Prototype one interactive home scene, one character reaction, one narrated step in both locales, one video step, one celebration, and signed offline media pack. Measure performance on low/mid-tier Android.
### Phase 2 — End-to-end pilot
Select 3 representative recipes: independent, family, friends. Use approved character bible. Validate phone/tablet and portrait/landscape, safety, age suitability and accurate cooking.
### Phase 3 — Core V4 release
Ship V4-01/02/04/05/12/13/14 and all 95 static recipe assets, with approved motion coverage per staged rollout criteria. Preserve fallback for recipes without approved video.
### Phase 4 — Rich media expansion
Expand step animations and narrated videos only after asset-by-asset approval; add pantry, celebrations, planner motion and optional microgames.
### Phase 5 — Optimisation
Media compression, download budgets, battery/memory/performance, accessibility, offline reliability, update success and content quality.

## 7. Quality gates
- Planner: scope, dependencies, measurable acceptance criteria.
- Executor: implementation and media production with provenance.
- Reviewer: independent code/design/recipe validation.
- A08: child safety, heat/sharp tools/allergens, privacy, content and parental controls; release-blocking.
- A09: ages 8–10 usability, age-appropriate tone, cognitive load, touch and readability; release-blocking.
- Security: signing, tamper resistance, manifest trust, profile migration and rollback.
- QA: Android version/device matrix, orientation, offline, low memory, interrupted updates, accessibility, EN/PT, sound/motion toggles, 95-recipe functional regression.
- Release: verified CI artifacts and signing continuity; no claim of success without evidence.

## 8. Metrics and acceptance thresholds
Before implementation, record baseline and agree numeric targets for crash-free sessions, startup time, frame rate, media pack size, offline availability, update success, download failures, accessibility and A08/A09 pass rate. Do not invent measured results. Each P0 requirement requires traceable test evidence and a release-blocking failure policy.

## 9. Agent work packages
WP1 design system + character consistency; WP2 95-recipe art audit; WP3 Rive/Lottie Android POC; WP4 bilingual narration; WP5 image-to-video POC; WP6 signed content-pack delivery; WP7 child safety/privacy/accessibility; WP8 integration/regression; WP9 release monitoring and lessons learned. Agents can plan, execute, review and remediate autonomously within granted permissions; external security actions and platform approvals remain mandatory.

## 10. Change control
No V4 work should modify V3 production or release signing configuration without separate tested change control. Track implementation in requirements/status/learning registers, mark every item as planned/in-progress/verified with links to evidence. This document authorises planning only; no assets, APK or media features are claimed as delivered.
