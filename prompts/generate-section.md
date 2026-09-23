---
stage: generate — whole section (the default since the P1b sharding A/B)
agent: quiz-generator
model: sonnet (P1, bench) / opus + fable (production)
placeholders: [section, concept_map, prose, n, id_prefix, out]
optional: [context_note]
reply: OK <path> | FAIL <reason>
notes: >
  Replaces the shard request in the brief's Inputs §5. The two brief rules that
  do not survive the move from a 3-candidate shard are overridden here, not in
  the brief: stem-format variety (unsatisfiable at n > 6) and "your lens is
  assigned" (there is no assignment). Everything else in the brief governs.
---
Section: `{{section}}`. Mode: `section`. This is a **whole-section** request, not a shard.

Working directory: `{{workdir}}`.

Read:
1. `docs/RUBRIC.md` — governing.
2. `{{concept_map}}` — the concept map.
3. `{{prose}}` — the section prose.

There is no `EXEMPLARS.md`, deliberately. Do not look for one and do not be cautious because of it.

{{?context_note}}

In place of a shard:

- Every idea with `earns_question: true` is yours. There is no assigned lens: choose the lens per candidate and the allocation across ideas.
- Write exactly **{{n}} candidates**.
- Treat each idea's `attempts` as a ceiling on how many of your {{n}} you spend on it.
- Use at least 4 of these lenses across the set: {{lenses}}.
- Stem-format variety: the brief's "no two may share a `stem_format`" is written for a 3-candidate shard. For this call the rule is **at most 2 candidates per `stem_format`**. Allowed values, exactly: {{stem_formats}}.
- The map's `discrimination_pairs` are live. Where one contrast candidate spanning both members beats two separate ones, write it that way.
- Honour `do_not_test` and `assumed_prior` exactly as listed. At most one candidate may set `bridge_from`.

Output: **one JSON array** of {{n}} candidate objects. If you want to explain your allocation, put a `{"note": "..."}` object **as the last element inside the array** — never after the closing bracket. Set each `id` to `{{id_prefix}}/NN` (01…{{n}}); a later stage reassigns ids.

Write the array to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
