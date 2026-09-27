# AGENTS.md

Shared instructions for every coding agent on this repo (Codex reads this file directly; Claude Code loads it through `CLAUDE.md`). If a rule here conflicts with an agent-specific file, this file wins.

## Project

**segway-pipeline** is a personal, local-first AI job-application tool. It stores a verified profile and experience database, tracks jobs, matches them against the profile with AI, compiles tailored one-page resumes, and later fills ATS forms, always behind a human approval step.

- Roadmap and phase exit criteria: [docs/ROADMAP.md](docs/ROADMAP.md)
- Architecture, stack, and data model: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Task board (the source of work): [docs/TASKS.md](docs/TASKS.md)
- Decision log: [docs/DECISIONS.md](docs/DECISIONS.md)

## Stack (summary)

- **Backend:** Python 3.13, uv, FastAPI, Pydantic v2, SQLModel/SQLAlchemy 2, Alembic, SQLite
- **Frontend:** Vite, React, TypeScript, TanStack Query, React Router, Tailwind, shadcn/ui, pnpm
- **Contract:** FastAPI OpenAPI → `openapi-typescript` → `frontend/src/api/schema.ts`
- **Later phases:** Anthropic SDK (AI matching), Typst (resume PDF), Playwright for Python (ATS adapters)

## Layout

```
backend/    FastAPI app (app/{api,models,services,ai,resume,ats}), tests/, alembic/
frontend/   React SPA (src/{api,pages,components})
docs/       roadmap, architecture, task board, decisions
data/       local SQLite DB, uploads, generated PDFs (gitignored, never commit)
```

## Commands

Run everything from the repo root. These targets are created in T-001/T-002; until they exist, use the per-package commands in the task.

| Command | What it does |
|---|---|
| `make setup` | `uv sync` in `backend/`, `pnpm install` in `frontend/` |
| `make dev` | API on `localhost:8000`, UI on `localhost:5173` |
| `make test` | `pytest` + `vitest run` |
| `make lint` | `ruff check`, `ruff format --check`, `pyright`, `eslint`, `tsc --noEmit` |
| `make types` | Regenerate `frontend/src/api/schema.ts` from the running API's OpenAPI |
| `make migrate` | `alembic upgrade head` |

A task is not done until `make lint` and `make test` pass.

## Conventions

- Type everything: Pydantic/SQLModel models on the backend, no `any` on the frontend.
- Keep route handlers thin; business logic lives in `backend/app/services/`.
- Every behavior change ships with tests. Backend tests use a temporary SQLite DB, never `data/`.
- Schema changes go through an Alembic migration; never edit an applied migration.
- Match the style of surrounding code; don't reformat files you aren't otherwise changing.
- Dependencies: add only what the task needs, and mention each new one in the handoff note.

## Safety and privacy (non-negotiable)

- **Never submit a job application** from code except through the approval gate (Phase 5+). Phase 4 adapters fill forms only.
- **No real personal data in the repo.** Fixtures, tests, and examples use obviously fake people and companies.
- Secrets live only in `.env` (see `.env.example`). Never commit `.env` or anything under `data/`.
- AI output that claims a fact about the user must cite the profile record it came from; never invent experience.
- Respect site terms: no scraping behind logins, no bulk or unattended applying.

## Collaboration protocol (Claude ⇄ Codex)

Both agents are peers. Work is coordinated through [docs/TASKS.md](docs/TASKS.md).

1. **Pick a task** with `Status: todo` whose dependencies are `done`. Don't start work that isn't on the board; add a task first (or ask the user).
2. **Claim it** by setting `Owner: claude` or `Owner: codex` and `Status: in-progress`, then commit only that change to `main` (`chore(tasks): claim T-###`). If someone else claimed it first, pick another task. When agents run in parallel worktrees, the user pre-assigns tasks on `main` instead. If your task already shows you as owner and `in-progress`, skip this step.
3. **Branch:** `claude/T-###-short-slug` or `codex/T-###-short-slug`. One in-progress task per agent at a time.
4. **Stay in scope.** Only touch the files/areas listed in the task's `Scope`. If you need a change elsewhere, note it in the handoff or add a new task.
5. **Contract changes:** if you change an API model or route, regenerate `schema.ts` (`make types`) in the same branch and say so in the handoff.
6. **Commits:** conventional style, prefixed with the task ID, e.g. `feat(api): T-004 add experience CRUD`.
7. **Hand off:** fill in the task's `Handoff` section (what changed, how you verified it, follow-ups, new dependencies), set `Status: review`, and push the branch or open a PR.
8. **Review:** the *other* agent reviews tasks in `review`, checking acceptance criteria, tests, and scope. Leave findings under `Review` in the task. The user merges and sets `Status: done`.
9. **Decisions:** any architectural choice that isn't already in `docs/DECISIONS.md` gets a new ADR entry in the same branch.

If the board and the code disagree, trust the code and fix the board.
