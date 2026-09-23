---
stage: bench — write ONE fabricated passage for the fiction bench
agent: general-purpose
model: opus
placeholders: [bench_id, out_dir, avoid]
optional: []
paths: []
reply: OK <path> | FAIL <reason>
notes: >
  `avoid` is derived from bench/README.md's entries table. Word count is fixed
  so passages are comparable.
  Rev 2026-09-23 after review #2 and #11:
  - The old items 3 + 7 ("at least four counterintuitive claims"; "avoid these
    heuristics") built a new leak: in an invented domain "counterintuitive" can
    only mean "contrary to generic priors", so the contrarian answer would be
    reliably right. All five of undercraft's counterintuitive claims had the same
    polarity. The rule is now balance, and every claim is tagged so the balance
    is checked by bench-check, not trusted.
  - The fabrication notice no longer goes in passage.md. The analyst and
    generator read passage.md as their prose; telling them it exists to measure
    guessing changes the conditions they write under.
---
Write one fabricated textbook section for a measurement bench. Bench id: `{{bench_id}}`.

Working directory: `{{workdir}}`.

**What it is for.** A quiz pipeline writes multiple-choice questions from textbook prose. We need to know whether those questions can be answered by someone who has never read the source. On real material we cannot tell, because the model answering already knows the subject. So we need a passage about something no model can know, and we run the real pipeline over it.

**Write 1400–1800 words** of conceptual textbook prose with sub-headings, in the register of a serious undergraduate text: it explains ideas, draws distinctions, works one example. Not a story, not an encyclopedia entry.

The constraints below are the whole experiment and matter more than polish.

1. **Invent the domain completely** — terminology, named researchers, framework, numbers. Not AI, machine learning, computing or forecasting. Do not echo these existing bench domains: {{avoid}}.
2. **No analogy in disguise.** If the framework maps cleanly onto a real one — the central quantity is transparently "efficiency", the argument is transparently supply and demand, natural selection, or a bias–variance trade-off — a reader reasons about the real thing and the bench is void. Build a structure with no clean real-world counterpart.
3. **Truth must not correlate with how a claim sounds.** Decide each directional claim's direction independently of which way sounds sensible. Across the passage, **roughly half** the directional claims should go the way a sensible outsider would guess, and half against. State each outright.
4. **Generic test-taking heuristics must be right about as often as wrong.** "The moderate middle is right", "quality peaks at a medium size", "the most insidious-sounding thing is the most dangerous", "the surprising answer is the right one", "more is better": do not avoid these — *balance* them, so that no heuristic is a reliable guide to the passage's truths.
5. **Prefer load-bearing claims that have no sensible direction to guess at all**: which of two named effects applies where, how a quantity is defined, who objected to what and on what grounds, which of two procedures comes first. Include **at least four** of these. In the previous bench, the one question built on such a fact was answered correctly 0 times in 3 by a reader who had not seen the passage.
6. **Internally consistent and genuinely inferable.** A careful reader must be able to answer questions about it correctly. Incoherent prose produces unanswerable questions and a spuriously low score that looks like success and means nothing.
7. **At least three discrimination pairs** — concepts a careless reader would conflate, where the distinction is real and stated.
8. One or two named figures or quantities with specific numbers, as illustration rather than load-bearing.
9. **`passage.md` contains the section and nothing else.** No note saying it is invented, no mention of quizzes, tests, benches or measurement. That belongs in the notes.

Write the section to exactly: `{{out_dir}}/passage.md`

Then write two files under `{{out_dir}}/private/`:

- `passage-notes.md`, in plain language: a first line stating the passage is fabricated for measurement and is not a real source; the discrimination pairs; any part that is a thin renaming of something real, named honestly; any place where you could not balance a heuristic; your exact model ID.
- `claims.json`, one JSON array with an entry for **every load-bearing claim**:
  `{"id": "C1", "claim": "...", "naive_answer": "what a sensible outsider would guess, or null if there is no sensible guess", "naive_is_right": true | false | null, "heuristics_right": ["generic heuristics from item 4 whose prediction is TRUE here"], "heuristics_wrong": ["generic heuristics from item 4 whose prediction is FALSE here"], "passage_only": true | false, "quote": "the sentence in passage.md that states it, verbatim"}`.
  `bench-check` counts both heuristic lists across the passage and flags any heuristic that is reliably right or reliably wrong.
  `naive_is_right` is `null` exactly when `naive_answer` is. `quote` must appear verbatim in `passage.md`; this is checked.

Reply with one line only: `OK {{out_dir}}/passage.md` or `FAIL <one-clause reason>`. Nothing else.
