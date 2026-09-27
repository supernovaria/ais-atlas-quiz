# Pre-registration — per-voice floors on the hand-authored control set

Written 2026-09-23, before any voice has answered these prompts.

**What:** every API voice in the `ablation` panel answers the 20 items of
`runs/tier4-control` (hand-authored fiction; four groups of five: `clean`,
`key_longest`, `absolute`, `key_hedges`), rungs `full` and `options-only`,
7 seeds, letter mode only. No Claude spawns: Haiku's figures on this set
already exist (clean 40%, absolute 67%, key_hedges 87%, key_longest 93%, 3 seeds).

**Why:** review 2026-09-23-voices #2. The 40% floor was measured with one
reader. Each voice (and family) needs its own floor before a panel result can
be read against one, and the planted groups show which surface tells each
family exploits.

**Predictions** (question as the unit; n = 5 per group, so every interval will
be wide and none of these is a strong test):

1. Every family's `clean` rate on `full` lies between 25% and 60%.
2. For every family, each planted group scores at or above its `clean` group.
3. `key_longest` is the strongest tell for every family, as it was for Haiku.
4. The smallest model (ministral-8b) has the lowest `clean` rate of the panel.
5. `options-only` is at or below `full` for every family on `clean`.

**How it will be read:** each family's `clean` rate on `full` becomes its floor
for passage-only items in bench runs. A result outside prediction 1 means that
family's floor differs materially from Haiku's, which is the reason for this run,
not a failure of it.
