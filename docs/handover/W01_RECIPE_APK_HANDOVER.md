# W01 Recipe APK Handover

Updated: 2026-10-24 (UTC)

## Mission and acceptance

- Repository: `chinkk-git/Aariamagickitchen`
- Branch: `feature/v3.2-magical-cookbook`
- Governing issue: [#45](https://github.com/chinkk-git/Aariamagickitchen/issues/45)
- Control Tower: [#51](https://github.com/chinkk-git/Aariamagickitchen/issues/51)
- Deliver a new installable review APK with the 95 original recipes plus #096 Tomato Basil Pasta (Italy) and #099 Vegetable Fried Rice (China). Do not integrate the remaining 13 international recipes.
- Preserve the shared original-95 recipe renderer, artwork, offline use, saved data, navigation and Android Back; show compact three-column ingredients, standard equipment/allergen/nutrition UI, one active illustrated step, landscape side-by-side composition, navigation/completion, adult assistance/safety, and EN-GB/PT-BR.
- Do not merge to main or publish a production release. `OWNER_APPROVED=NO`, `RELEASE_READY=NO`.

## Live branch and commits

At handover creation, live branch HEAD was `4fb726e67ff251e80dbc5ef3f4d4023c23634ce0` (verified against GitHub branch API; this handover commit will advance it). No concurrent W01 writer was identified; previous W01 writes had stopped before this session reconciled the branch. The working container has no usable execution environment, so local Git status/build/APK extraction and visual screenshot review are unavailable.

Relevant recent commits on the branch:
- `3050e7d887d8b75e870b4de2ca73492b56d9f887`: restore canonical international step copy at the end of the shared render pipeline.
- `4fb726e67ff251e80dbc5ef3f4d4023c23634ce0`: repair G1 test assertions for the post-render instruction-copy contract.

## CI and artifacts

Exact-head run [#273](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40062161458), head `4fb726e67ff251e80dbc5ef3f4d4023c23634ce0`, completed successfully. G1 and G2 passed. This push was marked `[owner-review-only]`; G3 full phone/tablet regression was deliberately skipped. Thus it is not full-gate/release evidence.

- APK artifact (fresh output from run #273): [owner-review APK artifact](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40062161458/artifacts/12548077540). Artifact ZIP: 51,274,758 bytes; ZIP SHA-256 `7badadd64a21157175599048dba39fd03150ec9136ef5a648a40fe278f3fc18d`. Android APK inside: 51,368,483 bytes; log-reported APK SHA-256 `9c6b6120eb83a939262623a522216cb266e48a8fa2f80a00017e2d300c8bd9d7`. Workflow asserts application ID `com.aaria.magickitchen.pilot.v32review273`, versionCode `8`, versionName `1.0.4`. Extract APK and verify the APK digest before relaying it as the installable binary.
- G2 Android evidence artifact: [tablet screenshots and evidence](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40062161458/artifacts/12547848363). Artifact ZIP: 177,022,316 bytes; ZIP SHA-256 `84662a64c5d4fd473fbe1f2deb8a4f34d68f828f1d10f1cb577fe64f481c1a97`.
- G2 job ID `120777808367`; job conclusion success. It produced genuine Android tablet captures of #096/#099 and #12, portrait and landscape, EN-GB and PT-BR. Logs report all international steps and completion screens with activeStepCount 1. The visual capture evidence is in the G2 artifact. It has not been downloaded/extracted/visually reviewed in this session. Screenshot screenshot-hash metadata in one auxiliary international-wave-1 manifest repeats per recipe/locale, so inspect the G2 capture PNGs directly rather than relying on that auxiliary manifest.
- G2 contains tablet evidence only; exact-head full phone and tablet G3 has not yet passed. The required phone evidence and comparison to original recipe #12 remain outstanding.
- Other independent A08/A09/nutrition/artwork-rights/security gates are pending; no production release is authorized.

## Work completed and outstanding

Completed: render-hook correction for canonical localized instruction text; G1 contract coverage for both recipes/locales; G2 exact-head tablet pass; fresh APK and screenshot/evidence artifacts generated.

Outstanding:
1. From a working checkout, reconcile branch HEAD again (handover commit below should trigger a non-owner-review full CI run; confirm run is attached to its exact commit).
2. Inspect APK ZIP and evidence ZIP; verify package metadata, APK SHA-256, byte size, installability, co-installation policy and fresh APK provenance.
3. Inspect genuine Android screenshots for #096/#099 in both locales and orientations, plus #12 renderer comparison. Confirm navigation/completion, equipment, ingredients, allergens, nutrition, safety and artwork visually.
4. Monitor and fix any failures in full G3 phone and tablet regression; repeat until all applicable gates pass. Preserve the single W01 writer.
5. Publish the final artifact URL, exact commit SHA, application ID, APK version/size/SHA, passing CI links, Android screenshots/evidence, renderer comparison and limitations to Issue #45; notify #51.
6. Keep `REVIEW_READY=NO` until verified installable APK and required evidence are available. Keep `OWNER_APPROVED=NO` until explicit owner approval. Keep `RELEASE_READY=NO`.

## Exact next commands

After obtaining a usable checkout:
```sh
git fetch origin
git checkout feature/v3.2-magical-cookbook
git pull --ff-only origin feature/v3.2-magical-cookbook
git status --short --branch
# Inspect CI run tied to: git rev-parse HEAD
# Download artifacts from that exact-head full run; inspect ZIPs, APK metadata, hashes, and screenshots.
```

Workflow: `.github/workflows/v32-android.yml`. A normal push to this branch triggers full G3; commits with `[owner-review-only]` skip full G3. The workflow generates an isolated debug review package with run-number-specific ID and retains versionCode 8/versionName 1.0.4. Never uninstall other versions or clear app data.

## Handover states

- Owner approval: **NO**
- Review ready: **NO** (APK and evidence exist, but installable APK and screenshots have not been directly verified/reviewed in this session; full phone/tablet G3 remains outstanding)
- Release ready: **NO**
