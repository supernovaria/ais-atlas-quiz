---
stage: critique — judge ONE candidate, pass 1 (DROPPED from the calibration loop, HANDOFF §9.2)
agent: quiz-critic
model: opus
placeholders: [section, candidate_input, concept_map, prose, out]
optional: []
paths: [candidate_input, concept_map, prose]
reply: OK <path> | FAIL <reason>
notes: >
  One candidate per spawn, always. `out` is derived (verdicts/<short-id>.json).
  The schema contract was added after a critic rewrite invented stem_format
  "scenario-application" (a03r, 2026-09-20); render now refuses such a candidate
  regardless, so this is the cheap first defence and render is the one that
  holds. The quoting rule is stated here because it is in no critic brief and
  not in RUBRIC — for the critic this is the only copy, not a restatement.
  A re-spawn after a validate failure uses this prompt UNCHANGED (review #12).
---
Judge exactly ONE candidate against the rubric.

Working directory: `{{workdir}}`.

Read:
1. `docs/RUBRIC.md` — governing.
2. `{{candidate_input}}` — the candidate and its script-computed measurements. The measurements are authoritative; do not recompute them.
3. `{{concept_map}}` — for `targets`, `do_not_test`, `assumed_prior`, `volatile`.
4. `{{prose}}` — the section prose, for provenance and answerability.

Section: `{{section}}`.

**The contract a rewrite must satisfy.** These are schema constraints; a rewrite that breaks one is discarded whole.

- `stem_format` is exactly one of: {{stem_formats}}. If none fits, pick the closest and say so in `reviewer_note` — never invent a label.
- `level` is one of {{levels}}. `verdict` is one of {{verdicts}}.
- Every option has `text` and `key`; every non-key option has a `provenance` string and a `family`.
- Straight ASCII quotes only. Double for the outer quotation, single when nested. A negation stem renders the negation in capitals and carries `negation: true`.

Write your verdict object to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
