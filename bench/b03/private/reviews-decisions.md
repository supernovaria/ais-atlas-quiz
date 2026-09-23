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

## Round 2 — verification review (`private/reviews/verify.md`)

Verdict: *ready, with caveats*; nothing blocking. Round-1 findings 1, 2 and 4–9
judged addressed; finding 3 *partly* — the replacement diagnostic still has a
physical basis, but the reviser tagged it guessable itself, which the reviewer
judged honest and acceptable. All six caveats accepted; they are tags and
one-line prose.

| # | finding | verdict | action |
|---|---|---|---|
| V1 | C13 and C25 are tagged passage-only while also carrying a heuristic that predicts them; C13 is the author template's own example of common sense | **accept** | Retag both as the reviewer describes (passage-only 13 → 11), then recheck heuristic balance. Tags set the floor, so this is the priority. |
| V2 | C39 (Emmerick's rule adopted) is a disputed tag and went the less guessable way | **accept** | Under the tie-break: `naive_is_right: true`, naive answer "the more robust rule was adopted". |
| V3 | With Emmerick carried into practice, the Sellen lattice has two defensible classes | **accept** | "by Varrenby's rule, a lattice is ostral when…"; add "Under current practice, then, the Sellen lattice is calvine."; update C10's text. |
| V4 | The Tasker mechanism no longer says why draught matters | **accept** | One clause tying the replacement to the condition without making the air stretch anything, as the reviewer proposes. |
| V5 | The wennet definition excludes the spur the passage calls a wennet | **accept** | "A wennet is fastened only to other threads, at both ends, and at no point touches the rock." |
| V6 | Residual name leaks not recorded (Orrin/orra, slackening/slackens, pilse, calvine) | **accept** | Record all four in the notes; replace the lamp sentence's "slackens" with "softens". |
