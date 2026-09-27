# Decision log

Short ADRs. Add new entries at the bottom; don't rewrite accepted ones, supersede them with a new entry.

Template:

```
## ADR-NNN: Title
- Date: YYYY-MM-DD · Status: accepted | superseded by ADR-NNN
- Context: why a decision was needed
- Decision: what we chose
- Consequences: trade-offs we accept
```

## ADR-001: Python backend, TypeScript frontend
- Date: 2026-09-27 · Status: accepted
- Context: The backend does AI extraction, PDF generation, and browser automation; the frontend is a data-heavy dashboard.
- Decision: FastAPI (Python 3.13, uv) for the backend; Vite + React + TypeScript for the frontend. API types are generated from OpenAPI.
- Consequences: Two toolchains (uv + pnpm). Contract drift is prevented by regenerating `schema.ts` with every API change.

## ADR-002: Local-first with SQLite
- Date: 2026-09-27 · Status: accepted
- Context: Resumes and application answers are sensitive, and this is a single-user tool.
- Decision: Run locally, keep data in `data/app.db` (SQLite) and files in `data/`. Use Alembic migrations from the start so moving to Postgres later is mechanical.
- Consequences: No remote access for now; hosting is revisited after Phase 3.

## ADR-003: Human approval before any submission
- Date: 2026-09-27 · Status: accepted
- Context: Wrong or invented answers on real applications are costly and irreversible.
- Decision: Automation fills forms only. Submission requires explicit approval in the review UI (Phase 5). Autonomy (Phase 7) is limited to explicit rules with no uncertain fields.
- Consequences: Slower throughput; every filled value must carry a source and a confidence.

## ADR-004: Typst for resume PDFs
- Date: 2026-09-27 · Status: accepted
- Context: Tailored resumes must be exactly one page, reproducible, and well typeset.
- Decision: Render with Typst via the `typst` Python package from a template plus JSON data; check the page count after compiling.
- Consequences: The template is written in Typst markup rather than HTML/CSS.
