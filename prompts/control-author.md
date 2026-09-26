---
stage: control — hand-authored "clean" control items on a bench passage (the per-reader floor)
agent: general-purpose (Claude, opus) or a Codex review voice (gpt-6-sol) via scripts/voices.mjs ask
model: opus | gpt-6-sol
placeholders: [passage, claims, n, author, out, run_label, section, bench_id]
optional: []
paths: [passage, claims]
reply: OK <path> | FAIL <reason>
notes: >
  Why (runs/2026-09-23-FLOORS, 2026-09-24): the "clean" floor of the old
  control set was 40% for Haiku but 63-73% for the Google, Mistral and Nvidia
  families, on only 5 questions. The floor is reader-specific and needs more
  items. These are written on the SAME bench passages the generator is tested
  on, so the floor is "how guessable is a carefully written question about this
  exact content", the fairest comparator for a bench run.
  Two author families (Claude and GPT), reported separately, so the floor does
  not measure one author's house style. Authors never see each other's files or
  any generator output.
  The author is told the purpose. Unlike the generator, a control author cannot
  bias the measurement by knowing it: its job IS to write the least guessable
  honest question it can, and the purpose says exactly that.
  The mechanical criteria are enforced by `pipeline.mjs control-check`, which
  the author runs itself; the list below says what they are so the author can
  meet them on the first draft, not so the orchestrator trusts the author.
  Deliberately NOT asked: "avoid the moderate middle" and similar
  shape-of-the-key bans. Review 2026-09-23 #3 found they can only be met by
  making distractors as hedged as the key, i.e. ambiguous. The rule instead is
  parity: whatever surface form the key has, the distractors share.
---
You are writing **control questions**: multiple-choice questions about the invented textbook passage `{{passage}}`. They measure a floor: how often a reader who has **never seen the passage** can still pick the right answer of a question written with care. Blind readers from several model families will answer them from the stem and options alone. Your job is to write the least guessable **honest** questions you can: a reader who understood the passage should find each one straightforward, and a reader who did not should find every option believable.

Read `{{passage}}` and `{{claims}}` (every load-bearing claim of the passage, tagged by its author). Write **{{n}}** questions, one claim each, no two on the same claim.

**Which claims.** In `claims.json`, a claim with `naive_is_right` true or false is *directional*: a sensible outsider would guess its direction, and that guess is right or wrong. A claim with `naive_is_right` null is *passage-only*: nothing outside the passage suggests the answer. Choose about half directional and half passage-only. Among the directional ones, pick about as many where the outsider's guess is right as where it is wrong.

**Each question**
- Tests understanding of its claim — a reason, a consequence, an application, a contrast — not recall of a name or a number.
- Has four options and exactly one correct answer. The correct answer must be unambiguously supported by the passage.
- Every wrong option is a specific misreading a real reader of the passage could hold. Record it in that option's `"misreading"`: who would believe it, and why.
- Surface parity: whatever form the correct option has — specific or general, qualified or plain, a contrast, a mechanism — the wrong options have the same form. Nothing about wording, length, register or structure should single out the correct option.
- Never a wrong option that denies what the question takes for granted ("there is no such effect" answering "what is the effect of…").
- Never refers to "the passage", "the text", "the section" or "the author" in the stem.

**Mechanical criteria** (`control-check` enforces these; meet them on the first draft):
- Option lengths within about 20% of each other; longest at most 1.6× the shortest; the correct option neither the longest nor the shortest.
- No absolute words in any option: always, never, entirely, exclusively, conclusively, impossible, cannot, or "no … at all".
- The correct option carries no more hedge words than the median wrong option (tends to, often, may, typically, largely, might, could, sometimes, generally, usually, likely, broadly, somewhat, partly).
- Straight ASCII quotes only; no underscore emphasis.

**Output.** Write a JSON array to `{{out}}`:

```
[
  {
    "id": "{{section}}/ctrl-{{author}}/01",
    "group": "clean",
    "author": "{{author}}",
    "claim": "<claim id from claims.json>",
    "stem": "…",
    "options": [
      {"text": "…", "key": true},
      {"text": "…", "key": false, "misreading": "…"},
      {"text": "…", "key": false, "misreading": "…"},
      {"text": "…", "key": false, "misreading": "…"}
    ],
    "explanation": "<two or three sentences: why the key is right, citing the passage>"
  }
]
```

Number the ids 01, 02, … in order. Then run:

`node scripts/pipeline.mjs control-check --run {{run_label}} --section {{section}} --bench {{bench_id}}`

and revise your own items until every one of them passes. Other authors' files may be in that directory: do not open or edit them, and do not read anything else under `runs/`.

Write your output to `{{out}}`.
Reply with one line only: `OK {{out}}`, or `FAIL <one-clause reason>`. Nothing else.
