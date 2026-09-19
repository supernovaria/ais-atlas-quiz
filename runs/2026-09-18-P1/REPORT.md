# P1 — session C, 2026-09-19. Two windows. Stopped at 86%.

Sessions A and B died at preflight and never ran a stage
(`REPORT-sessions-AB-blocked.md`). Session C got through preflight, ran the
pipeline over two 5-hour windows, and stopped inside the 85–95% band both times.
**No API or usage credit was spent: extra-usage read $6.53 at start and $6.53 at
stop.** Plain-English key to the codes is at the bottom.

## What ran

| stage | spawns | model | result |
|---|---|---|---|
| preflight | 8 | all three | green; one check found broken (below) |
| analyse | 2 | sonnet | both concept maps validate |
| shard · dedupe · measure · queue | — | script | FT 4 shards/11 candidates |
| generate (sharded) | 6 | sonnet | FT complete; AGI 2 of 11 shards |
| **critique P1** | 6 | opus | 6 of 11 FT candidates |
| re-measure (3′) · shuffle | — | script | 6 rewrites, 18 prompts |
| **adversary** | 18 | haiku | complete, 0 unparsed |
| score | — | script | mean hit 78% |
| **critique P2 (stability)** | 6 | opus | same 6 candidates, fresh spawns |
| **curate** | 1 | sonnet | 3 of 4 shipped + staging + review sheet |
| **P1b generate (whole-section)** | 2 | sonnet | 16 candidates, both arms |
| **P1b critique** | 2 | opus | the two L5 claims |
| checker on staging | — | script | **set-level FAIL** (below) |

53 spawns. **Not run:** the 5 remaining FT critic calls, the AGI section,
regeneration, the pilot analyst.

## Answers to what you actually wanted to know

### 1. Does the machinery hold end to end? Yes — but it fails silently.

All nine script stages and all six agent types ran on real data; every agent
artifact validated first time. But **four defects found, all of which produced
plausible wrong numbers rather than errors**, now fixed and each verified to fire
on a planted defect:

- **Duplicate candidate ids silently collapsed 11 candidates to 3.** The
  generator's id template `<section>/<model>/NN` has no shard slot, so four
  sonnet shards each numbered from 01. Measurements are keyed by id. `measure`
  now dies on duplicates.
- **`score` reported the adversary gate as PASS on zero data** when `picks.json`
  was an array rather than an `{"<id>#<seed>": letter}` object. A green light
  from malformed input is the worst failure this script can have. Now refused,
  and `gate_excess_pass` is `null`, not `true`, when nothing was scored.
- **The flow's 3′ "re-measure rewrites" step could not be run.** `measure`
  filtered to `dedupe.json`, which predates rewrites — and `dedupe` must *not*
  be re-run, because a rewrite shares its original's targets and stem and would
  be collapsed against the candidate it replaces. `measure` now admits anything
  carrying `rewrite_of`.
- **`validate` demanded the impossible.** It required every discrimination pair
  to co-occur in a shard, but shards are built only from earns-question ideas,
  so a pair naming a non-earning member (`FT-5`/`FT-5b`) could never validate.
  Now enforced only when both members earn a question.

**And `validate` errs loudly the other way on curator artifacts — three false
alarms, all investigated, none real:**

- *"the curator edited text"* on two stems. It did not: the stems are
  byte-identical **once quote style is normalised**. The curator converted
  straight quotes to typographic curly quotes when rendering markdown. That is
  still technically a text edit its brief forbids, but `validate` cannot tell
  "changed a quote mark" from "rewrote the stem" — it reports both identically,
  so the one alarm that would matter is buried in noise.
- *"shipped `c01r` is adversary-flagged but not named in `flags_for_reviewer`"*.
  It is named — the curator's third flag reads "Adversary flags on shipped
  questions: Q1 (a03r) hit 3/3 seeds; Q3 (c01r) hit 3/3 seeds." The flags are
  free-text prose, and `validate` looks for a structured `id` field, so it
  missed them.
- the impossible discrimination-pair rule, above.

The curator in fact behaved well: 8 substantive flags, including the adversary
hits, the missing-L5 bound, a lens-diversity shortfall, and the fact that all
three shipped keys sit at position A in the source data.

**Also: the adversary toollessness preflight check is broken.** Asked to list its
tools it named four — *bash, PowerShell, read_file, write_file* — none of which
are this harness's real tool names. It was confabulating. Session B got a clean
answer from an identical config, so the self-report test is unreliable in **both**
directions. I planted a file with a random string and asked it to read it:
`NO-FILE-ACCESS`, `tool_uses: 0`. **Isolation holds and the metric is valid, but
HANDOFF §1 should replace "ask it to list its tools" with that canary test.**

### 2. Does sharding beat whole-section generation? No — it lost on every axis.

Same section, same model, same rubric. Sharded = 4 shards with assigned lenses;
whole-section = 2 calls × 2N, generator chooses everything (PIPELINE §3.1's old
shape). **Deviation, flagged:** the prompt specified this A/B on
`defining-and-measuring-agi`, but that section was only 2 of 11 shards generated
and completing both arms there cost ~42 window-points. `forecasting-timelines`
was already fully sharded, so the A/B ran there for **2 generator calls instead
of 11**, answering the same question.

| | sharded (n=11) | whole-section (n=16) |
|---|---|---|
| lens diversity (entropy) | 1.98 | **2.23** |
| stem-format diversity | 2.23 | **2.53** |
| level diversity | 0.87 | **1.37** |
| mean pairwise stem overlap (lower = more diverse) | 0.121 | **0.070** |
| idea coverage | all 5, uneven (3,3,3,2,1) | all 5, even (4,4,4,4,2) |
| clears R8+R9+1.6× first draft | 7/11 (64%) | **15/16 (94%)** |
| duplicates collapsed by dedupe | 0 | 0 |

**Sharding is the more complex design and it produced the less diverse pool on
every measure**, including the two it exists to improve. Its assigned-lens
structure also *anchored* level: 9 of 11 sharded candidates claimed L4, against a
spread of L3/L4/L5 whole-section.

The sharpest single finding: the curator could not fill its 4th slot because
**no L5 candidate existed anywhere in the sharded pool**. The whole-section arm
produced two, and both independently chose the **objection** lens on the
FT-2/FT-4 pair — a lens the shard builder never assigned for this section. The
shard design silently excluded the lens that reaches the hardest level.

**Caveat, and it matters:** I critiqued those two L5 candidates and **both were
downgraded to L3** (E8/R14/D3 and R14/D1/D3/D8/D9/E4). So whole-section did *not*
actually solve the L5 gap — it only claimed to. Level over-claiming is a
generator-wide problem, not a sharding artifact. Whole-section wins on diversity
and mechanics; it does not win on reaching L5. Critic pass-rate comparison across
the full pools was not bought (n=2 is not a pass rate).

### 3. Is the critic stable? The verdict is; the reasons are not.

Same 6 candidates, fresh spawns, identical inputs.

- **Verdict flips: 0 of 6.** But every verdict in both passes was `rewrite`, so
  there was no variance to measure. **Do not read this as 100% stability** — it
  is stability on a constant.
- **Level flips: 3 of 6.** `a02` L3→L4, `b01` L4→L5, `c01` **L2→L4** (two steps).
- **Criterion flip rates, against your >20% threshold:**

| criterion | agreed | only pass 1 | only pass 2 | flip |
|---|---|---|---|---|
| R14 overlapping options | 3 | 1 | 1 | **40%** |
| E3 explanation names a distractor | 1 | 1 | 1 | **67%** |
| D1 provenance | 2 | 1 | 0 | **33%** |
| D3 straw distractor | 2 | 0 | 1 | **33%** |
| R5 "according to the…" | 1 | 1 | 0 | **50%** |
| R9, D8, E4 | 1 each | 0 | 0 | 0% |

D9, D12 and L3 flipped 100% but on one observation each — noise, not signal.
**The critic reliably knows a question is wrong and unreliably knows why.** On
your own rule that is a rubric-wording problem in R14, E3, D1, D3 and R5. n=6,
so treat magnitudes as indicative.

### 4. Do the four mechanisms earn their place?

- **Dedupe: no.** 0 collapsed of 11 sharded *and* 0 of 16 whole-section. It cost
  nothing, but it saved nothing either, in either arm.
- **Coverage-ordered queue: yes**, cheaply — and it paid off exactly as designed
  when the run was cut short: the 6 candidates that got critiqued were the
  high-coverage ones, and the 5 casualties were the lowest-value.
- **Regeneration: never triggered** (the curator reported no uncovered idea it
  could act on).
- **Passing the prior verdict into pass 2: never exercised** — no rewrite failed
  re-measurement, so no second pass was invoked. Untested.

### 5. Where is the rubric unenforceable? And yes, the blandness failure happened.

**64% of first drafts cleared the joint R8+R9+1.6× gate unaided** (94% in the
whole-section arm). RUBRIC §10's closing caution says *none* of its own five
rewrites was inside the band on first draft. That claim no longer holds, which
weakens the stated case for "no mechanical pre-filter" — though the rule is still
right for other reasons.

**I read the three shipped questions as a reader, and the uniform-blandness
failure is present in a specific, nameable form: every option set is one
syntactic template repeated four times.**

- Q1 — all four options are `<claim>, so <consequence>`.
- Q2 — all four begin `It <verbs>…` with the same subordinate shape.
- Q3 — all four are `That <claim>, since <reason>`.

The *content* genuinely discriminates (these are not bad questions; the
distractors are real misreadings), but the *prose* reads as machine-generated
because nothing varies but the noun phrases. **The length rules actively cause
this**: the cheapest way to make four options equal-length is to give them equal
shape, and nothing in the rubric gates syntactic uniformity. This is the clearest
candidate for a RUBRIC v2 rule.

**The staged set also fails a set-level gate:** key-is-longest 2 of 3 (67%)
against a ≤35% gate, despite every question passing R8/R9/1.6× individually. Note
that at n=3 the gate is only satisfiable at ≤1 of 3 — **percentage gates are
unusable on small sets**, which every under-filled section will be. Not
hand-fixed, per the rules; it is a prompt/rubric fix plus a re-run.

### 6. Is the rubric enough without exemplars? No — level calibration needs them.

The generator over-claimed level on **5 of 6** sharded candidates and on **2 of 2**
whole-section L5 claims (both L5→L3). It cannot tell L3 from L5 from the rubric's
prose description alone, and the critic's own level assignment flips 3 of 6, so
the rubric's level ladder is underspecified for *both* roles. R14 (overlapping
options) failing 4 of 6 is the second candidate. **If one exemplar set is built,
build it for level calibration**, from questions that actually cleared the rubric.

## Things agents did that their briefs did not anticipate

- **The curator refused to hand-edit and said so.** It under-filled to 3 of 4,
  named the exact blocker (`b01r` has an R14 word-echo: the stem's distinctive
  word "uncertainty" appears in exactly one option, the key), cited RUBRIC §3.7
  on not waiving the L5 requirement, and offered the text edit as a
  recommendation for you rather than making it. Exactly right.
- **Two generators wrote 2 candidates for a 3-idea shard** (`forecasting-timelines-b`,
  `defining-and-measuring-agi-b`), folding a discrimination pair into one
  contrast question and explaining why in the trailing note. Brief-compliant good
  judgment, but it makes pool size smaller than `sum(attempts)` implies, which the
  shard arithmetic does not expect.
- Every generator emitted a trailing `{"note": …}` object, as allowed. A naive
  merge counts these as candidates; kept in `generator-notes.json`.
- Adversary returned **18 of 18 bare letters** — none of the baseline run's
  deviations recurred.

## Cost

The `~$25` ceiling was unmeasurable: on this Team plan spend lands on plan quota,
and the dollar counter never moved. Measured burn on the 5-hour window:

| call type | per call |
|---|---|
| **opus critic** | **~6.3–7.2 points** |
| sonnet analyst / generator / curator | ~3.8 points |
| haiku adversary | ~0.5 points |

**The Opus critic is the entire cost of this pipeline.** A full two-section
P1+P1b+P2 does not fit in one 5-hour window.

## Recommended next action

**Drop sharding, or justify it on something other than diversity** — it lost the
A/B on every measured axis and cost more complexity. Then spend a window on: the
5 uncritiqued FT candidates plus a full whole-section critic pass, to get the
pass-rate comparison this run could not buy; and a RUBRIC v2 rule against
four-options-one-template, which is the defect a reader actually notices.

Three decisions are yours: whether Appendix A is renormalised to LF; whether
set-level percentage gates get a minimum-n floor; and whether the adversary keeps
its current model now that this run (+0.528) and session B's control (40% floor)
have both quantified what it measures.

---

### Plain-English key to the codes

| code | means |
|---|---|
| **R5 / E5** | the phrase "according to the chapter" appears — tests reading, not understanding |
| **R8** | key and distractors should be similar lengths (ratio 0.8–1.2) |
| **R9** | the key must not be the obviously longest or shortest option |
| **1.6× spread** | longest option no more than 1.6× the shortest |
| **R11 / R13 / R14** | one durable figure per section / ≤1 negation / **options must not overlap** |
| **D1** | each wrong option must trace to a real sentence a reader could misread |
| **D3** | no "straw" distractor nobody would pick |
| **D8 / D9 / D10 / D12** | distractor craft rules (D10 = wrong options hedge more than the key) |
| **E3 / E4 / E8** | explanation must name a wrong option / cite its section / be true standalone |
| **L0–L5** | difficulty ladder: L0–L2 recall/definition, L3–L5 apply/transfer |
| **N / 4N** | target questions per section / the ~4× candidate pool |
| **lens** | the angle a question is written from — misconception, contrast, case, figure, objection |
| **shard** | ~3 clustered ideas + one assigned lens, given to one generator call |
| **P1 / P1b / P2 / P3** | cheap pilot / sharding A/B / critic-stability re-run / production-model run |
| **tier 4 / adversary** | can a reader who never read the chapter still guess it? |
