# Fiction control — does the pipeline produce guessable questions, or does the adversary just know the material?

Hand this file to a fresh orchestrator session. It is self-contained.

## Why this run exists

Three adversary measurements exist and none of them can answer the question
they were built to answer:

| set | adversary hit rate | over chance |
|---|---|---|
| the 40 questions currently shipped | 98% | +0.73 |
| `forecasting-timelines`, P1 | 78% | +0.53 |
| `defining-and-measuring-agi`, P1 | 100% | +0.75 |
| `runs/tier4-control`, **clean** group (fabricated, no planted tell) | 40% | +0.15 |

The three real sections are all far above chance. Two explanations fit equally
well and **nothing measured so far separates them**:

- **(a) The questions leak.** Something in the option sets identifies the key
  to a reader who has not read the chapter.
- **(b) The adversary already knows the answers.** Capability-versus-autonomy,
  adaptability-versus-brute-force, continuum-versus-threshold are standard,
  heavily rehearsed AI-safety doctrine. A model that has read the public
  internet knows them without reading this chapter.

Explanation (a) is a defect in the pipeline. Explanation (b) means the gate is
measuring the model's education, not the pipeline's output, and the number is
close to meaningless as a quality signal.

**Why the existing control does not settle it.** `runs/tier4-control/` is
fabricated content, which is the right idea, but its 20 items were *written by
hand by the orchestrator* with tells planted deliberately, one property at a
time. It measures *what a given tell is worth* — length +68 points, hedging
+62, absolutes +42. It never ran the analyst, the generator or the critic. It
therefore says nothing about what this pipeline naturally produces.

What it does give you is the **floor**: fabricated content, no planted tell, no
possible domain knowledge, and the adversary still scores **40%**. A four-option
question carries roughly a 15-point inference premium over 1/k chance. 40% is
the number to compare against, not 25%.

**One finding to be aware of before you start.** The three
`defining-and-measuring-agi` questions that scored 100% are clean on every
property the checker can measure: length ratios 0.98/1.00/0.99 with the key
neither longest nor shortest, zero hedge asymmetry, no absolute quantifiers. So
if explanation (a) is right, the leak is *semantic* and sits outside the entire
current measurement space. A contrastive-asymmetry hypothesis was tested against
the control group and found no signal (n=5); do not re-run it without more data.

## Pre-register the interpretation before you run anything

Write these into `run.log` **first**, so the result cannot be rationalised after
the fact. Compare against the 40% fiction floor, not 25%.

| fiction-run result | reading | what follows |
|---|---|---|
| **≈40%**, within a few points | The pipeline does **not** produce structurally guessable questions. The real sections' 78–100% is domain knowledge. | The adversary gate as currently anchored measures the adversary's education. It cannot be used as a quality gate on real material without a knowledge control alongside every run. This is the most likely outcome and the most consequential. |
| **meaningfully above 40%** (say ≥55%) | The pipeline itself leaks, semantically. | Highest-priority defect in the project. Diff the fiction questions the adversary hit against the ones it missed and characterise the difference; that comparison is clean, because knowledge is zero on both sides. |
| **≈25%** | The pipeline's questions are *tighter* than the hand-authored control items. | The 40% floor is an artefact of how those 20 items were written, not a property of four-option questions. Re-anchor the gate. |

State the confidence interval in the same sentence as the point estimate. At
10 questions × 3 seeds = 30 trials, the 95% interval on a 40% estimate is
roughly ±18 points. That is wide enough that "≈40%" and "≈55%" may not be
distinguishable, which is the honest limit of a run this size — say so rather
than reporting a bare percentage.

## The run

Label it `runs/2026-09-20-FICTION/`. Target **N = 10** questions.

### 1. Fabricate the section

Spawn a general-purpose agent (**not** `quiz-section-analyst`), sonnet or opus.
It writes `runs/2026-09-20-FICTION/passage.md`, ~1200–1800 words, in the Atlas's
register: conceptual prose with sub-headings, a couple of named figures, a
worked example.

The design constraints are the whole experiment, so give them verbatim:

- **Invent the domain.** New terminology, new named researchers, new framework.
  Do not reuse `runs/tier4-control/passage.md`'s Vantine/korrel material — the
  adversary should be assumed to have no exposure, and reusing it risks
  contamination if any of it leaked into a prior context.
- **It must not be an analogy.** If the invented framework maps one-to-one onto
  a real one — if `korrel` is transparently "accuracy" and the argument is
  transparently the bias–variance tradeoff — then a reader reasons about the
  real thing and the control is void. Ask explicitly for a structure with no
  clean real-world counterpart.
- **At least four load-bearing claims must be counterintuitive**, such that the
  sensible-sounding answer is wrong. This is the sharpest instrument you have.
  The 40% floor exists because a reader can infer which option a textbook would
  call "most dangerous"; a passage that punishes that inference is what tests
  whether the pipeline's questions depend on it.
- **It must be internally consistent and genuinely inferable** from the text —
  a reader who reads it carefully must be able to answer questions about it.
  Incoherent prose would produce unanswerable questions and a spuriously low
  adversary score, which would look like success and mean nothing.
- Include material for discrimination pairs: at least three pairs of concepts a
  careless reader would conflate.

Then **verify it yourself** before spending anything downstream. Read it and
write into `run.log`: which claims are counterintuitive, and whether any part of
it is a thin renaming of something real. If it is, re-spawn once with that
feedback. A bad passage invalidates every number that follows it.

### 2. Run the real pipeline, unmodified

This is the point of the exercise — the stages must be the ones that produce
real sections, with no special handling:

1. `quiz-section-analyst` → `concept-map.json`.
2. `quiz-generator`, sonnet, **whole-section** (sharding was dropped after it
   lost the A/B): 2 calls × 10 candidates → pool ~20.
3. `pipeline.mjs merge · dedupe · measure · queue`.
4. `quiz-critic`, **opus, one candidate per spawn**, down `queue.json` in
   coverage order. Budget: this is the expensive stage at roughly 7–14 window
   points per call. Ten calls is most of a 5-hour window. If you cannot afford
   ten, take fewer and say so — the queue is coverage-ordered, so a truncated
   prefix is still a spread.
5. `pipeline.mjs merge` again to promote rewrites, then `measure`.
6. `pipeline.mjs shuffle --seeds 3 --ids <critic survivors>`.
7. `quiz-adversary`, **haiku, toolless, one question per spawn**, 3 seeds.
8. `pipeline.mjs score`.

### 3. The rules that make it a control

- **The adversary must never see `passage.md`.** Not as a file path, not as
  context, not in a summary. Paste the shuffled prompt text inline into the
  spawn, exactly as the real runs do. Confirm `tool_uses: 0` on every reply and
  record it; that check has held for three windows and is what makes the
  isolation claim true rather than assumed.
- **Do not tune the passage after seeing adversary results.** If you rewrite the
  fiction to make the adversary do worse, you have measured your own editing.
- **Do not hand-write or hand-fix any question.** Same standing rule as every
  other run.
- Record the adversary model and that it was not upgraded. A stronger adversary
  would change the knowledge term, which is the variable under test.

### 4. Also worth harvesting while you are there

The fiction run is the only setting where these are cleanly measurable, so take
them even though they are not the primary question:

- **Does the critic behave the same on content it cannot know?** Nine of nine
  real candidates came back `rewrite` across two sections — no `pass`, no
  `reject`, ever. If fiction produces the same monoculture, the verdict field is
  degenerate by design rather than by content.
- **Does the generator claim the same levels?** Level over-claiming was
  generator-wide on real sections (two L5 claims both downgraded to L3).
- **Does `dedupe` fire?** It collapsed 1 of 21 with two independent arms.

## Deliverable

`runs/2026-09-20-FICTION/REPORT.md`, one screen: the pre-registered table with
the actual number filled in, the interval, which reading it selects, and the
three secondary observations. Then stop. Do not change the rubric or the gate on
the strength of one run of ten questions — write down what it implies and let a
human decide.
