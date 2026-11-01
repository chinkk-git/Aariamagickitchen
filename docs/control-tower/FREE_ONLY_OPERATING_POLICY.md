# Free-only GitHub orchestration policy — 2026-10-19

User-approved: use only free allowances; **do not enable paid AI coding agents or paid GitHub Actions usage**. This does not authorize account-level billing changes.

- Use existing GitHub Actions and short event-driven jobs. No additional cron polling, hosted paid runner, paid LLM API or repository secret.
- Keep default `GITHUB_TOKEN` read-only. Dispatcher requests only `issues:write`; validator requests only `contents:read`. Never expose production signing keys or allow Actions to approve its own PR.
- Keep PR #10 in draft until reviewed. Do not auto-merge to `main`.
- For public repositories, GitHub-hosted standard runners may be free under GitHub's current pricing rules, but **account spending controls must be checked in GitHub Billing**. A repository workflow cannot enforce a global $0 paid-usage ceiling.
- Existing delivery watchdog runs twice hourly and may consume unnecessary resources. Review cadence separately; do not misrepresent its activity labels as Work liveness.
- Trigger dispatcher by applying `ct:ready` to a properly formatted issue or manual workflow dispatch. A dispatch only queues the task; it does not invoke a coding LLM, wake a ChatGPT Work session or claim an exclusive lease.
- GitHub issue-form markdown must be normalized before dispatch; never trust arbitrary issue bodies as code or shell commands.
- No unattended coding agent is installed by this phase. Fully autonomous source edits need a separately approved free, executable worker with secure permissions and verified availability. Until then, GitHub can automate coordination, testing, reporting and safe gating, not coding itself.
