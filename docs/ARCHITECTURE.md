# Architecture

## Principles

- **Local-first and private.** Runs on the user's machine; the SQLite DB and documents live in `data/`. Hosting is deferred until the workflow is proven.
- **Verified facts only.** The profile/experience DB is the source of truth. AI may select, rephrase, and rank facts from it, but not invent them.
- **Human in the loop.** Nothing is submitted without explicit approval (see ADR-003).
- **Typed contract.** The backend owns the API schema; the frontend consumes generated types.

## Stack

| Layer | Choice | Phase |
|---|---|---|
| Python env | Python 3.13 + uv (`brew install uv`) | 1 |
| API | FastAPI + Pydantic v2 | 1 |
| Persistence | SQLite via SQLModel / SQLAlchemy 2, migrations with Alembic | 1 |
| Frontend | Vite + React + TypeScript, TanStack Query, React Router, Tailwind + shadcn/ui, pnpm | 1 |
| API types | openapi-typescript → `frontend/src/api/schema.ts` | 1 |
| Quality | ruff, pyright, pytest · eslint, prettier, tsc, vitest | 1 |
| AI | Anthropic Python SDK, `claude-sonnet-5` by default; tool-use structured output parsed into Pydantic models; prompts as files in `backend/app/ai/prompts/` | 2 |
| Resume PDF | Typst (`typst` PyPI package), template in `backend/app/resume/templates/`; build fails if output isn't exactly one page | 3 |
| ATS automation | Playwright for Python; one adapter per ATS in `backend/app/ats/` (Greenhouse first); tested against saved HTML fixtures | 4 |
| Browser extension | WXT (TypeScript), for job capture and in-page assist | post-MVP |

## Components

```
 ┌──────────────────────┐     HTTP/JSON      ┌───────────────────────────────┐
 │ frontend (React SPA) │ ─────────────────▶ │ backend (FastAPI)             │
 │ dashboard, profile,  │ ◀───────────────── │  api/       thin routes       │
 │ job detail, review   │  generated types   │  services/  business logic    │
 └──────────────────────┘                    │  models/    SQLModel tables   │
                                             │  ai/        extract + match   │──▶ Anthropic API
                                             │  resume/    Typst compiler    │──▶ data/out/*.pdf
                                             │  ats/       Playwright fill   │──▶ employer ATS (fill only)
                                             └──────────────┬────────────────┘
                                                            ▼
                                                    data/app.db (SQLite)
```

## Core data model (Phase 1)

| Entity | Key fields | Notes |
|---|---|---|
| `Profile` | name, email, phone, location, links, work authorization | Single row for now |
| `Experience` | kind (job/project/education), org, title, start/end, location | Master record |
| `Bullet` | experience_id, text, skills[], metrics, verified | Atomic, reusable resume lines; the unit AI selects from |
| `Skill` | name, category, proficiency | Linked to bullets |
| `Answer` | question_key, text | Reusable application answers (e.g. "Why this company") |
| `Document` | kind (resume/cover/other), path in `data/`, created_at | Files never stored in the DB |
| `Job` | company, title, url, source, location, description (raw), ats_type | `ats_type` feeds Phase 4 |
| `Application` | job_id, status, resume_document_id, notes | One per job for now |
| `StatusEvent` | application_id, from_status, to_status, at, note | Append-only history |

Application statuses: `saved → preparing → ready_for_review → applied → interviewing → offer | rejected | withdrawn`.

Phase 2 adds `JobRequirement` and `MatchResult` (requirement ↔ bullet links with evidence). Phase 5 adds `FillPlan` (field, value, source record, confidence) and `Approval`.

## Data and privacy boundaries

- `data/` and `.env` are gitignored. Tests use temporary databases.
- Only the job text and the relevant profile excerpts are sent to the AI provider; no document binaries.
- The API key stays on the backend and is never exposed to the frontend.
- Export/delete-all will be provided before any hosted deployment.
