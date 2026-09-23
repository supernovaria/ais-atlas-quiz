---
stage: adversary, options with the stem withheld (ablation rung "options-only")
agent: quiz-adversary
model: haiku
placeholders: [options]
optional: []
reply: one letter
rendered_by: pipeline.mjs ablate --rungs options-only
notes: >
  Measures how much of the answer the option set carries on its own. Worded to
  match adversary-mc.md as closely as the missing stem allows, so the two rungs
  differ in one thing only. Deliberately says nothing about the subject matter:
  the first ad-hoc version of this probe told the reader it was looking at "an
  invented academic framework", which is itself a cue. Never add one.
  Options use the SAME seeded permutation as the full rung for the same id#seed.
---
You have not read the textbook this question comes from, and the question
itself has been withheld: only its answer options are shown. Using only general
knowledge and test-taking instinct, pick the option most likely to be the
intended correct answer. Do not use any tools. Do not explain. Reply with a
single letter.

{{options}}
