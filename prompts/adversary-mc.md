---
stage: adversary, full question (ablation rung "full"; also the standard tier-4 check)
agent: quiz-adversary
model: haiku
placeholders: [stem, options]
optional: []
reply: one letter
rendered_by: pipeline.mjs shuffle; pipeline.mjs ablate --rungs full
notes: >
  The sentence "Do not use any tools." is NOT in the brief's verbatim prompt, and
  it was absent from the session-B baseline. It has been in every adversary spawn
  since P1, because the harness lists quiz-adversary as having ALL tools despite
  its `tools: []` frontmatter, so isolation is behavioural rather than
  structural. Keep it. Record that the baseline differs by this one sentence.
  `options` is rendered by the script as "A. text" lines in shuffled order.
---
You have not read the textbook this question comes from. Answer from the
question and options alone, using only general knowledge and test-taking
instinct. Do not use any tools. Do not explain. Reply with a single letter.

{{stem}}

{{options}}
