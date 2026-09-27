# Roadmap

**MVP = Phases 1–3**: a personal ATS with AI matching and tailored resume output. Phase 4 onward adds automation, gated by human review.

| # | Phase | Goal | Exit criteria |
|---|---|---|---|
| 1 | **Personal ATS** | Profile database, job storage, dashboard, status tracking | Profile, experiences, bullets, and jobs can be created and edited in the UI; applications move through statuses with a visible history; data persists in SQLite across restarts |
| 2 | **AI matching** | Paste/import a job description → extract requirements → compare against verified experience | For a pasted JD, the app shows structured requirements and, for each, the matching bullets (with links) or a clear "gap"; no claim without a source record; works with recorded fixtures offline in tests |
| 3 | **Resume compiler** | Tailored one-page PDF from the master experience DB | One click produces a one-page PDF from selected bullets; overflow is detected and reported; the PDF is saved as a `Document` linked to the application |
| 4 | **One ATS** | Automate form completion for one predictable system (Greenhouse first, Lever next) | Adapter fills every standard field on fixture pages and a live test posting; unknown fields are left empty and reported; never clicks submit |
| 5 | **Review workflow** | Agent fills → dashboard shows every field and its source → user approves → submits | Every filled value shows its source and confidence; submission happens only after explicit approval and is logged |
| 6 | **More adapters + generic agent** | More ATS adapters, plus a generic browser agent for the rest | Coverage metric (% of saved jobs fillable) tracked and rising; generic agent still goes through review |
| 7 | **Controlled autonomy** | Auto-submit only applications that satisfy explicit rules and contain no uncertain answers | User-defined rules; any low-confidence or unsourced field forces manual review; full audit log |

Deferred until needed: hosted deployment, browser extension (WXT), multi-user support.
