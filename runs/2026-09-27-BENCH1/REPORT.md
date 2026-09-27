# Bench iteration 1 — generator output on b02 and b03 (2026-09-27)

**Generator output only; no critic.** Every number here describes what the
Sonnet generator writes unaided.

**Ran.** Canary pass (tool_uses 1 = the exempt hand-back; reply C, key D).
4 Sonnet `generate-section` calls (2 per passage, n = 8 each → 16 + 16), 2
Sonnet claim-map calls, pre-registration committed and registered before
`ablate`. Haiku letter spawns: 192, all `tool_uses` 1, none voided (picks
log: `claude-picks.tsv`). **Deviation:** the 32 Claude explain spawns were not
run, for weekly usage; the explain rungs below come from the API voices only.
Voices (stopped 18:10 UTC, scored as of then): Mistral 14B and 8B complete
(288 each per passage); Luna 60 per passage (its per-invocation cap); Gemma
40 / 34; Gemini Flash 3.6 one reply; Gemini, Qwen, Nemotron out of quota.

**Caveats.** The two generator calls per passage wrote on the same claims
(b02: every claim exactly twice), so 16 questions are closer to 8 × 2, and
the intervals below are too narrow by an unknown amount. b02's concept map
calls the domain invented (KNOWLEDGE §5.2).

## Ladder (`full`, letter only, question as unit)

| reader | b02 (16 q) | b03 (16 q) | clean-control floor b02 / b03 |
|---|---|---|---|
| Haiku (3 seeds) | **90%** (82–97) | **79%** (62–96) | 30% / 37% |
| Mistral family | 80% (67–93) | 87% (77–96) | 38% / 21% |
| OpenAI (Luna, 15 q) | 87% (69–100) | 87% (69–100) | 43% / 40% |
| Google (Gemma, 11 / 8 q) | 100% — thin | 88% — thin | 52% / — |
| panel median | 85% (11 q complete-case) | 90% (8 q) | 38% / — |

By claim type (Haiku, `full`): b02 directional 93% of 30 trials vs a floor of
60%, passage-only 83% of 18 vs 40%; b03 directional 77% of 39 vs 69%,
passage-only 89% of 9 vs 40%. `options-only`: Haiku 85% / 58%, Mistral 61% /
62%, Luna 87% / 67%.

## Against the pre-registration

1. Haiku `full`: b02 predicted 55–75% → **90%, above the range**; b03 65–85% →
   79%, in range. Passage-only on b02 predicted 50–65% → 83%, above.
2. Every family with ≥ 12 q is ≥ 15 points above its clean-control floor on
   both passages: **held**, by 40–65 points.
3. `options-only` within 10 points of `full`: **failed** for Haiku on b03
   (−21), Mistral on both (−19, −25) and Luna on b03 (−20). The stem carries
   more than predicted; the options still carry most of it.
4. Claude family not > 10 points above the panel median: **held** (90 vs 85;
   79 vs 90). No sign of Claude reading Claude.
5. `longest` highest cue-follow: **partly**. See below.

## Cues (`tells.md`, API voices, `full-explain`)

The three that pass (cue-follow interval clear of 25%, lift among not-picked
> 1, across families):

1. `most-detailed`: b02 79% (66–90), not-picked lift 3.5; b03 82% (71–92),
   lift 7.7; every family. The faithfulness table ties it to measured
   length (mean length rank of tagged options 0.77 vs 0.41).
2. `longest`: b02 71% (43–93, 7 q), lift 9.3; b03 67% (44–88, 13 q), lift 6.2.
   Weak in Mistral (38%, 41%). Readers seldom use this tag; they call the long
   key "most detailed". **The key is the longest option on 29 of 32
   candidates**, per `measure`.
3. `textbook-voice`: b03 70% (56–84), lift 5.3, all families. On b02 54%
   (40–69) but not-picked lift 0.8, so it fails the rationalisation check there.

Placebo `position`: b02 26% (9–45), at chance. b03 46% (21–71), lift 2.4,
elevated but the interval includes chance: a mild warning on b03's tagging.
Readers tagged `echoes-stem` 153 (b02) and 181 (b03) times on options-only
prompts, where no stem was shown, so that code is unreliable.

**Candidates for a causal test** (not brief changes): key length / detail
first. Equalise key and distractor length and specificity on 5–10 of these
questions, hold everything else, and re-run the letter rung.

## Where everything is

- Questions: `<b>/candidates.json` (the two raw generator files in
  `<b>/candidates/`), `measurements.json`, `claim-map.json`.
- Prompts sent: `prompts/` and `<b>/ablation/{full,options-only,*-explain}/NN.txt`;
  `manifest.json` maps each file to question, seed and key.
- Haiku answers: `<b>/ablation/picks.json`, plus `claude-picks.tsv` (file,
  letter, tool_uses) for all 192 spawns. Voice replies:
  `<b>/ablation/voices/<voice>/`, call log `voices/calls.jsonl`.
- Scores: `<b>/ablation/ladder.json`, `tells.json`, `tells.md`. Log: `run.log`.

## To resume

Both need `QUIZ_KEY_ROOT` only from a worktree. More voice replies (free;
Gemini resets ~09:00, OpenRouter ~02:00 local), then re-score:

    node scripts/voices.mjs answer --run 2026-09-27-BENCH1 --section b02
    node scripts/voices.mjs answer --run 2026-09-27-BENCH1 --section b03
    node scripts/pipeline.mjs ablate-score --run 2026-09-27-BENCH1 --section b02   (and b03)

Next experiment: the length causal test with `bench-rewrite-distractors` and
`pipeline.mjs arm` (HANDOFF §9.3), pre-registered first.
