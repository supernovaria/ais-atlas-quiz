# P1 re-run — 2026-09-27. PAUSED mid-critique (time-box), not stopped on a fault.

> **Superseded.** This run started from a branch 39 commits behind `main`, which had
> already completed P1 and moved on to the bench and floors. Kept for its findings,
> which now live in `docs/KNOWLEDGE.md` §2, §7 and §8. Do not resume it.

**First run where every precondition held at once.** Rooted at `ais-atlas-quiz/`
(worktree), prose present (11 files, 25,726 words), six agents resolved, selftests
green. Paused at a clean boundary after ~17 min, per the session's time-box.

**Every agent is on Opus 5.5 (`opus`), by Em's directive.** This deviates from P1's
design (sonnet analyst/generator/curator), so this is *not* the cheap pilot. For
the adversary it collides with its brief (haiku, "do not upgrade"), and an opus
adversary would not be comparable to `runs/baseline/`, which is haiku. **The
adversary stage has not run; decide before it does.**

## What ran

| stage | FT (N=4) | DMA (N=8) | spawns |
|---|---|---|---|
| analyse | 14 ideas, 9 earn Q | 15 earn Q | 2 |
| shard | 8 shards, pool 23 | 13 shards, pool 37 | script |
| generate | 23 cand., 0 fail | 37 cand., 0 fail | 21 |
| dedupe | 1 collapsed → 22 | 1 collapsed → 36 | script |
| measure | R8/R9/1.6× **22/22** | **36/36** | script |
| critique pass 1 | **11 / 22** | 0 / 36 | 11 |

34 spawns. Weekly usage went 66% → 77% over the window (no per-call figure
exists; this is the best cost proxy available). Validation: every agent artifact
validated first time; **no re-spawns**.

## Findings so far

1. **R14 is the dominant fault, and it is mechanical.** 7 of 11 verdicts cite R14:
   a stem word that recurs in only one option, which points at that option.
   `measure` already flags it: **53 of 58 candidates** carry
   `stem_word_singletons`. The critic is spending Opus calls on a fault the script
   has already found. That is not a reason to pre-filter (HANDOFF §6; it is
   rewritable). It is a strong case for the generator brief to self-check R14, or
   for `measure` to report it in the summary line alongside R8/R9.
2. **Length bands are solved on Opus.** 58/58 inside R8+R9+1.6× before critique,
   against RUBRIC §10's "none of the five rewrites was in band on first draft".
   The worry that R8, R9 and 1.6× jointly can't be met does not show up here;
   whether it does on sonnet is untested.
3. **Level inflation.** 6 of 11 candidates claimed a higher level than the critic
   assigned (a01, c03, d01 L4→L2; b03, f01 L4→L3; e01 L5→L4). a01's "novel
   case" is the section's own worked example.
4. **Verdict split: 11 rewrite, 0 pass, 0 reject.** A pass-1 rewrite is normal
   (it rescues the idea), but second passes are what decide pass rates, and none
   have run yet.
5. **Critic reviewer notes are doing real work.** b03: the key is the only
   "it depends" option (a semantic hedge D10 doesn't count). a02: the key is an
   umbrella over one distractor. Both are tells the checker can't see.

## Defects found

- **`shard` broke its own invariant.** DMA idea DM-14's 2 attempts both got lens
  "objection". `validate` catches it; generation had already run. Not re-run.
  This is a script bug in `stageShard` lens assignment.
- **Worktree path.** `pipeline.mjs` resolved prose relative to repo root; from a
  worktree the path is absent and anchor checks **silently switched off**. Added a
  `QUIZ_CHAPTER_DIR` override. The silent fallback should be an error.
- **No merge stage.** Generators write per-shard files; I merged them into
  `candidates.json` (and verdicts into `verdicts.json`) with a script that adds
  metadata only. `pipeline.mjs` should own this step.
- Analysts set `attempts` summing to ~5.75N (FT) and 4.6N (DMA), above the ~4N
  guide. Run as decided.
- Concurrency briefly hit 7 (one analyst plus six generators).

## Open decisions for Em

1. **Adversary model**: haiku (comparable to the baseline, breaks "all Opus") or
   opus (follows the directive, needs a new opus baseline for comparison).
2. **"GPT agents"**: none are configured in this environment. Name the
   integration if one exists. The adversary is where a model trained on other
   material would add the most.

## Resume from here

Critique FT queue items 12–22 (`queue.json` order; inputs in
`forecasting-timelines/critic-in/`), then DMA 1–36 (needs `critic-in/` built the
same way), then second passes on every rewrite. Then adversary (after decision
1), curate, regenerate, curate. P1b, P2 and pilot-analyst are all still pending.
