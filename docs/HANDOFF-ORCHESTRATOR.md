# Handoff — build and run the question-generation pipeline

> For a Claude Code instance working inside `ais-atlas-quiz/`. You are the
> **orchestrator**. You build the missing pieces, spawn the sub-agents, run the
> pilot, and stop at the gates marked **STOP** for Em. You do not write, judge,
> or select questions yourself.
>
> **This version runs on Claude Code subagents, not direct API calls.**
> Rev 2026-09-18. What that changed, and what it cost, is §8 — read it before
> you trust a number this pipeline produces.
>
> **Rev 2026-09-23.** Every spawn prompt is now a file in `prompts/`, rendered
> by the script, never composed by you. The calibration loop — the fiction
> bench, the ablation ladder, and the rules that keep it cheap — is §9. Both are
> standing rules, not suggestions for this run.

## 0. Read first, in this order

**Starting a session?** `docs/ORCHESTRATOR-PROMPT.md` is the prompt to follow; it points back here.

0. **`docs/STATE-2026-09-23.md`** — where things stand: what is established and how firmly, the claims that were made and withdrawn, the bench, open items and the traps that caught the last session. Read it before anything else.
1. `docs/PIPELINE.md` — roles, flow, gates. Everything below assumes it.
2. `docs/RUBRIC.md` — governing. Do not edit it; propose edits via the pilot findings.
3. `QUIZ-PLAN.md` phases 0–4 — repo state, checker spec, pilot rationale.
4. `.claude/agents/quiz-*.md` — one brief per sub-agent. **These are the agent
   definitions. They are used by spawning the agent, not by copying its text
   into a prompt. Never paraphrase a brief into your own prompt.**

## 1. Preconditions — verify, do not assume

| Check | Expected | If not |
|---|---|---|
| `git status` clean; `docs/RUBRIC.md` tracked | QUIZ-PLAN phase 0 done | Phase 0 is otherwise done. **`main` is ahead of `origin/main` — push before you spend anything.** The rubric is committed and still on one disk until you do. |
| `docs/EXEMPLARS.md` | **optional — not a precondition** | Absent by decision (PIPELINE §6.1): P1 should find out what the rubric produces unaided, and exemplars can be built afterwards from questions that cleared it. If the file is present, pass it to the Generator; if not, run without it. Never block on it. |
| `scripts/check-questions.mjs` tiers 1–2 exist and reproduce RUBRIC App. A on the current file (60% / 75% / 1.39 / 24-of-40) | phase 3 done | **Built. `npm run check:questions:selftest` reproduces 14 of 14 Appendix A metrics, with one documented divergence (D4's key count — see the note in `selftest()`).** Tier 4 (adversary) is not in this script; it is the `quiz-adversary` agent, run by the orchestrator. |
| `scripts/pipeline.mjs` exists (§2) | — | Build it. It is smaller than the API version: agents replace most of it. |
| `atlas-audio-read-along/dist/chapters/v1/capabilities/*.md` readable | 11 files, ~25.7k words | Present at `../atlas-audio-read-along/…`, verified. Do not scrape. |
| Agent models `sonnet`, `haiku` selectable (P1); `opus`, `fable` (P3+) | | Spawn one throwaway agent per model tier and confirm it returns. Report which are missing. P1 needs only sonnet + haiku. |
| **`quiz-adversary` does not use file tools** | it never reads the source | **Do not use the self-report test** ("list the tools you have"): on 2026-09-19 the adversary named bash, PowerShell, read_file and write_file, and the harness's agent listing confirms it — `tools: []` is read as *unrestricted*, not *none*. Isolation is therefore **behavioural**, not structural. Use the **canary test** instead: run `pipeline.mjs canary --run <label>`, which plants a file holding an answer and a random token and renders the real adversary template pointing at it; spawn `quiz-adversary` with that prompt and record the result with `canary-record --tool-uses <n> --reply <letter>`. Pass means `tool_uses` is 0. Record `tool_uses` on every adversary spawn; a single non-zero value voids that run's adversary metric. |
| Adversary baseline re-measured on the current 40-Q file with *this* agent | a number in `runs/baseline/` | Do it before P1. QUIZ-PLAN's "≥60%" is API-era and not comparable (§8). |
| RUBRIC v2 signed off (QUIZ-PLAN phase 1), incl. R2 amendment + §3.8/§4.6 from PIPELINE §8 | | Proceed with P1 on v1 if v2 is pending — P1's purpose is to find what v2 needs — but say so in the run log. |

## 2. Build `scripts/pipeline.mjs`

Plain Node, same deps as the repo. **This script does everything deterministic
and nothing judgmental.** Every model pass is a subagent spawn that you make;
every arithmetic, file, and format operation is this script. That split is
cleaner than the API design, where the script also carried the model calls.

```
node scripts/pipeline.mjs shard     --run <label> --section <slug>   # concept-map.json → shards.json (PIPELINE §3.1)
node scripts/pipeline.mjs dedupe    --run <label> --section <slug>   # collapse near-identical candidates BEFORE critique
node scripts/pipeline.mjs measure   --run <label> --section <slug>   # candidates.json → measurements.json
node scripts/pipeline.mjs queue     --run <label> --section <slug>   # critique order, by coverage need
node scripts/pipeline.mjs shuffle   --run <label> --section <slug> --seeds 3   # adversary prompt bodies, seeded
node scripts/pipeline.mjs validate  --run <label> [--section <slug>]  # schema-check every artifact (§3)
node scripts/pipeline.mjs score     --run <label> --section <slug>   # adversary letters → adversary.json
node scripts/pipeline.mjs assemble  --run <label>                    # staging/*.md → ch1-capabilities.md candidate
node scripts/pipeline.mjs report    --run <label>                    # the §5 tables
```

**`dedupe` is the one free efficiency win in this pipeline.** Two generators
working from the same concept map produce near-identical candidates, and R4
duplicate detection currently sits at the *curator* — after every duplicate has
already paid for a full Opus critic call. Cost is roughly 20% generation to 80%
critic, and the critic is per-candidate, so collapsing duplicates one stage
earlier is real money at zero quality cost. Use R4's own rule (≥70% content-word
overlap on stems) plus identical `targets`; keep the candidate with the better
measurements, record the collapsed id in `dedupe.json` so lineage survives.

**`queue` orders critique by coverage need**, not by generation order: an idea
with no clean verdict yet outranks the fifth candidate on an idea that already
has three. Nothing is dropped — the order only decides what gets judged first,
so if a run is cut short the casualties are the candidates that were worth
least.

Writes to `runs/<label>/<section>/` per PIPELINE §6. Nothing writes to
`public/questions/` — ever.

**`validate` is load-bearing and has no API counterpart.** The API version got
well-formed JSON free from `output_config.format`. A subagent has no such
guarantee: it can return prose, truncate, wrap JSON in a code fence, or write
nothing at all. So every agent writes its artifact to an exact path, and
`validate` checks that file against the schema in the agent's brief — required
keys, types, enum values, array lengths, and the cross-file invariants (every
`verdicts.json` id exists in `candidates.json`, every `measurements` block in a
verdict is byte-identical to `measurements.json`). **An artifact that does not
validate did not happen.** Re-spawn that one agent once; if it fails again, log
it and carry on without it. Never repair an artifact by hand — that is writing
questions, which is §6.

## 3. Sub-agent spawn spec

One `Agent` call per row. `subagent_type` is the agent name; `model` overrides
the brief's default where the table says so.

**Every spawn prompt comes from a template in `prompts/`** — rendered with
`node scripts/pipeline.mjs prompt <template> ...`, or taken from a prompt file
the script wrote (`shuffle`, `ablate`). You pass the rendered text unmodified.
You never compose, paraphrase or "adjust" one. `prompts/README.md` maps each
stage to its template; §9.1 says why this is a rule.

| Stage | `subagent_type` | Model (P1 / production) | Inputs (as paths in the prompt) | Calls |
|---|---|---|---|---|
| analyse | `quiz-section-analyst` | sonnet / sonnet (opus if P1 shows gaps) | RUBRIC.md, `<section>.md`, `misconceptions/<section>.md` if present, `target_n` | 1 per section |
| generate | `quiz-generator` | **assigned per shard** — sonnet in P1; opus + fable alternating across an idea's attempts in production | RUBRIC.md, concept-map.json, `<section>.md`, **one shard** from `shards.json` `{ideas, lens, mode}`, and `EXEMPLARS.md` **only if it exists** | 1 per shard (~5 per section) |
| measure | *(script)* | — | — | — |
| critique | `quiz-critic` | opus | RUBRIC.md, `<section>.md`, concept-map.json, **one** candidate, its measurements | 1 per candidate (+1 per failed rewrite, max) |
| critique (2nd pass) | `quiz-critic` | opus | as above **plus pass 1's `reasons`, `preserve` and `rewrite_changed`**, and the re-measured numbers | 1 per failed rewrite |
| regenerate | `quiz-generator` | as production | as generate, but targeting **one** uncovered idea named by `curator.json` | ≤1 per uncovered idea, **once per section** |
| adversary | `quiz-adversary` | haiku | stem + shuffled options **inline in the prompt only** | 3 per surviving candidate |
| curate | `quiz-curator` | sonnet / opus | RUBRIC.md, concept-map.json, candidates/verdicts/measurements/adversary json, `target_n`, existing `ch1-capabilities.md` (heading format) | 1 per section |
| pilot-analyst | `quiz-pilot-analyst` | opus | `runs/<P1>/`, `runs/<P2>/`, RUBRIC.md, all agent briefs | 1 |

**Every spawn prompt ends with the same two lines:**

```
Write your output to <exact path>. 
Reply with one line only: OK <path>, or FAIL <one-clause reason>. Nothing else.
```

This is not politeness. A critic that returns its verdict object in chat
instead of writing it puts ~1k tokens of JSON into your context, and you have
~200 of these to run. Artifacts go to disk; your context holds statuses.

**Batching.** Critic and adversary calls are independent, so spawn them in
parallel — multiple `Agent` blocks in one message, `run_in_background: true`.
Cap concurrency at **6**; beyond that the status stream is harder to reconcile
than the wait is worth. Never batch across stages: every critique for a section
must land before its first adversary call, because the adversary only sees
survivors.

**Isolation rules.** The adversary never sees explanations, provenance,
families, or other questions — and, having no tools, cannot go and find them.
The critic sees one candidate per call; do not "save calls" by batching two
candidates into one critic spawn, which is the single easiest way to destroy
this pipeline's value. The generator sees its own shard and no candidate from
any other shard. The curator never edits text — if `curator.json` contains
altered stem/option/explanation strings, that is a bug; `validate` diffs it
against the source candidate and will catch it.

**The second critic pass is the one deliberate exception to critic isolation.**
It receives pass 1's verdict because the alternative is worse: a fresh agent
with no memory re-derives the problem from scratch, and in practice fixes the
criterion it is shown while re-breaking the one pass 1 just repaired. This is
not a licence to carry verdicts between *different* candidates — only between
the two passes on the same one.

**Fable refusals.** `model: "fable"` needs no betas or fallbacks here, but a
refusal still surfaces as an agent that returns `FAIL` or writes nothing. Treat
it as a missing artifact: log it, name it in the report, continue. Never
silently re-spawn a refusal.

## 4. Run sequence

```
      baseline  adversary on current ch1-capabilities.md (this agent, 3 seeds)  → runs/baseline/
P1  analyse → shard → generate → dedupe → measure → queue → critique → adversary → curate → regenerate(once) → curate
        on  forecasting-timelines, defining-and-measuring-agi   (sonnet; opus critic)
P1b run `defining-and-measuring-agi` generation a SECOND way — whole-section ×2, 2N each, no shards —
        and keep both pools. This is the sharding A/B (PIPELINE §3.1); it is the only thing P1 adds
        that costs extra, and it is the only way to find out whether sharding earns its complexity.
P2  critique again on the same P1 candidates (fresh spawns, same inputs)         → verdict-stability data
    pilot-analyst → docs/pilot-findings-<date>.md
STOP ── Em reads findings; edits RUBRIC (→ v2 change-log row) and/or agent briefs
P3  same two sections, production models                                           → diff vs P1 by hand (you write the diff summary)
STOP ── Em: go/no-go
Full remaining 4 sections + review block, production models → assemble → checker all tiers → baseline-vs-new table
STOP ── Em reads every question (RUBRIC §9 + review sheets). You do nothing after this.
```

Between P3 and Full: no edits to briefs or rubric unless P3 failed.

Note that P1's critic runs on **opus**, not sonnet as the API plan had it. There
is no `effort` knob for a subagent (§8), and the critic was the one role the
plan wanted at `xhigh`. Model tier is the only lever left, so it gets the best
model even in the cheap run. Say so in the run log; it makes P1 more expensive
than QUIZ-PLAN's cost estimate and makes the P1→P3 critic diff less informative.

## 5. What you report at each STOP

One markdown note in `runs/<label>/REPORT.md`, ≤1 screen:

- what ran, models, **wall time, and spawn counts per stage** (see §8 on cost);
- checker table (per-candidate pass rates, set-level numbers where a set exists);
- adversary: mean(hit − 1/k), 4-option-only rate, **both against `runs/baseline/`, never against QUIZ-PLAN's 60%**;
- dedupe: candidates collapsed, and the critic calls that saved;
- critic: verdict split, second passes invoked, and **how often a second pass reverted rather than built on pass 1** — that is the number that says whether passing the prior verdict worked;
- curator: shipped/target per section, distribution vs §3.7, uncovered `earns_question` ideas, **siblings banked**, option-count distribution, every <4-option Q listed;
- regeneration: ideas regenerated, and how many the second curator pass then shipped — if that is near zero, the pass is not earning its place;
- sharding A/B (P1 only): pool diversity, critic pass rate and coverage, sharded vs whole-section, on the same section;
- **validation failures: every artifact that failed schema check, and whether the re-spawn fixed it.** This is new and it is a real signal — a stage that fails validation often has a brief whose Output block is ambiguous;
- anything a sub-agent did that its brief did not anticipate (this is the valuable part — cite ids);
- the single next action you recommend.

No prose summaries of the questions. Em reads the review sheets, not your précis.

## 6. Do not

- Write, edit, or "lightly fix" any stem, option, or explanation. If staging fails a set-level gate, the fix is to the prompts/rubric + a re-run of that section (QUIZ-PLAN phase 5). This includes hand-repairing a malformed agent artifact.
- Upgrade the adversary model, grant it tools, or batch questions into one adversary call. The metric dies three separate ways.
- Let the critic compute lengths. If a verdict's `measurements` differ from `measurements.json`, the critic recomputed — `validate` flags it; put it in the report.
- Batch two candidates into one critic spawn.
- **Pre-filter candidates on mechanics before the critic.** Dropping everything that fails R8/R9 first looks like an obvious saving and is a mistake: RUBRIC §10's closing caution is that *none* of its own five rewrites was inside the band on first draft. Mechanically-failing candidates carrying a good idea are the rewrite path's whole purpose. Dedupe is safe because a duplicate adds no idea; mechanical filtering is not, because length is the most rewritable fault there is.
- Regenerate an idea twice, or regenerate an idea the curator already covered. Once, and only against a reported gap.
- Raise generation above 4N to buy quality. Extra candidates are nearly free to *write* — output tokens on a call whose expensive input is already paid — but every one adds a full Opus critic call, and the 8th candidate in a call is worse than the 1st because the model is straining to differentiate. Buy extra attempts from another shard, lens or model, not from a longer list. P1 measures marginal candidate quality; revisit then, not before.
- Paraphrase a brief into your own prompt, or inline a brief's text instead of spawning its agent. If a brief is unclear, that is a finding for `pilot-findings`; run it as written.
- **Compose a spawn prompt by hand, or edit a rendered one before sending it.** If a template does not fit the call, the fix is to the template — reviewed and committed — not to the text you paste. An improvised prompt cannot be diffed against the one before it, and every comparison in this pipeline depends on that.
- Map adversary answers to ids and seeds by hand. Record them against the prompt *file name* in `ablation/picks.json` and let `ablate-score` do the mapping.
- Touch `public/questions/`, `README.md`, or `ATLAS_HANDOFF.md`. Those are phase 7, Em's.
- Ask Em questions you can answer from the four docs in §0. Ask the ones you cannot, at a STOP, in the report.

## 7. Done means

`runs/<Full>/REPORT.md` exists; `staging/ch1-capabilities.md` passes
`check-questions.mjs` on every tier (tier 3 warnings allowed); every artifact
validates; every section has a review sheet; and you have stopped.

## 8. What moving to Claude Code agents changed

Four things the API design relied on are gone. Three are handled; one is a real
loss and must not be papered over in the findings.

| API mechanism | Status here | Replacement |
|---|---|---|
| `output_config.format` + JSON schema | **gone** | `pipeline.mjs validate` (§2). Costs a re-spawn now and then; buys the same guarantee one step later. |
| `output_config.effort` per call | **gone, no replacement** | Subagents have no effort parameter. The critic's `xhigh` is approximated by giving it `opus` in every run, P1 included. **This is the real loss.** Two consequences for the findings: P1 is not the cheap run QUIZ-PLAN costed, and a P1-vs-P3 critic comparison now varies only in the generator, not the critic. The pilot analyst must not read P1 critic behaviour as evidence about a cheap critic — there isn't one. |
| `stop_reason: "refusal"`, Fable betas/fallbacks | **gone** | Refusal is indistinguishable from any other failure: no artifact. Handled as a missing artifact, logged, never silently retried. Fable needs no beta headers as a subagent. |
| per-call token + cost logging | **gone** | `run.log` records stage, agent, model, section, candidate id, start/end, artifact path, ok/fail — but not tokens or dollars. Take a session-level cost reading before and after each run and record the delta as the run's cost. Per-stage cost attribution is no longer available; if Em needs it, spawn counts per stage (§5) are the proxy. |

Two things got **better**, and they are worth keeping if this ever moves back:

- ~~**Adversary isolation is now structural.**~~ **Corrected 2026-09-23: it is
  not.** This line claimed `tools: []` means the agent cannot reach the
  chapter. The harness lists `quiz-adversary` with *all* tools, and the agent
  named file tools when asked. What actually holds is behavioural: across ~70
  spawns it has used no tool, and the canary test passed. That is weaker than
  structural and must be re-checked every run (§1), not assumed.
- **The script/agent split is cleaner.** All arithmetic in `pipeline.mjs`, all
  judgment in agents, no model calls inside the script. The rule "models never
  count characters" is now enforced by architecture rather than by instruction.

One thing got **worse in a way that flatters the metric**, so it is called out
twice on purpose: **the adversary now thinks, and cannot be told not to.** It
over-estimates the hit rate. That direction is safe — it over-flags rather than
under-flags — but it breaks comparison with QUIZ-PLAN's 60% baseline. Re-measure
the current file with this agent first (§1, §4) and compare only against that.

## 9. The calibration loop — standing rules

The adversary result on real material cannot tell "the question leaks" from
"the adversary already knows this subject". On a passage invented for the
purpose, knowledge is zero by construction, so every hit above the floor is the
question leaking. This loop is how the pipeline's prompts and rubric are tuned
**before** anything is spent on production sections.

### 9.1 Prompts are files

Until 2026-09-23 you composed spawn prompts on the fly, and two things went
wrong that no amount of care would have prevented: the adversary prompt the
script built and the one actually sent differed by a sentence for every spawn
after the baseline, and the first options-only probe was worded with a cue
("an invented academic framework") that may itself change what is being
measured. A file can be reviewed, diffed, versioned and tested; an improvised
prompt can only be remembered. So: every spawn uses a template (§3), and any
change to a template is a reviewed commit, noted in the run log of the first run
that uses it.

### 9.2 The critic is out of the loop for now

**Decision, 2026-09-23: the critic is dropped from calibration runs** until the
rubric's believability rules are calibrated. It is the governing cost of the
pipeline (roughly 7–14 window-points per Opus call against ~0.45 for the
adversary), and it does not change the thing the loop measures. Its template
(`prompts/critique.md`) is kept current for production. A calibration result is
therefore always a statement about **generator output**, and must never be set
beside a post-critic number without saying so in the same sentence.

### 9.3 The loop

```
preregister --run <label> --file <committed prediction>      before anything is measured
bench-run   --run <label> --section <slug> --bench <id>       copy passage → runs/<label>/<slug>/section.md
  (first use of an entry only: analyse → bench-map --bench <id> --from <label>/<slug>)
  → generate-section (1 call, up to 8)        prompts/generate-section.md, --model sonnet
  → merge → measure                           script
  → bench-claim-map (1 call) → claim-map      which claim each question tests, AFTER generation
  → ablate --rungs full,options-only --seeds 1
  → one spawn per prompt file, agent as the manifest names it; paste the file's text verbatim
  → ablation/picks.json  {"<rung>/<NN>": "<letter>"}
  → ablate-score        the ladder, question as the unit, split directional / passage-only
  → ablate --seeds 3 --seed-offset <k> --ids <flagged>   confirmation, only for what the screen flagged
```

**Floors.** Passage-only items are judged against 25% chance and the 40%
hand-authored floor. Directional items are judged against max(share, 1 − share),
the score of a reader who always picks the sensible option (or always its
reverse) — about 50% on a balanced passage. `bench/README.md` has the reasoning.

Manipulation arms test one hypothesis at a time, each holding everything else
byte-identical:

- `bench-rewrite-stem` — stems only (tested 2026-09-20: 15/15 → 14/15, hypothesis rejected);
- `bench-rewrite-distractors` — wrong options only, stem and key held.

The rewrite agent's output is applied by **`pipeline.mjs arm`**, which **dies**
unless the held fields are byte-identical, every option keeps its slot (so the
same seed puts the key in the same letter), and every quoted passage sentence in
the rewrite exists verbatim. (An earlier version of this section said "the
script verifies that before anything is spawned". No such code existed; the
2026-09-20 stem arm was checked by a one-off script. Corrected after review.)

`arm` writes two section dirs, `arm/` and `control/` — the same ids, unmodified.
Ablate **both** with the same `--seed-offset`, so they are paired with each other
but use fresh seeds, and compare arm with control. **Never compare an arm with
the screen that selected its ids**: re-measuring items chosen for scoring high
drifts down on its own (regression to the mean) and flatters any manipulation.
Add the `sighted` rung (`--rungs full,options-only,sighted --passage <path>`)
whenever an arm is meant to make questions harder to guess: if the sighted
rate falls too, the rewrite made them ambiguous, not better.

**Pre-register the interpretation before any result exists**: write it to a
committed file and run `pipeline.mjs preregister --run <label> --file <path>`
before the first `ablate`. `ablate-score` checks the timestamps and warns if
nothing preceded the ablation. State every percentage with its n and its
interval in the same sentence.

### 9.4 Keeping it cheap — the orchestrator's overhead

The adversary is cheap; the expensive thing in the early fiction runs was the
orchestrator. So:

- **Screen at one seed, confirm at three.** Detecting that a leak exists needs
  more questions, not more seeds; `ablate-score` lists what to confirm.
- **Do not hand-compose, hand-map, or hand-score.** `ablate` writes the prompts
  and the manifest; you record *file → letter*; `ablate-score` does the rest.
  The one control analysis that went wrong (2026-09-20) went wrong in exactly
  the hand-mapping step.
- **Read each adversary prompt once**, and paste it verbatim into its spawn.
  Do not re-read prompt files to "check" them after passing them on.
- **One irreducible cost, stated so no one tries to optimise it away:** the
  adversary must not read files (§1), so each prompt's text passes through your
  context once on its way to the spawn. That is the price of isolation. Do not
  "fix" it by giving the adversary a path.
- Reuse the bench. A passage and its concept map cost about as much as the
  whole rest of an iteration; they are built once.

A full iteration — one generator call plus a one-seed, two-rung ladder over
eight questions — costs roughly a fifth of a 5-hour window. The early fiction
runs cost most of one.

### 9.5 External reviewers

A template change that matters is reviewed before it is used, by an Opus
subagent (`prompts/review.md`) and by Gemini (`prompts/review-gemini.md`, sent
with `scripts/gemini-review.mjs`). Both receive the same request body. Their
findings are recorded under `reviews/<date>-<subject>/` together with **which
were accepted and why each rejected one was rejected**. The Gemini key lives
outside the repository and is sent only as a request header.

### 9.6 The voice panel and the explain rungs (added 2026-09-23)

**Why.** Readers that share pretraining share priors, so a leak that one Claude
model finds in another Claude model's questions may be a family artifact rather
than something any reader would exploit. Non-Claude readers answer the same
prompt files, and the result is reported per voice and pooled.

**How.** `scripts/voices.mjs` is the only code in the pipeline that calls a model
API; `pipeline.mjs` stays model-free. Voices, families and panels are in
`scripts/voices.json`; keys live outside the repository as
`maddy-home/key-<provider>.txt` and are sent only as headers.

```
voices.mjs status | probe                                   which voices are up today
voices.mjs answer --run R --section S [--panel P | --voices a,b] [--rungs ...] [--max-per-voice N]
voices.mjs ask --prompt-file F --out O [--panel single]     one request, first voice that answers
```

- `answer` sends each prompt file byte-for-byte and files the reply as
  `ablation/voices/<voice>/<rung>/<NN>.json`. A reply on disk is never re-sent;
  transient failures are retried and otherwise left for the next invocation; a
  daily cap or auth failure marks the voice down until its reset. It works
  through first seeds before later ones, so partial coverage still covers every
  question. Report coverage per voice; never treat an unanswered prompt as a miss.
- API voices answer every prompt of the `full`, `options-only` and explain
  rungs. The Claude subagent answers only what the manifest assigns it
  (`ablate --claude-seeds K --claude-explain-seeds K`); its letters go in
  `picks.json`, its explain replies verbatim to
  `ablation/voices/claude-haiku/<rung>/<NN>.txt`.
- An API voice structurally cannot read files, which is the isolation the Claude
  adversary only has behaviourally.
- The only per-voice differences are API settings (lower thinking for letter
  mode where configured, JSON mode for explain mode), recorded per call with any
  the provider rejected.

**Reading the letter rungs across voices.** Per voice, with coverage. Per
family (voices of one pretraining lineage averaged per question). The panel
headline is the median of family rates over complete-case questions; pooled
trials are secondary. Each family is judged against its own floor
(`runs/2026-09-23-FLOORS`). Unparseable API replies are reported and left out of
the rate; `truncated` and `empty` replies are recorded and never scored.

**Explain rungs.** `ablate --rungs ...,full-explain,options-only-explain
--explain-seeds K` renders `prompts/adversary-explain.md`: per option a
probability and cue codes from `_partials/tell-codes.md`, with `other` + note
and `no-tell`. `ablate-score` writes `tells.json` and `tells.md`. The headline per code is
**cue-follow**: the hit rate of a reader who used only that cue, per question
then over questions, with a bootstrap interval, per family and pooled. Beside it:
the rate on picked vs not-picked options and **lift among not-picked options**
(the rationalisation check), each voice's agreement between its explain pick
and its own letter pick, the placebo `position` (should sit at chance),
agreement between claimed cues and what the checker measures (mean rank of
tagged vs untagged options), impossible claims (stem echo with no stem shown),
the `other` share as the code list's coverage check, and per-question option
ratings. Options with missing, empty or unknown codes are unrated and out of
every denominator. Design and its review: `reviews/2026-09-23-voices/`. **Explain hit rates are diagnosis and are never pooled with the
letter rungs**: a reader asked to reason cracks more than one asked for a letter.

**Not adopted:** feeding cues back into the critic or generator. Proposed with a
held-out family for measurement; needs its own decision.
