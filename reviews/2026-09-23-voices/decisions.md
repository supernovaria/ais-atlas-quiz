# Decisions on the 2026-09-23 voice-panel review

Reviewer: Opus 5.5 subagent (`opus.md`), from `opus-prompt.txt`, reading `files.txt`.
`pipeline.mjs` was given as `pipeline-excerpt.mjs` (the ablate and ablate-score
stages) so that both reviewers get the same request. The Gemini review of the
same request arrived a day later and is dealt with in its own section below.

| # | finding | verdict | what changed |
|---|---|---|---|
| 1 | Codes follow the reader's own `p`, so lift partly measures reader accuracy | **accepted** | Code list made flat (no "looks right / wrong" headings). `codes` asked for before `p`. Placebo code `position` added. `tells` now reports rate on picked vs not-picked options and **lift among not-picked options**, and each voice's **agreement between its explain pick and its own letter pick** on the same question and order. The causal test — remove the cue, re-measure the letter rung — is written into ORCHESTRATOR-PROMPT as the condition for any brief change. |
| 2 | Pooled panel and a single 40% floor compare the wrong things | **accepted** | Panel headline is now per **family** (a family's voices averaged per question), and the median of family rates over **complete-case** questions; pooled trials kept as secondary. Gemma is now family `google`. Per-voice floors: calibration run on `runs/tier4-control` items prepared (`runs/2026-09-23-FLOORS`). Floors are not yet wired into `claim-map` scoring; the prompt tells the orchestrator to state panel predictions against each family's own floor. |
| 3 | Queue order leaves rungs covering different questions | **accepted** | Sort is seed → question → rung. `ablate-score` reports each voice's full vs options-only on the questions it answered in both. |
| 4 | Empty / missing / all-invalid codes counted as "rated, no cue" | **accepted** | Such options, and `no-tell` mixed with other codes, are **unrated**: out of every denominator, counted per voice. A voice with over 10% unrated options is left out of the pooled tables. The prompt now requires at least one code per option. |
| 5 | Faithfulness uses unique maxima, so it has a low ceiling | **accepted** | Ranked properties now report the mean percentile rank of tagged vs untagged options. |
| 6 | Pooled lift is a poor headline | **accepted** | Headline is **cue-follow**: the hit rate of a reader who used only this cue (toward / away), per question then over questions, with a seeded question-level bootstrap interval, per family and pooled. Code groups (`group:qualified`, `group:dismissible`) reported as unions beside the single codes. Lift kept as a secondary column. |
| 7 | Reasoning effort, temperature and persona differ between voices | **accepted in part** | Temperature sent explicitly (1.0). A voice's thinking level now applies to both modes. Reasoning tokens reported per voice per rung. **Not done:** the persona experiment (API voice with and without the brief as a system message) — recorded as an open item. |
| 8 | Truncated replies scored as misses; empty ones retried forever | **accepted** | `truncated` and `empty` are recorded statuses, never scored, never retried silently. Unparseable API letter replies are reported and left out of the rate; the Claude subagent keeps its miss-counting so its baseline stays comparable. PANEL line prints unparsed. |
| 9 | Re-running `ablate` deletes voice replies | **accepted** | The guard now refuses when `voices/` holds any reply, not only when `picks.json` exists. |
| 10 | Scoring reads mutable inputs | **accepted** | Manifest records `stem_shown`, `tell_codes` and the partial's sha256; scoring uses them. `ablate-score` dies if an API record's `prompt_sha256` does not match the prompt file. |
| 11 | Code list: missing / overlapping cues | **accepted in part** | Added `opposites`, `hedged`, `position`; "qualified" removed from `most-detailed`. Overlaps kept as separate codes, merged at analysis time. **Not added:** `cautious-stance` — it is plausible on real AI-safety sections but meaningless on the fiction bench; the `other` notes of the first run will show whether it recurs. |
| 12 | Feeding cues back will Goodhart | **accepted as policy** | Not code: ORCHESTRATOR-PROMPT keeps feedback out of scope and records the reviewer's design for when it is decided — only cross-question aggregates reach briefs; hold out a reader family (letter mode only) *and* a set of sections; judge a change on held-out readers with fresh seeds against their own floors. |
| 13 | Gemini's reset hour wrong half the year | **accepted** | Reset computed in `America/Los_Angeles`. |
| 14a | Brief contradicts the explain template | **already done** | `quiz-adversary.md` gained an "Explain mode" section before the review ran. |
| 14b | pick-invalid counted as a miss | **accepted** | Left out of the explain hit-rate denominator and counted. |
| 14c | JSON-mode drop fires on unrelated errors | **accepted** | Matches `response_format` / `responseMimeType` only. |
| 14d | Model drift under aliases | **accepted** | `ablate-score` warns when a voice answered under more than one `model_version`, or with different dropped settings. |
| 14e | More impossible-claim counts | **deferred** | Needs the claim map inside the explain analysis; minor. |
| 14f | Explain prompt worded differently from the letter prompt | **accepted** | First sentence now identical to `adversary-mc.md`. |

Selftest after these changes: 164 assertions, all passing (136 before this work).

## Gemini review (`gemini.md`, gemini-3.6-flash, received 2026-09-24)

Same request body, same files, sent by `scripts/gemini-review.mjs` after
a day of 503s and quota caps. **Caveat:** Gemini read the *current*
`voices.mjs`, `voices.json`, template and code list, but the *pre-fix*
`pipeline-excerpt.mjs`, a static snapshot taken before the Opus changes. So
several findings describe code that had already changed by the time it arrived.

| # | finding | verdict | what changed |
|---|---|---|---|
| G1 | pick-invalid replies counted as misses | **already fixed** (Opus 14b); **accepted** the extra part | `pick` now also parses "Option A" and "A." as a letter. That is parsing, like `letterRow` accepting "B.". Anything else stays `pick-invalid`: left out of the explain hit rate and counted. |
| G2 | truncated/empty/error calls vanish from the counts | **accepted in part** | The letter ladder already reported `statuses` per voice. `tells` now also reports every call with no scorable reply, per voice and status, in the summary and at the top of `tells.md`. They are never scored. |
| G3 | pooled panel over-weights Google | **already fixed** (Opus #2) | Family averaging and the median of family rates. |
| G4 | ranking by lift buries distractor tells and puts ∞ first | **already fixed** in substance (Opus #6); **accepted** the sort | Rows are sorted by how far the stronger cue-follow direction (toward the key, or away from it) sits from chance, so a distractor tell ranks as high as a key tell. Lift is a secondary column. |
| G5 | JSON order makes a reader tag early options before seeing later ones | **rejected** | Every option is in the prompt and read before any output is written. Asking for `strategy` first would make the reader commit to an answer before naming features, which is the rationalisation Opus #1 asked us to prevent. The not-picked lift and letter-pick agreement measure what is left of it. |
| G6 | thinking settings differ across providers | **accepted as documentation** | Parity isn't reachable: Gemini's lowest level is "minimal", ministral does not reason, the OpenRouter free models reason by default, and the Claude subagent always thinks. Reasoning tokens are reported per voice per rung (Opus #7), so the asymmetry is visible, not hidden. |
| G7 | stem echo uses unique maxima | **already fixed** (Opus #5) | Percentile ranks. |
| G8 | no explicit length / grammar codes | **accepted** | Added `longest`, `shortest`, `grammatical-fit`. `most-detailed` now says "whatever its length". Faithfulness checks `longest`/`shortest` against measured length rank. |

Selftest after these: 164 assertions, all passing.
