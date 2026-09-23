**Specific questions about this bench passage.** The passage exists so that the pipeline's multiple-choice questions can be tested on content a reader cannot know: an Opus-written invented section, which the pipeline's analyst and generator will read as ordinary textbook prose, and which the blind reader will never see. `private/claims.json` is the author's own tagging of every load-bearing claim; `bench-check.json` is the script's mechanical check of it. Answer these, in addition to anything else you find.

1. **Analogy in disguise.** Does any part of the framework map cleanly onto a real theory, so that a reader could reason about the real thing instead? Name the real theory if so. A family resemblance to a whole field is less serious than a one-to-one mapping of a specific argument.

2. **Honest tagging.** For each claim in `claims.json`, is `naive_answer` what a sensible outsider really would guess, and is `naive_is_right` recorded correctly against the passage? The balance check in `bench-check` is only as good as these tags. Name any claim you would tag differently, and say which way.

3. **Heuristics.** Is any generic test-taking heuristic still a reliable guide to this passage's truths — including ones the author did not list, such as "the more specific option is right", "the option that names a mechanism is right", or "the answer that qualifies the claim is right"?

4. **Passage-only facts.** Are the claims tagged as having no sensible guess genuinely unguessable, or can any be reconstructed by reasoning a reader could do without the passage?

5. **Consistency and answerability.** Does any claim contradict another, or depend on something the passage never states? Would a careful reader of the passage be able to answer questions about each load-bearing claim correctly?

6. **Framing leaks.** Does anything in `passage.md` itself tell a reader it is invented, or that it exists for testing or measurement?

7. **Discrimination pairs.** Are they real distinctions that the passage states, rather than two names for one thing?
