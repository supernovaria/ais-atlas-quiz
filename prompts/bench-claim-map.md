---
stage: bench — say which passage claim each generated question tests (AFTER generation)
agent: general-purpose
model: sonnet
placeholders: [candidates, claims, out]
optional: []
paths: [candidates, claims]
reply: OK <path> | FAIL <reason>
notes: >
  Makes the b02 review's finding #4 measurable. Directional claims carry a floor
  of about max(share, 1 - share) for a reader who just picks the sensible (or the
  reverse) option, so their items must be scored against that floor, not against
  25% or 40%. Passage-only items are scored against 25% / 40%.
  Runs only AFTER generation: the tagger sees private/claims.json, and nothing
  downstream of it writes questions. The orchestrator never assigns claims.
  `pipeline.mjs claim-map` validates the output and resolves each claim's type.
---
Match each question to the passage claim it tests.

Working directory: `{{workdir}}`.

Read:
1. `{{candidates}}` — generated multiple-choice questions. Use each one's stem and correct option.
2. `{{claims}}` — the passage's load-bearing claims, each with an id.

For every question, find the **one** claim whose truth the correct option depends on. If the correct option depends on two claims equally, pick the one a reader would most need to know. If it depends on no listed claim, use `null`.

Output one JSON object mapping each question's `id` to a claim `id` or `null`, with an entry for every question and nothing after the closing brace.

Write it to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
