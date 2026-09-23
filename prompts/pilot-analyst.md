---
stage: pilot analyst — findings over a set of runs
agent: quiz-pilot-analyst
model: opus (brief) — sonnet was used for 2026-09-18
placeholders: [runs, out]
optional: [prior_findings]
paths: []
reply: OK <path> | FAIL <reason>
notes: >
  Rev 2026-09-23 (review #5): the free-text `established` and `structure` slots
  are gone. What is already established is passed as a committed findings FILE
  (`prior_findings`), not as prose written for the call. OPEN: the brief's
  section order is written for P1/P2 and does not fit bench runs; that needs a
  second mode in the brief, not a per-call override.
---
Produce a findings document over these runs.

Working directory: `{{workdir}}`.

Read, sampling large artifacts rather than reading everything end to end:
- `docs/RUBRIC.md` — governing. You propose changes to it; you never edit it.
- `docs/PIPELINE.md` and `.claude/agents/quiz-*.md` — the roles and briefs you are assessing.
- The runs: {{runs}}. Each has a `run.log`; read those in full.
{{?prior_findings}}

Where a number rests on a small n, say so **in the same sentence as the number**.

Write the document to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
