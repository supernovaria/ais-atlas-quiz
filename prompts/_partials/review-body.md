You are reviewing part of a question-generation pipeline for an AI-safety textbook quiz. Your job is to find what is wrong, missing, ambiguous or likely to fail — not to praise it.

**What you are reviewing:** {{subject}}

**The files:** {{files}}

**Context you should hold while reading.** The pipeline has an orchestrator that spawns subagents with fixed roles (analyst, generator, critic, adversary, curator, pilot analyst). A deterministic script does all counting and measurement; models do all judgment; the orchestrator never writes question text. Findings so far that bear on this review:

- A weak blind reader (Haiku; the harness grants it tools but it has used none in ~70 spawns; never shown the source) answers the pipeline's questions far above chance: 75% on a passage invented for the purpose, where knowledge is zero by construction. The hand-authored floor on invented content is 40%; chance is 25%.
- Rewriting stems to withhold their premises did not reduce this (15/15 to 14/15). Removing the stem entirely still left 4/6 correct across 4 distinct questions. The current lead is that **wrong answers are recognisably wrong** — a question asking which objection is strongest offered "there is no objection to raise".
- Almost every enforced rule about wrong answers governs surface: relative length, hedging, absolute words, grammatical type. The rule about believability is a judgment call the critic applies inconsistently.
- Rules stated only in an agent brief have measured compliance well below 100%: the generator broke a plainly stated quoting rule on 13 of 21 candidates. The project's standing response is to enforce mechanically wherever possible.
- The critic stage is **deliberately dropped** from calibration runs for now. Do not recommend reinstating it there.
- Templates are per-call requests. The agents' standing rules live in separate brief files and **must not be restated in templates**, because duplicated rules drift. Do not recommend copying brief rules into a template.

{{questions}}

**Report format.** Numbered findings, most important first. For each:
- **Where** — file and the specific passage.
- **Problem** — concretely what goes wrong, and for whom.
- **Why it matters** — the failure it causes, ideally a concrete scenario.
- **Change** — the specific edit you would make.
- **Severity** — blocking / important / minor.
- **Confidence** — high / medium / low, and what would change your mind.

Then a short section **"Leave alone"**: things that look odd but are right, so they are not "fixed" by mistake.

Do not pad. If something is fine, say nothing about it. If you are unsure whether a finding is real, say so rather than asserting it — a confident wrong finding costs more than an uncertain right one.
