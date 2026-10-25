# Android QA gates (V3.2)

The `v32-android.yml` workflow uses three ordered gates. A later gate must not start after an earlier gate fails.

| Gate | Runs | Budget / pass condition |
| --- | --- | --- |
| G1 FAST PREFLIGHT | `npm test --prefix phase2-pilot`, recipe/reference validators, Node syntax checks, and Android 35 `default;x86_64` system-image integrity preflight | One SDK package, two install attempts maximum, eight-minute timeout per attempt. A cached image is used only when package metadata, package path, non-empty payloads, and sparse/ext4 image headers validate. On first failure remove only that image directory and `.temp/PackageOperation*` staging entries. |
| G2 TARGETED DEVICE SMOKE | Fresh Pixel Tablet emulator; install and launch; Home-to-library navigation; recipe #12 EN-GB/PT-BR review flow in portrait and landscape; ingredient geometry, all four rendered illustrations, safety/copy/progress, completion and screenshot evidence | One emulator step, 10-minute timeout. Fixed startup delay is replaced by bounded page, font, image and step readiness checks. |
| G3 FULL REGRESSION | Fresh Pixel Tablet emulator for all 95 recipes in portrait and landscape, then fresh Pixel phone emulator for EN-GB/PT-BR and all 95 routes, followed by the evidence manifest | Tablet sweep: 55-minute step with a 45-minute Node cap and 46-minute shell cap, including separate emulator boot allowance; phone: 50-minute step with a 40-minute Node cap. The manifest requires every recipe #12 detail, ingredients, steps 1–4 and completion screenshot for each supported device/orientation, validates dimensions and SHA-256, and confirms route coverage 1–95. |

## Failure handling

- G1 screenshot harness tests reject a corrupt SDK package, stale duplicate frames, wrong screenshot orientation and a missing required screenshot path.
- The SDK preflight permits one recovery retry. It does not clear the SDK, reinstall unrelated packages, or retry indefinitely.
- G2 runs before both G3 emulator sweeps. A G2 failure prevents G3 from running. The full tablet recipe sweep is not part of G2.
- Emulator state is never reused between G2 and G3. The tablet and phone G3 actions use separate fresh emulators. The workflow has a 120-minute hard timeout to cover ordered bounded G1/G2/tablet/phone gates and both emulator boots.
- No artifact is called approval-ready unless G1, G2, G3, screenshot manifest, route count, extracted APK SHA-256, and APK signing checks all pass. Independent A08/A09, artwork-rights and security/signing approvals remain separate gates.
