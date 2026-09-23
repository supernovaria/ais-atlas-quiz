Model: claude-opus-5-5

# Review of bench passage b03 (cord-snail lattices)

Claim ids below (C1–C23) are the entries in `private/claims.json`; each is glossed where it is used.

Context that changes how to act on this: b03 was rendered from the **previous** `prompts/bench-author.md` (the text in `bench/b03/prompts/bench-author.txt` has the old five-heuristic item 4 and no rules on names, matched pairs or `shape`). The current template was tightened after the b02 review. Several findings below are that tightening applied to b03. The passage has no results yet, so revising it through `prompts/bench-revise.md` is allowed.

---

## 1. The keeping phase contradicts the Tasker drift, and undercuts Tasker's objection

- **Where:** `passage.md`, "Spans and ties" ("Founders begin a lattice and keepers elaborate it... Every lattice therefore has a founding phase, which ends when the last span is anchored, and a keeping phase"); "Hold and reach" ("both tend to rise while keepers work"); "Two regularities" (Tasker objection: multi-founder lattices "had simply had less time to be kept"; Tasker drift: after founding, reach falls in draughty galleries and "stays roughly level" in still ones).
- **Problem:** The passage presents the phases in sequence: founders lay spans, *then* keepers elaborate. On that reading a lattice has no ties when founding ends, so its hold and reach are zero. But the Tasker drift says that after founding, reach falls (draughty galleries) or stays level (still galleries), and hold "barely changes". So reach can never rise at all, which also contradicts "both tend to rise while keepers work". Separately, the Orrin effect holds only in still galleries, and there reach is level after founding. So Tasker's objection that younger lattices "had less time to be kept" is refuted by the passage's own facts, whatever Orrin's age-matched comparison showed.
- **Why it matters:** A careful reader cannot say when reach is built. Take the question "While keepers work a lattice, what happens to its reach?" "It tends to rise" (the hold/reach section) and "it falls in draughty galleries" (Tasker drift) are both supported. Or take "Why did Tasker's objection fail?" If a distractor says "in still galleries reach does not change after founding", that distractor is defensible. Item 6 of the bench-author template ("internally consistent and genuinely inferable") names this failure: two defensible keys produce a low score that is noise, not a success.
- **Change:** (a) In "Spans and ties", after the phases sentence, add: "Keepers begin laying ties as soon as the first spans are anchored, so most of a lattice's ties, and nearly all of its reach, are laid before its founding phase ends; the keeping phase is the period after the last span, when only keepers work." (b) Replace "because both tend to rise while keepers work" with "because both rise while a lattice is being founded". (c) Change Tasker's ground so the passage does not refute it. For example: "his multi-founder lattices had been founded more quickly, and so had been kept for fewer seasons before their last span was anchored". Then: "Orrin answered by comparing lattices whose founding had taken the same number of seasons". After the edit, check that "hold barely changes" and C15 ("more keepers, higher hold") still read consistently. C15 is a comparison between lattices, so it should.
- **Severity:** blocking.
- **Confidence:** medium-high. What would change my mind: evidence that readers naturally take "founding phase" to include keeper activity. The "therefore" in that sentence ties the phases to the roles, which argues against that reading.

## 2. Most coined names give their distinction away

- **Where:** `passage.md` throughout. Tagged as `passage_only` (meaning an outsider has no sensible guess) in `claims.json`: C1 (span vs tie), C2 (founder vs keeper), C4 (reach definition), C5 (sheeted/corded rule), C21 (souring vs fraying). Also C16 (hold and survival) and the Orrin/Tasker pair. Current `prompts/bench-author.md` item 7: "A name must not give its distinction away."
- **Problem:** Once a question has posed the terms, the ordinary English meaning of each name answers it:
  - **span**: in ordinary English a span bridges two supports, so "a span is fastened to rock at both ends" (C1) follows. **tie** is the structural word for a member that links other members.
  - **founder / keeper**: a founder lays the foundation (the anchored frame) and a keeper maintains and elaborates, so "founders lay spans" (C2, first half) follows. The second half of C2 (a founder may keep another snail's lattice) is not guessable.
  - **reach**: the word suggests length or extent, so "longest chain" (C4) is guessable against distractors about ratios or counts.
  - **hold**: the word suggests grip or holding together, so "which measure predicts flood survival?" (C16) points to hold.
  - **sheeted / corded**: the passage's own description ("a continuous membrane" vs "a net of distinct ropes") is the literal meaning of the words. The direction of the rule is then guessable too: more ties hung from ties gives a membrane, so a long reach means sheeted (C5). Only the factor of 2 needs the passage.
  - **fraying**: in English this *means* mechanical wear that leaves loose fibres. **souring** suggests a chemical change. Both definitions in C20 and the whole diagnostic in C21 follow from the words (see finding 3).
  - **"Tasker drift"**: "drift" means gradual change over time, so the Orrin-vs-Tasker pair ("one compares lattices by founding, the other follows one lattice through time") is answered by the noun. "Founder" plus "drift" also echoes population genetics (founder effect, genetic drift). That resemblance is in vocabulary only: I found no directional mapping from it to reach. It does raise the chance that a reader reaches for that frame.
- **Why it matters:** These are the claims the bench relies on as unguessable. A blind reader shown "Which kind of thread runs from rock to rock?" with span / tie / keeper-thread / cord needs no passage to pick span. The passage-only group, which the template calls the most informative, is inflated.
- **Change:** Rename using neutral coinages, or coinages that point the wrong way (current item 7). For example: span → *tharl*, tie → *wennet*; founder/keeper → two neutral snail-role nouns (e.g. *orra* / *sell*); hold → *cant*, reach → *pell*; sheeted/corded → two terms with no visual meaning; souring/fraying → two neutral nouns. Give both regularities the same noun ("the Orrin pattern", "the Tasker pattern") so that "effect" vs "drift" gives nothing away. Retag C1, C2 (first half), C4 and C21 as guessable until renamed. In `passage-notes.md`, add "which half of each pair a name gives away", as the current template requires.
- **Severity:** blocking. The passage-only claims are the bench's main instrument, and the names give away at least five of them.
- **Confidence:** high for fraying, span, sheeted/corded and drift; medium for founder/keeper, reach and hold. What would change my mind: blind-reader results on questions posed with the names, at or near 25%.

## 3. The souring/fraying diagnostic is real rope-failure knowledge (question 1, analogy in disguise)

- **Where:** `passage.md`, last paragraph of "Where lattices are found and how they fail" ("a soured thread snaps clean across, and a frayed one parts in a tapering brush of fibres"). The passage has already said that souring "leaves a thread brittle". `claims.json` C21 tags this as passage-only with no sensible guess. `passage-notes.md` says physics-sounding claims were avoided.
- **Problem:** This is a one-to-one mapping onto real fibre and rope failure analysis. Chemically embrittled fibre fails in a clean, square break. Abraded fibre fails in a fuzzy, "broomed" end. Anyone who knows that brittle material snaps cleanly, or has seen a worn rope end, gets C21 without the passage. It is the most direct real-world mapping in the passage.
- **Why it matters:** A question on how to tell a soured break from a frayed one will be answered by physical intuition. C21 is counted among the 11 passage-only claims, so the bench would report such a hit as leakage when it is knowledge.
- **Change:** Replace the diagnostic with one that has no physical basis, and do not describe souring as "brittle" in the same breath. For example: "the reliable way to tell them apart is where the break falls: soured ties break nearer the tie end, frayed ones nearer the span end." Check the replacement for new reasoning paths: snail traffic might plausibly concentrate near spans. Until then, tag C21 `passage_only: false` and give it a naive answer (naive_is_right: true).
- **Severity:** important.
- **Confidence:** high.

## 4. Two heuristics nobody tagged are reliably right

- **Where:** `passage.md`: the Tasker objection (refuted, "the effect is now treated as established"); Emmerick's proposal (not adopted, "the field has on the whole kept her rule"); every discrimination pair. `claims.json` C1, C4, C11, C22. Current template item 4.
- **Problem:**
  - **"The objection was raised, but the original result stands."** This is right 2 of 2. Tasker's age objection fails, and Emmerick's proposal is not adopted. The current template requires at least one objection to be **carried into practice**. b03 has none, because it was written against the old template.
  - **"The option saying two things that seem alike are actually different is right."** This is right every time and never punished. Hold and reach "answer different questions"; the Orrin effect and Tasker drift "are not versions of one finding"; span vs tie is "not [about] length or thickness"; Emmerick "did not dispute" the definitions. No claim anywhere turns out to be two names for one thing.
  - **"Experts beat beginners."** Beginners who classify threads by appearance are "wrong often enough" (C1). No claim goes the other way, which the current template also requires.
  None of these heuristics is in any `heuristics_right`/`heuristics_wrong` list, so `bench-check` cannot see them.
- **Why it matters:** A question on either objection has a reliable blind answer: "the effect survived" / "the rule was kept". Any question on how two terms relate has a recognisable blind answer: "they are distinct and can come apart". The project's current lead is that wrong answers are recognisably wrong. Distractors such as "hold and reach measure the same thing" or "Emmerick's proposal replaced Varrenby's rule" are exactly that kind of distractor, and here the passage itself makes them wrong.
- **Change:** Make Emmerick's objection partly carried into practice. For example, end the last paragraph with: "and since the 1970s most surveys have assigned the class from the mean of the three longest chains, keeping Varrenby's rule only for comparison with her survey." Update C22 to match. Add a claim that two apparently separate things turn out to be one: for example, that the Aumark protocol's "spur" is simply a tie whose ends are both on one span, which beginners count as a third kind. Add one claim where the beginner's reading is right. Tag all three heuristics in `claims.json`.
- **Severity:** important.
- **Confidence:** high that these heuristics are unbalanced as the passage stands; medium on how much the generator's distractors will exploit them.

## 5. The balance is by claim count, but the claims likely to become questions all go against the naive guess

- **Where:** `claims.json`. The claims where the naive guess is right are C7 (span counts more reliable), C14 (cold slows building), C15 (more keepers, higher hold), C16 (hold helps survival), C17 (height helps survival), C19 (floods, not silt, destroy lattices). The claims where it is wrong are C8 (centre trace beats rim trace), C9 (Orrin effect), C12 (Tasker drift), C13 (middling damp), C18 (resting snails on middling reach), C20 (souring beats fraying). `bench-check.json` ("naive_right_share": 0.5).
- **Problem:** The six naive-right claims are the passage's filler. Each is a one-sentence statement; C15 follows almost by definition (keepers lay ties, spans are fixed); C14 and C17 are real biology and flood common sense; the author concedes C14 was included "to balance the naive share". The naive-wrong claims are the headline content: both named regularities, the comparison of the two tracing methods, and both peaked distributions. A generator choosing load-bearing ideas will draw mostly from the second group. The 50% share at claim level will not survive into the question set.
- **Why it matters:** `prompts/bench-claim-map.md` sets the floor for directional items at about max(share, 1 − share). If "share" is the passage-level 0.5 but three of four questioned directional claims are naive-wrong, a reader who reverses the obvious scores 75% on those items. That would be read as leakage above a 50% floor, when it is the passage's own skew.
- **Change:** (a) When writing `bench/b03/ideas.json`, choose ideas so that naive-right and naive-wrong directional claims are equally represented, and record the claim ids behind each idea. (b) Compute the directional floor from the share among the claims actually questioned (the claim-map output), not from `bench-check.json`. (c) Give at least two naive-right claims the weight of a headline result: a named effect or a worked-through argument, not a single sentence. For example, make one of the named regularities go the sensible way.
- **Severity:** important.
- **Confidence:** medium. It depends on the generator's selection, which I have not seen for b03. Its behaviour on `undercraft` is consistent with this.

## 6. The centre trace, as defined, cannot find the chain the worked example says it finds

- **Where:** `passage.md`: the definition of reach ("Start at any tie, move to a tie fastened to it... the chain ends"); "The centre trace begins only from the tie nearest the middle of the lattice"; the worked example ("the longest tie-to-tie chain runs through 7 ties and passes close to the lattice's centre, so the centre trace would also have found it").
- **Problem:** A chain, as defined, is a walk that starts at one tie. The centre trace *starts* at the tie nearest the middle. A 7-tie chain that "passes close to" the centre has its ends elsewhere. A walk begun partway along it can follow only one direction, so it finds about half the chain, not all 7. This also makes C8 (centre trace underestimates less often than rim trace) puzzling to a reader thinking about longest paths: chain ends lie near the edges, which favours starting points at the rim.
- **Why it matters:** The analyst and generator are strong models and will reason about the definitions. A generator may write a question whose key contradicts the definition, or a critic may flag the key as wrong. For a careful reader, "what would the centre trace have found for the Sellen lattice?" has the passage's answer (7) and a definitional answer (about 4).
- **Change:** Define the centre trace as "finds the longest chain that passes through the tie nearest the middle of the lattice". In the worked example, write "passes through the tie nearest the lattice's centre". A related gap: the passage never says a chain may not revisit a tie. A sheeted "membrane" must contain loops, and without that rule reach is unbounded. Add "without passing through any tie twice" to the definition of reach.
- **Severity:** important.
- **Confidence:** medium. A reader could take "begins from" loosely, as "is centred on". The worked example's "passes close to" is loose either way.

## 7. Tag corrections (question 2 honest tagging, question 4 reconstructable passage-only facts)

Each change goes in the more guessable direction, as `bench-revise.md` requires.

- **C6** (ties counted before spans): tagged as having no sensible guess. It has one: count the frame first, in the order it was built. So tag naive = "spans first", `naive_is_right: false`. The order is also a two-way choice with a 50% blind floor, so as a question it carries little information.
- **C9** (Orrin effect, several founders give shorter reach): the naive answer recorded is "more founders, longer reach". "Too many cooks spoil the broth" predicts shorter reach just as readily, and since founders lay no ties, "no difference" is also sensible. There is no single sensible guess. Tag it null, or tag naive-right under the "too many cooks" reading, not naive-wrong.
- **C12** (Tasker drift, reach falls): the naive answer "reach increases" ignores the condition. Any question on C12 will say "in draughty galleries", and a draught suggests damage, so an outsider guesses "falls". Tag it naive-right when the condition is in the stem.
- **C15** (more keepers, higher hold): this follows from the definitions and is not an empirical direction anyone guesses at. Tag it null, or drop it from the directional count.
- **C16** (hold and survival): split it. The direction (higher hold survives better) is naive-right. The load-bearing part is "no level beyond which the advantage stops growing", and there the sensible guess (the advantage levels off at high hold) is wrong. Add a `shape` tag.
- **C3** (hold ignores where ties are): once a stem calls hold "a ratio for the whole lattice", ignoring location follows. Tag it guessable.
- **C5** (sheeted when reach > 2 × hold): the direction is guessable from the names and the membrane image (finding 2). Only the factor needs the passage. Tag it partly guessable.
- **C10** (Orrin effect only in still air): this can be reconstructed from the intuition that draughts disturb and erase the traces of founding. It can also be derived from C12: draughts wear reach down to the same level whatever the founding. Tag it guessable. A stem that states the Tasker drift gives C10 away.
- **C22** (Emmerick's proposal: the mean of the three longest chains): if the stem gives the objection ("the class depends on a single thread"), then "aggregate several chains" is the obvious fix. The *proposal* is guessable; *who* objected is not.
- **C21**: see finding 3.

After these corrections the naive-right share stays near 50%. By my count it is about 6 right to 6 wrong, with C16 split and C6 added. So the ratio is not where this passage fails. The passage-only group shrinks from 11 to about 5 genuinely unguessable claims: C2 (second half), C6 (the lamp reason), C11, C23 and the factor in C5. That still meets the minimum of four, but only just.

- **Severity:** important. The tags feed the floor.
- **Confidence:** medium on each individual tag; high that the passage-only group is overstated.

## 8. Matched pairs, and no `shape` tags

- **Where:** `passage.md`, "Where lattices are found and how they fail": C16 and C17 (survival rises with hold, and survival rises with height, one after the other, both emphatically without limit); C13 and C18 (both "middling", both peaked); the Orrin/Tasker conditions (still air only / draughty air only, mirror images). `claims.json` has no `shape` field.
- **Problem:** Current template item 7a forbids adjacent claims of the same shape. A stem that says "as with hold, survival rises with height..." gives away the other claim. Once a reader knows one Orrin/Tasker condition, the other follows.
- **Change:** Give C17 a different shape: for example, survival peaks at middle height because crown drip sours ties, and state it outright. Move C18 out of the section it shares with C13. Add `shape` to every quantity claim.
- **Severity:** minor. It matters only if the generator writes cross-referencing stems.
- **Confidence:** medium.

## 9. "Passes `bench-check`" overstates what was checked

- **Where:** `bench/README.md` entries table; `bench-check.json`; `scripts/pipeline.mjs` `stageBenchCheck`.
- **Problem:** The check sees only the heuristics the author chose to tag (finding 4's three are invisible). "The surprising answer is the right one" is tagged as the exact complement of `naive_is_right`, so its perfect 6/6 balance is guaranteed and is no separate evidence. The warning fires only at three or more uses, so the 1-and-1 heuristics ("insidious", "peaks at medium size") can never be flagged. `shape` is requested by the template but not read by the check.
- **Change:** Change the README status for b03 to "tags self-reported; under review". In `bench-check`, warn when a template heuristic is tagged fewer than twice in each direction, and check `shape` balance.
- **Severity:** minor.
- **Confidence:** high on what the code does.

---

## Leave alone

- **No framing leak in `passage.md` (question 6).** Nothing says the passage is invented or exists for measurement, and the `bench-check` pattern for such notices finds nothing. The "4.3" heading is fine. The domain is obviously not AI safety, but the template requires that.
- **The absolute truths:** C2 ("never"), C16 ("no level beyond which"), C17 ("every lower level"). These punish the heuristic that "absolute statements are wrong". Do not soften them into hedged claims.
- **The worked-example arithmetic:** 27 ÷ 9 = 3; twice that is 6; 7 > 6 gives sheeted; the rim trace's 5 gives corded; 26 ÷ 9 ≈ 2.9; after the break, "might be only 4" is below 5.8, so corded. All correct.
- **Tasker is both an objector and the name of a regularity.** This is a deliberate confusion, and the "two objectors" pair (Tasker vs Emmerick) is a genuine, well-stated discrimination. The discrimination pairs in general (question 7) are real distinctions the passage states. Their weakness is the names (finding 2), not the distinctions.
- **C13's clause "although the snails themselves are no less numerous".** It blocks the obvious mechanism ("fewer snails") for the drop in saturated galleries. Keep it.
- **C7 tagged naive-right** (span counts more reliable). That tag is honest.
- **C19 next to C20** (floods destroy whole lattices; souring breaks individual ties). The author flagged the adjacency. It is real content, not a heuristic, provided no single question pairs the two.
