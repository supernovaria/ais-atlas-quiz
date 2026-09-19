# P1 — STOPPED AT PREFLIGHT. 2026-09-18

**P1, P1b, P2 and the pilot findings did not run.** The section prose is not in
this environment, and it is a required input to four of the six agents. Two
deliverables were unblocked and are complete: `scripts/pipeline.mjs` and
`runs/baseline/`.

## The blocker

`../atlas-audio-read-along/dist/chapters/v1/capabilities/*.md` — HANDOFF §1
expects 11 files, "Present at `../atlas-audio-read-along/…`, verified". **The
directory does not exist and neither does the repository.** Searched the whole
filesystem: the only chapter-1 text present is the read-along audio narration
(`public/audio/ch1 - capabilities/*.srt`), which is not a substitute —
2,872 words vs RUBRIC §8.1's 3,837 for `defining-and-measuring-agi` (75%), and
**no `##` sub-headings at all**. Without the prose: the Analyst cannot produce
`anchor` verbatim quotes or `subheadings`, the Critic cannot do D1 provenance
verification ("find the sentence in the prose") — its core judgment — and E4/E4a
citations have nothing to resolve against. Generating anyway would produce a pool
whose central quality gate was skipped, and measuring that pool would be worse
than not running: it would look like evidence. Per §3 of my instructions I
stopped rather than worked around it.

## Preflight

| check | result |
|---|---|
| `git status` clean, on `main` | on `claude/ais-atlas-ch1-pipeline-8iduau`, **zero diff from `main`** — branch instruction overrides the prompt; noted per §0 |
| `check:questions:selftest` 14/14 | **12 of 14**, exit 1. Both misses are exactly −1.0 char on `mean_key_len`/`mean_distractor_len`. Cause found: Appendix A was measured on a **CRLF** working copy (QUIZ-PLAN phase 0 records `core.autocrlf=true`); this is a fresh LF clone, so every option is 1 char shorter. Proved by re-measuring with +1 char/option → 149.3 / 107.5 exactly. The checker is not wrong; the expectation is environment-dependent. Gated metrics are unaffected (`extremum_gap` is a difference, so +1 cancels; ratio rounds to 1.39 either way). **Not fixed — normalising Appendix A or adding `.gitattributes` is your call, and editing a governing measurement to make a gate pass is the one move the rubric warns about.** |
| `check:exemplars` | passes, exits 0, "no exemplar file" — expected state |
| chapter prose, 11 files | **absent — the blocker above** |
| six `quiz-*` types resolve | all six, with correct brief content loaded (analyst 4 inputs, generator's 5 lens names, critic's 3 verdicts, curator's 3 artifacts, analyst §-count) |
| **`quiz-adversary` has no file tools** | **holds.** Reports only `SubagentHandback`. But the agent-type *listing* advertises `quiz-adversary` as "(Tools: All tools)" while every other agent lists its real set — the listing is wrong and the runtime is right. Anyone who checks the listing instead of spawning will wrongly conclude the metric is void. |
| `sonnet` / `haiku` / `opus` selectable | all three |
| session cost reading | **unavailable** — no programmatic cost tool in this environment. Spawn counts are the proxy (PIPELINE §8 sanctions this). 127 spawns: 1 isolation check, 5 type checks, 120 adversary, 1 unused. |

## What ran

`scripts/pipeline.mjs`, all nine stages (`shard dedupe measure queue shuffle
validate score assemble report`), each runnable in isolation. `pipeline.mjs
selftest` exercises all nine on synthetic fixtures — **40 assertions, all
passing** — and asserts `validate` actually fires on nine planted defects
(critic-recomputed measurements, non-empty `failed_criteria` on a pass, rewrite
with empty `preserve`, rewrite that changed `targets`, inferred misconception
labelled `observed`, shard count contradicting `attempts`, single-family option
set, two keys, "according to the chapter" in an option). A validator that never
fires is worse than none. `check-questions.mjs` now exports its `measure()` so
the arithmetic has one implementation — verified byte-identical output on both
`--selftest` and the full report before and after. Wall time ~50 min, mostly the
120 adversary spawns at 6 concurrent in 20 batches. **Validation failures: none —
no agent artifact was produced to validate.**

## Adversary baseline — `runs/baseline/`

Mean hit **98.3%** (118/120), mean(hit − 1/k) **+0.733** against a ≤0.15 gate,
**39 of 40 flagged**. Only `Chapter Review Q8` resisted (1/3).

**The headline is not "the old file is leaky."** Key positions of hits are
uniform (A26 B30 C29 D33) — the adversary is not catching a length or position
tell, it is answering correctly. `Takeoff Q1` (RUBRIC §3.4: cleanest option set
in the file, ratio 1.02) was hit 3/3. `Chapter Review Q4` (§3.6: "the best
question in the file") was hit 3/3. Those were the control group and they failed
it. `tools: []` stops the agent reading *this chapter*; it cannot stop the model
knowing material it absorbed from the sources the chapter summarises. HANDOFF §8
predicted the direction and called the bias safe for being one-directional — at
98.3% it is **saturated**, not safe: the per-question flag cannot discriminate,
and the curator's "flagged ⇒ ineligible" rule would reject nearly every P1
candidate on quality-independent grounds. This is a tier-4 finding, recorded not
acted on; the adversary's model and tools are yours.

## Things agents did that their briefs did not anticipate

- **`Foundation Models Q3#3`** — appended a reasoning paragraph despite "Do not
  explain. Reply with a single letter."
- **`Leveraging Scale Q4#2`** — returned the adversary brief's own
  *script-assembled* output object, `{"id": "unknown", "picked": "A", …}`. The
  brief prints that JSON under a heading saying "script-assembled, not
  model-written"; the model imitated it anyway. The letter-parse recovered the
  right pick **by luck** — `{"id": "a-1", "picked": "C"}` would have scored a
  fake hit silently. Fixed both sides: `score` now flags every non-bare-letter
  answer, and the brief fix is to delete the JSON block (exact text in
  `runs/baseline/deviations.md`).
- **`shuffle` drew a repeated permutation on 5 of 40 questions** (~4.9 expected
  by chance, so not a PRNG bug), cutting those to 2 effective seeds. Fixed to
  draw distinct permutations; re-running now yields 0. Committed data predates
  the fix; effect on a 98% rate is nil.

## Recommended next action

**Restore `atlas-audio-read-along` into this environment, then re-run P1 from
`analyse`.** Everything downstream is verified and waiting. Two decisions are
yours and neither blocks: whether Appendix A is renormalised to LF, and what to
do about a tier-4 metric that flags 39 of 40 including both rubric exemplars —
I'd resolve the second before P1 rather than after, because the curator's
eligibility rule depends on it and P1's coverage numbers are meaningless if
every candidate is flagged.

---

## Addendum, 2026-09-19 — tier-4 work done; prose still blocked

**The prose route Em suggested does not exist.** `atlas-audio-read-along` cloned
fine, but the gdocs cache is `./.cache/docs`, which `.gitignore` excludes
alongside `dist/`. Checked all 49 commits on all 4 branches: neither path has
**ever** been committed. Four routes, all closed: `dist/` (ignored, never
committed), `.cache/docs` (ignored, never committed), the published site
(`ai-safety-atlas.com` and `supernovaria.github.io` both refused by the
environment's network policy, 403 on CONNECT — not worked around), and Google Docs
directly (`GOOGLE_CREDENTIALS_BASE64` is a required env var and is absent). CI
builds with that secret and deploys a Pages artifact, so nothing lands in git.
**To unblock, one of: the credential, a network allowlist for the site, or the 11
`.md` files committed somewhere readable.** P1 remains unrun.

**Tier-4 saturation plan, all three steps done** — none of it needed the prose.

1. **Curator eligibility softened** (`.claude/agents/quiz-curator.md`). The
   adversary flag no longer gates eligibility; it lands in `flags_for_reviewer`.
   The same rule appeared twice more and both were changed to match, or they
   would have contradicted the edit: the curator's own self-check, and
   `pipeline.mjs validate`, which asserted no flagged Q shipped and excluded
   flagged ids from `eligibleIds()`. This alone unblocks P1.
2. **Stem-only probe** — `runs/baseline/stem-only/`. 60% strict / 77.5% loose
   against the MC adversary's 98.3%. Neither predicted band: most of the
   saturation is knowledge, but a real residual remains, and it is enumerable —
   eight questions hit 3/3 while free recall failed, three of them an outright
   "I DON'T KNOW".
3. **Planted-tell control set** — `runs/tier4-control/`. Fabricated framework,
   20 items, one tell per group. clean 40% · absolute 67% · key_hedges 87% ·
   key_longest 93% · real file 98%. Two findings worth acting on: the floor is
   **40%, not 25%** (a 4-option question carries a ~15-point inference premium,
   and the existing 0.15 gate matches that floor almost exactly), and **hedge
   density is the second-strongest tell at +62 points while
   `check-questions.mjs` hard-gates it nowhere** — `hedge_counts` is computed and
   passed to the critic, but tier 2 fails only on R8, R9, R9-spread, R5 and D4.
   Promoting D10's hedge rule to a tier-2 hard failure is the one concrete code
   change all this points at.
