# Adversary baseline — current 40-question file, 2026-09-18

Run per PIPELINE §9.7 / HANDOFF §1: the `quiz-adversary` agent measured on the
**current** `public/questions/ch1-capabilities.md`, with the same toolless
`haiku` agent the pipeline will use. This, not QUIZ-PLAN's "≥60%", is the only
valid comparator for anything the pipeline produces.

## Result

| metric | value |
|---|---|
| questions × seeds | 40 × 3 = 120 spawns |
| mean hit rate | **98.3%** (118 of 120) |
| mean(hit − 1/k) | **+0.733** (gate ≤0.15 — **fails by ~5×**) |
| 4-option-only rate | 98.3% (all 40 questions are 4-option) |
| flagged (hit on ≥2 of 3 seeds) | **39 of 40** |
| key position of hits | A 26 · B 30 · C 29 · D 33 — uniform |
| unparsed picks | 0 |

The one question the adversary did not crack:

- **`Chapter Review: Multiple Choice Q8`** — 1 of 3 hits. On two seeds it chose
  "The Turing Test combined with process/adaptability views (Chollet)" over the
  key "Behaviorist/capabilities-focused approaches combined with psychometric
  frameworks (CHC theory)". Both are real positions in the literature and the
  question turns on which pair *this chapter* synthesises, which is exactly the
  shape that resists a reader who knows the field but not the text.

## What this means, and it is not the obvious thing

The naive reading is "the current file is 98% leaky, so the rubric's diagnosis
was right." That reading is wrong, or at least unsupported, and the uniform
key-position distribution is why: the adversary is not finding a position tell
or a length tell, it is **answering the questions correctly**.

`Takeoff Q1` — which RUBRIC §3.4 calls the cleanest option set in the file
(ratio 1.02) and holds up as a model L3 — was hit 3 of 3. `Chapter Review Q4`,
which RUBRIC §3.6 calls "the best question in the file", was hit 3 of 3. Those
two are the control group, and they failed it. A metric that flags the rubric's
own exemplars at the same rate as its worst offenders is not measuring question
quality.

**The adversary's premise is unenforceable here.** `tools: []` stops the agent
reading *this chapter* — verified at preflight, it holds — but it cannot stop
the model knowing the material, and chapter 1 is a summary of widely-published
AI-safety content that any current model has absorbed many times over. So the
question "could a reader who skipped the chapter get this right from test-taking
instinct?" is being answered by something that did not skip the chapter so much
as read every source the chapter is built from.

HANDOFF §8 anticipated the direction ("the adversary now thinks, and cannot be
told not to… it over-estimates the hit rate") and argued the bias was safe
because one-directional. At 98.3% it is not safe, it is **saturated**: with 39 of
40 flagged, the per-question flag cannot discriminate, and the curator rule
"treat a flagged Q as ineligible" would reject essentially every candidate P1
produces, whatever its quality.

This is a finding about tier 4, not about the questions. It is recorded here
rather than acted on: changing the adversary's model, tools, or prompt is Em's
call, and PIPELINE explicitly forbids the orchestrator from "improving" it.

## Files

- `shuffle.json` — the 120 prompts as sent, with per-prompt key letter and seed
- `picks.json` — the letter each spawn returned, keyed `<id>#<seed>`
- `adversary.json` — scored output, per question and per answer
- `deviations.md` — two agents that departed from the adversary brief

## Two caveats on the data

1. **Repeated permutations.** This run was collected before `pipeline.mjs
   shuffle` was fixed to draw *distinct* permutations per seed. 5 of the 40
   questions (`Current Capabilities Q1`, `Takeoff Q1`, `Takeoff Q5`,
   `Chapter Review Q2`, `Chapter Review Q9`) had two seeds land on the same
   option order — exactly the ~4.9 expected by chance from independent seeding,
   so it is not a PRNG bug. It means those five had 2 effective seeds rather
   than 3. Re-running `shuffle` now yields 0 repeats. The effect on the headline
   is nil at a 98% hit rate; it would matter on a cleaner set, which is why the
   script was fixed rather than the number re-measured.

2. **Two agents ignored "reply with a single letter"** — see `deviations.md`.
   Both picks were recovered correctly, but one returned a JSON object that the
   tolerant letter-parse could have mis-read. `score` now flags any answer that
   is not a bare letter (`verbose_answers`), so a future mis-parse is visible
   instead of scoring as a plausible hit.

## Reproduce

```sh
node scripts/pipeline.mjs shuffle --file public/questions/ch1-capabilities.md --out runs/baseline --seeds 3
# spawn quiz-adversary once per prompt (haiku, no tools), record letters in picks.json
node scripts/pipeline.mjs score --out runs/baseline
```
