---
stage: curate — select the shipped set for one section
agent: quiz-curator
model: sonnet / opus
placeholders: [section, dir, target_n, out]
optional: [context_note]
reply: OK <path> | FAIL <reason>
notes: >
  The curator writes curator.json ONLY. render builds staging/<section>.md from
  candidates.json by verbatim copy; the curator never retypes question text.
---
Select the final question set for section `{{section}}`.

Working directory: `{{workdir}}`.

Read, all under `{{dir}}/`:
- `concept-map.json` — `target_n` is {{target_n}}.
- `candidates.json` — generated candidates plus critic rewrites (each carrying `rewrite_of`).
- `verdicts/` — one verdict per critiqued candidate.
- `measurements.json` — keyed by candidate id; authoritative.
- `adversary.json` — the test-wise-reader result, if present.
- `ablation/ladder.json` — the ablation ladder, if present. **An options-only hit is evidence the option set gives the answer away regardless of the stem.**
- `queue.json`, `dedupe.json`.
And `docs/RUBRIC.md`, governing.

{{?context_note}}

A candidate no critic has seen is **uncritiqued, not rejected**, and is not eligible. If the honest selection is fewer than `target_n`, or none, say so and say why.

Write ONE output: `{{out}}` — selected ids, rationale, `flags_for_reviewer` as `{"id": ..., "note": ...}` objects (use `"section"` as the id for a finding about the set rather than one question), banked siblings, uncovered ideas.

**Write no question text anywhere.** If a candidate needs a text edit, name it and describe the edit in a flag; do not make it.

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
