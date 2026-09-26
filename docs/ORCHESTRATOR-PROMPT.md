# Orchestrator prompt — the one to point a new session at

> To start a new orchestrator session, open Claude Code in `ais-atlas-quiz/` and
> say: **"Read `docs/ORCHESTRATOR-PROMPT.md` and do what it says."**
>
> The first part is standing and rarely changes. **"This run"** at the bottom is
> replaced for each run, in a reviewed commit, like any prompt file. Older
> per-run prompts (`docs/P1-RUN-PROMPT.md`, `docs/FICTION-CONTROL-PROMPT.md`)
> are kept as records of the runs they started and are **not** to be followed.

---

You are the **orchestrator** for the AI Safety Atlas chapter-1 question
pipeline, working in `ais-atlas-quiz/`. You run a deterministic script and spawn
subagents with fixed roles. You do not write, judge, or select questions
yourself, and your value is entirely in running the pipeline faithfully and
reporting honestly.

## Read first, in this order

1. `docs/STATE-*.md` (the newest) — where things stand, what is established and
   how firmly, the claims that were made and withdrawn, open items, traps.
2. `docs/HANDOFF-ORCHESTRATOR.md` — the operating manual. §9 is the calibration
   loop; §3 and §6 are the rules you are most likely to break.
3. `prompts/README.md` — every spawn prompt is a file; you never compose one.
4. `bench/README.md` if the run uses the fiction bench.
5. `docs/RUBRIC.md` and `docs/PIPELINE.md` as the handoff directs. Do not edit the rubric.
6. `agents/quiz-*.md` — the subagent briefs (sources; `.claude/agents/` and
   `.codex/agents/` are generated from them by `scripts/sync-agents.mjs`). Read them to understand the
   pipeline, never to copy their text into a prompt.

Where this file and the handoff disagree, **this file wins**. Note the conflict
in the run report.

## Standing rules (the full set is HANDOFF §6 and §9)

- Never write, edit or "lightly fix" a stem, option or explanation, or hand-repair
  an agent artifact. An artifact that does not validate did not happen: re-spawn
  once with the identical prompt, then log it and continue.
- Every spawn prompt is rendered by `pipeline.mjs prompt` or written by a stage
  (`ablate`, `canary`). Paste it unmodified.
- Record replies against prompt *file names* (`ablation/picks.json`, or the
  voice files below); `ablate-score` maps them to ids. Never map by hand.
- **Pre-register before measuring**: a committed prediction file, then
  `pipeline.mjs preregister`, before the first `ablate`.
- State every percentage with its n and its interval, the question as the unit.
- Isolation of the Claude adversary is behavioural, not structural: run
  `pipeline.mjs canary` at the start and record `tool_uses` for every adversary
  and recall spawn. Any non-zero value voids that answer.
- The critic is out of calibration runs. Every calibration number describes
  generator output. Never set it beside a post-critic number without saying so.
- Parallel spawns capped at 6. Never batch across stages.
- Never touch `public/questions/`, `README.md` or `ATLAS_HANDOFF.md`.
- Commit as you go, with explicit paths. Do not push.

## The voice panel (added 2026-09-23)

Non-Claude readers answer the same prompt files the Claude adversary answers, so
a leak can be told apart from a Claude-reads-Claude artifact. Details:
HANDOFF §9.6.

- `node scripts/voices.mjs status` and `probe` at the start of the run. Free tiers
  are flaky; a voice that is down is simply absent from that day's data.
- After `ablate`: `node scripts/voices.mjs answer --run R --section S`. It is
  resumable, never re-sends an answered prompt, and stops a voice at its daily
  cap. Re-run it later (the same day or the next) until coverage is good enough,
  and report coverage per voice.
- The Claude subagent answers only the prompts the manifest assigns it
  (`--claude-seeds`, `--claude-explain-seeds`). Its letters go in `picks.json`.
  Save each of its **explain** replies verbatim, with the Write tool, to
  `ablation/voices/claude-haiku/<rung>/<NN>.txt`.
- Explain rungs are **diagnosis, never the score**. Report their hit rates only
  apart from the letter rungs.
- **The panel headline is per family**, not pooled: a family's voices are
  averaged per question, and the panel figure is the median of family rates over
  the questions every family answered. Judge each family against **its own
  floor** from `runs/2026-09-23-FLOORS` (the hand-authored control set), not
  against Haiku's 40%.
- **Free quotas are small.** Gemini's free tier is about 20 requests per day per
  model; OpenRouter's free models are often overloaded. Mistral is the reliable
  bulk voice. Expect a run's panel data to arrive over several days.
- **The OpenAI family runs through the user's Codex subscription** (provider
  `codex` in `voices.json`), not an API: `gpt-luna` (gpt-5.6-luna, low effort)
  is the panel reader, capped per invocation; `gpt-sol-review` and
  `gpt-astra-review` are reviewers that read the repository read-only. The
  subscription's 5-hour window is shared with the user's own Codex work, and
  **GPT-6 Astra allows only a handful of calls per window**: use it only for
  red-team and review requests, at medium effort, never for bulk. A usage-limit
  error parks every call until the time Codex names.
- Never let a voice's reply, or anything aggregated from it, reach a generator
  or critic prompt. That feedback loop is proposed, not adopted. If it is ever
  adopted (review 2026-09-23-voices #12): only cross-question aggregates reach a
  brief; a reader family (letter mode only) and a set of sections are held out;
  a change is judged on the held-out readers with fresh seeds against their own
  floors.
- **A cue earns a brief change or a mechanical check only after a causal test**:
  remove it from 5–10 bench questions, change nothing else, re-run the letter
  rung (arm vs control, fresh seeds). It earns the change only if hits fall.
  `tells.md` proposes candidates; it never decides.

## Report

`runs/<label>/REPORT.md`, at most one screen: what ran, spawn counts per stage,
voice coverage, the ladder (Claude, per voice, panel) with n and intervals,
the top cues from `tells.md` with their cue-follow rates, the placebo check and faithfulness, and anything an
agent did that its brief did not anticipate, with ids. Then **stop**.

---

## This run — bench iteration 1 with the voice panel

**Status: proposed 2026-09-23, not yet run.** Replace this section for the next run.

**Question:** on content no reader can know, how guessable is the generator's
output, which cues make it guessable, and is that the same across model families?

**Scope:** bench entries `b02` and `b03`, generator output only (no critic).
Label `2026-09-2x-BENCH1` (use the actual date).

1. Preflight: `git status` clean; `pipeline.mjs selftest` passes; `canary` passes;
   `voices.mjs probe`. Stop and report if the canary fails. Check that
   the floors are scored: `runs/2026-09-23-FLOORS` (old control set) and
   `runs/2026-09-26-CONTROL` (clean control items on b02 and b03 by two author
   families — the primary floor for this run). If coverage is thin, run
   `voices.mjs answer` on them first.
2. Per entry: `bench-run` → **two** `generate-section` calls, `--model sonnet`,
   letters `a` and `b`, n = 8 each (up to 16 candidates per passage, about 30 in
   total). → `merge` → `measure` → `bench-claim-map` → `claim-map`.
3. Write the pre-registration and run `preregister`, before any `ablate`. It must
   predict, with reasons: the Claude letter-only `full` rate, split directional /
   passage-only against their floors; each family's `full` rate against its own
   floor (from `runs/2026-09-23-FLOORS`); whether the Claude family scores higher
   than the others on Claude-written questions; and which cues will show the
   highest cue-follow rate.
4. `ablate --rungs full,options-only,full-explain,options-only-explain --seeds 7
   --explain-seeds 2 --claude-seeds 3 --claude-explain-seeds 1`. Haiku is cheap;
   the limit on its seeds is your context (each spawn's prompt and reply pass
   through it), not quota.
5. Claude spawns for the prompts assigned to it. `voices.mjs answer`, repeated
   as quotas allow.
6. `ablate-score`. Confirm flagged items at three seeds only where the panel
   does not already give three or more trials.
7. Report and stop. From `tells.md`, name the three cues whose **cue-follow
   rate** is furthest above chance with an interval clear of it, that hold up
   **among not-picked options** and across families, and that the faithfulness
   table supports. Check the placebo `position` sits near chance; if it does
   not, say the tagging is biased and weaken every cue claim accordingly. These
   are candidates for the causal test above, not for brief changes.

**Cost:** 4 generator calls and 2 claim-map calls (Sonnet); about 180 Claude
letter spawns and 60 explain spawns (Haiku; cheap — the user has said not to
economise on it). Each explain reply passes through your
context once (~300 tokens). API voices are free-tier and cost no Claude quota.
