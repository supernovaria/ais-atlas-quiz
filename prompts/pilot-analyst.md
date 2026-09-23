---
stage: pilot analyst — findings over a set of runs
agent: quiz-pilot-analyst
model: opus (brief) — sonnet was used for 2026-09-18
placeholders: [runs, out]
optional: [established, structure]
reply: OK <path> | FAIL <reason>
---
Produce a findings document over these runs.

Working directory: `{{workdir}}`.

Read, sampling large artifacts rather than reading everything end to end:
- `docs/RUBRIC.md` — governing. You propose changes to it; you never edit it.
- `docs/PIPELINE.md` and `.claude/agents/quiz-*.md` — the roles and briefs you are assessing.
- The runs: {{runs}}. Each has a `run.log`; read those in full — they record measured numbers, defects, deviations and corrections.

{{?established}}

{{?structure}}

Be specific and quantitative. Cite candidate ids. Where a number rests on a small n, say so **in the same sentence as the number**. Do not soften a finding to make the pipeline look better than the evidence says.

Write the document to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
