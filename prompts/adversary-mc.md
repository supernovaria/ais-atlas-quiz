---
stage: adversary — full question (rung "full"), and — with the stem slot filled by _partials/stem-withheld.md — the options-only rung
agent: quiz-adversary
model: haiku
placeholders: [stem, options]
optional: []
paths: []
reply: one letter
rendered_by: pipeline.mjs shuffle; pipeline.mjs ablate (rungs full, options-only); pipeline.mjs canary
notes: >
  ONE template for both ablation rungs, so the rungs differ byte-for-byte only in
  the stem slot (review 2026-09-23 #7). The earlier separate options-only prompt
  also changed the instruction ("pick the option most likely to be the intended
  correct answer"), so part of any gap between rungs could have come from the
  wording rather than the missing stem.
  "Do not use any tools." is NOT in the session-B baseline's prompt. It has been
  in every adversary spawn since P1, because the harness grants quiz-adversary
  all tools despite its `tools: []` frontmatter — isolation is behavioural.
  Keep it, and record that the baseline differs by this sentence.
---
You have not read the textbook this question comes from. Answer from the
question and options alone, using only general knowledge and test-taking
instinct. Do not use any tools. Do not explain. Reply with a single letter.

{{stem}}

{{options}}
