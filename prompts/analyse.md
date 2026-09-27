---
stage: analyse — concept map for one section
agent: quiz-section-analyst
model: sonnet
placeholders: [section, prose, target_n, out]
optional: [extra_inputs]
paths: [prose]
reply: OK <path> | FAIL <reason>
notes: >
  `extra_inputs` is DERIVED (misconceptions/<section>.md, when it exists), never
  typed. The free-text `context_note` slot is gone (review #5): for the bench,
  what the analyst must not read is stated below as fixed text.
---
Produce the concept map for one section.

Working directory: `{{workdir}}`.

Read:
1. `docs/RUBRIC.md` — governing.
2. `{{prose}}` — the section prose.
{{?extra_inputs}}

Read nothing else. In particular, do not open any file under a `private/` directory.

Section slug: `{{section}}`. Set `target_n` to {{target_n}}.

Write the concept map to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
