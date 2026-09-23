Model: claude-opus-5-5

# Verification review of the b03 revision

Checked `passage.md`, `private/claims.json` (C1–C39), `private/passage-notes.md`, `private/bench-check.json`, `private/revision-log.md` against `private/reviews-decisions.md` and `private/reviews/opus.md`, with `prompts/bench-author.md` as the standard. Claim ids are the new ones.

## Row-by-row: were the accepted findings addressed?

| # | verdict | evidence |
|---|---|---|
| 1 Keeping phase vs Tasker | **addressed** | "They begin laying wennets as soon as the first tharls are anchored, so most of a lattice's wennets are laid before its last tharl is in place"; "both rise while a lattice's tharls are still being anchored, and nearly all of a lattice's pell is laid in that period"; Tasker's ground is now anchoring speed, and Orrin matches on "the same number of seasons". The Tasker pattern ("cant barely changes", pell level in still galleries) reads consistently with this. One small new gap: see finding 4. |
| 2 Names give distinctions away | **addressed**, small residue | span/tie, founder/keeper, hold/reach, sheeted/corded, centre/rim, souring/fraying, effect/drift all replaced; both regularities are now "pattern"; the notes record what each name gives away. Residue: finding 6. |
| 3 Rope-failure diagnostic | **partly** | "Brittle" is gone and the snap/brush diagnostic is gone. The decision asked for "a diagnostic with no physical basis". The replacement ("tamber parts close to one of its fastenings … pilse parts near its middle") still has one: wear happens where traffic crosses, and degraded material fails at joints. The author saw this and tagged C34 guessable and naive-right, so the tag is honest. The bench has swapped one physics-derived claim for another, now correctly labelled. Acceptable. No change needed unless a passage-only diagnostic is wanted. |
| 4 Untagged reliable heuristics | **addressed** | Emmerick's objection carried into practice ("Since the 1970s most surveys have assigned the class from Emmerick's mean", C39) and so is Aske's (C12). One-thing pairs: the spur (C3) and slackening (C23). Beginner right: C2, C3. Each heuristic is tagged 2 each way in `bench-check.json`. Tag problems in finding 1. |
| 5 Headline claims all naive-wrong | **addressed** (prose part) | The Orrin pattern (C18) and the Tasker pattern (C22) are naive-right under the tie-break, and each carries an argued exchange. The floor change is code and was not checked here. |
| 6 Centre trace / revisiting | **addressed** | "The tessel trace finds the longest chain that passes through the wennet nearest the middle"; "never passing through any wennet twice"; the example chain "passes through the wennet nearest the lattice's centre". I rechecked the arithmetic after the revision: 27/9 = 3; 7 > 6 gives ostral; fenn 5 < 6 gives calvine; "every chain … longer than 4 … passes through its centre wennet" fits the fenn trace's 5-chain, the post-break 4, and disjoint chains 7/4/3 (mean 4.7 < 6). |
| 7 Tag corrections | **addressed** | Every listed tag was retagged or its claim changed, as the log says. Changing the condition to "colder galleries" (C19) removes both reasoning paths the review named. |
| 8 Matched pairs, `shape` | **addressed** | Height now falls (C31) while cant rises (C29). Resting snails (C11) and damp (C26) are in different sections. The Orrin/Tasker conditions are on different axes. Every quantity claim has a `shape`. |
| 9 Bench-check overstates | **addressed** | The README reads "under revision after review — tags self-reported". `bench-check.json` shows the five thin-heuristic warnings, and the notes explain each. |

## Findings

### 1. C13 and C25 are tagged passage-only, but each carries a heuristic that predicts it, and C13 is the template's own named example of common sense

- **Where:** `claims.json` C13 (the lamp reason for counting wennets first: `passage_only: true`, `heuristics_right: ["the option with the most sensible causal story is right"]`); C25 (Orrin compares how lattices were begun, Tasker follows single lattices through time: `passage_only: true`, `heuristics_right: ["two things that seem alike are actually different"]`). `prompts/bench-author.md` item 5 lists "Record the evidence before you disturb it" as common sense, not a passage-only fact.
- **Problem:** Each tag contradicts itself. If a listed heuristic predicts the answer, a blind reader can get it, so the claim is not passage-only. C13 is the clearest case. Once a stem says the order was reversed so that wennets are counted first, the class of reason ("tracing the tharls disturbs the wennets") follows from "record the evidence before you disturb it". Only the specific mechanism (lamp warmth) needs the passage. Against distractors such as "wennets are more numerous" or "Varrenby's order was arbitrary", the disturbance option is the recognisable key. C25 is the reviewer's original finding 4 in miniature: "they are different findings, one across lattices, one through time" is the test-wise answer.
- **Why it matters:** The passage-only group is the bench's main instrument. If a blind reader answers a C13 question correctly, the result is recorded as pipeline leakage when it is common sense.
- **Change:** Under the tie-break, set C13 to `passage_only: false`, `naive_answer: "Tracing the tharls disturbs the wennets, so they are counted first"`, `naive_is_right: true`. Set C25 to `passage_only: false` with a naive answer of "they are distinct findings", right. The passage-only count falls from 13 to 11, still well above four. Recheck the heuristic balance afterwards: "causal story" goes to 3 right / 2 wrong, and "alike are different" to 3 right / 2 wrong. That is tolerable, or offset it with one tag elsewhere.
- **Severity:** important.
- **Confidence:** high on C13, which the template itself names; medium on C25. A stem that gives only the two names, with no description, keeps C25 unguessable.

### 2. C39 is a disputed tag and went the less guessable way

- **Where:** `claims.json` C39 (Emmerick's rule adopted: naive "Varrenby's rule stayed standard", `naive_is_right: false`).
- **Problem:** The passage sets up Emmerick's proposal with a worked demonstration of the flaw ("The example also shows the ground of Joost Emmerick's objection"). After that, "the better-argued fix was adopted" is at least as sensible an outsider guess as "the old rule stayed". There is no single sensible guess, and under the tie-break a disputed tag goes the guessable way. The decisions file applied this to the Orrin pattern (C18).
- **Why it matters:** If C39 is really naive-right, the directional split is 14/12, not 13/13. The claim-map floor for any item set that includes C39 is then understated.
- **Change:** Retag C39 `naive_is_right: true`, with naive answer "the more robust rule was adopted". Alternatively, set it null and drop it from the directional count. Keep the "objection noted" heuristic tag as it is, since that heuristic is wrong here either way.
- **Severity:** minor.
- **Confidence:** medium. A blind-reader result on a C39 item well below 50% would change my mind.

### 3. Carrying Emmerick into practice leaves the Sellen lattice with two defensible classes

- **Where:** `passage.md`, "Cant and pell" ("a lattice is ostral when its pell is more than twice its cant, and calvine otherwise"); worked example ("by Varrenby's rule the Sellen lattice is ostral"; later, Emmerick's mean "makes it calvine"; "Since the 1970s most surveys have assigned the class from Emmerick's mean").
- **Problem:** This follows from the finding-4 change. The classification rule is stated as a definition, and the passage only later says current practice uses a different one. The prose attributes each result ("by Varrenby's rule", "Emmerick's mean"), but the passage never states which class the Sellen lattice has today.
- **Why it matters:** Suppose a generator writes "How is the Sellen lattice classified?" or "A lattice is ostral when…". Both "ostral" and "calvine", or both the single-chain rule and the three-chain mean, are then defensible keys. The critic is dropped from calibration runs, so nothing downstream catches it, and the item-6 failure (two keys, a spuriously low score) follows.
- **Change:** In "Cant and pell", write "by Varrenby's rule, a lattice is ostral when…". At the end of the last paragraph add: "Under current practice, then, the Sellen lattice is calvine." Update the C10 claim text to say "by Varrenby's rule".
- **Severity:** minor.
- **Confidence:** medium. The attribution is already present, so a careful generator may specify the rule unprompted.

### 4. The Tasker mechanism no longer says why draught matters

- **Where:** `passage.md`, the Tasker paragraph ("the air stretches nothing. Orras go on laying wennets and old wennets are lost at about the same rate, but the new wennets run more often from tharl to tharl…"; "In still galleries, pell after anchoring stays roughly level").
- **Problem:** The mechanism is stated without a condition, yet the effect occurs only in draughty galleries. A careful reader asking "why does pell fall in draughty but not still galleries?" finds nothing. The passage has also just said the air does nothing.
- **Why it matters:** A question on why the Tasker pattern is confined to draughty galleries has no inferable key. A careful reader may choose a distractor that blames the air, and that choice is defensible.
- **Change:** Add one clause that ties the replacement to the condition without making the air stretch anything. For example, "in draughty galleries more old wennets are lost each season, and the orras replace them"; or say outright that "why the replacement runs this way only where the air moves is not known".
- **Severity:** minor.
- **Confidence:** medium.

### 5. The wennet definition excludes the spur the passage says is a wennet

- **Where:** `passage.md`, "A **wennet** runs from one thread to another"; then, "A spur is simply a wennet whose two ends happen to lie on the same thread" (C3).
- **Problem:** Read literally, "from one thread to another" excludes a thread with both ends on one tharl. That was the older surveys' position, which C3 says was wrong.
- **Why it matters:** A careful reader can dispute C3's key by pointing to the definition.
- **Change:** Replace it with: "A **wennet** is fastened only to other threads, at both ends, and at no point touches the rock."
- **Severity:** minor.
- **Confidence:** high that the wording conflicts; low that the generator will exploit it.

### 6. Residual name leaks the notes do not record

- **Where:** `passage.md` names; `passage-notes.md` ("Neither name has an English meaning").
- **Problem:**
  - "Orrin pattern" is nearly a homograph of "orra". It points the wrong way (the pattern concerns vesks, not orras), which is allowed, but it is undocumented.
  - "Slackening" is Varrenby's name for a process of *stretching*. The verb "slackens" is also used, literally, for the lamp effect. That invites conflating the two passages.
  - "Pilse" resembles "pilling", which is wear by friction. The definition sits beside it, so the leak matters little.
  - "Calvine" echoes Latin *calvus*, bald, which would point to the sparser, short-chain class. This one is weak.
- **Why it matters:** Mostly bookkeeping. The Orrin/orra and slackens/slackening pairs are the ones a generator is likely to use as lures, or to trip on.
- **Change:** Record all four in `passage-notes.md`. Optionally, replace the lamp sentence's "slackens" with "softens".
- **Severity:** minor.
- **Confidence:** low on pilse and calvine; medium on the other two.

## Leave alone

- **C34 tagged guessable and naive-right.** This is the honest outcome of finding 3. Do not re-tag it passage-only without replacing the diagnostic.
- **"The surprising answer" still lines up with `naive_is_right` wherever it is tagged.** That follows from what the heuristic means. It is a subset of the claims, not the complement, so it is not a defect.
- **The "only in X; in Y none" form of both regularities.** The two conditions are on different axes (temperature, air movement), so neither gives the other away.
- **Tasker as both objector and pattern name**, and the redundant "concerns change over time" sentence. The first is deliberate; the second is harmless.
- **The five `bench-check` warnings.** Each is explained in the notes. Forcing a third size-shaped claim to fix "peaks at a medium size" would recreate a matched pair.

## Ready for first use?

**Ready with caveats.** Retag C13 and C25, and preferably C39 (findings 1 and 2), before the claim-map step, because those tags set the floor. Findings 3–6 are one-line prose or notes edits and can be done in the same pass. Nothing here is blocking.
