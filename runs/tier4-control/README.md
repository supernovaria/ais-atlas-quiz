# Planted-tell control set — calibrating what the adversary actually exploits

2026-09-19. Step 3 of the tier-4 saturation plan, triggered because step 2
(`runs/baseline/stem-only/`) left a residual: eight questions the adversary hit
3/3 while free recall failed outright. Something in those option sets was
supplying the answer. This measures what.

## Design

20 fabricated items over a fabricated framework (`passage.md` — Vantine stratal
capacity, the korrel, lattice drift, the Brenmark threshold; all invented). The
adversary never sees the passage, so **domain knowledge is zero by
construction** and every hit above chance is the option set leaking.

Four groups of 5. The clean group is the control; each other group differs from
it in **exactly one** surface property, verified mechanically with the same
`measure()` the pipeline uses:

| group | planted tell | verified |
|---|---|---|
| `clean` | none — R8 band, spread ≤1.6×, no absolutes, matched hedging, key never the longest | ✓ |
| `key_longest` | key is the longest option, by 82–114 chars (R9 breach) | ✓ |
| `absolute` | exactly one distractor carries an absolute quantifier; key not longest | ✓ |
| `key_hedges` | key hedges twice, distractor median zero; key not longest | ✓ |

The first draft failed that verification — the key was incidentally the longest
option in 13 of the 15 non-`key_longest` items, which would have conflated length
with the tell under test. 13 distractors were lengthened until each group varied
in one property only. Same `pipeline.mjs shuffle`/`score` path as
`runs/baseline/`, 3 distinct permutations per item, 60 spawns.

## Result — the calibration curve

| group | hits | rate | excess over 25% chance | per item |
|---|---|---|---|---|
| `clean` | 6/15 | **40%** | +15 pts | 3/3 1/3 1/3 1/3 0/3 |
| `absolute` | 10/15 | **67%** | +42 pts | 3/3 3/3 3/3 1/3 0/3 |
| `key_hedges` | 13/15 | **87%** | +62 pts | 3/3 3/3 3/3 3/3 1/3 |
| `key_longest` | 14/15 | **93%** | +68 pts | 3/3 3/3 3/3 3/3 2/3 |
| *real ch1 file* | *118/120* | *98%* | *+73 pts* | *39/40 flagged* |

Four things follow, in descending order of how much they should change.

### 1. The floor is 40%, not 25%

On fiction with no tell and no knowledge, the adversary still scores 40%. It is
not guessing — it infers from the stem's own framing. `clean/03` asks what makes
lattice drift "most dangerous" and was hit 3/3, because the option describing the
most insidious-sounding mechanism is identifiable as the intended answer without
knowing anything. **A four-option question has an irreducible ~15-point
inference premium over chance**, and any threshold set against 1/k is mis-anchored
by that much.

Note what this does to the existing gate. `mean(hit − 1/k) ≤ 0.15` turns out to
match the clean-fiction floor almost exactly (+0.15 vs +0.147 measured). The
gate's *value* is well chosen — it is very nearly "no more leaky than an
untellable question" — it is the *attainability* that is wrong on real material,
where knowledge adds another 30-plus points on top.

### 2. Hedge density is the second-strongest tell and the checker does not gate it

`key_hedges` scored 87%, +62 points — within 6 points of the length tell. Length
is gated three separate ways (R8 band, R9 extremum, the 1.6× spread) and
reproduces in Appendix A. Hedge density is **computed** by
`check-questions.mjs` (`hedge_counts`, passed into the critic) and **hard-gated
nowhere**: tier 2's failing rules are R8, R9, R9-spread, R5 and D4 only. D10
states the rule in prose — "the key must not carry more than one more hedge than
the median distractor" — and nothing enforces it.

Every item in this group breaches D10 (key 2, distractor median 0) and would pass
`npm run check:questions` silently. **Proposed change: add D10's hedge rule to
tier 2 as a hard failure**, on the same footing as R8. The measurement already
exists; only the gate is missing. This is the single most actionable thing the
control produced, and it is exactly the kind of gap that only a planted-tell
fixture finds — no amount of staring at real questions reveals that an ungated
criterion is nearly as exploitable as the most-gated one.

### 3. The absolute-quantifier tell is real but much weaker (+42)

D4 already caps absolutes at one per question, and the gate is enrichment-based
(≤1.5× distractors vs keys), which the control suggests is roughly the right
priority — weaker effect, existing gate. Two items in this group scored 1/3 and
0/3: eliminating the absolute leaves three options and the adversary then picked
wrong, twice choosing the exact inverse of the key. Removing one option from
contention is worth less than pointing at the right one.

### 4. What this says about the real 98%

Decomposing, roughly: 25 chance + 15 inference premium = 40 floor; the real file
sits 58 points above that floor, and step 2 showed ~38 of those points are
knowledge the model already had. The remainder is consistent with the length and
hedge tells the rubric's own Appendix A documents in the current set (key longest
60%, ratio 1.39). The three measurements are mutually consistent, which is the
best evidence available that none of them is an artefact.

## Scope

This is a **test fixture**, the same category as the synthetic fixtures inside
`pipeline.mjs selftest`. It is fiction about a theory that does not exist, it is
not a question anyone should answer, and it never goes near `staging/` or
`public/questions/`. `control.md` is generated from `items.json`, which stays the
source of truth; regenerate rather than editing it.

## Files

- `passage.md` — the fabricated source, and why fiction beats real-but-obscure
- `items.json` — 20 items with `group` labels; the source of truth
- `control.md` — generated quizParser fixture, so the run uses the real code path
- `order.json` — question-number → item id + group mapping
- `shuffle.json` / `picks.json` / `adversary.json` — prompts, letters, scores
