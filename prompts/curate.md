---
stage: curate — select the shipped set for one section
agent: quiz-curator
model: sonnet / opus
placeholders: [section, dir, target_n, out, review_sheet_out]
optional: []
paths: [dir]
reply: OK <path> | FAIL <reason>
notes: >
  Two outputs, both derived: curator.json and the review sheet (review #8). The
  review sheet is the curator's own commentary; render builds the staged section
  from candidates.json by verbatim copy, so the curator never retypes question
  text in either file. On 2026-09-20 the orchestrator told the curator a render
  stage builds review sheets. None does; that section shipped without one.
  Rev 2026-09-23: removed the bolded "an options-only hit is evidence…" line — a
  standing rule placed in a template, and at a one-seed screen a single
  options-only hit happens by chance a quarter of the time.
---
Select the final question set for section `{{section}}`.

Working directory: `{{workdir}}`.

Read, all under `{{dir}}/`:
- `concept-map.json` — `target_n` is {{target_n}}.
- `candidates.json` — generated candidates plus critic rewrites (each carrying `rewrite_of`).
- `verdicts/` — one verdict per critiqued candidate.
- `measurements.json` — keyed by candidate id; authoritative.
- `adversary.json` and `ablation/ladder.json`, if present.
- `queue.json`, `dedupe.json`.
And `docs/RUBRIC.md`, governing.

A candidate no critic has seen is **uncritiqued, not rejected**, and is not eligible.

Write two files:
1. `{{out}}` — selected ids, rationale, `flags_for_reviewer` as `{"id": ..., "note": ...}` objects (`"section"` as the id for a finding about the set), banked siblings, uncovered ideas.
2. `{{review_sheet_out}}` — your review sheet. Refer to questions **by id**. Do not reproduce stems, options or explanations in it.

Write no question text in either file. If a candidate needs a text edit, name it and describe the edit in a flag; do not make it.

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
