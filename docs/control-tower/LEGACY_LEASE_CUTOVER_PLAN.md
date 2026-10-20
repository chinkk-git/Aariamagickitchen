# Controlled legacy-writer cutover — offline implementation plan

Status: **DESIGN ONLY / NO LIVE MIGRATION**. Owner: chinkk-git (single owner).
This plan cannot authorize an execution, worker activation, merge or release.

## Authority boundary

- `control-tower/tasks.json` currently stores V3/V3.1 coordination and task metadata. Preserve all metadata and history.
- The proposed `worker-lease-authority.json` is the **only future branch-lease authority**, using one whole-blob GitHub SHA CAS and a monotonic epoch.
- A snapshot of `tasks.json` cannot fence a writer. GitHub Contents API does not offer a cross-file atomic transaction. No dual-write, eventual synchronization, or assumption that expired leases imply stopped sessions.
- The offline `worker_cutover_plan.py` returns a non-authoritative plan with `migration_authorized=false`, `activation=DISABLED`, and `legacy_fence=NOT_VERIFIED`. It does not mutate repository files.

## Prerequisites to any future cutover

1. Inventory **every** lease-granting/renewing path (legacy worker claims, session handover commands, Actions, API clients, bots and Work sessions). Identify exact branch, identity, permissions and entrypoint. Unknown paths are blockers.
2. Establish an **enforced** legacy write fence at each relevant writer boundary. Disable legacy lease grants and ensure stale clients cannot bypass fencing; if required, remove write capability until upgraded. A mutable `fenced: true` field, comment, or self-attested flag is insufficient.
3. Confirm V3 branch `codex/v3-completion-core-20261017` has an UNKNOWN session state with recorded writer `V3 Rotation 2`; quarantine, never silently reassign. Preserve V3.1 `feature/v3.1-home-redesign` STOPPED state without claiming it is free to assign. Preserve integration/task/release metadata unchanged.
4. Capture immutable legacy source SHA, owner-confirmed session handovers, all active/expired lease dispositions and a protected audit trail. Any unresolved legacy lease or active task blocks migration.
5. Require owner approval of exact migration plan/SHA, write-fence evidence, identity trust boundary, rollback, and R$0 billing constraints before any live cutover.

## Future cutover sequence (NOT EXECUTED)

1. Verify legacy writers are fenced **before** any new authority can grant a lease.
2. Freeze a consistent legacy source SHA; abort if changed or if any writer cannot be accounted for.
3. Build new single-authority registry with quarantined ownership, epoch, and audit provenance. Do not convert UNKNOWN to FREE.
4. Update all lease consumers to verify the authoritative registry and deny old leases. No reader/writer may grant access from legacy `tasks.json`.
5. Only after owner approval, run a separate controlled acceptance of racing claims, stale SHA/epoch, role binding, legacy bypass attempts, expiry/recovery and rollback. Activation remains a **separate decision**.

## Rollback and stop rules

- If any old writer remains capable of granting a lease, **stop**, keep new authority disabled.
- If CAS conflicts, source SHA changes, ambiguous holder, or any inconsistent state: **stop**, preserve audit evidence and quarantine affected branch.
- Never roll back by re-enabling an unfenced legacy writer or allowing two authorities. Revert code only with both paths disabled and no active leases.
- GitHub CI green is deterministic test evidence, not a production migration, independent security review, cost proof, or owner activation approval.

## Single-owner approval boundaries

Owner `chinkk-git` can authorize a scoped migration only after technical hard blockers are resolved. Record exact HEAD, branch scope, tested controls, unresolved residual risk, rollback procedure, and separate activation decision. Label this **OWNER ACCEPTANCE**, never independent review.
