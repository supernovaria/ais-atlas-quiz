Model: claude-opus-5-5

# Review: multi-family reader panel and explain mode (2026-09-23)

Files read in full: prompts/adversary-explain.md, prompts/_partials/tell-codes.md, prompts/adversary-mc.md, prompts/_partials/stem-withheld.md, scripts/voices.mjs, scripts/voices.json, reviews/2026-09-23-voices/pipeline-excerpt.mjs, .claude/agents/quiz-adversary.md.

Findings are ordered by importance. Line numbers refer to the excerpt file as given.

---

## 1. For the "look right" codes, lift mostly measures reader accuracy, not whether the cue gives the key away

**Where:** tell-codes.md, the three headings; adversary-explain.md lines 32–35 (`p` is requested before `codes`); `explainAnalysis` codeTable (excerpt ~396–409).

**Problem:** Seven codes are labelled "can make an option look like the intended answer", five "look wrong". Each code therefore carries a direction, and the reader has just assigned `p`. A reader who gives an option 70% will reach for a look-right code to justify that number. It will rarely put a look-right code on an option it gave 5%, because the heading says those cues make an option look right. The result is that look-right codes follow the reader's own ranking. If the reader's pick is right 75% of the time, then every look-right code shows lift well above 1 on keys, whether or not that cue is what gives the question away. Rationalisation of this kind does not show up in the faithfulness table. The key usually is the longest option, so a reader who picked by intuition and then tagged `most-detailed` gives a "faithful" tag, and the tag still says nothing about why it picked.

**Why it matters:** This is the table meant to drive changes to the generator brief. Scenario: readers crack a question because its distractor is a `denies-question` strawman, and name `textbook-voice` on the key as their reason. `textbook-voice` then tops the lift table and the generator is told to make keys "less textbook". Nothing changes in the letter rungs.

**Change:**
- Condition on the pick. For each code, report its rate on the picked option vs. the options not picked, whichever is the key. That rate is the rationalisation baseline. Then report key vs. distractor rates **among non-picked options only**, and separately for hit replies and miss replies. A real tell appears on the key even in replies where the reader chose something else. A rationalised code appears on whatever the reader chose.
- Pick agreement: seed 1 of `full` and `full-explain` show the same order (seededOrders is shared), so for each voice report how often the explain pick equals that voice's letter pick on the same prompt. When agreement is low, the codes explain a different decision from the one being scored, and they should be weighted down.
- Add one placebo code whose true lift is 1 by construction, e.g. `position` ("its place in the list"). Options are shuffled, so position cannot tell the key. If `position` shows lift ≠ 1, the tagging itself is biased and the other lifts are suspect.
- Drop the direction headings from the partial and list the codes flat, each as a description of the option's form. Move `"codes"` before `"p"` in the requested object and in the instruction list, so the features are named before the number is committed.
- The only real validation is causal. Before a cue goes into the brief, remove it from 5–10 questions on the invented passage (e.g. rewrite the `denies-question` distractor, equalise lengths), change nothing else, and re-run the letter rung. The cue earns a brief change only if hits fall.

**Severity:** blocking for the intended use (feeding cues back); not blocking for collecting data.
**Confidence:** high that the confound exists; medium on its size. If the pick-conditioned rates show look-right codes on the picked option barely more often than on other options, the problem is small.

---

## 2. The pooled panel hit rate, and the 40% floor it is judged against, compare the wrong things

**Where:** `stageAblateScore`, the panel block (~583–609) and `panel_by_claim_type` (~635–647, `floor: … 0.40`); voices.json `family` fields.

**Problem:**
- The 40% floor is a figure for one reader (hand-authored invented content, measured with Haiku). The panel and every API voice are judged against it, but the floor depends on the reader. For an 8B model it may be 30%, and for gemini-flash 55%.
- Per-question panel rates mix voices in different proportions, because coverage differs by voice and question: free quotas run out partway (see #3). A question answered by gemini-flash and qwen looks leakier than one answered only by ministral-8b, and the question-unit CI counts that composition effect as variation between questions.
- Pooling weights each voice by its number of trials, not by its family. Mistral contributes two voices. Gemini and Gemma are labelled `google` and `google-gemma`, but Gemma is a Google model trained from the Gemini line, so voices.json's own definition of family ("pretraining lineage") makes them one family. The panel therefore counts Google twice and Mistral twice, and that undercuts the reason for having a panel.

**Why it matters:** The pre-registered prediction becomes unfalsifiable in practice. Whether "the panel is above 40%" holds depends on which voices had quota that day and how strong they are, not on the questions.

**Change:**
- Make the headline per voice, and per family where each family's voices are averaged at the question level first. Report the panel as the median of per-family rates, plus the number of families above their own floor. Do not report it as a pooled trial rate.
- Calibrate a floor for each voice: run every voice once on the hand-authored invented-content set and store `floor_by_voice` next to `claim-map.json`. State each prediction as excess over that voice's own floor, e.g. "on passage-only items, at least 4 of 5 families exceed their own hand-authored floor by ≥ 15 points".
- Compute the pooled or median panel figure only over questions answered by every voice in it. Report the rest as coverage.
- Set gemma's `family` to `google`, or add a `lineage` field and group on that.

**Severity:** important. It blocks the first pre-registration that states anything about the panel.
**Confidence:** high on the floor and composition points; medium on the Gemma lineage. Documentation showing Gemma was pretrained independently of Gemini would change my mind on that one.

---

## 3. The queue order leaves rungs covering different questions, so rung comparisons within a voice are confounded

**Where:** voices.mjs `cmdAnswer`, the sort (line 274): seed, then rung, then file.

**Problem:** Within seed 1, all `full` prompts are sent before any `options-only` prompt, and both before the explain rungs. When a voice runs out of daily quota partway through, `options-only` covers only the first N questions in file order. The per-voice ladder then compares `full` over all questions with `options-only` over a prefix. The header's claim that "a run cut short by quota still covers every question" holds only for the first rung of seed 1.

**Why it matters:** The drop from full to options-only is the key contrast in the ladder (the rungs "differ only in what is withheld"). If the first questions in candidates.json are systematically easier or harder (candidates are often grouped by concept), the drop is a coverage artefact.

**Change:** Sort by seed, then question id, then rung, so that each question's rungs are answered together. In `ablate-score`, compute each voice's rung contrast on the questions where that voice answered both rungs, and print that n.

**Severity:** important.
**Confidence:** high.

---

## 4. `parseExplainReply` counts options with missing, malformed or all-invalid codes as rated options that "have no cues"

**Where:** excerpt ~666–675 (`rawCodes = Array.isArray(v?.codes) ? … : []`, `options[L] = {…}`).

**Problem:** Each of the following gives `codes: []` with no problem recorded, or with only `invalid-code`, and the option still counts in the K/D denominators of every lift:
- `"codes": "absolute, too-obvious"`, a string (a common small-model error): recorded as nothing.
- `"codes"` missing, or `"A": {}`, or `"A": null`: recorded as nothing, apart from `p-missing` in the null case.
- `["most detailed", "echoes_stem"]` (near-miss spellings): recorded as invalid-code, but the option is still counted as rated with zero cues.

In each case the option looks as if the reader considered it and saw no cue. But the prompt defines `no-tell` for that, so an empty list is a format failure, not a judgement. `["no-tell", "absolute"]` is also accepted, although the two contradict each other.

**Why it matters:** One voice that systematically writes underscores, or returns strings, pulls every code's rate toward zero on the options it rated. It does so unevenly, because weaker voices make more of these errors and also pick differently. Rates on keys and on distractors both fall, so lift survives only partly, and the per-code counts that decide what is "recurring" are distorted.

**Change:** Still parse and never repair, but record `codes-missing` (codes absent or not an array), `codes-empty` (an empty array), `codes-all-invalid` and `no-tell-with-codes`. Treat an option with any of these as **unrated**: leave it out of K, D and the tag totals, and keep it in the per-voice problem counts. Leave the reply's pick and p usable. In tells.md, print each voice's invalid-code rate next to its replies, and leave a voice out of the pooled code table when more than, say, 10% of its options are unrated.

**Severity:** important.
**Confidence:** high on the code path. The size depends on what the free models actually return; JSON mode helps with `null` and strings but not with spelling.

---

## 5. The faithfulness table is lowered by construction: each measured property can be true for at most one option per question

**Where:** `optionMechanics` (~686–699): `longest`, `echoes_stem` and `central` all use `uniqueMax`; `FAITHFULNESS_PAIRS`.

**Problem:** `longest`, `echoes_stem` and `central` are each true for at most one option per question, and for none on a tie. Readers can legitimately tag two options `most-detailed` or `echoes-stem`, and each second tag counts as "claimed where not true". "Tagged where true" therefore has a ceiling well below 1 that no reader could exceed. Ties set the property to false for every option.

**Why it matters:** This table is the current test for rationalisation (question 2). A low score will be read as "readers invent cues" when it may only mean "readers tag two options".

**Change:** Measure by rank or margin instead of unique maximum. For example, `longest` is true when the option is at least 1.15× the median option length, and `echoes_stem` when its stem overlap is ≥ 1 content word and at least the median plus one. Alternatively, report the mean rank of tagged options against untagged ones for each property (e.g. mean length rank of tagged options, where 1.0 is the longest). That is still simple and has no ceiling.

**Severity:** important.
**Confidence:** high.

---

## 6. Lift, pooled over everything, is not a good headline for "this cue identifies the key"

**Where:** codeTable (~396–409); tellsMarkdown sort by lift (~496).

**Problem:**
- **Voice dominance:** a voice that tags generously (five codes per option) contributes most of the tags, and pooled lift becomes that voice's lift. There is no lift per voice.
- **Question dominance:** one question with a glaring strawman, answered by 8 voices with 4 options each, puts 8 `denies-question` tags on distractors. With about 40 distractor ratings in total, that one question decides the code.
- **No uncertainty:** 1 tag on keys against 0 on distractors prints as ∞ and sorts to the top.
- **No within-question discrimination:** a code tagged on all four options of a question adds to both rates and pulls lift toward 1. The thing a test-taker needs is a cue that *separates* options, and lift does not isolate that.
- **Correlated codes:** `most-detailed`, `nuanced-turn` and `middle-ground` are tagged together, so each shows a moderate lift and none shows the combined signal. The inverse also happens: a code riding along with the real cue gets credit for it.
- **Direction:** the sort and the text ("well above 1 means the cue points at the key") suit look-right codes. For look-wrong codes, the finding is lift near 0, and those codes sink to the bottom unexplained.

**Change:** Use a within-reply statistic in the same units as the letter score: "hit rate if a reader followed only this cue". For each reply in which the code is on some but not all options, a look-right code scores 1/|tagged| if the key is among the tagged options and 0 otherwise. For a look-wrong code, the reader picks uniformly among the untagged options. Compare the mean with 1/k. Compute it per question first, then average over questions, with a question-level bootstrap CI. Report it per family and pooled, and show the number of questions and families that contribute. Put a co-occurrence table next to it, e.g. the rate for `nuanced-turn` among options *without* `most-detailed`. Keep lift as a secondary column.

**Severity:** important.
**Confidence:** high that pooled lift will mislead at the sample sizes here (tens of questions); medium that this particular replacement is the best one.

---

## 7. Parity across voices: reasoning effort, temperature and system context differ between voices and are not recorded in the score

**Where:** voices.mjs `settingsFor` and `attempt`; voices.json `letter_thinking`; quiz-adversary.md "Output" and "Prompt".

**Problem:**
- **Gemini has different thinking levels in the two modes:** `minimal` in letter mode and the default (high) in explain mode. For Gemini, the gap between explain and letter results therefore mixes "asked to explain" with "allowed to think". Gemma, which has no `letter_thinking`, and the Mistral voices have no such gap.
- **Reasoning effort is uncontrolled elsewhere:** GLM, Qwen3.x and Nemotron-super on OpenRouter reason by default. Ministral does not. The Claude subagent always thinks. The brief's "weak on purpose" design applies to none of the API voices, and reasoning tokens are not reported per voice.
- **JSON mode can suppress reasoning:** for models that do not reason natively, `response_format: json_object` forces an immediate JSON answer. Ministral in explain mode therefore answers with no written reasoning, while Claude reasons.
- **Temperature and max tokens are unset,** so provider defaults apply (roughly 0.7–1.0, and they differ). The "hit on ≥2 of 3 seeds" flag depends on sampling spread, which then differs by voice for reasons unrelated to the questions.
- **The Claude voice sees more than the prompt:** it gets the brief as system context ("You are a test-wise reader…", "Your hit rate measures…"). API voices get only the prompt file. So "byte-identical prompt" is true of the user message but not of the full context. The Claude reader is also told to be test-wise; the others are not.

**Why it matters:** When a leak shows up for Claude and not for Mistral, one cannot tell whether the reason is family, reasoning budget or persona. Telling family apart from the rest is the panel's purpose.

**Change:**
- Record `usage` reasoning tokens in the per-voice ladder and tells output (both providers return them), and report mean reasoning tokens per voice per rung.
- Either apply `letter_thinking` to explain mode too for Gemini, or note in tells.md that Gemini's explain and letter hit rates differ in thinking level.
- Set `temperature` explicitly for every voice (e.g. 1.0) and store it in `settings`.
- Once, run one API voice on the same manifest with and without the quiz-adversary brief body as a system message, to measure whether the persona matters. Record the result in `_claudeland` instead of changing the default.

**Severity:** important.
**Confidence:** high that the differences exist; low on their size.

---

## 8. Truncated and empty replies: some are counted as answers, some are retried forever

**Where:** voices.mjs `attempt` (lines 155–166), `callVoice`; `letterRow` (~233).

**Problem:**
- **Truncated replies are stored as answers:** a reply with `finish: length` (OpenAI-style) or `MAX_TOKENS` (Gemini) that still contains some text is stored as `status: ok`. In letter mode, `"The answer is"` or a reasoning preamble cut off in mid-sentence becomes `unparsed`, and `letterRow` counts it as a **miss**. That lowers the hit rate, which is the non-conservative direction for a leak gate. The per-voice line prints `unparsed`, but the PANEL line does not.
- **Empty content is retried forever:** on OpenRouter, a reasoning model that spends its whole budget on reasoning returns empty `content`. That is classed `transient`, retried 4 times and left unwritten. The same question fails the same way on every later run and is never recorded, so the voice's coverage loses exactly the questions that made it think longest. The questions lost are therefore not random.
- **Asymmetry:** Gemini's "no text" is classed `bad-request` and written as a permanent error. The same event is transient on one provider and permanent on the other.

**Change:** Treat any finish other than `stop`/`STOP`/`end_turn` as `status: 'truncated'`, recorded but not scored, in both providers. Classify empty content on a 200 response as permanent `empty` (recorded), not transient. In `ablate-score`, leave `unparsed` letter rows of **API voices** out of the hit-rate denominator and report them as a share. Keep the current miss-counting for the Claude subagent, whose baseline is built that way. Print `unparsed` on the PANEL line.

**Severity:** important.
**Confidence:** high on the code paths; medium on how often reasoning models on the free tier produce empty content in practice.

---

## 9. Re-running `ablate` silently deletes every API voice's replies

**Where:** `stageAblate` (~136–141): the guard checks only `picks.json`, then `rmSync(ad, { recursive: true })`.

**Problem:** A run with `--claude-seeds 0`, which the scorer explicitly supports ("needs no picks.json"), has no picks.json. Re-running `ablate`, for example to add a rung, then deletes `ablation/voices/` without asking, including replies that took days of free quota to collect.

**Change:** Extend the guard to "picks.json exists, or `voices/` contains any `*.json` or `*.txt` reply", with the same `--force` escape. Ideally, adding a rung should add entries without rebuilding the others. That may need its own change.

**Severity:** important.
**Confidence:** high.

---

## 10. Scoring reads mutable inputs: the current candidates.json, the current code list, and prompt hashes it never checks

**Where:** `explainAnalysis` (~362–366, 381–388: `c.stem`, `c.options.findIndex(x => x.text === text)`); `tellCodes()` called at scoring time; voices.mjs `prompt_sha256` (written, never read).

**Problem:**
- **Stem:** `optionMechanics` measures stem echo against the *current* `candidates.json` stem, not the one the reader saw. bench-revise edits candidates in place.
- **Options:** if an option's text was revised, `findIndex` returns -1 and the rating quietly drops out of `per_question`. If a candidate was removed, `byId.get` is undefined and `c.stem` throws.
- **Code list:** tells.md tells the user to "promote recurring ones to codes", which means editing the partial. Replies collected under the old list are then scored against the new one. A removed or renamed code turns into `invalid-code` and is dropped, and a new code shows as "never used" on the old replies.

**Change:** At ablate time, write `stem_shown` next to `options_shown` in each explain manifest entry, and `tell_codes` (the list) plus the partial's sha256 at manifest level. Score against those. In `ablate-score`, compare each API record's `prompt_sha256` with the prompt file on disk and die on a mismatch.

**Severity:** important.
**Confidence:** high.

---

## 11. The code list: missing cues, overlapping cues, and a catch-all

**Where:** prompts/_partials/tell-codes.md.

**Missing cues a test-wise reader really uses:**
- **`opposites`:** two options contradict each other, so one of them is probably the key. This is a classic heuristic and none of the current codes covers it.
- **`hedged`:** qualifiers such as "often", "can", "in some cases". It is currently split between `most-detailed` ("qualified") and `nuanced-turn`. The project already enforces hedging mechanically, so it needs its own code to be measured against that check.
- **A placebo code, `position`** (see #1). It is useful because it cannot be a real tell.
- **A domain stance code**, e.g. `cautious-stance`: "the answer a safety-minded author would endorse (risks are real, uncertainty is high)". For an AI-safety textbook this is plausibly the strongest tell on invented content, and at present it disappears into `textbook-voice`. Confidence medium; the `other` notes will show whether it recurs.

**Overlapping pairs, which will be used interchangeably:**
- `nuanced-turn`, `middle-ground` and `most-detailed`. The first two in particular: "it depends / both sides" *is* a middle ground.
- `absolute` and `denies-question`. The definition of `absolute` lists "nothing, at all", which is exactly how "there is no objection" is phrased, the case that prompted the current lead.
- `textbook-voice` fits almost any key and will likely be the most-used code. It gives the generator nothing it can act on.

**Change:** Add `opposites`, `hedged` and `position`, and remove "qualified" from `most-detailed`. Do not merge the overlapping codes in the list. Merge them at analysis time instead: report each group (`most-detailed`/`nuanced-turn`/`middle-ground`; `absolute`/`denies-question`) both as a union and per code, so a signal split across two codes is still visible. Keep the list short. More codes means more near-miss spellings (#4).

**Severity:** important for `opposites` and the analysis-time grouping; minor for the rest.
**Confidence:** medium. The `other` share after the first real run is the evidence that would settle it.

---

## 12. Feeding cues back will still Goodhart; holding out one voice family is not enough

**Where:** the plan in the brief (critic sees aggregated codes; generator rewrites flagged questions from cues; one family held out).

**Problem:**
- **Per-question rewrites teach cue removal, not believability.** Per-option codes tell the generator which surface to change. It will change that surface, e.g. shorten the key, and the tell moves somewhere the list has no name for: the key becomes the shortest, the strawman becomes subtly off-target. The same codes will then show "fixed".
- **Regression to the mean.** Questions are flagged because the panel hit them. Re-measuring rewrites on the same voices shows improvement even for rewrites that change nothing. With 1–3 seeds per question, flagged questions are partly just unlucky.
- **A held-out family still shares everything else.** It shares the code list, the prompt and the order seeds. If its explain output is ever computed, someone will look at it, and it stops being held out.
- **Google is also a reviewer.** Google models already review the pipeline (gemini-review.mjs), so the Google family is the least clean to hold out.

**Change:**
- Send only cross-question aggregates into brief changes and mechanical checks. Per-question cue feedback, if kept, should go to rewrites that are always re-measured on the held-out readers with **fresh seeds** (a new `--seed-offset`).
- Hold out on two axes. First, readers: at least one strong non-Google, non-Anthropic family (e.g. zhipu or alibaba), run in **letter mode only**, never explain. Second, content: a fixed set of sections, including the invented passage, that no cue feedback ever touches, re-measured before and after each brief change.
- A brief change is judged by the held-out readers' letter hit rate on the held-out sections, compared against each voice's own floor (#2), never by the panel that produced the cue.
- Size: the held-out sections should hold at least as many questions as the feedback set, roughly 30 or more, because a question-unit CI on 10 questions is too wide to detect a 10-point drop.

**Severity:** important. This is the plan, not yet the code, so it costs nothing to fix now.
**Confidence:** medium. The regression-to-mean part is high confidence.

---

## 13. Gemini's daily reset hour is wrong for half the year, and the error costs a whole day

**Where:** voices.json `"daily_reset_utc_hour": 7` for gemini; `nextReset` (voices.mjs 91–97).

**Problem:** Pacific midnight is 07:00 UTC under daylight saving time and 08:00 UTC from early November. In winter the voice is marked up at 07:05, is called while the quota is still spent, gets `daily` again, and `nextReset` then returns *tomorrow* 07:05. The code comment says "a little too long costs nothing", but the actual cost is almost a full day of quota, every day.

**Change:** Compute the reset in `America/Los_Angeles` with `Intl.DateTimeFormat`, or set the hour to 8. At 8, summer resets are delayed by one hour, which costs an hour.

**Severity:** minor now; important from November.
**Confidence:** high on the arithmetic, medium on Google's reset time (documented as midnight Pacific).

---

## 14. Smaller issues

- **The Claude brief contradicts the explain template.** quiz-adversary.md says "Output: one letter, as the agent's entire final message". The explain template asks for JSON, and the override is stated only in the template's frontmatter, which the reader never sees. Add one clause to the **brief**: "except when the prompt asks for a JSON object (explain rungs)". This edits the brief rather than restating the rule in a template. *Minor, high confidence.*
- **pick-invalid counts as a miss.** An `ok` reply whose `pick` is unparseable ("Option B" becomes `OPTIONB`) counts as a miss in `explain_hit_rate`. Leave pick-invalid replies out of that denominator, as with errors. *Minor.*
- **The JSON-mode drop can fire on unrelated errors.** It triggers on `/json/i` anywhere in a 400 message. Gemini reports many unrelated schema errors as "Invalid JSON payload received…", so a malformed request in explain mode would drop JSON mode and retry, and the drop is recorded as if the provider had rejected JSON mode. Match the specific field names only (`response_format`, `responseMimeType`). *Minor, medium confidence.*
- **Model drift under an alias is not surfaced.** Aliases like `ministral-14b-latest` and OpenRouter `:free` routing can change model or quantisation between runs. `model_version` is recorded in each call record but never compared. In `ablate-score`, warn when a voice's `model_version` values differ within one manifest. Do the same when a voice's `settings_dropped` differs across its calls, since then half its replies ran with a different thinking setting than the other half. *Minor.*
- **The impossible-claim count covers one code only.** It could cover two more for little effort. First, `general-knowledge` tags on keys of passage-only (invented) items. Knowledge is zero there by construction, so such tags are claims the reader cannot have. Second, `off-target` on the options-only rung, which can only be inferred. Report both as separate counts, not as "impossible". *Minor, medium confidence.*
- **The explain prompt is worded differently from the letter prompt.** Explain says "judge which option is most likely the intended correct answer"; letter says "Answer from the question and options alone". Review #7 fixed exactly this kind of wording difference between rungs. It matters less here because explain is diagnosis only, but it adds to the explain/letter gap. *Minor.*

---

## Answers to the specific questions, in brief

1. **Code list:** see #11 (missing `opposites`, `hedged`, placebo `position`, a stance code; overlaps between `nuanced-turn`/`middle-ground`/`most-detailed` and `absolute`/`denies-question`). The direction headings are a real problem for lift, see #1.
2. **Does explaining change what is measured:** yes. Keeping the hit rates apart is not enough, because the codes follow the reader's own `p`. Faithfulness detects cues that are not there, not rationalisation, and its ceiling is structurally low (#5). Detectors to add: pick-conditioned rates, explain-vs-letter pick agreement on the same order, a placebo code, and causal edit tests (#1).
3. **Lift:** see #6. Use a within-reply "hit rate if you followed only this cue", averaged per question, bootstrapped over questions, reported per family, with co-occurrence shown.
4. **Pooling voices:** see #2. The headline should be per voice and per family, each against its own calibrated floor. Pool only over questions every voice answered.
5. **The queue:** runs can differ in panel composition, rung coverage (#3), model aliases and dropped settings (#14). Truncated replies are counted as answers, and letter misses at that. Empty content is retried and never recorded (#8). Re-running ablate deletes answers (#9).
6. **Parity:** thinking level confounds Gemini's explain/letter gap; reasoning effort, temperature and the Claude brief persona differ between voices (#7).
7. **Feeding it back:** see #12. Hold out readers and sections, use letter mode only for the held-out readers, and re-measure with fresh seeds.
8. **Parsing:** see #4 (empty, missing or all-invalid codes counted as rated options) and #14 (pick-invalid counted as a miss).

---

## Leave alone

- **The same order for `full` and `full-explain` at the same seed:** it is what makes the explain-vs-letter pick-agreement check (#1) possible.
- **Unknown codes are dropped, not coerced:** it is right not to guess "most detailed" into `most-detailed`. The fix in #4 is about counting such options, not about repairing them.
- **Failed calls are "not answered", not misses, with coverage printed per voice:** this is right. Do not impute.
- **The `rungs`/`per_question` blocks of ladder.json stay Claude-only:** they keep earlier ladders comparable. Keep the other voices beside them, as now.
- **Explain hit rates are never pooled with letter rungs:** correct. Keep it that way even after the changes above.
- **"Do not use any tools." is sent to API voices too:** it is pointless for them, but it keeps the prompt byte-identical to the Claude subagent's. Do not strip it.
- **Negation stems are excluded from both options-only rungs:** correct, and the exclusion is recorded.
- **Unparsed Claude letter replies are counted as misses:** keep this for the Claude subagent, whose baseline was built that way. Change it only for API voices (#8).
- **Key files outside the repository, refused otherwise:** correct as written.
- **`no-tell` and `other` with a required note:** both are right. `other` is the only coverage check on the list, so do not remove it to reduce noise.
