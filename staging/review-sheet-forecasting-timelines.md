# Review sheet — Forecasting Timelines

Run: `2026-09-18-P1/forecasting-timelines`. Budget halted this run after 6 of 11
candidates reached pass 2; every judged candidate came back `rewrite`, and the
6 accepted rewrites (suffixed `r`) are what this sheet evaluates. 5 candidates
(b02, c03, d01, d02, d03) were never judged — unjudged, not rejected.

**Target 4, shipping 3.** No L5 candidate exists anywhere in the pool; see the
under-fill note at the end before approving as-is.

---

## Q1 · L3 · targets FT-5 (threshold) · families a,b,c · bridge: none
lineage: sonnet/a03 → critic rewrite (fixed R5 source-attribution framing, R9
extremum overshoot, R14 word-match tell on "effective compute"/"compute", D12
self-refuting distractor)
measurements: ratio 1.06 · key not longest (max distractor 162 vs key 156) ·
absolutes 0/[0,0,0] · hedges 0/[0,0,0] · no stem-word singletons
adversary: 3/3 (flagged)
critic note: original a03 failed R5 (possessive-form attribution the regex
missed — "what does the section's decomposition show" — flagged as a checker
gap to patch), R9 (16-char extremum overshoot), R14 ("effective compute" as a
key-only echo), and D12 (a distractor that denied the stem's own premise). All
four are fixed in the rewrite; no reviewer_note truth concern.
curator: sole eligible FT-5 candidate. Builds directly on the RUBRIC §3.4 pair
named for this section ("effective compute vs. raw chip count" / FT-5 vs
FT-5b) — cleanest mechanics in the whole pool.
cover test (generator): "A reader who internalised that the three factors
multiply and move independently can produce the key with the options covered:
growth in one raises the total without the others."
cynic test (generator): "No option repeats a distinctive stem phrase
('effective compute' and 'compute' now appear in zero options; 'chip' appears
in all four), no option denies the stem's premise, and all four are
same-shaped declaratives, so the lead clauses carry no signal."

---

## Q2 · L3 · targets FT-2 (threshold) · families b,c,d · bridge: none
lineage: sonnet/a01 → critic rewrite (fixed R5 source-attribution framing,
R14 word-match tell on "beliefs", E3 positional distractor labels in a
shuffled UI)
measurements: ratio 1.04 · key longest by 2 (150 vs next-highest 148) ·
absolutes 0/[0,0,0] · hedges 0/[0,0,0] · one residual stem-word singleton
("number") lands in distractor 4, not the key — noted, not blocking
adversary: 1/3 (not flagged)
critic note: original a01 opened with "The section describes a worked
example...", firing R5's attribution-verb pattern, and separately let stem
words ("beliefs", "example", "chapter", "rates") mark the key and the first
distractor by exact overlap; the explanation also named distractors by
ordinal ("Distractor 1/2/3"), which is meaningless once the app shuffles.
The rewrite moves the scenario onto a reading-group member's announcement,
removes the section-narration framing, and names distractors by content
instead of position. No reviewer_note truth concern, but the critic asked us
to judge whether the fix is enough to keep this above recall (see below).
curator: sole eligible FT-2 candidate — b01r also targets FT-2 (paired with
FT-4) but is rejected for an unresolved R14 tell; c03 targets FT-2 too but was
never judged.
cover test (generator): "A reader who grasped that forecasts here are
scenarios for checking belief-coherence rather than predictions can state the
key before seeing the options; the stem no longer narrates that framing back
to them."
cynic test (generator): "No option repeats a distinctive stem word that the
others lack ('beliefs' sits in the key and the first distractor, 'date' in
two distractors, 'combined' in the key and one distractor); no figure appears
in any option, so there is nothing to Ctrl-F and no length or hedge asymmetry
to read off."
reviewer flag: the critic's own reviewer_note on the pre-rewrite version
raised a leveling question rather than a truth concern — "the key still
restates one sentence of the prose almost directly... judge whether that is
enough to keep this above a recall item" — worth a quick second read given
the rewrite changed the framing device but kept the key's core sentence.

---

## Q3 · L4 · targets FT-6 · families a,b,c · bridge: none
lineage: sonnet/c01 → critic rewrite (fixed D1 — two distractors were too
close to defensible readings of the text to count as misreadings — and fixed
an L3-giving-away-the-answer stem that stated the independence premise
outright)
measurements: ratio 1.05 · key longest by 4 (131 vs next-highest 127) ·
absolutes 0/[0,0,0] · hedges 0/[0,0,0] · stem-word singletons "turns" and
"whether" land in the key, "text" and "model" land in distractors — treated
as generic connective/verb overlap rather than a distinctive-content-word
R14 tell (compare Q1/Q2's more clearly domain-specific echoes, which were
real fails); flagging the distinction here for a second opinion
adversary: 3/3 (flagged)
critic note: original c01 was scored L2 despite an L4 claim, because the stem
told the reader outright that "the lab hasn't touched multimodal data or
task-based self-play, and nothing about the failure affects either" —
deriving the key needed no section knowledge at all. Two distractors also
failed D1: their provenance lines claimed a "misreading" of text that in fact
supports the distractor's claim fairly closely. The rewrite removes the
giveaway clause and rebuilds both distractors around genuine conflations
(synthetic vs. self-play as "the same machine-generated mechanism"; images/
video as the only remaining source). The critic's reviewer_note is a tooling
note (the hedge-word checklist missed "not necessarily"), not a truth concern.
curator: sole eligible FT-6 candidate; d03 targets the same idea but was
never judged before the budget halt.
cover test (generator): "Yes — a reader who held the Training Data subsection
could say unaided that a synthetic-data failure settles little, because two
other routes with different sources remain and the text makes the outcome
depend on how well they work. The stem no longer names those routes or
asserts that they are unaffected, so producing the key requires the section."
cynic test (generator): "The key is still the least committal option, which
is the residual tell; it is blunted by the fourth option, which also leaves
the outcome open ('caps scaling at whatever images and video can add'), and
by the fact that 'the other routes' is meaningless to a reader who does not
know there are three."

---

## Section summary

**Distribution:** L2 0 (0%) · L3 2 (67%) · L4 1 (33%) · L5 0 (0%), against
shipped_n 3.

- L2 ≤20%: met (0%).
- L3 ≥30% hard bound: met (67%).
- L4+L5 ≥25% hard bound: met (33%).
- **L5 ≥1, always: NOT MET.** No L5 candidate exists in this section's
  11-candidate pool. This is a named, deliberate hard-bound violation, not an
  oversight — see under-fill note below.

**Coverage:** FT-2, FT-5, FT-6 covered (both threshold ideas — FT-2, FT-5 —
among them). FT-4 and FT-1 earn a question but are not shipped; both have
clean, eligible siblings ready (a02r, c02r) held back only by set-level
constraints (see `curator.json`). FT-3 and FT-5b were deliberately not tested,
per the concept map, as reserved setup for later material and a designed
distractor respectively.

**Takeaway check:** the section's stated takeaway has two halves —
forecasts-as-consistency-checks, and effective compute as independently-
multiplying factors. Q2 tests the first half directly; Q1 tests the second.
Q3 tests a structurally parallel idea (independence of the data wall's escape
routes) rather than the takeaway's own two claims, but it does not compete
with or dilute them. The shipped set tests the section's actual point, not
just its perimeter.

**Option-count distribution:** 3/3 questions at 4 options (100%). No
`option_count_reason` entries needed.

**Diversity:**
- Families: {a, b, c, d} all represented across the 3 questions — meets the
  ≥3-family target.
- Lenses: only 2 distinct (misconception ×2, case ×1) — short of the ≥3
  target. Not a selection failure: every `contrast`-lens candidate (b01, b02)
  is rejected or unjudged, and every `figure`-lens candidate (d01–d03) is
  unjudged. Fixing this means judging the remaining shards, not reselecting.
- `stem_format`: mechanism (Q1), claim-evaluation (Q2), mechanism (Q3) — 2 of
  3 share a format but they are not adjacent, satisfying the no-two-adjacent
  rule; ordering was chosen specifically to satisfy this (source-order would
  have put both `mechanism` questions adjacent).
- Key position: all 3 shipped keys sit at index 0 (position A) in the source
  data. The app shuffles by default, so no live-reader exposure follows from
  this, but it's a concentration worth watching if it recurs in other
  sections' staged sets.

**Under-fill reason:** target_n is 4; shipping 3. The fourth (L5) slot is
left empty rather than filled by promoting the next-best L4 candidate
(a02r, FT-4), per this brief's instruction not to promote a level to satisfy
a hard bound it doesn't meet. The one candidate that reached for L5 in this
run (sonnet/b01, generator-claimed L5, critic-assessed L4) has a rewrite
(b01r) that fixed its D8 and E4 failures but still fails R14: the stem's
distinctive word "uncertainty" appears in exactly one option, the key. That
candidate is in `rejected_from_pool` with a `needs edit` reason rather than
shipped or held as a sibling, since editing text is out of scope for this
role. Recommend either a small text fix to b01r's key/option-1 pairing, or a
fresh L5 generation pass seeded on the concept map's own suggestion for FT-2
(hand the reader a claim in the wild and ask which objection the section's
framing supports) — both are faster than waiting on the 5 unjudged shards,
none of which claims L5 either.
