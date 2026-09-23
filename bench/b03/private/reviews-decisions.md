# Decisions on the b03 review (Opus, self-reported claude-opus-5-5)

Review: `private/reviews/opus.md`. Gemini: not run (HTTP 402, credits depleted).
b03 has **no results yet**, so it is revised, not retired, by an author spawn
(`prompts/bench-revise.md`). The reviewer noted — correctly, from the recorded
prompt — that b03 was written from the bench-author template *before* the b02
lessons were folded in. The revision must meet the current template.

**Tie-break for disputed tags:** a disputed tag goes the *more guessable* way.

| # | finding | verdict | action |
|---|---|---|---|
| 1 | The keeping phase contradicts the Tasker drift: if keepers work only after founding, reach can never rise, and Tasker's objection is refuted by the passage's own facts | **accept — blocking** | Revision makes when reach is built unambiguous and gives Tasker a ground the passage does not itself refute, as the review proposes, then checks C15 and "hold barely changes" still read consistently. |
| 2 | Most coined names give their distinction away (span, tie, founder/keeper, reach, hold, sheeted/corded, fraying, "drift") | **accept — blocking** | Rename to neutral coinages; give both regularities the same noun; retag the affected claims guessable until renamed; notes record which half each name gives away. |
| 3 | The souring/fraying diagnostic is real rope-failure knowledge | **accept** | Replace it with a diagnostic with no physical basis, checked for new reasoning paths; physical intuition added to `bench-author.md` item 2. |
| 4 | Untagged heuristics are reliable: "the objection fails" (2/2), "things that seem alike are different" (always), "experts beat beginners" | **accept** | Emmerick's objection partly carried into practice; one apparent distinction turns out to be one thing; one claim where the beginner is right; all three tagged. The last two heuristics added to `bench-author.md`. |
| 5 | Balanced by claim count, but the claims likely to be questioned all go against the sensible guess | **accept** | *Code change*: `claim-map` now takes the directional floor from the directional **items actually asked**, item-weighted, not the passage-level share. Revision also gives at least two naive-right claims headline weight. `ideas.json` for b03 is written only after its concept map exists, balanced across claim types. |
| 6 | The centre trace, as defined, cannot find the chain the worked example says it finds; reach allows revisiting a tie | **accept** | Define what the centre trace finds, not only where it starts; add "without passing through any tie twice". `bench-author.md` item 6 now requires definitions to be checked against the worked example. |
| 7 | Tag corrections: C3, C5, C6, C9, C10, C12, C15, C16 (split, with `shape`), C21, C22 | **accept** | Under the tie-break. The reviewer's count: the naive-right share stays near 50%, but the passage-only group falls from 11 to about 5. |
| 8 | Matched pairs (C16/C17, C13/C18, the mirror-image Orrin/Tasker conditions); no `shape` tags | **accept** | Revision de-pairs them and adds `shape` to every quantity claim. |
| 9 | "Passes bench-check" overstates what was checked | **accept** | *Code change*: `bench-check` now warns on a heuristic tagged fewer than twice in either direction, and on a heuristic that is only the complement of `naive_is_right`. On b03 as written it fires three warnings, the three the review named. README status changed to "under revision". |
