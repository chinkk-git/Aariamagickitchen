import unittest
from worker_task_transitions import check_transition,TransitionDenied
class TransitionTests(unittest.TestCase):
    def test_valid_plan(self):
        self.assertEqual(check_transition(previous="BLOCKED",proposed="READY",dependencies_verified=True),"READY")
    def test_invalid_terminal(self):
        for state in ("VERIFIED","CANCELLED"):
            with self.assertRaises(TransitionDenied):
                check_transition(previous=state,proposed="READY",dependencies_verified=True)
    def test_lease_required(self):
        for previous,proposed in (("READY","CLAIMED"),("CLAIMED","IN_PROGRESS"),("IN_PROGRESS","REVIEW")):
            with self.assertRaises(TransitionDenied):
                check_transition(previous=previous,proposed=proposed)
    def test_independent_review_required(self):
        with self.assertRaises(TransitionDenied):
            check_transition(previous="REVIEW",proposed="VERIFIED")
    def test_cannot_skip_steps(self):
        with self.assertRaises(TransitionDenied):
            check_transition(previous="READY",proposed="VERIFIED",independent_review=True)
    def test_fail_closed_on_truthy_non_boolean(self):
        with self.assertRaises(TransitionDenied):
            check_transition(previous="REVIEW",proposed="VERIFIED",independent_review="yes")
if __name__=="__main__":unittest.main()
