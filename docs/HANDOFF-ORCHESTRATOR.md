# Handoff — build and run the question-generation pipeline

> For a Claude Code instance working inside `ais-atlas-quiz/`. You are the
> **orchestrator**. You build the missing pieces, spawn the sub-agents, run the
> pilot, and stop at the gates marked **STOP** for Em. You do not write, judge,
> or select questions yourself.
>
> **This version runs on Claude Code subagents, not direct API calls.**
> Rev 2026-09-18. What that changed, and what it cost, is §8 — read it before
> you trust a number this pipeline produces.

## 0. Read first, in this order

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
| `docs/EXEMPLARS.md` exists, 8–10 Q + 2 counter-exemplars | phase 2 done | Build it per QUIZ-PLAN phase 2. Lift §10 afters + Takeoff Q1 + Review Q4 (fixed) + 3 fresh. Each exemplar carries level, measurements, D1 provenance per distractor. **STOP** for Em to approve before P1. |
| `scripts/check-questions.mjs` tiers 1–2 exist and reproduce RUBRIC App. A on the current file (60% / 75% / 1.39 / 24-of-40) | phase 3 done | Build tiers 1–2 (+1b anchors) per QUIZ-PLAN phase 3. Import `parseChapterMarkdown` from `src/quizParser.js`; no second parser. Tier-1 option minimum is **2**. Baseline must match Appendix A or the checker is wrong. |
| `scripts/pipeline.mjs` exists (§2) | — | Build it. It is smaller than the API version: agents replace most of it. |
| `atlas-audio-read-along/dist/chapters/v1/capabilities/*.md` readable | 11 files, ~25.7k words | Present at `../atlas-audio-read-along/…`, verified. Do not scrape. |
| Agent models `sonnet`, `haiku` selectable (P1); `opus`, `fable` (P3+) | | Spawn one throwaway agent per model tier and confirm it returns. Report which are missing. P1 needs only sonnet + haiku. |
| **`quiz-adversary` has no file tools** | `tools: []` honoured | Spawn it once with `"List the tools you have, then stop."`. If it names Read/Grep/Glob, **the adversary metric is void** — stop and tell Em. This is the one isolation guarantee the API version got for free. |
| Adversary baseline re-measured on the current 40-Q file with *this* agent | a number in `runs/baseline/` | Do it before P1. QUIZ-PLAN's "≥60%" is API-era and not comparable (§8). |
| RUBRIC v2 signed off (QUIZ-PLAN phase 1), incl. R2 amendment + §3.8/§4.6 from PIPELINE §8 | | Proceed with P1 on v1 if v2 is pending — P1's purpose is to find what v2 needs — but say so in the run log. |

## 2. Build `scripts/pipeline.mjs`

Plain Node, same deps as the repo. **This script does everything deterministic
and nothing judgmental.** Every model pass is a subagent spawn that you make;
every arithmetic, file, and format operation is this script. That split is
cleaner than the API design, where the script also carried the model calls.

```
node scripts/pipeline.mjs measure   --run <label> --section <slug>   # candidates.json → measurements.json
node scripts/pipeline.mjs shuffle   --run <label> --section <slug> --seeds 3   # adversary prompt bodies, seeded
node scripts/pipeline.mjs validate  --run <label> [--section <slug>]  # schema-check every artifact (§3)
node scripts/pipeline.mjs score     --run <label> --section <slug>   # adversary letters → adversary.json
node scripts/pipeline.mjs assemble  --run <label>                    # staging/*.md → ch1-capabilities.md candidate
node scripts/pipeline.mjs report    --run <label>                    # the §5 tables
```

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

| Stage | `subagent_type` | Model (P1 / production) | Inputs (as paths in the prompt) | Calls |
|---|---|---|---|---|
| analyse | `quiz-section-analyst` | sonnet / sonnet (opus if P1 shows gaps) | RUBRIC.md, `<section>.md`, `misconceptions/<section>.md` if present, `target_n` | 1 per section |
| generate | `quiz-generator` | sonnet / **opus + fable, one call each, 2N each** | RUBRIC.md, EXEMPLARS.md, concept-map.json, `<section>.md`, request `{count, lenses, mode}` | 2 per section |
| measure | *(script)* | — | — | — |
| critique | `quiz-critic` | opus | RUBRIC.md, `<section>.md`, concept-map.json, **one** candidate, its measurements | 1 per candidate (+1 per failed rewrite, max) |
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
this pipeline's value. The generator does not see other candidates from either
model. The curator never edits text — if `curator.json` contains altered
stem/option/explanation strings, that is a bug; `validate` diffs it against the
source candidate and will catch it.

**Fable refusals.** `model: "fable"` needs no betas or fallbacks here, but a
refusal still surfaces as an agent that returns `FAIL` or writes nothing. Treat
it as a missing artifact: log it, name it in the report, continue. Never
silently re-spawn a refusal.

## 4. Run sequence

```
      baseline  adversary on current ch1-capabilities.md (this agent, 3 seeds)  → runs/baseline/
P1  analyse+generate+measure+critique+adversary+curate  on  forecasting-timelines, defining-and-measuring-agi   (sonnet; opus critic)
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
- curator: shipped/target per section, distribution vs §3.7, uncovered `earns_question` ideas, option-count distribution, every <4-option Q listed;
- **validation failures: every artifact that failed schema check, and whether the re-spawn fixed it.** This is new and it is a real signal — a stage that fails validation often has a brief whose Output block is ambiguous;
- anything a sub-agent did that its brief did not anticipate (this is the valuable part — cite ids);
- the single next action you recommend.

No prose summaries of the questions. Em reads the review sheets, not your précis.

## 6. Do not

- Write, edit, or "lightly fix" any stem, option, or explanation. If staging fails a set-level gate, the fix is to the prompts/rubric + a re-run of that section (QUIZ-PLAN phase 5). This includes hand-repairing a malformed agent artifact.
- Upgrade the adversary model, grant it tools, or batch questions into one adversary call. The metric dies three separate ways.
- Let the critic compute lengths. If a verdict's `measurements` differ from `measurements.json`, the critic recomputed — `validate` flags it; put it in the report.
- Batch two candidates into one critic spawn.
- Paraphrase a brief into your own prompt, or inline a brief's text instead of spawning its agent. If a brief is unclear, that is a finding for `pilot-findings`; run it as written.
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

- **Adversary isolation is now structural.** `tools: []` means the agent cannot
  reach the chapter even if a prompt leaked a path. The API version relied on
  the caller assembling the right context every time.
- **The script/agent split is cleaner.** All arithmetic in `pipeline.mjs`, all
  judgment in agents, no model calls inside the script. The rule "models never
  count characters" is now enforced by architecture rather than by instruction.

One thing got **worse in a way that flatters the metric**, so it is called out
twice on purpose: **the adversary now thinks, and cannot be told not to.** It
over-estimates the hit rate. That direction is safe — it over-flags rather than
under-flags — but it breaks comparison with QUIZ-PLAN's 60% baseline. Re-measure
the current file with this agent first (§1, §4) and compare only against that.
