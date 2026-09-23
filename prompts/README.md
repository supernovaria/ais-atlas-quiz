# Spawn prompts — one file per stage

Every subagent spawn in this pipeline is built from a file in this directory.
**The orchestrator never writes a spawn prompt by hand, and never edits one
after rendering.** It renders one:

```
node scripts/pipeline.mjs prompt <template> --run <label> --section <slug> [--bench <id>] [--id <candidate-id>]
                                            [--model <m>] [--letter <x>] [--idea <id>] [--set key=value ...]
```

or takes it from a prompt file the script wrote (`shuffle`, `ablate`, `canary`),
and passes the text, unmodified, as the `prompt` of the `Agent` call.

## Why this exists

Until 2026-09-23 the orchestrator composed spawn prompts on the fly. Two things
went wrong that no amount of care would have prevented:

- **The prompt the script built and the prompt actually sent drifted.** The
  adversary preamble in `pipeline.mjs` never said "Do not use any tools"; every
  adversary spawn sent in P1 and the fiction runs did. One sentence, silently
  different between the baseline and everything after it.
- **Ablation probes were worded ad hoc.** The first options-only probe told the
  adversary it was looking at "an invented academic framework" — a cue that may
  itself change how a test-wise reader picks, which is the thing being measured.

A file can be reviewed, diffed, versioned and tested. An improvised prompt can
only be remembered. The first review of these templates is
`reviews/2026-09-23-prompts/`, with a verdict on every finding.

## Conventions

- **Agent briefs and spawn prompts are different things.** A brief
  (`.claude/agents/*.md`) is the agent's standing system prompt: its role, its
  rules, its output schema. A spawn prompt is the per-call request: which
  inputs, which paths, which parameters, where to write. **A template never
  restates a brief's rules** — duplicated rules drift apart, and the brief is the
  one that governs. Where a template must override a brief rule for one kind of
  call, it says so explicitly and names every rule it overrides.
- **No free-text slots.** A placeholder the orchestrator fills with prose of its
  own choosing is a hand-written prompt moved into a variable. Placeholders take
  paths, ids, numbers and derived values; fixed text the script inserts lives in
  `_partials/`.
- **Everything derivable is derived** — paths, the model and shard letter that
  `merge` reads back from ids and file names, a regeneration's reason from
  `curator.json`, a bench's domain list. Setting a derived value by hand needs
  `--override`, which is logged.
- **Every rendered prompt is recorded** under `runs/<label>/prompts/` (or
  `bench/<id>/prompts/`) and logged with the template's and the text's sha256.
- A **re-spawn after a validation failure uses the identical prompt.**
- Front matter documents the template and is stripped before sending:

  ```
  ---
  stage:        what this spawn does
  agent:        subagent_type
  model:        model override
  placeholders: [required, names]
  optional:     [names that may be empty]
  paths:        [placeholders whose values are input files; they must exist]
  reply:        what the agent replies with
  ---
  ```

- `{{name}}` is required; the renderer **dies** if it is missing or blank.
  `{{?name}}` is optional; a line holding nothing else is dropped when it is
  empty. `{{> part}}` includes `_partials/<part>.md`, one level deep.
- **Auto-filled** by the renderer, and never declarable: `workdir`,
  `stem_formats`, `lenses`, `levels`, `verdicts`. The enums come from the same
  constants `validate` enforces.
- The renderer normalises whitespace in the **template only**, so a stem or
  option reaches the agent exactly as it will ship.
- The selftest lints every template — declarations match use in both
  directions, no auto key declared, no malformed `{{ … }}` token that would be
  sent literally — and renders every template with dummy values.

## Index

| file | stage | agent |
|---|---|---|
| `analyse.md` | concept map for one section | `quiz-section-analyst` |
| `generate-section.md` | whole-section generation (the default since P1b) | `quiz-generator` |
| `generate-shard.md` | one shard (legacy; sharding lost the A/B) | `quiz-generator` |
| `regenerate.md` | one fresh candidate for an uncovered idea | `quiz-generator` |
| `critique.md` | judge one candidate, pass 1 — out of the calibration loop | `quiz-critic` |
| `critique-pass2.md` | second pass on a rewrite that failed re-measurement | `quiz-critic` |
| `curate.md` | select the shipped set, write the review sheet | `quiz-curator` |
| `pilot-analyst.md` | findings over a set of runs | `quiz-pilot-analyst` |
| `adversary-mc.md` | blind reader — rungs `full` and `options-only`, and the canary | `quiz-adversary` |
| `sighted-reader.md` | the same question with the passage — rung `sighted` | `general-purpose` (haiku) |
| `adversary-free-recall.md` | stem, no options — rung `stem-only`, real sections only | `quiz-recall` |
| `grade-recall.md` | grade one free-recall answer | `general-purpose` (sonnet) |
| `bench-author.md` | write one fabricated bench passage | `general-purpose` (opus) |
| `bench-rewrite-stem.md` | manipulation arm: rewrite stems, hold options | `quiz-generator` |
| `bench-rewrite-distractors.md` | manipulation arm: rewrite distractors, hold stem and key | `quiz-generator` |
| `review.md` / `review-gemini.md` | critique a set of artifacts | `general-purpose` (opus) / Gemini |

| partial | inserted as |
|---|---|
| `_partials/review-body.md` | the shared body of both review templates |
| `_partials/stem-withheld.md` | the stem slot of the options-only rung |
| `_partials/canary-stem.md` | the stem of the isolation canary |
| `_partials/ideas-line.md` | a bench run's fixed idea list |
| `_partials/extra-input-misconceptions.md` | a section's misconceptions file, when one exists |
| `_partials/prior-findings-line.md` | a prior findings file for the pilot analyst |
