# Platform architecture and baseline audit

## Audit evidence

The connected GitHub read path returned the repository root listing: `index.html` (24,906,206 bytes), `Aarias_Magical_Kitchen_Infomercial.html` (5,143,766 bytes), and `whatsapp-preview.jpg`. The repository exposed `main` only, at commit `95f86ccbfe1222d8b263a6a83810b3c46d793c7e`. File-content retrieval returned an empty body for `index.html`, so its actual behavior, recipe inventory, dependencies, safety metadata, character inventory and legacy defects could not be audited. The complete M0 legacy audit is therefore **PARTIAL / BLOCKED**, not passed.

Creation of `feature/platform-v2` was attempted from the listed `main` branch and rejected by GitHub with HTTP 403 `Resource not accessible by integration`. The supplied repository stays read-only in this workspace. No commit, file update, deployment or pull request was made. This implementation lives in its own local folder and does not contain a copy or replacement of production `index.html`.

## Pilot implementation choice

The pilot uses dependency-free TypeScript-free browser modules and an offline HTML bundle inside a small Kotlin Android WebView shell. This keeps the first vertical slice buildable without an external JS package service and makes the web preview independent of third-party runtime code. It is a practical pilot choice given the available environment, not evidence that React Native/Expo was fully evaluated against device-level requirements. A deeper technology comparison and native Android build are still open.

## Separation

Shared foundation packages are `ui`, `theme`, `navigation`, `content`, and test tooling. The cooking domain owns recipe records, schema validation and cooking illustrations. `apps/framework-demo` is a separate non-cooking smoke-test screen using shared theme/UI files. Automated tests assert shared core 