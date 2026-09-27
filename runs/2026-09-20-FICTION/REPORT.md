# Fiction control — the generator leaks, and the leak is in the options

> **Read this first.** The first half of this report argues the leak is in the
> **stem**. That hypothesis was then tested and **failed** — see "The follow-up
> test" below. The stem section is kept unedited because it is the reasoning the
> test was built from, not because it is right. The title was changed after the
> follow-up; everything above that section is superseded.

2026-09-20. A reduced run of `docs/FICTION-CONTROL-PROMPT.md`. The interpretation
below was **pre-registered in `run.log` before any result existed**, and is
reproduced here unedited.

## Result

A toolless haiku that has not read the passage — and *cannot* have read it,
because the passage was invented an hour earlier — answered **18 of 24
correctly**.

| set | hit rate | over chance |
|---|---|---|
| chance, 4 options | 25% | — |
| `tier4-control`, **clean** group: fiction, hand-authored, no planted tell | 40% | +0.15 |
| **this run: fiction, written by the pipeline's generator** | **75%** | **+0.50** |
| `forecasting-timelines`, real, post-critic | 78% | +0.53 |
| `defining-and-measuring-agi`, real, post-critic | 100% | +0.75 |

The pre-registered table said: *"meaningfully above 40%, say ≥55% → the generator
itself leaks on content nobody can know. That is a pipeline defect and the
highest-priority finding in the project."* 75% selects that row.

**The honest interval.** 24 trials are **not** 24 independent observations —
they are 8 questions × 3 seed permutations, and the per-question results are
sharply clustered (five at 3/3, one at 0/3). Treating the *question* as the unit,
n = 8, mean 75%, sd 38.8, and the 95% interval is roughly **48% to 100%**. The
lower bound sits above the 40% hand-authored floor but not far above it. So:
the result is comfortably distinguishable from chance, and **only marginally
distinguishable from the hand-authored fiction floor**. The direction is solid;
the magnitude is not.

One asymmetry worth stating, because it runs *against* the pipeline: the 40%
comparator was hand-written to sit inside the R8/R9 bands, so it is if anything
the more polished set. And this run is **pre-critic** — see limits.

## Per question, and the mechanism *(superseded — see the follow-up test)*

| id | idea | hits | what the stem gives away |
|---|---|---|---|
| `w02` | Fen index vs correction load | **3/3** | the stem states "one correction" vs "thirty", both scoring 1.0. "It is a rate, not a count" follows by arithmetic. |
| `w03` | anchor vs lead casting | **3/3** | the stem describes X as loud-but-clumsy and Y as quiet-but-reliable. Matching each to the role named for that strength needs no theory. |
| `w05` | the gloss effect | **3/3** | the stem asks what can be concluded "from this trend alone" and "responsibly". The key opens "Very little on its own." The stem signals the *form* of its own answer. |
| `w07` | non-monotonic troupe size | **3/3** | the stem states the curve peaks at 5–7 and falls at both ends, so "the two declines are different" is already implied by its two-sidedness. |
| `w04` | high rescue rate as a warning | **3/3** | less stem leakage; here the distractors do it. The stem asks which objection "has the most support" and one option says there is no objection to raise. |
| `w06` | halo-fallacy mechanism | 2/3 | partly reconstructible — "an attentional limit, not a character flaw" is a generic charitable-explanation move — but the specific mechanism is passage-only. |
| `w01` | projection/undercraft association | 1/3 | the stem says the summary is wrong but not *how*. The direction (negative, not merely uncorrelated) is a passage fact. |
| `w08` | what Ferrant actually objected to | **0/3** | a passage-specific historical fact, restated nowhere in the stem. Below chance. |

**The pattern holds across all eight, in order.** Hit rate tracks how much of the
key is reconstructible from the premises the stem itself supplies. The two items
whose answers depend on a fact stated only in the passage scored 1/3 and 0/3 —
at or below chance. The five that restate their own premises scored 3/3.

So the tell is not length, hedging, absolutes, or register — the three the
control priced, all of which the checker measures. **It is that the stem carries
the premises from which the key follows.** RUBRIC's cover test asks whether a
reader who understood the section could produce the key. Nothing anywhere asks
the inverse: whether a reader who has *not* read it could. This run says that for
five of eight candidates, they can.

**My pre-registered suspicion was half right.** Before seeing results I recorded
that the non-monotonic "core band" item was the most likely leak site, because
inverse-U is a heuristic a guesser can apply without reading anything. `w07` did
hit 3/3 — but so did four others, so that flag identified a real case and missed
the general mechanism.

## The follow-up test — and my mechanism was wrong

The report above proposed that the leak is in the **stem**: that these questions
carry the premises from which the key follows. It named a cheap test. I ran it.
**The mechanism failed.**

The five leaking stems were rewritten by the generator (I write no question
text) to withhold the premise the key asserts, keeping every option, the key,
the explanation and every other field byte-identical — verified mechanically —
and re-shuffled. All 15 option permutations came out identical to the first arm,
so position is controlled and **the stem is the only thing that differs**.

| question | stem gives it away | premise withheld |
|---|---|---|
| `w02` rate vs count | 3/3 | 3/3 |
| `w04` rescue warning | 3/3 | 3/3 |
| `w05` gloss effect | 3/3 | 3/3 |
| `w07` troupe size | 3/3 | 3/3 |
| `w03` casting | 3/3 | 2/3 |
| **total** | **15/15 (100%)** | **14/15 (93%)** |

One hit lost out of fifteen. Withholding the premises did essentially nothing.
The stem hypothesis fitted all eight questions in the first arm and still
**does not survive its own test**, which is why it was worth running rather than
writing up.

One of the five was not a clean test and I should have caught it before
spawning: `w02`'s distractor B still reads *"Since both performers scored an
identical 1.0…"*, so the fact removed from the stem survived in an option.
That is its own small lesson — a premise cannot be withheld by editing the stem
alone. But the other four were rewritten cleanly and three of them still scored
3/3.

## Where the leak actually is: the options

If the stem barely matters, the option set must be doing the work. So I removed
the stem **entirely** — four options, no question at all, "which is the intended
correct answer?"

**4 of 6 correct (67%)**, against 25% chance, with nothing to answer *about*.

| probe | hit rate |
|---|---|
| whole question (first arm, these 5) | 100% |
| stem premises withheld | 93% |
| **no stem at all, options only** | **67%** |
| chance | 25% |

Deleting the question costs about a third of the excess over chance. The
options keep most of it.

That points at **distractor plausibility**, not stem construction: the wrong
answers are recognisably wrong to someone who knows nothing, so the reader picks
the survivor. It is the same thing the control set found in its one leaking
fabricated item — the option that sounds like what a textbook would say is
identifiable as the intended one.

It also explains why the rubric's machinery does not catch it. Almost every
enforced distractor rule is about **surface**: relative length, hedge density,
absolute quantifiers, grammatical type. The rule that would catch this is D3 —
no straw distractor — which is a judgement the critic makes, and which the
stability run found it applying inconsistently. Several distractors here are
eliminable on sight: in a question asking which objection has the most support,
one option says there is no objection to raise; in a question asking what is
wrong with an explanation, one option says nothing is wrong.

**n = 6 on the options-only probe.** That is small enough that the 67% could
move a lot. The direction is consistent with the arm-B result and with the
control's earlier finding, and all three point the same way, but no single one
of them is decisive. One oddity worth recording rather than smoothing over:
`w08`, which scored 0/3 *with* its stem, was answered correctly from options
alone — at this sample size individual items are noise.

## What I would test next, stated as a question rather than an answer

Do not take "the leak is in the distractors" as established either — it is one
failed hypothesis and one 6-trial probe. The test that would settle it is the
same shape and just as cheap: have the generator rewrite the *distractors* of
these five, keeping stem and key fixed, with the instruction that every wrong
option must be one a careful reader of the passage could actually believe. If
the options-only score falls toward chance, distractor plausibility is the
mechanism. If it does not, neither of my two stories is right.

## Limits, stated at full size

- **This run skipped the critic**, for budget. It therefore measures **generator
  output**, not shipped output, and must not be compared against the two real
  sections in the table above, which are post-critic. Whether critic rewrites
  raise or lower stem leakage is untested and could go either way — the rewrites
  observed elsewhere shorten and balance options, which does not obviously touch
  a stem.
- **n = 8 questions**, one generator call, one model, one passage. A passage that
  happens to be reconstructible moves the whole number.
- **The passage may be imperfectly unguessable.** Its author flagged, and I
  agreed, that the projection/undercraft split is loosely evocative of the
  informal real distinction between stage presence and stagecraft. Every specific
  claim built on it is invented and mostly counterintuitive, but the category
  split itself may feel familiar.
- **The per-question mechanism above is my reading**, formed after seeing the
  scores. It fits all eight in the right order and makes a falsifiable
  prediction, but it was not pre-registered and one run cannot confirm it.

## What follows

1. **Do not change the rubric or the gate on the strength of this run.** Eight
   questions, no critic, one passage.
2. **The obvious next test is cheap and would settle it**: rewrite the five
   leaking stems to withhold their premises — state the scenario without stating
   the relation the key asserts — and re-run the adversary. Same passage, same
   candidates, haiku only. If the hit rate collapses toward 40%, the mechanism is
   confirmed and the fix is a generator rule, not a rubric gate.
3. **A candidate rule for v2, phrased as a proposal only**: the generator's
   `self_check` already carries a `cover_test`. Add its inverse — *"state what a
   reader who has not read the section would have to guess, and why the stem does
   not supply it."* That is checkable by the critic in a way length rules are not.
4. The adversary gate stays **mis-anchored at 1/k**; 40% is the floor for
   hand-authored fiction and this run does not change that.
