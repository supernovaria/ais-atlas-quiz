---
stage: bench manipulation — rewrite STEMS only, hold every option
agent: quiz-generator
model: sonnet
placeholders: [passage, candidates, ids, out]
optional: [finding]
reply: OK <path> | FAIL <reason>
notes: >
  Run 2026-09-20-FICTION-B used this to test "the leak is in the stem". It moved
  15/15 to 14/15, so that hypothesis failed. Kept for reuse. The script verifies
  every non-stem field is byte-identical before anything is spawned.
---
A targeted stem-rewrite task, not a normal generation call.

Working directory: `{{workdir}}`.

Read:
1. `{{passage}}` — the section prose.
2. `{{candidates}}` — the candidates.

{{?finding}}

Rewrite the **stem only** of these candidates: {{ids}}.

In priority order:
1. **The question must stay answerable by a reader who has read the passage.** A stem that withholds so much that nobody can answer it makes the experiment "succeed" trivially and tells us nothing.
2. **Give the reader the situation, not the inference.** Remove any contrast, pairing or two-sided structure the correct option merely names, so that the passage — not the stem — is what supplies it.
3. **Change nothing but `stem`.** Also check the options: if one of them restates the premise you are withholding, say so in `what_i_withheld` — you cannot remove it, and the test is not clean for that candidate.
4. Keep roughly the current length. Straight ASCII quotes; double outside, single when nested.

Output one JSON array of `{"id": ..., "stem": ..., "what_i_withheld": "one sentence"}`, one per id, and nothing after the closing bracket.

Write it to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
