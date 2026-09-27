# segway-pipeline

AI Job Applier: a personal, local-first tool that tracks jobs, matches them against a verified experience database, compiles tailored one-page resumes, and (later) fills ATS forms, with human approval before anything is submitted.

**Status:** planning done; Phase 1 (Personal ATS) is next.

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
