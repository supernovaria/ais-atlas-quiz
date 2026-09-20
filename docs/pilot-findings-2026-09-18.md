# Pilot findings — P1 / P1b / P2 (2026-09-18/20)

Source runs: `runs/2026-09-18-P1/` (sessions A–C; A and B blocked at preflight,
C is the data), `runs/2026-09-18-P1b/` (sharding A/B), `runs/baseline/` (adversary
on the current 40-question file), `staging/forecasting-timelines.md` +
`staging/review-sheet-forecasting-timelines.md` (what actually shipped from the
pilot). Governing docs assessed: `docs/RUBRIC.md` v1, `docs/PIPELINE.md`,
`.claude/agents/quiz-*.md`.

**Scope actually covered, stated once so it doesn't need repeating per finding:**
`forecasting-timelines` (FT) got the full pipeline — analyst → shard → generate
(11 sharded) → critic pass 1 (6 of 11 judged, budget-truncated) → re-measure →
adversary (18 spawns) → critic pass 2/P2 (same 6, fresh spawns) → curate → staged
3 of target 4. It also got the sharding A/B (P1b: 2 whole-section arms, 16
candidates) and one orchestrator read of the shipped set as a reader.
`defining-and-measuring-agi` (AGI) got analyst → shard (2 of 11 shards) + 2
whole-section arms merged (24 candidates → 20 after dedupe) → critic pass 1
**(3 of 6 attempted judged, 3 interrupted mid-call)** → re-measure. It never
reached adversary or curator. Anything said about AGI below is bounded by that.

---

## 1. What the pilot establishes

1. **The nine-stage script pipeline and all six agent types run end-to-end on
   real data**, but four defects would have produced silently wrong numbers if
   session C hadn't caught them by hand: duplicate candidate IDs collapsed 11
   FT candidates to 3 (`<section>/<model>/NN` has no shard slot, so four sonnet
   shards each numbered from 01); `score` reported the adversary gate as
   `PASS` on zero data when `picks.json` was an array instead of the expected
   `{id#seed: letter}` object; the 3′ re-measure stage couldn't run because
   `measure` filtered to `dedupe.json`'s survivor list, which predates
   rewrites; and `validate` required every `discrimination_pairs` entry to
   co-occur in a shard, which is impossible when one named member
   (`FT-5b`) does not itself `earn_question`. All four are fixed in
   `scripts/pipeline.mjs` and verified against planted defects (run.log
   line 139, selftest 40→48 assertions). This is evidence about the harness,
   not the rubric — recorded because the rest of these findings depend on the
   harness being trustworthy.

2. **Rewrite, not pass or reject, is what RUBRIC v1 actually produces from
   this generator.** Every judged candidate in both sections came back
   `rewrite`: FT pass 1, 6/6 (`a01, a02, a03, b01, c01, c02`); AGI pass 1, 3/3
   (`a03, w04, w07`). **9 of 9 candidates across two sections, two generation
   strategies (sharded and whole-section), and three separate windows.** A
   verdict field that has produced exactly one value in nine trials is not yet
   a verdict — it may still diverge with more data, but nothing in P1 shows it
   would.

3. **The generator over-claims level, and the critic's own level assignment on
   the same candidate is not stable enough to be the correction.** Comparing
   `level_claimed` to the critic's `level`: FT pass 1 downgraded 5 of 6
   (`a01` L4→L3, `a02` L4→L3, `b01` L5→L4, `c01` L4→L2, `c02` L4→L3; only
   `a03` L3→L3 agreed). AGI: `a03` claimed L3, scored L2; `w04` claimed L4,
   scored L3; `w07` claimed L5, scored L5 (agreed). P1b's two independent
   whole-section L5 claims (`sonnet-whole1/03`, `sonnet-whole2/03`) were **both**
   downgraded to L3. Total: 8 of 11 judged instances where the generator's
   claimed level was corrected downward, one upward instability
   (`c01` L2→L4 between P1 and P2, below), two agreements.

4. **R8+R9+1.6× first-draft pass rate is much higher than RUBRIC §10's own
   closing caution implies, and consistent across sections.** FT: 7/11 (64%)
   clear the joint gate unaided. AGI: 13/20 (65%) — "the same number twice,
   from two sections and two generation strategies" (run.log). RUBRIC §10 says
   none of its five worked rewrites cleared the band on first draft; that
   is true of those five examples but is not the generator's typical behavior
   under RUBRIC v1 with a sonnet generator — nearly two-thirds pass unaided.

5. **Rewrites overwhelmingly succeed on the first attempt.** All 6 FT rewrites
   and all 3 AGI rewrites cleared the joint length gate on re-measurement — 9
   of 9. And the *mechanism* by which they clear it is uniform: every AGI
   original that had the key as the longest option produced a rewrite landing
   at len_ratio 0.98–1.00 — not merely inside 0.80–1.20, but driven to almost
   exact parity. This is the direct cause of finding §3's blandness failure,
   below.

6. **Dedupe only fires when two calls can see the same idea, which sharding
   structurally prevents.** FT sharded pool: 0 of 11 collapsed. P1b's two
   independent whole-section arms on FT: 0 of 16 collapsed. AGI's two
   independent whole-section arms (`w`, `x`, merged with 5 sharded survivors,
   21 total): **1 collapsed** — `defining-and-measuring-agi/sonnet/w02`
   against `.../x01`, both a contrast question distinguishing a
   superhuman-narrow system from a broad-85th-percentile system on the
   capability/generality axes, 71% stem content-word overlap, identical
   targets `[DM-4, DM-5]`. Reading both stems side by side, this is a genuine
   duplicate, not a false positive: same scenario shape (narrow-superhuman vs.
   broad-expert), same discrimination pair, different flavor nouns
   ("protein-structure prediction" / "Meridian... protein-folding"). **No false
   positive was found in the one case available to check.** Sample is thin (one
   collapse event total) — see §7.

7. **The coverage-ordered queue worked exactly as designed under real budget
   truncation.** AGI's critic pass 1 was cut to 3 completed calls (3 more
   interrupted mid-call: `b01`, `a02`, `w03`); because `queue.json` orders by
   coverage need, those 3 landed on 3 *distinct* ideas (`DM-6`, `DM-9`, `DM-3`)
   rather than 3 attempts at one. Under a budget that always truncates, the
   ordering is the coverage policy, and it held.

8. **Regeneration and the second-critic-pass mechanisms were never exercised.**
   Regeneration didn't fire because the curator's two `earns_question_uncovered`
   entries (`FT-4`, `FT-1`) both already had clean eligible siblings (`a02r`,
   `c02r`) that lost only to set-level slot competition (the missing-L5 hard
   bound consuming what would have been the 4th slot) — this is the
   "genuinely doesn't need it" case, not the "pass isn't earning its place"
   case, and it is distinguishable in the curator's own reasoning. The second
   critic pass never fired because no rewrite failed re-measurement (finding
   5). **Neither mechanism has been tested even once.**

9. **Sharding lost the one A/B run on every measured axis.** Same section
   (FT — see the deviation note in §7), same model, same rubric: lens-diversity
   entropy 1.98 (sharded) vs. 2.23 (whole); stem-format entropy 2.23 vs. 2.53;
   level-diversity entropy 0.87 vs. 1.37; mean pairwise stem overlap 0.121 vs.
   0.070 (lower is better); joint length gate 7/11 (64%) vs. 15/16 (94%).
   Sharding's assigned-lens structure also anchored level: 9 of 11 sharded
   candidates claimed L4, against a spread of L3/L4/L5 in the whole-section
   arm. The curator could not fill FT's L5 slot from the 11-candidate sharded
   pool; the whole-section arm produced 2 L5 claims, both independently on the
   **objection** lens on the FT-2/FT-4 pair — a lens the shard builder never
   assigned to this section (see §3.4 below on why that's a mechanism finding,
   not a section-analyst finding). Both were subsequently downgraded to L3 on
   critique (finding 3), so whole-section didn't *solve* the L5 gap, it only
   *reached for* it more often. Decision already taken and recorded
   (PIPELINE §9.1, run.log 2026-09-20): sharding dropped as the default
   generation strategy; the `shard` script stage is kept, not deleted, because
   removing it would orphan existing run artifacts.

10. **The adversary's chapter-1 saturation problem, already found in
    `runs/baseline/`, persists at lower but still-failing magnitude on P1's
    pool.** Baseline: mean hit 98.3%, mean(hit−1/k) +0.733 against a ≤0.15
    gate, 39/40 flagged, including the rubric's own named exemplars
    (`Takeoff Q1`, `Chapter Review Q4`, both hit 3/3). FT's P1 pool (the 3
    shipped rewrites + `a02r`): mean hit 77.8%, excess +0.528, 4/6 flagged.
    Still fails the gate by more than 3×, but meaningfully below baseline —
    thin evidence (n=6) that this pipeline's questions are somewhat less
    guessable than the current file, not evidence they clear the gate.

11. **The curator, on its one exercised run, did what its brief asks and
    nothing more.** It shipped 3 of target 4, named the exact blocker
    (`b01r`'s residual R14 word-echo on "uncertainty" — the stem's `twelve
    orders of magnitude of uncertainty` and the key's opening `The uncertainty
    is the finding itself`), declined to promote `a02r` (L4, clean) into the
    empty L5 slot per RUBRIC §3.7's explicit instruction not to waive the
    bound, banked 2 siblings with `key_disclosed_by_primary_explanation`
    correctly set (`true` for `a02r`, `false` for `c02r`), and flagged both
    adversary hits (`a03r` 3/3, `c01r` 3/3) and a lens-diversity shortfall (2
    distinct lenses shipped, target ≥3) as reviewer notes rather than acting on
    them unilaterally. This is n=1 — see §7.

---

## 2. Critic stability

Same 6 FT candidates, two fresh `opus` critic spawns, identical inputs, no
memory of each other (P2 is not judging a rewrite — it re-judges the *original*
candidate object). RUBRIC's own rule: a criterion flipping above 20% is a
rubric-wording problem, not a model problem.

**Verdict:** 0/6 flips, but every verdict in both passes was `rewrite` (finding
1.2) — this is agreement on a constant and tells us nothing about
discrimination.

**Level:** 3/6 flips — `a02` L3→L4, `b01` L4→L5, `c01` L2→L4 (two steps).
Notably, on all three the critic's level moved *toward* the generator's own
claimed level on the second read (`a02` claimed L4 got L3 then L4; `b01`
claimed L5 got L4 then L5; `c01` claimed L4 got L2 then L4) — see the table in
§1 finding 3's source data. Level agreement with the generator is itself
unstable pass-to-pass, which weakens using "does the critic's level agree with
the generator's" as a signal at all until this is resolved.

**Per-criterion flip rate** (denominator = candidates on which the criterion
appeared in *either* pass):

| criterion | occurrences | agree | flip | flip rate | ids |
|---|---|---|---|---|---|
| E3 (explanation names a distractor) | 3 | 1 | 2 | **67%** | agree: `a01`; flip: `a02` (P1 only), `a03` (P2 only) |
| R5 (source-attribution) | 2 | 1 | 1 | **50%** | agree: `a01`; flip: `a03` (P1 only — regex did not fire) |
| R14 (overlap / word-match) | 5 | 3 | 2 | **40%** | agree: `a01`, `a03`, `b01`; flip: `a02` (P1 only), `c02` (P2 only) |
| D1 (provenance) | 3 | 2 | 1 | **33%** | agree: `a02`, `c02`; flip: `c01` (P2 only) |
| D3 (straw) | 3 | 2 | 1 | **33%** | agree: `a02`, `c02`; flip: `c01` (P1 only) |
| R9, D8, E4 | 1 each | 1 | 0 | 0% | `a03` (R9), `b01` (D8, E4) — single observations, not informative either way |
| D9, D12, "L3"* | 1 each | 0 | 1 | 100% | noise on n=1 each, per run.log |

*`c01` pass 1 listed a bare `"L3"` in `failed_criteria`, which is not a
criterion id — the critic wrote its level disagreement into the wrong field.
That's a brief-compliance defect (schema says level goes in `level`), not a
rubric-wording problem, and it is the kind of thing that makes an automated
flip-rate computation noisy on top of the genuine judgment noise.

**Five of eight measured criteria cross RUBRIC's own 20% line: E3, R5, R14,
D1, D3.** Reading the actual pass-1/pass-2 reasons (not just the labels) for
each flip:

- **`a03`, R5, flip.** Pass 1: *"the stem asks 'What does the section's
  decomposition of effective compute show is wrong with this reading?' —
  source-attribution framing... The regex family did not fire only because of
  the possessive... so `r5_matches` is correctly empty and the criterion still
  fails on substance."* Pass 2 doesn't mention R5 at all on the identical
  stem. **This is a rubric-wording problem.** §2.2 calls R5 "regex-checkable,"
  but its own rationale paragraph and the closing "default rewrite: delete the
  attribution clause and check that the question still has a determinate
  answer" instruct a *substantive* test beyond the regex. One fresh critic
  read applies that substantive test; the next doesn't. The rubric gives no
  operational trigger for *when* to invoke it, so whether it fires depends on
  which reading a given call happens to do first.
- **`c01`, D1 and D3, flip.** Pass 1 rejects two distractors on D1 grounds
  (provenance "supports the claim rather than being misread into it"); pass 2
  drops both D1 objections and instead fails D3 + D9 on different distractors,
  and additionally states *"the same stipulation makes the key a restatement
  of a given rather than a transfer... this is L3, not the claimed L4"* — a
  reasoning path pass 1 never took (pass 1 called it a giveaway stem, not a
  level mismatch, then separately wrote `"L3"` where a criterion id belongs).
  Both readings land on real problems with the same candidate; they are
  different real problems. **This looks like a model-thoroughness issue as
  much as a rubric one:** the critic brief instructs "stop at the first hard
  failure only for the verdict; still report every failure you see" (RUBRIC
  §0.2), but neither pass on `c01` reports the union of both passes' findings
  — each stops once it has enough to justify `rewrite`.
- **`a02`, E3, flip (only pass 1).** Pass 1: *"the explanation identifies
  distractors by ordinal... but `no_shuffle` is false... E3 requires naming a
  distractor, which in a shuffled UI means naming it by content."* This is an
  objective, checkable fact about the candidate's explanation text — it did
  not change between passes. Pass 2 doesn't mention it. **This is the clearest
  evidence that the flip is a critic-thoroughness gap, not rubric ambiguity**:
  E3's wording is not vague here, the critic simply didn't check it on the
  second pass because it had already reached `rewrite` via D3/D1.

**Conclusion, split by the rule the brief asks for:** E3 and D1/D3's flips
here are best read as **model problems** (incomplete enumeration, not
ambiguous wording) — propose a critic-brief fix, not a rubric fix. R5's flip
is a **genuine rubric-wording problem** — the rule is written as mechanical in
§2.2's own table but instructs judgment in its body text, with no stated
trigger condition. R14's flip (`a02`, `c02`) is a mix: the *mechanical* half
(`stem_word_singletons`) is checker-computed and cannot flip; the *judgment*
half ("is this a distinctive content word," "does this option entail that
one") is undefined and does flip — a rubric fix (§5, item 3).

---

## 3. The four mechanisms

**1. Sharding — the A/B, decided.** See §1 finding 9. Lost on every measured
axis; the decision to drop it as default is already recorded in
`docs/PIPELINE.md` §9.1 and `run.log`. One caveat this document adds: the A/B
ran on `forecasting-timelines`, not `defining-and-measuring-agi` as originally
specified, for cost reasons (completing both AGI arms would have cost ~42
window-points against ~2 for reusing FT's already-sharded pool). AGI has more
and denser discrimination pairs (RUBRIC §8.4: "at least six of the §3.4
discrimination pairs") than FT, so whether sharding's cost is ever justified on
a section where clustering ideas into shards is harder to get wrong is
**untested**. Given the margin of the FT result (every axis, not a close call),
this is unlikely to reverse the finding, but it is not the same evidence as
running the A/B on the section it was designed to probe.

**2. Regeneration — never fired, and the reason is diagnosable, not a
mystery.** The curator's `earns_question_uncovered` list for FT names `FT-4`
and `FT-1`, and both entries explicitly say a clean eligible candidate already
exists (`a02r`, `c02r`) and was excluded only by set-level slot competition —
not because no candidate could carry the idea. PIPELINE §3's own rationale for
regeneration is "a good idea whose only candidate the critic rejected is
simply lost" — that condition never obtained here. **This is the "genuinely
doesn't need it" case the brief asks to distinguish from "the pass isn't
earning its place," and the curator's own artifact makes the distinction
correctly.** Net: regeneration is unexercised, not proven useless — it simply
never met its trigger condition in this run.

**3. Dedupe — earns its place only once sharding is dropped, and the one
sample available shows it working correctly.** 0/11 under FT's sharded pool,
0/16 across P1b's two whole-section arms on FT, 1/21 (~5%) once AGI merged a
sharded remnant with two whole-section arms. The collapsed pair
(`defining-and-measuring-agi/sonnet/w02` vs. `.../x01`) is a true duplicate on
inspection (§1 finding 6) — reading both stems side by side, they are the same
discrimination question with different scenario nouns. **No false-positive
collapse was found**, but the sample is one event; a single check cannot
establish a false-positive rate, only that this particular collapse was
correct. Run-log's own accounting values it at ~14 window-points of critic
time saved for one collapse — worth it if the false-positive rate stays near
zero, which P1 cannot yet confirm at n=1.

**4. Second critic pass carrying the prior verdict — completely untested.**
Zero rewrites failed re-measurement in either section (9 of 9 succeeded on the
first attempt — §1 finding 5), so the second-pass mechanism, its `preserve` /
`rewrite_changed` hand-off, and the risk PIPELINE §3 names ("repair the
criterion in front of you while re-breaking the one pass 1 fixed") were never
exercised even once. This is the one mechanism with literally zero evidence
either way; **recommend it not be counted as validated going into P3**, and
that P3 deliberately seed at least a few known-hard rewrites (e.g., re-feed
`b01r`'s unresolved R14 tell) so the hand-off gets exercised before Full.

---

## 4. Where RUBRIC v1 is unenforceable

### 4.1 R8 + R9 + 1.6× jointly, and the uniform-blandness failure it produces

**`defining-and-measuring-agi/sonnet/w04`.** R8 fails at len_ratio 1.30; R9
fails with the key 50 characters longer than the second-longest option. The
critic's own diagnosis: *"the key carries the full principle ('a separate,
deployment-time choice, not a property of the system's capability') while
each distractor carries only its own error; the qualification belongs in the
explanation."* The rubric already says this (§2.3, closing note: "The fix is
almost always to move qualifying detail out of the key and into the
explanation, not to pad the distractors") — the rule is correctly stated and
the model still produced the failure, which makes this a **model problem**,
not a rubric problem, for `w04` specifically.

The **rubric** problem is what happens next, mechanically, in every rewrite
that fixes this class of failure. AGI: *"every one of the three originals had
the key as the LONGEST option; every rewrite lands at len_ratio 0.98, 1.00,
0.99 and is neither longest nor shortest"* (run.log). FT: the three shipped
questions read, as a reader and not a checker:

- **Q1** (`forecasting-timelines/sonnet/a03r`) — all four options:
  *"Chip count... **so** growth in one of them raises the total..."* /
  *"...**so** chip count is still the quantity that really matters"* /
  *"...**so** growth in the total can only keep pace..."* /
  *"...**so** the two efficiency factors amount to second-order
  corrections..."* — one template, `<claim>, so <consequence>`, four times.
- **Q2** (`.../a01r`) — all four: *"It checks..."* / *"It applies..."* /
  *"It converts..."* / *"It compounds..."* — one template, `It <verb>s...`,
  four times.
- **Q3** (`.../c01r`) — all four: *"That the other routes are untouched,
  **since**..."* / *"That scaling now meets a hard limit, **since**..."* /
  *"That self-play goes with it, **since**..."* / *"That data now caps
  scaling..., **since**..."* — one template, `That <claim>, since <reason>`,
  four times.

The content genuinely discriminates in all three — these are not weak ideas —
but the prose reads as machine-generated because nothing varies but the noun
phrases. **This is a rubric problem, not a model problem**: RUBRIC §4.4's D9
("all four options must be the same syntactic type") is satisfied by all
three, and *nothing in the rubric prohibits identical structure* — D9 sets a
floor (don't mix noun phrases with full sentences) with no ceiling (don't make
all four the *same* sentence with different nouns). The cheapest way to
satisfy R8/R9's length-parity requirement is to give all four options
identical shape, and RUBRIC v1 has no rule against that. See §5.1 for the
proposed text.

### 4.2 Set-level percentage gates on small sections

FT's staged 3-question set fails §2.3.1's set-level gate: key-is-longest 2/3
(67%) against a ≤35% ceiling, **despite every individual question passing
R8/R9/1.6× on its own** (`a03r`: key not longest; `a01r`: key longest by 2
chars, inside R9's 15-char allowance; `c01r`: key longest by 4 chars, inside
R9). Appendix A's own justification for the 35% threshold is built on N=40
sampling statistics ("standard deviation of the longest-is-key count is 2.74");
at N=3 the gate can only be satisfied at 0 of 3 or, arithmetically, cannot land
inside ≤35% at all except at exactly 0/3 or 1/3 (33%). A section that ships 3
questions and has even one question where the key happens to be longest — which
will happen close to a quarter of the time by chance alone even under perfect
writing — fails a gate that was calibrated for a 40-question population. **This
is a rubric problem**: §2.3.1 does not state a minimum N below which the
percentage gate is suspended, and RUBRIC §8.1 explicitly expects under-filled
sections ("Under-filling is always preferable to filling") — meaning every
under-filled section is guaranteed to be exactly the small-N case where the
set-level gate is statistically meaningless. Confirmed in run.log: *"every
question passes R8/R9/1.6x individually. At n=3 the gate is only satisfiable at
<=1 of 3, so percentage gates are unusable on small sets — which every
under-filled section will be."*

### 4.3 §3.7 "L5 ≥1, always" on a section that could not support one

FT's 11-candidate sharded pool produced zero eligible L5 candidates. The one
candidate that reached for L5 (`b01`, generator-claimed L5, critic-assessed L4)
had a rewrite (`b01r`) that fixed its D8/E4 failures but introduced an
unresolved R14 word-match tell ("uncertainty" appearing in exactly one option,
the key) and was never re-submitted for a third pass (the loop is bounded at
two). The curator, correctly per §3.7's own instruction ("If a section
genuinely cannot support an L5 question, that is evidence the section should
get fewer questions... not that the L5 requirement should be waived"),
under-filled to 3 of 4 rather than promote `a02r` (L4). **This is the rubric
working as designed, not a rubric defect** — §3.7's hard bound produced exactly
the behavior it was written to produce. The finding is about *coverage*, not
about the rule: with only 11 sharded candidates and 3 attempts nominally
allocated to each of FT's two threshold ideas (`FT-2`, `FT-5`), zero reached
L5 cleanly, and the two whole-section attempts that did claim L5 were both
factually flawed (§4.4) rather than merely mechanically flawed. Whether RUBRIC
v1's L5 recipe (Appendix B: *"Someone claims [claim]. Which objection has the
most support?"*) is concrete enough for a `sonnet` generator to execute
reliably is the open question here, not whether the hard bound should be
relaxed.

### 4.4 D3 vs. D12 — can the critic actually apply the plausibility floor?

D12 ("distractor plausibility floor") appeared exactly once across all judged
candidates in either pass (`a03`, pass 1 only: distractor "Nothing is wrong
with the reading" contradicts the stem's own premise). RUBRIC §4.3 itself says
the floor is *"measurable if the app ever collects selection rates; until
then, the reviewer's judgment stands in."* The critic sees one candidate per
call with no distractor-selection data of any kind — it cannot apply D12 as
written even in principle, only as a restatement of D3 (would zero readers
plausibly pick this). The single D12 citation observed folds cleanly into a
D3-shaped argument ("the option contradicts the stem's own presupposition"),
and pass 2's re-read of the same candidate dropped the D12 label entirely and
filed the same underlying objection under R14/D9 instead. **This is a rubric
problem**: D12 as currently written names a criterion the critic has no data
to evaluate against, and its one observed use shows the critic substituting a
different, data-available criterion (D3) for it. Recommend collapsing D12 into
D3's ceiling test until real selection-rate data exists (§5, item 5).

### 4.5 An unexpected finding: the E8/L5 interaction

Not asked for explicitly, but load-bearing: **P1b's `sonnet-whole1/03`** — an
L5 attempt — failed **E8** (explanation true standalone) in a way that
matters more than a mechanical failure would. The critic's finding: *"the key
and the explanation both attach 'roughly twelve orders of magnitude' to the
wrong range. The prose's twelve orders of magnitude is the biological-anchors
compute-requirement span... the 2045 range is 'somewhere in the
2030s-2050s,' i.e. two decades... A reader who gets this wrong and reads the
explanation comes away believing the Atlas's date range spans twelve orders of
magnitude, which is false."* This is exactly the failure mode RUBRIC §1 calls
the worst possible outcome ("A confidently-wrong distractor with a plausible
explanation is worse than no quiz at all"), and it was produced by a generator
*reaching for L5 sophistication* — combining two real durable figures from
different parts of the section into one number. **This is a model problem, not
a rubric problem** (E8 is stated clearly and the critic caught it correctly),
but it is worth a line in the generator brief precisely because it happened on
an L5 attempt, which is the level this pipeline most wants to reach (§6).

---

## 5. Proposed RUBRIC v2 changes

Proposals only — RUBRIC.md was not edited.

1. **Add a syntactic-uniformity ban, as new D9a**, immediately after D9 in
   §4.4:

   > **D9a — No shared four-way template.** If all four options open with the
   > same syntactic frame differing only in their noun phrases or verbs (e.g.
   > all four `<claim>, so <consequence>`; all four `It <verb>s...`; all four
   > `That <claim>, since <reason>`), the set fails D9a regardless of D9's
   > "same type" test. At least two of the four options must differ in
   > opening structure (clause order, sentence type, or connective). D9 sets a
   > floor on parallel grammar; D9a sets a ceiling on identical grammar.

   Evidence: §4.1 above, `forecasting-timelines/sonnet/{a03r,a01r,c01r}`, all
   three of RUBRIC's own targets for "already clean" (they shipped) and all
   three uniform-template.

2. **Add a minimum-N floor to §2.3.1's set-level gates:**

   > Set-level percentage gates in §2.3.1 apply to files/sections of **N ≥ 8**
   > questions. For N < 8, report raw counts only (e.g. "key longest: 2 of 3")
   > and do not fail the set on this basis; a human reviewer judges whether the
   > raw count is a concern. This is a direct consequence of §8.1's own
   > preference for under-filling: any section that ships below N=8 is, by
   > construction, below the sample size the 35%/60%/1.10 thresholds were
   > calibrated against (Appendix A's own justification cites N=40).

   Evidence: §4.2, FT's shipped 3-question set failing key-longest at 67%
   while every question passes R8/R9/1.6× individually.

3. **Split R14 into a mechanical clause and a judgment clause, in §2.5:**

   > **R14a (mechanical, checker-computed).** No content word from the stem
   > that is a `stem_word_singleton` (appears in exactly one option) may be
   > load-bearing to the discrimination — the checker reports the list; the
   > critic must address every entry, not select among them.
   > **R14b (judgment).** Two options *entail* each other (R14's original
   > "no overlapping options" test) only where one option is true whenever
   > the other is, evaluated against the section prose, not against surface
   > wording similarity.

   Evidence: §2, R14 flip rate 40% (`a02`, `c02`) — the flip is entirely in
   which stem-word-singleton the critic treats as "distinctive" and whether it
   calls an overlap an entailment, not in the mechanical list itself (which the
   checker computes identically both times).

4. **Make R5's substantive extension an explicit, separately-flagged
   sub-check, in §2.2:**

   > **R5a — Substantive attribution test, applied whether or not the R5 regex
   > fires.** Delete any clause naming the chapter/text/section as the source
   > of a claim (attribution phrasing the regex may miss, e.g. possessive
   > forms like "the section's decomposition shows"). If the question still
   > has a determinate answer, R5a passes; if not, it fails on substance even
   > with `r5_matches: []`. The critic must state explicitly, every time,
   > whether R5a was checked — not only when it happens to fail.

   Evidence: §2, R5 flip rate 50% (`a03`) — pass 1 applied the substantive test
   unprompted by any explicit rule requiring it every time; pass 2 did not
   apply it at all on an identical candidate.

5. **Collapse D12 into D3's ceiling test until real selection data exists, in
   §4.3:**

   > **D12 (revised).** Until the app collects real selection rates, D12 is
   > not a separately-judged criterion. Fold its intent into D3's ceiling: an
   > option that denies the stem's stated premise, or that no attentive reader
   > would select for a reason distinct from D3's straw test, is a D3 failure,
   > not a D12 one. Retire D12 as an independent `failed_criteria` entry;
   > revisit if/when the app instruments selection rates.

   Evidence: §4.4, D12 cited once in 9 judged candidates, and on re-read the
   same objection was refiled under R14/D9 rather than D12 — the critic itself
   does not treat D12 as distinct from criteria it can actually evaluate.

6. **State explicitly in §3.7 that the L5 hard bound applies to the *shipped
   set*, and add one worked L5 seed per named threshold idea to Appendix B or
   an eventual exemplar file** — not proposing rubric text here since this is
   a calibration gap rather than a wording gap, but flagging it because §4.3
   above shows the *existing* Appendix B recipe ("Someone claims [claim]. Which
   objection has the most support?") was not enough, unaided, to produce a
   clean L5 on FT's two threshold ideas across 11 sharded + 2 whole-section
   attempts, and the two attempts that did reach for it produced a factual
   error (§4.5) rather than a merely-mechanical one.

---

## 6. Brief changes

**`.claude/agents/quiz-generator.md`**

- Add an explicit pre-emission check for R8/R9's most common cause: *"Before
  emitting, check whether the key contains a qualifying clause (a `because`,
  `since`, `which is`, or similar subordinate clause) that no distractor
  carries. If it does, move that clause to the explanation before measuring
  anything."* Evidence: `defining-and-measuring-agi/sonnet/w04`, where the
  critic's own diagnosis is exactly this pattern, and rule 4 of the existing
  brief already says the more general version ("key not the most detailed
  option — move qualifiers to the explanation") without stopping the model
  from doing it anyway.
- Add a fact-check step for L5 attempts specifically: *"An L5 candidate that
  combines two durable figures or claims from different parts of the section
  (e.g., an uncertainty range from one paragraph and a date range from
  another) must re-verify each figure's scope against the concept map's
  `durable_figures`/`volatile` entries before finalizing — do not paraphrase a
  figure's referent from memory."* Evidence: `sonnet-whole1/03` (§4.5),
  which conflated the biological-anchors compute-uncertainty span with the
  arrival-date range, a factual error introduced specifically by reaching for
  L5 sophistication.
- Add the D9a ceiling (if RUBRIC v2 adopts it) as a generator-side self-check
  alongside the existing "Balance the surfaces" step 4, since the failure mode
  is produced at generation/rewrite time, not caught until the critic or a
  human reads the set together.

**`.claude/agents/quiz-critic.md`**

- The brief already says *"stop at the first hard failure only for the
  verdict; still report every failure you see"* (quoting RUBRIC §0.2) and its
  own self-check says *"`reasons` has one entry per failed criterion."*
  Neither prevented `a02`'s E3 finding (ordinal distractor references, an
  objective and unchanging fact about the candidate) from disappearing on a
  fresh pass-2 read. Add a concrete self-check step: *"Before emitting, scan
  §2.1–2.5, §4, and §6 in order one more time against criteria you have **not**
  yet flagged — not just the ones you found first. A `rewrite` verdict reached
  quickly is not a reason to stop enumerating."* Evidence: §2's `a02`/`a03`
  E3 and D12 disappearances.
- Fix the schema-violation instance directly: `c01` pass 1 wrote the string
  `"L3"` into `failed_criteria`, which is not a criterion id and is not the
  field level disagreements belong in (`level` / `level_claimed_by_generator`
  already carry that). Add to the self-check: *"Every entry in
  `failed_criteria` is a rubric criterion id (R/D/E-number). A level
  disagreement is never written here."*
- Note the R5a substantive test (§5, item 4) explicitly in the critic's
  procedure step 1, since RUBRIC's current phrasing leaves it discoverable
  only by reading §2.2's prose closely — evidenced by the fact that one fresh
  read did that and the next fresh read of the identical candidate didn't.

**`.claude/agents/quiz-curator.md`**

- No change proposed from this run's evidence — the one exercised instance
  (`forecasting-timelines`) matched its brief closely: correct siblings/rejects
  split, correct `underfill_reason`, correct refusal to promote, correct
  adversary-flag handling as notes rather than rejections. The
  `flags_for_reviewer` schema mismatch (free-text strings observed here vs.
  the `[{id, note}]` the brief and `validate` expect) was already found and
  fixed in `scripts/pipeline.mjs` during the 2026-09-20 hardening window — no
  outstanding action. Flag for the record: this agent has run exactly once;
  treat its brief as lightly validated, not as validated (§7).

**`.claude/agents/quiz-section-analyst.md`**

- Add a validity constraint on `discrimination_pairs`: *"Both members of a
  `discrimination_pairs` entry must themselves have `earns_question: true`. If
  the pairing is real but one side does not earn its own question, record it
  as a `distractor` disposition on that idea's page and note the pairing in
  the earning idea's `misconceptions` instead — do not name it in
  `discrimination_pairs`."* Evidence: FT's `concept-map.json` named
  `FT-5`/`FT-5b` as a discrimination pair while `FT-5b` does not
  `earn_question`, which made `validate`'s co-occurrence constraint
  impossible to satisfy (now patched on the script side per §1 finding 1, but
  the analyst brief itself gives no reason not to repeat this).
- No change proposed regarding lens-to-idea assignment: the mismatch between
  FT-2's own map note (recommending the `objection` lens) and the shard
  builder never assigning `objection` to a shard containing FT-2 is a
  **shard-construction** issue (`docs/PIPELINE.md` §3.1, a script/orchestrator
  step) rather than an analyst-brief issue — the analyst doesn't assign
  lenses to shards. Recorded here so it isn't lost: if sharding is ever
  revived, the shard builder should be required to honor per-idea lens notes
  from the concept map rather than assigning lenses independently.

**`.claude/agents/quiz-adversary.md`**

- No change proposed. Configuration is deliberately frozen (PIPELINE forbids
  "improving" it) and the pilot reaffirms rather than newly discovers the
  saturation problem already documented in `runs/baseline/README.md`. The one
  new data point — FT's pool at 77.8%/+0.528 vs. baseline's 98.3%/+0.733 — is
  directional and thin (n=6), not a basis for a brief change.

---

## 7. What the pilot does NOT establish

> **Orchestrator's note, added after this document was written.** The analyst
> ran before `defining-and-measuring-agi` reached its adversary, curator and
> render stages, which happened later in the same window. Three bullets below
> are therefore stale, and are left in place rather than rewritten so the
> analyst's own reasoning stays auditable. What has since been observed:
>
> - **AGI did reach the curator and the adversary.** The adversary scored
>   9 of 9 (100% hit, +0.750 over chance, 3/3 flagged) — worse than
>   `forecasting-timelines` and worse than the 40 questions already shipped.
>   The curator shipped 3 of a target 8, citing budget truncation rather than
>   pool quality, and `runs/2026-09-18-P1/defining-and-measuring-agi/` now
>   holds `adversary.json`, `picks.json` and `curator.json`.
> - **The final bullet's alternative explanation is now testable and did not
>   survive.** It suggests `forecasting-timelines` may simply be less publicly
>   rehearsed material rather than structurally less guessable. AGI has now
>   been measured and is *worse*, so the pipeline has no section on which its
>   output approaches the gate.
> - **The blandness read was repeated on AGI's three rewrites.** Same result:
>   `w04r` is four options of `<claim>, because <reason>`; `w07r` is four of
>   "The prediction…"; `a03r` is four of "It…". The reader's-eye confirmation
>   now covers two sections and two generation strategies, not one.
>
> Everything else in this section stands, including the sample-size warnings,
> which the AGI data makes *more* pointed rather than less: its adversary
> figure rests on 3 questions and 9 trials.


- **AGI's curator and adversary behavior are completely unobserved.** The
  section never reached either stage (3 of 6 attempted critic calls
  completed, 3 interrupted; no `curator.json`, no `adversary.json` exist for
  `defining-and-measuring-agi`). Every AGI-specific claim in this document is
  about the analyst, shard/merge, dedupe, measure, queue, and critic-pass-1
  stages only.
- **The critic's pass/reject behavior under RUBRIC v1 is entirely unobserved.**
  9 of 9 judged candidates across both sections returned `rewrite`. Whether
  the critic can ever produce `pass` or `reject` on this pipeline's typical
  output — as opposed to on the planted control set in `runs/tier4-control/`
  — is not established either way.
- **The critic-stability numbers (§2) rest on n=6, and most individual
  criterion flip rates rest on 1–3 occurrences.** "67%" (E3) is 2 of 3; "50%"
  (R5) is 1 of 2; "40%" (R14) is 2 of 5. Treat these as indicative of where to
  look, not as fixed population rates — a run with a different random seed on
  the same 6 candidates could plausibly move any of these by one occurrence,
  which is 17–50 percentage points at this sample size. AGI's candidates were
  never run through a P2 pass at all, so nothing here generalizes across
  sections.
- **Regeneration and the second-critic-pass mechanisms have zero exercised
  instances** (§3). Nothing is established about whether they work, only that
  their trigger conditions did not occur in this run.
- **The sharding A/B ran on one section only, and not the section it was
  assigned to.** FT substituted for AGI for cost reasons (§3.1). Whether the
  result generalizes to a denser, more-discrimination-pair-heavy section is
  untested, though the margin of the FT result makes a reversal unlikely.
- **Dedupe's false-positive rate is not established.** One true-positive
  collapse was checked by hand and confirmed correct; this says nothing about
  whether some future collapse will incorrectly destroy two genuinely
  different candidates before a critic sees either.
- **The curator has run exactly once.** Every positive statement about its
  behavior in §1 finding 11 is a single demonstrated instance, not a rate. In
  particular, its handling of adversary flags, sibling banking, and
  `underfill_reason` writing have not been observed on a section large enough
  to exercise §3.7's full distribution table (FT shipped 3 questions; the
  review-block table, L2/L3/L4/L5 interactions at N≈8–10, and R11's
  once-per-section durable-figure budget were never all live at once).
- **The uniform-blandness qualitative read (§4.1) covers 3 questions in one
  section.** The *mechanism* (rewrites driving length ratios to near-exact
  parity) is confirmed in both sections' measurement logs, but the
  reader's-eye confirmation that this produces visibly identical sentence
  templates was only performed on FT's shipped set, not on AGI's three
  rewrites (`a03`, `w04`, `w07`) or on P1b's whole-section arm.
- **Cost and timing figures are drawn from budget-truncated windows**, not a
  full run. The "opus critic is the entire cost of this pipeline" conclusion
  rests on roughly 9 completed critic calls (6 FT + 3 AGI) plus a handful of
  interrupted ones, not a production-scale sample; per-call cost also varied
  by roughly 2× between sections (6.3–7.2 points on FT vs. ~14 on AGI, per
  run.log), attributed to candidate length but not independently confirmed.
- **The adversary's improvement on P1's pool vs. baseline (finding 10) is not
  evidence the pipeline's candidates are structurally less guessable** — it
  is equally consistent with FT's material being less publicly rehearsed
  AI-safety content than the sections (Takeoff, Current Capabilities) that
  saturated the baseline hardest. This was not tested against AGI's material,
  which never reached the adversary.

---

## 8. Go / no-go for P3

**Go**, conditional on treating §3 items 2 and 4 (regeneration, second-critic
pass) and the AGI-stage gaps in §7 as open, not closed. Nothing found here
blocks proceeding to a same-scope production-model run: the harness defects
are fixed and verified (§1.1), the sharding question is answered and the
simpler shape is already the default (§1.9, §3.1), and the two clearest rubric
gaps — the uniform-blandness failure (§4.1) and small-N set-level gates
(§4.2) — have concrete, low-risk proposed text (§5.1, §5.2) that can land
before P3 without changing what P3 is trying to measure. The one recommendation
that should gate *how* P3 is run rather than *whether*: deliberately exercise
the second-critic-pass hand-off at least once (e.g. re-submit `b01r`'s
unresolved R14 tell) and complete AGI through curation, since P3's value as a
"diff vs. P1 by hand" comparison (PIPELINE §5) is weaker wherever P1 itself
never reached a stage.
