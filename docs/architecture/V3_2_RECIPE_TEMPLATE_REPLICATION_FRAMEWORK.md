# V3.2 Recipe Template Replication Architecture v1.0
**Governing P0:** #40 · **Status:** architecture contract; owner authorised the recipe #12 pilot only. Later batches remain approval-gated.
## Core principle
**One shared renderer + 95 immutable canonical identities + versioned data adapters.** No recipe-specific screen forks or 95 duplicated HTML templates. Preserve existing runtime, navigation, saved data, update/signing and features.
## Proposed component tree
`AppShell(HomeDesignTokens, SharedSixTabNav) -> RecipeView -> RecipeHeader / StepProgress / InstructionCard(MethodIcon, Title, ActionText, SourcedMetadata) / SafetyNotice / OptionalTip / StepActions / CompletionView`.
Reuse current components where possible; W01 must map this proposal to actual code before refactoring. Never duplicate the homepage nav.
## Data contract (illustrative, not a replacement for canonical source)
```json
{
  "schemaVersion": 1,
  "recipeId": 12,
  "stepIndex": 2,
  "method": "hob",
  "iconKey": "pan",
  "title": {"en-GB": "Warm the pan", "pt-BR": null},
  "instruction": {"en-GB": "Canonical source text only", "pt-BR": null},
  "safetyCodes": ["HOT_HOB"],
  "adultAssist": true,
  "tip": null,
  "metadata": {}
}
```
**Null PT-BR is an explicit missing-translation review state, not approved runtime content.** Adapt source fields without silently filling gaps. Validate recipe ID and step references against canonical data.
## Icon registry
3–5 reusable small SVGs or existing licensed assets: bowl/no-cook, pan/hob, air fryer, prep, serve. Mapping may vary by step. Never use a large bespoke step image or unrelated dish photo.
## Versioning / configuration
Central token references (from approved Home), optional visibility toggles (tip, header thumbnail, metadata), per-breakpoint spacing and icon mappings. Versioned adapter normalises existing records to view model; do not migrate or overwrite persistent user state just to render a new UI. Schema incompatibilities fail tests. Safety-critical missing data must fail closed and be surfaced for A08 review.
## CR propagation
| CR type | Change point | Verification |
|---|---|---|
| Typography, spacing, card shape | shared tokens/component | 95-route smoke + screenshot baselines |
| Method icon | central icon registry | method-specific examples |
| Safety logic | reviewed per-step safety policy | A08 + negative cases |
| Recipe content | canonical record and translations | content validation + EN/PT |
| Data shape | versioned adapter/schema | migration/backward compatibility + persistence |
| Shared navigation | existing homepage component ONLY | app-wide navigation regression |
## Automated quality gates
- Exactly 95 unique IDs, no lost records, each step valid and reachable.
- All target batch IDs complete in both languages; missing translations reported, not fabricated.
- Missing safety-critical data blocks approval; independent A08/A09 remain HOLD until reviewed.
- Phone/tablet portrait/landscape screenshots for representative no-cook/hob/air-fryer/long-text and each target recipe route; inspect visuals, not file presence.
- All existing routes/features: planner, favourites, shopping/WhatsApp, family/friends, world, camera/share, quizzes, updates, offline/persistence and Android Back.
- APK exact-head build, unique co-installable identity, signer/sha256, Android 16 test where feasible; no uninstall/data loss.
## Rollback
Keep Classic and previous review APKs untouched; isolate branch and preview identity; revert shared component change if pilot/batch fails. Never overwrite production or migrate signing keys. CRs after batch approval require regression against previously approved recipes.
