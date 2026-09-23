---
stage: adversary, stem with no options (knowledge probe — REAL sections only)
agent: quiz-adversary
model: haiku
placeholders: [stem]
optional: []
reply: one or two sentences, or exactly "I DON'T KNOW"
rendered_by: pipeline.mjs ablate --rungs stem-only
notes: >
  Separates "the adversary knows the material" from "the options leak". Useless on
  the fiction bench, where knowledge is zero by construction. Graded by hand
  against the key's load-bearing claim (match / partial / miss / idk / refusal),
  with every answer recorded verbatim so the grading can be overturned.
  KNOWN CONFLICT: quiz-adversary's brief says its output is one letter from
  "stem and options". In the 2026-09-20 probe, 2 of 6 spawns refused and asked
  for options. The explicit "this is deliberate" line below targets that; if
  refusals persist, the fix is a separate recall agent, not a stronger prompt.
---
You have not read the textbook this question comes from. Answer the question
below from general knowledge alone. No answer options are provided — this is
deliberate, so do not ask for them. Do not use any tools. Reply in one or two
sentences. If you do not know, reply exactly: I DON'T KNOW

{{stem}}
