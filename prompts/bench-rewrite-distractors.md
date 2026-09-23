---
stage: bench manipulation — rewrite DISTRACTORS only, hold stem and key
agent: quiz-generator
model: sonnet
placeholders: [passage, concept_map, candidates, ids, out]
optional: [finding]
reply: OK <path> | FAIL <reason>
notes: >
  Tests the lead from 2026-09-20-FICTION-B: with the stem removed entirely the
  blind reader still scored 4/6 (4 distinct questions), so the option set appears
  to carry the answer. If rewriting distractors to be believable drives the
  options-only rung toward the floor, distractor plausibility is the mechanism.
  The script verifies stem and key text are byte-identical before spawning.
---
A targeted distractor-rewrite task, not a normal generation call.

Working directory: `{{workdir}}`.

Read:
1. `{{passage}}` — the section prose.
2. `{{concept_map}}` — its `misconceptions` entries are where believable wrong answers come from.
3. `{{candidates}}` — the candidates.

{{?finding}}

For each of these candidates — {{ids}} — rewrite **every wrong option**. Keep the stem and the correct option **exactly** as they are, character for character.

Each new wrong option must be:
1. **Something a careful reader of the passage could actually believe**, because of a specific misreading. Name that reader and misreading in `provenance`: "a reader who takes the §X sentence about Y to mean Z". If you cannot name one, you do not have a distractor.
2. **Not self-defeating against the question.** If the stem asks which objection is strongest, no option may say there is no objection; if it asks what is wrong, no option may say nothing is. Those are eliminable without reading anything.
3. **Not a restatement of anything the stem withholds.**
4. **Not the implausible extreme, and not transparently the moderate middle.** The correct option must not be identifiable as "the balanced one" or "the only one that sounds like a textbook".
5. Comparable to the correct option in length, specificity and register — the checker will measure length; you make them *feel* interchangeable.
Straight ASCII quotes; double outside, single when nested.

Output one JSON array of `{"id": ..., "options": [ {"text": ..., "key": bool, "provenance": ..., "family": ...}, ... ]}`, one per id, the correct option included unchanged, and nothing after the closing bracket.

Write it to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
