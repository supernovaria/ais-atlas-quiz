# Free-recall probe on the six shipped P1 questions

2026-09-20. Six haiku calls. The cheapest test that bears on the question the
adversary numbers could not settle: **do these questions leak, or does the
adversary already know the material?**

## Method

Each shipped stem given to a toolless `haiku` with **no options at all** — no
lengths, no register, no positions, nothing to eliminate against. Free text, one
or two sentences, "I DON'T KNOW" permitted. Whatever it gets right is domain
knowledge. Same protocol as `runs/baseline/stem-only/`, which ran it over the 40
shipped questions.

**No stem was adapted.** All six are self-contained scenarios asking a genuine
open question. The baseline had to reword 8 of its 40, because "which of the
following is NOT listed" has no content without its list. This probe is
therefore cleaner than the baseline's, not dirtier.

Graded by the orchestrator against the key's load-bearing claim, with every
answer recorded verbatim in `answers.json` so the grading is auditable and can
be overturned.

## Correction, 2026-09-23

The table below sets the multiple-choice score beside the free-recall grade for
each question. **For `a03r` those are two different questions.** The MC 3/3
was measured on the original `a03r`; a critic re-spawn later replaced it (the
two share 0 of 4 option texts), and this probe graded the replacement. The
current `a03r` has not been through the multiple-choice adversary at all. The
other five rows compare like with like. The AGI column's conclusion — two of
three answerable from the stem alone — rests on `w04r` and `w07r` and does not
depend on `a03r`.

## Result

| | `defining-and-measuring-agi` | `forecasting-timelines` |
|---|---|---|
| multiple-choice adversary | **100%** (9/9) | 78% |
| free recall, no options | **2 match, 1 partial** | 1 partial (borderline), 1 idk, 1 protocol refusal |

All three AGI questions were substantially answerable **with no options in front
of the model at all**. `w04r` in particular came back with both load-bearing
elements of the key, unprompted.

## What it says, and what it does not

**It supports the knowledge explanation for AGI's 100%, and undercuts the leak
explanation for those three items.** If a model can produce the key's content
from the stem alone, no option set is required to explain its picking the key.

**It does not show the option sets are clean.** Both things can be true at once:
a question can be independently knowable *and* leaky. What the probe establishes
is narrower and should be stated that way — the leak hypothesis is not *needed*
to account for AGI's score.

**It reverses a claim made in the window-4 report.** The pilot analyst suggested
`forecasting-timelines` might simply be less publicly rehearsed material rather
than structurally less guessable. I dismissed that on the grounds that AGI
"measured worse", which was backwards reasoning: more rehearsed material predicts
a *higher* multiple-choice score, so AGI scoring higher is exactly what the
analyst's explanation predicts. This probe measures the knowledge directly and
finds AGI the better-known of the two sections, in the direction the analyst
proposed. The analyst was right and my dismissal was wrong.

**n = 3 per section.** Three questions is not a section and six is not a
pipeline. Every number here is an observation, not a rate.

**Two of six spawns broke protocol.** `c01r` refused to answer at all, citing its
own brief's "question and options alone" instruction and asking for options A–D;
`a01r` declined partly on the same grounds. `quiz-adversary` is specialised to
multiple choice and resists being used for free recall. The baseline run did not
hit this. Graded `protocol_refusal` separately from `idk`, because folding a
format refusal into a knowledge refusal would overstate the evidence for
ignorance — and it means the forecasting-timelines column is weaker evidence
than it looks.

**One grade is borderline** and flagged as such in `answers.json`: FT `a03r` gets
the decomposition of effective compute but not the load-bearing claim that the
terms are *multiplied*, so one can grow while the others sit still. A grader who
counted the decomposition alone would call it a match.

## What still needs the fiction run

This probe cannot separate "the model knows the material" from "the questions are
clean" in general, because both sections are summaries of public material the
model has read. Only content no model can know does that, with the whole pipeline
run over it — `docs/FICTION-CONTROL-PROMPT.md`, still unrun.
