---
stage: generate — one shard (LEGACY: sharding lost the P1b A/B on every measured axis)
agent: quiz-generator
model: as assigned in shards.json
placeholders: [section, concept_map, prose, shard_json, id_prefix, out]
optional: []
reply: OK <path> | FAIL <reason>
notes: Kept so existing shard artifacts stay reproducible. Not the default.
---
Section: `{{section}}`. Mode: `section`.

Working directory: `{{workdir}}`.

Read:
1. `docs/RUBRIC.md` — governing.
2. `{{concept_map}}` — the concept map.
3. `{{prose}}` — the section prose.

There is no `EXEMPLARS.md`, deliberately.

Your shard:

```json
{{shard_json}}
```

Output: **one JSON array** of candidate objects, one per idea in the shard. A `{"note": "..."}` object, if any, goes **as the last element inside the array**. Set each `id` to `{{id_prefix}}/NN`.

Write the array to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
