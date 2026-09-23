---
stage: free recall — a stem with no options (knowledge probe, REAL sections only; rung "stem-only")
agent: quiz-recall
model: haiku
placeholders: [stem]
optional: []
paths: []
reply: one or two sentences, or exactly "I DON'T KNOW"
rendered_by: pipeline.mjs ablate --rungs stem-only
notes: >
  Separates "the reader knows the material" from "the options leak". Useless on
  the fiction bench, where knowledge is zero by construction.
  Runs on its OWN agent, quiz-recall, not quiz-adversary: the adversary's brief
  says it answers "from the stem and options" in one letter, and on 2026-09-20
  two of six free-recall spawns refused and asked for options (review #6).
  ablate excludes stems that are ill-posed without options (negation stems,
  "which of the following/these", stems that refer to the options).
  Graded by a separate grader (grade-recall.md), never by the orchestrator.
---
{{stem}}
