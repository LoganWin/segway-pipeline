# Task board

Protocol: see "Collaboration protocol" in [AGENTS.md](../AGENTS.md). Claim a task by editing `Owner` and `Status` and committing that change on `main` before starting work.

Statuses: `todo` · `in-progress` · `review` · `done` · `blocked`
Owners: `claude` · `codex` · `—` (unclaimed)

## Summary

| ID | Title | Phase | Depends on | Owner | Status |
|---|---|---|---|---|---|
| T-001 | Backend scaffold | 1 | — | — | todo |
| T-002 | Frontend scaffold | 1 | — | — | todo |
| T-003 | DB models + initial migration | 1 | T-001 | — | todo |
| T-004 | Profile & experience API | 1 | T-003 | — | todo |
| T-005 | Jobs & application status API | 1 | T-003 | — | todo |
| T-006 | Dashboard UI | 1 | T-002, T-005 | — | todo |
| T-007 | Profile editor UI | 1 | T-002, T-004 | — | todo |

T-001 and T-002 are independent: one per agent in parallel. Likewise T-004/T-005, then T-006/T-007.

Keep the summary table and the task details in sync.

---

### T-001 Backend scaffold
- **Owner:** — · **Status:** todo · **Depends on:** —
- **Scope:** `backend/**`, root `Makefile`
- **Acceptance criteria:**
  - `backend/pyproject.toml` managed by uv (Python 3.13) with FastAPI, uvicorn, SQLModel, Alembic, pydantic-settings; dev deps ruff, pyright, pytest, httpx.
  - `backend/app/main.py` exposes `GET /api/health` → `{"status": "ok"}`; CORS allows `http://localhost:5173`.
  - Settings loaded from `.env` via pydantic-settings (`DATABASE_URL`, `ANTHROPIC_API_KEY` optional).
  - Folder skeleton: `app/{api,models,services,ai,resume,ats}/__init__.py`, `tests/`.
  - `tests/test_health.py` passes.
  - Root `Makefile` with `setup`, `dev`, `test`, `lint`, `migrate` targets for the backend part (frontend parts may be stubs for T-002 to fill in).
- **Handoff:**
- **Review:**

### T-002 Frontend scaffold
- **Owner:** — · **Status:** todo · **Depends on:** —
- **Scope:** `frontend/**`, frontend targets in root `Makefile` (coordinate if T-001 hasn't landed: create the targets and note it)
- **Acceptance criteria:**
  - Vite + React + TypeScript (strict) app in `frontend/`, managed by pnpm.
  - Tailwind and shadcn/ui set up; React Router with placeholder pages `/` (Dashboard), `/jobs/:id`, `/profile`.
  - TanStack Query provider; `src/api/client.ts` uses `openapi-fetch` with types from `src/api/schema.ts`.
  - `pnpm gen:api` runs `openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.ts`; `make types` calls it.
  - Vite dev server proxies `/api` to `http://localhost:8000`.
  - ESLint, Prettier, Vitest configured; one smoke test renders the app shell.
- **Handoff:**
- **Review:**

### T-003 DB models + initial migration
- **Owner:** — · **Status:** todo · **Depends on:** T-001
- **Scope:** `backend/app/models/**`, `backend/alembic/**`, `backend/app/db.py`, `backend/tests/**`
- **Acceptance criteria:**
  - SQLModel tables for the Phase 1 data model in [ARCHITECTURE.md](ARCHITECTURE.md#core-data-model-phase-1).
  - Alembic configured to read `DATABASE_URL`; initial migration creates all tables; `make migrate` works on a fresh `data/app.db`.
  - Session dependency for FastAPI; test fixture providing a temporary DB.
  - Tests for relationships and the status enum.
- **Handoff:**
- **Review:**

### T-004 Profile & experience API
- **Owner:** — · **Status:** todo · **Depends on:** T-003
- **Scope:** `backend/app/api/profile*.py`, `backend/app/services/profile*.py`, related tests, `frontend/src/api/schema.ts` (regenerate only)
- **Acceptance criteria:**
  - `GET/PUT /api/profile`; CRUD for `/api/experiences`, `/api/experiences/{id}/bullets`, `/api/skills`, `/api/answers`.
  - Request/response models are separate from table models.
  - Tests cover create, update, delete, and 404s.
  - `schema.ts` regenerated.
- **Handoff:**
- **Review:**

### T-005 Jobs & application status API
- **Owner:** — · **Status:** todo · **Depends on:** T-003
- **Scope:** `backend/app/api/jobs*.py`, `backend/app/api/applications*.py`, matching services, tests, `frontend/src/api/schema.ts` (regenerate only)
- **Acceptance criteria:**
  - CRUD for `/api/jobs` (with filter by status and company); creating a job creates its `Application` in `saved`.
  - `POST /api/applications/{id}/transition` validates allowed status transitions and appends a `StatusEvent`.
  - `GET /api/applications/{id}/history` returns events in order.
  - Tests cover valid and invalid transitions.
  - `schema.ts` regenerated.
- **Handoff:**
- **Review:**

### T-006 Dashboard UI
- **Owner:** — · **Status:** todo · **Depends on:** T-002, T-005
- **Scope:** `frontend/src/pages/Dashboard*`, `frontend/src/pages/JobDetail*`, `frontend/src/components/jobs/**`
- **Acceptance criteria:**
  - Dashboard: job table (company, title, status, updated) with status filter, plus a board view grouped by status.
  - Add/edit job form (paste URL and description).
  - Job detail: fields, status change control, and status history timeline.
  - Loading, empty, and error states; Vitest component tests for the form and status control.
- **Handoff:**
- **Review:**

### T-007 Profile editor UI
- **Owner:** — · **Status:** todo · **Depends on:** T-002, T-004
- **Scope:** `frontend/src/pages/Profile*`, `frontend/src/components/profile/**`
- **Acceptance criteria:**
  - Edit profile fields; list/add/edit/delete experiences and their bullets; manage skills and reusable answers.
  - Bullets can be tagged with skills and marked verified.
  - Vitest component tests for the experience and bullet editors.
- **Handoff:**
- **Review:**
