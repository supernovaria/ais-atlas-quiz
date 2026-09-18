# Fixed-frame question blocks — proposal

> Draft for Em, 2026-09-18. Proposes a new question format and, if adopted, a
> RUBRIC §4.7 plus three checker changes. **Not a decision — do not run P1
> against this.** It changes what the rubric measures, so it belongs in the
> phase 1 sign-off or nowhere.

## The idea

Instead of writing four bespoke options per question, fix one option set for a
whole block of questions and vary only the stem. The reader classifies each
scenario against the same recurring frame.

The immediate prize is that **every length criterion becomes vacuous.** R8, R9
and the 1.6× spread rule compare the key against its distractors; when every
question in a block has the same four options, those ratios are constants. The
key cannot be the longest option more often than chance, because "longest
option" is a fixed property of the frame rather than a property of the answer.
Same for D9 grammar parity, D10 specificity, and hedge density — all automatic.

That is a real gain, and it is not the whole story.

## Worked example — the four drivers

RUBRIC §3.5 already lists this as an L4 seed: *"given a claim about AI progress
hitting a wall, identify which of the four independent drivers the claim
actually constrains."* It is the strongest fixed-frame candidate in chapter 1
because the four drivers are durable (the rates change, the decomposition does
not) and because real commentary constantly conflates them.

**The frame**, identical in all six items, shuffled per question by the app:

```
- [ ] Software efficiency — how much capability a given amount of compute buys
- [ ] Hardware efficiency — how much compute a given chip delivers
- [ ] Chip production — how many chips physically exist to be run at all
- [ ] Scaffolding — how much capability a given trained model delivers
```

Measured, the frame is 72 / 60 / 66 / 64 characters — spread 1.20, inside the
1.6× rule. More to the point, **the R8 ratio is 1.14 / 0.89 / 1.01 / 0.97
depending on which option happens to be the key, so every item in the block
passes R8 whichever way it is answered.** That is the property in one line: the
length criteria stop depending on the question.

**The six stems**, each a claim of the kind the chapter says people make:

| # | Stem | Key | Live distractor, and the misread that reaches it |
|---|---|---|---|
| 1 | Export controls halve the number of advanced accelerators a lab can legally buy. | Chip production | *Hardware efficiency* — reads "advanced" as a claim about chip quality, so files a restriction on **how many** under **how good** |
| 2 | A new attention variant reaches the same benchmark score on a third of the training compute. | Software efficiency | *Hardware efficiency* — reads "less compute needed" as "more compute delivered", the direction reversal |
| 3 | An existing model, given a code interpreter and ten times the inference budget, resolves far more issues with no retraining. | Scaffolding | *Software efficiency* — reads any gain not from a bigger model as an algorithmic gain, collapsing the layer around the model into the model |
| 4 | A new process node delivers substantially more computation per unit of energy at the same wafer cost. | Hardware efficiency | *Chip production* — reads "same wafer cost" as a statement about supply rather than about efficiency per chip |
| 5 | A packaging facility goes offline for a year after a fire. | Chip production | *Hardware efficiency* — reads a supply shock on finished chips as a limit on what chips can do |
| 6 | A routing change lets a model activate a fraction of its parameters per token at the same quality. | Software efficiency | *Scaffolding* — reads an architectural change as part of the wrapper around the model rather than the model itself |

Key distribution: **software ×2, chip production ×2, hardware ×1, scaffolding ×1.**

In quizParser format each item repeats the four options, so nothing in the app
changes — the parser wants options inline per question and gets them. Item 1:

```
### Question 1
Export controls halve the number of advanced accelerators a lab can legally buy.
Which of the four drivers of effective capability does this actually constrain?

- [ ] Software efficiency — how much capability a given amount of compute buys
- [ ] Hardware efficiency — how much compute a given chip delivers
- [x] Chip production — how many chips physically exist to be run at all
- [ ] Scaffolding — how much capability a given trained model delivers

**Explanation**: A control on how many accelerators a lab may buy bites on the
number of chips, not on what each chip can do — the affected lab's hardware is
exactly as efficient as it was the day before. The pull toward hardware
efficiency comes from the word "advanced": it is doing work about *which* chips
are restricted, not about how well they compute. Keeping the two apart matters
because they respond to completely different interventions, and because the
three compute factors multiply — a constraint on one does not cap the others.
(Forecasting Timelines → Effective Compute)
```

## What this format costs

**1. The tell moves into the stem, and gets a new form.** With options constant,
any lexical collocation between a stem and one option is learnable across the
block. An early draft of the frame above read *"Hardware efficiency — how much
compute a given chip delivers per watt"*, and item 4's stem said "more FLOP per
watt" — a reader needs no understanding at all to match those. I removed "per
watt" from both the option and the stem. **This is the format's signature
failure mode:** R14's word-match tell stops being a per-question accident and
becomes a systematic, trainable rule. Every item in a block has to be swept
against every option, not just its own.

**2. Exact balance is worse than approximate balance.** If a four-option frame
runs exactly four items with one key each, a reader who is sure of three gets
the fourth free. The distribution above is deliberately 2/2/1/1 over six items.
A shipped block should run **8–12 items** with a distribution that is roughly
even and never stated, and block length must exceed option count comfortably
enough that elimination does not pay.

**3. Some options go inert.** In a bespoke question every distractor is chosen
because a reader might pick *it*, for *this* question — that is D1. In a fixed
frame, some options are dead on arrival for some stems: nobody reaches
"scaffolding" on the fire at the packaging plant. That is D3 straw, redistributed
rather than removed. The mitigation is to require **at least two live options per
item**, named in the provenance, which is the column in the table above. An item
with one live distractor is a true/false question wearing four options.

**4. It cannot carry L5.** Classification sits naturally at L3–L4, which is
where §3.7 wants most of the weight — genuinely convenient. But §3.7 also
requires **≥1 L5 per section, always**, and "evaluate this claim against the
framework's own limits" does not reduce to picking from a fixed list. So a fixed
frame is a *block inside* a section, never a whole section, and never the review
block.

**5. R4 will false-positive.** Fixed-frame stems share their closing sentence and
much vocabulary. Our duplicate check is ≥70% content-word overlap and will fire
on siblings. Either compute R4 on the scenario clause alone, or mark the block
with `<!-- duplicate-ok -->` — the first is better, because the second disables a
real check.

## What it buys the checker

Tier 2's length gates go quiet, and three new set-level gates replace them:

| Gate | Why |
|---|---|
| no option is the key more than ~40% of a block | the base-rate tell |
| every option is the key at least once | an option never correct is frame filler |
| ≥2 live options per item, per the provenance column | D1 survives the format change |

And one existing instrument gets sharper. **The adversary becomes a clean
measurement under this format.** Today a hit confounds stem leakage with option
tells; with options held constant across the block, option tells are constant
too, so the hit rate above chance is almost purely a stem-side signal. The
format that removes the length tell also removes the main confound from the
check that matters most.

## Recommendation

Adopt as an **optional block format, not a replacement.** Concretely:

- at most **one** fixed-frame block per section, and only where the section
  carries a genuine recurring taxonomy — in chapter 1 that is the four drivers,
  AGI/TAI/ASI, slow/fast takeoff, and volatile/durable, and not much else;
- 8–12 items, distribution roughly even and unpublished;
- bespoke questions for everything else, and for every L5;
- the three gates above added to the checker, and R4 taught about sibling stems.

The honest summary is that this trades a **measurable** problem for a **less
measurable** one. Length tells are arithmetic and our checker already catches
them at 14-of-14 fidelity. Stem-side leakage is a judgment call that only the
adversary can sample. That trade is worth making where the taxonomy is real,
because the questions it produces are the applied-classification items §3.7 wants
most of — and it is a bad trade anywhere the frame has to be invented to fit.
