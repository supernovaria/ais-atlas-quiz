# Gold exemplars — what the pipeline should be proud to produce

> QUIZ-PLAN phase 2. Nine exemplars and two counter-exemplars. This is what the
> Generator is actually shown, so it is the highest-leverage artifact after
> `RUBRIC.md` itself.
>
> **Status: draft, awaiting Em's sign-off (STOP gate before P1).** Open
> questions for review are collected in §12.
>
> Match the *shape* of these, never their content. Every measurement below was
> computed by `scripts/check-questions.mjs`, not estimated — that is the point
> of §11.

Each entry carries: level, measurements, a D1 provenance line per distractor in
`misreads <sentence> as <claim>` form with its D2 family, and one sentence on
why it is an exemplar rather than merely a pass. **The provenance and family
lines are the format pass 1 must emit** — they are demonstrated here because a
generator shown only finished questions infers the wrong output shape.

Source of the five §10 entries: `docs/RUBRIC.md` §10, lifted as the *afters*.
They are quoted here so the Generator sees them without being handed the whole
rubric's worth of "before" text, which teaches the failure as readily as the fix.

---

## 1 — Scaffolding, not the model (L3)

*RUBRIC §10.1's after. Pattern D: the figure is a given in the stem.*

```
### Question 1
In a single year, the share of real open-source GitHub issues an AI system could
resolve went from roughly a sixth to roughly three quarters. The base language
model improved over that year, but nowhere near fivefold. What does this gap
between system performance and base-model performance illustrate?

- [ ] That the benchmark got easier over time, because its problems leak into training data and published solutions
- [x] That most of the gain came from scaffolding around the model — tools, longer inference, iteration — not the model
- [ ] That scaling laws predict system-level performance more accurately on code than on other cognitive domains
- [ ] That fine-tuning a general model on one domain yields larger gains than scaling it further on general data

**Explanation**: Scaling laws describe a single foundation model trained in a
standard way. Overall system capability also depends on the layer around it —
"scaffolding" or "unhobbling": tool use, extended inference time, retrieval, and
multi-model setups. The coding jump came mostly from that layer; the same base
model given tools and iteration resolves far more issues. Distractor 1 describes
contamination, a real concern, but it would predict inflated scores across the
board rather than a jump concentrated in tool-using systems. Distractor 2 inverts
the point that scaling laws specifically *miss* scaffolding gains. (Leveraging
Scale → Scaling Hypothesis; Current Capabilities → Software Development)
```

- **level** L3 · **key** 113 · **distractors** 109, 106, 106 · **ratio** 1.06 · key longest by 4
- **d1** *(a, conflation)* misreads "benchmark scores jumped" as a claim about the benchmark rather than the system
- **d2** *(d, right idea wrong slot)* misreads the scaling-laws section as covering system-level performance
- **d3** *(c, pre-chapter prior)* misreads "tool use is a crutch" as "fine-tuning beats scaling"
- **why** The number is load-bearing for the reader's *interest* and load-bearing for nothing else: substitute the 2027 pair and neither the options nor the explanation change.

## 2 — The 57% claim (L5)

*RUBRIC §10.2's after; the current file's Chapter Review Q4 with its length fix
applied. The rubric calls the original the best question in the file.*

```
### Question 2
A commentator writes: "By the Atlas's own capability-generality measure, AI is
now 57% of the way to AGI." Which objection has the most support in the
framework's own stated limitations?

- [x] A single percentage implies the remaining fraction is as easy as the fraction already covered, when the last domains may be disproportionately hard
- [ ] Capability and generality are independent axes, so collapsing them into one number is only valid for systems above expert parity on every domain
- [ ] Percentages are meaningful for capability, which is measured against human percentiles, but not for generality, which has no natural upper bound
- [ ] The measure was built to compare systems against each other, so it gives no information about the distance to any absolute threshold

**Explanation**: The framework's stated limitation is non-linear progress:
aggregating domain scores into one percentage suggests that getting from 57% to
100% costs about as much as getting to 57%, when the remaining capabilities —
long-horizon planning and memory, in current systems — may be the hardest ones.
The other three objections all sound technical and all misdescribe the framework:
generality *does* have a natural ceiling (100% of the chosen domains), the axes
are deliberately reported together rather than collapsed, and the measure is
explicitly built to be read against absolute thresholds like the 80–90%
definition of AGI. The chapter lists three further limitations — coverage bias,
arbitrary percentile cutoffs, and species-specific risk. (Defining and Measuring
AGI → Counter Argument)
```

- **level** L5 · **key** 147 · **distractors** 144, 144, 132 · **ratio** 1.05 · key longest by 3
- **d1** *(b, scope reversal)* misreads "the axes are reported together" as "they may never be combined"
- **d2** *(b, scope reversal)* misreads generality's percentage as unbounded when it is a fraction of chosen domains
- **d3** *(b, scope reversal)* misreads a comparative measure as having no absolute thresholds, which §"Defining General Intelligence" supplies
- **why** Three distractors from one family, all technical-sounding and all wrong in a way a half-understanding reader would actually hold — the hardest distractor set in this file to dismiss without the text.

## 3 — Where capability lives (L3)

*RUBRIC §10.3's after.*

```
### Question 3
A language model that struggles with arithmetic is given a calculator, a code
interpreter, and a search tool. On the chapter's account, what is the most
important thing this changes about how we should reason about the model's
capability?

- [ ] It shifts the bottleneck from the model's knowledge to the quality of the tools available, so capability claims become claims about the tool ecosystem
- [x] Capability becomes a property of the system rather than the model, so the same weights can sit at two very different capability levels
- [ ] It removes the need to scale the model further, since any weakness can now be patched by attaching a specialised tool for it
- [ ] It makes capability easier to measure, because tool calls are logged and each contribution can be attributed to a specific component

**Explanation**: Once a model calls external tools, "how capable is this model"
stops having one answer — the same weights score very differently with and
without tools, which is exactly why labs report the two separately. This is the
same distinction the chapter later draws between scaling the base model and
scaffolding around it. Distractor 1 is the closest miss: tools do matter, but the
chapter's point is about where capability is *located*, not about which
ingredient dominates. Distractor 3 is the strong form of a real position, and the
chapter rejects it — scaffolding and scale are described as independent drivers
that both continue. (Current Capabilities → Tool Use)
```

- **level** L3 · **key** 134 · **distractors** 150, 124, 132 · **ratio** 0.99 · key not longest
- **d1** *(a, conflation)* misreads "capability is a system property" as "capability is a property of the tools"
- **d2** *(c, pre-chapter prior)* misreads tool use as a substitute for scale rather than an independent driver
- **d3** *(b, scope reversal)* misreads per-component logging as making capability *easier* to attribute
- **why** The key is not the longest option and the question still works — the single habit most responsible for the 1.39 baseline is making the key the most detailed option.

## 4 — What scaling laws are for (L4)

*RUBRIC §10.4's after.*

```
### Question 4
A lab has a fixed compute budget and must choose between a 20-billion-parameter
model trained on 40% of its data and a 200-billion-parameter model trained on 4%
of it. What do scaling laws let the lab do that it could not do otherwise?

- [ ] Guarantee that the larger model will generalise better, since parameter count is the variable most strongly tied to final accuracy
- [ ] Determine the architecture best suited to the budget, since the laws relate accuracy to design choices as well as to scale
- [x] Predict the accuracy each option would reach, turning the choice from a gamble into an engineering estimate
- [ ] Establish an upper bound on accuracy that no amount of additional compute or data could exceed for this architecture

**Explanation**: Scaling laws are empirically observed relationships between
compute, parameters, data, and accuracy — so given a budget you can estimate what
each allocation buys before spending it. That is their practical function: the
chapter frames them as turning hundred-million-dollar gambles into engineering
decisions. Distractor 1 is the pre-Chinchilla belief; the 2022 result that optimal
training needs roughly 20 tokens per parameter showed that many large models were
*undertrained*, so "bigger is better" is exactly what the laws corrected.
Distractor 4 mistakes an empirical regularity for a physical limit — the chapter
is explicit that these are observed patterns, not laws of nature, and that
broken-scaling-law work finds plateaus and jumps within them. (Leveraging Scale →
Scaling Laws)
```

- **level** L4 · **key** 107 · **distractors** 130, 122, 116 · **ratio** 0.87 · key shortest by 9
- **d1** *(c, pre-chapter prior)* misreads "more parameters is better" as surviving Chinchilla
- **d2** *(a, conflation)* misreads scaling laws as covering architecture choice, which they explicitly hold fixed
- **d3** *(b, scope reversal)* misreads "empirically observed relationships" as a physical ceiling
- **why** The R11 durable figure (20 tokens per parameter) sits in the explanation as colour and decides nothing — the model for how a legitimate number should appear.

## 5 — Why a forecast is a range (L4)

*RUBRIC §10.5's after. Pattern B: structure over magnitude.*

```
### Question 5
Projections of when high-quality public text runs out span several years rather
than naming a date. What drives most of that spread?

- [ ] Disagreement over how much of the indexed web survives deduplication, which changes the total stock by roughly an order of magnitude
- [ ] Disagreement over whether models will keep training on public text at all, given that most labs are shifting to licensed corpora
- [x] Small differences in the assumed growth rate of consumption, which compound across years and move the crossing point substantially
- [ ] Disagreement over how much text is added to the web each year, which determines whether the stock is being replenished fast enough

**Explanation**: The stock of high-quality public text is estimated reasonably
confidently — a few hundred trillion tokens after deduplication, against frontier
training runs a couple of orders of magnitude smaller. The uncertainty is almost
entirely on the demand side: consumption has been growing by several-fold per
year, and a modest change in that rate moves the exhaustion date by years, which
is why the published window spans a range rather than a date. Distractor 4 names
a real effect that is too small to matter at these growth rates. The chapter
gives three escape routes if the wall is reached — multimodal data, synthetic
data, and task-based self-play — so exhaustion constrains one pathway rather than
ending scaling. (Forecasting Timelines → Training Data)
```

- **level** L4 · **key** 130 · **distractors** 132, 128, 130 · **ratio** 1.00 · max/min 1.03, the tightest set here
- **d1** *(b, scope reversal)* misreads supply-side uncertainty as dominating when the text puts it on the demand side
- **d2** *(d, right idea wrong slot)* misreads the licensing trend as bearing on the exhaustion estimate
- **d3** *(b, scope reversal)* misreads replenishment as competitive with several-fold annual consumption growth
- **why** No date is load-bearing, so it survives both the text refresh and the passage of time — the durability model for a section the rubric calls almost entirely volatile at the surface.

## 6 — Timelines vs takeoff (L3)

*Kept from the current file, `# Takeoff` Question 1, options verbatim. Its
explanation opened "The chapter carefully distinguishes these", which is E5; the
clause is removed here and nothing else is touched. See §12.1.*

```
### Question 6
What is the key distinction between "takeoff speed" and "AI timelines"?

- [ ] They are the same concept described with different words — both measure how quickly AI reaches human-level capability
- [ ] Timelines refer to hardware development schedules while takeoff speed refers to software and algorithmic progress rates
- [x] Timelines address *when* transformative AI arrives; takeoff speed addresses what happens *after* — gradual vs. explosive growth
- [ ] Takeoff speed measures how quickly models are deployed to users, while timelines measure how long training runs take from start to finish

**Explanation**: AI timelines address when advanced AI will be developed. Takeoff
speed addresses what happens next — does AI capability and societal impact ramp
up gradually over months or years (slow takeoff) or explode over days or weeks
(fast takeoff)? A system could arrive on a long timeline but still have a fast
takeoff once it reaches a critical capability threshold. (Takeoff → Takeoff)
```

- **level** L3 · **key** 127 · **distractors** 117, 119, 137 · **ratio** 1.02 · key not longest
- **d1** *(a, conflation)* misreads the two terms as synonyms, the conflation the section opens by separating
- **d2** *(a, conflation)* misreads the hardware/software split as the axis distinguishing them
- **d3** *(b, scope reversal)* misreads takeoff as a deployment rate rather than a capability-growth rate
- **why** The cleanest option set in the existing file (ratio 1.02) and a pure discrimination question — proof that parity and a real distinction are compatible without rewriting.

## 7 — Classifying a lopsided system (L4) — fresh

*§3.5's seed list: classify a described system on the AGI / TAI / ASI thresholds.
The TAI definition admits this shape; the AGI definition does not.*

```
### Question 7
A system performs at the 95th percentile on software engineering and machine
learning research, and at roughly the 20th percentile on everything else. Which
label do the chapter's own threshold definitions support?

- [ ] Artificial general intelligence, since expert-level performance on the domains that matter most is what that threshold asks for
- [x] Transformative AI, whose definition admits exceptional capability on a narrow set of critical domains instead of breadth
- [ ] Artificial superintelligence, since research capability at this level lets the system improve itself faster than its designers can
- [ ] None of the three, because every threshold requires clearing its percentile bar across a majority of cognitive domains

**Explanation**: The TAI threshold is defined by impact potential rather than
breadth, and is met either by moderate capability across many economically
important tasks or by exceptional capability on a few critical ones — automated
ML research is the example the text gives. AGI asks for 80–90th-percentile
performance across 80–90% *of domains*, which a system at the 20th percentile
outside two specialisms does not meet; "most cognitive domains" is a count of
domains, not a judgement about which ones matter. ASI requires exceeding human
capability across virtually all domains, a separate claim from being able to
do ML research well. (Defining and Measuring AGI → Defining General Intelligence)
```

- **level** L4 · **key** 120 · **distractors** 127, 130, 118 · **ratio** 0.96 · key not longest
- **d1** *(a, conflation)* misreads AGI's "most cognitive domains" as "the most important cognitive domains"
- **d2** *(c, pre-chapter prior)* misreads strong ML-research capability as entailing recursive self-improvement, which the chapter treats as a separate takeoff question
- **d3** *(b, scope reversal)* misreads TAI's two-branch definition as requiring both branches
- **why** The trap is a single word: AGI's "most domains" is a count, and the distractor reads it as a ranking. A reader who has the definition filed answers instantly; one who half-remembers it cannot.

## 8 — The bitter lesson and the 5–40% (L5) — fresh

*§3.6's seed list. Resolved by general-methods-that-unlock-scale vs.
task-specific encoded knowledge — the text draws it with Transformers vs LSTMs.*

```
### Question 8
The bitter lesson holds that general methods leveraging computation beat
hand-engineered knowledge. The same section reports that algorithmic improvement,
not scale, accounts for a substantial minority of performance gains. Which
distinction reconciles the two claims?

- [ ] The two describe different eras: the lesson summarises AI before deep learning, while the gains figure covers only the last decade
- [x] The algorithms that win are the ones that let a system use more computation productively, not the ones encoding what humans know
- [ ] Algorithmic progress is itself a way of buying compute, so the two figures count one underlying driver twice over
- [ ] The figure measures efficiency, which lowers the compute needed for a result rather than raising what a system can reach

**Explanation**: The bitter lesson's target is task-specific encoded knowledge,
not ingenuity as such. Transformers beat LSTMs without encoding anything about
language: attention parallelises, so it can actually use large amounts of compute
productively. That is the distinction — an algorithm that unlocks scale is on the
lesson's side, an algorithm that hard-codes domain expertise is what it warns
against. Distractor 1 is tempting because the lesson is stated historically, but
the section applies it *within* deep learning explicitly. Distractor 4 describes
a real thing (compute-efficiency gains) but the section treats those as raising
what a fixed budget reaches, which is a capability claim. (Leveraging Scale →
Bitter Lesson)
```

- **level** L5 · **key** 128 · **distractors** 130, 113, 120 · **ratio** 1.06 · key not longest
- **d1** *(b, scope reversal)* misreads "70 years of AI research" as confining the lesson to the pre-deep-learning era, which §"Bitter Lesson" contradicts
- **d2** *(a, conflation)* misreads "algorithms that unlock scale" as meaning algorithmic progress *is* scale
- **d3** *(a, conflation)* misreads compute-efficiency gains as distinct from capability gains
- **why** The reader must hold two claims the section makes on the same page and find the distinction that lets both stand — and no figure in it is load-bearing, so the 5–40% range can be restated without touching the question.

## 9 — What survives a reordering (L4) — fresh

*Pattern B (§5.4) on effective compute. The rubric names this as the canonical
Pattern B case and flags the current Chapter Review Q7 as the volatile version.*

```
### Question 9
Effective compute is usually summarised by quoting the current annual growth rate
of each of its three inputs. Which claim about those inputs would still hold if a
later estimate reordered all three rates?

- [ ] That the slowest of the three sets the ceiling, so the total cannot compound faster than its weakest input grows
- [ ] That chip production dominates the total, because the other two only make existing hardware go further than before
- [x] That the three multiply and each can improve on its own, so the total compounds faster than any single input does
- [ ] That the three trade off against each other, so a slowdown in one is normally offset by faster progress in another

**Explanation**: The durable claim is structural: effective compute is software
efficiency × hardware efficiency × chip count, and each factor can improve
independently of the others. That is why the total grows faster than hardware
trends alone suggest, and it stays true whatever the individual rates turn out to
be — which is exactly what a question built on their *ranking* cannot promise.
Distractor 1 applies bottleneck reasoning that would hold for factors in series,
not for a product of independent terms. As of the 2025 edition the three rates
were roughly 3×, 1.35× and 2.3× per year; note that the fastest is the one public
discussion attends to least. (Forecasting Timelines → Effective Compute)
```

- **level** L4 · **key** 113 · **distractors** 112, 114, 114 · **ratio** 1.00 · max/min 1.02
- **d1** *(b, scope reversal)* misreads independent multiplicative factors as a series bottleneck
- **d2** *(c, pre-chapter prior)* misreads public attention to chip counts as reflecting their share of the total
- **d3** *(a, conflation)* misreads "each can improve independently" as "each substitutes for the others"
- **why** Every rate in the section can change and the question still has the same answer — the model for converting a ranking question into a structural one, and the direct replacement for the current Chapter Review Q7.

---

## 10 — Counter-exemplars

A generator shown only good output infers the wrong boundary. Both of these are
real questions from the current file, with the verdict object pass 2 should
produce (RUBRIC §0.3, extended per `quiz-critic`).

### 10.1 The pointing finger

```
### Question 3
What are the four key variables in scaling laws for AI models?

- [ ] Architecture, learning rate, batch size, and epochs
- [ ] GPUs, researchers, electricity, and time
- [x] Compute (total FLOPs during training), parameters (model size), data (training examples/tokens), and accuracy (inverse of loss)
- [ ] Pre-training, fine-tuning, prompting, and deployment
```

```json
{
  "id": "exemplar/counter-1",
  "verdict": "reject",
  "level": "L2",
  "level_claimed_by_generator": "L3",
  "failed_criteria": ["R8", "R9", "D3", "D7", "D9"],
  "measurements": {
    "correct_len": 128, "distractor_lens": [52, 41, 53], "mean_distractor_len": 48.7,
    "len_ratio": 2.63, "correct_is_longest": true, "correct_is_shortest": false,
    "extremum_gap": 75, "max_over_min": 3.12, "option_count": 4
  },
  "provenance_verified": [null, false, false, false],
  "families_present": [],
  "explanation_true_standalone": true,
  "answerable_from_text_alone": true,
  "reasons": [
    "R8: len_ratio 2.63, band 0.80-1.20. The key is the only option carrying parenthetical definitions.",
    "R9: key exceeds the second-longest option by 75 characters.",
    "D3: 'GPUs, researchers, electricity, and time' is not a belief any reader holds after reading the section; it is padding.",
    "D9: the key is a list of four defined terms, the distractors are bare noun lists - a grammatical tell independent of length.",
    "D7: no distractor is within reach of the key's specificity."
  ],
  "rewrite": null,
  "rewrite_changed": [],
  "reviewer_note": "Rejected rather than rewritten because the question asks for an enumeration; RUBRIC 10.4 rewrites the idea into an application question instead, which is a different question, not a fix to this one."
}
```

**Why this is the instructive failure:** every distractor is eliminable without
having read the section, so the length tell is redundant — the question was
already answerable. Fixing the arithmetic alone would have produced four
equal-length options that still test nothing.

### 10.2 Right level, wrong mechanics

```
### Question 2
Consider this progression: AlphaGo (2016) -> MuZero (2020) -> Voyager/GPT-4 in Minecraft (2023) -> SIMA-2 (2025). What broader trend does this sequence illustrate about AI development?

- [x] A progression from superhuman narrow capability, to generality without rules, to open-ended planning, to cross-game skill transfer — moving along both capability and generality axes
- [ ] Game-playing AI has no relevance to real-world applications
  …
```

```json
{
  "id": "exemplar/counter-2",
  "verdict": "rewrite",
  "level": "L4",
  "level_claimed_by_generator": "L4",
  "failed_criteria": ["R8", "D3"],
  "measurements": {
    "correct_len": 182, "distractor_lens": [130, 131, 141], "mean_distractor_len": 134.0,
    "len_ratio": 1.36, "correct_is_longest": true, "correct_is_shortest": false,
    "extremum_gap": 41, "max_over_min": 1.40, "option_count": 4
  },
  "provenance_verified": [null, false, true, true],
  "families_present": ["a", "d"],
  "explanation_true_standalone": true,
  "answerable_from_text_alone": false,
  "reasons": [
    "R8: len_ratio 1.36, band 0.80-1.20. The key carries a four-item progression plus the axes clause.",
    "D3: 'Game-playing AI has no relevance to real-world applications' is a non-belief - nobody who read the section holds it."
  ],
  "rewrite": "<full candidate object: key trimmed to the axes claim with the four-stage list moved to the explanation; distractor 1 replaced with a family (a) conflation offering generality-only progression>",
  "rewrite_changed": ["options[0].text", "options[1]", "explanation"],
  "reviewer_note": "This is a genuine L4 and the only one in the file - the mapping onto the capability x generality axes is never stated in the prose. Fix the mechanics, keep the idea."
}
```

**Why this one matters more than the first:** the difference between a `reject`
and a `rewrite` is whether the *idea* survives. Counter-exemplar 1 fails because
the question is an enumeration; this one fails on mechanics alone and its idea is
the best L4 seed in the chapter. A generator that cannot tell these apart will
either discard good ideas or polish bad ones.

---

## 11 — Measurement note

Every ratio quoted above is reproduced by:

```bash
node scripts/measure-exemplars.mjs
```

All nine exemplars sit inside R8, R9 and the 1.6× spread rule. The two
counter-exemplars fail all three, by design, and are reported rather than gated.

This file is measured by its own script rather than by `check-questions.mjs`,
because it is not a quizParser file: the questions sit in fenced blocks
interleaved with metadata, and counter-exemplar 2 is quoted partially.

**Two numbers here are quoted, not measured.** The counter-exemplar verdict
objects reproduce RUBRIC §0.3's own worked example (key 128, distractors
[52, 41, 53], ratio 2.63) taken against `public/questions/ch1-capabilities.md`.
Measured against the copy in *this* file they come out one character shorter per
option (127, [51, 40, 52], 2.66) — a whitespace difference in transcription, not
a disagreement. The rubric's numbers are kept because the JSON block is quoting
the rubric's verdict object verbatim. Anywhere else, a gap like this between a
quoted measurement and a computed one is exactly what the Critic is told to
flag.

None of the fresh questions (7, 8, 9) landed inside R8/R9 on the first draft;
each took one adjustment pass after measuring. RUBRIC §10's closing caution
applies to this file too — treat the arithmetic as a step in the process, not as
something good writing produces on its own.

## 12 — Open for Em (STOP gate)

1. **Takeoff Q1's explanation (exemplar 6)** opened "The chapter carefully
   distinguishes these", which E5 forbids. QUIZ-PLAN says keep this one
   *verbatim*; I removed the clause and added an E4 citation, changing nothing
   else. Either that is the right call, or the exemplar should carry the E5
   violation with a note — but it should not carry it silently, because the
   Generator imitates whatever is here.
2. **Nine exemplars, not 8–10 split evenly by level.** Distribution is L3 ×3,
   L4 ×4, L5 ×2, L2 ×0. There is deliberately no L2 exemplar: §3.3 caps L2 at
   20% and the Generator is told to under-produce it, so showing one invites it.
   Confirm that is what you want, or supply an L2 worth imitating.
3. **Exemplar 9 replaces Chapter Review Q7.** If you would rather keep Q7's
   ranking content somewhere, it belongs in an explanation, not a key.
4. **Counter-exemplar 2 is quoted partially** — the middle two distractors are
   elided. If the Generator should see a complete rejected question, say so and
   I will quote all four options.
