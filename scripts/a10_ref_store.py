"""GitHub Git-ref backed optimistic concurrency for A10 state.

Store each task as a Git blob and atomically update a dedicated ref with the
Git Data API (force=false). Never use contents API for cross-writer leases.
A failed ref update is a conflict, not permission to overwrite another owner.
"""
import json
import re
from dataclasses import asdict
from datetime import datetime, timedelta, timezone

from scripts.a10_state import Task, transition, TRANSITIONS

KEY = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
WORKERS = {"W01", "W02"}
PREFIX = "refs/heads/a10-state/"

class Conflict(RuntimeError):
    pass

class InvalidTask(ValueError):
    pass

def encode(task):
    if not isinstance(task, Task) or not KEY.fullmatch(task.key) or task.worker not in WORKERS:
        raise InvalidTask("invalid task identity")
    return json.dumps(asdict(task), sort_keys=True, separators=(",", ":"))

def decode(raw):
    obj = json.loads(raw)
    if not isinstance(obj, dict) or set(obj) != set(Task.__dataclass_fields__):
        raise InvalidTask("unexpected state fields")
    t = Task(**obj)
    encode(t)
    if t.state not in {"NEW","READY","CLAIMED","RUNNING","VERIFYING","DONE","BLOCKED","ESCALATED"}:
        raise InvalidTask("unknown state")
    if type(t.attempt) is not int or t.attempt < 0:
        raise InvalidTask("invalid attempt")
    return t

class RefStore:
    """API adapter: get(ref), put_blob(content), put_tree(blob_sha),
    put_commit(tree_sha, parent_sha), update_ref(ref, sha, force=False).
    Each state ref starts from an existing initialized commit. The backend
    must use GitHub's fast-forward check (force=False).
    """
    def __init__(self, api):
        self.api = api

    def load(self, key):
        if not KEY.fullmatch(key):
            raise InvalidTask("invalid key")
        commit_sha, raw = self.api.get(PREFIX + key)
        return commit_sha, decode(raw)

    def compare_and_swap(self, key, expected_commit, new_task):
        if not KEY.fullmatch(key) or new_task.key != key:
            raise InvalidTask("task key mismatch")
        current_sha, old = self.load(key)
        if current_sha != expected_commit:
            raise Conflict("stale task revision")
        if old.worker != new_task.worker:
            raise InvalidTask("worker reassignment forbidden")
        if old.state == "DONE" or new_task.attempt < old.attempt:
            raise InvalidTask("terminal state or attempt rollback")
        if old.exact_sha and new_task.exact_sha != old.exact_sha:
            raise InvalidTask("exact SHA mutation forbidden")
        if new_task.state != old.state:
            if new_task.state not in TRANSITIONS[old.state]:
                raise InvalidTask("illegal state transition")
            if new_task.state == "CLAIMED":
                if new_task.attempt != old.attempt + 1:
                    raise InvalidTask("claim must increment attempt")
            elif new_task.attempt != old.attempt:
                raise InvalidTask("unexpected attempt change")
        else:
            if new_task.state not in {"CLAIMED", "RUNNING", "VERIFYING"}:
                raise InvalidTask("same-state write only allowed for lease renewal")
            if new_task.attempt != old.attempt or new_task.exact_sha != old.exact_sha:
                raise InvalidTask("heartbeat identity mismatch")
            try:
                previous = datetime.fromisoformat(old.lease_until.replace("Z", "+00:00"))
                current = datetime.fromisoformat(new_task.lease_until.replace("Z", "+00:00"))
            except (ValueError, AttributeError) as exc:
                raise InvalidTask("invalid lease") from exc
            if previous.tzinfo is None or current.tzinfo is None or current <= previous:
                raise InvalidTask("heartbeat must extend lease")
        blob = self.api.put_blob(encode(new_task))
        tree = self.api.put_tree(blob)
        commit = self.api.put_commit(tree, current_sha)
        try:
            self.api.update_ref(PREFIX + key, commit, force=False)
        except Exception as exc:
            raise Conflict("concurrent ref update or API failure") from exc
        return commit

    def apply(self, key, expected_commit, next_state, **kwargs):
        _, current = self.load(key)
        # compare_and_swap re-reads and rejects a concurrent update.
        next_task = transition(current, next_state, **kwargs)
        return self.compare_and_swap(key, expected_commit, next_task)

def renew(task, *, now, minutes=5):
    if task.state not in {"CLAIMED", "RUNNING", "VERIFYING"}:
        raise InvalidTask("task is not leased")
    if type(minutes) is not int or not 1 <= minutes <= 10:
        raise InvalidTask("invalid lease duration")
    expiry = datetime.fromisoformat(task.lease_until.replace("Z", "+00:00"))
    if expiry.tzinfo is None or expiry <= now:
        raise InvalidTask("expired lease cannot be renewed")
    return Task(task.key, task.worker, task.state, task.attempt,
                (now + timedelta(minutes=minutes)).isoformat(), task.exact_sha)

def recover(task, *, now, max_attempts=2):
    if task.state not in {"CLAIMED", "RUNNING", "VERIFYING"}:
        return task
    expiry = datetime.fromisoformat(task.lease_until.replace("Z", "+00:00"))
    if expiry > now:
        return task
    state = "BLOCKED" if task.attempt >= max_attempts else "READY"
    return Task(task.key, task.worker, state, task.attempt, "", task.exact_sha)
