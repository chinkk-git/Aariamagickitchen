# V3.4 production-upgrade acceptance

Status: **PARTIAL / FULL DATA ACCEPTANCE NOT VERIFIED**. A disposable-emulator test is authorized. The original v7 package, version and signer are authenticated. The production candidate is package com.aaria.magickitchen.pilot, versionCode 8, signed by the owner-authorized production certificate.

## Authenticated inputs

- V7 baseline: workflow run [39084575097](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39084575097), package com.aaria.magickitchen.pilot, versionName 1.0.3, versionCode 7, signer SHA-256 3aeda9b71ab29c4c21d9fca5155418b5684a2111cec6fc17222b64db03697588.
- V3.4 candidate: workflow run [40249952865](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40249952865), package com.aaria.magickitchen.pilot, versionName 3.4.0, versionCode 8, same authorized signer. Candidate source app commit: 4cbd0d3414556973e5790ee02a8232aa917bdd8a.
- Owner authorized the existing protected production certificate. No key was replaced, rotated or regenerated.

## Isolated test procedure

The workflow .github/workflows/v34-upgrade-acceptance.yml downloads the authentic v7 artifact and the exact-source V3.4 candidate, then uses a disposable Android 16 phone emulator. It verifies package, version and certificate before any install; refuses a preinstalled target package; installs v7; seeds and checks supported state through the real app UI; runs adb install -r for V3.4 without uninstalling or clearing app data; and verifies state again after upgrade and restart. UI automation runs outside the production APK. Machine-readable reports, UI trees and screenshots are uploaded as the workflow artifact.

The supported-state UI test covers the v7 favorite for recipe #12 and the reduced-motion setting. It opens the v7 planner and records its UI tree; planner selection continuity is PASS only when the same non-generic recipe text is observed before and after the update. Fields that the test cannot prove remain NOT VERIFIED.

## V7 photo and My Creations limitation

Inspection of the authentic v7 APK's bundled assets/index.html shows the legacy persisted state is stored under aariaPrivateKitchenV4. Recipe-photo sharing uses the JavaScript sharePostBlobs object and object URLs; the legacy snapshot does not contain V3.4's photoRecords store, and the v7 UI has no My Creations gallery. Therefore v7 cannot seed two persistent saved-photo records or My Creations records for this upgrade. This coverage is NOT SUPPORTED / NOT VERIFIED; it must not be counted as a successful preservation assertion. V3.4's own persistent-photo path is tested separately with a fixture, not with two photos migrated from v7.

## Acceptance interpretation

Package/signing/version continuity and UI-verified legacy state may pass independently. Full safe-upgrade acceptance remains NOT VERIFIED until every required supported record has an exact before/after match and the photo/My Creations gap is resolved through an authorized migration decision or confirmed legacy capability. Do not claim all-user-data preservation or recommend updating the owner's installed app based on identity checks alone.

No adb uninstall, package-data clear, owner-device installation, PR merge or production publication is authorized by this test.
