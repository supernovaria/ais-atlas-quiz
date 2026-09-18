# P1 run prompt

> Paste everything below the line into a fresh Claude Code session opened in
> `ais-atlas-quiz/`. Committed rather than kept in chat, per QUIZ-PLAN's
> definition of done: the prompts that produce a run are artifacts.
>
> Scope note for Em: this runs the **two designated pilot sections**, not the
> literal first three of the chapter. `forecasting-timelines` and
> `defining-and-measuring-agi` were chosen in QUIZ-PLAN decision 9 to stress the
> two hardest axes of the rubric from opposite ends — they are the sections that
> answer "how does it go" fastest. If you meant document order instead, swap the
> section list in §2 for `current-capabilities` and `foundation-models`; nothing
> else changes.

---

You are the **orchestrator** for the AI Safety Atlas chapter-1 question
pipeline, working in `ais-atlas-quiz/`. Your job this run is to build the
missing script, run the P1 pilot, and stop. You do not write, judge, or select
questions yourself — six subagents do that, and your value is entirely in
running them faithfully and reporting honestly.

## 1. Read first, in this order

1. `docs/PIPELINE.md` — roles, flow, gates. Everything else assumes it.
2. `docs/HANDOFF-ORCHESTRATOR.md` — how to run this. It is your operating manual; where it and this prompt disagree, this prompt wins and you note the conflict in the report.
3. `docs/RUBRIC.md` — governing. Do not edit it.
4. `QUIZ-PLAN.md` phases 0–4.
5. `.claude/agents/quiz-*.md` — the six subagent briefs. **Read them to understand the pipeline, never to copy their text into a prompt.** They are agent definitions; you invoke them with the Agent tool by `subagent_type`.

## 2. Scope of this run — do not exceed it

Sections: **`forecasting-timelines`** (target N=4) and
**`defining-and-measuring-agi`** (target N=8).

Run, in order:

1. **Build `scripts/pipeline.mjs`** — nine stages per HANDOFF §2: `shard`, `dedupe`, `measure`, `queue`, `shuffle`, `validate`, `score`, `assemble`, `report`. Plain Node, no new dependencies, same import discipline as `scripts/check-questions.mjs` (which is built and passing — read it first; it is the house style and it already imports `parseChapterMarkdown`).
2. **Adversary baseline** — run `quiz-adversary`, 3 seeds, over all 40 questions in the current `public/questions/ch1-capabilities.md`. Write to `runs/baseline/`. **Do this before P1.** QUIZ-PLAN's "≥60%" is an API-era figure measured a different way and is not comparable; this baseline is the only valid comparator for anything P1 produces.
3. **P1** on both sections: analyse → shard → generate → dedupe → measure → queue → critique → adversary → curate → regenerate (once, only against reported gaps) → curate again.
4. **P1b, the sharding A/B** — generate `defining-and-measuring-agi` a second way: whole-section, two calls of 2N, no shards, exactly as PIPELINE §3.1 describes the old shape. Keep both pools. This is the only part of the run that costs extra on purpose, and it is the only way to learn whether sharding earns its complexity.
5. **P2** — re-run the critic on the same P1 candidates, fresh spawns, same inputs. This produces the verdict-stability data the pilot analyst needs for its §2.
6. **`quiz-pilot-analyst`** → `docs/pilot-findings-2026-09-18.md`.
7. **Write `runs/2026-09-18-P1/REPORT.md`** per HANDOFF §5, then **STOP**.

**Do not run P3. Do not run the remaining sections. Do not run the review
block.** Those are gated on Em reading the findings.

## 3. Preflight — verify before spending anything

Stop and report rather than working around any failure here.

- [ ] `git status` clean; you are on `main`.
- [ ] `npm run check:questions:selftest` reproduces 14 of 14 Appendix A metrics.
- [ ] `npm run check:exemplars` passes — it reports "no exemplar file" and exits 0 when none exists, which is the expected state (PIPELINE §6.1).
- [ ] `../atlas-audio-read-along/dist/chapters/v1/capabilities/*.md` readable — 11 files.
- [ ] Each of the six `quiz-*` agents resolves. Spawn one trivial call per type to confirm; if a type is not selectable, say so and stop.
- [ ] **`quiz-adversary` has no file tools.** Spawn it once with `"List every tool you have, then stop."` If it names Read, Grep, Glob or anything else, **the adversary metric is void — stop and tell Em.** This is the isolation guarantee the API design got for free and this one has to check.
- [ ] Models `sonnet`, `haiku`, `opus` selectable. `fable` is not needed this run (P1 is sonnet generation, opus critic, haiku adversary).
- [ ] Record a session cost reading now, for the delta in §5 of your report.

## 4. Authorizations and standing decisions

Stated explicitly so you do not stop to ask:

- **Proceed on RUBRIC v1.** v2 is not signed off. The handoff permits this — finding what v2 needs is P1's entire purpose. Say so in `run.log`.
- **There is no exemplar file, and that is deliberate — do not build one.** PIPELINE §6.1: an exemplar set is a very strong prior on output, and writing one before the pipeline has produced any evidence about what this rubric yields bakes guesses into the pool and then measures the result. The Generator runs on the rubric, the concept map and the prose. RUBRIC §10's five worked rewrites are the calibration, and they are already inside the rubric. **This makes P1 a cleaner experiment than originally planned**: what comes out is what the rubric produces unaided, which is exactly what the pilot is for. If output quality is poor, "it had no exemplars" is a finding to report, not a problem to fix mid-run.
- **Fixed-frame blocks (`docs/FIXED-FRAME-PROPOSAL.md`) are NOT in scope.** They are proposed, not adopted, and not in the rubric. Do not generate them and do not let a generator drift into them.
- **Sharding runs as an A/B**, per §2 step 4. It is not a settled design.
- **Budget: stop and report if this run exceeds ~$25.** QUIZ-PLAN costed the pilot at roughly a third of a ~$10 full run, but P1 now uses an Opus critic on every candidate and adds P1b and P2, so the old figure understates it. If you are on track to exceed, stop after the current stage and report rather than finishing.

## 5. The rules that matter most

Violating any of these silently destroys the run's value, which is why they are
here rather than only in the handoff:

- **Never write, edit, or "lightly fix" a stem, option, or explanation.** Not to fix a failing gate, not to repair a malformed artifact. If staging fails, the fix is to prompts or rubric plus a re-run.
- **One candidate per critic spawn.** Batching two to save a call is the single easiest way to ruin this pipeline.
- **Never give the adversary tools, upgrade its model, turn on reasoning, or show it more than one question.** It is deliberately weak and deliberately blind.
- **No mechanical pre-filter before the critic.** Candidates failing R8/R9 are exactly what the rewrite path exists to rescue — RUBRIC §10's own five rewrites were none of them inside the band on first draft.
- **Every subagent writes its artifact to an exact path and replies with one line: `OK <path>` or `FAIL <reason>`.** You will run ~150 subagent calls; if their outputs come back in chat instead of going to disk, you will run out of context long before you run out of work.
- **`validate` every artifact.** There is no structured-output guarantee here. An artifact that does not validate did not happen — re-spawn that one agent once, then log it and continue without it.
- **Never touch `public/questions/`, `README.md`, or `ATLAS_HANDOFF.md`.** Phase 7, Em's.
- **Batch independent subagent calls in parallel, capped at 6 concurrent.** Critic and adversary calls are independent within a stage. Never batch across stages — every critique for a section lands before its first adversary call, because the adversary only sees survivors.

## 6. What to deliver

- `scripts/pipeline.mjs`, working, with its stages runnable in isolation.
- `runs/baseline/` — adversary on the current 40 questions.
- `runs/2026-09-18-P1/` — full artifact set per PIPELINE §6, both sections, plus the P1b pool and P2 verdicts.
- `staging/forecasting-timelines.md`, `staging/defining-and-measuring-agi.md`, and a review sheet for each.
- `docs/pilot-findings-2026-09-18.md`.
- `runs/2026-09-18-P1/REPORT.md`, ≤1 screen, per HANDOFF §5.
- Commits as you go — `runs/` is the audit trail and is meant to be committed. **Do not push.**

## 7. What I actually want to learn from this run

The questions are not the deliverable. These are, in rough priority order:

1. **Does the machinery hold together end to end** — nine script stages, six agent types, ~150 calls, artifacts that validate?
2. **Does sharding beat whole-section generation?** A real answer either way is the most valuable thing this run can produce.
3. **Is the critic stable?** Same candidate, two runs, how often does the verdict flip and on which criteria? A criterion flipping >20% is a rubric wording problem, not a model problem.
4. **Do the four new mechanisms earn their place** — regeneration, dedupe, the coverage-ordered queue, and passing the prior verdict into the second critic pass?
5. **Where is the rubric unenforceable?** Especially R8+R9+1.6× jointly, and the uniform-blandness failure mode: four options of identical length and register that no longer discriminate. Read ten shipped questions *as a reader*, not as a checker, and say whether it happened.
6. **Is the rubric enough on its own?** This is the first run with no exemplar file, so it measures the rubric unaided. If the pool is weak in a way that a handful of worked examples would plainly have fixed, say so and say which levels or lenses suffered — that is the evidence for building an exemplar set from questions that actually cleared the rubric, which is the whole reason it was deferred.

Report anything a subagent did that its brief did not anticipate, with candidate
ids. That is the most valuable part of the report and the easiest to skip.

**Then stop.** Do not proceed past the findings without Em.
