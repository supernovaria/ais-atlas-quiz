**Specific questions.** Answer these in addition to anything else you find.

1. **Drift and conflict with the briefs.** Does any template restate a rule that its agent's brief already states (a drift risk), or instruct something that contradicts the brief? Where a template *overrides* a brief rule on purpose (e.g. `generate-section.md` relaxing stem-format variety), is the override clear enough that the agent will follow the template rather than the brief?

2. **The two ablation rungs.** `adversary-mc.md` and `adversary-options-only.md` are meant to differ in exactly one thing: whether the stem is shown. Do they? Does anything in the options-only wording itself cue the reader toward a particular kind of option (the previous ad-hoc version said "an invented academic framework", which we removed)? Would you word it differently, and why?

3. **Free recall.** `adversary-free-recall.md` asks the adversary for sentences, but the adversary's brief says its entire output is one letter and that it answers "from the stem and options alone". Two of six spawns refused last time. Will the template's "this is deliberate, so do not ask for them" be enough, or is the right fix structural (a separate agent)?

4. **The bench author — the question I most want a careful answer to.** `bench-author.md` item 7 tells the author which generic heuristics leaked last time ("the moderate middle", inverse-U, "most insidious is most dangerous") and item 3 demands at least four counterintuitive claims. Could these together **create a new heuristic** — a passage where the contrarian answer is reliably right, so "pick the option that reverses the obvious" becomes the new leak? If so, what should the template ask for instead?

5. **The distractor rewrite.** Can `bench-rewrite-distractors.md` be satisfied while keeping the leak? In particular: does "the correct option must not be identifiable as the balanced one" risk pushing the generator to make the key sound extreme, which is a different tell? Is naming a reader and misreading in `provenance` a check a model can actually be held to, or will it produce plausible-sounding provenance for implausible options?

6. **Determinism.** Is there anything that would let two orchestrators render *different* prompts for the same call — an optional placeholder whose content is left to judgment (`context_note`, `finding`, `established`, `structure`, `domain_hint`), an ambiguous path, an unstated default? Which optionals should be required, or replaced by fixed text?

7. **Missing pieces.** Is any stage of the pipeline (analyst, generator, critic, adversary, curator, pilot analyst, the bench loop) still without a template, or relying on something the orchestrator would have to improvise?

8. **The renderer** (`scripts/prompts.mjs`). Any way to get a malformed or half-filled prompt past it?
