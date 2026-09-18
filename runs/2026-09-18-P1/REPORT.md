# P1 — STOP at preflight, 2026-09-18

**Nothing ran.** Preflight failed at the agent-resolution gate, which HANDOFF §1
and the run prompt §3 both make a hard stop. No pipeline subagent was spawned, no
artifact generated, no question written. Budget consumed: ~EUR 0 (three one-word
model probes).

## The blocker

The six `quiz-*` agent types are not selectable in this session:

```
Agent type 'quiz-adversary' not found. Available agents:
claude, claude-code-guide, Explore, general-purpose, Plan, statusline-setup
```

That error enumerates every selectable type, so it settles all six at once; I did
not spend five more failing spawns to confirm individually.

**Cause — scoping, not malformed definitions.** The briefs live only at
`ais-atlas-quiz/.claude/agents/`. This session was launched rooted at `atlas/`,
the *parent* directory. There is no `.claude/` at `atlas/`, at `maddy-home/`, or
at user level (`~/.claude/agents` does not exist). Claude Code discovers project
subagents from the session's project root at startup, so the definitions were
never loaded. All six files parse: frontmatter carries `name`, `description`,
`tools`, `model` as expected, and `quiz-adversary` does declare `tools: []`.

HANDOFF §0 specifies "a Claude Code instance working inside `ais-atlas-quiz/`".
The session was simply started one level too high.

## Preflight status

| check | result |
|---|---|
| `git status` clean, on `main` | ok |
| `npm run check:questions:selftest` | ok — 14/14 Appendix A metrics, 1 documented divergence (`absolutes_keys`) |
| `npm run check:exemplars` | ok — exit 0, "no exemplar file", the expected state (PIPELINE §6.1) |
| `../atlas-audio-read-along/dist/chapters/v1/capabilities/*.md` | ok — 11 files, 25,726 words |
| `sonnet` / `haiku` / `opus` selectable | ok |
| six `quiz-*` types resolve | **FAIL** |
| `quiz-adversary` has no file tools | **not run** — gated behind the above |
| session cost reading | EUR 32.99 / 65.00 extra-usage (monthly counter) |

Note on the cost baseline: no per-session or per-call cost figure is exposed
(HANDOFF §8 anticipated this). The monthly extra-usage counter is the only
reading available, so the §5 "delta" will be a monthly-counter delta and will
include any unrelated spend in the same window. Flagging it because it is weaker
than what HANDOFF §5 assumes.

## Conflicts between the run prompt and HANDOFF

One, recorded as instructed. HANDOFF §1 makes `git push` a precondition ("`main`
is ahead of `origin/main` — push before you spend anything"), and PIPELINE §9.8
repeats it. The run prompt says commit as you go and **do not push**. The run
prompt wins, so I would not have pushed. Worth noting that `main` is currently
*not* ahead — working tree clean and up to date with `origin/main` — so the
precondition is satisfied anyway and the conflict is moot this run.

## What I did not do

I did not build `scripts/pipeline.mjs`. Preflight is specified as stop-and-report
rather than work-around, and the script's nine stages encode schemas from briefs
whose loading is exactly what is broken — building it against a configuration
that cannot run it risks baking in assumptions nothing can yet check. It remains
deliverable #1 and costs no API spend, so it is the first thing to do once the
agents resolve.

## Next action

I have moved this session's root to `ais-atlas-quiz/`. That takes effect at the
end of the turn, so it is unverified. **Say go and I will re-run the agent-type
probe plus the `quiz-adversary` toollessness check as the first thing.** If the
types resolve, preflight is complete and the run proceeds from
`scripts/pipeline.mjs` with no further input from you.

If re-rooting does not load them, the fallback is to restart the session with
`ais-atlas-quiz/` as its directory, which is what HANDOFF §0 assumes. Either way
the fix is configuration; nothing in the pipeline design is implicated.
