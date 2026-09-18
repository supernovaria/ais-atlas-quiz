# Question Quality Rubric — AI Safety Atlas Quiz Companion

**Scope:** Chapter 1 (Capabilities), AI Safety Atlas v1. Source prose:
`atlas-audio-read-along/dist/chapters/v1/capabilities/*.md` (11 files, ~25,700 words).
Output format: `public/questions/ch1-capabilities.md`, parsed by `src/quizParser.js`.

**Status:** Governing document. It binds three things:

1. **Pass 1 (generation).** The generator is given this file and must produce
   candidates that already satisfy §2 and §4.
2. **Pass 2 (filter).** A second model is given this file plus each candidate and
   emits a structured verdict (§0.3). It applies §2 mechanically, §3–§6 by
   judgment, and rewrites where §10 shows how.
3. **Manual review (mandatory, non-negotiable).** A human reads every question
   that survives pass 2 using §9. Pass 2 cannot ship anything on its own.

Nothing in this file authorises shipping a question that a human has not read.

---

## 0. How to use this document

### 0.1 The one-sentence version

Markov's objection to LLM-generated quizzes is that they test **incidental
trivia** instead of **conceptual understanding**. Everything below is an attempt
to make that objection checkable rather than merely agreeable.

### 0.2 Order of application

Apply in this order and stop at the first hard failure:

| Order | Gate | Section | Mechanical? |
|---|---|---|---|
| 1 | Structural validity | §2.1 (R1–R4) | yes |
| 2 | Stem framing | §2.2 (R5–R7) | yes (regex) |
| 3 | Answer-length asymmetry | §2.3 (R8–R9) | yes (arithmetic) |
| 4 | Volatility | §2.4 (R10–R11) + §5 | mostly |
| 5 | Option-set hygiene | §2.5 (R12–R14) + §4 | mixed |
| 6 | Cognitive level | §3 | judgment |
| 7 | Distractor provenance | §4 | judgment |
| 8 | Explanation | §6 | mixed |

A hard failure in gates 1–5 is `reject` or `rewrite`; there is no "but the
content is good" exemption. Gates 6–8 produce `rewrite` far more often than
`reject`.

### 0.3 Verdict schema (pass 2 output)

One object per candidate question. No prose outside the object.

```json
{
  "id": "leveraging-scale/q2",
  "verdict": "pass | rewrite | reject",
  "level": "L0 | L1 | L2 | L3 | L4 | L5",
  "failed_criteria": ["R8", "D3", "D7"],
  "measurements": {
    "correct_len": 128,
    "distractor_lens": [52, 41, 53],
    "mean_distractor_len": 48.7,
    "len_ratio": 2.63,
    "correct_is_longest": true,
    "volatile_figures": [],
    "durable_figures": ["20 tokens per parameter"]
  },
  "reasons": [
    "R8: correct answer is 2.63x mean distractor length (band is 0.80-1.20).",
    "D3: distractor 'GPUs, researchers, electricity, and time' is not a belief any reader could hold after reading the section; it is padding."
  ],
  "rewrite": "<full replacement question block in quizParser format, or null>",
  "reviewer_note": "One sentence for the human: what to look at first."
}
```

`level` is reported even on `reject`, because the set-level distribution check
(§3.7) needs it.

### 0.4 Terms

- **Stem** — the question text before the options.
- **Key** — the single `- [x]` option.
- **Distractor** — a `- [ ]` option.
- **Tell** — any surface feature that lets a reader who has not read the text
  identify the key above chance.
- **Load-bearing** — a fact is load-bearing if changing it changes which option
  is correct. A fact that appears only in the explanation is not load-bearing.
- **Section quiz** — the questions under one `#` heading matching one source
  `.md` file.
- **Review block** — the `# ... Review` heading(s) drawing on ≥2 sections.

---

## 1. What the quiz is for

**The reader.** Someone working through AI Safety Atlas chapter 1 — a technically
literate adult who is new to AI safety specifically. Often a participant in a
reading-group cohort (AI Safety Fundamentals-style), sometimes a self-directed
reader. They have just finished a ~2,000–4,000 word section. They are not being
graded, there is no certificate, and nothing stops them from closing the tab.

**The moment.** Immediately after reading the section, or a day later as recall
practice. They will spend 5–10 minutes on a section quiz. The chapter review may
come days later.

**What a good question does for them.** Exactly one of these three:

- **Surfaces a misconception they are currently holding** and did not know they
  held. This is the highest-value outcome, and it is produced almost entirely by
  distractor quality (§4), not by stem cleverness.
- **Forces a connection the prose stated but did not exercise.** The text says
  scaffolding gains sit outside what scaling laws predict; the question makes the
  reader use that to evaluate a "scaling has hit a wall" claim.
- **Gives them a handle they can carry out of the chapter.** After the quiz they
  can say "capability and generality are separate axes, and autonomy is a third
  thing that is about deployment" without re-opening the page.

**What a good question never does.** Confirm that the reader's eyes passed over
a sentence. If the only skill exercised is Ctrl-F, the question is failing its
one job — and worse, it teaches the reader that this material is the kind of
thing you memorise rather than the kind of thing you reason with.

**The asymmetry that sets the bar.** A reader who gets a question wrong reads the
explanation and believes it. A confidently-wrong distractor with a plausible
explanation is worse than no quiz at all. This is why manual review is
non-negotiable and why §4 is the longest section in this document.

---

## 2. Hard rejection criteria

Each criterion is stated so it can be checked without reading the source prose,
except where marked **[source]**. Verdict `reject` unless a `rewrite` is given
that clears the criterion.

### 2.1 Structural (R1–R4) — fully mechanical

**R1 — Exactly one key.** Exactly one option line begins `- [x] `. Zero or two or
more is an automatic reject. (`quizParser.js` will silently accept a malformed
block; nothing downstream catches it.)

**R2 — Option count 3–5, default 4.** Three options only where a genuine
trichotomy exists (e.g. slow/fast/neither). Five only where the fifth is a real
misconception, not filler. Chapter-1 default is 4.

**R3 — Required fields present.** `### Question N` heading, ≥3 option lines, and
a non-empty `**Explanation**:` block. A question without an explanation is not a
draft, it is a reject.

**R4 — No duplicate stems across the file.** Two stems are duplicates if their
content words (stopwords removed) overlap ≥70%. Chapter review questions may
revisit a *concept* covered in a section quiz, but not restate the same question.

### 2.2 Stem framing (R5–R7) — regex-checkable

**R5 — No source-attribution framing.** Reject any stem matching:

```
/according to the (chapter|text|textbook|section|author|atlas)/i
/(what|which|why|how) does the (chapter|text|section|author)\s+(identify|argue|describe|say|state|claim|present|define|discuss|list|mention|call)/i
/the (chapter|text|section) (identifies|argues|describes|states|claims|presents|discusses|lists|mentions|defines)/i
/as (described|discussed|presented|identified|defined|stated|mentioned) (in|by) the (chapter|text|section)/i
/in the (chapter|text|section)('s)?\b/i
```

Rationale: these phrasings change the question from "is this true" to "did the
page say this", which is precisely the failure mode this rubric exists to stop.
**16 of 40 current stems (40%) match this family** (Appendix A).

Two narrow exemptions, both requiring the word "chapter" to be doing real work:

- The stem is asking the reader to *evaluate the text's own position against an
  alternative* — e.g. "The Atlas sets consciousness aside as not actionable for
  safety work. Which of these would be the strongest objection to that move?"
  Here the attribution identifies whose claim is under attack. Still prefer
  naming the claim instead of the source.
- The stem quotes the text verbatim in quotation marks as the object of
  analysis (see §3.6, L5).

Default rewrite: delete the attribution clause and check that the question still
has a determinate answer. If it no longer does, the question was recall.

**R6 — No stem that names the answer's location.** "In the subsection on
overhangs, what…" tells the reader where to look and narrows the search to one
paragraph. Cite the section in the **explanation** (§6), never in the stem.

**R7 — No "which of the following" with no discriminating principle.** A stem of
the form "Which of the following is true about X?" with four unrelated claims is
a four-way recall lookup, not a question. The stem must name the axis of
comparison ("Which of these best explains *why* …", "Which pair …", "Which
would the framework classify as …").

### 2.3 Answer-length asymmetry (R8–R9) — arithmetic

Measured in characters of the option text, excluding the `- [ ] ` / `- [x] `
prefix.

**R8 — Per-question length band.** Let `C` = key length and `D̄` = mean
distractor length. Require:

```
0.80 ≤ C / D̄ ≤ 1.20
```

**R9 — Per-question extremum guard.** If the key is the longest option, it must
exceed the second-longest option by **≤ 15 characters**. If the key is the
shortest option, the second-shortest must exceed it by **≤ 15 characters**.

Additionally, **no single option may exceed 1.6× the shortest option** in the
same question. An option set of `[247, 36, 46, 65]` (Defining and Measuring AGI
Q3, current file) is not a question, it is a pointing finger.

These two are per-question. The set-level gates are in §2.3.1 and belong to the
checker script, not to pass 2 (which sees one question at a time).

#### 2.3.1 Set-level gates (checker script / human)

Over all N multiple-choice questions in a file:

| Metric | Chance (4 opts) | Gate | Current file |
|---|---|---|---|
| key is the longest option | 25% | **≤ 35%** | **60%** ✗ |
| key is longest *or* shortest | 50% | **≤ 60%** | **75%** ✗ |
| mean key length ÷ mean distractor length | 1.00 | **0.90–1.10** | **1.39** ✗ |

Why 35%: with N=40 and p=0.25, the standard deviation of the longest-is-key count
is 2.74, so 14/40 sits about 1.5 SD above chance — permissive enough not to fire
on noise, tight enough that the current file's 24/40 (5.1 SD) fails loudly. Why
0.90–1.10 on the mean ratio: the current gap is 149.3 vs 107.5 chars; a ±10% band
on ~110 chars is ~11 characters, which is below the resolution at which a reader
can eyeball "that one's longer" across a shuffled four-option list.

**The failure this prevents has already happened once.** Commit `8e3208a`
("updated all questions to avoid longest=right pattern") lengthened distractors
without measuring, and the rate is still 60%. A reader who never opens the
textbook and always picks the longest option scores 60% against a 25% baseline.
Do not accept "we made the distractors longer" as evidence. Accept the three
numbers in the table.

**R8/R9 are the easiest criteria to satisfy and the most often violated,**
because the natural way to write a key is to make it precise and the natural way
to write a distractor is to make it briefly wrong. The fix is almost always to
move qualifying detail out of the key and into the explanation, not to pad the
distractors.

### 2.4 Volatility (R10–R11) — see §5 for the full treatment

**R10 — No volatile figure may be load-bearing.** If the discriminating
difference between the key and any distractor is a benchmark score, a model
version number, a per-year growth rate quoted from a tracker, or a
forward-looking date within 8 years, reject. See §5.2 for the volatile/durable
classification.

The chapter's own introduction states the warrant:

> The specific examples and benchmark scores in this chapter will be outdated
> soon, but the underlying patterns will remain.

A question pinned to the volatile layer is a question the Atlas text itself
disclaims. A text refresh lands roughly December 2026 – January 2027; anything
in that layer rots on that date.

**R11 — At most one durable figure may be load-bearing per section quiz.** Even
legitimate numbers (§5.3) should not be the shape of the quiz. One
Chinchilla-style question per section; not three.

### 2.5 Option-set hygiene (R12–R14)

**R12 — No "All of the above" / "None of the above" / "Both A and B".** Three
reasons, all specific to this project: the app shuffles options by default, so
positional references break; "all of the above" is a known giveaway (if two
options are clearly right, the reader picks it without evaluating the third); and
it converts a discrimination question into an arithmetic one. If a question
genuinely needs a combination answer, write the combination out in full as a
single option and give every distractor an equally-structured combination — see
Synthesis Q1 and Q6 in the current file, which do this correctly.

`<!-- no-shuffle -->` exists for ordering questions ("which sequence…"), not as a
licence for "all of the above".

**R13 — At most one negation stem per section quiz, and it must be typographically
marked.** A "which is NOT" / "which is EXCEPT" stem must render the negation in
capitals. Negation stems are permitted but capped because they invert the reading
task (you must verify three true statements to find one false one), which is
slow, error-prone under time pressure, and easy for a generator to satisfy by
inventing a plausible-sounding falsehood rather than a real misconception.

A negation stem additionally requires: **the false option must be false for a
reason the text supports**, not merely absent from the text. Current Forecasting
Timelines Q5 asks which is NOT an escape route for the data wall, and the key is
"Purchasing proprietary datasets from corporations and governments" — which is
not wrong, it is just not one of the three the text lists. That is an
enumeration-completeness test, i.e. recall. Prefer negation stems where the false
option contradicts something the text asserts (Foundation Models Q4 does this:
its key reverses the text's central point that SSL removed the labelled-data
requirement).

**R14 — No overlapping or entailing options.** No option may entail another.
If option A is true whenever option B is true, a reader can eliminate B by logic
alone. Check especially for a "general" option and a "specific instance of the
general" option in the same set.

Also under R14: **no word-match tell.** If a distinctive content word from the
stem appears in exactly one option, that option is marked. Either put the word in
≥2 options or in none.

---

## 3. Taxonomy of question types

Six levels, worst to best. Every example is quoted verbatim from the current
`public/questions/ch1-capabilities.md`. Level is a property of the **task the
reader performs**, not of how long or sophisticated the question looks.

**Level and mechanics are independent axes.** The file's best question by level
(Synthesis Q4, L5) is also one of its worst by length asymmetry (key 214 chars
vs. 65 mean distractor). A high level does not excuse an R8 failure, and clean
mechanics do not rescue an L1.

### 3.1 L0 — Trivia recall — **reject on sight**

The key is a named entity, a date, or a figure, and the reader's task is to
retrieve it. Ctrl-F answers it in under five seconds.

> **Current Capabilities, Question 5**
> How did AI performance on real GitHub issues (SWE-bench) change between 2024 and 2025?
> - [x] It jumped from about 15% to about 74%, driven by combining better models with tool use

Why L0: the reader is choosing between four number pairs. The clause "driven by
combining better models with tool use" is the only part with conceptual content,
and it is not load-bearing — no distractor contests the mechanism, only the
digits. The question would be answered identically by someone who understood
nothing about why tool use matters. It is also R10: the SWE-bench number is
exactly the layer the text disclaims. Rewritten in §10.1.

**Target share: 0%.**

### 3.2 L1 — Source-attributed recall — **reject or rewrite**

The stem asks what the text said rather than what is true. The cognitive task is
to remember a page, not to evaluate a claim.

> **Current Capabilities, Question 3**
> How did tool use change the performance of AI models, according to the chapter?
> - [x] It significantly boosted performance, enough that companies began reporting benchmark scores separately with and without tools

Why L1: fails R5 outright. But note the deeper problem — strip "according to the
chapter" and the question is still weak, because the three distractors are not
things anyone believes. "Tool use made models slightly faster but did not improve
accuracy" contradicts the reader's own daily experience of a calculator. The
attribution framing is usually a symptom: a generator reaches for it precisely
when it has not found a real disagreement to build the question around.

**Target share: 0%.** Currently 40% of stems match the R5 family.

### 3.3 L2 — Definition and enumeration — **cap at 20%**

The reader matches a defined term to its definition, or recognises a list the
text gives. This has a legitimate floor: a reader who cannot say what "generality"
means in this framework cannot do L3 and above. But it is where a generator will
drift if you let it, because the text hands it dozens of bolded definitions.

> **Leveraging Scale, Question 2**
> What are the four key variables in scaling laws for AI models?
> - [x] Compute (total FLOPs during training), parameters (model size), data (training examples/tokens), and accuracy (inverse of loss)
> - [ ] GPUs, researchers, electricity, and time

Why L2, and why this specific instance is a reject anyway: the task is list
recognition. And the option set is `[128, 52, 41, 53]` — a 2.63 length ratio
(R8) with distractors that are not beliefs but jokes (R7/D3). Rewritten in §10.4.

A *good* L2 does one thing the reader would otherwise get wrong: it makes them
distinguish the defined term from its near-neighbour. Foundation Models Q3
(foundation vs. frontier, with AlphaFold as the discriminating case) is at the
top of L2 and arguably L3.

**Target share: ≤20% of a section quiz, ≤10% of a review block.** At most **one**
pure "what does term X mean" question per section.

### 3.4 L3 — Discrimination — **target 35–40%**

The reader must separate two things the text deliberately contrasts and that
readers routinely conflate. This is the workhorse level and chapter 1 is unusually
rich in it, because most of the chapter is definitional carpentry.

> **Takeoff, Question 1**
> What is the key distinction between "takeoff speed" and "AI timelines"?
> - [x] Timelines address *when* transformative AI arrives; takeoff speed addresses what happens *after* — gradual vs. explosive growth

Why L3 and why it works: the conflation is real (the text spends its opening
paragraph on it), the distractors are near-misses rather than nonsense, and the
option lengths are `[128, 118, 120, 138]` — a 1.04 ratio, the cleanest set in the
file. This question would survive a text refresh untouched.

The chapter-1 discriminations worth building L3 questions on, in rough order of
how often readers get them wrong:

| Pair | Source section |
|---|---|
| capability (depth) vs. generality (breadth) | defining-and-measuring-agi |
| AGI (cognitive profile) vs. TAI (impact potential) | defining-and-measuring-agi |
| capability/generality vs. autonomy (a deployment choice) | defining-and-measuring-agi |
| timelines vs. takeoff speed | takeoff |
| exponential (slow takeoff) vs. superexponential (fast takeoff) | takeoff |
| foundation model vs. frontier model | foundation-models |
| strong vs. weak scaling hypothesis | leveraging-scale |
| scaling the base model vs. scaffolding / unhobbling | leveraging-scale |
| scaling laws as empirical regularity vs. as law of nature | leveraging-scale |
| hardware overhang vs. data overhang | takeoff |
| investment feedback loop vs. automation feedback loop | takeoff |
| self-supervised pre-training vs. supervised fine-tuning | foundation-models |
| capabilities generalising vs. goals generalising | foundation-models |
| behaviourist vs. adaptability-focused definitions of intelligence | defining-and-measuring-agi |
| effective compute vs. raw chip count | forecasting-timelines |

An L3 question is only L3 if **at least two distractors are the other member of
the pair, or a defensible hybrid**. If the distractors are unrelated nonsense,
it collapses to L2.

### 3.5 L4 — Application and transfer — **target 25–30%**

The reader applies a framework from the text to a case the text does not walk
through. The case may be drawn from elsewhere in the chapter (that is fine and
often best) but the mapping must not be stated in the prose.

> **Synthesis: Cross-Chapter Multiple Choice, Question 2**
> Consider this progression: AlphaGo (2016) -> MuZero (2020) -> Voyager/GPT-4 in Minecraft (2023) -> SIMA-2 (2025). What broader trend does this sequence illustrate about AI development?
> - [x] A progression from superhuman narrow capability, to generality without rules, to open-ended planning, to cross-game skill transfer — moving along both capability and generality axes

Why L4: `current-capabilities.md` narrates all four systems but never maps them
onto the capability×generality axes, which arrive two sections later. The reader
has to do the mapping. Four facts from one section get organised by a framework
from another.

Why it is not yet a `pass`: options are `[182, 130, 131, 141]` — ratio 1.36, R8
fail. And distractor 4 ("game-playing AI has no relevance to real-world
applications") is straw (D3). Fix the mechanics and this is a model L4.

Other good L4 seeds in chapter 1:

- Given a described system ("scores at the 95th percentile on coding and ML
  research, 20th on everything else"), classify it on the AGI / TAI / ASI
  definitions. The TAI definition explicitly admits this shape; the AGI
  definition explicitly does not.
- Given a deployment scenario, separate the capability claim from the autonomy
  claim (levels 0–5).
- Given a growth description, classify it as slow or fast takeoff. Note the trap
  the text sets: *constant-rate exponential growth is slow takeoff in this
  framework*, which surprises most readers.
- Apply the (t,n)-AGI framing to a concrete task horizon.
- Given a claim about "AI progress hitting a wall", identify which of the four
  independent drivers (software efficiency, hardware efficiency, chip production,
  scaffolding) the claim actually constrains.

### 3.6 L5 — Critique and synthesis — **target 15–20%**

The reader evaluates a claim, or uses one part of the chapter against another.
The text supplies the material for the critique but does not pre-package the
verdict for the specific claim in the stem.

> **Synthesis: Cross-Chapter Multiple Choice, Question 4**
> If someone told you "AI has reached 57% AGI according to the framework in the chapter," which of the following critiques would the chapter itself consider valid?
> - [x] The percentage can misleadingly imply linear progress when final capabilities may represent disproportionately hard bottlenecks, and CHC-based human tests may miss capabilities universal in humans but absent in AI

Why L5 and why it is the best question in the file: the reader is handed a claim
in the wild and must decide what is wrong with it using the framework's own
stated limits. It tests something a reader will actually need — the chapter's
whole argument is that precise measurement is good, and this question makes them
hold that alongside "and here is how precise measurement misleads." It is also
fully durable: no figure in it can go stale, because "57%" is a hypothetical in
the stem rather than a fact in the key.

Why it is a `rewrite` and not a `pass`: options are `[214, 74, 42, 79]` — ratio
3.29, the second-worst R8 violation in the file. Distractor 1 ("This is a
perfectly precise and meaningful statement — no critiques apply") and distractor
4 ("The framework doesn't use percentages at all") are both non-beliefs. A reader
who has not read the section still picks the key. Rewritten in §10.2.

Other L5 seeds:

- The bitter lesson says hand-crafted knowledge loses; the text also says
  algorithmic innovation still matters and that 5–40% of gains came from
  algorithms. Is that a contradiction, and if not, what distinction resolves it?
  (Answer: general methods that *unlock* scale vs. task-specific encoded
  knowledge — the text draws it explicitly with Transformers vs. LSTMs.)
- The text presents overhangs as an argument for fast takeoff, and also presents
  the counter-argument that a pause reduces chip production. What has to be true
  about pause duration for the counter to hold?
- Christiano's "slow" takeoff is 10–100x the Industrial Revolution. What does
  that do to the phrase "slow takeoff gives us time to adapt"?
- The chapter argues we need continuous measurement because binary AGI framing
  causes semantic deadlock — then immediately supplies threshold definitions for
  AGI/TAI/ASI. What work are the thresholds doing that the continuum cannot?

### 3.7 Target distribution

Per **section quiz** of N questions:

| Level | Target | Hard bound |
|---|---|---|
| L0 | 0% | 0 questions |
| L1 | 0% | 0 questions |
| L2 | ~15% | ≤20%, ≤1 pure-definition question |
| L3 | ~40% | ≥30% |
| L4 | ~30% | ≥25% |
| L5 | ~15% | **≥1 question, always** |

Per **review block** of N questions:

| Level | Target | Hard bound |
|---|---|---|
| L2 | ~10% | ≤10% |
| L3 | ~30% | — |
| L4 | ~35% | L4+L5 ≥ 50% |
| L5 | ~25% | ≥3 questions |

If a section genuinely cannot support an L5 question, that is evidence the
section should get fewer questions (§8), not that the L5 requirement should be
waived. `foundation-models.md` is the section most likely to trigger this; its
L5 material is the capabilities-generalise-but-goals-don't asymmetry, which is
sufficient.

The distribution check runs over the **final** set, after rewrites. Pass 2
reports `level` per question; the human sums them in review.

---

## 4. Distractor quality standards

**This section is where most of the value is and where the current set is
weakest.** A multiple-choice question is three-quarters distractor by volume and
approximately all distractor by pedagogical effect. The stem selects the topic;
the distractors decide whether the reader learns anything.

### 4.1 The provenance test (D1) — the core rule

**D1 — Every distractor must have a stated provenance.** In pass-1 output, each
distractor carries a one-line comment (stripped before shipping) of the form:

```
misreads <specific sentence or subsection> as <specific wrong claim>
```

If the generator cannot complete that sentence with a *specific* referent, the
distractor is padding and must be replaced. "Generic wrong answer about scaling"
is not a provenance. "Reads 'scaling laws are empirically observed relationships,
not laws of nature' as meaning scaling laws have been disproven" is.

The human reviewer's version of D1 is a question: *could a reader who did the
reading, attentively, and got one thing wrong, arrive here?* If no, cut it.

### 4.2 Sanctioned distractor families (D2)

**D2 — Every distractor must belong to one of these four families.** Aim for at
least two distinct families per question.

**(a) Conflation.** The neighbouring concept the text explicitly separates. This
is the highest-yield family in chapter 1 because the chapter is largely a
taxonomy. Offer TAI where AGI is correct; exponential where superexponential is
correct; data overhang where hardware overhang is correct; the investment loop
where the automation loop is correct; frontier where foundation is correct.
A conflation distractor is correct *about something*, just not about this.

**(b) Scope or direction reversal.** The true claim with one quantifier, sign, or
direction flipped. The text says capabilities generalise across domains but goals
and safety constraints often do not; the reversal ("broader generalisation makes
them inherently safer since they understand context more deeply" — Foundation
Models Q5, distractor 2) is a genuine and common belief. The text says optimal
training needs ~20 tokens per parameter, *more* data than earlier laws suggested;
the reversal is "earlier laws over-estimated data needs."

**(c) Pre-chapter prior.** The belief the reader plausibly walked in with, which
this section exists to overturn. Chapter 1 has an unusually clean inventory of
these: hand-engineered domain knowledge beats brute force; a system must
understand (or be conscious) to be dangerous; "slow takeoff" means safe; more
parameters is always better; scaling laws are a physical law; AGI is a threshold
you cross; tool use is a crutch for small models. These distractors are valuable
precisely because some readers will pick them, and the explanation then does real
work.

**(d) Right idea, wrong slot.** A true statement from elsewhere in the chapter,
offered as the answer to this question. Tests whether the reader has the ideas
*filed*, not just present. Use sparingly — at most one per question — because
it can feel like a trick if the two ideas are far apart. It works best when the
two ideas are adjacent (offering a scaling-hypothesis claim as the answer to a
scaling-laws question).

### 4.3 Banned distractor patterns (D3–D8)

**D3 — No straw distractors.** A distractor no attentive reader would choose is
not a distractor, it is decoration that raises the effective guess rate from 25%
to 33% or 50%. Current examples, all verbatim:

> - [ ] That AI research is fundamentally impossible and will never succeed at replicating human-level cognition

> - [ ] They are identical concepts — the terms are interchangeable and labs use whichever sounds better in marketing

> - [ ] Because journalists systematically fabricate expert disagreements for clicks, misquoting researchers to manufacture controversy

> - [ ] GPUs, researchers, electricity, and time

> - [ ] It measures AGI by temperature (t) and number of samples (n) during inference

> - [ ] The marketing loop (better AI -> more users -> more revenue -> better AI) and the academic loop (more papers -> more citations -> more funding -> more papers)

> - [ ] Because slow takeoffs only affect developing countries that lack the institutional capacity to adapt to gradual technological change

**Test:** if the distractor is funny, cynical, or reads as the generator making a
joke, it is straw. Nothing in a distractor should be entertaining.

**Ceiling:** at most **one** distractor per question may be eliminable on
general reasoning alone without domain knowledge. Zero is better. The other two
must require having read the section.

**D4 — No absolute-quantifier tell.** Words like *always, never, entirely,
exclusively, conclusively, impossible, all, any, no ... at all* mark an option as
wrong to any experienced test-taker. In the current file **22 of 120 distractors
(18.3%) carry a strict absolute vs. 3 of 40 keys (7.5%)** — a 2.4× enrichment,
i.e. a real tell (Appendix A). With the looser word list the enrichment is larger.

Rule: **at most one distractor per question may contain an absolute quantifier,
and it must be an absolute a real person actually asserts** (e.g. "scaling is all
you need" is a position people hold). Keys may contain absolutes only where the
text itself asserts one.

**D5 — No wrong-because-the-number-changed distractors.** A distractor that is
identical to the key except for a digit tests arithmetic memory. It also makes
the question fail R10 by construction, because the key is then load-bearing on a
figure. "It improved from 5% to 25%" / "It improved from 30% to 45%" (Current
Capabilities Q5) are this pattern.

**D6 — No self-refuting or internally contradictory distractors.** "Foundation
models are always more advanced than frontier models, since they benefit from
broader training data" gives its own falsity away in the justification clause.
If a distractor needs a `since`-clause to sound plausible, the clause usually
sinks it.

**D7 — No length-differentiated distractors.** See R8/R9. Additionally: the three
distractors should be within 30 characters of *each other*. A set like
`[147, 124, 151]` (Synthesis Q8) is fine; `[159, 126, 149]` is fine; `[36, 46, 65]`
against a 247-char key is not.

**D8 — No option that is unfalsifiable or evaluative.** "This is a perfectly
precise and meaningful statement — no critiques apply" is not a claim about the
world; it is a meta-statement about the question, and its presence signals that
the real answer is one of the substantive options.

### 4.4 Structural rules (D9–D12)

**D9 — Parallel grammar.** All four options must be the same syntactic type:
all noun phrases, or all "that"-clauses, or all full sentences. Mixed types let
the reader eliminate on grammar. Check against the stem: every option must read
as a grammatical completion of it.

**D10 — Parallel specificity.** If the key names three mechanisms, each
distractor names three mechanisms. If the key hedges ("tends to", "often"), at
least two distractors hedge. Hedge-density is a tell as reliable as length: keys
hedge because they are true, distractors assert because they are invented.
Count hedges (`tends to, often, roughly, approximately, may, can, typically,
primarily, largely, about`) — the key must not carry more than one more hedge
than the median distractor.

**D11 — No overlapping options (restates R14).** In particular, watch for a
distractor that is a strict subset of the key ("Tool use was only beneficial for
mathematical reasoning tasks" vs. a key that includes mathematical reasoning
among other things). Subset options are eliminable by structure.

**D12 — Distractor plausibility floor.** At review, a distractor that **zero**
readers would select is dead weight. This is measurable if the app ever collects
selection rates; until then, the reviewer's judgment stands in. The target shape
for a well-built four-option question is roughly 55–70% key / 15–25% top
distractor / the remainder split — not 90/5/3/2.

### 4.5 Negation, combination, and ordering stems

- **Negation ("which is NOT"):** see R13. Cap one per section quiz; the false
  option must contradict the text, not merely be absent from it.
- **Combination ("which pair"):** permitted and good at L3–L5, provided every
  option is a pair of the same kind (see Synthesis Q6, which does this well).
  Never use letter references.
- **Ordering ("which sequence"):** permitted with `<!-- no-shuffle -->` only if
  the ordering is conceptual (capability→generality progression), not
  chronological. A chronological ordering question is L0.

---

## 5. Durability rules

### 5.1 The problem, stated concretely

Chapter 1 is a snapshot of a field that moves faster than the textbook. The text
says so itself, in the introduction:

> The specific examples and benchmark scores in this chapter will be outdated
> soon, but the underlying patterns will remain. Scaling laws, emergent
> capabilities, the shift from narrow to general systems—these trends are stable
> enough for you to learn about, even as individual benchmarks become obsolete.

A text refresh is expected roughly **December 2026 – January 2027**. Every
question whose key turns on the volatile layer will need re-verification then.
Every question written to §5.2's durable layer will not. Since the scope decision
is deep-on-chapter-1 rather than shallow-across-eight, the whole point is that
this set should still be correct after the refresh.

In the current file, **6 keys carry a figure in the option text** and the audit
counts **9 questions whose correct answer turns on a specific number** once
figures in distractors and discriminating explanations are included
(Appendix A).

### 5.2 Volatile — never load-bearing (V1)

A figure or name is **volatile** if it is any of:

1. **A score on a named benchmark.** SWE-bench 15%→74%, MMLU 92.5%, FrontierMath
   41% of tier 1–3, HLE ~4.5%→25%, o3-with-tools "almost 5%" over o3.
2. **A frontier model name or version number.** GPT-5.2, Claude Opus 4.5,
   Gemini 3 Pro, GLM-4.7, DeepSeek-v3.2, SIMA-2, Midjourney v7. (Naming these as
   *examples* in a stem is fine; making the question turn on which one did what
   is not.)
3. **An annual growth rate quoted from a live tracker.** 1.35x/year hardware
   efficiency, ~3x/year algorithmic efficiency, 2.3x/year chip production, 5x/year
   training compute, 3.7x/year dataset size, 4x/year token consumption. These are
   Epoch AI trend estimates that get restated each edition.
4. **A forward-looking date within 8 years of writing,** or a window containing
   the present. "2026 and 2032" is the worst case in the file: the lower bound is
   already in the past and a reader in 2027 cannot tell whether the question is
   describing a prediction or a failed one.
5. **A dollar or headcount figure from the current moment.** $480M for Grok-4,
   10,000 tool servers, 276,300 industrial robots installed, 1 million Amazon
   robots, "hundreds of billions of dollars by 2030".
6. **A claim about what "companies currently do."** "Companies now report
   benchmark performance separately with and without tools" is true today and is a
   reporting convention, not a pattern.

Volatile facts are still excellent **stem scaffolding** (§5.4, Pattern D) and
excellent **explanation colour** (§6). They must not decide the answer.

### 5.3 Durable — may be load-bearing, sparingly (V2)

A figure is **durable** if it is any of:

1. **A number that is part of a named published result's identity.** Chinchilla's
   ~20 tokens per parameter and "~10× more data than Kaplan et al. suggested".
   These do not change when the field moves; they are history. A future edition
   might drop the discussion, but it will not change the number.
2. **An order-of-magnitude range explicitly framed as uncertainty.** The
   biological-anchors span from ~$10^{28}$ to ~$10^{41}$ FLOP — twelve orders of
   magnitude. The *point* is the width, and the width is the claim. Compare: a
   question asking for the exact lower bound would be volatile-adjacent and
   pointless; a question asking what twelve orders of magnitude of uncertainty
   *means for planning* is durable and L4.
3. **A historical event date.** Deep Blue 1997, Watson 2011, AlphaGo/Lee Sedol
   2016, MuZero 2020, GANs 2014, Sutton's essay 2019. Stable, but these are also
   the easiest facts to turn into L0 trivia — permitted as *context in a stem*,
   essentially never as the key.
4. **A structural constant of a framework.** CHC's ten cognitive domains, the six
   autonomy levels (0–5), the four takeoff factors (speed, continuity,
   homogeneity, polarity), the three escape routes for the data wall, the two
   Davidson feedback loops, the four scaling-law variables. These change only if
   the framework changes.
5. **A threshold that is definitional rather than measured.** The 80–90th
   percentile expert-parity threshold; AGI as 80–90% of domains; ASI as 95%+.
   These are the Atlas's own stipulations. Durable — but note that a question
   testing "is it 80–90 or 70–80" is L0 regardless of durability (§3.1). The
   durable/volatile axis and the level axis are independent.

**Budget: at most one durable figure load-bearing per section quiz (R11).**

### 5.4 Rewrite patterns

Five patterns for converting number-pinned to pattern-pinned. Each is illustrated
with a real question from the current file; §10 gives three of them in full.

**Pattern A — Magnitude band.** Replace a point figure with a band the refresh
cannot cross. Distractors become *other magnitudes*, which are conceptually
distinct rather than digit-distinct.

> Before: "It jumped from about 15% to about 74%"
> After: options are "roughly a fivefold increase inside about a year", "a gain
> of a few percentage points", "roughly a doubling over five years", "no
> reliable change once test contamination is controlled for"

The band survives the next SWE-bench update; the reader still has to know the
jump was dramatic and recent.

**Pattern B — Structure over magnitude.** Ask what the relationship *is*, not
what the numbers are. Effective compute is the canonical case: the durable claim
is that three factors **multiply** and that each can improve **independently**,
so the total compounds faster than any one input and no single bottleneck stops
it. That claim is true at 1.35x/2.3x/3x and equally true at whatever the 2027
edition says. Synthesis Q7 currently asks for the ranking of the three rates,
which is volatile *and* could reorder; the multiplicative structure cannot.

Careful: a **ranking** is only durable if the gaps are large and structural.
"Algorithmic 3x vs. chip production 2.3x" is a 30% gap between two tracker
estimates — do not build a question on that ordering. "Hardware efficiency is the
slowest of the three and also the one public discussion fixates on" is more
robust, but still prefer Pattern B's structural claim.

**Pattern C — Mechanism over magnitude.** Ask what produced the change rather
than how big it was. The SWE-bench jump is interesting because it came from
combining better models with *tool use and scaffolding*, not from a bigger base
model — which is the same claim `leveraging-scale.md` makes about unhobbling.
That mechanism claim is the thing worth knowing and the thing that survives.

**Pattern D — Conditionalize the figure into the stem.** Move the number into the
stem as a *given*, and ask what follows. The number becomes scaffolding rather
than the answer; when it refreshes, you substitute the new pair and the question
still works with no change to the options or the explanation.

> "Between 2024 and 2025, the fraction of real GitHub issues an AI system could
> resolve went from roughly a sixth to roughly three-quarters, while the
> underlying base model improved by far less than that. Which conclusion does the
> chapter's account of scaffolding best support?"

This is the single most useful pattern in this section. Prefer it whenever a
figure is genuinely striking and you want the reader to feel it.

**Pattern E — Invariant check.** Build the question on something the text
explicitly marks as stable. The introduction hands you the list: scaling laws,
emergent capabilities, the narrow→general shift. A question of the form "which of
these claims would still hold if every benchmark number in the chapter were
replaced by its 2027 value?" is itself an excellent L5 question and worth
including once in the review block.

### 5.5 Anti-pattern: the pseudo-durable hedge

Do not "fix" a volatile question by replacing "74%" with "about 74%" or "roughly
three quarters". A hedged volatile figure is still volatile if the distractors
are other figures. The test for R10 is whether the *discrimination* is numeric,
not whether the number is rounded.

---

## 6. Explanation quality

The `**Explanation**` field is the only teaching surface in the app. A reader who
got the question right skims it; a reader who got it wrong reads it carefully and
believes it. Write for the second reader.

**E1 — Length: 60–150 words (roughly 350–900 characters).** Under 60 words it
cannot do E3. Over 150 it becomes a section the reader skips, which defeats the
purpose. The current file's explanations mostly sit in band; the outliers are
Synthesis Q10 (too long, ~160 words) and Foundation Models Q1 (dense but fine).

**E2 — State why the key is correct, in one or two sentences, first.** Not "The
chapter emphasises that…" — just say the thing. The reader wants the claim, not
its provenance.

**E3 — Name at least one distractor and say specifically why it fails.**
This is the highest-value sentence in the field and the one most often missing.
It must identify the *misreading*, not just assert falsity. Good current example:

> The wrong answer reverses a key point — foundation models were specifically
> enabled by *not* requiring human-labeled data (using self-supervised learning
> instead).
> — Foundation Models Q4

For any question whose top distractor is a §4.2(c) pre-chapter prior, the
explanation **must** address that prior explicitly. That is the whole reason the
distractor is there.

**E4 — Cite the section, not the sentence.** One trailing reference of the form
`(Leveraging Scale → Scaling Hypothesis)` using the section file's own `##`
sub-headings. This lets a reader go back without giving away where to Ctrl-F
during the question (R6). Do not cite page numbers, paragraph numbers, or
external URLs — the source is versioned and both will rot.

**E4a — The sub-heading half must be validated at build time, and degrade
silently when it cannot be.** (Decided 2026-09-16.) Sub-headings are prose and
will churn in the text refresh, and a dead anchor does *not* announce itself:
`…/leveraging-scale#scaling-hypothesis` with a missing `id` returns HTTP 200,
renders the section correctly, and simply does not scroll. The reader lands at
the top of the right section and never learns they were pointed somewhere
specific.

So the checker owns this, not the reader:

1. Collect every `##`–`######` heading from the built section markdown.
2. Slugify with the Atlas's own function — mirrored exactly from
   `src/textbook-loader/utils.ts`, which is what
   `src/components/nodes/Heading.astro` uses to set each heading's `id`:

   ```js
   text.toLowerCase().trim()
       .replace(/[^\w\s-]/g, '')
       .replace(/\s+/g, '-')
       .replace(/-+/g, '-')
   ```

3. For each citation: if the anchor resolves, render the full
   `(Section → Sub-heading)` link. **If it does not, drop the sub-heading, keep
   the section link, and emit a warning naming the question and the dead
   anchor.** Never fail the build — an upstream heading rename should cost us a
   warning, not a broken quiz.

The accumulated warnings are the re-verification worklist for refresh day, and
double as a change-detector on Markov's rewrite.

*Status: all three citations currently in this document —
`(Current Capabilities → Tool Use)`, `(Forecasting Timelines → Training Data)`,
`(Leveraging Scale → Scaling Hypothesis)` — were checked against the built
chapter markdown on 2026-09-16 and all three resolve.*

**E5 — No "according to the chapter" in the explanation either,** except where
the point being made is genuinely about the Atlas's editorial position (e.g.
"the Atlas sets consciousness aside as not actionable, which is a scoping choice
rather than a claim that the question is unimportant").

**E6 — Volatile figures are welcome here.** The explanation is the right home
for "Claude 3 Opus solved 15% in 2024; Tools + Claude 4 Opus solved 74% in 2025"
once the question itself no longer depends on it. Mark them as of-their-moment:
"as of the 2025 edition" or "at the time of writing". A reader in 2027 then reads
a dated fact rather than a wrong one.

**E7 — Do not introduce a new claim the question did not test.** If the
explanation needs three sentences of background, the question was under-specified.

**E8 — The explanation must be true independently of the question.** Reviewers
should be able to read the explanation alone and find nothing false in it. A
plausible-sounding but wrong explanation is the single most damaging output this
pipeline can produce (§1, the asymmetry).

---

## 7. Free-response standards

Free-response items live under a `### Free Response N` heading with three
fields: `**Context**` (the evaluator rubric), `**Short Answer**` (a model
answer), `**Hint**`. They are graded by `functions/api/evaluate.js`.

### 7.0 The visibility constraint — read this first

`**Context**` and `**Short Answer**` ship inside a markdown file any reader can
fetch from `/questions/ch1-capabilities.md`. The evaluator's system prompt says
"never reveal the exact evaluation context/rubric"; that instruction is doing
nothing. **Write every free-response field assuming the reader can and will read
it before answering.**

This is a real design constraint, not a bug to route around:

- **F0a — The prompt must be worth answering even by a reader who has read the
  model answer.** A prompt whose only value is the reader not knowing the answer
  is a bad prompt. Prompts that survive: "construct the strongest case for X",
  "where does this framework break", "what would have to be true for Y". Prompts
  that do not: "what are the three escape routes for the data wall".
- **F0b — `**Context**` must be readable as a study guide.** Since the reader may
  read it, it should be written so that reading it teaches something. Write the
  checkpoints as claims, not as grader shorthand.
- **F0c — Never put anything in these fields you would not publish.** No "the
  student will probably miss X", no internal notes.

If the project later splits the rubric server-side (audit step 5, option b),
F0a still stands; F0b and F0c relax.

### 7.1 The prompt (F1–F5)

**F1 — Require a commitment, not a summary.** The reader must take a position,
draw a contrast, apply a framework to a case, or attack a claim. Banned opening
verbs: *summarize, describe, list, outline, explain what the chapter says about,
discuss the importance of.* Preferred: *construct the strongest case, critique,
apply, decide, what would have to be true, where does this break, which of these
two accounts better explains.*

**F2 — Answerable in 150–350 words.** State the target length in the prompt.
A prompt that invites 800 words will get 800 words of padding and will cost more
to grade. Current Free Response 3 ("construct the strongest case you can… drawing
on the material from the entire chapter") is the right *kind* of prompt but has
no length target and its Context lists five checkpoints plus sub-clauses — it is
asking for an essay.

**F3 — Require ≥2 sections for review-block prompts; ≥1 for section prompts.**
The value of free response over multiple choice is that it can test integration.
A single-section free-response question is usually a multiple-choice question
that has not been written yet.

**F4 — The prompt must have more than one defensible answer.** If there is one
right answer, use multiple choice — it is cheaper to grade and less frustrating.
Good free-response prompts have a correct *shape* and contested *content*.

**F5 — Do not ask the reader to speculate beyond the text's evidence.** "What do
you think will happen?" is not gradable. "Which of the chapter's two accounts of
takeoff would you bet on, and what evidence in the chapter moves you?" is.

### 7.2 `**Context**` — the evaluator rubric (F6–F8)

**F6 — At most 5 checkpoints, ordered by weight, each independently checkable.**
Write each as a short declarative claim the answer either contains or does not.
Avoid nesting and avoid "bonus if they also mention…" chains; if it is a bonus,
it is checkpoint 5.

**F7 — At least one checkpoint must credit a well-argued answer the chapter does
not contain.** Something like: *"Credit an answer that argues against the
chapter's framing, provided it engages the specific mechanism rather than
dismissing it."* Without this the rubric rewards fidelity to the text, which is
the free-response version of the recall failure. Current Free Response 1's
Context has four checkpoints and a bonus, all of them "did they say what the
chapter says" — it needs this clause.

**F8 — State what a *failing* answer looks like,** in one sentence. Evaluators
(model and human) calibrate much better with a negative anchor. E.g. "An answer
that restates the two axes without applying them to a case is incomplete, however
fluent."

### 7.3 `**Short Answer**` (F9–F10)

**F9 — 120–250 words, in the register of a strong student, not the textbook.**
It is a model answer, not a second explanation. It should be visibly the kind of
thing a person could write in ten minutes. Current Short Answers run long (Free
Response 3's is ~230 words and is about right; Free Response 2's is ~200 and is
good).

**F10 — Include at least one hedge or acknowledged limitation.** The model answer
teaches the reader what a good answer *sounds* like, and a good answer on this
material is not certain. Free Response 3's closing — "The honest answer is that
we don't know which scenario we're in" — is exactly right and should be the
house style.

### 7.4 `**Hint**` (F11–F12)

**F11 — One or two sentences, useful *before* the attempt.** It points at a
concept, analogy, or tension to think with. It must not contain any checkpoint
from Context. Free Response 2's hint — "Think about the car analogy from the
chapter — more cars, faster cars, more efficient driving. What happens if one
factor stalls but the others don't?" — is the model: it names the handle and
poses the question without answering it.

**F12 — A hint that gives away the answer is worse than no hint,** because the
reader will read it (it is right there) and then write the hint back. If in
doubt, make the hint a question.

### 7.5 Count

**Two to three free-response items for chapter 1, all in the review block.**
Optionally one per major section later. Three is the right number now — enough
to cover the chapter's three real arguments (what AGI means and why the
definition is continuous; why progress is fast and what would slow it; what
happens after). The current file's three prompts are already aimed at roughly
these three, which is the strongest thing about the existing set.

---

## 8. Coverage rules per section

### 8.1 How many questions

```
N = clamp(round(section_word_count / 500), 4, 10)
```

Applied to chapter 1:

| Section | Words | N | Notes |
|---|---|---|---|
| `introduction.md` | 605 | **0** | Framing only; see §8.4 |
| `current-capabilities.md` | 2,964 | 6 | |
| `foundation-models.md` | 1,575 | 4 | floor applies (3→4) |
| `defining-and-measuring-agi.md` | 3,837 | 8 | the conceptual core of the chapter |
| `leveraging-scale.md` | 2,206 | 4 | |
| `forecasting-timelines.md` | 1,881 | 4 | |
| `takeoff.md` | 2,496 | 5 | |
| **Section total** | | **31** | |
| Chapter review (MC) | — | 10 | ≥50% L4/L5 |
| Chapter review (FR) | — | 3 | §7.5 |
| **Total** | | **41 MC + 3 FR** | vs. 40 MC + 3 FR today |

The word-count formula is a starting point, not a quota. If a section yields only
five questions that clear §2–§5, ship five. **Under-filling is always preferable
to filling.** The failure mode this rule exists to prevent is a generator asked
for eight questions from a 1,500-word section, which will pad with L0 and L2.

### 8.2 Which ideas deserve a question

An idea in a section earns a question if it passes **at least two** of these:

1. **It is load-bearing later.** The capability/generality axes are used by every
   subsequent section and by chapters 2–4. The exact CHC domain list is not.
2. **The text spends structural effort on it** — a bolded lead sentence, a
   definition box, a dedicated `##` sub-heading, a figure caption that makes an
   argument, a named counter-argument block. These are the author's own signal
   about what matters.
3. **There is a specific way to get it wrong** that the text implicitly corrects.
   If you can write the misconception, you can write the question (§4.1).
4. **It is a distinction the reader will need to hold, not a fact they will need
   to have.** "Autonomy is separate from capability" is a hold; "there are six
   autonomy levels" is a have.
5. **It survives the refresh** (§5).

An idea that passes only criterion 2 is usually a definition — L2, budget-capped
at one per section.

### 8.3 What to do with ideas that do not earn a question

In order of preference:

1. **Fold it into a distractor.** This is the best home for near-miss material:
   the data overhang is less important than the hardware overhang, so it becomes
   the conflation distractor (§4.2a) in the hardware-overhang question rather
   than getting its own.
2. **Fold it into an explanation.** Colour, examples, the volatile figures from
   §5.2, the Kasparov quote, the KataGo footnote. Explanations are where chapter
   texture lives.
3. **Fold it into a review-block question** as one input to a multi-section
   synthesis.
4. **Drop it.** Explicitly and without guilt. A 2,500-word section does not owe
   the reader coverage of every paragraph; it owes them five questions that
   change how they think. The current file's weakest questions all exist because
   something in the section had not been "covered".

### 8.4 Per-section notes for chapter 1

- **`introduction.md` — no quiz.** 605 words, and every substantive claim in it
  is a forward reference that a later section states properly. The audit's step 6
  suggests restoring an Introduction quiz; this rubric recommends against it, and
  instead suggests taking the introduction's durability sentence as the
  epigraph for the review block. *Flagged as a judgment call — see the report.*
- **`current-capabilities.md`** is the highest-volatility section in the chapter
  and needs the most Pattern C/D work (§5.4). Its durable content is the
  *trajectory* claim ("the trajectory matters more than a snapshot"), the
  narrow→general progression, and the tool-use/inference-scaling mechanism. Its
  benchmark table is not.
- **`defining-and-measuring-agi.md`** gets 8 questions and should carry the
  chapter's L3 load — it contains at least six of the §3.4 discrimination pairs.
  Its counter-argument block (coverage bias / arbitrary thresholds / non-linear
  progress / species-specific risk) is the best L5 material in the chapter.
- **`leveraging-scale.md`** — the bitter lesson and the scaffolding/unhobbling
  distinction are the two durable ideas. Chinchilla is the chapter's one
  legitimate load-bearing durable figure; spend the R11 budget there or nowhere.
- **`forecasting-timelines.md`** is almost entirely volatile at the surface
  (growth rates, dates, dollar figures) and almost entirely durable underneath
  (effective compute as a product of independent factors; the data wall and its
  three escape routes; twelve orders of magnitude of anchor uncertainty; forecasts
  as consistency checks rather than predictions). This section needs the most
  aggressive §5.4 rewriting and should be re-read first after any text refresh.
- **`takeoff.md`** — the timelines/takeoff distinction, the exponential vs.
  superexponential classification (with the trap that constant-rate exponential
  counts as *slow*), overhangs, the two Davidson loops, and the Cotra delegation
  argument. Almost all durable.
- **Appendices** (`appendix-discussion-on-llms`, `appendix-expert-surveys`,
  `appendix-forecasting`, `appendix-takeoff`, 10,162 words): **no quizzes.** The
  text marks them optional. If any single one gets a quiz later, it should be
  `appendix-discussion-on-llms` (4,233 words, the most conceptually substantive),
  and it should be labelled optional in the UI.

---

## 9. Reviewer checklist

One screen. Use during the mandatory manual pass (audit step 4, ~an afternoon for
40 questions). Every box must be tickable, or the question does not ship.

**Per question — mechanics (10 seconds)**

- [ ] Exactly one `[x]`; 3–5 options; explanation present.
- [ ] Key length within 0.80–1.20× the mean distractor length; if it is the
      longest, by ≤15 chars.
- [ ] Stem contains no "according to the chapter" / "does the chapter" family.
- [ ] No figure decides the answer (or exactly one durable figure, and it is this
      section's budget).
- [ ] No "all of the above"; ≤1 absolute quantifier across all distractors;
      all options same grammatical type.

**Per question — substance (60–90 seconds)**

- [ ] **Cover test.** Cover the options. Could a reader who understood the section
      produce the key unaided? If not, it is recall or it is ambiguous.
- [ ] **Distractor walk.** For each distractor, say out loud the specific
      misreading that produces it. Any distractor you cannot finish that sentence
      for gets cut or replaced.
- [ ] **Cynic test.** Would a smart reader who skipped the chapter get this right
      from test-taking instinct alone? If yes, find the tell and remove it.
- [ ] **Level.** Assign L2/L3/L4/L5. Anything landing at L0 or L1 goes back.
- [ ] **Explanation.** True standalone; names at least one distractor's error;
      60–150 words; cites the sub-section; no new untested claims.
- [ ] **Refresh test.** If every benchmark number and model name in chapter 1
      changed next January, would this question still be correct?

**Per section (2 minutes)**

- [ ] At least one L5; L4+L5 ≥ 25% of the section; L2 ≤ 20%.
- [ ] ≤1 negation stem; ≤1 load-bearing durable figure.
- [ ] No two questions testing the same idea.
- [ ] Section count matches §8.1 or is *below* it for a stated reason.

**Per file (5 minutes, run the checker)**

- [ ] Key is longest in ≤35% of questions.
- [ ] Key is longest-or-shortest in ≤60%.
- [ ] Mean key length ÷ mean distractor length in 0.90–1.10.
- [ ] No duplicate stems; zero R5 regex matches.
- [ ] Review block ≥50% L4/L5.
- [ ] Free-response: §7.0 visibility constraint honoured on all three fields.

---

## 10. Worked before/after rewrites

Five real questions from `public/questions/ch1-capabilities.md`, quoted verbatim,
with the criteria they fail and a full replacement. These double as the seed
exemplars for pass-1 prompting.

---

### 10.1 Number-pinned → Pattern D (conditionalized)

**Fails:** R10 (volatile benchmark score load-bearing), D5 (three distractors are
digit-variants of the key), L0 (§3.1), D3 (distractor 3 is straw).

**Before — Current Capabilities, Question 5:**

```
### Question 5
How did AI performance on real GitHub issues (SWE-bench) change between 2024 and 2025?

- [ ] It improved from 5% to 25%, driven mainly by better prompting techniques rather than model improvements
- [x] It jumped from about 15% to about 74%, driven by combining better models with tool use
- [ ] It remained roughly the same at around 50%, suggesting GitHub issues require human-level understanding that current models lack
- [ ] It improved from 30% to 45%, with most gains coming from fine-tuning models specifically on open-source codebases
```

**After:**

```
### Question 5
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

**What changed.** The figures moved into the stem as a given (Pattern D) and
became approximations of a *ratio*, so a refreshed pair substitutes cleanly with
no change to the options. The discrimination is now between four accounts of
*why*. Options measure 113 / 109 / 106 / 106 chars: ratio 1.06, key longest by
4 chars — inside both R8 and R9. Note the key no longer says "what the chapter
calls scaffolding"; R5's logic applies to options as well as stems.

---

### 10.2 Length-tell → parity (keeping the level)

**Fails:** R8 (ratio 3.29 — key 214 chars vs. mean distractor 65), R9, D3
(distractors 1 and 4 are non-beliefs), D8 (distractor 1 is a meta-statement),
D10 (specificity mismatch). **Level is L5 and must be preserved** — this is the
best question in the file.

**Before — Synthesis: Cross-Chapter Multiple Choice, Question 4:**

```
### Question 4
If someone told you "AI has reached 57% AGI according to the framework in the chapter," which of the following critiques would the chapter itself consider valid?

- [ ] This is a perfectly precise and meaningful statement — no critiques apply
- [ ] The only issue is that 57% seems too high
- [x] The percentage can misleadingly imply linear progress when final capabilities may represent disproportionately hard bottlenecks, and CHC-based human tests may miss capabilities universal in humans but absent in AI
- [ ] The framework doesn't use percentages at all, so this statement makes no sense
```

**After:**

```
### Question 4
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

**What changed.** Options measure 147 / 144 / 144 / 132 chars — ratio 1.05, and
the key is longest by only 3 chars, inside R9's 15-char allowance. The three
distractors are now §4.2(b) scope-reversals that a reader who
half-understood the framework could genuinely hold, so the question discriminates
instead of pointing. The level is unchanged: the reader still evaluates a wild
claim against the framework's own limits. The other three limitations moved into
the explanation (§8.3.2), which is where the enumeration belonged.

---

### 10.3 Recall stem → discrimination

**Fails:** R5 ("according to the chapter"), L1 (§3.2), D3 (all three distractors
are straw), D4 (two carry absolutes), R14 (distractor 4 is a subset of the key).

**Before — Current Capabilities, Question 3:**

```
### Question 3
How did tool use change the performance of AI models, according to the chapter?

- [ ] Tool use made models slightly faster but did not improve accuracy, which is why most benchmarks don't distinguish between tool-assisted and unassisted runs
- [x] It significantly boosted performance, enough that companies began reporting benchmark scores separately with and without tools
- [ ] Tool use replaced the need for larger models entirely, since a small model with a calculator outperforms any large model without one
- [ ] Tool use was only beneficial for mathematical reasoning tasks, where calculators and code interpreters could verify symbolic computations
```

**After:**

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

**What changed.** The attribution clause is gone and the question no longer has a
"did you read it" answer. Options measure 134 / 150 / 124 / 132 chars — ratio
0.99, and the key is not the longest. All four
distractors are positions someone holds; distractor 3 is the pre-chapter prior
(§4.2c) that the explanation then addresses (E3). The question now sets up the
scaffolding idea two sections early, which is how L3 questions earn their place.

---

### 10.4 Enumeration → application

**Fails:** R8 (ratio 2.63 — key 128 vs. mean distractor 48.7), R9, D3 (all three
distractors are jokes), D7 (distractor spread), D9 (grammar mismatch), L2 at the
bottom of its band (§3.3).

**Before — Leveraging Scale, Question 2:**

```
### Question 2
What are the four key variables in scaling laws for AI models?

- [ ] Architecture, learning rate, batch size, and epochs
- [ ] GPUs, researchers, electricity, and time
- [x] Compute (total FLOPs during training), parameters (model size), data (training examples/tokens), and accuracy (inverse of loss)
- [ ] Pre-training, fine-tuning, prompting, and deployment
```

**After:**

```
### Question 2
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

**What changed.** The four variables now appear in the explanation where they
belong, and the question asks what the laws are *for* — a live decision with real
stakes, which is how the text introduces them. Options measure 107 / 130 / 122 /
116 chars: ratio 0.87, key is the shortest but by only 9 chars, inside R9. Note
that the key is now the *shortest* option and the question is still sound; the
instinct to make the key the most detailed option is what produces the 1.39
baseline, and detail belongs in the explanation. The Chinchilla figure is
non-load-bearing colour there, consistent with R11.

**A caution on all five rewrites.** Every one of these landed inside R8/R9 only
after being measured and adjusted. None was inside the band on the first draft.
Treat the arithmetic as a step in the process, not a property that good writing
produces on its own — that assumption is exactly what commit `8e3208a` acted on.

---

### 10.5 Date-pinned → structure (Pattern B)

**Fails:** R10 (a forward-looking window whose lower bound is already past),
D5 (distractors are date-variants), L0/L2 boundary, D4 (two distractors carry
absolutes: "already exhausted", "never run out", "effectively unlimited").

**Before — Forecasting Timelines, Question 3:**

```
### Question 3
According to the chapter, approximately when might high-quality public text data be exhausted at current scaling rates?

- [ ] It was already exhausted by 2023, which is why recent models rely primarily on synthetic and multimodal data for pre-training
- [x] Between 2026 and 2032, given ~500 trillion tokens on the indexed web and ~4x yearly consumption growth
- [ ] Not until at least 2050, because new content is published online faster than models can consume it during training
- [ ] Text data is effectively unlimited and will never run out, since the internet grows exponentially alongside model demand
```

**After:**

```
### Question 3
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

**What changed.** No date is load-bearing, so the question survives both the
refresh and the passage of time. The reader now has to understand *why* a
forecast is a range — which is the section's own stated purpose ("not as concrete
predictions of timelines; but instead as scenarios that help you reason about
different potential futures"). Options measure 130 / 132 / 128 / 130 chars —
ratio 1.00, the tightest set in this document. All four distractors are causal
claims of the same kind, so no grammar or length tell. The 500-trillion-token figure and the three escape routes moved to the
explanation as dated colour (E6).

---

## Appendix A — Baseline measurements (current file, 2026-09-16)

> **Note on question labels.** All questions quoted in this document are cited by
> the heading they sat under at the time of measurement, including
> `# Synthesis: Cross-Chapter Multiple Choice` and
> `# Synthesis: Free Response Questions`. Those two headings have since been
> renamed to `# Chapter Review: Multiple Choice` and
> `# Chapter Review: Free Response` (fixing the `/review/i` parser gap — audit
> item 6). The question text and all measurements below are unaffected; only the
> heading changed. "Review block" throughout this document means those two
> sections.

Measured over the 40 multiple-choice questions in
`public/questions/ch1-capabilities.md`. Reproduce before and after any content
change; these are the numbers the checker script (audit step 2) should print.

| Metric | Value | Gate | Status |
|---|---|---|---|
| Multiple-choice questions | 40 | — | — |
| Key is the longest option | 24 (60%) | ≤35% | **fail** |
| Key is the shortest option | 6 (15%) | — | — |
| Key is longest *or* shortest | 30 (75%) | ≤60% | **fail** |
| Mean key length | 149.3 chars | — | — |
| Mean distractor length | 107.5 chars | — | — |
| Ratio of means | **1.39** | 0.90–1.10 | **fail** |
| Stems matching the R5 regex family (narrow) | 12 (30%) | 0 | **fail** |
| Stems containing "chapter" at all | 16 (40%) | 0 | **fail** |
| Keys carrying a figure in the option text | 6 (15%) | 0 volatile | **fail** |
| Questions whose answer turns on a number (audit count, incl. distractor-side) | 9 (23%) | — | — |
| Distractors with a strict absolute quantifier | 22 / 120 (18.3%) | — | — |
| Keys with a strict absolute quantifier | 3 / 40 (7.5%) | — | — |
| Absolute-quantifier enrichment in distractors | 2.4× | — | tell present |

Worst per-question length ratios (key ÷ mean distractor):

| Question | Key | Distractors | Ratio |
|---|---|---|---|
| Defining and Measuring AGI Q3 | 247 | 36, 46, 65 | **5.04** |
| Synthesis Q3 | 259 | 100, 41, 72 | **3.65** |
| Synthesis Q4 | 214 | 74, 42, 79 | **3.29** |
| Forecasting Timelines Q2 | 181 | 50, 52, 59 | **3.37** |
| Synthesis Q7 | 189 | 61, 57, 63 | **3.13** |
| Defining and Measuring AGI Q5 | 184 | 70, 72, 52 | **2.84** |
| Leveraging Scale Q2 | 128 | 52, 41, 53 | **2.63** |
| Synthesis Q1 | 168 | 58, 59, 75 | **2.63** |
| Takeoff Q2 | 142 | 75, 76, 38 | **2.25** |

Cleanest — already inside the R8 band and usable as mechanical exemplars
(key ÷ mean distractor):

| Question | Key | Distractors | Ratio |
|---|---|---|---|
| Takeoff Q1 | 128 | 118, 120, 138 | 1.02 |
| Synthesis Q8 | 148 | 147, 124, 151 | 1.05 |
| Synthesis Q9 | 135 | 141, 150, 133 | 0.96 |
| Current Capabilities Q1 | 107 | 122, 105, 131 | 0.90 |
| Foundation Models Q1 | 92 | 124, 122, 72 | 0.87 |
| Synthesis Q2 | 182 | 130, 131, 141 | 1.36 (fails, but closest of the good-level ones) |

Pass rates on the length criteria across the current 40:

| Criterion | Pass |
|---|---|
| R8 alone (ratio 0.80–1.20) | 17 / 40 (43%) |
| R9 alone (extremum guard, ≤15 chars) | 20 / 40 (50%) |
| R8 + R9 + the 1.6× spread rule | **12 / 40 (30%)** |

So roughly **28 of the current 40 questions need option-length surgery** before
anything else about them is considered. That is the single largest block of work
implied by this rubric, and it is entirely mechanical.

## Appendix B — Stem phrasings

**Blacklisted** (R5): *according to the chapter / text / section*; *what does the
chapter identify as*; *why does the chapter argue*; *the chapter describes /
states / presents / lists*; *as discussed in the chapter*; *in the chapter's
framework* (prefer naming the framework).

**Preferred openings, by level:**

- L3: *What distinguishes X from Y?* · *Which of these is true of X but not Y?* ·
  *A reader claims X and Y are the same thing. What do they miss?*
- L4: *A system does [description]. How would the framework classify it?* ·
  *Given [scenario], which outcome follows?* · *Which of these would count as
  evidence for X?*
- L5: *Someone claims [claim]. Which objection has the most support?* · *These two
  ideas appear to conflict: [A], [B]. What resolves it?* · *What would have to be
  true for [position] to hold?* · *Which of these claims would survive if every
  benchmark figure in the chapter were replaced with its current value?*

## Appendix C — Change log

| Date | Change |
|---|---|
| 2026-09-16 | Initial version. Thresholds in §2.3 calibrated against the 40-question baseline in Appendix A. |

**When the Atlas text refreshes (expected Dec 2026 – Jan 2027):** re-run the
checker, then re-read every question whose explanation carries a dated figure
(E6) and every question in `forecasting-timelines` and `current-capabilities`.
If any §2.4 violation is found, it means a question shipped with a volatile fact
load-bearing — record it here so the thresholds can be tightened.
