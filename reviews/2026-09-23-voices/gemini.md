<!-- gemini-review: model=gemini-3.6-flash finish=STOP tokens_in=26938 tokens_out=2480 template=review-gemini -->

1. **Unusable explain replies with unparsed `pick` values are scored as misses**
   - **Where**: `pipeline-excerpt.mjs`, `parseExplainReply` (lines ~275–310) and `explainAnalysis` (lines ~345–380).
   - **Problem**: `parseExplainReply` sets `ok: true` even when `obj.pick` cannot be matched to an option letter (e.g., when a voice returns `"pick": "Option A"` or `"pick": "A."` instead of `"A"`). The function sets `pick: null` and records `problems.push('pick-invalid')`, but leaves `ok: true`. In `explainAnalysis`, `r.parsed.pick === L` evaluates to `false` for all options when `pick` is `null`.
   - **Why it matters**: Responses where a voice identified the correct option but used slightly loose formatting (like `"Option A"`) are kept as valid (`ok: true`) and counted as misses (`hit: false`). This artificially depresses the `explain_hit_rate` for specific API voices based on output formatting quirks rather than question comprehension.
   - **Change**: In `parseExplainReply`, sanitize strings like `"Option A"` or `"A."` to `"A"`. If `pick` still does not match a valid option letter, set `ok: false` and record `problems.push('unresolvable-pick')` so the reply is treated as unusable rather than a wrong answer.
   - **Severity**: Blocking.
   - **Confidence**: High.

2. **Failed and truncated API calls are cached as finished and omitted from explain/letter metrics**
   - **Where**: `pipeline-excerpt.mjs`, `readVoiceReply` (lines ~230–235), `readVoiceLetterRows` (lines ~245–255), `explainAnalysis` (lines ~340–350), and `scripts/voices.mjs`, `cmdAnswer` (lines ~200–215).
   - **Problem**: `cmdAnswer` writes JSON records for failed API calls (`status: 'truncated'`, `'empty'`, `'error'`). On subsequent runs, `cmdAnswer` sees these files on disk and skips them as cached (`!retryErrors`). However, `readVoiceReply` returns `null` for any record where `status !== 'ok'`.
   - **Why it matters**: `explainAnalysis` and `readVoiceLetterRows` filter out `raw == null` replies. Truncated or errored calls completely disappear from `summary.replies`, `perVoice.unusable`, and ladder coverage metrics. A model that truncates on 50% of complex explain requests will appear to have 100% usable replies on the remaining 50%, hiding severe delivery failures and biasing hit rates toward short, simple items.
   - **Change**: Update `readVoiceReply` to return the full status record. Modify `readVoiceLetterRows` and `explainAnalysis` to include non-`ok` records in the denominator for coverage, error counts, and unusable counts.
   - **Severity**: Blocking.
   - **Confidence**: High.

3. **Raw trial pooling in the reader panel gives Google models overwhelming weight**
   - **Where**: `pipeline-excerpt.mjs`, `stageAblateScore` (lines ~435–455) and `scripts/voices.json`, `panels.ablation`.
   - **Problem**: `ladder.panel` pools raw letter responses from all voices. In `voices.json`, 6 of the 10 enabled voices belong to the Google family (`gemini-flash`, `gemini-flash-36`, `gemini-flash-37`, `gemini-flash-38`, `gemini-flash-lite`, `gemma-31b`).
   - **Why it matters**: Pooling raw trials gives Google pretraining priors over 60% of the vote in the pooled "Panel" headline statistic. If Gemini models share a common pretraining artifact or failure mode, the panel rate reflects Gemini performance rather than multi-family consensus. Additionally, pooling small models (8B) with frontier models dilutes the signal, pulling true frontier leaks toward chance.
   - **Change**: Compute panel metrics by macro-averaging hit rates across distinct model *families* (Google, Mistral, Zhipu, Alibaba, Nvidia, Anthropic). State pre-registered predictions against the family-macro-averaged hit rate.
   - **Severity**: Important.
   - **Confidence**: High.

4. **Ranking cues by `lift` hides distractor tells and produces `Infinity` on single key hits**
   - **Where**: `pipeline-excerpt.mjs`, `explainAnalysis` (lines ~370–385) and `tellsMarkdown` (lines ~420–435).
   - **Problem**: Cue codes are ranked by `lift = rate_key / rate_distractors`. Negative cues (e.g. `implausible`, `off-target`, `absolute`) that appear on distractors have `rate_key ~ 0`, giving `lift ~ 0` and placing them at the bottom of the table. Furthermore, if `rate_distractors == 0`, `lift` is `null` and sorted as `Infinity` via `(b[1].lift ?? Infinity)`.
   - **Why it matters**: The hypothesis being tested is that "wrong answers are recognisably wrong." Sorting by `lift` descending buries negative distractor tells at the bottom of the report, while ranking noisy cues with 1 key tag and 0 distractor tags at the top as `Infinity`.
   - **Change**: Replace raw `lift` sorting with rate difference (`rate_key - rate_distractors`) or Laplace-smoothed log odds ratio. Report two separate lists in `tells.md`: top key-enrichment cues (`rate_key > rate_distractors`) and top distractor-enrichment cues (`rate_distractors > rate_key`).
   - **Severity**: Important.
   - **Confidence**: High.

5. **JSON output structure forces left-to-right autoregressive bias onto option codes and probabilities**
   - **Where**: `prompts/adversary-explain.md` (lines ~30–45).
   - **Problem**: The required JSON format places the `options` object (containing `codes` and `p` per option letter) *before* `pick` and `strategy`.
   - **Why it matters**: LLMs generate JSON left-to-right. When evaluating Option A, the model outputs `codes` and `p` before it has generated text for Options B, C, or D. Comparative cues (e.g., `odd-one-out`, `like-the-others`, `middle-ground`) and probability distributions constrained to sum to 100 are forced onto early options before the model evaluates later options in its output stream.
   - **Change**: Restructure the JSON schema in `adversary-explain.md` so the model outputs an initial brief comparative pass or `strategy` first, followed by option evaluations, or accept option letters in a top-level analysis array after reasoning.
   - **Severity**: Important.
   - **Confidence**: High.

6. **Thinking setting asymmetries undermine comparability between voices**
   - **Where**: `scripts/voices.mjs`, `settingsFor` (lines ~175–185) and `scripts/voices.json`.
   - **Problem**: Gemini models run with `thinkingLevel: "minimal"` in letter mode, OpenRouter and Mistral models run with thinking disabled, and the Claude subagent runs with unconfigurable Claude Code extended thinking.
   - **Why it matters**: Reasoning capability directly affects hit rates on options-only rungs. An observed performance gap between Gemini Flash and Qwen/Mistral in letter mode reflects differing API thinking configurations rather than differences in pretraining leakage or shared family artifacts.
   - **Change**: Enforce explicit parity across API voices in ablation mode (e.g., set `thinking: null` for all API voices in letter mode, or set matching thinking budgets across all supporting providers). Document the Claude subagent's non-zero thinking as an unavoidable baseline asymmetry.
   - **Severity**: Important.
   - **Confidence**: High.

7. **`optionMechanics` misses stem echoes when multiple options reuse stem words**
   - **Where**: `pipeline-excerpt.mjs`, `optionMechanics` (line ~325).
   - **Problem**: `optionMechanics` calculates mechanical `echoes_stem` using `uniqueMax(echo, i)`. If two options both contain overlapping content words with the stem, `uniqueMax` returns `false` for both options.
   - **Why it matters**: If two options legitimately echo stem vocabulary, the checker marks `echoes_stem` as `false` for both. Readers that correctly tag both options with `echoes-stem` are penalized in the faithfulness table (`tagged_where_true` drops), creating a false impression of unfaithful reader reasoning.
   - **Change**: Define mechanical `echoes_stem` as having stem overlap above a fixed threshold (e.g. `echo[i] >= 1`), rather than requiring a single unique maximum.
   - **Severity**: Minor.
   - **Confidence**: High.

8. **`tell-codes.md` lacks explicit length and stem-completion codes**
   - **Where**: `prompts/_partials/tell-codes.md` and `pipeline-excerpt.mjs` (`FAITHFULNESS_PAIRS`).
   - **Problem**: `tell-codes.md` lacks explicit codes for relative option length (`longest`/`shortest`) and grammatical fit (`grammatical-fit`), while `FAITHFULNESS_PAIRS` maps `most-detailed` directly to `longest`.
   - **Why it matters**: Option length and stem completion grammar are primary test-taking tells. Forcing length cues into `most-detailed` conflates typographical length with semantic specificity, causing artificial mismatches in the faithfulness table when readers encounter long but vague options.
   - **Change**: Add `longest`, `shortest`, and `grammatical-fit` to `tell-codes.md`. Map `longest` to `longest` in `FAITHFULNESS_PAIRS`.
   - **Severity**: Minor.
   - **Confidence**: High.

---

### Leave alone

- **Flat list in `tell-codes.md`**: Keeping `tell-codes.md` as a flat list without `"looks right"` / `"looks wrong"` headers prevents structural prompt priming.
- **Structural API isolation in `voices.mjs`**: API models called via `voices.mjs` have no file system access or tools, guaranteeing true isolation without relying on prompt-based behavioral enforcement.
- **Option order preservation across ablation rungs**: `seededOrders` uses identical option orderings across `full`, `options-only`, `full-explain`, and `options-only-explain` for the same seed, cleanly isolating the variable being ablated.
- **Immediate marking down of auth/balance failures**: `callVoice` marks providers down until the next daily reset on HTTP 401, 402, 403, or explicit balance depletion, preventing infinite hammering during pipeline runs.