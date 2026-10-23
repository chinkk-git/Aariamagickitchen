"""Conservative A10 CI recovery classification. No side effects."""
TRANSIENT = {"runner_lost", "github_service_unavailable", "artifact_upload_service_error"}
DETERMINISTIC = {"assertion_failure", "image_regression", "compilation_failure", "security_gate_failure"}
def classify(*, conclusion, failure_code=None, attempt=0, max_retries=1):
    if conclusion == "success":
        return "PASS"
    if conclusion in {"queued", "in_progress", None}:
        return "WAIT"
    if conclusion != "failure":
        return "ESCALATE"
    if failure_code in DETERMINISTIC:
        return "REMEDIATION_REQUIRED"
    if failure_code not in TRANSIENT:
        return "INVESTIGATE"
    if type(attempt) is not int or type(max_retries) is not int or attempt < 0 or max_retries < 0:
        return "ESCALATE"
    return "RETRY_ELIGIBLE" if attempt < max_retries else "CIRCUIT_OPEN"
