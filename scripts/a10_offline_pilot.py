"""A10 offline integration pilot: isolated task state and crash recovery.

Uses an in-memory Git Data API simulation; never calls GitHub or writes refs.
"""
from datetime import datetime, timezone
from scripts.a10_state import Task
from scripts.a10_ref_store import RefStore, Conflict, encode, recover

class SimulatedGit:
    def __init__(self):
        self.head = "root"
        self.raw = encode(Task("pilot", "W01"))
        self.objects = {}
        self.n = 0
    def get(self, ref):
        assert ref == "refs/heads/a10-state/pilot"
        return self.head, self.raw
    def put_blob(self, content):
        self.n += 1
        key = f"blob-{self.n}"
        self.objects[key] = content
        return key
    def put_tree(self, blob):
        return blob
    def put_commit(self, tree, parent):
        self.n += 1
        key = f"commit-{self.n}"
        self.objects[key] = (parent, self.objects[tree])
        return key
    def update_ref(self, ref, sha, force=False):
        assert force is False
        parent, raw = self.objects[sha]
        if parent != self.head:
            raise Conflict("stale ref")
        self.head, self.raw = sha, raw

def main():
    api = SimulatedGit()
    a = RefStore(api)
    b = RefStore(api)
    initial, _ = a.load("pilot")
    a.apply("pilot", initial, "READY")
    try:
        b.apply("pilot", initial, "BLOCKED")
    except Conflict:
        pass
    else:
        raise AssertionError("stale writer was not rejected")
    rev, _ = a.load("pilot")
    a.apply("pilot", rev, "CLAIMED",
            lease_until="2099-01-01T00:00:00Z", exact_sha="a"*40)
    rev, _ = a.load("pilot")
    a.apply("pilot", rev, "RUNNING",
            now=datetime(2026,10,22,tzinfo=timezone.utc))
    _, running = a.load("pilot")
    assert running.attempt == 1
    expired = recover(Task(running.key, running.worker, running.state,
                           running.attempt, "2020-01-01T00:00:00Z", running.exact_sha),
                      now=datetime(2026,10,22,tzinfo=timezone.utc))
    assert expired.state == "READY"
    print("PASS: offline isolated task pilot, stale writer rejected, claim/run and crash recovery")
if __name__ == "__main__":
    main()
