---
stage: critique, pass 2 — a pass-1 rewrite that failed re-measurement
agent: quiz-critic
model: opus
placeholders: [section, candidate_input, concept_map, prose, prior_verdict, remeasured, out]
optional: []
paths: [candidate_input, concept_map, prose, prior_verdict, remeasured]
reply: OK <path> | FAIL <reason>
notes: >
  The one sanctioned exception to critic isolation (HANDOFF §3): pass 1's verdict
  is carried forward, for the SAME candidate only. `out` is derived:
  verdicts-pass2/<short-id>.json. OPEN: merge's collectVerdicts reads only
  verdicts/, so a pass-2 rewrite is not yet merged; wire that before pass 2 is
  first used. Never exercised as of 2026-09-23.
  Rev 2026-09-23 (review #15): the object to fix is the pass-1 REWRITE, not the
  original candidate; the old wording could have sent the critic back to the
  original, which is the reversion pass 2 exists to prevent.
---
Second pass on ONE candidate whose pass-1 rewrite failed re-measurement.

Working directory: `{{workdir}}`.

Read:
1. `docs/RUBRIC.md` — governing.
2. `{{prior_verdict}}` — your pass-1 verdict. **Its `rewrite` is the object that failed re-measurement; start from it**, not from the original. Its `reasons`, `preserve` and `rewrite_changed` say what pass 1 was fixing.
3. `{{remeasured}}` — the script's measurements of that rewrite. Authoritative.
4. `{{candidate_input}}` — the original candidate, for reference only.
5. `{{concept_map}}` and `{{prose}}`.

Section: `{{section}}`.

Fix what the re-measurement names **without re-breaking what pass 1 repaired**. The schema contract is unchanged: `stem_format` one of {{stem_formats}}; `level` one of {{levels}}; `verdict` one of {{verdicts}}; straight ASCII quotes, double outside and single when nested.

This is the last pass. A rewrite that still fails re-measurement is rejected.

Write your verdict object to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
