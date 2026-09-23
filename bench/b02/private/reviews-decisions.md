# Decisions on the b02 review (Opus, self-reported claude-opus-5-5)

Review: `private/reviews/opus.md`. Gemini: not run (HTTP 402, credits depleted).
b02 has **no results yet**, so the bench rule "a passage is fixed once it has
results" does not bar revising it. It is revised by an author spawn
(`prompts/bench-revise.md`), not by the orchestrator.

**Tie-break for disputed tags:** where the author and a reviewer disagree about
what a sensible outsider would guess, the claim is tagged the *more guessable*
way. A bench that overstates its own unguessability produces floors that look
like leakage.

| # | finding | verdict | action |
|---|---|---|---|
| 1 | Six "passage-only" claims (P1, P3, P4, P5, P8, P9) can be guessed once a stem poses them; honest tags push naive-right to 68–74%, outside the band | **accept** | Arithmetic *verified*: 13/19 = 68%, 14/19 = 74% with #5. Revision retags them (P5 split in two) and rebalances by adding naive-wrong claims, then must pass `bench-check`. If it cannot, b02 is retired. Also added to `bench-author.md` for future passages: a passage-only fact must stay unguessable after a stem has posed it. |
| 2 | "Experts are robust but habit-bound" predicts all five locals-vs-strangers claims; C13 echoes the Ruskin/Morris case against restoration | **accept** | Tag the frame as a heuristic so `bench-check` counts it; revision makes at least one expert claim go against it; C13 echo added to the notes. "An effect named after a researcher usually describes a mistake" added to the author's heuristic list. |
| 3 | `prompts/`, `reviews/` and `bench-check.json` sit beside `passage.md` and call it invented; only `private/` is fenced | **accept** | All bench meta-files move under `private/`. Bench iteration runs copy `passage.md` to a neutral path inside the run (`bench-run`), so the analyst and generator are never pointed at `bench/`. **Residual risk, stated:** the analyst has search tools and the repository documents the bench in many places; the fence is behavioural. |
| 4 | The 30–70% band guarantees a ~50% floor on directional items, above the 40% comparator | **accept** | The most consequential finding for interpretation. `ablate-score` now splits items by claim type when a claim map exists, and reports directional items against `max(share, 1 − share)` and passage-only items against 25% / 40%. The claim map is made by a separate tagger (`prompts/bench-claim-map.md`), never by the orchestrator. |
| 5 | C3's naive answer is the less likely guess | **accept** | Retagged under the tie-break. |
| 6 | "More is better" balanced only by two stretched tags; inverse-U wins half the quantity-shape questions; C6/C7 adjacent with "behaves in the same way" | **accept** | Drop the stretched tags; `claims.json` gains an optional `shape` (rising / peaked / flat / falling) and `bench-check` warns when one shape holds for over a third of shape claims; revision de-pairs C6/C7. |
| 7 | Unlisted heuristics still reliable: the sensible mechanism, "the objection was overruled", majority rule, trade-off answer, mundane cause | **accept** | Added to the author's heuristic list so they are tagged and counted; revision adds one refuted plausible mechanism and one objection carried into practice. |
| 8 | Cant is defined for body courses only, but the index, the example and Tessaly all need the crown to have one | **accept** | One-line definitional fix in revision. *Verified* against the passage. |
| 9 | Two discrimination pairs give themselves away by their names; pair 5 is not a pair | **accept** | Notes record which half each name gives away; pair 5 dropped; "names must not give the distinction away" added to the author template. |
| 10 | Smaller consistency gaps (false crowns, C10's population, uncanted courses, "conflict", seed position) | **accept** | Fixed in revision. |
| 11 | Smaller tagging points (C2's double naive answer, C9, two missing claims) | **accept** | Fixed in revision. |

## Round 2 — verification review (`private/reviews/verify.md`)

Verdict: *ready, with caveats*. Every round-1 finding was judged addressed. The
caveats are accepted; they are tag corrections and one phrase, not structural.

| # | finding | verdict | action |
|---|---|---|---|
| V1 | "Experts beat beginners" is now right 3 times, wrong once, and untagged; "two things that seem alike are actually different" is always right, untagged. The revise prompt was rendered before these heuristics reached `bench-author.md`, so the reviser never saw them. | **accept** | Tag both across every claim they apply to. If "experts beat beginners" stays lopsided, the cheapest fix the reviewer names is C19's "slightly better" becoming "no better". Record any remaining imbalance in the notes. |
| V2 | C7 should be tagged naive-right (heavy stones stay put is physical intuition), which puts the share at 18/26 = 69%, one disputed tag from the cap | **accept** | Retag C7 as the reviewer describes, move "sensible causal story" to `heuristics_right`, and record the margin in the notes. If the share then exceeds 70%, fix it in the prose, not the tags. |
| V3 | P2 carries the named-effect tag, but only half of P2 is a mistake | **accept** | Drop the tag from P2. |
| V4 | A restored pell stone "reports a low ford whatever the water", but the next passer turns it | **accept** | "…where it reports a low ford until the next passer turns it." |
| V5 | Two small definition edges from the crown fix | **accept the first only** | "…no deliberate cant in its body courses or crown." The second (locals reading a single reversed course by eye) is left, as the reviewer advises. |
