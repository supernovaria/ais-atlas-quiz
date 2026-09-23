# Spawn prompts — one file per stage

Every subagent spawn in this pipeline is built from a file in this directory.
**The orchestrator never writes a spawn prompt by hand.** It renders one:

```
node scripts/pipeline.mjs prompt <template> --run <label> --section <slug> [--id <candidate-id>] [--set key=value ...]
```

and passes the output, unmodified, as the `prompt` of the `Agent` call.

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
only be remembered.

## Conventions

- **Agent briefs and spawn prompts are different things.** A brief
  (`.claude/agents/*.md`) is the agent's standing system prompt: its role, its
  rules, its output schema. A spawn prompt is the per-call request: which inputs,
  which paths, which parameters, where to write. **A template never restates a
  brief's rules** — duplicated rules drift apart, and the brief is the one that
  governs.
- **Front matter documents the template** and is stripped before sending:

  ```
  ---
  stage:        what this spawn does
  agent:        subagent_type
  model:        model override
  placeholders: [required, names]
  optional:     [names that may be empty]
  reply:        what the agent replies with
  ---
  ```

- `{{name}}` is required. The renderer **dies** if any is left unfilled.
- `{{?name}}` is optional and renders empty when not supplied.
- **Auto-filled** by the renderer, never passed by hand: `workdir`,
  `stem_formats`, `lenses`, `levels`, `verdicts`. The enums come from the same
  constants `validate` enforces, so a prompt cannot state one list while the
  checker enforces another.
- File-writing agents end with the standard contract: write to one exact path,
  reply `OK <path>` or `FAIL <reason>`, nothing else (HANDOFF §3).
- The selftest renders every template here with its declared placeholders and
  fails if a template uses a placeholder it does not declare, or declares one it
  does not use.

## Index

| file | stage | agent |
|---|---|---|
| `analyse.md` | concept map for one section | `quiz-section-analyst` |
| `generate-section.md` | whole-section generation (the default since P1b) | `quiz-generator` |
| `generate-shard.md` | one shard (legacy; sharding lost the A/B) | `quiz-generator` |
| `regenerate.md` | one fresh candidate for an uncovered idea | `quiz-generator` |
| `critique.md` | judge one candidate, pass 1 | `quiz-critic` |
| `critique-pass2.md` | second pass on a rewrite that failed re-measurement | `quiz-critic` |
| `curate.md` | select the shipped set | `quiz-curator` |
| `pilot-analyst.md` | findings over a set of runs | `quiz-pilot-analyst` |
| `adversary-mc.md` | test-wise reader, full question — **ablation rung `full`** | `quiz-adversary` |
| `adversary-options-only.md` | options, no stem — **ablation rung `options-only`** | `quiz-adversary` |
| `adversary-free-recall.md` | stem, no options — knowledge probe, real sections only | `quiz-adversary` |
| `bench-author.md` | write one fabricated bench passage | `general-purpose` |
| `bench-rewrite-stem.md` | ablation manipulation: rewrite stems, hold options | `quiz-generator` |
| `bench-rewrite-distractors.md` | ablation manipulation: rewrite distractors, hold stem and key | `quiz-generator` |
| `review.md` | critique a set of artifacts (Opus subagent or Gemini) | `general-purpose` / Gemini |
