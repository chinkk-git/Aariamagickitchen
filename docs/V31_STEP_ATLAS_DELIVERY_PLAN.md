# V3.1 delivery plan — recipe step-atlas integration

Status: PLANNED / NOT YET INTEGRATED
Owner: V3.1 delivery team under Control Tower; A08 and A09 are independent approval gates.
Tracking: https://github.com/chinkk-git/Aariamagickitchen/issues/5 and https://github.com/chinkk-git/Aariamagickitchen/issues/6

## Required V3.1 work package: 55 recipe step atlases
The 55 illustrated step-atlas drafts for original recipe IDs **11–65** (six SVG panels each, **330 panels**) are an explicit **V3.1 delivery requirement**, not a separate Control Tower release and not deferred beyond V3.1 without a recorded blocker/decision. Existing 40 runtime atlases must be preserved.

Input: `v31-step-atlas-drafts-recipes-11-65.zip`, expected SHA-256 `30dcd8d741e9e990302342eb78fcb5bfb0154f6f26b6ff72b94cee85552fc8ab`. The archive was uploaded to a ChatGPT conversation; it is **not automatically available to GitHub Actions or the V3.1 development environment**. Obtain the bytes through a verified handoff; never assume local chat attachments exist in GitHub.

### Execution and acceptance
1. Import ZIP into V3.1 isolated staging; verify ZIP digest, manifest mapping, SVG integrity, 55 unique IDs and 330 panels. Record individual file hashes and source provenance.
2. A08 review of ingredient/tool accuracy, hazards, knife/heat tasks, allergens, adult-assist positioning, age-appropriate safety cues. Reject and remediate unsafe panels.
3. A09 review of approved Aaria/parent/friends character designs, scene readability, one-step-at-a-time navigation, portrait/landscape composition, accessibility and child comprehension for ages 8–10. Draft status is not approval.
4. Integrate reviewed atlases into the APK's actual offline recipe-step renderer in traceable batches, keeping original recipe IDs and data, existing approved artwork, profiles and saved progress unchanged.
5. Validate all 95 original recipes; ensure all 95 have a resolvable step atlas at runtime. Run offline APK assembly/install/startup, navigation and step rendering, portrait/landscape screenshot checks, route assertions, no system ANR overlays, TalkBack/readability checks and regression tests. Capture SHA, CI run, APK, screenshots, and per-ID asset evidence.
6. Update Issues #5 and #6 and the Control Tower coverage register using distinct **drafted / staged / integrated / A08-approved / A09-approved** counts. Promote only with explicit evidence. Keep Italy/China candidate IDs 96–98 unpromoted.

### Current evidence boundary
Issue #6 reports 40/95 runtime atlases and 55/55 staged drafts; these figures must **not** be added together as 95 integrated or approved. A successful Android run on commit `723d511d5e52f7b903764690995b7ae989b30478` predates integration of these 55 drafts. No release, merge or production promotion is authorized by this plan alone.

### Ownership
The Control Tower schedules, monitors and enforces gates; **V3.1 implements and tests** the atlas work. A10 monitors exceptions. V3 branch is out of scope.
