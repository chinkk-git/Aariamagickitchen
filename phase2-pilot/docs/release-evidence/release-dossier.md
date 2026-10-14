# R0 pilot release dossier

**Status:** WEB PILOT BUILT · APK WORKFLOW READY · EXPERT REVIEW BLOCKED · VISUAL APPROVAL PENDING

## What is implemented

- Two data-driven recipes only: Rainbow Yogurt Parfait and Mini Pizza Toast.
- Home, recipe discovery/filter/search, recipe details, ingredients/equipment, nutrition/allergen/safety panels, ingredient customization with matching visual update, guided steps with back/next, completion, private local-first My Creations, Kitchen Crew, What Can I Make?, Surprise Me!, and accessibility/privacy settings.
- Matcher queries only the two catalog records, requires every non-optional ingredient, and gives a genuine no-match state.
- Recipe cards, details and completion screens use recipe-specific food photographs; selected-ingredient chips update with customization. Eight step scenes correspond to the displayed action. Landscape cooking mode keeps illustration and instructions side by side; portrait mode stacks them.
- Air fryer recipe makes appliance-specific adult operation explicit; it gives no universal cook temperature/time. The child-facing route presents an adult-supervision acknowledgment before entering operation/cooling steps.
- The pilot makes no remote API calls, requests no device permissions, and stores My Creations/preferences locally. The Android manifest has no Internet permission.
- An Android Kotlin WebView shell and GitHub Actions workflow are prepared to build an installable debug APK in CI.

## Verification performed

- Automated Node tests: **9 passed, 0 failed**.
- Recipe validator: **PASS**, exactly two records, required structure and explicit review/publication gates present.
- Standalone HTML bundle: **built at 1,274,653 bytes**; inline JavaScript and app module pass `node --check`.
- The web app is self-contained (styles, script, all 25 supplied reference-pack images, family portraits, kitchen backdrop and recipe data are inlined) and can run without network requests. The complete standalone HTML is 620,707 bytes.
- Static HTTP smoke check: app shell, theme CSS, recipe catalog, Aaria portrait and Android manifest all served successfully (`200`). This checks file availability only, not rendered layout.
- Shared-core independence test: **PASS**; the unrelated `Project Studio` smoke screen uses shared UI/theme assets and imports no cooking code.
- GitHub access reports push permission. The `feature/platform-v2` branch is based on the existing production commit; the pilot is kept in its own directory and the production `main` branch is not modified.

## Not verified / blockers

- **APK:** no Android SDK, Gradle installation, emulator or device is available in this execution environment. GitHub Actions will build the installable debug APK after the workflow and pilot source are committed; no APK link/build identity exists until that run succeeds. Therefore no APK link/build identity exists yet.
- **Browser interaction and visual QA:** no browser binary is installed here. The bundle syntax and domain behavior are tested, but tapping through real browser layout, Android WebView behavior, overflow, font scaling, orientation screenshots and screen-reader behavior have not been verified.
- **Nutrition:** all eight per-serving nutrition values remain unavailable and are shown as “Not verified.” Exact ingredient-to-FoodData Central records, package-specific granola/bread/sauce information, arithmetic verification, and an independent human nutrition review are pending. No guessed values are displayed.
- **Allergy and food safety:** ingredient labels and cross-contact prompts are present, but independent allergy/food-safety review is pending. Adult instructions are not a substitute for professional review or caregiver supervision.
- **Child protection / experience:** no ad SDK, account or public social features exist in the pilot, bu