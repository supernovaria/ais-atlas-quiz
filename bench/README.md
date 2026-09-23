# Fiction bench

Fabricated textbook passages, written once and reused, so the pipeline's
questions can be tested on content **no reader can know**. On real material a
blind reader's hit rate mixes two things — the question leaking, and the reader
already knowing the subject. Here the second is zero by construction, so every
hit above the floor is the question leaking.

How the bench is used is `docs/HANDOFF-ORCHESTRATOR.md` §9. This file records
what is in it.

## Rules

- **The adversary never sees anything in this directory.** Not the passage, not
  the notes, not a concept map, not a path. It receives one shuffled question,
  pasted inline, and nothing else.
- **A passage is fixed once it has results.** Rewriting a passage after seeing
  how the blind reader did means measuring your own editing. A passage that turns
  out to be flawed is retired and a new one added, never patched.
- **Each passage is reviewed before first use** (`prompts/review.md`, and
  `prompts/review-gemini.md` when available) for whether it is genuinely
  unguessable, internally consistent and not an analogy in disguise.
- Every entry keeps: `passage.md`, `passage-notes.md` (the author's own account
  of its counterintuitive claims, discrimination pairs, passage-only facts and
  known leak sites), `concept-map.json` (from the real `quiz-section-analyst`),
  and `reviews/`.

## Floors to compare against

| reference | hit rate |
|---|---|
| chance, four options | 25% |
| hand-authored fiction, no planted tell (`runs/tier4-control`, clean group) | 40% |

The 40% is the more honest comparator for any four-option question: a reader can
tell which option a textbook "would" call correct without knowing anything, and
that premium never goes away.

## Entries

| id | domain | status | results |
|---|---|---|---|
| `undercraft` | invented sociology of ensemble stage performance | **reference** — reviewed by the orchestrator only; predates this README | `runs/2026-09-20-FICTION` (75%, n = 8), `-FICTION-B` (stem rewrites: 15/15 → 14/15; options only: 4/6) |

Known weaknesses of `undercraft`, recorded by its author before any result:
the projection/undercraft split is loosely evocative of the real
stage-presence/stagecraft distinction, and its troupe-size effect is an inverse
U — a shape a guesser can apply without reading anything. Its question on that
effect was answered 3/3.
