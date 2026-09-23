Model: claude-opus-5-5

# Review of bench passage b02 (Serrow cairns)

Scope: `bench/b02/passage.md`, `bench/b02/private/claims.json`, `bench/b02/private/passage-notes.md`, `bench/b02/bench-check.json`, `bench/README.md`, `prompts/bench-author.md`. I also looked at `bench/b02/prompts/` and `prompts/analyse.md` for finding 3.

I checked the worked example's arithmetic and the two register readings by hand; they are right (see "Leave alone"). The main problems are not with the prose. They are that several claims tagged "no sensible guess" can be guessed, that one real-world frame predicts every locals-versus-strangers claim, and that the balance band is set against the wrong baseline.

---

## 1. Several "passage-only" claims can be guessed, and honest tags would probably push the passage past the 70% cap

- **Where.** `claims.json`: P1, P3, P4, P5, P8, P9 (and C3, see finding 5).
- **Problem.** `passage_only: true` should mean a reader has no sensible guess. For these six, any stem that asks the question gives the blind reader enough to guess, and the guess is right.
  - **P5 (survey order).** "Record the loose stone before you touch the cairn, and take the plumb-line reading before handling it" is what anyone would guess, because disturbing things destroys evidence. Only "cant measured from the crown downward" is truly arbitrary, and the passage says so itself. The `quote` field covers only that arbitrary half, which hides the fact that the other half can be guessed.
  - **P3 (Brannagh).** The obvious objection to a model with "two separate registers" is that they are not really separate. That is Brannagh's objection. The pipeline has already seen this pattern: "which objection is strongest" questions go to whichever option actually objects.
  - **P4 (Tessaly on the crown).** The obvious objection to counting the top stone is that people handle it. If the stem mentions that passers touch the crown, the answer follows.
  - **P1 (footing excluded, crown included).** "The bottom course sits on the ground and carries no message" is the default guess. "Crown included" is also the default whenever a stem lists the crown's cant, as the worked example does.
  - **P9 (concord 0.6).** Give the stem the cant sequence E E E W E E and the definition, and the natural count is 3 of 5. This is a stem-arithmetic item, not a passage-only fact.
  - **P8 (lean versus cant).** Once a stem defines lean as frost tilt and cant as a deliberate offset, "lean carries no meaning" and "lean does not alter a relative offset" follow from the definitions.
- **Why it matters.** `bench-check` needs at least four passage-only claims, and the ten it counts are what make b02 look well stocked with unguessable facts. Suppose these are retagged as directional with a right naive guess (P5 split in two): directional becomes 19, with naive right on 13 (68%), or 14 (74%) if C3 is also retagged. 74% fails the 70% cap. The claims that stay truly passage-only are P2 (partly), P5's crown-downward half, P6, P7 and P10's upslope/downslope mapping. That is five, just over the minimum of four, and several of those leak through their names (finding 7).
- **Change.**
  - Split P5 into P5a (tithe stone first; naive right) and P5b (crown downward; passage-only).
  - Retag P1, P3, P4, P8 and P9 as directional, with `naive_is_right: true`.
  - Re-run `bench-check`. If it fails, retire b02 and write a replacement. It has no results yet, but it is cleaner to add a passage than to argue over tags.
  - For future passages, add to `prompts/bench-author.md` item 5 that a passage-only fact must stay unguessable *after* a stem has posed it, and that "which objection" and "which comes first" facts must not have a common-sense answer.
- **Severity.** Blocking, if the retag is accepted. Whether b02 "passes `bench-check`" depends on it.
- **Confidence.** Medium. Guessability depends on how much the stem reveals, and I have assumed an ordinary stem. The best test is to run the quiz-recall probe (open question, no options) on stems for P1, P3, P4, P5 and P8. If it gets them wrong, my retag is too harsh.

## 2. One real frame, "experts are better overall but stuck in their habits", predicts every locals-versus-strangers claim

- **Where.** `passage.md`: "Lean and cant", "The concord index", "When the registers disagree", "Sources of error". Claims C1, C3, C4, C5, C11.
- **Problem.** No single argument maps one-to-one onto a real theory. But the claims that compare locals with strangers all follow the pop-science account of expertise:
  - experts err less overall (C11);
  - experts do not depend on surface consistency, which only helps novices (C1, like the expertise reversal effect in cognitive load theory);
  - experts hold to an entrenched cue over fresh evidence, and that costs them (C3 and C4, like the Einstellung effect, conservatism in belief revision, or normalcy bias);
  - experts' quick whole-shape judgements fail under a systematic distortion that step-by-step novices avoid (C5).

  That is 5 of 5, with none against. The notes argue that the "fresher notice" echo "gives a reader no net direction", because it makes C4 right and C3 wrong. That holds only for a reader using the crude "trust the fresh notice" rule. A reader using the richer frame gets both right. The name "Tessaly shadowing" helps too: an effect named after a researcher almost always describes a mistake.
- **Also.** C13 (restoration makes a cairn cleaner and easier to read, but it says less) is Ruskin's and Morris's case against Viollet-le-Duc-style restoration, almost directly. C13 is already tagged naive-right, so this only strengthens that tag. It belongs in the notes' "thin renamings" list, which does not mention it.
- **Why it matters.** Picture a question on C5: "Who is misled more by frost lean?" A blind reader who thinks "the question exists because experts have a blind spot" answers right. The same reasoning answers C3 and C4. Because the frame holds across five claims, it is a stronger guide than any single heuristic the notes tallied.
- **Change.** Add "experts are robust but habit-bound" as a tagged heuristic in `claims.json` so `bench-check` counts it. Then make at least one expert-comparison claim go against it. The cleanest option that keeps the internal logic is C1's second half: locals read *low*-concord cairns slightly better than high-concord ones, because to them a cant-break is extra information. Also add the conservation-theory echo for C13 to `passage-notes.md`.
- **Severity.** Important.
- **Confidence.** Medium. The C5 step is the weakest link: the expertise literature more often says novices are fooled by misleading cues. A blind-reader run on C5 alone would settle it.

## 3. Files next to `passage.md` say it is invented, and only `private/` is fenced off

- **Where.** `bench/b02/prompts/bench-author.txt` and `review.txt`, `bench/b02/reviews/` (including this file), `bench/b02/bench-check.json` (`naive_right`, `heuristics`), and the prose path itself (`bench/b02/passage.md`). Also `bench/README.md` rule 3 and `prompts/analyse.md` line 23.
- **Problem.** `passage.md` itself has no framing leak; I found none. But the analyst has Glob and Grep, and the only fence is a behavioural "do not open any file under a `private/` directory". `prompts/` and `reviews/` are siblings of `private/`, and every file in them calls the passage fabricated or invented. `bench-check.json` shows that claims are tagged for how they sound. The analyst is also told its prose lives under `bench/`.
- **Why it matters.** The README withdrew the undercraft 2026-09-20 figures because the generator knew it was being measured. One Grep for context from the analyst would recreate that condition, and nothing would record that it happened.
- **Change.**
  - Move `prompts/`, `reviews/` and `bench-check.json` under `bench/<id>/private/`, or into a separate `bench-meta/<id>/` tree. The existing rule then covers them, and `bench/README.md`'s layout block needs updating to match.
  - Consider copying `passage.md` to a neutral path (for example `runs/<run>/section.md`) for the analyse and generate stages, so the word "bench" never reaches them.
- **Severity.** Important.
- **Confidence.** High that the files are there and readable. Low on how often the analyst would actually open them. The analyse brief's "Read nothing else" has held so far, but the project's own finding is that brief-only rules are broken often.

## 4. The 30–70% band is set against 50%, but a blind reader's floor on these directional claims is about 50%, not 25% or 40%

- **Where.** `bench/README.md` "Rules" (the band) and "Floors to compare against". `bench-check.json` `naive_right_share: 0.54`.
- **Problem.** Most directional claims here are binary in effect: locals or strangers, guild or shepherd, false crowns or lean, worn or laid. On a four-option question the blind reader can narrow to "the sensible option" or "its reverse". If it always picks the sensible option, it scores `naive_right_share`, 54% here. If it always picks the reverse, it scores about 46%. The band does its job, stopping a single strategy from reaching 100%, but it guarantees a floor of about 50% on directional items. That is above the README's 40% comparator, and is not "leakage from the question".
- **Why it matters.** Say a b02 run scores 55% overall. Compared with 40%, it looks like the questions leak. It may be the expected floor on directional items plus chance on passage-only items. Undercraft's 75% cannot be compared either, since its imbalance made the reverse strategy score 100% on its directional items.
- **Change.** In the scoring stage, and in the README floors table, report hit rate separately for items built on directional claims and on passage-only claims. That needs each idea in `ideas.json` to name its claim id. Compare directional items with `max(naive_right_share, 1 − naive_right_share)`, and passage-only items with 25% and 40%.
- **Severity.** Important. It changes what any b02 result means.
- **Confidence.** Medium-high. The one thing that would change my mind is if the generator's distractors reliably include two or more options that are about as sensible, so the choice does not narrow to two. The option-only arm of `-FICTION-B` (4/6) suggests it does narrow.

## 5. C3's naive answer is the less likely guess

- **Where.** `claims.json` C3: `"naive_answer": "Experienced locals follow the fresher information, the worn sense."`, `naive_is_right: false`.
- **Problem.** Ask an outsider "when the permanent marker and the passers' marker disagree, which do experienced locals follow?" and the common guess is "the permanent one, from habit". That is also the guess prompted by a question about a *named effect*. C3's truth probably goes with the naive guess.
- **Why it matters.** It tips `naive_right_share` from 0.54 to 0.62 on the current tags, and combined with finding 1 it pushes past 70%. It also moves "the surprising answer" to 5 right and 8 wrong.
- **Change.** Retag C3 as `naive_is_right: true` with that naive answer, or mark it genuinely split in `passage-notes.md` and leave it out of the balance count.
- **Severity.** Important, because it feeds finding 1.
- **Confidence.** Medium. The recall probe on a neutral stem would settle it.

## 6. "More is better" is balanced only because of two stretched tags, and the inverse-U wins half the questions about quantities

- **Where.** `claims.json` C11 and C12 (`heuristics_right: ["more is better"]`), and C1, C2, C6, C7.
- **Problem.** C11 ("more experience, fewer errors") and C12 ("more of the route visible") are not really "more of a quantity is better" claims. They are there to bring "more is better" to 3–3. On the four genuine questions about how a quantity affects the outcome (concord C1, height C2, traffic C6, stone weight C7), "more is better" is right once and wrong three times, so it is reliably wrong. The inverse-U is right twice (C6, C7) out of four possible shapes (rising, peaked, flat, falling), and C6 and C7 sit side by side, the second introduced with "The weight of the tithe stone behaves in the same way."
- **Why it matters.** A reader who always picks "a middle value is best" on shape questions scores 50% against 25% chance. A question on C7 followed by one on C6 rewards it twice.
- **Change.**
  - Drop "more is better" from C11 and C12.
  - Count balance on the shape questions separately in `bench-check`. That means tagging each claim's shape (rising, peaked, flat, falling) and flagging any shape that holds for more than a third of them.
  - To rebalance, make C6 or C7 rising or falling rather than peaked. Removing "behaves in the same way" also stops a question on one of them from giving away the other.
- **Severity.** Important.
- **Confidence.** High on the counts. Medium on whether the generator will actually write four-shape options.

## 7. Heuristics not on the author's list are still reliable guides

- **Where.** Across `passage.md`.
- **Problem.**
  - **"The option with the most sensible causal story is right."** Almost every true claim comes with a mechanism, and it is the one an outsider would supply: light stones blow about, heavy ones stay put (C7); a visible next cairn lets you check the line (C12); ruined cairns get recognised and ignored (C9); guild cant-breaks lower concord (C8). The only plausible mechanism the passage rejects is Marhaug's height reasoning (C2). The generator will copy the passage's "because" into the key, and distractors will carry invented mechanisms that fit less neatly.
  - **"The objection was noted but practice did not change."** Both objections, Brannagh's (P3) and Tessaly's (P4), are overruled in practice, and the founder's one prediction is refuted (C2). A question on the fate of an objection is answered by "the standard stands", 2 for 2.
  - **"The majority of courses gives the direction; the odd one out is something else."** This reads the worked example correctly, and nothing in the passage punishes it.
  - **"The answer with a trade-off is right."** C13 ("easier to read, says less") and C1 ("helps strangers, not locals").
  - Possibly **"the mundane cause beats the dramatic one"**, right in both C9 and C10 (low confidence).
- **Why it matters.** Each holds on every claim where it applies, so a question built on any of those claims gives a blind reader a reliable way in.
- **Change.**
  - Add one claim where a sensible mechanism is stated and then shown false (for example, "one would expect a visible next cairn to help by…; Orne found instead that…").
  - Make one of the two objections carried into practice, for example "the Tessaly index, without the crown, is now standard on the Oskel route".
  - Tag these heuristics in `claims.json` so `bench-check` counts them.
- **Severity.** Important for the mechanism heuristic, minor for the rest (too few claims each).
- **Confidence.** Medium. How much the mechanism heuristic leaks depends on how the generator writes distractors, which this review cannot see.

## 8. Cant is defined for body courses only, but the index, the example and Tessaly's objection all need the crown to have one

- **Where.** `passage.md`, "Lean and cant": "Cant is the deliberate offset of a single **body course** relative to the course beneath it". Against that: "the crown is included" (concord), "The crown is canted east" (worked example), and "its cant records handling" (Tessaly).
- **Problem.** By the stated definition the crown, which is not a body course, has no cant. A careful reader, or the critic when it returns, could fairly back the distractor "the crown is excluded because it has no cant of its own", which is the footing's stated reason, word for word.
- **Why it matters.** P1, P4 and P9 all depend on the crown having a cant. A disputed key on those items can make a correct blind answer look wrong, or the reverse.
- **Change.** "Cant is the deliberate offset of a single course, a body course or the crown, relative to the course beneath it."
- **Severity.** Important. It is a one-line fix, and it touches three claims.
- **Confidence.** High.

## 9. Two discrimination pairs give themselves away through their names, and pair 5 is not a pair

- **Where.** `passage-notes.md` "Discrimination pairs" 1, 4 and 5. `claims.json` P2 and P10.
- **Problem.**
  - **Pair 1.** "Worn" plainly means worn by passers, and "laid" means laid by the builder. "Which register is updated by passers?" answers itself.
  - **Pair 4.** "Inversion" plainly goes with "reads the reversed course as the direction". Only the population (strangers versus experienced readers) is unguessable, and a question that asks for the mechanism leaks it.
  - **Pair 6** (blind versus dumb) is closer to a coin flip. There is a faint pull: "dumb" suggests "says nothing", that is, no builder's message.
  - **Pair 5** ("cant-break vs a meaningful reversal") has no second member. The passage never defines a "meaningful reversal"; a single reversed course simply *is* a cant-break. What pair 5 describes is the careless reading, which is Orne inversion, so it duplicates pair 4.
- **Why it matters.** The notes count four or five real pairs. Discrimination questions built on the names will be answered by etymology.
- **Change.**
  - Record in `passage-notes.md` which half of each pair the name gives away, and drop pair 5.
  - In the passage's next revision, or its replacement, give the effects and registers names that are not descriptive, or make a name point the wrong way.
- **Severity.** Minor to important. Important if the generator's discrimination questions ask for the mechanism, which is the natural way to ask them.
- **Confidence.** Medium on pairs 1 and 4, low on pair 6, high on pair 5.

## 10. Smaller gaps in consistency and answerability

- **Where / Problem / Change.**
  - **"False crowns".** The crown is defined as the flat top stone, and a loose stone resting on it is by definition a tithe stone, so a "false crown" is really a false tithe stone. The passage also never says how a stone that carries only ford state misroutes anyone. Rename it "false tithe stones", and add half a clause on the mechanism, for example "sending walkers away from a passable ford".
  - **C10's population.** The sentence follows "Among strangers, …" but does not repeat it, and lean is said to mislead locals more (C5). A question that adds "among strangers" to C10 claims more than the passage states. Add "Among strangers" to the C10 sentence, or "for all walkers".
  - **Uncanted courses.** "Above the fifth body course builders rarely cant at all", and dumb cairns have no deliberate cant, but concord is defined only over east/west pairs. How an uncanted course counts is never stated. Add one clause, for example "uncanted courses are skipped".
  - **"Conflict" between registers.** The passage first says the two registers "answer different questions", then that they conflict. They cannot strictly disagree: "the route goes to the ford" and "the ford is high" can both be true. A careful reader can reconcile the two, but a question that says the laid sense was "wrong" in 13 cases rests on something the passage never states. Change "the worn sense was the correct one" to "the ford was in fact high", which is what 58 of 71 means.
  - **Restoration.** "Set the tithe stone back in its seed position" assumes the conservator knows the builder's original seed position. Change it to "on the upslope side", or say how the seed position is known.
- **Severity.** Minor.
- **Confidence.** High that the gaps exist. Medium that a generated question will land on one of them.

## 11. Smaller tagging points

- **C2.** The naive answer is written as two guesses ("taller … (or: a middling height is best)"). Both are wrong, so the tag guarantees `naive_is_right: false`. Pick one. Also tag the heuristic "a prediction named in the stem was refuted" (1 of 1).
- **C9.** The naive answer builds in the passage's own reason ("which people ignore"). An outsider who has not been told that strangers ignore collapsed cairns may well guess that a collapsed cairn is the bigger hazard. The tag probably holds only for stems that include the reason. Note this, or tag the claim as split.
- **Missing claims.** The worked example's conclusion ("turns east, branch before the next cairn") and "a restored cairn is easier for a stranger to read" are both likely question targets and have no entry in `claims.json`.
- **Severity.** Minor.
- **Confidence.** Medium.

---

## Leave alone

- **The worked example's arithmetic.** Six courses above the footing give five pairs. (1,2), (4,5) and (5,crown) agree; (2,3) and (3,4) disagree; so concord is 3/5 = 0.6. "Downslope → ford not low → high" matches the worked example's ford-high reading.
- **The tension between "the laid sense does not change unless the cairn is rebuilt" and Tessaly's "passers reset the crown".** It is deliberate: it is the content of her objection. Do not "fix" it by softening either sentence.
- **"Nothing in the stone requires this direction"** (crown-downward cant). This is the one survey-order fact that really has no guess. Keep it as stated.
- **The C3/C4 pairing, and the author's advice to ask them together.** The advice is right; only C3's naive tag is wrong (finding 5).
- **C11 being trivially guessable.** The notes already say so, and it is illustrative. Do not remove it for balance; drop only its "more is better" tag.
- **"The surprising answer is the right one" being the exact complement of the naive guess.** This is by construction. It adds no independent check, but it is not a bug.
- **Brannagh's "passers on quiet routes rarely move it".** It is consistent with C6's "stale on quiet routes". The two support each other; neither contradicts the other.
- **`passage.md`'s own text.** There is no statement of invention, measurement, testing or quizzing in it. Any framing leak is in the sibling files (finding 3), not the prose.
