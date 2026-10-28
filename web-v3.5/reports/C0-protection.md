# C0 — Production protection record

Recorded 2026-10-28 before the V3.5 web build.

- Protected production branch HEAD: `d38cefee4ab129eabc53f2a755a0eaf4487addcd`.
- Protected repository root `index.html` SHA-256: `74d9c0f8b0f8c8ec9115e58ff77f6cdc1607f73df45bfbb3d2d50039d86431fe`.
- Live URL: `https://chinkk-git.github.io/Aariamagickitchen/`; HTTP response 200. Its downloaded HTML has the same 24,906,206-byte size and SHA-256 as `main/index.html`.
- GitHub Pages settings API returned HTTP 404. The live file is verified, but the configured Pages source could not be read from the API.
- Exact local rollback copy: `/workspace/scratch/1cd79900b3b5/v3.5-baseline-rollback/live-pages-index.html` (outside the feature branch); SHA-256 matches production. The unchanged `main` commit and Git blob provide a repository-side recovery point.
- Current production baseline has 95 unique records (#001–095). Issue #56 refers to a 97-recipe baseline; the 97-record web foundation is constructed from those 95 plus the pinned, existing #096 Italy and #099 China handoff.
- No root production source, Pages workflow, Pages configuration, or live deployment was changed.

## Rollback procedure

No production cutover occurred. For a future owner-authorized cutover, restore Pages to the unchanged `main` commit above, then confirm the live URL returns the recorded SHA-256. Do not use this feature branch or its package as a production rollback source.
