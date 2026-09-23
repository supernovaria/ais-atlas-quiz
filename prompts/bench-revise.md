---
stage: bench — revise ONE passage against its review(s), before it has any results
agent: general-purpose
model: opus
placeholders: [bench_id, out_dir, decisions]
optional: []
paths: [decisions]
reply: OK <path> | FAIL <reason>
notes: >
  Only for a passage with NO results (bench rule: a passage is fixed once it has
  results; after that it is retired, never patched). `decisions` is the
  orchestrator's verdict file on the review, which names the review file(s).
  The tie-break is fixed here, not left to the reviser: a disputed tag goes the
  more guessable way, because a bench that overstates its unguessability makes
  its floor look like leakage.
---
Revise one bench passage against its review. Bench id: `{{bench_id}}`.

Working directory: `{{workdir}}`.

Read:
1. `{{decisions}}` — which review findings were accepted, and what each requires. It names the review file(s); read those too.
2. `{{out_dir}}/passage.md`, `{{out_dir}}/private/claims.json`, `{{out_dir}}/private/passage-notes.md`.
3. `prompts/bench-author.md` — the standard the passage must meet. It has been tightened since the passage was written; meet the current version.

Then revise the three files in place so that every **accepted** finding is addressed.

Rules for the revision:

- **Tag disputes go the more guessable way.** Where a review says an outsider could guess a claim and you are not sure it is wrong, tag the claim as guessable. You may keep your original tag only where the review misread the passage, and you must quote the passage to show it.
- **Rebalance by adding or changing claims, not by re-tagging.** If honest tags push the share of directional claims where the sensible guess is right outside 30–70%, fix it in the prose: add claims, or change what a claim says.
- Keep `passage.md` to the section itself — no mention of invention, testing or measurement.
- Keep 1400–1800 words.
- Every `quote` in `claims.json` must appear verbatim in the revised `passage.md`.

Also write `{{out_dir}}/private/revision-log.md`: one line per accepted finding, saying what you changed, or — if you declined — why, with a passage quote.

`pipeline.mjs bench-check` is run on the result. A passage that cannot pass it is retired.

Reply with one line only: `OK {{out_dir}}/passage.md` or `FAIL <one-clause reason>`. Nothing else.
