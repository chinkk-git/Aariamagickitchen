"""Pure task state transition policy. Does not write registries."""
from worker_task_graph import STATUSES

TRANSITIONS = {
    "BLOCKED": frozenset({"READY","CANCELLED"}),
    "READY": frozenset({"CLAIMED","BLOCKED","CANCELLED"}),
    "CLAIMED": frozenset({"IN_PROGRESS","FAILED","READY"}),
    "IN_PROGRESS": frozenset({"REVIEW","FAILED"}),
    "REVIEW": frozenset({"VERIFIED","FAILED"}),
    "FAILED": frozenset({"READY","CANCELLED"}),
    "VERIFIED": frozenset(),
    "CANCELLED": frozenset(),
}

class TransitionDenied(ValueError):
    pass

def check_transition(*, previous, proposed, dependencies_verified=False, lease_authorized=False, independent_review=False):
    if previous not in STATUSES or proposed not in TRANSITIONS[previous]:
        raise TransitionDenied("invalid state transition")
    if proposed == "READY" and dependencies_verified is not True:
        raise TransitionDenied("dependencies not verified")
    if proposed in {"CLAIMED","IN_PROGRESS","REVIEW"} and lease_authorized is not True:
        raise TransitionDenied("authoritative lease missing")
    if proposed == "VERIFIED" and independent_review is not True:
        raise TransitionDenied("independent review missing")
    # Boolean flags are caller assertions, not proof of trust. An authenticated
    # adapter must establish these facts independently before invoking policy.
    return proposed
