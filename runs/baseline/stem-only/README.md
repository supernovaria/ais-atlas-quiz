# Stem-only probe — is the adversary's 98.3% knowledge, or tells?

2026-09-19. Step 2 of the tier-4 saturation plan. Cheapest available diagnostic:
40 calls, no new agent, no authoring.

## Method

Each of the 40 stems from `public/questions/ch1-capabilities.md` was given to a
`haiku` agent **with no options at all** — no list to choose from, so no lengths,
no positions, no register, no absolute-quantifier tells, nothing to eliminate
against. Free-text answer, one or two sentences, "I DON'T KNOW" permitted. No
tools (verified: every spawn reported `tool_uses: 1`, the handback only).
Whatever it gets right is pure domain knowledge.

Graded against the key by the orchestrator, four ways, with every answer recorded
verbatim in `answers.json` so the grading is auditable:

- `match` — contains the key's load-bearing claim
- `partial` — overlaps but misses a load-bearing element
- `miss` — answers, but wrongly
- `idk` — declined

**8 of the 40 stems were adapted**, flagged `"adapted": true` in `answers.json`.
"Which of the following is NOT listed…" has no content without its list, so those
were reworded into the open question they imply. That is itself a finding (below).

## Result

| | n | share |
|---|---|---|
| `match` | 24 | 60.0% |
| `partial` | 7 | 17.5% |
| `miss` | 5 | 12.5% |
| `idk` | 4 | 10.0% |
| **knows it** (match + partial) | **31** | **77.5%** |
| **strict** (match only) | **24** | **60.0%** |
| *MC adversary, same 40 questions* | *39/40 flagged* | *98.3%* |

## What it says

**Neither of the two predicted outcomes.** The plan anticipated ~95% (saturation
is knowledge, tier 4 cannot work on this material) or ~40% (the knowledge reading
is wrong). The answer is in between, and the gap is the finding:

- **Most of the saturation is knowledge.** 77.5% of these questions the model can
  answer with no options in front of it. It reproduced Chinchilla's ~20 tokens per
  parameter from memory, named all four scaling-law variables, and gave the
  timelines-vs-takeoff distinction — `Takeoff Q1`, RUBRIC §3.4's exemplar — almost
  verbatim. For that bulk of the file, tier 4 as specified cannot work: withholding
  the chapter withholds nothing, because the chapter summarises material the model
  absorbed from its sources.
- **But a real residual remains: ~21 points loose, ~38 strict.** That gap is
  options doing work knowledge did not, and it is enumerable rather than
  statistical. **Eight questions the MC adversary hit 3/3 while free recall
  failed outright:**

| question | free-text failure | MC |
|---|---|---|
| `Current Capabilities Q5` | idk — cited a Feb-2025 cutoff on the SWE-bench figures | 3/3 |
| `Foundation Models Q2` | miss — said "transformer architecture"; key is self-supervised learning | 3/3 |
| `Leveraging Scale Q4` | **I DON'T KNOW** — strong vs weak scaling hypothesis | 3/3 |
| `Leveraging Scale Q5` | miss — never mentioned scaffolding/unhobbling, the key | 3/3 |
| `Forecasting Timelines Q4` | miss — said 4–6 orders of magnitude; key is twelve | 3/3 |
| `Forecasting Timelines Q5` | miss — named the key *as* a genuine escape route | 3/3 |
| `Chapter Review Q5` | **I DON'T KNOW** — autonomy levels vs capability/generality | 3/3 |
| `Chapter Review Q7` | **I DON'T KNOW** — the three growth rates as of 2025 | 3/3 |

  On these eight the adversary answered correctly three times out of three while
  demonstrably not knowing the answer. Something in the option sets is supplying
  it. That is what a planted-tell control set (step 3) would calibrate, and these
  eight are its target list — you no longer need to guess where to look.

- **One convergence worth trusting.** `Chapter Review Q8` is the only question the
  MC adversary failed (1/3) and it is also a free-recall miss. The two
  instruments agree on the single item that genuinely requires the text. That is
  weak evidence the MC measure is not pure noise — it has one true negative.

## Two incidental findings

1. **`Forecasting Timelines Q5` is confirmed broken, by its own rubric.** Asked
   openly what the escape routes from the data wall are, the model listed
   "licensing private datasets and premium content" — which is precisely the key,
   i.e. the option the chapter does *not* list. RUBRIC R13 already says of this
   question: the key "is not wrong, it is just not one of the three the text
   lists. That is an enumeration-completeness test, i.e. recall." The probe
   confirms it empirically: in the world the key is true, and only absence from
   the text makes it the answer.

2. **`Takeoff Q2` walked into the trap the rubric names.** RUBRIC §3.5 warns that
   "constant-rate exponential growth is slow takeoff in this framework, which
   surprises most readers." Free recall said slow takeoff is "linear or
   sub-exponential" — surprised exactly as predicted. The MC form still scored a
   hit, because the key was the only option describing an increasing rate. A
   question can measure a real misconception and still be crackable.

## Caveat that belongs in the findings

Any adversary figure on introductory summary material is inflated by
construction, and this probe quantifies by how much rather than removing it.
Chapter 1 summarises published work; the instrument cannot separate "the question
leaks" from "the reader already knows this" on material like that. The human
cover/cynic tests in RUBRIC §9 carry that load, which is where the rubric put
them before tier 4 existed.

## Files

- `stems.json` — the 40 stems and keys as extracted by `quizParser`
- `answers.json` — every verbatim answer, verdict, and grading note
