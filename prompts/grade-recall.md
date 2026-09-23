---
stage: grade one free-recall answer against the key's claim
agent: general-purpose
model: sonnet
placeholders: [stem, answer, key_text]
optional: []
paths: []
reply: exactly one word — match, partial, miss, idk or refusal
notes: >
  Replaces grading by the orchestrator, whose role is to judge nothing (review
  #6). The grader is deliberately NOT told the rung, the multiple-choice result,
  or which section this came from, so it cannot grade toward an expected answer.
  One answer per spawn.
---
Grade one short answer against a reference answer.

**Question:**
{{stem}}

**Reference answer** (the claim a correct answer must carry):
{{key_text}}

**The answer to grade:**
{{answer}}

Reply with exactly one word, and nothing else:

- `match` — the answer carries the reference answer's load-bearing claim.
- `partial` — it overlaps, but misses or contradicts a load-bearing part of the claim.
- `miss` — it answers, but wrongly.
- `idk` — it declines, saying it does not know.
- `refusal` — it declines for any other reason, such as asking for answer options or saying the question is incomplete.

If the reference answer has two parts and the answer gets one right and the other wrong, that is `partial`, not `match`. Do not use any tools.
