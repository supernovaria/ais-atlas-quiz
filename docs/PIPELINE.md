# Question-generation pipeline — roles, flow, gates

> 2026-09-18. Operationalises QUIZ-PLAN.md phases 4–6 into agent roles.
> Governing doc for *what a good question is*: `docs/RUBRIC.md`. This file
> governs *who does what, in what order, with what in hand*. Where they
> conflict, RUBRIC wins and this file gets fixed.
>
> Scope: chapter 1 MC, 6 sections + review block. Same scope as QUIZ-PLAN.

---

## 1. Why a pipeline of narrow agents, not one prompt

- The current file exists because one model did everything in one chat: pick
  ideas, write, judge, assemble. Nothing was measurable, nothing reproducible.
- Each rubric failure the audit found maps to a *missing separation*:
  - Length tells (60%) → writer judged its own lengths. Fix: **script measures, model never counts.**
  - Trivia/recall (40%) → no step decided *which ideas deserve a question* before writing. Fix: **concept map first.**
  - Straw distractors → no step verified provenance against the text. Fix: **critic re-derives provenance, doesn't trust it.**
  - Padded sections → writer filled a quota. Fix: **curator selects from surplus; under-fill is a valid output.**
- Every agent gets one job, one input bundle, one output schema. Every output
  is a file in `runs/`. Every question that ships has a lineage back to a
  concept-map entry.

---

## 2. Roles

| # | Stage | Agent / actor | Model | Doc |
|---|---|---|---|---|
| 0 | Inputs | script | — | §6 |
| 1 | Concept map | **Section Analyst** | `sonnet` (`opus` if cheap run shows gaps) | `.claude/agents/quiz-section-analyst.md` |
| 2 | Candidates ≈4N | **Generator** | assigned per shard — `opus` + `fable` alternating across an idea's attempts (pilot: `sonnet`) | `.claude/agents/quiz-generator.md` |
| 3 | Measure | **Checker** (script, tiers 1–2, per candidate) | — | QUIZ-PLAN phase 3 |
| 4 | Verdict + rewrite | **Critic** | `opus` in every run — no effort knob, see HANDOFF §8 | `.claude/agents/quiz-critic.md` |
| 3′ | Re-measure rewrites | Checker | — | — |
| 5 | Test-wise read | **Adversary** | `haiku`, no tools (thinking not disableable) | `.claude/agents/quiz-adversary.md` |
| 6 | Select the set | **Curator** | `sonnet` (pilot) / `opus` | `.claude/agents/quiz-curator.md` |
| 7 | File-level checks | Checker (all tiers, set-level) | — | QUIZ-PLAN phase 3 |
| 8 | Read every Q | **Em** | — | RUBRIC §9 + curator's review sheet |
| — | Pilot findings | **Pilot Analyst** | `opus` | `.claude/agents/quiz-pilot-analyst.md` |

Roles run as **Claude Code subagents**, one `Agent` spawn per call. The briefs
in `.claude/agents/` are the agent definitions: frontmatter (name, model, tools)
plus the brief body verbatim as the system prompt. Spawn them; never copy their
text into a prompt.

**Two roles are new relative to QUIZ-PLAN:**

- **Section Analyst (1).** Produces the concept map: which ideas earn a
  question (RUBRIC §8.2), the discrimination pairs (§3.4), text-anchored
  misconceptions (§4.1/4.2), volatile/durable inventory (§5), cross-section
  links. Rationale: the generator otherwise picks ideas by salience, which is
  how L0/L2 padding happens. Also gives the coverage map the earlier design
  discussion wanted (Q-matrix-lite) with zero statistics.
- **Curator (6).** Picks the final N from surviving candidates. QUIZ-PLAN says
  "the critic picks", but the critic sees one candidate at a time and cannot
  enforce anything set-level: §3.7 distribution, R11 budget, R13 cap, R4 dups,
  concept coverage, distractor-family diversity. Someone has to see the whole
  pool.

**One mechanic is new:** the checker runs *before* the critic and its
measurements are passed *into* the critic's input. Models count characters
badly; the critic must never recompute `len_ratio`. It reads the numbers and
judges.

---

## 3. Flow per section

```
S.md ─┬─► [1] Analyst ──► concept-map.json  (ideas carry `attempts`)
      │                        │
      │                   shard (script) ──► shards.json   one shard = ~3 clustered ideas + assigned lens + model
      │                        │
      ├────────────────────────┼─► [2] Generator ×1 call per shard ──► candidates.json  (~4N, tagged to concept ids)
      │                        │                                    │
      │                        │                     dedupe (script) ──► near-identical candidates collapsed BEFORE any critic call
      │                        │                                    │
      │                        │                    [3] Checker t1–t2 ──► + measurements
      │                        │                                    │
      │                        │                     queue ordered by coverage need (script)
      │                        │                                    │
      ├────────────────────────┴────────────────────────────────► [4] Critic ──► verdicts.json
      │                                                             │  rewrite? ──► [3′] re-measure ──► fail again? ──► one more critic pass (carrying pass-1 `reasons` + `rewrite_changed`) ──► else reject
      │                                                             │
      │                                             pass / accepted-rewrite ──► [5] Adversary ──► hit flags
      │                                                             │
      ├──► concept-map + all above ──────────────────────────────► [6] Curator ──► curator.json
      │                                                             │
      │            any `earns_question_uncovered`? ──► [2r] Regenerate ──► [3] ──► [4] ──► [5] ──► [6] second pass ──► staging/S.md + review-sheet-S.md
      └────────────────────────────────────────────────────────────┘        once only
```

Then, once all 6 sections + review block are staged:

```
staging/*.md ──► assemble ch1-capabilities.md ──► [7] Checker all tiers ──► baseline-vs-new table
                                                        │
                                                        └──► [8] Em reads every Q against §9 + review sheet ──► ship
```

**Loops, bounded.**
- Critic rewrite → re-measure → still fails R8/R9/1.6× → *one* second critic pass → still fails → `reject`. Never a third. **The second pass carries pass 1's `reasons` and `rewrite_changed`**: each critic call is a fresh subagent with no memory, so without them pass 2 cannot see what pass 1 was fixing, and will cheerfully repair D3 while re-breaking R8 or quietly undo the first fix.
- **Regeneration, once.** If the curator reports `earns_question_uncovered`, one generator call per uncovered idea, then measure → critique → adversary → curator again. **Once only** — a second regeneration means the idea does not support a question that clears the rubric, which is a finding, not a retry. Nothing else re-enters: covered ideas are not re-generated to improve an already-shipping question.
- Adversary hit on a curator-selected Q → curator swaps for the next-best candidate on the same concept, or under-fills. Adversary is not re-run on rewrites the curator makes (curator makes none — see its doc).
- Set-level gate fails at [7] → fix the *prompts or rubric*, re-run the offending section. Never hand-edit staging (QUIZ-PLAN phase 5).

**Why regeneration exists.** Without it, a good idea whose only candidate the
critic rejected is simply lost: the curator records it as uncovered and the
section under-fills. Under-fill is the right answer when an idea *cannot* carry a
question, and the wrong answer when one generator happened to write a bad one.
The bounded pass separates those two cases — and because it runs after the
curator has seen the whole pool, it regenerates against a known gap rather than
speculatively.

**One thing deliberately not done: no mechanical pre-filter before the critic.**
Dropping candidates that fail R8/R9 before spending a critic call looks like an
obvious saving and is a mistake. RUBRIC §10's closing caution is that *none* of
its own five rewrites was inside R8/R9 on first draft. Mechanically-failing
candidates with a good idea are exactly what the rewrite path exists to rescue;
filtering them out would leave the critic judging only the questions that needed
it least. Dedupe is cheap because identical candidates carry no extra idea;
mechanical filtering is expensive because length is the most rewritable fault
there is.

### 3.1 Generator sharding

Replaces "two generators, each writing `2N` for the whole section". That shape
had one agent allocate candidates across every idea in a single pass, which
anchors — an agent that has just written a misconception item steers the next
one away, and by item 8 it is straining to differentiate rather than writing its
best attempt at the hardest idea.

**The unit of work is a shard: ~3 clustered ideas, one assigned lens, one
assigned model, one candidate per idea.** Construction, by `pipeline.mjs shard`:

1. The analyst gives every `earns_question` idea an `attempts` count — **3** if
   `threshold: true` or a member of a `discrimination_pairs` entry, **2**
   ordinary, **1** marginal. This is where "how many questions per topic" is
   decided, and it is the analyst's call because it is the role that already
   scores ideas against §8.2.
2. Build shards of ~3 ideas such that every idea appears in exactly its
   `attempts` many shards, **no two shards have identical membership**, and
   ideas that `pairs_with` each other co-occur in at least one shard. A
   discrimination question needs both members of the pair in view, which is why
   the shard is a cluster and not a single idea.
3. Assign each shard a lens and a model so that the attempts *on any one idea*
   differ in both. Idea X gets `misconception`+Opus in one shard,
   `contrast`+Fable in another, `case` in a third.
4. One candidate per idea per shard. Pool size is `sum(attempts)`, which lands
   near the 4N the plan already budgets.

**The point is which axis decorrelates.** Giving agents different idea-subsets
varies their *context*, which is the weakest of the three levers — two agents
with different subsets still share model, brief and lens. Lens and model are the
strong levers, so they are assigned deliberately rather than left to emerge.
Overlapping membership is what makes that possible, not the source of the
diversity itself.

**This is a P1 experiment, not a settled design.** Run one pilot section both
ways — sharded, and whole-section ×2 as originally specified — and let the Pilot
Analyst compare pool diversity, critic pass rates and coverage. Its brief
already asks whether the lenses actually decorrelated the pools. If sharding
does not visibly help, the simpler shape stands and that is worth more than the
questions.

---

## 4. Chapter review block

Separate run, after all six sections are staged.

- Analyst input: all six concept maps (not the prose). Output: a *chapter map* — cross-section links promoted to review candidates, the L5 seeds from RUBRIC §3.6, one Pattern-E invariant question slot.
- Generator: review mode (its doc §"Review mode"). Every candidate must name ≥2 sections in `targets`.
- Curator: RUBRIC §3.7 review table (L4+L5 ≥ 50%, L5 ≥ 3), R4 against all section stems, no concept already carrying a section Q at the same level.
- FR questions: out of scope here (QUIZ-PLAN defers).

---

## 5. Run order

Matches QUIZ-PLAN phase 4–5. Restated with the agent roles.

| Run | Sections | Models | Purpose | Output |
|---|---|---|---|---|
| **P1 cheap** | `forecasting-timelines`, `defining-and-measuring-agi` | `sonnet`, except `opus` critic and `haiku` adversary | Test the rubric + these agent docs | Pilot Analyst findings → RUBRIC v2, agent-doc fixes |
| **P2 stability** | same candidates as P1 | critic run 2× | Verdict flip rate per criterion | in findings |
| **P3 expensive** | same two sections | production models | See the ceiling; diff vs P1 by hand | go/no-go |
| **Full** | remaining 4 + review block | production | The set | staging → checker → Em |

Do not touch the agent docs between P3 and Full unless P3 fails. The point
of P1–P3 is to finish editing *before* the spend that produces the shipped set.

---

## 6. Inputs and file layout

```
ais-atlas-quiz/
  QUIZ-PLAN.md                    the plan; phases, definition of done
  docs/RUBRIC.md                  governing
  docs/EXEMPLARS.md               phase 2 (8–10 Q + 2 counter-exemplars)
  docs/PIPELINE.md                this file
  docs/HANDOFF-ORCHESTRATOR.md    how to run it
  .claude/agents/quiz-*.md        role briefs = the agent definitions, verbatim
  misconceptions/<section>.md     OPTIONAL. Real learner confusions (facilitator form, forum mining).
                                  Absent for v1. Analyst doc says what to do with/without.
  scripts/check-questions.mjs     checker
  scripts/pipeline.mjs            deterministic stages only (measure/shuffle/validate/score/assemble/report)
  runs/<YYYY-MM-DD-label>/
    <section>/
      concept-map.json            ideas carry `attempts`
      shards.json                 shard membership, assigned lens + model (§3.1)
      candidates.json             all shards, with `model` and `shard_id` fields
      dedupe.json                 collapsed ids → survivor, so lineage survives
      measurements.json           checker t1–t2 per candidate id
      queue.json                  critique order, by coverage need
      verdicts.json               critic, incl. rewrites + second-pass verdicts
      adversary.json
      curator.json                selection + rationale + `siblings`
      regenerated/                candidates.json etc. from the one regeneration pass
    review-block/                 same shape
    run.log                       stage, agent, model, ids, start/end, artifact, ok/fail
  runs/baseline/                  adversary run on the CURRENT 40-Q file, same agent — the only valid comparator
  staging/<section>.md            quizParser fragments
  staging/review-sheet-<section>.md
```

Source prose: `atlas-audio-read-along/dist/chapters/v1/capabilities/<section>.md`.
Section headings in the question file: copy the *existing* file's `#` headings
exactly (parser + checker tier 1 depend on them).

**Subagent notes (superseding QUIZ-PLAN's API notes — see HANDOFF §8 for why):**
Every agent writes its artifact to an exact path and replies with one status
line; artifacts go to disk, not into the orchestrator's context. There is no
structured-output guarantee, so `pipeline.mjs validate` schema-checks every
artifact and an artifact that does not validate did not happen. There is no
per-call `effort`, so the critic gets `opus` in every run including the pilot.
A Fable refusal looks like any other failure — a missing artifact — and is
logged, never silently retried. Per-call token and cost figures are not
available; record a session-level cost delta per run instead.

---

## 7. Gates, restated in one place

| Where | Gate | Owner |
|---|---|---|
| per candidate | R1–R4, R5 regex, R8, R9, 1.6× spread, D4 count, D10 hedge count | checker → critic reads |
| per candidate | D1 provenance verified against text; E8 explanation true; level; families | critic |
| per candidate | not answerable without the text | adversary (hit = flag, not auto-reject) |
| per section | §3.7 distribution; R11 ≤1 durable figure; R13 ≤1 negation; R4; coverage of `earns_question` ideas; ≤1 bridge Q | curator |
| per file | §2.3.1 set-level; anchors (1b); durability (t3, warn); adversary ≤40% | checker |
| per file | every Q read, §9 | Em |

Definition of done is QUIZ-PLAN's, unchanged.

---

## 8. Reconciliation with the didactic design doc (Sept conversation)

The earlier design doc (SOLO/Bloom, misconception distractors, IDK button,
pre-tests…) and RUBRIC.md were written independently. Mapping:

**Already in the rubric, same idea different name**

| Design doc | Rubric |
|---|---|
| Distractors = misconceptions, never filler | D1 provenance, D2 families, D3 straw ban |
| Test by application, not definition | L3–L5, L2 cap |
| Feedback precise + section link | E1–E8, E4a |
| Threshold concepts get tested hardest | not named — **analyst now flags `threshold: true`**, curator weights them |
| Bloom audit (highest tag) | §3.7 distribution, curator counts by `level` |

**Added by this pipeline (need a line in RUBRIC v2)**

- **Bridge question.** From the 2nd section on, ≤1 Q per section may draw on an
  earlier section (`bridge_from`). Counts toward N. Answerable from current +
  named earlier section only. → propose RUBRIC §3.8.
- **Shared-setup questions (testlets).** Allowed. Constraint from the app:
  question order isn't guaranteed and options shuffle, so *each Q must repeat
  its setup in its own stem* (≤2 sentences) and stand alone. No elimination
  chains across Qs. → propose RUBRIC §4.6.
- **Concept map as coverage record.** Shipped Q ids → concept ids. Keep
  `curator.json`; it is the Q-matrix-lite.

**Required in the app before the new set ships (B5 dependency)**

- **"I don't know" button.** Decided 2026-09-18. Rationale: the quiz is
  self-diagnosis; a lucky guess hides a real gap from the reader. With IDK in
  place, option count can follow the *content* rather than a guess-rate floor.
  Treat as a blocker for shipping any 2-option Q; a nice-to-have otherwise.

**Deferred to the app track (B5), not this pipeline**

Confidence buttons, keyboard mapping, open/closed-book per Q, pre-read
predictions, sibling items, flag-a-question, lookup logging.

**Siblings get produced here even though they ship there.** The Curator now
banks eligible-but-unshipped candidates in `curator.json.siblings` instead of
burying them among rejects (see its brief). Serving a *different* question on
the same concept after a wrong answer tests whether the reader now understands
it; re-serving the original tests whether they remember the explanation, which
is the weaker measurement. Recording them costs nothing now and is the
difference between B5 having siblings and having to regenerate them.

Two checks B5 will need, neither of which exists and neither of which is
obvious until you try to ship it:

1. **Explanation leakage.** E3 requires every explanation to name a distractor
   and its misreading, so a primary's explanation can hand over its sibling's
   key outright — which makes the sibling useless as a retry. The Curator flags
   this per sibling (`key_disclosed_by_primary_explanation`) because it is the
   only role that sees both.
2. **Level matching.** A retry that jumps from L3 to L5 punishes the reader for
   getting one wrong. Siblings carry `level`; B5 has to honour it.

**Conflicts, with the call taken here**

| Conflict | Call |
|---|---|
| Design doc: 2-option Qs fine. R2: 3–5, default 4. | **Amend R2** (Em, 2026-09-18): default 4; 3 acceptable; **2 allowed only when no third sensible option exists** — a filler option wastes the reader's attention and tests nothing. The further from 4, the stronger the stated reason must be. Generator emits `option_count_reason` for <4; critic verifies the reason; curator flags every 2-option Q for Em. Checker tier 1 minimum → 2. Adversary reports hits against *per-question* chance (1/k), not a flat 25%. |
| Design doc: avoid negations. R13: ≤1/section, marked. | **R13 stands** as cap; generator doc says "last resort". |
| Design doc: real misconceptions, not model-invented. Pipeline: no learner data yet. | D1's `misreads <sentence> as <claim>` form is the mitigation — text-anchored, not free-invented. `misconceptions/` slot exists, empty in v1. Analyst must not present its own misconceptions as observed. |

---

## 9. Open before P1

1. Em: sign off RUBRIC v2 (QUIZ-PLAN phase 1) incl. §3.8/§4.6 above (or strike them) **and the R2 amendment** in §8.
2. EXEMPLARS.md exists (phase 2) — generator needs it.
3. Checker tiers 1–2 exist (phase 3) — critic needs measurements. Tier-1 option minimum is **2**, not 3. Set-level "key is longest" gates (§2.3.1) are computed over 4-option Qs only; 2/3-option Qs are reported separately.
4. Markov's original prompt: fold into generator doc if it arrives; don't wait.
5. IDK button in the app (§8) — not needed for P1–P3, needed before Full ships.
6. `scripts/pipeline.mjs` exists and its `validate` stage schema-checks every
   artifact. Without it nothing guarantees an agent returned well-formed JSON.
7. `runs/baseline/` — the adversary measured on the *current* 40-question file
   with the same toolless `haiku` agent. QUIZ-PLAN's "≥60%" was an API-era
   figure and is not comparable to anything this pipeline produces.
8. `git push` — `main` has been ahead of `origin/main` since the rubric landed.
   The most valuable artifact in the project should not be on one disk while a
   spend runs against it.

### 9.1 The phase-1 sign-off bundle

Four design calls decided after the briefs were written, all pre-P1, all Em's.
They are listed together because they interact and should not be signed off one
at a time:

| | Call | Where | Status |
|---|---|---|---|
| a | **Fixed-frame blocks** — one option set held constant across a block | `docs/FIXED-FRAME-PROPOSAL.md` | proposed; Em: optional where a real taxonomy exists, never forced |
| b | **Generator sharding** — attempts per idea, clustered shards, assigned lens+model | §3.1 | adopted for P1 **as an A/B**, not as a settled design |
| c | **Regeneration pass** — one bounded retry against a reported coverage gap | §3 | adopted |
| d | **Markov's principles** folded into the briefs; his examples refused | `docs/EXEMPLARS.md` §12.5 | done |

Confirmed and deliberately unchanged, recorded so they are not re-opened:

- **The critic already explains itself.** `failed_criteria` + `reasons`, one
  entry per failed criterion prefixed with its id, enforced by its own
  self-check, and emitted *before* `rewrite` in the schema — so the fix is
  generated conditioned on the diagnosis. Complaints of the form "options 2 and
  4 are subsets", "option 3 is filler", "option 1 is much longer" already land
  on named criteria (R14, D3, R8/R9), which makes the reason lines more
  specific than free text, not less.
- **Volume stays at 4N.** Extra candidates are nearly free to write — output
  tokens on a call whose expensive input is already paid — but each one buys a
  full Opus critic call, and the 8th candidate in a call is worse than the 1st
  because the model is straining to differentiate. Extra attempts are better
  bought from another shard, lens or model than from a longer list. P1 measures
  marginal candidate quality; revisit after, not before.
- **Best-of selection stays the Curator's job.** Nothing else selects.
- **No mechanical pre-filter before the critic** (§3).

Handoff for running all of this: `docs/HANDOFF-ORCHESTRATOR.md`.
