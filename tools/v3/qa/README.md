# Android QA gates (V3.2)

The `v32-android.yml` workflow uses three ordered gates. A later gate must not start after an earlier gate fails.

| Gate | Runs | Budget / pass condition |
| --- | --- | --- |
| G1 FAST PREFLIGHT | `npm test --prefix phase2-pilot`, recipe/reference validators, Node syntax checks, and Android 35 `default;x86_64` system-image integrity preflight | One SDK package, two install attempts maximum, eight-minute timeout per attempt. A cached image is used only when package metadata, package path, non-empty payloads, and sparse/ext4 image headers validate. On first failure remove only that image directory and `.temp/PackageOperation*` staging entries. |
| G2 TARGETED DEVICE SMOKE | Pixel Tablet recipe #12 EN-GB/PT-BR review flow in portrait and landscape, including all four steps, completion, ingredient layout and current Home/World checks | One emulator step, 20-minute timeout. All screenshot orientation and UI-state assertions remain strict. |
| G3 FULL REGRESSION | Pixel phone review flow, EN-GB/PT-BR checks, 95 unique recipe routes and final screenshot manifest | One emulator step, 20-minute timeout. The manifest requires every recipe #12 detail, ingredients, steps 1–4 and completion screenshot for each supported device/orientation, validates dimensions and SHA-256, and confirms route coverage 1–95. |

## Failure handling

- G1 screenshot harness tests reject a corrupt SDK package, stale duplicate frames, wrong screenshot orientation and a missing required screenshot path.
- The SDK preflight permits one recovery retry. It does not clear the SDK, reinstall unrelated packages, or retry indefinitely.
- G2 runs before the phone's 95-route sweep. A G2 failure prevents G3 from running.
- Each emulator action has a 20-minute hard timeout; the complete workflow has a 45-minute hard timeout. Do not rerun the whole workflow for a pending result or a failure unrelated to changed source. Use the CI circuit breaker and publish a final `WAITING_FOR_CI` handover when the run remains active.
- No artifact is called approval-ready unless G1, G2, G3, screenshot manifest, route count, extracted APK SHA-256, and APK signing checks all pass. Independent A08/A09, artwork-rights and security/signing approvals remain separate gates.
