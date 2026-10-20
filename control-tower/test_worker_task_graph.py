import unittest
from worker_task_graph import TaskGraphDenied,validate_graph,plan_ready

def t(id,status="READY",deps=None,priority=0):
    return {"id":id,"status":status,"depends_on":deps or [],"priority":priority}

class GraphTests(unittest.TestCase):
    def test_stable_order(self):
        tasks=[t("CT-03",deps=["CT-01"],priority=9),t("CT-02",priority=4),t("CT-01",status="VERIFIED")]
        self.assertEqual(plan_ready(tasks),["CT-03","CT-02"])
        self.assertEqual(tasks[0]["status"],"READY")
    def test_pending_dependency_blocks(self):
        self.assertEqual(plan_ready([t("CT-01"),t("CT-02",deps=["CT-01"])]),["CT-01"])
    def test_cycle_rejected(self):
        with self.assertRaises(TaskGraphDenied):
            validate_graph([t("CT-01",deps=["CT-02"]),t("CT-02",deps=["CT-01"])])
    def test_self_and_unknown_dependencies(self):
        for tasks in ([t("CT-01",deps=["CT-01"])],[t("CT-01",deps=["CT-99"])]):
            with self.assertRaises(TaskGraphDenied):
                validate_graph(tasks)
    def test_duplicates_and_malformed_rejected(self):
        for tasks in ([t("CT-01"),t("CT-01")],[t("CT-01",deps=["CT-02","CT-02"]),t("CT-02")],[t("CT-01",priority=True)],[t("CT-01",status="UNKNOWN")],[{"id":"bad"}]):
            with self.assertRaises(TaskGraphDenied):
                validate_graph(tasks)
    def test_empty(self):
        self.assertEqual(plan_ready([]),[])
if __name__=="__main__":
    unittest.main()
