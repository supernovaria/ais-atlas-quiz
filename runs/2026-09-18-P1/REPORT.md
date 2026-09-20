# P1 — session C. Four windows, 2026-09-19/20. Pilot run, hardening, second section.

Sessions A and B died at preflight and never ran a stage
(`REPORT-sessions-AB-blocked.md`). Session C got through preflight, ran the
pipeline over four 5-hour windows, and stopped inside the 85–95% band each time.
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

- *"the curator edited text"* on two stems. The curator **had** changed the text,
  but not in the way first reported. **Correction (2026-09-20):** an earlier
  version of this report said straight quotes became "typographic curly quotes".
  That was wrong. A character census shows **zero** typographic characters
  (U+2018/2019/201C/201D) anywhere: the source stem carries only `U+0027`, the
  curator's file carries `U+0022` ×8 plus `U+0027` ×8, and `render`'s output
  carries `U+0027` ×16. The drift was **pure ASCII — straight *single* outer
  quotes became straight *double* outer quotes.** Two consequences: a lint that
  only rejects curly characters would not have caught it, and by the house rule
  *"double for outer, single when nested"* the **curator was right and the
  generator was wrong**. Both are now handled — see *Hardening* below.
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

## Hardening, 2026-09-20 — and two decisions taken

Six changes, each premise checked against the cited line before implementing.
**Two premises turned out to be wrong**, which is the reason for checking.

**Decision 1 — sharding is dropped as the default generation strategy.** Asked
what else it buys, the honest answer is two things, neither decisive: mechanical
enforcement of the analyst's per-idea `attempts` budget, and a smaller blast
radius when a generator call fails (3 candidates lost, not 8). Both are
obtainable by passing the `attempts` budget into a whole-section prompt and
running 2–3 calls. The `shard` stage is **not deleted** — it is not among the six
tasks, the evidence is one section, and removing it would orphan the existing run
artifacts.

**Decision 2 — rewrites keep the `r` suffix and both objects are retained**
(`a01` *and* `a01r`), rather than resolving a rewrite under the original's ID and
overwriting it. `runs/` is an audit trail: overwriting destroys the before/after
that produced this run's finding that all six rewrites clear the joint length
gate. Applied in `merge`, `eligibleIds` and `validateCurator`.

| # | change | effect |
|---|---|---|
| 1 | **`render` stage** — curator emits `curator.json` only; the staged file is built from `candidates.json` by string copy | the curator never retypes text, so it cannot drift it. The stem/option/explanation diff is **deleted from `validate` as unnecessary rather than fixed** |
| 2 | **`merge` stage** — assigns IDs from (shard, index), dies on collision, splits trailing `{note}` objects, promotes rewrites | models are never asked to invent unique IDs. Reproduces exactly the 17 candidates built by hand in P1 |
| 3 | **canonical-ASCII lint** — `CANON-quote`, `CANON-outer`, `CANON-emph` | catches the drift that actually happened, in **13 of 17** real candidates |
| 4 | **emphasis symmetry** — `emphasis_counts` per option, gated with R9's rule shape | emphasis stays *allowed*; being the only emphasised (or only unemphasised) option is the tell |
| 5 | **`validate` severity** — FAIL vs WARN, exit code from FAIL only | on the real P1 data: **0 FAIL / 28 WARN**, where 3 cosmetic alarms used to block |
| 6 | **R13 negation capitals** — tier-2 gate plus a flag cross-check | the script owns the measurement; the candidate's `negation` flag is checked against it both ways |

**Premise correction A — the quote drift was ASCII, not typographic** (detailed
above). The specified lint would have missed it; `CANON-outer` was added.

**Premise correction B — Task 6's regex as specified was too broad.** "Detect
NOT/EXCEPT case-insensitively and fail when uncapitalised" fires on candidate
`d01`, whose stem reads *"comparable to **not** knowing whether something costs
one dollar or a trillion"* — incidental prose, not a negation stem. It would also
fire on "cannot" and "note that". Narrowed to a negation *task* construction: an
interrogative head (which/what/all/each/every) followed within 80 characters by
not/except. `d01` is now clean; *"Which of the following is not true?"* is still
caught.

**Two bugs found in my own test code, both fixed:** the first version of the new
`render` assertion wrote to `staging/forecasting-timelines.md` — the **real**
path — and clobbered the live staged section (restored from git; the test now
snapshots and restores). And the suite left fixtures behind, so a stale
`curator.json` made it fail on its own second run; `selftest` now clears its
directory at start. **Selftest: 40 → 48 assertions, green, and idempotent.**

## Window 4, 2026-09-20 — the second section, and the pilot findings

The remaining scope was `defining-and-measuring-agi`, which had never got past
generation, and `docs/pilot-findings-2026-09-18.md`, which had fallen off the
end of three windows in a row. Both are now done. **The findings document was
run first, deliberately** — it kept being the thing the budget ate.

### What ran

| stage | spawns | model | result |
|---|---|---|---|
| generate (whole-section) | 2 | sonnet | 2 arms × 8 = 16, merged with the 5 existing sharded → 21 |
| merge · dedupe · measure · queue | — | script | 20 survive, 1 collapsed |
| **critique** | 6 attempted, 3 completed | opus | 3 verdicts; 3 calls interrupted |
| re-measure · shuffle | — | script | 3 rewrites, 9 prompts |
| **pilot analyst** | 1 | sonnet | `docs/pilot-findings-2026-09-18.md`, 677 lines |
| **adversary** | 9 | haiku | complete, 0 unparsed, 0 tool uses |
| curate · render · validate | 1 + script | sonnet | 3 shipped of 8; 1 FAIL, 15 WARN |

### The adversary result is the run's headline, and it got worse

A toolless Haiku that has not read the chapter answered **9 of 9 correctly**.

| set | hit rate | over chance | flagged |
|---|---|---|---|
| the 40 questions already shipped | 98.3% | +0.733 | 39/40 |
| `forecasting-timelines`, this pipeline | 77.8% | +0.528 | 4/6 |
| `defining-and-measuring-agi`, this pipeline | **100%** | **+0.750** | 3/3 |

Three separate measurements, and **nothing this pipeline has produced has ever
come near the 0.15 gate**. The second section is worse than the first and worse
than the questions the pipeline was built to replace. On n=3 questions the
point estimate of 100% is soft; what is not soft is the distance from the gate.

### Why that happens — I got this wrong, and here is the correction

**The earlier version of this section claimed the length rules cause the
adversary result. That is incoherent and I withdraw it.** Near-identical option
lengths *remove* the length tell; they cannot manufacture guessability. I
conflated a readability complaint (four options of one shape read as a
worksheet) with a guessability result (the adversary scored 9 of 9) and asserted
a causal link the data does not support.

What the data actually says is more uncomfortable. The three AGI questions are
**clean on every property the checker can measure**:

| tell, and what the control says it is worth | AGI's three questions |
|---|---|
| key is longest (+68 points) | length ratios 0.98 / 1.00 / 0.99; key neither longest nor shortest |
| key hedges more than distractors (+62) | key 0, distractor median 0 — no asymmetry |
| an absolute quantifier in one option (+42) | none present |

Clean on all three, and still answered correctly nine times out of nine.

I tested one hypothesis for what else it could be — that the key is the only
option holding two things in tension ("X is real, *but* Y"). It is strikingly
true as a description: 5 of 6 shipped keys contain such a construction against
2 of 18 distractors, and in all three AGI questions the key is the only one.
But tested against the fabricated control set, where the adversary cannot
possibly know the content, **it shows no signal** — 2 such items hit 50%, the
other 3 hit 33%, and one was missed outright. n=5. Recorded as a rejected
hypothesis, not a finding.

### The floor is 40%, not 25%

`runs/tier4-control/` settles one thing cleanly. On fabricated content the
adversary cannot know, with no planted tell, it still scores **40%**. A
four-option question carries an irreducible ~15-point inference premium over
chance: a reader can tell which option a textbook would call "most dangerous"
without knowing anything. The one fabricated item hit 3/3 is exactly that — its
key is the only option containing a paradox.

So the gate `mean(hit − 1/k) ≤ 0.15` turns out to be a well-chosen *value* on a
**mis-anchored scale**. It is almost exactly "no leakier than an untellable
question", but it is measured against 1/k, which no real question can reach.

### What the adversary result does not yet establish

Two explanations fit the 78–100% on real sections equally well, and nothing
measured so far separates them:

- **the questions leak**, semantically, somewhere outside everything the
  checker measures; or
- **the adversary already knows the material.** Autonomy-versus-capability and
  adaptability-versus-brute-force are standard, heavily rehearsed AI-safety
  doctrine.

The first is a pipeline defect. The second means the gate is measuring the
model's education rather than the pipeline's output. **The existing control
cannot decide it** — its 20 items were hand-written with tells planted
deliberately and never went through the analyst, generator or critic. It
measures what a tell is worth, not what this pipeline produces.

Deciding it needs the full pipeline run on fabricated prose, with the
interpretation pre-registered. That experiment is specified in
[`docs/FICTION-CONTROL-PROMPT.md`](../../docs/FICTION-CONTROL-PROMPT.md) and has
not been run.

### The blandness finding, restated at its actual size

Standing on its own, without the causal claim it was wrapped in: the critic's
rewrites drive option lengths to near-exact parity (0.98, 1.00, 0.99, from
originals where the key was longest every time), and read as a reader, each
shipped question is one syntactic template repeated four times. That is a
**readability and discrimination complaint** — the options stop feeling like
genuinely different answers — and the proposed D9a rule in the pilot findings
addresses it. It is not the explanation for the adversary score, and the two
should not have been joined.

### Two mechanisms finally earned an answer

**Dedupe fired for the first time.** It collapsed `w02` against `x01` — written
by two independent generator calls, both on the same capability-vs-generality
pair, 71% stem overlap. On `forecasting-timelines` it collapsed 0 of 11, because
sharding hands every call a different idea and lens, so the stage could never
fire. Dedupe only earns its place once two calls can see the same idea — which
is precisely what dropping sharding does. **Keep it**, now that sharding is gone.

**The coverage-ordered queue earned its place outright.** The critic budget ran
out after 3 of 20 candidates. Because the queue orders by coverage, those 3
covered 3 *distinct* ideas rather than 3 attempts at one. Under a budget that
always truncates, the ordering is not a nicety — it *is* the coverage policy.

### The hardening held, on a section it had never seen

- `render` output is **byte-identical** to the source: 18 of 18 strings
  (3 stems, 12 options, 3 explanations) copy verbatim, and the quote census of
  the shipped file is `U+0027 × 7` and nothing else. No typographic characters,
  no straight-single-to-straight-double drift. The defect that started the
  hardening pass is gone because no agent transcribes text at all any more.
- The curator honoured its new contract on its first real run: it wrote **no**
  staging file (`git status staging/` stayed clean through the call) and
  returned `flags_for_reviewer` as `{id, note}` objects.
- `validate`'s new severity split did its job: **1 FAIL, 15 WARN**, and the one
  FAIL is real while all 15 warnings are cosmetic. Before window 3 the cosmetic
  ones would have blocked the run.

### But a brief is not a mechanism

The generator brief was amended in window 3 to state the outer-quote rule in as
many words. The generator then broke it on **13 of 21** fresh candidates. The
lint is the only thing that catches it. That is the argument for keeping
WARN-level linting rather than trusting the brief — and it generalises: every
rule this pipeline relies on that lives only in prose should be assumed to hold
about 40% of the time.

### More things agents did that their briefs did not anticipate

- **`quiz-critic` invented an enum value.** Its rewrite of `a03r` set
  `stem_format` to `scenario-application`, which is not one of the six allowed.
  That is the single validate FAIL, on a candidate the curator then selected, so
  **`a03r` must not ship until it is re-run.** The rules say to re-spawn that
  agent once; I did not, because an Opus critic call costs ~14 window points and
  the window was nearly spent. Logged and carried instead.
- **The same critic drifted on text form**: its rewrite `w07r` introduced two
  outer-quote violations of its own.
- Both point the same way. The critic is the only agent that writes question
  text without the generator's text-form and schema sections in front of it.
  That is the gap, and it is a one-paragraph fix to `quiz-critic.md`.
- **`quiz-curator` invented a scope.** Three of its six reviewer flags use the
  literal id `"section"` for findings about the set rather than any one question
  — coverage gaps, the set-level adversary result. `validate` silently tolerated
  them, so a set-level flag is currently **invisible to the checker**. The
  curator is right that such findings exist and have nowhere to go; the schema
  needs an explicit scope field, not a magic id.

### What this section did not get

`defining-and-measuring-agi` ships **3 questions against a target of 8**, and
the shortfall is budget, not quality: 17 of 20 survivors were never critiqued.
They are *uncritiqued, not rejected*. The curator declined to ship unreviewed
material and said so. Uncovered: the section's own headline
capability-vs-generality distinction, which was **queue position 1** and still
never reached. Three completed Opus critic calls cost 42 window points — about
14 each on candidates this long, roughly double the 6.3–7.2 measured on
`forecasting-timelines`. At that price one 5-hour window buys about six critic
calls, and **six critic calls is one under-filled section.** That arithmetic,
not the rubric, is what currently caps this pipeline.

Three of the six critic spawns were interrupted mid-call (`b01`, `a02`, `w03`).
They still burned tokens, which is part of why the per-call cost reads high.

### One number that has now held twice

The joint R8 + R9 + 1.6× gate passed **13 of 20** candidates here (65%) and
**7 of 11** on `forecasting-timelines` (64%). Two sections, two generation
strategies, the same number. RUBRIC §10 claims none of its own five worked
rewrites was inside the band on first draft; the observed rate is about
two-thirds. That claim is worth restating in v2.

### One more silent defect found and closed

The curator's three set-level flags produced **neither FAIL nor WARN** —
`validate` could not resolve the id `"section"`, so it dropped them. A flag the
checker drops reaches no reviewer, which is the same class as the four defects
closed in window 2: plausible output, nothing wrong on the surface, information
quietly gone.

`"section"` and `"set"` are now recognised scopes, and any other unresolvable
flag id produces a WARN. Three selftest assertions cover it.

The planted-defect rule paid for itself inside five minutes: the first version
of my check sat inside the `if (adversary)` block, so it could never fire
without adversary data. The assertion failed and found it. Without that rule the
fix would have shipped looking correct and doing nothing — which is precisely
the defect it was meant to fix.

**Selftest 50 → 53 assertions**, green and idempotent across three consecutive
runs; `check:questions:selftest` still 14/14.

### Where this stopped, and what is still owed

Stopped at **85% of the 5-hour window**. Extra usage read **$6.53 at start and
$6.53 at stop**, unchanged across all four windows — no API or usage credit was
spent at any point.

Deliberately not done, all for budget:

- **The 17 uncritiqued `defining-and-measuring-agi` candidates.** Restarting at
  `queue.json` position 1 (`b01`, the capability-vs-generality pair) is the
  single highest-value next action for that section.
- **Re-spawning the critic on `a03`** to clear its invented-enum FAIL. Until
  that happens `a03r` is in `staging/defining-and-measuring-agi.md` but its
  artifact does not validate, so **the file is not shippable as it stands.**
- P3, the review block, and the four remaining sections — all out of scope and
  gated on you reading the findings, as instructed.

## Recommended next action

**Sharding is now dropped and the six hardening changes are in.** Spend the next
window on the 5 uncritiqued FT candidates plus a full whole-section critic pass,
to get the pass-rate comparison this run could not buy — and on a RUBRIC v2 rule
against four-options-one-template, which is the defect a reader actually
notices.

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
