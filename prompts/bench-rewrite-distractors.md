---
stage: bench manipulation — rewrite DISTRACTORS only, hold stem and key
agent: quiz-generator
model: sonnet
placeholders: [passage, concept_map, candidates, ids, out]
optional: []
paths: [passage, concept_map, candidates]
reply: OK <path> | FAIL <reason>
notes: >
  Tests the lead from 2026-09-20-FICTION-B: with the stem removed the blind
  reader still scored 4/6 across 4 distinct questions, so the option set appears
  to carry the answer. Output is applied by `pipeline.mjs arm --kind distractors`,
  which dies unless the stem and key are byte-identical, every option keeps its
  slot, and every `quote` and `rules_out` string appears verbatim in the passage.
  Interpret only alongside the sighted rung: a drop in the blind rate with a
  drop in the sighted rate means the rewrite made questions ambiguous.
  Rev 2026-09-23 after review #3: added answerability (item 1); restated the
  target as the OUTSIDER's view (item 2); dropped "not the moderate middle",
  which could only be met by making distractors as hedged as the key, i.e.
  ambiguous; dropped restatements of the generator brief.
---
A targeted distractor-rewrite task, not a normal generation call.

Working directory: `{{workdir}}`.

Read:
1. `{{passage}}` — the section prose.
2. `{{concept_map}}` — its `misconceptions` entries are where wrong answers come from.
3. `{{candidates}}` — the candidates.

For each of these candidates — {{ids}} — rewrite **every wrong option**. Keep the stem and the correct option **exactly** as they are, character for character, and return the options **in their original order**, so the correct option stays in its slot.

Each new wrong option must be:

1. **Clearly wrong to a reader who has the passage.** Put the passage sentence that rules it out, verbatim, in `rules_out`. If no sentence rules it out, it is not a wrong answer and the question has become ambiguous.
2. **As likely as the correct option to a reader who has *not* read the passage.** Nothing in its wording, its stance, or its relation to the other options may mark it as wrong. Test each one: would someone who knows nothing about this subject have any reason to prefer the correct option over it?
3. **Not self-defeating against the question.** If the stem asks which objection is strongest, no option may say there is no objection; if it asks what is wrong, no option may say nothing is.
4. **Rooted in a real misreading.** In `provenance`, name the misreading and quote the passage sentence it misreads, verbatim, in double quotes, in 20 words or fewer.

Output one JSON array of `{"id": ..., "options": [ {"text": ..., "key": bool, "provenance": ..., "family": ..., "rules_out": ...}, ... ]}`, one per id. For the correct option, `provenance` and `rules_out` are `null`. Nothing after the closing bracket.

Write it to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
