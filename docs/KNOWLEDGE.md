# What this project knows — for agents

A living file. **Edit it in place; never add dated addenda or copies.** When a
finding is established, weakened or withdrawn, or a trap catches you, change the
row it belongs in and say so in the commit message. Git history holds what
happened when; this file holds what is currently believed and how firmly.

- Where things stand and what is next: `STATUS.md` (written for the user).
- How to run the pipeline: `docs/ORCHESTRATOR-PROMPT.md`, then
  `docs/HANDOFF-ORCHESTRATOR.md`. Where this file and the handoff's standing
  rules (§9) disagree, the handoff wins; tell the user about the conflict.

Every number below carries its sample size. Several are small, and the single
most common failure in this project's history has been an agent stating a
small-sample result, or a plausible-sounding mechanism, as if it were
established. §3 lists the claims that were made and then withdrawn, so that you
do not make them again.

(Replaces `docs/STATE-2026-09-23.md`, which is in git history.)

---

## 1. What this project is, in one paragraph

A pipeline that writes multiple-choice questions for chapter 1 of the AI Safety
Atlas. An **orchestrator** runs a deterministic script, `scripts/pipeline.mjs`,
and spawns subagents with fixed roles: section analyst, generator, critic,
adversary, curator, pilot analyst and recall reader. The script does all
counting and measuring; agents do all judgment; **the orchestrator writes no
question text and judges no question**. A **voice panel** (`scripts/voices.mjs`)
sends the same reader prompts to non-Claude models, because readers that share
pretraining share priors. `docs/RUBRIC.md` governs question quality and is not
the orchestrator's to edit. `public/questions/`, `README.md` and
`ATLAS_HANDOFF.md` are off limits.

## 2. What is established, and how firmly

| finding | evidence | firmness |
|---|---|---|
| **A weak blind reader answers the pipeline's questions far above chance, including on content it cannot know.** | Invented passage, generator output (no critic): 18/24 correct, 75%. 95% interval with the *question* as the unit (n = 8): roughly 48–100%. | Direction solid; size not. n = 8. **Confounded** — see §3.4. |
| **The leak is not mainly in the stem.** | Five leaking stems rewritten to withhold their premises, options byte-identical, option order controlled: 15/15 → 14/15. | Solid for those five. |
| **The option set carries much of the answer.** | Stem removed entirely: 4 of 6 trials correct, across **4 distinct questions**, two of which split 1–1. | **A lead, not a result.** Tiny n, and the probe's wording was ad hoc. Re-run it with the template before building on it. |
| **The adversary's 100% on the real AGI section is explained by knowledge; no leak is needed.** | Free recall, no options: 2 of the 3 AGI questions answered with the key's content. | n = 3. Shows a leak is not *needed*, not that the options are clean. |
| **Uniform option length does not explain guessability.** | The AGI questions were clean on every tell the control priced (length, hedging, absolute words) and still scored 100%. | Solid. |
| **The hand-authored floor on invented content is 40%, not 25%.** | `runs/tier4-control` clean group: 6/15. | n = 5 questions. Per-voice floors are being measured in `runs/2026-09-23-FLOORS` and `runs/2026-09-26-CONTROL`. |
| **On the clean bench control items, Haiku's floor is about a third.** | `runs/2026-09-26-CONTROL`, `full` rung, 3 seeds: b02 30% (9–51%), b03 37% (14–59%). On b02 the panel median is 38%: Mistral 38%, Luna 43%, Nemotron 37%, Google 55% (thin coverage). | n = 10 questions per passage. b03's voices are still arriving. Haiku's `options-only` on b02 (57%) beat its `full`, against prediction: a lead on 10 q, not a result. |
| **On a balanced bench passage, directional items carry a floor of about 50%.** | Most directional claims are effectively binary, so a reader who always picks the sensible option scores the naive-right share. | Reasoning, accepted from review; **not yet measured**. It changes how every bench result must be read (§5.3). |
| **Rules stated only in a brief hold roughly 60% of the time.** | The generator broke a plainly stated quoting rule on 13 of 21 candidates. | One rule, one run. Treat it as the default expectation for any brief-only rule. |
| **Self-defeating wrong answers are real and lintable.** | Options like "there is no objection" answering "which objection…": the lint fires 3 times in 49 real candidates, all genuine. | Small n; precision looks good. |
| **A strong model infers that invented content is invented, unprompted.** | The `b02` analyst called its prose "an invented domain" with no such word in it and no file search (3 tool calls). | One observation. The bench can hide the *purpose*, not the invention. |
| **On real sections, Opus generator output almost always trips R14.** | `runs/2026-09-27-P1`, all agents on Opus 5.5: `measure` found stem-word singletons in 53 of 58 candidates, and R14 was the cited failure in 7 of the 11 critic verdicts that ran. | One run, one model. Old code (see §8, stale base). The script already detects it, so it is a candidate generator self-check, not a critic job. |
| **Opus generator output meets the length bands unaided.** | Same run: R8 + R9 + 1.6× passed on 58/58 before any critique. | One run, Opus only. Says nothing about sonnet or haiku. |
| **The generator overclaims level.** | Same run: 6 of 11 critiqued candidates claimed a higher level than the critic assigned (three L4 → L2). | n = 11, one section. |
| **The adversary's isolation is behavioural, not structural.** | The harness lists `quiz-adversary` and `quiz-recall` with "Tools: All tools" despite `tools: []`. ~70 adversary spawns and the canary (2026-09-23: `tool_uses` 0) have used no tool. On 2026-09-27 two canary spawns each reported `tool_uses` 1, the hand-back that carried the reply, and both answered wrong (B, C; key D), so the planted file was not read. The transcript was empty, so the tool's name comes from the harness's own notice, not a log. | Solid on the facts. The structural fix is open (§7). |

## 3. Claims that were made and withdrawn — do not repeat them

1. **"The length rules caused the adversary's 100%."** Incoherent: equal lengths
   *remove* the length tell. Withdrawn in `runs/2026-09-18-P1/REPORT.md`.
2. **"The analyst's alternative explanation did not survive."** Backwards: a
   better-known section predicts a *higher* score. The free-recall probe
   confirmed the analyst. Corrected in `docs/pilot-findings-2026-09-18.md`.
3. **"The leak is in the stem."** Tested and failed (§2). The fiction report is
   retitled; its first half is kept, marked superseded.
4. **The 2026-09-20 75% was measured under clean conditions.** It was not: the
   passage the generator read opened with a notice that it existed to measure a
   test-wise reader. Recorded against the result; the notice is now removed.
5. **"The script verifies held fields before an arm is spawned."** Written into
   the handoff before the code existed. The `arm` stage now does it.
6. **"A render stage builds review sheets."** Told to the AGI curator. False — so
   `defining-and-measuring-agi` has no review sheet (§7).
7. **The AGI "9 of 9" describes the questions now staged.** It does not: `a03r`
   was replaced by a critic re-spawn after the adversary ran, and the current
   `a03r` has never been through the adversary.

## 4. How the pipeline runs — the standing rules most easily broken

Full text: `docs/HANDOFF-ORCHESTRATOR.md` §3, §6, §9 and
`docs/ORCHESTRATOR-PROMPT.md`.

- **Every spawn prompt comes from `prompts/`.** Render it with
  `node scripts/pipeline.mjs prompt <template> ...`, or take it from a prompt
  file the script wrote. Pass it unmodified. If a template does not fit, fix the
  template in a reviewed commit.
- **Everything derivable is derived.** Setting a derived value by hand needs
  `--override`, which is logged.
- **The critic is out of the calibration loop** (decision 2026-09-23). Every
  calibration number describes *generator* output. Never set it beside a
  post-critic number without saying so in the same sentence.
- **Pre-register before measuring** (`pipeline.mjs preregister`). State every
  percentage with its n and its interval.
- **Never map answers to ids by hand.** Record *prompt file → reply* in
  `ablation/picks.json`; `ablate-score` maps. The one analysis error in the
  control study was a hand-mapping error.
- **Screen at one seed, confirm at three**, with `--seed-offset` for fresh seeds.
- **Compare a manipulation arm with its paired control**, never with the screen
  that selected its ids (regression to the mean).
- **Record `tool_uses` for every adversary and recall spawn**, and how many of
  them were `SubagentHandback`. Since 2026-09-27 the harness returns every reply
  through one hand-back call and counts it, so a clean spawn reports 1. The user
  exempted exactly that one call; any other tool call, or a second hand-back,
  voids that answer. Run `pipeline.mjs canary` at the start of a run and record
  it with `canary-record --tool-uses N --handbacks H`.
- **Voice replies never reach a generator or critic prompt**, and a cue earns a
  brief change only after a causal test (ORCHESTRATOR-PROMPT, voice panel).
- **Agent briefs are edited in `agents/quiz-*.md`**, then
  `node scripts/sync-agents.mjs`; `.claude/agents/` and `.codex/agents/` are
  generated, and the selftest fails when they drift.

Cost, measured: an Opus critic call is ~7–14 points of a 5-hour window; a Haiku
adversary call ~0.45. A calibration iteration without the critic is roughly a
fifth of a window. Free API voices cost no Claude quota but have small daily
caps (Gemini ~20 requests/day per model); the Codex voices share the user's
Codex 5-hour window, and GPT-6 Astra allows only a handful of calls per window.

## 5. The fiction bench

`bench/README.md` has the rules and reasoning.

### 5.1 What it is

Invented textbook passages, written once and reused, so questions can be tested
on content no reader can know. Each entry holds `passage.md` (the section only)
and `private/` (everything that says it is invented, or how its claims
"sound"). **The analyst and generator never read from `bench/`**: `bench-run`
copies the passage to `runs/<label>/<slug>/section.md` and every stage uses that
copy.

### 5.2 Entries

| entry | domain | status | claims | naive right | passage-only | `bench-check` |
|---|---|---|---|---|---|---|
| `b02` | route-marker cairns read as a two-register signal | **ready**, concept map adopted (14 ideas, 4 discrimination pairs) | 33 | 19/28 (68%) — **one disputed tag from the 70% cap** | 5 (minimum is 4) | 0 FAIL, 5 WARN |
| `b03` | thread lattices spun by a cave snail | **ready**, concept map adopted (18 ideas, 6 pairs) | 39 | 16/28 (57%) | 11 | 0 FAIL, 5 WARN |
| `undercraft` | ensemble stage performance | **legacy reference** — fails `bench-check` | — | its directional claims all go against the sensible guess | — | 1 FAIL (no claims file) |

The WARNs are all heuristics tagged too thinly to be balanced, which each
passage's notes list. Treat `b02` as the weaker of the two: its 68% and its 5
passage-only claims leave little margin. `undercraft` holds the only arm data
but is confounded (§3.4) and imbalanced; use it for comparison with 2026-09-20,
not for new conclusions.

**A residual cue in `b02`.** Its analyst wrote that the prose is "a
self-contained invented domain", and that note sits in the concept map the
generator reads. It was left as written — agent artifacts are not hand-edited —
and **must be stated as a caveat on any `b02` result**. The `b03` map says
nothing of the kind.

### 5.3 Reading a bench result

- **Passage-only items** — built on a fact with no sensible guess — are judged
  against 25% chance and the hand-authored floor.
- **Directional items** are judged against max(share, 1 − share), where share is
  the naive-right fraction **among the directional items actually asked**. That
  is roughly 50% on a balanced set, and it is the score of a reader who always
  picks the sensible option. Treating it as leakage would be wrong.
- The split needs `claim-map.json`: run `bench-claim-map` (a tagger agent, after
  generation) and then `pipeline.mjs claim-map`. Without it, `ablate-score`
  reports only the pooled ladder, which cannot be read against a single floor.
- Each voice family is judged against **its own floor**, and the panel headline
  is the median family rate over complete-case questions.

### 5.4 How far to trust the bench

Each passage was written by Opus from `prompts/bench-author.md`, checked by
`bench-check`, reviewed, revised, verification-reviewed and revised again, with
a written verdict per finding (`private/reviews-decisions.md`) and a revision
log. Tags follow a fixed tie-break: **where author and reviewer disagree about
what an outsider would guess, the claim is tagged as guessable.**

The claim tags are still **self-reported by a model**. `bench-check` catches
imbalance, contradictions and thin tagging, but not a sincere misjudgment of
what an outsider would guess. The cheapest empirical check — the recall probe
on neutral stems for disputed claims — has not been run.

## 6. Tools reference

```
pipeline.mjs prompt <template> [--run R --section S] [--bench B] [--id ID] [--model M] [--letter X] [--set k=v]
pipeline.mjs preregister --run R --file <path>
pipeline.mjs canary --run R          then   canary-record --run R --tool-uses N --reply X
pipeline.mjs bench-check --bench B
pipeline.mjs bench-run --run R --section S --bench B
pipeline.mjs bench-map --bench B --from R/S
pipeline.mjs control-check --run R --section S --bench B
pipeline.mjs merge | measure | dedupe | queue | render | validate   --run R --section S
pipeline.mjs ablate --run R --section S [--rungs ...] [--seeds N] [--seed-offset K] [--ids a,b] [--passage P]
pipeline.mjs ablate-score --run R --section S
pipeline.mjs claim-map --run R --section S --bench B
pipeline.mjs arm --run NEW --from R/S --rewrite <file> --kind stem|distractors [--passage P]
pipeline.mjs selftest                (171 assertions; every guard verified against a planted defect)
node scripts/voices.mjs status | probe | answer --run R --section S
node scripts/sync-agents.mjs         (agents/*.md → .claude/agents, .codex/agents)
node scripts/gemini-review.mjs --list-models | --template review-gemini --model M --files a,b --out F
npm run questions                    (every staged question in one stream, answers marked)
```

Ablation rungs and who answers them (the manifest names the agent per file):

| rung | shows | agent |
|---|---|---|
| `full` | stem + options | `quiz-adversary` and the voice panel |
| `options-only` | options, stem replaced by a fixed withheld line — byte-identical otherwise | `quiz-adversary` and the voice panel |
| `*-explain` | as above, plus per-option probabilities and cue codes — diagnosis only, never the score | the same readers |
| `sighted` | the question **with** the passage | `general-purpose` (haiku) |
| `stem-only` | stem, no options — real sections only | `quiz-recall`, graded by `grade-recall.md` |

## 7. Known defects and unbuilt pieces

1. **Adversary isolation is not structural.** Nobody has found how to declare a
   subagent with genuinely no tools in this harness. Until then, the canary and
   `tool_uses` checks are what hold. Do not claim isolation is structural.
2. **`defining-and-measuring-agi` has no review sheet, and its `a03r` has never
   been through the adversary.**
3. **`merge` does not read `verdicts-pass2/`.** The critic's second pass has
   never run; wire it before it does.
4. **The pilot-analyst brief has no bench mode.** Its section order is written
   for the P1/P2 runs.
5. **Review-block templates** (generation and curation across all sections) do
   not exist. Not needed until the full run.
6. **`flag()` reads argv captured at load**, so the selftest's four
   `process.argv` assignments are no-ops. Harmless today; do not rely on them.
7. **`shard` can give one idea the same lens on every attempt.** Reproduced on
   current code with the 2026-09-27 `defining-and-measuring-agi` concept map:
   DM-14's 2 attempts both land on "objection". `validate` catches it, but only
   after generation has been paid for. Fix in `stageShard`'s lens assignment,
   or run `validate` on `shards.json` before spawning any generator.
8. **A missing chapter directory silently switches off anchor checks.**
   `CHAPTER_DIR` now takes a `QUIZ_CHAPTER_DIR` override (both scripts), and
   prompts derive the prose path from it, so a worktree can run. But if neither
   path exists, `ANCHORS = false` without a warning; that should be an error.

## 8. Traps

- **Recorded is not sent.** `prompt` records every render, including ones made
  only to inspect a prompt. The `Agent` call is the send.
- **A new agent file is only spawnable after the session restarts.**
- **An agent can invent an enum value.** The critic set `stem_format` to a value
  outside the schema; `render` now refuses such a candidate.
- **A template fix does not reach a prompt already rendered.** Check the
  prompt's timestamp against the template's last change.
- **Committing while an agent edits a file can capture it half-written.** Commit
  explicit paths, and leave out the files another session is editing (the
  dashboard, `npm run status`, shows them).
- **A repeated `shuffle` on a changed candidate gives a different permutation**,
  so a stale adversary result can silently describe a question that no longer
  exists.
- **Analyst spawns can stall on the stream watchdog** with no output and no
  partial file. Re-spawn once with the identical prompt.
- **A worktree can start from a stale commit.** On 2026-09-27 a session was
  opened on a branch cut from `78e57dc`, 39 commits behind `main`. It read the old
  P1 report as "where we left off" and re-ran P1 from scratch (34 Opus spawns)
  before noticing. Before resuming anything, run
  `git rev-list --count HEAD..main` and read `STATUS.md` on `main`.
- **From a worktree, set `QUIZ_CHAPTER_DIR`** to the absolute path of
  `atlas-audio-read-along/dist/chapters/v1/capabilities`. The default is
  relative to the repo root, and a worktree sits three levels deeper.

## 9. Where things are

| what | where |
|---|---|
| where things stand, next steps (for the user) | `STATUS.md`, dashboard: `npm run status` |
| start a session | `docs/ORCHESTRATOR-PROMPT.md` |
| operating manual | `docs/HANDOFF-ORCHESTRATOR.md` |
| rubric (governing, read-only) | `docs/RUBRIC.md` |
| pilot findings | `docs/pilot-findings-2026-09-18.md` |
| spawn templates | `prompts/` (index in `prompts/README.md`) |
| agent briefs (source) | `agents/quiz-*.md` |
| voice panel config | `voices.json`, `scripts/voices.mjs` |
| reviews and verdicts | `reviews/` |
| bench | `bench/` (rules in `bench/README.md`) |
| P1 run and report | `runs/2026-09-18-P1/` |
| P1 re-run on a stale base, all Opus, paused at critique 11/22 | `runs/2026-09-27-P1/` (superseded; kept for the §2 R14 and length rows) |
| fiction control and stem arm | `runs/2026-09-20-FICTION/`, `-FICTION-B/` |
| per-voice floors | `runs/2026-09-23-FLOORS/`, `runs/2026-09-26-CONTROL/` |
| staged questions | `staging/` — or `npm run questions` |

## 10. Codes used in the logs, in plain words

| code | means |
|---|---|
| R5 | the phrase "according to the chapter" — tests reading, not understanding |
| R8 / R9 / 1.6× | option lengths similar; the right answer not the longest or shortest; longest ≤ 1.6× shortest |
| R13 | at most one negation question, written in capitals |
| R14 | options must not overlap or repeat a stem word in only one option |
| D1 / D3 | every wrong answer traces to a real misreading / no "straw" wrong answer nobody would pick |
| D10 | the right answer must not hedge more than the wrong ones |
| D-selfdefeat | a wrong answer that denies what the question presupposes ("there is no objection") |
| E3 / E4 / E8 | the explanation names a wrong answer / cites its section / is true on its own |
| L0–L5 | difficulty, from recall (L0–L2) to applying and transferring (L3–L5) |
| naive-right share | the fraction of directional claims where a sensible outsider's guess is right |
| passage-only | a claim with no sensible guess, even once a question has posed it |
| full / options-only / sighted / stem-only | the ablation rungs (§6) |
