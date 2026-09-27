# Pre-registration — bench iteration 1 (b02, b03), generator output

Written 2026-09-27, after generation, `measure` and `claim-map`, before any
`ablate` and before any reader has seen a question.

**What:** 32 generator candidates (Sonnet, two whole-section calls per passage,
n = 8 each, no critic): b02 16 (10 directional, 6 passage-only), b03 16
(13 directional, 3 passage-only). Readers: Haiku (`quiz-adversary`, 3 letter
seeds, 1 explain seed) and the voice panel (7 letter seeds, 2 explain seeds),
rungs `full`, `options-only`, `full-explain`, `options-only-explain`.

**What I already know from the script, and it shapes every prediction below.**
`measure` shows the key is the **longest option on 13/16 b02 candidates and
16/16 b03 candidates** (never the shortest); median key/distractor length ratio
1.14 (b02) and 1.45 (b03); R8+R9+1.6× pass 10/16 (b02) and 0/16 (b03). The two
generator calls per passage converged on the same claims: in b02 every claim
is used exactly twice, once per call, and b03 is close to that. So the 16
questions per passage are closer to 8 claims × 2 than to 16 independent items,
and intervals with the question as the unit are too narrow by an unknown
amount.

**Floors.** Directional items: max(share, 1 − share) among the directional
claims asked: **b02 60%, b03 69%**. Passage-only items: 25% chance, and each
family's clean-control floor from `runs/2026-09-26-CONTROL` (`full`, question
as unit): b02 Haiku 30%, Google 52%, OpenAI 43%, Mistral 38%, Nvidia 37%;
b03 Haiku 37%, OpenAI 40%, Mistral 21% (Google and Nvidia too thin on b03).
The old set (`runs/2026-09-23-FLOORS`, clean group, 5 q) is secondary:
Google 61%, Mistral 73%, Nvidia 70%, Haiku 40%.

**Predictions**

1. **Claude, letter-only `full`.** Haiku pooled: b02 55–75%, b03 65–85%. Split:
   directional at or above its floor (b02 ≥ 60%, b03 ≥ 69%); passage-only well
   above 25% and above Haiku's control floor, around 50–65% on b02 (n = 6) —
   because "pick the longest option" works whatever the claim type. b03 has 3
   passage-only items; I make no prediction for that cell.
2. **Each family against its own floor.** Every family with coverage of at
   least 12 of 16 questions scores **at least 15 points above its
   clean-control floor** on each passage. Against the old-set floor I expect
   rough parity (within ±15), since those items carried residual cues of
   their own.
3. **Stem removal.** `options-only` stays within 10 points of `full` for every
   covered family, and may exceed it: the length cue lives in the options.
4. **Claude on Claude-written questions.** The Claude family (Haiku) does **not**
   score more than 10 points above the panel median on either passage. The
   leak I expect is a length cue, which is not specific to a family. Limit:
   16 questions (≈ 8 claims) per passage, so only a gap of roughly 25 points
   is distinguishable from noise; a null does not show there is no effect.
5. **Cues (explain rungs, `tells.md`).** `longest` has the highest cue-follow
   rate, with an interval clear of chance, and holds among not-picked options
   and across families. Next: `most-detailed`, then `hedged` on b03 (the key
   carries a hedge on 6/16 b03 candidates) or `textbook-voice`. The placebo
   `position` sits near 25%; if it does not, the tagging is biased and every
   cue claim is weakened accordingly.

**How the result is used.** Cues that pass prediction 5's tests are candidates
for a causal test (remove the cue from 5–10 questions, hold everything else,
fresh seeds), not for brief changes. Explain-rung hit rates are diagnosis and
are reported apart from the letter rungs.
