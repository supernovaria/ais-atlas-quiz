---
stage: sighted reader — the same question WITH the passage (rung "sighted")
agent: general-purpose
model: haiku
placeholders: [passage, stem, options]
optional: []
paths: [passage]
reply: one letter
rendered_by: pipeline.mjs ablate --rungs sighted --passage <path>
notes: >
  The control that makes a manipulation arm interpretable (review #3). If
  rewriting distractors lowers the blind hit rate, that is only evidence of
  better distractors if a reader who HAS the passage still gets the question
  right. If the sighted rate falls too, the rewrite made the question ambiguous,
  not harder to guess. Same model as the adversary, so the two differ in one
  thing: access to the passage. This is never quiz-adversary, which must never
  see a passage.
---
Read the file `{{passage}}` in full. It is the textbook section the question below is about. Then answer the question from what the section says. Use no other file.

{{stem}}

{{options}}

Reply with a single letter and nothing else.
