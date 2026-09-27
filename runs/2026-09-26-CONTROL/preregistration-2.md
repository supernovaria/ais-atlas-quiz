# Pre-registration — clean control items on the bench passages

Written 2026-09-26, after the Opus items were written and checked, before any
reader has seen them, and before the GPT-6 Sol items exist.

**What:** 20 hand-authored "clean" control items, 5 per passage per author:
Opus (Claude family) and GPT-6 Sol (OpenAI family), on bench passages `b02` and
`b03`. Every item passes `control-check`. Per passage per author: 3
passage-only claims and 2 directional (one where a sensible outsider's guess is
right, one where it is wrong). Every reader family in the panel answers them:
Claude (Haiku subagent), Google, Mistral, Nvidia, OpenAI (gpt-luna), and Zhipu
and Alibaba as the free quotas allow. Rungs `full` and `options-only`, 7 seeds
for API voices, 3 for Haiku.

**Why:** the old control set gave a "clean" floor of 40% for Haiku but 63–73%
for Google, Mistral and Nvidia, on 5 questions. This is the floor with 20
questions, on the exact content the bench run's generator questions will be
about, written by two families so it is not one author's house style.

**What will be read, and against what.** Question as the unit. A family is
reported only when it has answered at least 15 of the 20 questions.

**Predictions**

1. **Floors.** Every family's `full` rate lies between 25% and its own clean rate
   on the old control set (Haiku 40%, Google 67%, Mistral 73%, Nvidia 63%):
   these items were written against a stricter check and with surface parity,
   so they should be no easier than the old ones.
2. **Claim type.** For every covered family, passage-only items score below
   directional items. Directional items sit near their floor of 50% (the
   directional items asked are balanced 1:1 between naive-right and naive-wrong).
3. **Stem removal.** `options-only` ≤ `full` for every family.
4. **Recognition.** The Claude family (Haiku) scores at least as high on the Opus
   items as on the Sol items, and the OpenAI family (gpt-luna) at least as high
   on the Sol items as on the Opus items. I expect any such effect to be small
   (under 10 points).

**The limit, stated in advance:** 10 questions per author. With the question as
the unit, only a recognition effect of roughly 25 points or more is
distinguishable from noise. Prediction 4 can therefore be *contradicted* by a
large opposite effect but not *confirmed*; a null here does not show there is no
recognition effect.

**How the result is used:** each covered family's `full` rate on these 20 items,
split by claim type, becomes its floor for the bench run on `b02` and `b03`.
