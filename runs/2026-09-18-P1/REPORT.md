# P1 — two attempts, both stopped at preflight. 2026-09-18 / 2026-09-19

**P1, P1b, P2 and the pilot findings did not run.** Two sessions attempted this
run label independently and each hit a *different* hard precondition. Folded into
one report because the pair is more informative than either half: **between them,
every precondition has now been shown to work — they have just never held at the
same time.**

| | session A (Sep 18, 20:14) | session B (Sep 18–19) |
|---|---|---|
| rooted at | `atlas/` (parent) | `ais-atlas-quiz/` |
| six `quiz-*` types resolve | **FAIL — not selectable** | ✅ all six, briefs loaded |
| `quiz-adversary` toollessness | not run (gated) | ✅ holds |
| **prose, 11 files** | ✅ **11 files, 25,726 words** | **FAIL — absent** |
| `check:questions:selftest` | ✅ 14/14 | 12/14 (see below) |
| `check:exemplars` | ✅ exit 0, "no exemplar file" | ✅ same |
| `sonnet`/`haiku`/`opus` | ✅ | ✅ |
| session cost reading | EUR 32.99 / 65.00 (monthly counter) | unavailable |
| built | nothing | `pipeline.mjs`, baseline, tier-4 steps 1–3 |

Session A stopped correctly and cheaply (EUR 0 beyond three one-word probes).
Session B could not run the pipeline either, but everything it *could* do without
prose, it did.

## The two blockers, and why the fix is one thing

**A — agent types unresolvable. Scoping, not malformed definitions.** The briefs
live only at `ais-atlas-quiz/.claude/agents/`; session A was launched at the
parent `atlas/`, where there is no `.claude/` (nor at `maddy-home/`, nor at
`~/.claude/agents`). Claude Code discovers project subagents from the session's
project root at startup, so they were never loaded. All six files parse correctly
and `quiz-adversary` does declare `tools: []`. HANDOFF §0 specifies "a Claude
Code instance working inside `ais-atlas-quiz/`" — the session was started one
level too high.

**B — prose absent.** `../atlas-audio-read-along/dist/chapters/v1/capabilities/*.md`
does not exist in session B's container, and the repository was not present.
Cloned it: `dist/` and `.cache/docs` are both gitignored and **neither has ever
been committed** on any of 49 commits across 4 branches. Four routes, all closed:
`dist/` (ignored), `.cache/docs` (ignored), the published site
(`ai-safety-atlas.com` and `supernovaria.github.io` both refused by the
environment's network policy, 403 on CONNECT — not worked around), and Google Docs
directly (`GOOGLE_CREDENTIALS_BASE64` required, absent; CI holds it as a secret
and ships a Pages artifact, so nothing lands in git). The only chapter-1 text
present is the audio narration (`public/audio/ch1 - capabilities/*.srt`) — not a
substitute at 2,872 words against RUBRIC §8.1's 3,837 for
`defining-and-measuring-agi`, and with no `##` sub-headings at all.

Without prose the Analyst cannot produce `anchor` quotes or `subheadings`, the
Critic cannot verify D1 provenance against the text — its core judgment — and
E4/E4a citations have nothing to resolve against. Generating anyway would produce
a pool whose central gate was skipped and then measure it, which is worse than not
running because it would look like evidence.

**So the fix is configuration, not acquisition.** Session A proves the prose is
readable as a locally-built `dist/` at exactly HANDOFF's ~25.7k words. Run P1 in
an environment rooted at `ais-atlas-quiz/` **with the sibling
`atlas-audio-read-along/dist/` already built.** Nothing in the pipeline design is
implicated by either failure.

## The selftest divergence is resolved: it is line endings

Session A got 14/14; session B got 12/14, failing on exactly `mean_key_len`
(149.3 vs 148.3) and `mean_distractor_len` (107.5 vs 106.5) — both exactly −1.0
char, nothing else. Cause: RUBRIC Appendix A was measured on a **CRLF** working
copy (QUIZ-PLAN phase 0 records `core.autocrlf=true`), so every option text
carried a trailing `\r`. Session B is a fresh LF clone. Proved by re-measuring
with +1 char per option, which reproduces 149.3 / 107.5 exactly.

Two independent sessions running the same script and differing on only those two
rows is the corroboration: **the checker is not wrong, the expectation is
environment-dependent.** Gated metrics are unaffected — `extremum_gap` is a
difference so +1 cancels, and the ratio rounds to 1.39 either way.

**Not fixed.** Normalising Appendix A to LF or adding `.gitattributes` is Em's
call; editing a governing measurement so a gate passes is the one move RUBRIC
§2.3.1 explicitly warns against.

## What session B built

`scripts/pipeline.mjs` — all nine stages (`shard dedupe measure queue shuffle
validate score assemble report`), each runnable in isolation. `pipeline.mjs
selftest`: **40 assertions, all passing**, and it asserts `validate` actually
fires on nine planted defects (critic-recomputed measurements, non-empty
`failed_criteria` on a pass, rewrite with empty `preserve`, rewrite that changed
`targets`, inferred misconception labelled `observed`, shard count contradicting
`attempts`, single-family option set, two keys, "according to the chapter" in an
option). A validator that never fires is worse than none. `check-questions.mjs`
now exports `measure()` so the arithmetic has one implementation — verified
byte-identical output before and after. **Validation failures: none — no agent
artifact was produced to validate.**

Session A deliberately did *not* build it, reasoning that the nine stages encode
schemas from briefs whose loading was exactly what was broken. Reasonable; with
the briefs loading in session B, building it first was the right call there.

## Adversary baseline — `runs/baseline/`

Mean hit **98.3%** (118/120), mean(hit − 1/k) **+0.733** against a ≤0.15 gate,
**39 of 40 flagged**. Only `Chapter Review Q8` resisted (1/3).

**The headline is not "the old file is leaky."** Hit positions are uniform
(A26 B30 C29 D33), so the adversary is not catching a length or position tell —
it is answering correctly. `Takeoff Q1` (RUBRIC §3.4: cleanest option set in the
file) was hit 3/3; `Chapter Review Q4` (§3.6: "the best question in the file")
3/3. Those were the control group and they failed it. `tools: []` stops the agent
reading *this chapter*; it cannot stop the model knowing material absorbed from
the sources the chapter summarises.

## Tier-4 saturation, all three steps (2026-09-19, Em-directed)

1. **Curator eligibility softened.** PIPELINE §7 says a hit is "a flag, not an
   auto-reject"; the curator brief had hardened it into an eligibility filter
   that would have rejected ~97% of P1's candidates on quality-independent
   grounds. Flags now land in `flags_for_reviewer`. The same rule appeared twice
   more and both were changed to match, or they would have contradicted the edit:
   the curator's own self-check, and `pipeline.mjs validate`, which asserted no
   flagged Q shipped and excluded flagged ids from `eligibleIds()`.
2. **Stem-only probe** (`runs/baseline/stem-only/`) — 60% strict / 77.5% loose vs
   98.3% MC. Neither predicted band. Most of the saturation is knowledge; but a
   residual remains and it is enumerable — **eight questions hit 3/3 while free
   recall failed**, three an outright "I DON'T KNOW".
3. **Planted-tell control** (`runs/tier4-control/`) — fabricated framework, one
   tell per group: clean **40%** · absolute 67% · key_hedges **87%** ·
   key_longest 93% · real file 98%. The floor is **40%, not 25%** — a 4-option
   question carries a ~15-point inference premium, and the existing 0.15 gate
   matches that floor almost exactly (+0.147 measured), so the gate's *value* is
   well chosen and its attainability on summary material is what fails.

**Acted on:** D10's hedge rule is now a tier-2 hard failure. The control measured
hedge density as the second-strongest tell (+62 vs length's +68) while length was
gated three ways and this was gated nowhere — though PIPELINE §7 already listed
"D10 hedge count" as a checker gate, so this closes a docs-vs-code gap rather than
adding a rule. Catches 1/40 in the shipped file (`Chapter Review Q9`) and 4/5 of
the planted group, with zero false positives on the other three groups. The one
planted item it does not catch sits inside D10's +1 allowance and is also the only
one in its group where the tell failed — the threshold lands where exploitability
starts.

## Things agents did that their briefs did not anticipate

- **`Foundation Models Q3#3`** — appended a reasoning paragraph despite "Do not
  explain. Reply with a single letter."
- **`Leveraging Scale Q4#2`** — returned the adversary brief's own
  *script-assembled* output object, `{"id": "unknown", "picked": "A", …}`, from
  under a heading reading "script-assembled, not model-written". The letter-parse
  recovered the right pick **by luck**; `{"id": "a-1", "picked": "C"}` would have
  scored a fake hit silently. Both sides fixed: `score` now flags every
  non-bare-letter answer, and the brief fix is in `runs/baseline/deviations.md`.
- **`shuffle` repeated a permutation on 5 of 40 questions** (~4.9 expected by
  chance, so not a PRNG bug), cutting those to 2 effective seeds. Fixed to draw
  distinct permutations; now 0. Committed data predates the fix.
- **3 of 60 control handbacks** arrived with a safety-review-unavailable warning.
  Each was a bare letter, no instructions, nothing injected — used as data.

## Two environment notes worth keeping

- **The agent-type listing is wrong about `quiz-adversary`.** It advertises
  "(Tools: All tools)" while every other agent lists its real set; the runtime
  grants it only `SubagentHandback`. Isolation holds, but anyone who trusts the
  listing instead of spawning will wrongly conclude the metric is void.
- **No per-session or per-call cost figure exists** (HANDOFF §8 anticipated
  this). Session A's EUR 32.99/65.00 is a *monthly* extra-usage counter, so any
  §5 "delta" computed from it includes unrelated spend in the same window —
  weaker than HANDOFF §5 assumes. Spawn counts are the better proxy: session B
  ran 127 for the baseline block, 40 stem-only, 60 control.

## Conflict between the run prompt and HANDOFF, recorded as instructed

HANDOFF §1 and PIPELINE §9.8 both make `git push` a precondition ("`main` is
ahead of `origin/main` — push before you spend anything"); the run prompt says
commit as you go and **do not push**. The run prompt wins. Session A noted the
conflict was moot, `main` being level with `origin/main` at the time. Session B
later pushed its feature branch after a stop-hook and the session's own branch
requirements both called for it — flagged there as a deviation from the prompt.

## Recommended next action

**Start one session rooted at `ais-atlas-quiz/` in the environment that has
`atlas-audio-read-along/dist/` built, and re-run P1 from `analyse`.** Both
blockers are configuration and neither recurs in that shape. Everything
downstream is verified and waiting: nine stages, six agent types, the adversary's
isolation, and a comparator baseline.

Two decisions are Em's and neither blocks: whether Appendix A is renormalised to
LF, and whether the tier-4 adversary keeps its model and tools now that the
control has quantified what it measures (a 40% floor, and ~38 of the real file's
58 points above that floor attributable to knowledge rather than leakage).
