# Clean control items — floors, first reading (2026-09-27, partial)

**Status: Claude floor complete; voice panel complete on b02, still arriving on
b03. Stopped at 83% weekly usage (the session's 85% guard).** Pre-registration:
`preregistration-2.md`. Question is the unit throughout; n = 10 questions per
passage (5 Opus-authored, 5 GPT-6 Sol-authored).

## What ran

- **Sol's half written** (Codex, `gpt-sol-author`, high effort): 5 items per
  passage, all pass `control-check`. Each passage now has 10 clean items.
- **Canary:** PASS under the hand-back exemption (tool_uses 1 = 1
  `SubagentHandback`, reply B, key D). See KNOWLEDGE §4.
- **Haiku (`quiz-adversary`):** 120 spawns, 3 seeds × 2 rungs × 20 questions.
  Every spawn reported tool_uses 1, all of it the hand-back. Log:
  `claude-spawns.jsonl`; letters in `b0?/ablation/picks.json`.
- **Voices:** `voices.mjs answer`, both passages, `ablation` panel.
- **Not run:** the one-seed Sonnet and Opus side readers the user asked for
  (wired as `side: true` voices, excluded from family rates), because of usage.

## Floors so far (`full` rung)

| family | b02 | b03 |
|---|---|---|
| anthropic (Haiku, 30 trials) | **30%** (9–51%) | **37%** (14–59%) |
| mistral (2 voices, 70 each) | 38% (22–53%) | pending |
| openai (gpt-luna, 30, capped) | 43% (19–67%) | pending |
| nvidia (nemotron, 26) | 37% (10–63%) | pending |
| google (4 voices, 4–10 each) | 55% (24–86%) — thin | pending |
| **panel median** | **38%** over 10 q | pending |

## Against the pre-registration (b02 only where voices are needed)

1. **Floors between 25% and each family's old clean rate:** holds for every
   family on b02 (Haiku 30 < 40; Google 55 < 67; Mistral 38 < 73; Nvidia 37 < 63).
2. **Passage-only below directional:** not yet split. Needs `claim-map`.
3. **`options-only` ≤ `full`:** **fails for Haiku on b02** (57% vs 30%). It holds
   for Mistral and Google, and is roughly level for Luna and Nemotron. On b03,
   Haiku holds (23% vs 37%). One family, one passage, n = 10: a lead, not a result.
4. **Recognition (Haiku ≥ on Opus items):** b02 goes the *other* way. Haiku scores
   13% on the Opus items and 47% on the Sol items (5 q each). That is a large
   opposite effect, but on 5 questions per author the intervals overlap, so this
   contradicts the prediction only weakly. Re-check with b03's author split.

## Defects found and fixed this session

- `voices.mjs ask` threw away any author or reviewer reply that used a tool,
  including Sol's authoring replies (their files were written regardless). Fixed:
  the tool-use rule now applies to readers only.
- The canary's `tool_uses 1` is the harness hand-back; `canary-record
  --handbacks` added by user decision.

## Next

1. Let `voices.mjs answer` finish b03 (re-run it tomorrow for the Gemini quota),
   then re-score both passages and split by claim type.
2. The Sonnet and Opus side readers: 20 seed-1 prompts per passage each, saved to
   `ablation/voices/claude-{sonnet,opus}/<rung>/<NN>.txt`, each folder with a
   `voice.json` holding `side: true`.
3. Then bench iteration 1 (ORCHESTRATOR-PROMPT "This run").
