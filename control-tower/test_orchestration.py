#!/usr/bin/env python3
"""Free deterministic safety tests; no network, secrets or runner charges beyond CI."""
import unittest
from lease import claim,release
NOW="2026-10-19T21:00:00Z"
class Gates(unittest.TestCase):
 def test_first_claim_wins(self):
  r=claim({"status":"READY"},"v3","token-a",NOW)
  with self.assertRaisesRegex(ValueError,"already claimed"): claim(r,"v31","token-b",NOW)
 def test_owner_only_release(self):
  r=claim({"status":"READY"},"v3","token-a",NOW)
  with self.assertRaisesRegex(ValueError,"owner mismatch"): release(r,"v31","token-b",NOW)
  self.assertEqual(release(r,"v3","token-a",NOW)["status"],"READY")
 def test_expired_reclaim(self):
  r=claim({"status":"READY"},"v3","token-a",NOW,60)
  r=claim(r,"v31","token-b","2026-10-19T21:01:01Z")
  self.assertEqual(r["lease"]["worker"],"v31")
 def test_blocked_cannot_claim(self):
  with self.assertRaisesRegex(ValueError,"not ready"): claim({"status":"BLOCKED"},"v3","token",NOW)
 def test_expired_owner_cannot_release(self):
  r=claim({"status":"READY"},"v3","token",NOW,60)
  with self.assertRaisesRegex(ValueError,"expired"): release(r,"v3","token","2026-10-19T21:01:01Z")
 def test_lease_duration_bounds(self):
  with self.assertRaisesRegex(ValueError,"invalid"): claim({"status":"READY"},"v3","token",NOW,10)
 def test_expiry_boundary_is_exclusive(self):
  r=claim({"status":"READY"},"v3","token-a",NOW,60)
  expires=r["lease"]["expires_at"]
  with self.assertRaisesRegex(ValueError,"expired"): release(r,"v3","token-a",expires)
  reclaimed=claim(r,"v31","token-b",expires)
  self.assertEqual(reclaimed["lease"]["worker"],"v31")
if __name__=="__main__": unittest.main(verbosity=2)
