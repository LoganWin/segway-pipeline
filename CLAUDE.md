# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- Your owner name on the task board is `claude`; your branches are `claude/T-###-slug`.
- For tasks touching more than a couple of files, plan first (plan mode), then implement.
- Before setting a task to `review`, run `make lint` and `make test` and paste the result summary into the handoff.
- When reviewing a `codex` task, run its verification steps yourself instead of relying on the handoff note.
- Commit only when the user asks or when the protocol requires it (claiming a task, finishing a task branch).
