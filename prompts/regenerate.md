---
stage: regenerate — one fresh candidate for an idea the curator reported uncovered
agent: quiz-generator
model: as production
placeholders: [section, concept_map, prose, idea_id, curator_reason, id_prefix, out]
optional: []
reply: OK <path> | FAIL <reason>
notes: >
  The rejected candidate is NOT passed, by design (brief, regeneration mode):
  anchoring on a rejected attempt is what a fresh call exists to avoid.
  Never exercised as of 2026-09-23.
---
Section: `{{section}}`. Mode: `section`, **regeneration**.

Working directory: `{{workdir}}`.

Read:
1. `docs/RUBRIC.md` — governing.
2. `{{concept_map}}` — the concept map.
3. `{{prose}}` — the section prose.

Write **one** fresh candidate for idea `{{idea_id}}`. The previous candidate for it did not survive; the curator's reason was:

> {{curator_reason}}

You are deliberately not shown that candidate.

Output: a JSON array containing that one candidate object. Set its `id` to `{{id_prefix}}/01`.

Write the array to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
