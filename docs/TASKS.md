# Task board

Protocol: see "Collaboration protocol" in [AGENTS.md](../AGENTS.md). Claim a task by editing `Owner` and `Status` and committing that change on `main` before starting work.

Statuses: `todo` · `in-progress` · `review` · `done` · `blocked`
Owners: `claude` · `codex` · `—` (unclaimed)

## Summary

| ID | Title | Phase | Depends on | Owner | Status |
|---|---|---|---|---|---|
| T-001 | Backend scaffold | 1 | — | claude | done |
| T-002 | Frontend scaffold | 1 | — | codex | done |
| T-003 | DB models + initial migration | 1 | T-001 | codex | done |
| T-004 | Profile & experience API | 1 | T-003 | claude | done |
| T-005 | Jobs & application status API | 1 | T-003 | codex | done |
| T-006 | Dashboard UI | 1 | T-002, T-005 | codex | in-progress |
| T-007 | Profile editor UI | 1 | T-002, T-004 | claude | in-progress |
| T-008 | Profile service layering cleanup | 1 | T-005 | — | todo |

T-001 and T-002 are independent: one per agent in parallel. Likewise T-004/T-005, then T-006/T-007.

Keep the summary table and the task details in sync.

---

### T-001 Backend scaffold
- **Owner:** claude · **Status:** done · **Depends on:** —
- **Scope:** `backend/**`, root `Makefile`
- **Acceptance criteria:**
  - `backend/pyproject.toml` managed by uv (Python 3.13) with FastAPI, uvicorn, SQLModel, Alembic, pydantic-settings; dev deps ruff, pyright, pytest, httpx.
  - `backend/app/main.py` exposes `GET /api/health` → `{"status": "ok"}`; CORS allows `http://localhost:5173`.
  - Settings loaded from `.env` via pydantic-settings (`DATABASE_URL`, `ANTHROPIC_API_KEY` optional).
  - Folder skeleton: `app/{api,models,services,ai,resume,ats}/__init__.py`, `tests/`.
  - `tests/test_health.py` passes.
  - Root `Makefile` with `setup`, `dev`, `test`, `lint`, `migrate` targets for the backend part (frontend parts may be stubs for T-002 to fill in).
- **Handoff:**
  - **What changed:**
    - `backend/pyproject.toml` (uv, Python `>=3.13,<3.14`, pinned via `backend/.python-version`) + `uv.lock`. Runtime: fastapi, uvicorn[standard], sqlmodel, alembic, pydantic-settings. Dev group: ruff, pyright, pytest, **httpx2**. ruff, pyright (strict), and pytest are configured in `pyproject.toml`.
    - `app/main.py`: `create_app()` factory plus module-level `app`; CORS from settings (default `["http://localhost:5173"]`).
    - `app/api/health.py`: `GET /api/health` → `HealthResponse{status: "ok"}` (typed, so it appears in OpenAPI for T-002's `schema.ts`).
    - `app/config.py`: `Settings` (pydantic-settings) reads `DATABASE_URL`, `ANTHROPIC_API_KEY` (optional, default `None`), and `CORS_ORIGINS` from the env and the **repo-root** `.env`; `get_settings()` is cached.
    - Skeleton `app/{api,models,services,ai,resume,ats}/__init__.py`, `tests/`.
    - Root `Makefile` with `setup`, `dev` (`-j2 dev-api dev-web`), `test`, `lint`, `types`, `migrate`. Frontend recipes are guarded by `$(wildcard frontend/package.json)` and turn on automatically once T-002 lands: they call `pnpm install`, `pnpm dev`, `pnpm vitest run`, `pnpm eslint .` + `pnpm tsc --noEmit`, and `pnpm gen:api`. `migrate` exits with a clear message until T-003 adds `backend/alembic.ini`.
  - **Verification:** `make lint` → ruff `All checks passed!`, `12 files already formatted`, pyright `0 errors, 0 warnings, 0 informations` (frontend lint skipped: no `frontend/` yet). `make test` → `5 passed` (health, CORS allowed/rejected origin, settings from env, optional API key). Both exit 0. Also ran uvicorn manually: `curl /api/health` → `{"status":"ok"}`, and preflight from `http://localhost:5173` returns `access-control-allow-origin: http://localhost:5173`.
  - **Deviation:** the criteria say `httpx`, but the resolved Starlette (1.7) deprecates `httpx` for `TestClient` and only type-declares against `httpx2`. With `httpx`, pyright strict reports 11 unknown-type errors and pytest emits a `StarletteDeprecationWarning`, so the dev dependency is `httpx2`.
  - **Follow-ups:**
    - T-003: `DATABASE_URL=sqlite:///data/app.db` is cwd-relative, and `make` runs the backend from `backend/`, so it would resolve to `backend/data/app.db`. Resolve relative SQLite paths against `REPO_ROOT` (exported from `app/config.py`) in `db.py` / Alembic `env.py`.
    - Merge: T-002 may also create a root `Makefile` and edit this board's summary table, so expect a conflict. Keep this Makefile's structure and replace the guarded frontend recipes with T-002's commands if they differ.
    - The claim commit (`chore(tasks): claim T-001`) was never made on `main`. The Owner/Status change is in this branch instead.
    - If your shell has `VIRTUAL_ENV` set (e.g. conda), `uv run` prints a harmless "does not match the project environment" warning.
  - **New dependencies:** all of the above (first backend deps); `httpx2` replaces the listed `httpx`.
- **Review:** (claude, at merge, 2026-09-27) Approved. All acceptance criteria met. Confirmed the `httpx2` deviation: Starlette 1.7.0's `testclient` imports `httpx2` (resolved from PyPI). After merging with T-002, combined `make lint` and `make test` pass (backend 5, frontend 3), and `make dev` serves `/api/health` directly and through the Vite proxy. Carry-over to T-003: resolve the relative SQLite path against `REPO_ROOT`.

### T-002 Frontend scaffold
- **Owner:** codex · **Status:** done · **Depends on:** —
- **Scope:** `frontend/**`, frontend targets in root `Makefile` (coordinate if T-001 hasn't landed: create the targets and note it)
- **Acceptance criteria:**
  - Vite + React + TypeScript (strict) app in `frontend/`, managed by pnpm.
  - Tailwind and shadcn/ui set up; React Router with placeholder pages `/` (Dashboard), `/jobs/:id`, `/profile`.
  - TanStack Query provider; `src/api/client.ts` uses `openapi-fetch` with types from `src/api/schema.ts`.
  - `pnpm gen:api` runs `openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.ts`; `make types` calls it.
  - Vite dev server proxies `/api` to `http://localhost:8000`.
  - ESLint, Prettier, Vitest configured; one smoke test renders the app shell.
- **Handoff:**
  - Implemented Vite/React with strict TypeScript, pnpm lockfile, Tailwind v4, shadcn/ui configuration and Card component, shared navigation, and placeholder Dashboard, Job detail, and Profile routes. Added TanStack Query provider, typed same-origin `openapi-fetch` client, `/api` dev proxy, ESLint/Prettier/Vitest, and frontend usage notes.
  - Generated `src/api/schema.ts` with `make types` against the running T-001 backend from adjacent worktree commit `1c3a9ac`; no API routes/models changed. `pnpm gen:api` uses the required localhost OpenAPI command.
  - Verified: `make lint` (ESLint, strict TypeScript, Prettier), `make test` (3 passing tests covering shell, navigation, job route and unknown route), `pnpm --dir frontend build`, and `git diff --check`. Live Vite checks confirmed `/api/health` returns `{"status":"ok"}` through the proxy and `/jobs/example-job` serves the SPA. These Make checks cover the frontend only because T-001 is not present on this branch.
  - T-001 integration: this branch creates frontend-only root Make targets as allowed by scope. Resolve the expected Makefile add/add conflict by retaining T-001's backend/aggregate targets and calling `pnpm lint` in `lint-frontend` (includes formatting); keep `pnpm test` in `test-frontend`, `pnpm install` in setup, `pnpm dev` in `dev-web`, and `pnpm gen:api` in `types`. Preserve both task handoffs when resolving the board. Re-run combined `make lint` and `make test` after integration. T-006/T-007 implement the placeholder pages.
  - Runtime dependencies: `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `openapi-fetch`, `clsx`, `tailwind-merge`. Dev dependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `prettier`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `openapi-typescript`. Node 22.12+ and pnpm 10.22.0; jest-dom is pinned to 6.9.1 to avoid the deprecated 6.10 release. shadcn CLI was used only to generate source, not added as a dependency.
  - Assignment was supplied by the user; corrected the stale unclaimed board entry on the existing `codex/T-002-frontend-scaffold` worktree. Unrelated changes on `main` were left untouched.
- **Review:** (claude, at merge, 2026-09-27) Approved. All acceptance criteria met; scope respected. `make types` against the merged backend leaves `schema.ts` unchanged. The Makefile add/add conflict was resolved as the handoff suggested: T-001's structure, with `test-frontend` → `pnpm test` and `lint-frontend` → `pnpm lint`. SPA routes return 200 in dev. Minor, non-blocking: `index.css` declares a `dark` variant but defines no dark tokens.

### T-003 DB models + initial migration
- **Owner:** codex · **Status:** done · **Depends on:** T-001
- **Scope:** `backend/app/models/**`, `backend/alembic/**`, `backend/app/db.py`, `backend/tests/**`
- **Acceptance criteria:**
  - SQLModel tables for the Phase 1 data model in [ARCHITECTURE.md](ARCHITECTURE.md#core-data-model-phase-1).
  - Alembic configured to read `DATABASE_URL`; initial migration creates all tables; `make migrate` works on a fresh `data/app.db`.
  - Session dependency for FastAPI; test fixture providing a temporary DB.
  - Tests for relationships and the status enum.
  - Relative SQLite paths in `DATABASE_URL` resolve against `REPO_ROOT` (from `app/config.py`), so `sqlite:///data/app.db` is always `<repo>/data/app.db` whether run from the repo root or `backend/`. `data/` is created if missing. Covered by a test.
- **Handoff:**
  - **What changed:** All nine Phase 1 SQLModel entities plus the `BulletSkill` join table, bidirectional relationships, exact experience/document kinds and application status values, database enum checks, singleton profile, and one application per job. Profile links are a JSON string list; bullet metrics are optional text; experience dates are `start_date`/`end_date`. Mutable records have UTC `created_at`/`updated_at`; documents have `created_at`, history has `at`. Required parent foreign keys permit `None` during transient ORM construction but remain NOT NULL in SQLite. Experience deletion cascades to bullets and skill links; job deletion cascades to its application/history; deleting skills only removes links; deleting documents nulls resume references. History relationships sort by timestamp then ID.
  - **Database/migration:** `app/db.py` resolves SQLite files against `REPO_ROOT`, creates missing parent directories, enables SQLite foreign keys on every connection, caches the app engine, and exposes the FastAPI `get_session` yield dependency. Alembic uses the same resolved settings URL, ignoring ini URL values. Initial revision `a200917fe6d8` was generated with `revision --autogenerate` against an empty temporary DB and reviewed for constraints, cascades, indexes, and downgrade order; generated SQLModel type references were replaced with standalone SQLAlchemy types. Tests use migrated temporary databases, never `data/`.
  - **Verification:** `make setup` passed with `UV_CACHE_DIR=/tmp/segway-codex-uv-cache` (the default uv cache is outside the sandbox). `make lint` passed: ruff clean, 19 files formatted, pyright strict 0 errors/0 warnings, frontend ESLint/TypeScript/Prettier clean. `make test` passed: backend **39 passed**, frontend **3 passed**. Coverage includes relationships, ORM and database cascades, enum round trips and database rejection, singleton/unique constraints, session cleanup, relative paths from repo/backend working directories, URL preservation, settings-driven migrations, metadata drift, and downgrade/re-upgrade. A separate root `make migrate` with `DATABASE_URL` pointing to a fresh temporary `data/app.db` passed: **11 tables including alembic_version**, revision `a200917fe6d8`, no foreign-key violations.
  - **Deviations:** The original nested Alembic config was moved to `backend/alembic.ini` during review fixes at the user's request; the root `migrate` target now invokes `uv run alembic upgrade head`. No API routes or request/response models changed, so OpenAPI regeneration was unnecessary.
  - **Follow-ups:** T-004/T-005 can import tables from `app.models` and use `Depends(get_session)`. T-005 implements valid transitions and appends history entries; transition policy and append-only service behavior are not implemented in this persistence task. For manual Alembic commands, run `uv run alembic ...` from `backend/`. The orchestrator handles cross-review and merging; nothing was pushed.
  - **New dependencies:** None.
  - **Review fixes:** Set the shared SQLModel metadata naming convention for ix/uq/ck/fk/pk before model definitions and replaced initial revision `a200917fe6d8` with autogenerated/reviewed `81399f08d329`. All table constraints are named; the status-event checks are explicitly `ck_statusevent_from_status_applicationstatus` and `ck_statusevent_to_status_applicationstatus` in the migration. Added `UTCDateTime` to every datetime column (store naive UTC, reload aware UTC; naive inputs mean UTC), with UTC/non-UTC/naive round-trip tests. Defaulted Job description and company to empty strings so URL/title alone can be persisted. Moved config to `backend/alembic.ini`, corrected script/import paths, and updated the Makefile and migration fixture. Verified `make lint`, `make test` (**44 backend + 3 frontend passed**), fresh temporary-DB `make migrate`, and `cd backend && uv run alembic check` on that database (**no new upgrade operations**), using `UV_CACHE_DIR=/tmp/segway-codex-uv-cache`. Regression coverage checks constraint names and minimal job creation. No new dependencies; status remains review; nothing pushed.
- **Review:** (claude sub-agent + orchestrator, 2026-09-27) Approved after one fix round. The fixes added named constraints, distinct CHECK names, UTC-aware datetimes, `Job.description`/`company` defaulting to "", and moved `alembic.ini` to `backend/`. Verified: lint clean, 44 backend + 3 frontend tests, fresh migrate, `alembic check` clean. Carry-over for T-004/T-005: request schemas must require FK ids (the models type them `int | None`); `Job.url` isn't unique, so any dedupe is the API's job.

### T-004 Profile & experience API
- **Owner:** claude · **Status:** done · **Depends on:** T-003
- **Scope:** `backend/app/api/profile*.py`, `backend/app/services/profile*.py`, related tests, `frontend/src/api/schema.ts` (regenerate only)
- **Acceptance criteria:**
  - `GET/PUT /api/profile`; CRUD for `/api/experiences`, `/api/experiences/{id}/bullets`, `/api/skills`, `/api/answers`.
  - Request/response models are separate from table models.
  - Tests cover create, update, delete, and 404s.
  - `schema.ts` regenerated.
- **Handoff:**
  - **What changed:**
    - `app/api/profile_schemas.py`: request/response Pydantic models, separate from the tables (`ProfileRequest/Response`, `ExperienceRequest/Response`, `BulletRequest/Response`, `SkillRequest/Response`, `AnswerRequest/Response`). The same request model serves POST and PUT, so PUT is a full replacement and omitted optional fields reset to their defaults. Required strings are whitespace-stripped and non-empty. `ExperienceRequest` rejects `end_date < start_date` (422). Responses serialize `created_at`/`updated_at` as UTC ISO-8601 (`...Z`), and the OpenAPI type keeps `format: date-time`.
    - `app/services/profile.py`: all logic. Raises `NotFoundError` (404), `ConflictError` (409), and `InvalidReferenceError` (422), which the routes turn into `HTTPException`s through one `service_errors()` context manager.
    - `app/api/profile.py`: thin routes, combined into one `router`. `app/main.py` got one import and one `include_router(profile_router, prefix="/api")` line.
    - Endpoints:
      - `GET/PUT /api/profile`. **`GET` returns 404 until the first `PUT`.** `PUT` upserts the single row (id 1) and keeps `created_at`.
      - `GET/POST /api/experiences`, `GET/PUT/DELETE /api/experiences/{id}`.
      - `GET/POST /api/experiences/{id}/bullets`, `GET/PUT/DELETE /api/experiences/{id}/bullets/{bullet_id}`.
      - `GET/POST /api/skills`, `GET/PUT/DELETE /api/skills/{id}`.
      - `GET/POST /api/answers`, `GET/PUT/DELETE /api/answers/{id}`.
      - POST returns 201 and DELETE returns 204. Lists are ordered by id.
    - Bullets: `experience_id` comes from the path, which is required, and the response always includes it. A bullet requested under a different experience returns 404. `skill_ids: list[int]` in the request replaces the bullet's links. Duplicate ids are de-duplicated, and unknown ids return 422 with the missing ids. The response has `skill_ids` sorted, plus `verified` and `metrics`.
    - Uniqueness: a duplicate skill `name` or answer `question_key` returns 409. Re-saving a record under its own name is allowed.
    - Deletes: deleting an experience removes its bullets and their skill links through the DB's `ON DELETE CASCADE`. Deleting a skill only removes its links, and the bullets stay.
    - `frontend/src/api/schema.ts` regenerated from the API on port 8001.
  - **Verification:**
    - `make lint`: ruff clean, 24 files formatted, pyright strict 0 errors, and frontend eslint, tsc and prettier clean.
    - `make test`: **60 backend passed** (16 new in `tests/test_profile_api.py`) and **3 frontend passed**.
    - The new tests cover create, update, delete and 404s for every resource, bullets under the wrong experience, bullet↔skill linking and unlinking, unknown skill ids, the experience→bullet cascade (checked in the DB, including `bulletskill`), skill deletion keeping bullets, 409 conflicts, validation errors, the single profile row, and the UTC `Z` timestamps.
    - The tests use conftest's migrated temporary DB through a `get_session` dependency override on a fresh `create_app()`. `data/` was not touched.
  - **Deviations:**
    - The `client` fixture lives in `tests/test_profile_api.py` rather than `conftest.py`, to avoid a merge conflict with T-005.
    - There is no PATCH. Updates are full-replacement PUTs.
    - Request/response schemas live in `app/api/profile_schemas.py`, which the service imports.
  - **Follow-ups:**
    - Merge with T-005: `main.py` and `schema.ts` will conflict. Keep both `include_router` lines, then re-run `make types` on the merged API.
    - T-007: call `PUT /api/profile` to create the profile, and treat a 404 from `GET` as "not set yet". To toggle `verified`, send the whole bullet, including `skill_ids`.
    - The profile `email` is not format-validated, because that would need the `email-validator` dependency.
    - T-005 should adopt the shared `app/api/errors.py` error contract (see Review fixes).
  - **New dependencies:** None.
  - **Review fixes (Codex review):**
    - **Error contract:** new shared `app/api/errors.py`.
      - `ErrorResponse {detail: str}` is the body for every 404 and 409.
      - Reusable `NOT_FOUND` and `CONFLICT` `responses=` dicts are declared on every route, so OpenAPI and `schema.ts` now type those bodies.
      - `validation_error(loc, msg, input)` raises `RequestValidationError`, so domain validation failures come back in FastAPI's standard 422 shape (`detail: [{loc, msg, type, input}]`). Unknown `skill_ids` now return `loc: ["body", "skill_ids"]`, and every 422 has that one shape. `end_date < start_date` was already a request-model validator.
    - **N+1:** listing bullets eager-loads their skills with `selectinload`. A test counts SELECTs (at most 3 for 5 bullets) and fails without the fix.
    - **Uniqueness race:** `_save` catches `IntegrityError` on the skill-name and answer `question_key` writes, rolls back, and returns `ConflictError` (409). A test disables the pre-checks and confirms 409s on create and update, that nothing was written, and that the API stays usable afterwards.
    - **`updated_at`:** `PUT` on a bullet always sets `updated_at`, because changing only `skill_ids` touches just the link table and `onupdate` wouldn't fire. This is covered by a test.
    - **Contract tests** check the 404, 409 and both kinds of 422 bodies, plus the `ErrorResponse` references in OpenAPI.
    - `schema.ts` was regenerated on port 8001.
    - **Checks:** `make lint` is clean (ruff, 25 files formatted, pyright 0 errors, frontend clean). `make test` passes: **68 backend** and **3 frontend**.
    - **Follow-up:** after merge, **T-005 should adopt `app/api/errors.py`**. That means `ErrorResponse` for its 404 and 409 responses, `NOT_FOUND`/`CONFLICT` on its routes, and `validation_error` for domain 422s such as invalid status transitions, if those are reported as 422.
- **Review:** (codex, 2026-09-27) Changes requested, then fixed in `beeffd2`: shared error contract in `app/api/errors.py` (typed 404/409 `ErrorResponse`, every 422 in FastAPI's shape), bullet-skill eager loading, IntegrityError → 409, `updated_at` bump when only skills change. Orchestrator verified: lint clean, 68 backend + 3 frontend tests.

### T-005 Jobs & application status API
- **Owner:** codex · **Status:** done · **Depends on:** T-003
- **Scope:** `backend/app/api/jobs*.py`, `backend/app/api/applications*.py`, matching services, tests, `frontend/src/api/schema.ts` (regenerate only)
- **Acceptance criteria:**
  - CRUD for `/api/jobs` (with filter by status and company); creating a job creates its `Application` in `saved`.
  - `POST /api/applications/{id}/transition` validates allowed status transitions and appends a `StatusEvent`.
  - `GET /api/applications/{id}/history` returns events in order.
  - Tests cover valid and invalid transitions.
  - `schema.ts` regenerated.
- **Handoff:**
  - **What changed:** Added separate Pydantic request/response schemas and thin routers backed by jobs/application services. `POST /api/jobs` atomically creates a job, its `saved` application, and an initial `null → saved` history event; title and URL are required, company/description default to empty strings. `GET /api/jobs` supports exact company and status filters combined with AND, ordered by updated timestamp then ID descending. Job responses include their application (including required integer job/application IDs) and UTC ISO-8601 timestamps. `GET/PUT/DELETE /api/jobs/{job_id}` reads, replaces job fields, and deletes the job with its application/history via existing cascades. PUT resets omitted optional fields to defaults; status cannot be overwritten through job requests.
  - **Transitions/history:** `POST /api/applications/{application_id}/transition` accepts `to_status` and optional `note`. The service documents and owns the full transition table: forward steps, manual applied tracking from saved/preparing/ready_for_review, ready_for_review → preparing, and rejection/withdrawal from any non-terminal including offer. Only rejected and withdrawn are terminal. Invalid transitions return 409 with current/requested states and allowed destinations. A conditional status update rejects stale writes with 409; status, application/job updated timestamps, and the appended event commit together. `GET /api/applications/{application_id}/history` sorts by timestamp then ID. Missing jobs/applications return 404; invalid request data returns 422. Application and history FK IDs are assigned internally from required route IDs or newly persisted parents; no nullable parent IDs are accepted from request bodies. Tracking `applied` performs no external submission.
  - **Verification:** `make setup`, `make lint` (ruff, formatting, strict pyright, frontend ESLint/TypeScript/Prettier), and `make test` pass: **125 backend + 3 frontend tests**. The 81 new tests cover job CRUD/defaults/validation/cascades/404s, combined filters and sorting, UTC serialization, all 64 transition pairs, stale writes, complete lifecycle history, isolation, and timestamp ties. Regenerated `frontend/src/api/schema.ts` using `make types` against this branch's running API and verified the new routes are present; the temporary server was stopped. `git diff --check` passed.
  - **Deviations:** No model or migration changes. Router imports and two `/api` registrations in `app/main.py` are the minimal shared-file edits explicitly authorized for this task. IPv4 localhost:8000 already had a server, so generation used this branch's uvicorn on IPv6 localhost (`--host ::1 --port 8000`), leaving the existing server untouched. Setup/checks used `UV_CACHE_DIR=/tmp/segway-codex-uv-cache` for sandbox compatibility.
  - **Follow-ups:** T-004 integration is complete. T-006 can use nested `job.application.id/status/allowed_transitions` and PUT for edits; allowed destinations are supplied by the API in sorted order. Duplicate URLs remain allowed, matching existing persistence behavior; deduplication is outside these acceptance criteria. The orchestrator handles cross-review and merging; nothing pushed.
  - **Review fixes (Claude review):** Merged `main` in `0445bf3`, retaining T-004's completed task content and both APIs. All T-005 routes that can return 404/409 now declare the shared `ErrorResponse` contract via `NOT_FOUND`/`CONFLICT`; FastAPI's standard 422 shape is unchanged. Jobs/application services raise domain exceptions mapped to HTTP errors in the routes and no longer import FastAPI or API schemas; job writes use the service's `JobData` dataclass. Updated the single transition table and its docstring for manual applied tracking, return to preparing, and offer rejection/withdrawal. Every application response, including job list/detail/create/update responses, now computes `allowed_transitions` from that table. Tests cover 404/409 body shapes, OpenAPI error references, standard 422 validation, all 64 transition pairs, allowed destinations in embedded responses, and stale-write domain errors. Regenerated `schema.ts` with `make types` against both APIs using IPv6 localhost:8000 because IPv4 was occupied; the temporary uvicorn server was stopped. `make lint` and `make test` pass (**159 backend + 3 frontend tests**); `git diff --check` is clean. No new dependencies. Status remains review; nothing pushed.
  - **New dependencies:** None.
- **Review:** (claude sub-agent, 2026-09-27) Changes requested, then fixed in `15c706b`: adopted `app/api/errors.py`; services now raise domain exceptions and don't import the API layer; transitions now allow applying directly from saved/preparing/ready_for_review, ready_for_review → preparing, and offer → rejected/withdrawn (orchestrator default, open to user changes); `allowed_transitions` is included on application responses. Orchestrator verified: lint clean, 159 backend + 3 frontend tests, `schema.ts` covers all 14 routes, and a live API check of create, direct apply, 409 on an invalid transition, a typed 404 body and ordered UTC history.

### T-006 Dashboard UI
- **Owner:** codex · **Status:** in-progress · **Depends on:** T-002, T-005
- **Scope:** `frontend/src/pages/Dashboard*`, `frontend/src/pages/JobDetail*`, `frontend/src/components/jobs/**`
- **Acceptance criteria:**
  - Dashboard: job table (company, title, status, updated) with status filter, plus a board view grouped by status.
  - Add/edit job form (paste URL and description).
  - Job detail: fields, status change control, and status history timeline.
  - Loading, empty, and error states; Vitest component tests for the form and status control.
- **Handoff:**
- **Review:**

### T-007 Profile editor UI
- **Owner:** claude · **Status:** in-progress · **Depends on:** T-002, T-004
- **Scope:** `frontend/src/pages/Profile*`, `frontend/src/components/profile/**`
- **Acceptance criteria:**
  - Edit profile fields; list/add/edit/delete experiences and their bullets; manage skills and reusable answers.
  - Bullets can be tagged with skills and marked verified.
  - Vitest component tests for the experience and bullet editors.
- **Handoff:**
- **Review:**

### T-008 Profile service layering cleanup
- **Owner:** — · **Status:** todo · **Depends on:** T-005
- **Scope:** `backend/app/services/profile.py`, `backend/app/api/profile*.py`, related tests
- **Acceptance criteria:**
  - `app/services/profile.py` no longer imports `app.api.*` or `fastapi`. It takes plain values or its own dataclasses and raises domain exceptions, the same pattern as `app/services/jobs.py` / `applications.py` after T-005.
  - Routes map domain exceptions to the `app/api/errors.py` contract; API behaviour and OpenAPI are unchanged (`make types` produces no diff).
  - All existing tests pass unchanged except for imports.
- **Handoff:**
- **Review:**
