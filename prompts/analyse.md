---
stage: analyse — concept map for one section
agent: quiz-section-analyst
model: sonnet
placeholders: [section, prose, target_n, out]
optional: [extra_inputs, context_note]
reply: OK <path> | FAIL <reason>
---
Produce the concept map for one section.

Working directory: `{{workdir}}`.

Read:
1. `docs/RUBRIC.md` — governing.
2. `{{prose}}` — the section prose.
{{?extra_inputs}}

Section slug: `{{section}}`. Set `target_n` to {{target_n}}.

{{?context_note}}

Write the concept map to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
