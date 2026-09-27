# segway-pipeline

AI Job Applier: a personal, local-first tool that tracks jobs, matches them against a verified experience database, compiles tailored one-page resumes, and (later) fills ATS forms, with human approval before anything is submitted.

**Status:** planning done; Phase 1 (Personal ATS) is next, starting with T-001 (backend scaffold) and T-002 (frontend scaffold).

## Docs

- [Roadmap](docs/ROADMAP.md): the 7 phases and their exit criteria (MVP = Phases 1–3)
- [Architecture](docs/ARCHITECTURE.md): stack, components, data model, privacy boundaries
- [Task board](docs/TASKS.md): current work items
- [Decisions](docs/DECISIONS.md): ADR log
- [AGENTS.md](AGENTS.md): rules for coding agents (Claude Code and Codex), including the collaboration protocol

## Stack

Python 3.13 · uv · FastAPI · SQLModel · SQLite · Alembic | Vite · React · TypeScript · Tailwind · shadcn/ui · pnpm | Anthropic SDK · Typst · Playwright (later phases)

## Getting started

Prerequisites: Python 3.13, [uv](https://docs.astral.sh/uv/) (`brew install uv`), Node 24, pnpm.

```sh
cp .env.example .env   # add your ANTHROPIC_API_KEY when Phase 2 starts
make setup
make migrate
make dev               # API :8000, UI :5173
```

(The `make` targets are created by tasks T-001 and T-002.)

## Working with Claude Code and Codex

Both agents follow [AGENTS.md](AGENTS.md) and take work from the [task board](docs/TASKS.md). To run them in parallel without conflicts, give each one its own git worktree:

```sh
# 1. In docs/TASKS.md, set Owner and Status: in-progress for each task, then commit on main
git commit -am "chore(tasks): assign T-001 to claude, T-002 to codex"

# 2. One folder + branch per agent
git worktree add ../segway-claude -b claude/T-001-backend-scaffold
git worktree add ../segway-codex  -b codex/T-002-frontend-scaffold

# 3. Start each agent in its own terminal
cd ../segway-claude && claude "You own T-001 in docs/TASKS.md. Follow AGENTS.md, implement it, run lint and tests, fill in Handoff, set Status: review, and commit."
cd ../segway-codex  && codex  "You own T-002 in docs/TASKS.md. Follow AGENTS.md, implement it, run lint and tests, fill in Handoff, set Status: review, and commit."
```

When both tasks are in `review`, have each agent review the other's branch against its acceptance criteria. Then merge from the main folder and clean up:

```sh
git merge claude/T-001-backend-scaffold
git merge codex/T-002-frontend-scaffold   # resolve any shared-file conflicts (e.g. Makefile)
# mark tasks done in docs/TASKS.md and commit
git worktree remove ../segway-claude
git worktree remove ../segway-codex
```

Don't run two agents in the same folder: they would switch branches in the same checkout and overwrite each other's work.
