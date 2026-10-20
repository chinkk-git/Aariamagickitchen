import unittest
from worker_scope_policy import assert_worker_scope,WorkerScopeDenied
class ScopeTests(unittest.TestCase):
    def test_approved_worker_branches(self):
        for worker,branch in (("W01","codex/v3-completion-core-20261017"),("W03","feature/v3.1-home-redesign")):
            self.assertTrue(assert_worker_scope(worker=worker,branch=branch,operation="claim"))
    def test_unauthorized_scope(self):
        for worker,branch,operation in (("W01","main","claim"),("W02","feature/v3.1-home-redesign","claim"),("W03","codex/v3-completion-core-20261017","claim"),("W03","feature/v3.1-home-redesign","merge")):
            with self.subTest(worker=worker,branch=branch),self.assertRaises(WorkerScopeDenied):
                assert_worker_scope(worker=worker,branch=branch,operation=operation)
if __name__=="__main__":unittest.main()
