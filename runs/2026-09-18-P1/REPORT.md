# P1 — session C, 2026-09-19. First session to get past preflight. Stopped on budget.

Sessions A and B each died at a *different* precondition and never ran a stage
(`REPORT-sessions-AB-blocked.md`). **Session C is the first run where every
precondition held at once, and the first to put real candidates through the
machinery.** It stopped at 87% of the 5-hour usage window, as instructed, with
one section most of the way through the pipeline.

Plain-English key to the codes used below is at the bottom.

## What ran

| stage | spawns | model | result |
|---|---|---|---|
| preflight probes | 8 | all three | all green (see below) |
| analyse | 2 | sonnet | both concept maps, both validate |
| shard | — | script | FT 4 shards/pool 12 · AGI 11 shards/pool 31 |
| generate | 6 | sonnet | FT complete (11 candidates); AGI 2 of 11 shards |
| dedupe/measure/queue | — | script | ran clean |
| **critique** | **6** | **opus** | 6 of 11 FT candidates |
| re-measure (3′) | — | script | all 6 rewrites measured |
| shuffle | — | script | 6 questions × 3 seeds = 18 prompts |
| **adversary** | **18** | **haiku** | complete on the 6 rewrites |
| score | — | script | mean hit 78% |
| curate | 0 | — | **not run — stopped here** |

**Not run:** the other 5 FT critic calls, the AGI section, P1b (sharding A/B),
P2 (critic stability), the pilot analyst, regeneration, curation, staging.
Wall time ≈ 2h10m. 40 spawns total.

## Cost, and why the budget rule could not be applied as written

The `~$25` ceiling assumed a dollar meter. **There isn't one.** On this Team
plan the extra-usage counter never moved — **$6.53 at start and $6.53 at stop**,
so no API or usage credit was spent, as instructed. Spend lands on plan quota,
which reads only as a percentage. Measured burn on the 5-hour window:

| call type | cost per call |
|---|---|
| sonnet analyst / generator | ~3.8 points |
| **opus critic** | **~6.3 points** |
| haiku adversary | ~0.5 points |

Six Opus critic calls cost 38 points. **That is the number that governs this
pipeline's cost**, and it is why the run stopped with one section unfinished:
the remaining 5 critic calls alone would have cost ~31 points. Spawn counts
remain the only honest proxy (HANDOFF §8).

*Meter caveat:* the usage tool and the on-screen card disagreed mid-run (tool
80%, card 48%); the card was stale and later agreed. Trust one source.

## Preflight — all green, but one check is broken

Everything passed: clean tree on `main`, selftest 14/14 (CRLF checkout, so
session B's −1.0-char divergence did not recur — corroborating its line-ending
diagnosis), `check:exemplars` exit 0, 11 prose files / 25,726 words, all six
agent types, all three models.

**The adversary toollessness check as specified is unreliable and gave a false
positive.** Spawned with "list every tool you have", it named *bash, PowerShell,
read_file, write_file* — none of which are this harness's real tool names. It
was confabulating. Session B got a clean answer from an identical config, so the
self-report test is **not reproducible in either direction**. I escalated to a
canary test: planted a scratchpad file with a random string and asked it to read
it. It replied `NO-FILE-ACCESS` with `tool_uses: 0`. **Isolation holds, the
metric is valid, and HANDOFF §1 should replace "ask it to list its tools" with
the canary test.**

`scripts/pipeline.mjs` was **verified, not rebuilt** — session B had already
built all nine stages (40/40 selftest assertions, `validate` fires on 9 planted
defects). Rebuilding working audited code would have been destructive.

## Results

**Checker, first draft, 11 FT candidates:** R8 9/11 · R9 7/11 · **joint
R8+R9+1.6× 7 of 11 (64%)**. Worth flagging against RUBRIC §10's closing caution
that *none* of its own five worked rewrites was inside the band on first draft —
here nearly two-thirds were. The no-pre-filter rule is still right, but its
stated justification is weaker than the rubric claims.

**Critic: 6 of 6 "rewrite". Zero pass, zero reject.** The brief predicts rewrite
will be the most common verdict; it was the *only* verdict. Criterion failures:

```
R14 overlapping options      4      D3 straw distractor     2
D1  provenance unverified    3      E3 explanation          2
R5  "according to the…"      2      others (D8 D9 D12 E4 R9 L3)  1 each
```

**The generator systematically over-claims difficulty: the critic changed the
level on 5 of 6** (L4→L3 ×3, L5→L4, L4→L2). Only one matched. With no exemplar
file, this is the clearest evidence in the run for your question 6.

**Rewrites work on mechanics: all 6 pass the joint length gate**, and `a03r` was
rescued from an outright R8 failure (1.15 → 1.06). Second passes invoked: 0.

**Adversary, 6 rewrites, 3 seeds, 18 answers, 0 unparsed:**

| | this run | baseline (current 40-Q file) |
|---|---|---|
| mean hit | **78%** | 98.3% |
| mean(hit − 1/k) | **+0.528** | +0.733 |
| flagged | 4 of 6 | 39 of 40 |

Better than the shipped file on every measure, still far above the 0.15 gate —
and above the 40% floor session B's planted-tell control established for clean
4-option items. Two questions resisted at 1/3 (`a01r`, `c02r`); four were hit 3/3.

**Dedupe collapsed 0 of 11** — it saved nothing here, because sharding gives each
candidate a distinct idea+lens. On this evidence dedupe earns its place only
when a section is generated whole (which is exactly what P1b would have tested).

## Things agents and the pipeline did that the briefs did not anticipate

1. **Candidate ids collide across shards.** The brief's template
   `<section>/<model>/NN` has no shard component. Four sonnet shards each
   numbered from 01, producing duplicate ids — which silently collapsed
   `measure` from 11 candidates to 3. **Silent, not loud**, and it would have
   corrupted every downstream number. Namespaced by shard (`a01`, `b01`, …);
   ids only, no text touched. **The brief needs a shard slot in the id.**
2. **`validate` demands something unsatisfiable.** The analyst named a
   discrimination pair `FT-5`/`FT-5b` where `FT-5b` does not earn a question.
   Shards are built only from earns-question ideas, so the pair can never
   co-occur and `shards.json` can never validate. Analyst and shard-builder are
   both behaving correctly; the contract between them is wrong.
3. **The "3′ re-measure rewrites" step cannot be run.** `measure` filters to
   `dedupe.json`'s survivor list, which predates the rewrites, so it measures
   nothing new — and `dedupe` must *not* simply be re-run, because a rewrite
   shares its original's targets and most of its stem and would be collapsed
   against the very candidate it replaces. Worked around by appending rewrite
   ids to the survivor list. **This needs a real stage.**
4. **`score` silently reports 0%** when `picks.json` is an array rather than an
   `{"<id>#<seed>": "letter"}` object. It said "mean hit 0%, gate pass" —
   a *passing* gate from malformed input, the most dangerous possible failure.
5. **Two generators wrote 2 candidates for a 3-idea shard** (`forecasting-timelines-b`,
   `defining-and-measuring-agi-b`), folding a discrimination pair into one
   contrast question and explaining why in the trailing note. **Brief-compliant
   and good judgment** — recorded because it makes pool size smaller than
   `sum(attempts)` implies, which the shard arithmetic does not expect.
6. Every generator emitted a trailing `{"note": …}` object, as its brief allows.
   A naive merge counts these as candidates. Kept in `generator-notes.json`.
7. Adversary returned 18 of 18 bare letters — **no repeat of the baseline run's
   deviations.**

## Answers to what you actually wanted to know

1. **Does the machinery hold?** Yes, as far as it got: 5 of 9 script stages and
   4 of 6 agent types ran on real data, and every agent artifact validated
   first time. But **four defects above (1, 2, 3, 4) are all silent-failure
   bugs** — three of them produce plausible wrong numbers rather than errors.
   That is the headline: the pipeline's failure mode is quiet corruption.
2. **Does sharding beat whole-section?** **Unanswered — P1b never ran.** Still
   the most valuable thing a next run can produce.
3. **Is the critic stable?** **Unanswered — P2 never ran.**
4. **Do the four mechanisms earn their place?** Partial: dedupe saved nothing
   under sharding; the coverage-ordered queue worked; regeneration and the
   second-pass hand-off were never triggered (no second pass was needed).
5. **Where is the rubric unenforceable?** 64% of first drafts cleared the joint
   length gate unaided, so that trio is *more* enforceable than the rubric
   assumes. The uniform-blandness check needs a shipped set to read; there
   isn't one, so **I am not answering it** rather than guessing.
6. **Is the rubric enough without exemplars?** The strongest signal is level
   over-claiming on 5 of 6, plus R14 (overlapping options) failing on 4 of 6 —
   both shape faults that worked examples fix cheaply. Six candidates is too
   thin to call it, but if one thing gets exemplars, it is **level calibration**.

## Recommended next action

**Fix the four silent-failure bugs first — they are cheap and they corrupt
everything downstream — then re-run from `analyse` in a fresh 5-hour window,
spending it on P1b (sharding A/B) and P2 (critic stability),** which are the two
questions this run could not touch. Budget ~6.3 window-points per Opus critic
call: a full two-section P1+P1b+P2 does not fit in one window and needs either
two windows or a cheaper critic.

Two decisions remain yours and neither blocks: whether Appendix A is renormalised
to LF, and whether the adversary keeps its current model now that both this run
(+0.528) and the control (40% floor) have quantified what it measures.

---

### Plain-English key to the codes

| code | means |
|---|---|
| **R5 / E5** | the phrase "according to the chapter" appears — tests reading, not understanding |
| **R8** | key and distractors should be similar lengths (ratio 0.8–1.2) |
| **R9** | the key must not be the obviously longest or shortest option |
| **1.6× spread** | longest option no more than 1.6× the shortest |
| **R11 / R13 / R14** | one durable figure per section / ≤1 negation / options must not overlap |
| **D1** | each wrong option must trace to a real sentence a reader could misread |
| **D3** | no "straw" distractor nobody would pick |
| **D8 / D9 / D10 / D12** | distractor craft rules (D10 = wrong options hedge more than the key) |
| **E3 / E4** | the explanation must name a wrong option and cite its section |
| **L0–L5** | difficulty ladder: L0–L2 recall/definition, L3–L5 apply/transfer |
| **N / 4N** | target questions per section / the ~4× candidate pool |
| **P1 / P1b / P2 / P3** | cheap pilot / sharding A/B / critic-stability re-run / production-model run |
| **tier 4 / adversary** | can a reader who never read the chapter still guess it? |
