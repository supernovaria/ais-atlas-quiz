# Chapter 1 multiple-choice quiz — the plan

> Written 2026-09-18. Synthesises `ATLAS_HANDOFF.md` (B4/B5), `QUIZ-NEXT-STEPS.md`
> (steps 0–9), `atlas-podcast/DECISIONS.md` (moved there 2026-09-18), `README.md` and
> `ais-atlas-quiz/docs/RUBRIC.md` into one ordered plan.
>
> **Scope of this document: the multiple-choice quiz for chapter 1, and nothing
> else.** Free response, the freshness sweep (NEXT-STEPS step 10), the pace
> exhibit (step 11) and the upstream integration decision (B5) are all deferred
> by name at the end. They are not cancelled; they are not in the way.

---

## The goal, in one sentence

Replace the 40 ad-hoc multiple-choice questions in
`public/questions/ch1-capabilities.md` with ~41 questions that were generated
against `RUBRIC.md`, measured by a checker, read by a human, and produced by a
process that can be re-run — so that the README can drop the line "Questions are
AI-generated placeholders for demonstration purposes" truthfully.

**Definition of done.** All of:

- `scripts/check-questions.mjs` exits 0 on `public/questions/ch1-capabilities.md`.
- Set-level gates met: key-is-longest ≤35%, key-is-longest-or-shortest ≤60%,
  mean-key ÷ mean-distractor within 0.90–1.10, zero R5 regex matches.
- Adversary hit rate (Haiku, chapter withheld, options only) at or near the 25%
  chance baseline — call the gate **≤40%**, against today's ≥60%.
- Every question has been read by Em against the §9 reviewer checklist.
- The generator prompt, the critic prompt, the rubric and the checker are all
  committed files, not chat history.

---

## Decisions this plan takes

Carried forward from the source documents, plus four new ones marked **new**.

| | Decision |
|---|---|
| 1 | Deep on chapter 1; 6 section quizzes + 1 chapter review. No appendices, no introduction quiz. |
| 2 | **Regenerate, do not repair.** **new** — see below. |
| 3 | Rubric → checker → pilot generation → rubric revision → full generation → manual review. One explicit iteration point, not a loop. |
| 4 | **Build the checker now, before any generation.** **new** — the "rubric first, checker second" caution in NEXT-STEPS step 2 was written when no rubric existed. It exists now and its thresholds are concrete numbers (§2.3.1, §5.2, D4). Nothing is left to bake in wrongly. |
| 5 | Generator: Opus 5 and Fable 5.1, half the candidates each. Critic: strongest available at `xhigh`/`max`. Adversary: Haiku 4.5, thinking off. |
| 6 | `output_config.format` structured outputs everywhere. No forced tool use — it is rejected on Fable 5.1 and would pin the pipeline to one model family. |
| 7 | Gemini stays manual: a hostile read of the rubric, and a second opinion at review. Not a pipeline dependency. |
| 8 | Manual review of every question is non-negotiable and is the last gate. |
| 9 | **Pilot sections are `forecasting-timelines` (4 questions) and `defining-and-measuring-agi` (8).** **new** — see phase 4. |
| 10 | **Sub-heading citations stay, with build-time validation and silent degradation** (RUBRIC E4a). Confirmed, not reopened. |

### Why regenerate rather than repair

The rubric's own Appendix A settles it. Of the current 40 questions, **12 pass
the length criteria and 28 need option-length surgery before their content is
even considered**. Separately, 16 of 40 stems (40%) carry recall framing that
R5 rejects outright, and 9 questions turn on a figure that R10 rejects. The
overlap is not total, so repairing means touching well over 30 of 40 questions
at the level of individual option wording — which is writing them again, but
starting from a bad draft and with no generator prompt to improve afterwards.

Regeneration also produces the thing that is actually missing. The audit's
finding #1 is that the current questions "happened in chat and left no artifact."
Repairing them by hand reproduces exactly that failure.

**Keep, do not regenerate:** the handful of questions the rubric itself praises —
Takeoff Q1 (L3, ratio 1.02, the cleanest set in the file), Chapter Review Q2
(L4), Q4 (L5, "the best question in the file"), Q6, Q8, Q9. These go into the
exemplar set in phase 2, some verbatim and some with the §10 mechanical fixes
applied. They are seeds for the generator, not survivors of a cull.

---

## Phase 0 — Unbreak the repo — DONE 2026-09-18

The working tree had been left in a half-moved state, and `RUBRIC.md` was not
committed anywhere: ~82 KB of the most valuable work in the project existed in
exactly one untracked copy on one disk.

What had happened: `src/`, `public/`, `functions/`, `docs/`, `dist/` and
`node_modules/` were moved one level down into `ais-atlas-quiz/ais-atlas-quiz/`,
while `package.json`, `index.html`, `vite.config.js`, `eslint.config.js`,
`README.md` and `DECISIONS.md` stayed at the root. Git reported **254 deletions
and one untracked directory**. The nested folder also held an empty `.git/`,
which is why git treated it as an opaque blob rather than listing its contents.

**The 254 deletions were the nesting accident and nothing else.** Verified file
by file before touching anything: every one of the 254 had a counterpart in the
nested tree, 165 byte-identical and 89 differing only in line endings
(`core.autocrlf=true`, so the working copies carry CRLF and the blobs are LF —
a difference git normalises away on commit). Zero content differences, zero
missing. Arithmetic closes exactly: 254 deleted + 9 that stayed at the root =
263 = the file count of `HEAD`. The only thing in the nested tree that was not
already in `HEAD` was `docs/RUBRIC.md`.

Done:

1. Removed the empty nested `.git/`, moved the six directories back up. `git
   status` went from 254 deletions to clean — confirming the diagnosis.
2. `0cc7120 docs: add the question-quality rubric`.
3. `889e735 docs: move the audio pipeline decisions to atlas-podcast`, paired
   with `c024620` in `atlas-podcast`. `DECISIONS.md` documents `pipeline.py`,
   not the quiz.

Still open:

- **Push `ais-atlas-quiz`** to `github.com/supernovaria/ais-atlas-quiz`. Until
  this happens the rubric is committed but still on one disk.
- **`atlas-podcast` has no remote at all.** It is a local-only repo holding
  `pipeline.py` and now `DECISIONS.md`. Give it one.
- **Three worktrees** `ais-atlas-quiz-agent{1,2,3}` on branches
  `quiz/agent-{1,2,3}`, all sitting on `68338ee` — a duplicate of `b384393`
  with the same message. If they hold nothing, `git worktree remove` all three
  and delete the branches; they will otherwise be mistaken for live work.

---

## Phase 1 — Freeze the rubric

`RUBRIC.md` is drafted and internally consistent. It needs two things before it
governs a spend.

**1a. Hostile read.** Paste the whole document into Gemini (this is the free,
manual use decided in NEXT-STEPS step 3) and ask it to attack the thresholds:
which criteria are unenforceable, which would reject a good question, which two
criteria can be satisfied only by violating a third. Specific things to point it
at:

- **R8 + R9 + the 1.6× spread rule together.** These are tight. A question whose
  key needs a three-clause qualification cannot satisfy R8 without either padding
  the distractors (which the rubric forbids at R8's own closing note) or moving
  the qualification into the explanation (which may make the key ambiguous). Ask
  for a case where all three cannot be satisfied at once.
- **The failure mode the length gates create.** Forcing four options into a
  ±20% band pushes a generator toward four options that are the same length,
  the same shape, and the same register — trading a length tell for uniform
  blandness that is harder to read and no more discriminating. The rubric has no
  gate against this. The adversary check (phase 3, tier 4) catches it only
  indirectly.
- **D12's plausibility floor vs. D3's straw ban.** D3 bans distractors nobody
  would pick; D12 wants a ~55–70% key rate, which implies distractors that
  *some* readers pick. Neither is measurable before the app collects selection
  rates. Ask whether the reviewer can actually apply them.
- **§3.7's hard bound "L5 ≥ 1 question, always"** against §8.4's note that
  `foundation-models` may not support one.

**1b. Em signs off** on the seven judgment calls already tabulated in
NEXT-STEPS step 1, incorporating whatever 1a turns up. The recommendation on all
seven is "accept"; the only one with a live cost is #7 (sub-heading citations),
which is already decided.

Output: `RUBRIC.md` v2, committed, with a row in Appendix C's change log.

---

## Phase 2 — The gold exemplar set

`docs/EXEMPLARS.md`. **8–10 questions**, each one a question the pipeline should
be proud to produce. This is the single highest-leverage artifact after the
rubric, because it is what pass 1 is actually shown.

Composition:

- **5 from RUBRIC §10** — the worked before/after rewrites are explicitly
  intended to seed this (10.1 number-pinned → Pattern D; 10.2 length-tell →
  parity; 10.3 recall stem → discrimination; 10.4 enumeration → application;
  10.5 date-pinned → structure). Lift the *afters*.
- **1–2 kept verbatim from the current file** — Takeoff Q1 as the L3 model
  (ratio 1.02), Chapter Review Q4 with its §10.2 length fix applied as the L5
  model.
- **3 written fresh**, to cover levels the above leave thin. The rubric hands
  you the material: an L4 from §3.5's seed list (classify a described system on
  the AGI/TAI/ASI definitions — the TAI definition admits the shape and the AGI
  definition does not), an L5 from §3.6's seed list (the bitter lesson vs. "5–40%
  of gains came from algorithms" — resolved by general-methods-that-unlock-scale
  vs. task-specific encoded knowledge), and one Pattern B durability rewrite on
  effective compute.

Each exemplar carries, in the file but stripped before shipping:

- its level (L2–L5),
- its measurements (key length, distractor lengths, ratio),
- a one-line **provenance comment per distractor** in the D1 format
  (`misreads <specific sentence> as <specific wrong claim>`) — this is the
  format pass 1 must emit, so the exemplars have to demonstrate it,
- one sentence on why it is an exemplar rather than merely a pass.

**Include two counter-exemplars** — a rejected question with its verdict object
filled in per §0.3. A generator shown only good output infers the wrong boundary.

---

## Phase 3 — The checker

`scripts/check-questions.mjs`. Plain Node, no new dependencies. Imports
`parseChapterMarkdown` from `src/quizParser.js` — do not write a second parser or
the checker and the app will drift. Exits non-zero on failure, prints a
per-file, per-question report. Wire into `npm run lint` and the Pages build.

Build tiers 1–3 first; they are pure arithmetic and regex against thresholds the
rubric already fixes.

**Tier 1 — structural.** One `- [x]` per question; 3–5 options; non-empty
`**Explanation**`; free-response fields present; no duplicate stems (≥70%
content-word overlap per R4, with a `<!-- duplicate-ok -->` escape); every `#`
heading resolves to a real Atlas section slug or matches `/review/i`.

**Tier 1b — citation anchors.** Mirror the Atlas `slugify` exactly
(`toLowerCase().trim()`, strip `[^\w\s-]`, spaces → `-`, collapse `-+`), collect
every `##`–`######` heading from
`atlas-audio-read-along/dist/chapters/v1/capabilities/*.md`, validate each
`(Section → Sub-heading)` citation. **Auto-degrade** an unresolvable anchor to
section-only and warn — never fail the build. The warning list is the
re-verification worklist for refresh day.

**Tier 2 — the test-wise tells.** Hard fail.

| Check | Gate | Today |
|---|---|---|
| key is longest | ≤35% | 60% |
| key is longest or shortest | ≤60% | 75% |
| mean key ÷ mean distractor | 0.90–1.10 | 1.39 |
| R5 recall-framing regex matches | 0 | 40% of stems |
| absolute-quantifier rate, distractors ÷ keys | ≤1.5× | 2.4× |
| option-position skew | roughly uniform | reported, not gated |

Per-question: R8 (0.80–1.20), R9 (extremum ≤15 chars), the 1.6× spread rule.

**Tier 3 — durability.** Warn only. Flag any key containing a figure that also
appears in the corresponding chapter `.md` as a benchmark score or dated claim.

**Tier 4 — the adversary. Build this properly; it is the only check that
measures the thing Markov actually objects to.** Send each question to Haiku 4.5
with **the chapter text withheld**, thinking off, options only, answer with a
single letter. Report the hit rate and name every question it got right. Anything
meaningfully above 25% is a finding.

The weak model is deliberate and worth restating, because it will look like a
cost saving and get "upgraded" by someone later: the check models a test-wise
reader skimming four options, not a determined solver. A model that reasons hard
cracks questions a skimming reader never would, the hit rate drops, and the
check cheerfully reports that the questions are fine when they are not.

**Run all four tiers against the current file and record the baseline before
anything is regenerated.** The improvement should be a table, not a claim.
RUBRIC Appendix A is the expected output for tiers 1–3 and doubles as the
checker's own test case — if the checker does not reproduce 60% / 75% / 1.39 /
24-of-40, the checker is wrong.

---

## Phase 4 — Pilot generation on two sections

`scripts/generate-questions.mjs`. Both prompts live in the repo as files
(`prompts/generate.md`, `prompts/critique.md`), not in a chat.

**Pass 1 — generate.** Input: one section `.md` from
`atlas-audio-read-along/dist/chapters/v1/capabilities/`, plus `RUBRIC.md`, plus
`EXEMPLARS.md`. Output via `output_config.format`: an array of question objects,
each with stem, options, key index, explanation, self-assigned level, and a D1
provenance line per distractor. Generate **4× the target count** per section —
the critic's job is to have something to reject.

**Pass 2 — critique.** Input: `RUBRIC.md` plus one candidate. Output: the §0.3
verdict object, `output_config.effort: "xhigh"`. `rewrite` is expected to be the
most common verdict, not `pass`.

Staging: output goes to `staging/ch1-capabilities.md`, never straight to
`public/questions/`.

**Pilot on `forecasting-timelines` (4 questions) and
`defining-and-measuring-agi` (8).** These two stress the two hardest axes of the
rubric from opposite ends. `forecasting-timelines` is "almost entirely volatile
at the surface and almost entirely durable underneath" — it is the hardest test
of §5 and the §5.4 rewrite patterns, and the section the rubric says needs the
most aggressive rewriting. `defining-and-measuring-agi` is the conceptual core,
carries 8 of the 31 section questions, and contains at least six of §3.4's
discrimination pairs — it is the hardest test of §3. If the rubric survives both,
the other four sections are easier than the pilot.

**Run this on cheap models first (Sonnet 5 generating, Sonnet 5 critiquing).**
The output of the cheap run is not questions. It is *findings about the rubric*:
criteria that turn out to be unenforceable, thresholds that reject good
questions, verdicts that disagree run to run. Run the critic twice on the same
candidates and measure how often the verdict flips — a rubric whose verdicts are
unstable is a rubric that will not survive being applied by anyone but its
author.

Watch specifically for the failure mode phase 1a is told to look for: four
options of identical length and shape that no longer discriminate. Read the cheap
run's output as a reader, not as a checker.

**Then revise `RUBRIC.md`.** This is the single iteration point in the plan.
Everything after it is linear.

**Then one expensive run** on the same two sections — Opus 5 and Fable 5.1
splitting the candidates, strongest critic at `xhigh` — to see the ceiling. Diff
the two runs by hand. If the expensive run is not visibly better, that is a
finding worth more than the questions.

Two API notes for whoever writes the script:

- `budget_tokens` returns 400 on all current models. Use `output_config.effort`.
- If Fable 5.1 is in the mix, **check `stop_reason` before reading `content`.**
  Its safety classifiers can decline with HTTP 200 and
  `stop_reason: "refusal"`, which in a batch job means one section silently
  producing nothing. `betas: ["server-side-fallback-2026-07-01"]` +
  `fallbacks: "default"` turns that into a handled case for two lines.
- Ask Markov for his original generation prompt as the pass-1 base (the handoff
  says Em has it). Do not block on it.

---

## Phase 5 — Full chapter generation

Only once phase 4's expensive run looks right. Remaining sections, per RUBRIC §8.1:

| Section | Words | N |
|---|---|---|
| `introduction` | 605 | **0** — epigraph only |
| `current-capabilities` | 2,964 | 6 |
| `foundation-models` | 1,575 | 4 |
| `defining-and-measuring-agi` | 3,837 | 8 — *pilot* |
| `leveraging-scale` | 2,206 | 4 |
| `forecasting-timelines` | 1,881 | 4 — *pilot* |
| `takeoff` | 2,496 | 5 |
| Chapter Review (MC) | — | 10, ≥50% L4/L5 |
| **Total MC** | | **41** |

`current-capabilities` needs the most Pattern C/D work — its benchmark table is
the highest-volatility content in the chapter and its durable content is the
trajectory claim, the narrow→general progression, and the tool-use mechanism.
`leveraging-scale` is where the one R11 durable-figure budget should be spent
(Chinchilla's ~20 tokens per parameter) or nowhere.

**Under-filling is always preferable to filling.** If a section yields five
questions that clear §2–§5, ship five. A generator asked for eight from a
1,500-word section pads with L0 and L2, which is how the current file got here.

Run the checker on `staging/` and iterate on the *prompts*, not on individual
questions. Hand-patching the staging file reintroduces exactly the
irreproducibility this whole plan exists to remove.

---

## Phase 6 — Manual review

Non-negotiable, and the last gate. ~41 questions against the §9 checklist:
10 seconds of mechanics and 60–90 seconds of substance each, so budget a **half
day**, not an hour.

The three substance checks that do the work:

- **Cover test.** Cover the options. Could a reader who understood the section
  produce the key unaided?
- **Distractor walk.** For each distractor, say out loud the specific misreading
  that produces it. Any distractor you cannot finish that sentence for gets cut.
  Pass 1's D1 provenance lines are exactly this sentence — check them, do not
  trust them.
- **Cynic test.** Would a smart reader who skipped the chapter get this right
  from test-taking instinct? The tier-4 adversary run gives you a shortlist to
  start from.

**Get a second opinion from Gemini** on the finished set: which questions can it
answer without the chapter text. Free, manual, and a genuinely independent read
of the same property tier 4 measures with Haiku.

The asymmetry that makes this gate non-negotiable, restated because it is the
reason: a reader who gets a question wrong reads the explanation and believes it.
A confidently-wrong distractor with a plausible explanation is worse than no quiz
at all.

---

## Phase 7 — Ship

1. Replace `public/questions/ch1-capabilities.md` from staging. One commit,
   `content:` or `feat(quiz):`.
2. Commit the baseline-vs-final checker table in the commit message or a
   `docs/` note. Keep the numbers; they are the argument.
3. Drop the "AI-generated placeholders for demonstration purposes" line from
   `README.md` — **only now**, and in the same commit.
4. Note the one-time cost already incurred: `quizKey()` changed, so everyone's
   saved best scores reset. Already true from the 2026-09-16 work; say it once.
5. Update `ATLAS_HANDOFF.md` — B4 no longer says "not started".

---

## Rough cost

Derived from NEXT-STEPS' own figure (offloading generation to Gemini would save
"roughly $2 per chapter-1 run", with generation ~20% of cost and the critic
~80%): **a full-chapter run is on the order of $10.** The pilot is ~30% of that.
Budget ~$30–40 for the whole plan including reruns after rubric revisions. The
adversary check is cents.

This is small enough that it should not drive any decision in this plan. It is
here so that nobody optimises the critic's effort level downward to save money.

---

## What this plan deliberately does not do

All of these are live and none of them block the above:

- **Free-response questions.** Three exist and are the strongest part of the
  current file. RUBRIC §7 governs them and is written; apply it after the MC set
  ships. The evaluator's trust boundary is already fixed (NEXT-STEPS step 5a).
- **Moving the free-response rubric out of `public/`** (step 5b). Deferred and
  kept as an option; RUBRIC §7.0 makes the fields survive being read.
- **The chapter text-freshness sweep** (step 10). Separate deliverable, pilot on
  `current-capabilities`, findings file not Docs comments.
- **The pace exhibit** (step 11). METR time-horizon track first as a prototype.
  Send it *with* the freshness findings — together they make one argument.
- **B5, the upstream integration decision.** Ask when the questions exist, not
  before. Three open PRs (#11, #12, #13) have established that contributions land.
- **`evaluate.js` polish** — `cache_control` on the system prompt, and
  `MAX_TOKENS = 500` truncating the "3–5 paragraphs" the prompt asks for. Worth
  doing next time the file is open.

## Open for Markov

Neither blocks anything:

1. **His original question-generation prompt**, as the pass-1 base.
2. **Whether he wants the quiz upstream at all** before he sees chapter 1 done.
