# Adversary brief deviations observed during the baseline run

Recorded as they happened. These are things the agent did that its brief did not
anticipate — HANDOFF §5 calls this the valuable part of the report.

- `Foundation Models Q3#3` — emitted a full reasoning paragraph after its letter,
  despite the brief's prompt saying "Do not explain. Reply with a single letter."
  and the brief's Output section saying "one letter, as the agent's entire final
  message". The letter was still correct and first, so `pipeline.mjs score`
  parsed it via the single-unambiguous-letter regex. Logged rather than
  re-spawned: the pick is usable and re-rolling it would bias the sample.

- `Leveraging Scale Q4#2` — returned the adversary brief's **script-assembled**
  output object as if it were its own required format:
  `{"id": "unknown", "picked": "A", "reasoning": "…"}`. The brief prints that
  JSON under a heading reading "Output (script-assembled, not model-written)",
  and the model imitated it regardless. `pipeline.mjs score` recovered the
  correct letter, but only because the first word-bounded single letter in the
  string happened to be the pick. A payload like `{"id": "a-1", "picked": "C"}`
  would have silently scored as `A` — a wrong hit, not a missing one.
  Two findings, one for each doc:
  - quiz-adversary brief: the "Output" section should not show a JSON object at
    all, since the agent cannot distinguish "this is what the script builds from
    your letter" from "this is your output format". Replace the block with a
    single line: `Your entire final message is one letter: A, B, C, D or E.`
  - pipeline.mjs: `score` now records `raw` and `verbose` for any answer that is
    not a bare letter, so a mis-parse is visible in adversary.json instead of
    hidden inside a plausible-looking hit.
