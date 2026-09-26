---
stage: adversary, explain mode — rungs "full-explain" and "options-only-explain"
agent: quiz-adversary (Claude voice); every API voice in scripts/voices.json receives the same text
model: haiku
placeholders: [stem, options]
optional: []
paths: []
reply: one JSON object
rendered_by: pipeline.mjs ablate --rungs full-explain,options-only-explain
overrides: quiz-adversary brief, "Output: one letter" and the verbatim prompt's "Do not explain". This template exists to get the explanation; the letter-only rungs remain the score.
notes: >
  The explain rungs are for DIAGNOSIS, never the score. Asking a reader to
  reason changes how often it cracks a question, so hit rates from these rungs
  are reported apart from the letter-only rungs and never pooled with them. What
  this rung yields is per-option cue codes, aggregated by `ablate-score` into
  tells.json: which cues sit on keys more than on distractors, and whether the
  cues a reader claims match what the checker can measure in the text.
  The code list is a partial so it is identical for every voice. ablate records
  the list and the partial's sha256 in the manifest, and ablate-score scores
  against that recorded list, so editing the partial never re-scores old replies.
  Review 2026-09-23-voices #1: the list is FLAT, with no "looks right / looks
  wrong" headings, and "codes" come before "p", so readers name features before
  committing to a number rather than choosing codes to justify it. `position`
  is a placebo: options are shuffled, so it cannot identify the key, and a lift
  far from 1 on it means the tagging itself is biased. The first sentence matches
  adversary-mc.md so the two modes differ only in what is asked for.
  `other` with a note is the coverage check on the list itself: if its share is
  high, the list is missing cues. `no-tell` exists so a reader is never pushed
  into inventing a reason for a guess.
  Stem slot for the options-only-explain rung is _partials/stem-withheld.md, as
  for the letter rung, so the two explain rungs differ only in the stem.
---
You have not read the textbook this question comes from. Answer from the question and options alone, using only general knowledge and test-taking instinct. Do not use any tools. This time, also say which features of the wording you went on.

{{stem}}

{{options}}

For EACH option give:
- "codes": every feature from this list that the option has AND that affected your judgement of it. Use only these codes:
{{> tell-codes}}
- "p": your probability, 0 to 100, that it is the intended correct answer. The values over all options must sum to 100.
- "note": one short sentence on what you noticed. Required when "codes" contains "other"; otherwise may be "".

Every option needs at least one code; use "no-tell" alone if nothing affected your judgement of it.

Reply with only this JSON object and no other text. Give one entry under "options" for every option letter shown above:
{
  "options": {
    "A": {"codes": ["<code>", ...], "p": <0-100>, "note": "<one sentence, or empty>"},
    "B": {...}
  },
  "pick": "<the letter you would answer>",
  "strategy": "<one sentence: the main thing you went on>"
}
