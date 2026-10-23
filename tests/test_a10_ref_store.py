import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.a10_state import Task
from scripts.a10_ref_store import RefStore, Conflict, InvalidTask, encode, decode, renew, recover

class FakeAPI:
    def __init__(self):
        self.head = "root"
        self.content = encode(Task("task1", "W01"))
        self.objects = {}
        self.counter = 0
        self.reject = False
    def get(self, ref):
        return self.head, self.content
    def put_blob(self, content):
        self.counter += 1
        self.objects["b"+str(self.counter)] = content
        return "b"+str(self.counter)
    def put_tree(self, blob):
        return blob
    def put_commit(self, tree, parent):
        self.counter += 1
        name = "c"+str(self.counter)
        self.objects[name] = (parent, self.objects[tree])
        return name
    def update_ref(self, ref, sha, force=False):
        assert force is False
        parent, content = self.objects[sha]
        if self.reject or parent != self.head:
            raise RuntimeError("non-fast-forward")
        self.head, self.content = sha, content

class StoreTests(unittest.TestCase):
    def test_roundtrip(self):
        self.assertEqual(decode(encode(Task("task1","W01"))).worker, "W01")
    def test_cas_success(self):
        api = FakeAPI()
        store = RefStore(api)
        revision, task = store.load("task1")
        store.compare_and_swap("task1", revision, Task("task1","W01","READY"))
        self.assertEqual(store.load("task1")[1].state, "READY")
    def test_stale_revision(self):
        api = FakeAPI()
        store = RefStore(api)
        store.compare_and_swap("task1", "root", Task("task1","W01","READY"))
        with self.assertRaises(Conflict):
            store.compare_and_swap("task1", "root", Task("task1","W01","BLOCKED"))
    def test_race_after_read(self):
        api = FakeAPI()
        store = RefStore(api)
        api.reject = True
        with self.assertRaises(Conflict):
            store.compare_and_swap("task1", "root", Task("task1","W01","READY"))
    def test_worker_isolation(self):
        with self.assertRaises(InvalidTask):
            RefStore(FakeAPI()).compare_and_swap("task1","root",Task("task1","W02","READY"))
    def test_injection(self):
        with self.assertRaises(InvalidTask):
            encode(Task("../bad","W01"))
    def test_duplicate_schema(self):
        with self.assertRaises(InvalidTask):
            decode('{"key":"task1","worker":"W01","shell":"echo hi"}')
    def test_heartbeat(self):
        now = datetime(2026,10,22,tzinfo=timezone.utc)
        task = Task("task1","W01","RUNNING",1,"2099-01-01T00:00:00Z","a"*40)
        self.assertTrue(renew(task,now=now).lease_until.startswith("2026-10-22"))
    def test_expired_heartbeat(self):
        with self.assertRaises(InvalidTask):
            renew(Task("task1","W01","RUNNING",1,"2020-01-01T00:00:00Z","a"*40),
                  now=datetime(2026,10,22,tzinfo=timezone.utc))
    def test_crash_recovery(self):
        now = datetime(2026,10,22,tzinfo=timezone.utc)
        task = Task("task1","W01","RUNNING",1,"2020-01-01T00:00:00Z","a"*40)
        self.assertEqual(recover(task,now=now).state,"READY")
        self.assertEqual(recover(Task("task1","W01","RUNNING",2,task.lease_until,task.exact_sha),now=now).state,"BLOCKED")

if __name__ == "__main__":
    unittest.main()
