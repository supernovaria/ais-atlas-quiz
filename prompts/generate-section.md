---
stage: generate — whole section (the default since the P1b sharding A/B)
agent: quiz-generator
model: sonnet (P1, bench) / opus + fable (production) — passed as --model, which also names the ids
placeholders: [section, concept_map, prose, n, id_prefix, out]
optional: [ideas]
paths: [concept_map, prose]
reply: OK <path> | FAIL <reason>
notes: >
  `id_prefix` (<slug>/<model>) and `out` (candidates/<slug>-<letter>.json) are
  DERIVED by `prompt` from --model and --letter, never typed: merge reads the
  model from the id and the shard letter from the file name (review #4).
  `ideas` is derived from bench/<id>/ideas.json on bench runs, so iterations test
  the same ideas and differ only in what is being changed (review #9).
  This template overrides exactly four brief rules, all stated below: allocation,
  lens, count, and the stem-format cap. Everything else in the brief governs —
  including its "emit fewer" rule, which is why the count is "up to".
  n is capped at 2 x the number of stem formats; render refuses more.
---
Section: `{{section}}`. Mode: `section`. This is a **whole-section** request, not a shard.

Working directory: `{{workdir}}`.

Read:
1. `docs/RUBRIC.md` — governing.
2. `{{concept_map}}` — the concept map.
3. `{{prose}}` — the section prose.

There is no `EXEMPLARS.md`, deliberately. Do not look for one and do not be cautious because of it.

Your brief is written for a shard. For this call, four of its rules are replaced, and only these four:

- **Allocation.** Every idea with `earns_question: true` is yours; you choose how to spend candidates across them, treating each idea's `attempts` as a ceiling.
{{?ideas}}
- **Lens.** There is no assigned lens. Choose one per candidate, and use at least 4 of these across the set: {{lenses}}.
- **Count.** Write **up to {{n}}** candidates. Your brief's rule stands: if an idea does not support a good candidate, write fewer, and say which ideas you skipped and why in the note.
- **Stem formats.** The brief's "no two may share a `stem_format`" is written for three candidates. Here the rule is **at most 2 per `stem_format`**, from exactly these values: {{stem_formats}}.

Output: **one JSON array** of candidate objects. Put a `{"note": "..."}` object **as the last element inside the array** — never after the closing bracket. Set each `id` to `{{id_prefix}}/NN`, numbering from 01; a later stage reassigns ids.

Write the array to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
