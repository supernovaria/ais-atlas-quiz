Model: claude-opus-5-5

# Verification review of the b02 revision

Files read: `bench/b02/passage.md`, `private/claims.json`, `private/passage-notes.md`, `private/reviews-decisions.md`, `private/revision-log.md`, `private/reviews/opus.md`, `private/bench-check.json`, `prompts/bench-author.md`. I also looked at `private/prompts/bench-revise.txt` and grepped `scripts/pipeline.mjs` to check rows 3 and 4.

## Row-by-row check of `reviews-decisions.md`

| # | status | evidence |
|---|---|---|
| 1 | **addressed** | P1, P3, P4, P8 and P9 are retagged directional and naive-right. P5 is split into P5a (guessable) and P5b ("Cant is then measured course by course from the crown downward", passage-only). The share is rebalanced in the prose (C19, C18, C12, and C4 flipped): `bench-check` gives 17/26 = 65%, five passage-only claims, no fails. `bench-author.md` item 5 now carries the "stays unguessable after a question has posed it" test. |
| 2 | **addressed, but see finding 1** | The frame is tagged (4 right, 2 wrong). C4 ("The Tessaly effect is a sound habit rather than a costly one") and C19 ("they read low-concord cairns slightly better") go against it. The named-effect heuristic is on the author list. The Ruskin/Morris echo is in the notes. |
| 3 | **addressed** | `bench/b02/` now holds only `passage.md` and `private/`. `pipeline.mjs` has `bench-run`, which copies the passage to a neutral `section.md`. The residual risk is stated in the decisions file. |
| 4 | **addressed (in the script, not the passage)** | `ablate-score` compares directional items with `max(share, 1 − share)` over the items asked, using `claim-map.json`. |
| 5 | **addressed** | C3 is naive-right: "Experienced locals keep to the builder's permanent courses out of habit." |
| 6 | **addressed** | "More is better" is off C11 and C12. Every claim has a `shape`, and no shape holds more than a third (2/2/1/1 of 6). C7 is now rising, sits in "Two registers" away from C6, and "behaves in the same way" is gone. |
| 7 | **addressed** | Refuted mechanism: C12 ("It might be expected to be rarer … Orne found it just as common"). Objection carried into practice: C18 ("Her objection carried."). Both are tagged. Majority stays 1/0, and the notes say why. |
| 8 | **addressed** | "Cant is the deliberate offset of a single course, a body course or the crown, relative to the course beneath it." |
| 9 | **addressed** | All the descriptive names are replaced with neutral ones (dorran/lisk, pell, Hessle/Garth, hob, Tessaly/Orne effect). The notes record what each name leaks, and pair 5 is dropped. |
| 10 | **addressed, with one new slip (finding 4)** | "false pell stones … misleads only when it sits downslope". "Across all walkers". "Pairs that include an uncanted course are left out of the count". "it was in fact passable in 52 of the 71 cases". "back on the upslope side". |
| 11 | **addressed** | C2 has one naive answer and the "prediction refuted" tag. C9 is noted as split. C14 and C15 are added. |

I checked the worked example against the renamed definitions. The Tessaly index gives 2/4 = 0.5 and Marhaug's gives 3/5 = 0.6. Course 3 fits the hob definition, and a downslope stone means the ford is high. All of it is right.

---

## 1. The fix for the expertise frame tipped its mirror image, "experts beat beginners", to 3 right and 1 wrong. The claims file does not tag it.

- **Where.** `claims.json` C4, C11, C19 and C5. `bench-author.md` item 4 now lists "experts beat beginners" and "two things that seem alike are actually different", and asks for every heuristic to be tagged at least twice each way. No b02 claim carries either tag.
- **Problem.** The revision made C4 (the locals' habit is sound) and C19 (locals do better on low-concord cairns) go against "experts are stuck in their habits". Both now go *with* the plainer heuristic "experts beat beginners", as C11 already did (4% against 19%). The only claim against it is C5 (lean misleads experts more). That is 3 right and 1 wrong, and `bench-check` cannot see it because nothing is tagged. Separately, all four discrimination pairs turn out to be different things. Nothing seemingly distinct turns out to be one thing, so "they are actually different" is always right.
- **Why it matters.** Take a question on C4 ("In the 71 conflicts, what did Tessaly find at the ford?") or on C19 ("How do locals fare on low-concord cairns?"). A blind reader who simply backs the locals gets it right. The claim-map floor is `max(share, 1 − share)` over naive guesses only, so it does not account for a heuristic that is lopsided on its own.
- **Change.** Tag both heuristics in `claims.json`, re-run `bench-check`, and record the imbalance in `passage-notes.md`. At 1794 words there is little room for new prose. If a claim is to change, the cheapest candidate is C19's "slightly better", which could become "no better" (then the heuristic is 2 right, 2 wrong).
- **Timing, not blame.** The log shows the revise prompt written at 15:03, while `bench-author.md` gained these two heuristics at 15:08. The author may never have seen them.
- **Severity.** Important.
- **Confidence.** Medium-high on the count. Medium that the blind reader actually uses "back the expert". Running the recall probe on a neutral C4 stem would settle it.

## 2. C7 should be tagged naive-right. With it, b02 is one disputed tag away from the 70% cap.

- **Where.** `claims.json` C7 ("the heavier the pell stone, the more faithful its record"): `naive_is_right: false`, with "the option with the most sensible causal story is right" in `heuristics_wrong`.
- **Problem.** C7 is now rising, and its stated mechanism is "light ones are knocked about by sheep". That is the physical intuition `bench-author.md` item 2 counts as knowledge: heavy things stay put. The tie-break then says tag it guessable. The true answer also comes with the most sensible causal story, so that heuristic belongs in `heuristics_right`, not `heuristics_wrong`.
- **Why it matters.** With C7 retagged, naive-right becomes 18/26 = 69%, inside the band by one claim. C4 is the next disputed tag (see Leave alone). If it also flips, the share is 19/26 = 73% and b02 fails. The causal-story heuristic goes from 9/5 to 10/4, which is already the least balanced in the file.
- **Change.** Set C7 to `naive_is_right: true` with the naive answer "Heavier stones are knocked about less, so they record more faithfully". Move "sensible causal story" to `heuristics_right` and "more is better" stays right. Re-run `bench-check`, and note the margin in `passage-notes.md`.
- **Severity.** Important.
- **Confidence.** Medium. An outsider might equally reason that "very heavy stones go unturned". The recall probe on "How does a marker stone's weight affect how faithfully it records conditions?" would settle it.

## 3. P2 carries the named-effect tag, and it is the wrong way for half of P2

- **Where.** `claims.json` P2, where `heuristics_right` is "an effect named after a researcher describes a mistake".
- **Problem.** P2 contrasts the Tessaly effect, which is sound, with the Orne effect, which is a mistake. So the heuristic is right on one half and wrong on the other. Orne's mistake is already counted in C9. The notes' 2/2 balance therefore partly double-counts.
- **Change.** Drop the tag from P2. The honest count is then about 1 right (C9) and 2 wrong (C4, C19). Either note that, or leave it; it is thin either way.
- **Severity.** Minor.
- **Confidence.** Medium.

## 4. The restored pell stone "reports a low ford whatever the water", but the next passer turns it

- **Where.** `passage.md`, "Restoration": "they set the pell stone back on the upslope side, where it reports a low ford whatever the water."
- **Problem.** The passage's own convention has every passer who knows it turn the stone after crossing. So an upslope reset is wrong only until the next knowledgeable passer, or indefinitely on a quiet route. "Whatever the water" overstates this.
- **Why it matters.** A question keyed on "a restored cairn's pell stone always reports a low ford" can be fairly disputed by a careful reader.
- **Change.** "…where it reports a low ford until the next passer turns it."
- **Severity.** Minor.
- **Confidence.** High that the tension is there. Low that a question lands on it.

## 5. Two small definition edges created by the crown fix (low confidence)

- **Where.** `passage.md`: "A Garth cairn has a pell stone but no deliberate cant in its body courses". Also C19 read against the "Lean and cant" paragraph.
- **Problem.**
  - Now that the crown can carry cant, a Garth cairn with a canted crown would have a dorran sense on Marhaug's reading. The passage never says whether that is possible.
  - Locals are said to judge "by eye against the vertical" and not course against course. Yet C19 has them extracting information from a single reversed course. A zig in the silhouette reconciles the two, but the passage does not say so.
- **Change.** Optional. "…no deliberate cant in its body courses or crown" would close the first. Leave the second unless a critic flags it.
- **Severity.** Minor.
- **Confidence.** Low. Neither is likely to be the subject of a question.

---

## Leave alone

- **C4's tag.** Would an outsider guess the locals' habit is costly or sound? It is genuinely split. The "stuck in their habits" frame says costly; "experts beat beginners" says sound. I would not flip it. But it is the tag that decides whether b02 stays under 70% once C7 is fixed (finding 2).
- **The worked example.** 0.5 on the current index and 0.6 on Marhaug's; the reading is a hob with the route turning east and the ford high. It is correct as written.
- **"Majority rules" at 1/0.** The notes explain why it cannot be balanced without breaking the hob rule. Accept the warning.
- **The name leak between Tessaly's and Marhaug's indexes, and the Tessaly-effect population leak.** Both are stated honestly in the notes and are residual. Do not rename further.
- **The "sound habit" sentence in C4.** It states the outcome outright, which is what makes C4 answerable. Keep it.
- **C11 being trivial, and "the surprising answer" being the exact complement of the naive guess.** Both were settled in the first review.

## Ready for first use?

**Ready, with caveats.** Before the first run, retag C7 (finding 2) and tag "experts beat beginners" and "two things that seem alike are actually different" (finding 1), then re-run `bench-check`. Record in the notes that b02 sits at 69%, one disputed tag from the cap, and that "experts beat beginners" is 3 right and 1 wrong. Neither caveat needs a structural change to the passage.
