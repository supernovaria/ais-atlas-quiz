# Fiction bench

Fabricated textbook passages, written once and reused, so the pipeline's
questions can be tested on content **no reader can know**. On real material a
blind reader's hit rate mixes two things — the question leaking, and the reader
already knowing the subject. Here the second is zero by construction, so every
hit above the floor is the question leaking.

How the bench is used is `docs/HANDOFF-ORCHESTRATOR.md` §9. This file records
what is in it.

## Layout of an entry

```
bench/<id>/
  passage.md            the section, and nothing else
  concept-map.json      from the real quiz-section-analyst (adopted once, with bench-map)
  ideas.json            the fixed list of ideas a bench iteration tests, so iterations are comparable
  private/              everything that describes the passage as invented, or how its claims "sound"
    passage-notes.md    the author's account: fabrication notice, discrimination pairs, honest weak points
    claims.json         every load-bearing claim, tagged — see below
    bench-check.json    the mechanical checks, from `pipeline.mjs bench-check --bench <id>`
    prompts/            every prompt rendered against this entry, with log.jsonl
    reviews/            reviewer findings on the passage
    reviews-decisions.md  the verdict on each finding, and why
    revision-log.md     what a revision changed, finding by finding
```

**The analyst and generator never read from `bench/`.** A bench iteration starts
with `pipeline.mjs bench-run`, which copies `passage.md` to
`runs/<label>/<slug>/section.md`; every later stage is pointed at that copy.
Until 2026-09-23 the meta-files sat beside `passage.md`, and each of them called
the passage invented (b02 review #3).

## Rules

- **Nothing in this directory is shown to the adversary** — no passage, notes,
  concept map, or path. It receives one shuffled question, pasted inline.
- **`passage.md` never says it is invented, or that it exists for measurement.**
  The analyst and generator read it as their prose, and on real sections they
  are never told they are being measured. That notice lives in
  `private/passage-notes.md` and here. (Review 2026-09-23 #11.)
- **Nothing under `private/` is named in any template**, and the analyse
  template tells the analyst not to open it. That is behavioural, not
  structural: the analyst has search tools, and this README and the handoff
  describe the bench openly. It is stated rather than assumed.
- **The invention itself cannot be hidden, only the purpose.** The `b02`
  analyst described its prose as "an invented domain" with no such word in it
  and without opening any other file. Its concept map carries that note to the
  generator; it is recorded as a caveat on `b02`, not edited out.
- **Disputed tags go the more guessable way.** Where an author and a reviewer
  disagree about what a sensible outsider would guess, the claim is tagged as
  guessable. A bench that overstates its own unguessability makes its floor
  look like leakage.
- **Truth must not correlate with how a claim sounds.** Every load-bearing claim
  is tagged in `private/claims.json` with the answer a sensible outsider would
  guess, whether that guess is right, and which generic heuristics it rewards or
  punishes. `bench-check` fails a passage where the sensible guess is right on
  under 30% or over 70% of directional claims, or where fewer than four claims
  have no sensible guess at all. The first bench passage had every one of its
  directional claims going against the sensible guess, which makes "pick the
  option that reverses the obvious" a reliable rule. (Review #2.)
- **A passage is fixed once it has results.** Rewriting one after seeing how the
  blind reader did means measuring your own editing. A flawed passage is retired
  and a new one added, never patched.
- **Each passage is reviewed before first use** (`prompts/review.md`, and
  `prompts/review-gemini.md` when available) for whether it is genuinely
  unguessable, internally consistent and not an analogy in disguise, and passes
  `bench-check`.

## Floors to compare against

| reference | hit rate |
|---|---|
| chance, four options | 25% |
| hand-authored fiction, no planted tell (`runs/tier4-control`, clean group) | 40% |

The 40% is the more honest comparator for any four-option question: a reader can
tell which option a textbook "would" call correct without knowing anything, and
that premium never goes away.

**Directional claims have their own, higher floor.** Most directional claims are
effectively binary — locals or strangers, rises or falls. A blind reader who
always picks the sensible option scores the passage's naive-right share on
them; one who always reverses it scores the rest. So an item built on a
directional claim is judged against **max(share, 1 − share)** — about 50% for a
balanced passage — and only passage-only items against 25% / 40%. Setting a
bench result against 40% without that split would read the floor as leakage
(b02 review #4). `ablate-score` does the split when the run has a `claim-map.json`
(`prompts/bench-claim-map.md`, then `pipeline.mjs claim-map`).

## Entries

| id | domain | status | results |
|---|---|---|---|
| `b02` | invented study of upland route-marker cairns as a two-register signal | **ready** — reviewed, revised twice, verified; tags self-reported. Naive right 19/28 (68%, one disputed tag from the cap); 5 passage-only | none yet |
| `b03` | invented ecology of thread lattices spun by a cave snail | **ready** — reviewed, revised twice, verified; tags self-reported. Naive right 16/28 (57%); 11 passage-only | none yet |
| `undercraft` | invented sociology of ensemble stage performance | **legacy reference** — fails `bench-check` (no claims file) | `runs/2026-09-20-FICTION` (75%, n = 8), `-FICTION-B` (stem rewrites: 15/15 → 14/15; options only: 4/6 across 4 questions) |

### `undercraft`, and why its results carry two caveats

It predates the rules above. Its author recorded, before any result, that its
projection/undercraft split is loosely evocative of the real
stage-presence/stagecraft distinction and that its troupe-size effect is an
inverse U — a shape a guesser can apply without reading anything (that question
was answered 3/3). Review #2 then showed all five of its directional claims go
against the sensible guess, which is the imbalance `bench-check` now forbids.

And the version the 2026-09-20 runs used **opened with a notice that it existed
to measure a test-wise reader's hit rate**. The analyst and generator read that.
It was removed on 2026-09-23; every other line is byte-identical, verified
mechanically, and the original is `private/passage.original.md`. So the
2026-09-20 figures were produced by a generator that knew it was being measured,
and later `undercraft` runs are not strictly comparable with them.

It stays on the bench because it is the only entry with manipulation-arm data.
