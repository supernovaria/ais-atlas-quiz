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
| 2 | Candidates ×4N | **Generator** | `opus` + `fable`, half each (pilot: `sonnet`) | `.claude/agents/quiz-generator.md` |
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
S.md ─┬─► [1] Analyst ──► concept-map.json
      │                        │
      ├────────────────────────┼─► [2] Generator ×2 models ──► candidates.json  (4N, tagged to concept ids)
      │                        │                                    │
      │                        │                    [3] Checker t1–t2 ──► + measurements
      │                        │                                    │
      ├────────────────────────┴────────────────────────────────► [4] Critic ──► verdicts.json
      │                                                             │  rewrite? ──► [3′] re-measure ──► fail again? ──► one more critic pass ──► else reject
      │                                                             │
      │                                             pass / accepted-rewrite ──► [5] Adversary ──► hit flags
      │                                                             │
      └──► concept-map + all above ──────────────────────────────► [6] Curator ──► staging/S.md + review-sheet-S.md
```

Then, once all 6 sections + review block are staged:

```
staging/*.md ──► assemble ch1-capabilities.md ──► [7] Checker all tiers ──► baseline-vs-new table
                                                        │
                                                        └──► [8] Em reads every Q against §9 + review sheet ──► ship
```

**Loops, bounded.**
- Critic rewrite → re-measure → still fails R8/R9/1.6× → *one* second critic pass with the numbers → still fails → `reject`. Never a third.
- Adversary hit on a curator-selected Q → curator swaps for the next-best candidate on the same concept, or under-fills. Adversary is not re-run on rewrites the curator makes (curator makes none — see its doc).
- Set-level gate fails at [7] → fix the *prompts or rubric*, re-run the offending section. Never hand-edit staging (QUIZ-PLAN phase 5).

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
      concept-map.json
      candidates.json             all, both models, with `model` field
      measurements.json           checker t1–t2 per candidate id
      verdicts.json               critic, incl. rewrites + second-pass verdicts
      adversary.json
      curator.json                selection + rationale
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

Handoff for running all of this: `docs/HANDOFF-ORCHESTRATOR.md`.
