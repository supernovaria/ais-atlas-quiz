---
stage: bench — write ONE fabricated passage for the fiction bench
agent: general-purpose
model: opus
placeholders: [bench_id, out_dir, words, avoid]
optional: [domain_hint]
reply: OK <path> | FAIL <reason>
notes: >
  The bench measures whether the pipeline's questions can be answered by a reader
  who has not read the source. On real material that cannot be separated from
  the reader simply knowing the subject; on a passage invented for the purpose,
  knowledge is zero by construction, so every hit above the floor is the question
  leaking. Lessons carried from runs/2026-09-20-FICTION are items 6 and 7.
---
Write one fabricated textbook section for a measurement bench. Bench id: `{{bench_id}}`.

Working directory: `{{workdir}}`.

**What it is for.** A quiz pipeline writes multiple-choice questions from textbook prose. We need to know whether those questions can be answered by someone who has never read the source. On real material we cannot tell, because the model answering already knows the subject. So we need a passage about something **no model can know**, and we run the real pipeline over it.

**Write {{words}} words** of conceptual textbook prose with sub-headings, in the register of a serious undergraduate text: it explains ideas, draws distinctions, works one example. Not a story, not an encyclopedia entry.

{{?domain_hint}}

The constraints below are the whole experiment and matter more than polish.

1. **Invent the domain completely** — terminology, named researchers, framework, numbers. Not AI, machine learning, computing or forecasting. Do not echo these existing bench domains: {{avoid}}.
2. **No analogy in disguise.** If the framework maps cleanly onto a real one — the central quantity is transparently "efficiency", the argument is transparently supply and demand, natural selection, or a bias–variance trade-off — a reader reasons about the real thing and the bench is void. Build a structure with no clean real-world counterpart.
3. **At least four load-bearing claims are counterintuitive**: the sensible-sounding answer is the wrong one, and the passage says so explicitly.
4. **Internally consistent and genuinely inferable.** A careful reader must be able to answer questions about it correctly. Incoherent prose produces unanswerable questions and a spuriously low score that looks like success and means nothing.
5. **At least three discrimination pairs** — concepts a careless reader would conflate, where the distinction is real and stated.
6. **At least three passage-only facts that no heuristic reconstructs**: who objected to what, how a quantity is defined, which of two named effects applies where. In the previous bench, the one question built on such a fact was answered 0/3 by the blind reader; the ones built on reasoning a reader could do unaided were answered 3/3.
7. **Avoid load-bearing claims that a generic test-taking heuristic predicts.** Three were observed to leak: "the answer is the moderate middle", "quality peaks at a medium size" (inverse-U), and "the most dangerous thing is the most insidious-sounding one". If one of these is genuinely part of your framework, keep it but list it in the notes as a known leak site.
8. Include one or two named figures or quantities with specific numbers, as illustration rather than load-bearing.
9. Open the file with a two-line notice that the content is fabricated for measurement, so no one mistakes it for a real source.

Write the section to exactly: `{{out_dir}}/passage.md`

Then write `{{out_dir}}/passage-notes.md`, in plain language: (a) each counterintuitive claim and its "obvious wrong answer"; (b) the discrimination pairs; (c) the passage-only facts; (d) any part that is a thin renaming of something real, named honestly; (e) any known leak sites under item 7; (f) your exact model ID.

Reply with one line only: `OK {{out_dir}}/passage.md` or `FAIL <one-clause reason>`. Nothing else.
