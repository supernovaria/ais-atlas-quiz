---
stage: critique, pass 2 — a pass-1 rewrite that failed re-measurement
agent: quiz-critic
model: opus
placeholders: [section, candidate_input, concept_map, prose, prior_verdict, remeasured, out]
optional: []
reply: OK <path> | FAIL <reason>
notes: >
  The one sanctioned exception to critic isolation (HANDOFF §3): pass 1's verdict
  is carried forward, for the SAME candidate only. Never exercised as of
  2026-09-23 — no rewrite has yet failed re-measurement.
---
Second pass on ONE candidate whose pass-1 rewrite failed re-measurement.

Working directory: `{{workdir}}`.

Read:
1. `docs/RUBRIC.md` — governing.
2. `{{candidate_input}}` — the original candidate and its measurements.
3. `{{prior_verdict}}` — your pass-1 verdict: its `reasons`, `preserve` and `rewrite_changed` are the part to keep.
4. `{{remeasured}}` — the script's measurements of that rewrite. Authoritative.
5. `{{concept_map}}` and `{{prose}}`.

Section: `{{section}}`.

Fix what the re-measurement names **without re-breaking what pass 1 repaired** — that is why you are shown pass 1. The schema contract is unchanged: `stem_format` one of {{stem_formats}}; `level` one of {{levels}}; `verdict` one of {{verdicts}}; straight ASCII quotes, double outside and single when nested.

This is the last pass. A rewrite that still fails re-measurement is rejected.

Write your verdict object to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
