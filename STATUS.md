# AI Safety Atlas quiz — status

*Last updated 2026-09-27 (evening). Rewritten, not appended: this page always describes now.*

## What this is

A pipeline in which AI agents write multiple-choice quiz questions for chapter 1
of the AI Safety Atlas. A script does the counting and checking; separate agents
write, critique and select the questions. The hard part is making sure a
question can't be answered **without** having read the chapter, so a large part
of the work is measuring how guessable the questions are. We do that with
"blind readers" (models that see only the question) and invented textbook
passages that no reader can know.

## Where we are

We're measuring the **floors**: how often each reader model gets a question
right by pure test-taking skill, on control questions written by hand to be
clean. Without these numbers we can't tell a leaky question from a smart
guesser. There are two control sets:

- **The old control set** (`runs/2026-09-23-FLOORS`): replies from the non-Claude
  readers are still coming in as free quotas allow. Some of them aren't
  committed yet.
- **The new clean control items** (`runs/2026-09-26-CONTROL`): 10 items per
  invented passage, half by Opus and half by GPT-6 Sol. Haiku guesses 30% and
  37% right on the two passages (chance is 25%). On the first passage the
  other reader families land at 29–52%, median 38%. Sonnet and Opus, asked
  once each for comparison, guess 60% on the first passage; on the second,
  Opus 60% and Sonnet 11%. Those are 10 questions each, so treat them as hints.
  The second passage still lacks Gemini, Qwen and Nemotron (out of free quota)
  and most of Gemma. See `runs/2026-09-26-CONTROL/REPORT.md`.

## Recently done

- **09-27** — All clean control items written and answered by Haiku, Sonnet,
  Opus and most of the reader panel.
- **09-26** — A write-enabled Codex author voice for the GPT-6 Sol control items.
- **09-26** — Opus's half of the clean control items, plus the predictions.
- **09-26** — One source file per agent brief, feeding both Claude and Codex.
  Also: the OpenAI models join the reader panel through Codex, and a checker
  for control items.
- **09-26** — The multi-family reader panel (Gemini, Gemma, Mistral and free
  OpenRouter models), so a leak can be told apart from "Claude reads Claude".
- **09-23** — Two invented bench passages (`b02`, `b03`) finished and ready to
  use.

## Next up

1. **Bench iteration 1** (starting 09-27): the pipeline writes questions on both invented
   passages, and every reader family tries to answer them blind. This tells us
   how guessable the questions are, which cues give them away, and whether
   non-Claude readers see the same cues. It's planned in detail in
   `docs/ORCHESTRATOR-PROMPT.md` ("This run").
2. **Testing whether a cue is real**: take a suspected cue out of 5–10
   questions, change nothing else, and see whether guessing drops. Only then
   does a cue change the agents' instructions.

## Waiting on

- **Free quotas, again**, to finish the second passage's control replies
  (Gemini resets about 09:00, OpenRouter about 02:00 your time).
- **Free API quotas**: Gemini allows about 20 requests a day per model, and
  OpenRouter's free models are often overloaded. Panel data arrives over
  several days.
- **Gemini paid reviews**: these failed on 09-23 because the credits had run
  out. It hasn't been checked since.

## Decisions that are yours

- **Should the readers' cue reports ever feed back into the question writers'
  instructions?** Not adopted. A reviewer proposed a safe design (hold some
  readers and sections out, judge on those). It's waiting on you, and on the
  first bench results.
- **The persona experiment**: does a non-Claude reader answer differently if it
  gets the adversary's brief as its instructions? It's open, and it's cheap.

## Moving parts

| part | what it is |
|---|---|
| `scripts/pipeline.mjs` | the script: every step that counts, checks or measures |
| `agents/` | the instructions for each agent role (writer, critic, blind reader…) |
| `prompts/` | the exact prompt files sent to agents; never improvised |
| `scripts/voices.mjs` | sends questions to the non-Claude readers |
| `bench/` | the invented textbook passages |
| `runs/` | every run's inputs, replies and reports (the audit trail) |
| `docs/KNOWLEDGE.md` | what's established, what was withdrawn, traps (for agents) |
| `docs/ORCHESTRATOR-PROMPT.md` | how to start a pipeline session |
| `npm run status` | this page as a live dashboard, with what each running session is doing |
