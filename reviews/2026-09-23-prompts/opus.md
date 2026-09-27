Model: claude-opus-5-5

# Review: spawn-prompt templates, review partial, renderer

Read in full: every file in the brief's list, plus the parts of `scripts/pipeline.mjs` that call the renderer (`render`, `stagePrompt`, `stageAblate`, `stageMerge`, `seededOrders`, `shuffled`, `eligibleIds`, the prompt selftest), `bench/README.md`, `bench/undercraft/passage.md` (opening), `bench/undercraft/passage-notes.md`, `bench/undercraft/concept-map.json`, and the 2026-09-18-P1 / 2026-09-20-FICTION-B run logs where they bear on a finding. Where a finding depends on something I did not read, I say so.

---

## 1. The distractor arm cannot be run as written: no stage applies or verifies the rewrite

**Where.** `prompts/bench-rewrite-distractors.md` front matter: "The script verifies stem and key text are byte-identical before spawning." The same claim is in `bench-rewrite-stem.md` and HANDOFF §9.3 ("the script verifies that before anything is spawned").

**Problem.** `pipeline.mjs` has no such check, and no stage that takes the rewrite output (`[{id, options}]` or `[{id, stem, what_i_withheld}]`) and turns it into a `candidates.json` that `ablate` can read. I grepped for `what_i_withheld`, `rewrite-distractors`, `identical`, `splice`, `apply` and `arm`, and found nothing that does it. The FICTION-B log says the stem arm was "verified mechanically", which reads like a one-off check the orchestrator ran by hand. "Before spawning" is also the wrong place: the thing to verify is the rewrite agent's *output*, so the check belongs after that spawn and before the adversary spawns.

**Why it matters.** To run this arm today, the orchestrator has to merge the rewritten options into a candidates file itself. That means handling question text by hand (HANDOFF §6 forbids it), with no mechanical check that stem and key survived. Two quieter confounds come with the hand merge:
- **Key position can move.** `shuffled()` permutes by *index*, seeded by `id#seed`. If the rewrite agent returns the key at a different index than the original (the template does not forbid it), the same seed puts the key in a different letter position in each arm. Position is then no longer controlled, although the ladder's design assumes it is.
- **Regression to the mean.** The `ids` rewritten are presumably the ones the screen flagged. Re-measuring flagged items will show a drop even if the rewrite does nothing, especially from a one-seed screen. Comparing the arm against the screen that selected those items overstates the effect.

**Change.**
- Add `pipeline.mjs arm --from <run/slug> --rewrite <file> --kind stem|distractors --out <run/slug>`. It should:
  - write a new `candidates.json`;
  - die unless every held field is byte-identical;
  - for the distractor arm, keep every option **in its original slot**: the key keeps its index, and distractor *i* is replaced in place;
  - log the check to `run.log`.
- Fix the three claims to say "`arm` verifies … before `ablate`".
- In HANDOFF §9.3, make the comparator for any arm a **fresh-seed re-measure of the unmodified options on the same ids**, run alongside the arm. Never compare against the screen that selected them. Better still, apply the manipulation to every candidate, not only the flagged ones.

**Severity.** Blocking for the distractor arm.
**Confidence.** High that the code is missing. I searched `pipeline.mjs` and `scripts/` and found nothing, so a verifier held in some other script would change my mind.

---

## 2. `bench-author.md` items 3 and 7 together build a new heuristic: "pick the option that reverses the obvious"

**Where.** Item 3: "At least four load-bearing claims are counterintuitive: the sensible-sounding answer is the wrong one". Item 7: the list of heuristics to avoid. Notes (a): "each counterintuitive claim and its 'obvious wrong answer'".

**Problem.** Yes, I think this creates the heuristic you are worried about, and `undercraft` already shows the shape. All five of its counterintuitive claims (passage-notes (a)) are reversals of the naive expectation: the star does not get the anchor, a high rescue rate is a warning sign, gloss rises while real skill falls, and so on. In an invented domain there is no domain intuition. "Counterintuitive" can only mean "contrary to generic priors" (more is better, the visible is the important, the moderate is right). Demanding at least four such claims means the passage's truth values run *against* those priors on purpose. Two things in the pipeline then carry that into the questions:
- The notes record each claim's "obvious wrong answer". The analyst turns claims like these into `misconceptions`, and the generator's `misconception` lens makes that entry the top distractor. So the naive answer is systematically a distractor and the contrarian answer is systematically the key.
- Item 7 removes a class of truths without removing the matching falsehoods. If no load-bearing claim is ever "the moderate middle" or an inverse-U, then "never pick the middle" becomes a reliable rule. That is the old leak with its sign flipped. An author told to avoid an inverse-U is also likely to reach for a U-shape, which is another reversal.

A test-wise reader then only needs "quiz questions test the surprising point", which is a real and well-known test-taking habit.

**Change.** Replace items 3 and 7 with something like:

> 3. **Truth must not correlate with how a claim sounds.** For every load-bearing claim, decide its direction independently of which direction sounds sensible. Across the passage, roughly half the directional claims should go the way a sensible outsider would guess and half against, and the passage states each outright. Prefer load-bearing claims that have **no** sensible direction to guess (item 6's kind: which of two named effects applies where, how a quantity is defined, who objected to what).
> 7. Generic test-taking heuristics — "the moderate middle", "peaks at a medium size", "the most insidious is the most dangerous", "the surprising answer is the right one" — must each be **right about as often as wrong** across the passage's claims. Do not avoid them; balance them.

Then change notes (a) so that every load-bearing claim is tagged `{naive direction: right | wrong, heuristics that predict it}`. The tags are what makes this checkable: `ablate-score` (or a small script) can split the hit rate by tag. If questions whose key is the naive answer and questions whose key is the contrarian answer score very differently, the heuristic is measured rather than guessed at.

**Severity.** Blocking for the next bench passage. The current wording will reproduce the problem.
**Confidence.** Medium–high on the mechanism. The best evidence is that all five `undercraft` claims have the same polarity. What would change my mind: splitting the existing FICTION results by whether the key was the naive or the contrarian option, and finding contrarian keys scored no higher. With n ≈ 8 that split will be noisy, so it is a sanity check, not a proof.

---

## 3. The distractor rewrite can "succeed" by making questions ambiguous, and its provenance requirement cannot be checked

**Where.** `bench-rewrite-distractors.md` items 1, 4 and 5, and the `provenance` requirement.

**Problems.**
- **No answerability constraint.** `bench-rewrite-stem.md` puts "must stay answerable by a reader who has read the passage" first. The distractor template has nothing like it, and the critic is out of calibration runs, so nothing downstream checks it either. Item 4 ("the correct option must not be identifiable as the balanced one") cannot move the key, because the key is held byte-identical. So the only way to satisfy it when the key *is* balanced is to make the distractors hedged and balanced too. They then drift toward the key: near-paraphrases, or options that partly entail it (what RUBRIC D11 forbids: a distractor that is just a specific instance of the key). A question with two defensible answers lowers the blind hit rate for the wrong reason. The arm would then report "plausibility is the mechanism" when the actual change was ambiguity.
- **On your "extreme key" worry.** It cannot happen in this template, because the key is held fixed. It becomes live if item 4's wording ever migrates into the generator brief, where the key is free. Do not migrate it in that form.
- **The template states the wrong target.** Item 1 asks for distractors that "a careful reader of the passage could actually believe". The leak being measured is a reader who has *not* read the passage. A distractor can be a perfectly good misreading of §3 and still look implausible to an outsider, for example because it is the only option that contradicts the others. The property wanted is that **an outsider has no reason to prefer the key**. The template never says that.
- **The "similar to the others" tell is not addressed.** If all three distractors are built as small misreadings of the key's claim, each is a one-step change of the key. The key is then the option that shares the most with the others, and "pick the option most like the rest" is a classic test-wise heuristic. Nothing here or in the checker measures it.
- **Provenance will be plausible-sounding, not verified.** A model asked to name "a reader who takes the §X sentence about Y to mean Z" will always produce one. The generator brief already requires provenance on every distractor, and RUBRIC D1 (every distractor must trace to a real sentence that can be misread) exists because this was not reliable. The critic that verifies provenance ("find the sentence") is dropped here. So in this arm provenance is decoration.

**Change.**
- Add as item 0: "**Each wrong option must be clearly wrong to a reader who has the passage.** Quote, in `rules_out`, the passage sentence that excludes it." Add a **sighted rung** to `ablate` (same model, passage supplied, options shown) and pre-register that the arm counts only if the sighted rung stays at or near 100%.
- Replace item 1's "careful reader could believe" with the target: "a reader who has **not** read the passage should find this option exactly as likely as the correct one. Nothing in its wording, stance or relation to the other options should mark it as wrong."
- Make provenance checkable: require it to contain a verbatim quote of 20 words or fewer from the passage, in double quotes, and have the `arm` stage (finding 1) check that the substring exists. This checks only that the sentence exists, not that it can be misread. That is still better than nothing and costs nothing.
- Add a script measurement for "the key is the option most like the others": mean content-word overlap of the key with the distractors, compared with each distractor's overlap with the rest. Report it; do not gate on it yet.
- Drop item 3 ("Not a restatement of anything the stem withholds"). It is copied from the stem arm and means little for distractors.

**Severity.** Important.
**Confidence.** High that nothing checks answerability in this arm. Medium on how often ambiguity would actually appear. A sighted-rung result on the rewritten items is exactly what would settle it.

---

## 4. Paths and ids the orchestrator must type change the artifacts `merge` produces

**Where.** `generate-section.md` `{{id_prefix}}` and `{{out}}`, with `stageMerge`.

**Problem.** Two of these values are not neutral:
- **`id_prefix` feeds the model label.** `merge` takes the model from `x.model || id.split('/')[1]`. With `id_prefix` = `undercraft-theory/sonnet` the model is `sonnet`. With `id_prefix` = `w`, the id `w/01` makes the model `"01"`, and the merged id becomes `slug/01/<letter>01`. Neither the template nor `stagePrompt` fixes the format.
- **`out` feeds the shard letter.** `merge` reads `candidates/*.json` and takes the text after the last `-` of the filename as the letter. `candidates/sonnet.json` gives letter `sonnet`. A file written outside `candidates/` is invisible to merge, which is the 2026-09-20 incident.

So two orchestrators following the same template can produce differently named candidates, different model attribution, or a merge that dies.

**Change.** In `stagePrompt`, derive rather than accept:
- `id_prefix = <slug>/<model>`, with the model taken from a required `--model` flag;
- `out` for generate-section = `runs/<label>/<slug>/candidates/<slug>-<letter>.json`, with the letter taken from a `--letter` flag or the next free one;
- `out` for critique = `verdicts/<short>.json`, and for pass 2 = `verdicts-pass2/<short>.json`. Note that `merge`'s `collectVerdicts` reads only `verdicts/`: a pass-2 verdict written there would claim `<id>r` a second time and die, and one written to `verdicts-pass2/` is never merged. The pass-2 destination is undefined today.

Make `--set` of a derived key an error unless `--override` is given, and log the override.

**Severity.** Important.
**Confidence.** High, from reading `stageMerge` and `stagePrompt`.

---

## 5. Free-text optionals let two orchestrators send different prompts, and rendered prompts are not recorded

**Where.** `context_note` (analyse, curate, generate-section), `finding` (both bench rewrites), `established` and `structure` (pilot-analyst), `domain_hint` (bench-author), `respawn_note` (critique), `extra_inputs` (analyse). Also `stagePrompt`, which never calls `logLine`.

**Problem.** Each of these is a slot where the orchestrator writes prose into a spawn prompt. That is the hand-composed prompt the README abolished, moved into a variable. The worst cases:
- **`finding`** in a manipulation arm tells the generator the hypothesis and its numbers ("the blind reader scored 4/6 from options alone"). How that is phrased changes the manipulation, and each orchestrator will phrase it differently.
- **`context_note`** in `generate-section` can carry anything, including a rule, for example "avoid 'no objection' options". That silently changes the generator's instructions for one run, is diffable against nothing, and is exactly the drift the convention forbids.
- **`structure`** in `pilot-analyst` silently replaces the brief's fixed section order (the brief is written for P1/P2 and does not fit bench runs, which is why the slot exists). The override is invisible in the brief.
- **`extra_inputs`** is a free-format list line. Its main use, `misconceptions/<section>.md` "if present", is mechanically derivable.

Separately, `stagePrompt` writes the rendered prompt to stdout, or to `--out` if given, and logs nothing. There is no record of which template version and which variables produced the prompt that was sent. This undercuts the README's "a file can be reviewed, diffed, versioned".

**Change.**
- **Delete** `finding`. The template's front matter already states the hypothesis for humans; the rewrite agent does not need it.
- **Delete** `context_note` from `generate-section` and `analyse`. For `curate`, if something per-run must be said, allow it only via `--set-file` pointing at a committed file.
- **Replace** `domain_hint` with nothing, or a fixed rotation list in the template.
- **Replace** `established` with a required path to a prior findings file, via `--set-file` or as a path the analyst reads.
- **Drop** `structure`, and write a bench-run section order into the pilot-analyst brief as a second mode.
- **Derive** `extra_inputs` (the misconceptions file if it exists) and `respawn_note` (validate's own failure text for that artifact, verbatim).
- **Derive** the rest:
  - `target_n` from the §8.1 constant;
  - `avoid` from the domains in `bench/README.md`'s table;
  - `curator_reason` from `curator.json` `coverage.earns_question_uncovered[].why` by `--id`;
  - `words` as a fixed number in the template, so benches are comparable.
- **Record:** `stagePrompt` should always write the rendered text to `runs/<label>/prompts/<template>[-<id>].txt` and append to `run.log` the template name, the template's git blob hash, the variables, and the sha256 of the text. The spawn can then be audited against the file.
- **Model.** Front matter `model:` is not machine-read and often names two values ("sonnet / opus", "as production"). Have `prompt` print `{subagent_type, model, prompt}`, with the model taken from a run config, so the model choice is not left to judgement either.

**Severity.** Important. Blocking for the bench arms specifically, because of `finding`.
**Confidence.** High that these are free slots. Medium that they will be misused. The FICTION logs show the orchestrator is conscientious, but conscientious improvisation is still improvisation.

---

## 6. Free recall: the fix should be structural, and some stems cannot be free-recalled at all

**Where.** `adversary-free-recall.md`, and `stageAblate`'s `stem-only` rung.

**Problem.**
- **The brief wins.** `quiz-adversary`'s brief is the system prompt. It says the agent answers "from the stem and options alone" and that its output is "one letter, as the agent's entire final message". The agent description repeats "with a single letter". A spawn-level "this is deliberate" is one sentence against three, and the only measurement is 2 of 6 refusing. I would not expect one added sentence to fix a one-in-three refusal rate reliably. The notes already name the right fix. Take it now rather than after another run: this rung has no reason to share the MC reader's system prompt, because it is a different measurement, graded differently. It needs the same *model* (haiku), not the same brief.
- **Some stems are ill-posed without options.** `ablate` passes every stem verbatim. Stems of the form "Which of the following…" or "Which objection…", and negation stems ("Which is NOT…"), have no meaningful free-recall answer. The P1 probe avoided this only by luck ("none needed … unlike the baseline's 40 where 8 negation/list stems required rewording"). Rewording them by hand is the orchestrator writing question text. Some of the refusals may be the stem's fault, not the brief's.
- **Grading is unassigned judgement.** "Graded by hand" means the orchestrator decides match / partial / miss. That is a judgement task done by the role that is supposed to do none, with no template and no rubric.

**Change.**
- Add `.claude/agents/quiz-recall.md`: haiku, "answer an open question in one or two sentences, or I DON'T KNOW", with the same no-tools line. Point the `stem-only` rung at it, and record the agent per rung in the manifest.
- In `ablate`, exclude from `stem-only` (and list in the manifest as `excluded: ill-posed`) any candidate with `negation: true` or a stem matching `/\bwhich of (the following|these)\b/i`, plus any stem whose question refers to "the options".
- Add a `grade-recall.md` template for a separate grader agent. It gets the stem, the verbatim answer and the key text; it is not told the rung or the MC result; it emits one of the `RECALL_GRADES`.
- Count `refusal` outside the denominator and report it separately.

**Severity.** Important. This only matters on real sections, where this rung is used.
**Confidence.** Medium–high that a separate agent is right. Low–medium on how much of the 2/6 is due to stem form. I did not read the six stems themselves.

---

## 7. The two ablation rungs differ in more than the stem; negation stems distort the options-only rung

**Where.** `adversary-mc.md` compared with `adversary-options-only.md`.

**Problem.**
- **The instructions differ too.** The full rung says "Answer from the question and options alone". Options-only replaces that with a different task: "pick the option most likely to be the intended correct answer". So the two rungs differ in their instruction as well as in whether the stem is shown. "Intended correct answer" frames the task as guessing what the author meant, which invites textbook-likeness reasoning. That is roughly the thing being measured, so it is not a cue toward any *kind* of option, and I see no subject-matter cue. But part of any gap between the rungs could come from the instruction change rather than the missing stem.
- **Negation stems.** For a negation stem, the key is the one false statement. An options-only reader asked for "the correct answer" will pick a true-sounding option and miss by construction. `ablate` does not exclude or tag negation stems, so a negation question lowers the options-only rate artificially.
- **Brief conflict.** The adversary brief says "from the stem and options". A prompt with no stem may draw "please provide the question" replies. `ablate-score` counts `unparsed`, which is good, but the rate is not reported as a result in its own right.

**Change.** Make the byte difference exactly the stem slot. Render the options-only rung **from `adversary-mc.md`**, with `stem` = a fixed line from the script, e.g. `(The question has been withheld. Only its answer options are shown.)`, and delete the separate instruction text. "Answer from the question and options alone" still reads acceptably when the question line says it is withheld. Keep `adversary-options-only.md` only if a pilot shows higher refusal with the fixed line, and then record that the rungs differ in wording. Also:
- In `ablate`, skip `negation: true` candidates on the options-only rung, or tag them in the manifest and have `ablate-score` report them separately.
- Report unparsed/refusal counts per rung next to the hit rates.

**Severity.** Important for negation stems. Minor-to-important for the wording.
**Confidence.** High on the negation confound. Medium on the wording; whether the phrase moves Haiku at all is an empirical question.

---

## 8. `curate.md` contradicts the curator brief and HANDOFF on outputs, and adds an unstated standing rule

**Where.** `curate.md`: "Write ONE output: `{{out}}`", the front-matter note "The curator writes curator.json ONLY", and the bolded "An options-only hit is evidence the option set gives the answer away regardless of the stem."

**Problems.**
- **The review sheet disappears.** The brief §C still has the curator write `staging/review-sheet-<section>.md` ("plus the review sheet in C, which is your own prose"). `stageRender`'s comment says "The review sheet stays curator-authored". HANDOFF §7 "Done means" requires "every section has a review sheet". The template says one output. Either the agent follows the template and no review sheet exists, so §7 cannot be met, or it follows the brief and the template's own contract ("ONE output") is broken.
- **The options-only sentence is a new standing rule placed in a template.** The convention says those belong in the brief. It also pulls against the brief's "Eligible pool": adversary flags do not gate, and "you do not prefer an unflagged candidate over a better flagged one". At the one-seed screen, a single options-only hit on a 4-option question happens 25% of the time by chance. A curator told that one hit is "evidence" will start dropping candidates on noise.
- **Missing inputs.** The input list has `verdicts/` but not pass-2 verdicts, so the curator cannot see a candidate's *latest* verdict once pass 2 exists (see finding 4).

**Change.**
- Make the template name both outputs: `{{out}}` and `{{review_sheet_out}}`, both derived. Alternatively, if the review sheet really has moved to the script, edit the brief and HANDOFF §7 in the same commit.
- Delete the bolded sentence. If the ladder should inform curation, add one line to the curator brief ("report the ladder row for every shipped question in `flags_for_reviewer`; it does not gate eligibility") and let `ablate-score` supply the counts and chance values.
- List the pass-2 verdict directory once it is defined.

**Severity.** Important. It is blocking for production, not for calibration, since calibration does not curate.
**Confidence.** High on the output conflict.

---

## 9. `generate-section.md`: one brief rule is still in force against the template, and several are restated

**Where.** "Write exactly **{{n}} candidates**", "Treat each idea's `attempts` as a ceiling", "Honour `do_not_test` and `assumed_prior`…", "At most one candidate may set `bridge_from`", the `discrimination_pairs` bullet, and the front-matter claim that "The two brief rules that do not survive … are overridden here".

**Problems.**
- **"Exactly n" contradicts the brief's "emit fewer".** The brief's "Do not" section says: if an idea does not support a candidate, "Emit fewer and say which idea you skipped … Under-production is a signal". The template says exactly *n*. Only the stem-format and lens overrides are declared, so the agent must resolve this conflict itself. Either it pads to *n*, producing filler candidates, or it under-produces and the template's contract fails. State which one wins.
- **The format cap limits n.** The stem-format override is clear and I would expect it to be followed: it quotes the brief's rule and replaces it for this call. It does make n > 12 (6 formats × 2) unsatisfiable. `render` could check `n <= 2 × STEM_FORMATS.length`.
- **"Shard"-scoped caps.** The brief's "at most one pure definition question in your shard" and "at most one negation per shard" are now ambiguous at whole-section scope. They probably mean per call, which is the per-section cap anyway, but say so or leave them to the brief.
- **Restated brief rules.** The `do_not_test`/`assumed_prior`, `bridge_from` and `discrimination_pairs` bullets repeat brief rules in different words. That is exactly the drift risk. The discrimination-pair bullet has already drifted: the brief asks the agent to "say so in the trailing note", the template does not.
- **Idea selection varies between bench iterations.** The bench map has 12 `earns_question` ideas, their `attempts` sum to 32, and n = 8. The generator chooses which ideas to skip, so each iteration samples a different subset. A change in hit rate between iterations can then come from whether, for example, the inverse-U idea drew a question. Manipulation arms are unaffected, since they hold stems, but the iterate-the-generator loop is.

**Change.**
- Add to the override list: "The brief's 'emit fewer' rule governs: write up to {{n}}; if you write fewer, say which ideas you skipped and why in the note."
- Delete the three restating bullets; the brief already governs them. Keep only the true overrides: allocation, lens, count, format cap.
- For bench runs, add an optional derived `ideas` placeholder (a fixed idea list per bench, committed in `bench/<id>/`), so iterations test the same ideas.

**Severity.** Important on "exactly n". Minor on the rest.
**Confidence.** High.

---

## 10. The quoting rule, and two bench-rewrite items, restate brief text in several templates

**Where.** "Straight ASCII quotes; double outside, single when nested" in `bench-rewrite-stem.md`, `bench-rewrite-distractors.md`, `critique.md` and `critique-pass2.md`. `critique.md`'s negation line. `bench-rewrite-distractors.md` item 5 ("the checker will measure length; you make them *feel* interchangeable" is almost word for word the generator brief's step 4), and item 1, a rewording of RUBRIC D1/D3 (every distractor traces to a real misreadable sentence; no straw distractors).

**Problem.** For the two bench templates the agent is `quiz-generator`, whose brief already has a "Text form" section. These are plain restatements. For the critic, the quoting rule is in no brief and not in RUBRIC (I grepped RUBRIC for "ASCII" and found nothing). So `critique.md` is the critic's only source, which makes three hand-maintained copies of one rule. It was also the rule broken on 13 of 21 candidates, which says restating it is not what makes it hold.

**Change.**
- Put the quoting rule in RUBRIC once. Delete it from all four templates and from the generator brief, which then points to RUBRIC.
- Promote `validate`'s quote lint from WARN to FAIL. That is the project's standing response, and it makes the prose copies unnecessary.
- Delete item 5's second clause and the rewording in item 1.
- **Item 2, the "self-defeating" rule, is the real finding.** Note that it is a general rule, not a per-call one. If it holds up, it belongs in RUBRIC §4.3, where the other banned distractor patterns live, with a lint for options like "there is no…", "nothing is…", "none of…" when the stem presupposes something. Leaving it in a bench template means production generation never gets it.

**Severity.** Minor now. Important once item 2 proves out.
**Confidence.** High.

---

## 11. The fabricated-content notice tells the analyst and generator they are being measured

**Where.** `bench-author.md` item 9 ("Open the file with a two-line notice that the content is fabricated"), and `bench/undercraft/passage.md`, which goes further ("so that a test-wise reader's hit rate can be measured … The `quiz-adversary` agent **never sees this passage**").

**Problem.** The adversary never sees it, but the analyst and the generator read `passage.md` as their prose. They are then writing for a declared measurement of test-wise guessing, which real sections never tell them. The direction of the effect is unknown: they might write harder-to-guess questions, or be careless because "it's fiction". Either way the bench measures the pipeline under different conditions from production. This is the same kind of cue as the removed "invented academic framework" line, applied to the generator instead of the reader. Separately, `passage-notes.md` sits in the same directory. The analyst has Glob/Grep and the generator has Read, so either can open the author's list of "obvious wrong answers" and "known leak sites". Nothing forbids it.

**Change.**
- Have the author write the notice into `passage-notes.md` and `bench/README.md` only. Alternatively, keep it in `passage.md` inside an HTML comment or front matter, and have the bench prompt derivation pass a stripped copy (`passage.pipeline.md`) as `prose`.
- Add to `bench/README.md` rules: "The analyst and generator never see `passage-notes.md`", and put the notes in a sibling `private/` path that no template names.

**Severity.** Important. It is a validity question for the whole bench.
**Confidence.** Medium. I cannot say the effect is large, only that it is uncontrolled and cheap to remove.

---

## 12. Stages that still depend on improvisation

- **Canary test** (HANDOFF §1). This is the only check of adversary isolation, and "a prompt that would reward reading it" is left to the orchestrator every run. Add `adversary-canary.md`.
- **Recall grading.** See finding 6.
- **Applying a manipulation.** See finding 1.
- **Re-spawn after a validate failure.** Only `critique` has a slot for it (`respawn_note`); the other templates have none. Decide that a re-spawn uses either the identical prompt or a derived note, and apply that everywhere.
- **Review-block generation and curation.** The generator brief's `mode: review` (input: all six concept maps) and the curator's "Review-block mode" have no template. `generate-section`, `curate` and `analyse` are per-section. Not needed for calibration; needed before "Full".
- **Pass-2 critic destination and merge.** See finding 4.
- **Pre-registration line in `run.log`** (§9.3). Free prose is fine here, but a fixed schema (`{"stage":"preregister","arm":…,"prediction":…,"decision_rule":…}`) written by `ablate --preregister` would make "before any result exists" checkable by timestamp.

**Severity.** Important for the canary and the manipulation stage. Minor for the rest.
**Confidence.** High that these have no template.

---

## 13. Renderer: ways a malformed prompt gets through

In order of likelihood:

1. **Malformed tokens are sent literally.** `PLACEHOLDER` matches only `{{name}}` / `{{?name}}` with lowercase names and no spaces. `{{ stem }}`, `{{Stem}}`, `{{stem-text}}`, `{{?  x}}` or the brief's single-brace `{stem}` match nothing, so lint passes and the agent receives the literal braces. **Change:** in `lintTemplate`, after removing valid tokens and includes, fail on any remaining `{{` or `}}` in the body. This is a template-level check, so values are unaffected.
2. **Paths are not checked.** A typo in `--set concept_map=…` renders fine. The agent then FAILs, or worse, the analyst (which has Glob) finds a similarly named file and uses it. **Change:** name input-path placeholders by convention (e.g. `*_path`, or a `paths:` list in front matter) and have `stagePrompt` die if they do not exist; require `out` to be under `runs/<label>/` or `bench/<id>/`.
3. **Blank-line collapsing reaches into values.** `\n{3,}` → `\n\n` runs over the substituted text, so a stem or explanation with a deliberate double blank line is altered in the prompt but not in the file that ships. That is rare, but it is text the adversary sees differently from the reader. **Change:** collapse on the template before substitution, or only around empty optionals.
4. **A byte-order mark defeats front-matter stripping.** A file saved with a BOM does not start with `---\n`. Lint then fails, since every placeholder looks undeclared, so this fails closed, except for a template with no placeholders, which would ship its front matter. **Change:** strip a leading `﻿`.
5. **A declared auto key can be overridden.** If a template declares `workdir` (or an enum) in `placeholders`, a `--set` wins over the auto value. **Change:** lint rejects declaring an auto key.
6. **The README overstates the selftest.** It says the selftest "renders every template here with its declared placeholders". It lints every template but renders only `adversary-mc` and `critique`. Either render each one with dummy values, which would catch a broken include in a rarely used template, or fix the sentence.

Nothing here lets a *required* placeholder through unfilled. That part is sound.

**Severity.** 1–2 important; 3–6 minor.
**Confidence.** High for 1, 3, 4, 5, 6, from the code. Medium for 2's practical risk.

---

## 14. The adversary brief's "Prompt (verbatim)" is now false

**Where.** `.claude/agents/quiz-adversary.md`, "Prompt (verbatim)" block, and the `tools: []` configuration text.

**Problem.** The brief shows a verbatim prompt without "Do not use any tools", and the template adds it. The notes explain why and that is fine, but the brief's own word "verbatim" is now untrue. Anyone checking the brief against a spawn will find a mismatch, which is the kind of drift the README is meant to end. The brief also still states "no tools" as its isolation guarantee, which HANDOFF §1 and §8 now say is false. Low confidence, and a harness question rather than a template one: if the harness supports `disallowedTools` in agent front matter, listing the file and shell tools there would make isolation structural again. It is worth one canary test to find out.

**Change.** Replace the verbatim block with "The prompt is `prompts/adversary-mc.md`; the baseline was sent without its 'Do not use any tools.' sentence." Correct the configuration paragraph to match HANDOFF §8.

**Severity.** Minor.
**Confidence.** High on the text; low on `disallowedTools`.

---

## 15. `critique-pass2.md` points at the wrong object to fix

**Where.** Item 2, "`{{candidate_input}}` — the original candidate", and item 3, "its `reasons`, `preserve` and `rewrite_changed` are the part to keep".

**Problem.** What failed re-measurement is the *rewrite*, which lives inside `prior_verdict.rewrite`, not in `candidate_input`. The template never says "the rewrite in your pass-1 verdict is what you are fixing". "The part to keep" also reads as "preserve these fields" rather than "read these". The critic may re-rewrite the original, which is the very reversion the second pass exists to prevent.

**Change.** Item 3: "`{{prior_verdict}}` — your pass-1 verdict. Its `rewrite` is the object that failed; start from it. Its `reasons`, `preserve` and `rewrite_changed` say what pass 1 was fixing."

**Severity.** Minor, since the path is never exercised yet. Important once it is.
**Confidence.** Medium–high.

---

## Leave alone

- **"Do not use any tools." in `adversary-mc.md`**, although the baseline lacked it. Keep it and keep recording the difference, as the notes say. Do not remove it to "match the baseline".
- **Same seeded permutation across rungs for the same id#seed.** This is what controls position. Finding 1 asks that it be preserved through the distractor arm, not changed.
- **The key and stem held byte-identical in the distractor arm.** Do not relax this to let the rewrite agent "balance" the key. That would confound the arm and bring in the extreme-key tell.
- **Enum values auto-filled into `critique.md` / `generate-section.md`.** This is not a restatement: they come from the constants `validate` enforces, so they cannot drift. Only the prose rules around them are drift risks (finding 10).
- **"There is no `EXEMPLARS.md`, deliberately"** in the generate templates. It is a per-call fact that matches the brief, not a restated rule.
- **`regenerate.md` not showing the rejected candidate.** It is deliberate and matches the brief.
- **The renderer dying on an unknown variable**, the one-pass substitution (a value containing `{{` goes in literally), and whitespace-only required values counting as missing. All correct.
- **The options-only notes' "Never add one"** (no subject-matter cue). Correct, and it also applies to the fixed stem-slot line proposed in finding 7: that line must name no domain.
- **`bench-rewrite-stem.md`'s `what_i_withheld` self-report.** It caught the w02 flaw class. Keep it. It is a report, not a check, and is used that way.
- **One shared review body for the Opus and Gemini reviewers.** That is right; the two should differ only in delivery.
