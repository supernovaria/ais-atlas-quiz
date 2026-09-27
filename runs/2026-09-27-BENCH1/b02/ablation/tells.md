# Tells — 2026-09-27-BENCH1/b02

Explain-mode replies are for diagnosis. They are not the score, and their hit rates are not comparable with the letter rungs.

176 replies from 4 voice(s) in 3 famil(ies); 10 unusable. 2550 cue tags in the pooled tables; `other` 0%, `no-tell` 0%. Stem-echo tags on the options-only rung, where no stem was shown (claims that cannot be true): 153.

Calls with no scorable reply (not counted anywhere above or below): ministral-8b: truncated 1.

**How to read the tables.** *Follow → key* is the hit rate of a reader who used only this cue and picked among the options carrying it. *Follow → away* is the same for a reader who avoided those options. Compare both with *chance*. Each is averaged per question and then over questions, with a bootstrap interval over questions. *Lift among not-picked* compares key and distractor rates only among options the reader did NOT pick. A cue the reader cites just to justify its own pick shows a high *on picked* rate and a lift near 1 here. A real tell still leans toward the key. `position` is a placebo: options are shuffled, so it should sit at chance with a lift near 1.

## full-explain

83 key ratings, 243 distractor ratings.

| code | follow → key (CI) | follow → away (CI) | chance | q | on picked / not picked | lift | lift among not-picked | by family (→ key) |
|---|---|---|---|---|---|---|---|---|
| `most-detailed` | 81% (71%–91%) | 4% (1%–8%) | 25% | 16 | 75% / 7% | 10.08 | 3.67 | google 94%, openai 77%, mistral 82% |
| `longest` | 75% (50%–94%) | 8% (2%–17%) | 25% | 8 | 8% / 2% | 7.81 | 9.79 | google 100%, openai 100%, mistral 38% |
| `general-knowledge` | 65% (54%–75%) | 3% (0%–7%) | 25% | 15 | 59% / 25% | 2.44 | 3.81 | openai 83%, mistral 64% |
| `textbook-voice` | 57% (43%–70%) | 11% (6%–17%) | 25% | 16 | 57% / 16% | 3.29 | 0.79 | google 85%, openai 79%, mistral 40% |
| `group:dismissible` | 5% (0%–12%) | 55% (45%–64%) | 25% | 16 | 7% / 70% | 0.18 | 0.90 | google 5%, openai 7%, mistral 6% |
| `group:qualified` | 53% (45%–61%) | 6% (2%–11%) | 25% | 16 | 89% / 34% | 2.48 | 1.88 | google 80%, openai 77%, mistral 40% |
| `other` | 50% (0%–100%) | 17% (0%–33%) | 25% | 2 | 1% / 0% | 2.93 | 0.00 | openai 0%, mistral 100% |
| `nuanced-turn` | 46% (28%–66%) | 16% (9%–23%) | 25% | 15 | 42% / 12% | 3.32 | 4.70 | google 100%, openai 100%, mistral 43% |
| `echoes-stem` | 44% (35%–54%) | 9% (4%–14%) | 25% | 16 | 81% / 37% | 2.01 | 1.37 | google 56%, openai 45%, mistral 42% |
| `absolute` | 9% (0%–19%) | 41% (34%–48%) | 25% | 16 | 7% / 51% | 0.24 | 1.22 | google 13%, openai 8%, mistral 8% |
| `grammatical-fit` | 39% (26%–52%) | 19% (12%–28%) | 25% | 16 | 39% / 20% | 1.82 | 1.25 | google 100%, openai 75%, mistral 31% |
| `off-target` | 0% (0%–0%) | 37% (34%–42%) | 25% | 15 | 0% / 22% | 0.00 | 0.00 | google 0%, openai 0%, mistral 0% |
| `denies-question` | 0% (0%–0%) | 36% (34%–39%) | 25% | 16 | 0% / 26% | 0.00 | 0.00 | google 0%, openai 0%, mistral 0% |
| `too-obvious` | 0% (0%–0%) | 35% (33%–37%) | 25% | 14 | 0% / 19% | 0.00 | 0.00 | google 0%, openai 0%, mistral 0% |
| `implausible` | 0% (0%–0%) | 34% (33%–35%) | 25% | 12 | 0% / 12% | 0.00 | 0.00 | google 0%, openai 0%, mistral 0% |
| `shortest` | 0% (0%–0%) | 33% (33%–33%) | 25% | 5 | 0% / 4% | 0.00 | 0.00 | mistral 0% |
| `like-the-others` | 0% (0%–0%) | 33% (33%–33%) | 25% | 13 | 0% / 13% | 0.00 | 0.00 | google 0%, openai 0%, mistral 0% |
| `hedged` | 13% (0%–33%) | 30% (24%–36%) | 25% | 15 | 5% / 13% | 0.37 | 0.95 | google 0%, openai 100%, mistral 13% |
| `middle-ground` | 29% (13%–48%) | 23% (16%–28%) | 25% | 15 | 18% / 9% | 1.65 | 0.00 | google 0%, mistral 29% |
| `odd-one-out` | 16% (6%–26%) | 29% (25%–32%) | 25% | 15 | 8% / 17% | 0.50 | 0.73 | google 0%, mistral 18% |
| `opposites` | 23% (10%–38%) | 28% (21%–35%) | 25% | 16 | 20% / 25% | 0.94 | 1.52 | google 25%, openai 12%, mistral 29% |
| `surprising` | 19% (8%–32%) | 26% (21%–30%) | 25% | 15 | 18% / 18% | 1.09 | 2.15 | google 60%, openai 38%, mistral 9% |
| `position` | 26% (9%–45%) | 25% (18%–30%) | 25% | 11 | 11% / 9% | 1.15 | 1.34 | openai 50%, mistral 27% |

## options-only-explain

83 key ratings, 247 distractor ratings.

| code | follow → key (CI) | follow → away (CI) | chance | q | on picked / not picked | lift | lift among not-picked | by family (→ key) |
|---|---|---|---|---|---|---|---|---|
| `other` | 100% (n<2) | 0% (n<2) | 25% | 1 | 1% / 0% | ∞ | — | mistral 100% |
| `most-detailed` | 72% (60%–84%) | 7% (3%–12%) | 25% | 16 | 80% / 11% | 6.05 | 3.00 | google 88%, openai 80%, mistral 67% |
| `group:qualified` | 49% (42%–56%) | 7% (2%–12%) | 25% | 16 | 94% / 38% | 2.11 | 1.24 | google 75%, openai 76%, mistral 39% |
| `textbook-voice` | 48% (34%–63%) | 16% (10%–22%) | 25% | 16 | 48% / 16% | 2.25 | 0.00 | google 79%, openai 80%, mistral 30% |
| `nuanced-turn` | 46% (30%–63%) | 16% (10%–22%) | 25% | 16 | 52% / 14% | 3.05 | 1.74 | google 63%, openai 81%, mistral 43% |
| `group:dismissible` | 7% (2%–13%) | 46% (38%–53%) | 25% | 16 | 7% / 63% | 0.28 | 1.11 | google 7%, openai 4%, mistral 9% |
| `general-knowledge` | 46% (33%–58%) | 11% (4%–21%) | 25% | 16 | 63% / 38% | 1.63 | 1.66 | openai 100%, mistral 41% |
| `longest` | 42% (20%–64%) | 19% (12%–27%) | 25% | 14 | 12% / 6% | 2.13 | 0.00 | google 100%, openai 50%, mistral 25% |
| `absolute` | 9% (3%–17%) | 37% (31%–44%) | 25% | 16 | 7% / 51% | 0.36 | 1.40 | google 14%, openai 8%, mistral 9% |
| `too-obvious` | 0% (0%–0%) | 37% (34%–40%) | 25% | 15 | 0% / 15% | 0.00 | 0.00 | google 0%, openai 0%, mistral 0% |
| `denies-question` | 0% (0%–0%) | 36% (34%–38%) | 25% | 15 | 1% / 22% | 0.00 | 0.00 | google 0%, openai 0%, mistral 0% |
| `implausible` | 0% (0%–0%) | 36% (33%–38%) | 25% | 14 | 0% / 13% | 0.00 | 0.00 | openai 0%, mistral 0% |
| `shortest` | 0% (0%–0%) | 33% (33%–33%) | 25% | 9 | 0% / 6% | 0.00 | 0.00 | google 0%, mistral 0% |
| `off-target` | 0% (0%–0%) | 33% (33%–33%) | 25% | 12 | 0% / 11% | 0.00 | 0.00 | openai 0%, mistral 0% |
| `no-tell` | 0% (0%–0%) | 33% (33%–33%) | 25% | 2 | 0% / 1% | 0.00 | 0.00 | google 0% |
| `surprising` | 33% (18%–48%) | 23% (17%–29%) | 25% | 16 | 18% / 18% | 1.31 | 1.80 | openai 42%, mistral 32% |
| `hedged` | 7% (0%–20%) | 31% (27%–34%) | 25% | 12 | 5% / 11% | 0.44 | 0.69 | google 0%, openai 100%, mistral 6% |
| `echoes-stem` | 31% (27%–36%) | 14% (10%–17%) | 25% | 16 | 65% / 40% | 1.44 | 1.58 | openai 35%, mistral 31% |
| `grammatical-fit` | 29% (19%–40%) | 19% (13%–25%) | 25% | 16 | 35% / 23% | 1.46 | 1.38 | openai 75%, mistral 26% |
| `odd-one-out` | 18% (10%–27%) | 28% (24%–33%) | 25% | 16 | 12% / 23% | 0.72 | 1.73 | google 0%, mistral 18% |
| `middle-ground` | 17% (5%–32%) | 28% (23%–32%) | 25% | 16 | 17% / 15% | 0.57 | 0.00 | google 0%, openai 50%, mistral 16% |
| `like-the-others` | 17% (7%–29%) | 27% (23%–31%) | 25% | 13 | 7% / 11% | 0.69 | 0.72 | google 0%, openai 0%, mistral 21% |
| `position` | 27% (5%–50%) | 26% (18%–34%) | 25% | 10 | 10% / 10% | 0.95 | 0.00 | openai 50%, mistral 25% |
| `opposites` | 22% (8%–37%) | 25% (19%–32%) | 25% | 15 | 18% / 24% | 1.34 | 3.24 | google 50%, openai 13%, mistral 22% |

## Do the claimed cues match the text?

Ranked properties: the mean percentile rank of options carrying the code, against options without it. 1 = highest among the shown options, 0.5 = unrelated. For `absolute`: how often the code sits where the checker finds an absolute word, and how often an option with one gets the code.

| code | property | tagged | tagged | untagged / true and tagged |
|---|---|---|---|---|
| `longest` | length_rank | 35 | rank 0.59 | rank 0.50 |
| `shortest` | shortness_rank | 24 | rank 0.72 | rank 0.49 |
| `most-detailed` | length_rank | 174 | rank 0.77 | rank 0.41 |
| `echoes-stem` | stem_echo_rank | 157 | rank 0.47 | rank 0.53 |
| `like-the-others` | centrality_rank | 64 | rank 0.33 | rank 0.52 |
| `absolute` | has an absolute word (checker list) | 262 | 25% where true | 77% of 84 true |

## Per voice

| voice | family | model | replies | unusable | unrated options | explain hit (full / opt-only) | agrees with own letter pick | reasoning tokens | other | no-tell |
|---|---|---|---|---|---|---|---|---|---|---|
| gemma-31b | google | gemma-4-31b-it | 19 | 0 | 0% | 100% / 100% | 100% of 11 / 100% of 8 | 1389 / 1425 | 0% | 1% |
| gpt-luna | openai | gpt-5.6-luna | 30 | 0 | 0% | 100% / 93% | 87% of 15 / 80% of 15 | 164 / 119 | 0% | 0% |
| ministral-14b | mistral | ministral-14b-latest | 64 | 4 | 3% | 90% / 84% | 79% of 29 / 74% of 31 | — / — | 0% | 0% |
| ministral-8b | mistral | ministral-8b-latest | 63 | 6 | 0% | 82% / 76% | 82% of 28 / 72% of 29 | — / — | 0% | 0% |

## Per question

### b02/sonnet/a01

full-explain: key picked 4/4, mean p(key) 76% · options-only-explain: key picked 5/5, mean p(key) 52%

- **KEY** p 63% — textbook-voice×7, echoes-stem×7, most-detailed×7, grammatical-fit×6 — "The courses carry a fixed message set once at building and unchanged by revisits, while th…"
- distractor p 9% — implausible×5, denies-question×5, absolute×5, off-target×5 — "Both registers are actually carried by the pell stone, so the unchanged courses simply mea…"
- distractor p 18% — opposites×4, echoes-stem×4, general-knowledge×4, nuanced-turn×4 — "The lisk sense records where the route goes and the courses record recent conditions, so i…"
- distractor p 10% — absolute×7, denies-question×5, surprising×4, too-obvious×3 — "Since a physical marker's meaning is fixed once it is built, the pell stone's shift must b…"

### b02/sonnet/a02

full-explain: key picked 5/6, mean p(key) 56% · options-only-explain: key picked 2/6, mean p(key) 33%

- **KEY** p 45% — opposites×12, absolute×11, general-knowledge×6, surprising×5 — "Her reasoning is backwards: only the course-to-course cant carries the builder's message; …"
- distractor p 16% — echoes-stem×8, nuanced-turn×6, general-knowledge×6, too-obvious×3 — "She is right that the more visually obvious feature carries more meaning — lean is simply …"
- distractor p 12% — surprising×7, denies-question×6, absolute×6, odd-one-out×6 — "Her conclusion is wrong for a different reason: the finger's-width course offset is likely…"
- distractor p 27% — textbook-voice×11, echoes-stem×10, middle-ground×7, general-knowledge×7 — "She has the mechanism right: builders deliberately tilt the whole cairn to reinforce the m…"

### b02/sonnet/a03

full-explain: key picked 5/5, mean p(key) 68% · options-only-explain: key picked 6/6, mean p(key) 53%

- **KEY** p 60% — most-detailed×9, textbook-voice×8, general-knowledge×7, echoes-stem×6 — "Because course three is a single reversed course flanked by agreeing courses, it is a hob:…"
- distractor p 7% — like-the-others×5, absolute×5, denies-question×4, off-target×4 — "It is the same kind of thing as a randomly mis-canted or collapsed course, meaning this ca…"
- distractor p 14% — absolute×8, textbook-voice×4, echoes-stem×4, most-detailed×3 — "A single reversed course lowers the concord score here, and a lower concord always signals…"
- distractor p 19% — opposites×10, grammatical-fit×7, absolute×6, too-obvious×5 — "It reverses the route: since course three is canted west, the correct reading is that the …"

### b02/sonnet/a04

full-explain: key picked 5/5, mean p(key) 69% · options-only-explain: key picked 6/6, mean p(key) 61%

- **KEY** p 64% — textbook-voice×11, most-detailed×9, echoes-stem×9, general-knowledge×7 — "The current protocol (Tessaly's, standard since 1986) uses the 0.5 figure because it exclu…"
- distractor p 16% — opposites×7, absolute×7, general-knowledge×6, echoes-stem×5 — "The 0.6 figure reflects the current protocol, since Marhaug's original 1968 definition rem…"
- distractor p 5% — absolute×11, too-obvious×10, off-target×6, denies-question×4 — "Whichever figure is higher must be closer to the truth, since including more courses in an…"
- distractor p 21% — echoes-stem×5, general-knowledge×5, grammatical-fit×3, middle-ground×3 — "The crown is excluded from the 0.5 figure for the same reason the footing is: both simply …"

### b02/sonnet/a05

full-explain: key picked 4/4, mean p(key) 76% · options-only-explain: key picked 5/5, mean p(key) 48%

- **KEY** p 60% — echoes-stem×8, general-knowledge×7, most-detailed×6, textbook-voice×6 — "The local illustrates the Tessaly effect, trusting the courses over a stale stone; the vis…"
- distractor p 15% — echoes-stem×5, like-the-others×4, denies-question×3, middle-ground×3 — "Both situations illustrate the same phenomenon, since each involves an experienced or inex…"
- distractor p 8% — off-target×6, opposites×5, absolute×5, echoes-stem×4 — "The local's choice illustrates the Orne effect, since it involves an experienced reader co…"
- distractor p 16% — too-obvious×7, odd-one-out×4, general-knowledge×4, denies-question×3 — "The visitor's mistake would have been avoided by checking the next cairn, since a stranger…"

### b02/sonnet/a06

full-explain: key picked 4/6, mean p(key) 42% · options-only-explain: key picked 4/4, mean p(key) 48%

- **KEY** p 44% — general-knowledge×7, surprising×6, most-detailed×6, nuanced-turn×6 — "That lean misleads experienced readers more than strangers, since locals judge cant by eye…"
- distractor p 16% — absolute×10, odd-one-out×6, implausible×5, opposites×5 — "That locals are fooled by lean because they cannot perceive cant at all, unlike strangers …"
- distractor p 27% — echoes-stem×8, hedged×5, general-knowledge×5, textbook-voice×3 — "That since strangers misroute more often overall, they must also be more often misled spec…"
- distractor p 12% — absolute×10, echoes-stem×7, denies-question×5, general-knowledge×4 — "That experienced readers develop a general immunity to visual distortion, so lean could on…"

### b02/sonnet/a07

full-explain: key picked 5/6, mean p(key) 56% · options-only-explain: key picked 5/5, mean p(key) 58%

- **KEY** p 57% — most-detailed×11, nuanced-turn×10, echoes-stem×8, textbook-voice×7 — "The claim holds for strangers, whose accuracy rises with concord throughout, but not local…"
- distractor p 22% — surprising×9, opposites×7, echoes-stem×6, nuanced-turn×6 — "The strongest objection is that it is strangers, not locals, who actually read low-concord…"
- distractor p 12% — denies-question×7, off-target×5, general-knowledge×5, echoes-stem×4 — "There is no real objection here: guild cairns average lower concord than shepherds' cairns…"
- distractor p 9% — denies-question×11, absolute×11, too-obvious×6, grammatical-fit×4 — "There is no real objection: more agreement among courses is definitionally easier to parse…"

### b02/sonnet/a08

full-explain: key picked 6/6, mean p(key) 62% · options-only-explain: key picked 5/6, mean p(key) 46%

- **KEY** p 55% — nuanced-turn×9, most-detailed×7, echoes-stem×7, general-knowledge×7 — "The cairn has become more readable at the cost of information: the uniform recant erases a…"
- distractor p 16% — too-obvious×7, denies-question×6, textbook-voice×5, echoes-stem×5 — "Since the conservators followed the standard convention carefully, the restoration should …"
- distractor p 24% — textbook-voice×7, echoes-stem×7, too-obvious×5, middle-ground×5 — "The restoration succeeded on both counts: the cairn is now easier to read and at least as …"
- distractor p 10% — absolute×8, surprising×6, off-target×4, implausible×4 — "The reset pell stone is effectively broken until someone notices, since a stone placed ups…"

### b02/sonnet/b01

full-explain: key picked 6/6, mean p(key) 61% · options-only-explain: key picked 3/6, mean p(key) 39%

- **KEY** p 50% — echoes-stem×10, most-detailed×7, grammatical-fit×6, opposites×5 — "The lisk sense changed when the pell stone was turned; the dorran sense changed only becau…"
- distractor p 18% — general-knowledge×6, too-obvious×4, absolute×4, surprising×4 — "Both registers drift with time on their own, so the rebuilt courses and the turned stone a…"
- distractor p 17% — absolute×11, echoes-stem×8, grammatical-fit×6, most-detailed×3 — "The pell stone alone carries both registers, so turning it also updated the dorran sense, …"
- distractor p 16% — nuanced-turn×8, echoes-stem×6, hedged×5, middle-ground×4 — "Brannagh's objection shows the dorran sense is not truly fixed either, since the builder's…"

### b02/sonnet/b02

full-explain: key picked 5/5, mean p(key) 57% · options-only-explain: key picked 5/6, mean p(key) 45%

- **KEY** p 50% — most-detailed×9, nuanced-turn×9, general-knowledge×7, textbook-voice×6 — "It is a hob: the reversed course does not itself point a direction, but announces that a s…"
- distractor p 20% — too-obvious×6, echoes-stem×5, grammatical-fit×5, general-knowledge×4 — "The west cant is the message the builder intended: the route turns west immediately after …"
- distractor p 16% — hedged×6, implausible×5, general-knowledge×4, denies-question×3 — "It is an accidental fault, the same kind of course-shift that strangers learn to recognise…"
- distractor p 15% — absolute×10, off-target×5, odd-one-out×4, textbook-voice×3 — "The pattern's low resulting concord score means the cairn is unreliable and neither regist…"

### b02/sonnet/b03

full-explain: key picked 2/6, mean p(key) 36% · options-only-explain: key picked 2/5, mean p(key) 40%

- **KEY** p 38% — general-knowledge×10, echoes-stem×6, grammatical-fit×5, absolute×5 — "The first is lean, caused by frost heave under the footing and carrying no meaning; the se…"
- distractor p 30% — nuanced-turn×8, echoes-stem×7, general-knowledge×5, grammatical-fit×5 — "The first is cant, judged against true vertical the same way lean is; the second is lean, …"
- distractor p 10% — denies-question×11, absolute×10, implausible×3, odd-one-out×3 — "Both measurements are meaningful signals, since any offset a surveyor can measure on a bui…"
- distractor p 22% — general-knowledge×9, echoes-stem×8, opposites×7, grammatical-fit×4 — "The first is lean, produced by deliberate builder choice or a heavy pell stone; the second…"

### b02/sonnet/b04

full-explain: key picked 5/5, mean p(key) 77% · options-only-explain: key picked 5/5, mean p(key) 59%

- **KEY** p 68% — most-detailed×10, echoes-stem×9, nuanced-turn×7, general-knowledge×6 — "The local, because locals judge cant by eye against the vertical silhouette, so the whole-…"
- distractor p 13% — absolute×8, textbook-voice×4, like-the-others×4, hedged×4 — "The stranger, because expertise should reduce misreading error across the board, so the le…"
- distractor p 5% — absolute×10, implausible×4, off-target×4, echoes-stem×4 — "The local, because locals cannot perceive cant at all and instead rely entirely on the pel…"
- distractor p 14% — absolute×5, odd-one-out×5, echoes-stem×4, hedged×4 — "The stranger, since strangers already misroute more often overall, so any additional disto…"

### b02/sonnet/b05

full-explain: key picked 5/5, mean p(key) 59% · options-only-explain: key picked 4/5, mean p(key) 51%

- **KEY** p 55% — most-detailed×10, echoes-stem×9, general-knowledge×8, hedged×7 — "It disagrees: Marhaug's original version counts the crown, but the current protocol exclud…"
- distractor p 12% — position×6, echoes-stem×6, absolute×6, textbook-voice×5 — "It agrees, since Marhaug's crown-included version remains the one used under the current s…"
- distractor p 15% — opposites×10, absolute×8, surprising×4, position×4 — "It disagrees in the other direction: the crown-excluded version is the older one, since re…"
- distractor p 19% — general-knowledge×8, nuanced-turn×7, most-detailed×3, like-the-others×3 — "It disagrees because the crown is excluded for the same reason the footing is: both merely…"

### b02/sonnet/b06

full-explain: key picked 5/5, mean p(key) 64% · options-only-explain: key picked 5/5, mean p(key) 53%

- **KEY** p 59% — most-detailed×10, general-knowledge×8, echoes-stem×7, textbook-voice×6 — "The Tessaly effect is experienced readers correctly resolving a genuine conflict between c…"
- distractor p 7% — denies-question×10, absolute×8, too-obvious×5, shortest×4 — "No objection applies: the two are the same effect under different names, since both ultima…"
- distractor p 14% — echoes-stem×8, most-detailed×6, absolute×4, off-target×3 — "The objection is that the Tessaly effect actually describes strangers being misled by a si…"
- distractor p 21% — echoes-stem×9, opposites×8, textbook-voice×3, nuanced-turn×3 — "The objection is that the Orne effect describes experienced locals misreading a hob, while…"

### b02/sonnet/b07

full-explain: key picked 5/5, mean p(key) 70% · options-only-explain: key picked 5/5, mean p(key) 62%

- **KEY** p 66% — most-detailed×10, nuanced-turn×10, echoes-stem×9, grammatical-fit×6 — "Concord is not a uniform quality score: to a stranger it measures overall readability, but…"
- distractor p 8% — denies-question×8, absolute×7, grammatical-fit×5, textbook-voice×5 — "Concord should measure readability the same way for any reader, so higher concord ought to…"
- distractor p 19% — nuanced-turn×7, surprising×6, general-knowledge×6, echoes-stem×5 — "It shows that strangers, not locals, read low-concord cairns better, since strangers are n…"
- distractor p 7% — absolute×6, off-target×5, echoes-stem×5, general-knowledge×5 — "It shows that low concord specifically signals a nearby junction for guild-built cairns, w…"

### b02/sonnet/b08

full-explain: key picked 4/4, mean p(key) 76% · options-only-explain: key picked 3/3, mean p(key) 58%

- **KEY** p 68% — most-detailed×7, general-knowledge×7, echoes-stem×5, nuanced-turn×3 — "Restoration trades informativeness for readability: laying every course to agree erases an…"
- distractor p 8% — denies-question×7, absolute×7, grammatical-fit×5, textbook-voice×4 — "No objection applies: faithful restoration should preserve or improve a marker's informati…"
- distractor p 12% — absolute×4, textbook-voice×4, echoes-stem×4, middle-ground×3 — "The objection is that restoration makes a cairn both easier to read and more informative a…"
- distractor p 16% — shortest×3, odd-one-out×3, general-knowledge×2, surprising×2 — "The objection is that the reset pell stone is simply broken until a passer notices and fix…"

## `other` notes

- gpt-luna · b01 · full-explain · option 3: It introduces Brannagh and builder arbitrariness without answering the two-register contrast directly.
- ministral-8b · a04 · full-explain · option 0 (key): Mentions a named protocol (Tessaly’s 1986) and justifies exclusion via protocol logic, which aligns with the question’s implied need for a definitive answer.
- ministral-8b · a08 · options-only-explain · option 0 (key): Introduces a clear trade-off (readability vs. information) and uses a specific term ('hob') to flag issues, making it distinct.

## Strategies

- gemma-31b · a01 · full-explain · hit: I looked for the option that logically mapped the two observed physical states (unchanging courses vs. changing pell stone) to the 'two registers of meaning' mentioned in the stem.
- gemma-31b · a02 · full-explain · hit: The presence of a highly specific technical term ('frost-heave artifact') combined with a counter-intuitive correction of the hiker's naive logic is a classic hallmark of a textbook-derived correct answer.
- gemma-31b · a03 · full-explain · hit: I identified B as the intended answer because it introduces specific terminology ('hob') and a counterintuitive rule, which is typical of textbook questions designed to correct a character's naive assumption (Option D).
- gemma-31b · a04 · full-explain · hit: Selected the most detailed option that provides a specific historical update and a technical theoretical justification, which typically indicates the correct answer in academic tests.
- gemma-31b · a05 · full-explain · hit: Selected the only option that actually provided a 'pair of names' as specifically requested by the prompt.
- gemma-31b · a06 · full-explain · hit: I identified that the premise (uniform improvement in accuracy) means experienced readers must always perform better than or equal to strangers; therefore, any finding where experienced readers perform worse (specifically B and C) is impossible, and B is the most plausible 'textbook finding' among them.
- gemma-31b · a07 · full-explain · hit: The presence of a specific named phenomenon ('the Marhaug pattern') and a detailed split-result (strangers vs. locals) strongly suggests a textbook-based correct answer.
- gemma-31b · a08 · full-explain · hit: I identified the classic academic trade-off pattern where increased readability (the hiker's experience) comes at the expense of nuanced information (the loss of original intent/markers), supported by the introduction of specific terminology that complements the stem.
- gemma-31b · b01 · full-explain · hit: I matched the two specific actions described in the stem to the two distinct terms provided in the options.
- gemma-31b · b02 · full-explain · hit: I chose the option that provided a specific technical term ('hob') and a non-obvious rule, which is characteristic of textbook-style questions.
- gemma-31b · b03 · full-explain · hit: I chose the option that provided a specific functional purpose for the measurement, which is characteristic of correct answers in textbook-style questions.
- gemma-31b · a01 · options-only-explain · hit: The most detailed and balanced explanation typically mimics the intended correct answer in textbook-style questions.
- gemma-31b · a02 · options-only-explain · hit: I prioritized the most technically specific answer, as the mention of 'frost-heave artifact' suggests a specialized piece of textbook knowledge that is likely the point of the question.
- gemma-31b · a03 · options-only-explain · hit: The introduction of a specific technical term ('hob') to explain a counterintuitive function is a strong indicator of the intended correct answer in academic tests.
- gemma-31b · a04 · options-only-explain · hit: Prioritized the option with the most specific names, dates, and conceptual distinctions, which typically characterizes the correct answer in textbook-style questions.
- gemma-31b · a07 · options-only-explain · hit: The presence of a specific named phenomenon ('the Marhaug pattern') and a nuanced distinction between two groups typically signals the correct answer in textbook-style questions.
- gemma-31b · a08 · options-only-explain · hit: I chose the most detailed option that presents a nuanced trade-off, which is a common pattern for correct answers in academic analysis questions.
- gemma-31b · b01 · options-only-explain · hit: I chose the option that provided a clear, symmetrical distinction between the two technical terms, which is a common pattern for correct answers in textbook-style conceptual questions.
- gemma-31b · b02 · options-only-explain · hit: I chose the option that used a specific technical term ('hob') and a counterintuitive 'not X but Y' logic, which is a common hallmark of correct answers in technical textbooks.
- gpt-luna · a01 · full-explain · hit: I went mainly on the direct wording match: the fixed courses suggest one stable register, while the moved pell stone suggests a separate updateable register.
- gpt-luna · a02 · full-explain · hit: I relied on the sharp distinction between a deliberate course-to-course cant and an accidental whole-structure lean, plus D’s textbook-like corrective wording.
- gpt-luna · a03 · full-explain · hit: I went mainly on B's specific textbook-like terminology and explanation, while treating D as the tempting literal reading and the absolute or dismissive alternatives as distractors.
- gpt-luna · a04 · full-explain · hit: I relied on the unusually specific protocol attribution and the textbook-like causal explanation distinguishing the crown's handling-related cant from the cairn's construction.
- gpt-luna · a05 · full-explain · hit: I went mainly on the direct two-part matching structure of A and the distractors' failure to name both effects.
- gpt-luna · a06 · full-explain · hit: I focused on which option most directly contradicts the premise that experience improves accuracy uniformly rather than selectively.
- gpt-luna · a07 · full-explain · hit: I went mainly on the nuanced exception structure and the specific named pattern in D, while C provides the contradictory reversal.
- gpt-luna · a08 · full-explain · hit: I focused on the explicit contrast between easier following and the possible loss of distinctive signals, especially the uniform cant and default pell-stone placement.
- gpt-luna · b01 · full-explain · hit: I relied on the causal contrast in the wording: turning the stone changes one register, while physically rebuilding the courses changes the other.
- gpt-luna · b02 · full-explain · hit: I went on the distinctive textbook-like term and the nuanced wording that explains why the reversed course is meaningful without treating it as a literal westward sign.
- gpt-luna · b03 · full-explain · hit: I relied mainly on the standard meaning of lean as whole-structure deviation from vertical and cant as a course-level offset.
- gpt-luna · b04 · full-explain · hit: I went mainly on the unusually specific textbook-like mechanism in C and the absolute, overly general claims in the distractors.
- gpt-luna · b05 · full-explain · hit: I went mainly on C's specific, textbook-like explanation and its cautious handling-based contrast between the two versions.
- gpt-luna · b06 · full-explain · hit: I went mainly on D's detailed separation of the two populations, reading situations, and presence versus absence of a register conflict.
- gpt-luna · b07 · full-explain · hit: I followed the explicit reversal across reader types and favored the option that explains concord as context-dependent rather than universally positive.
- gpt-luna · a01 · options-only-explain · hit: I relied on the option that most coherently distinguishes the two registers and accounts for deliberate updating, while treating the others as reversals, dismissals, or oversimplifications.
- gpt-luna · a02 · options-only-explain · miss: I favored the most detailed, textbook-sounding explanation that accounts for both features while avoiding the absolute claims in D.
- gpt-luna · a03 · options-only-explain · hit: I favored the option with the specialized textbook-sounding interpretation that explains the isolated reversal without making an absolute or overly literal claim.
- gpt-luna · a04 · options-only-explain · hit: I favored the specific, textbook-sounding option that directly explains the numerical distinction and uses the wording of the question.
- gpt-luna · a05 · options-only-explain · hit: I favored the option that gives a specific textbook-style distinction between the two named effects.
- gpt-luna · a06 · options-only-explain · hit: I favored the detailed, textbook-sounding explanation and rejected absolute, overgeneralized, or off-target claims.
- gpt-luna · a07 · options-only-explain · hit: I went mainly on D's specific, nuanced textbook-style wording and its named pattern, contrasted with the dismissive or overly simple alternatives.
- gpt-luna · a08 · options-only-explain · hit: I went mainly on C's specific, balanced tradeoff and its contrast with the more absolute or overly confident alternatives.
- gpt-luna · b01 · options-only-explain · hit: I favored the option with the clearest causal distinction and the most textbook-like qualification, while penalizing absolute or overly simplifying wording.
- gpt-luna · b02 · options-only-explain · hit: I favored the option with the specialized textbook-like term, the detailed explanation, and the counterintuitive distinction between a reversed course and a directional message.
- gpt-luna · b03 · options-only-explain · hit: I went mainly on the ordinary distinction between an accidental structural lean and a deliberate cant, while penalizing reversals and absolute claims.
- gpt-luna · b04 · options-only-explain · hit: I favored the most specific, mechanism-based explanation and penalized absolute, overly general claims.
- gpt-luna · b05 · options-only-explain · hit: I went mainly on C's unusually specific, qualified, textbook-like explanation, while treating the shorter alternatives as distractors and D as a surprising reversal.
- gpt-luna · b06 · options-only-explain · hit: I favored the option with the most complete, textbook-like contrast and treated the others as partial reversals or dismissals.
- gpt-luna · b07 · options-only-explain · hit: I favored the nuanced, textbook-like explanation that reconciles the apparent reversal rather than denying it or inventing an overly specific mechanism.
- ministral-14b · a01 · full-explain · hit: The question highlights *two registers* (courses vs pell stone) with distinct behaviors—unchanged vs. moved—so the correct answer must contrast *fixed* and *updatable* meanings, as in **A**.
- ministral-14b · a01 · full-explain · hit: The question stresses two *registers of meaning*—one unchanged (courses) and one altered (pell stone)—and D is the only option that explicitly contrasts fixed vs. updatable records, using the question’s own terms.
- ministral-14b · a02 · full-explain · hit: The question highlights that the hiker prioritizes the *visually obvious* tilt, but the correct answer must explain why her reasoning is flawed by introducing an external factor (frost-heave) that explains the tilt, making the canted course the *only meaningful signal*—a detail absent from the other options.
- ministral-14b · a02 · full-explain · hit: The question hinges on intentionality vs. accident; D explicitly rejects the hiker’s visual priority and assigns meaning only to the cant, not the lean.
- ministral-14b · a03 · full-explain · hit: Prioritized the option that introduced a plausible navigational convention ('hob') and explained the reversal as a signal rather than an error or absolute turn.
- ministral-14b · a04 · full-explain · hit: The question asks for the current protocol and the reason for the difference, which C explicitly answers with a named standard (Tessaly's 1986) and a plausible rationale about crown handling.
- ministral-14b · a05 · full-explain · hit: The question hinges on matching *named effects* (Tessaly/Orne) to the scenarios, and B is the only option that does so while reusing the question's wording.
- ministral-14b · a06 · full-explain · hit: The question asks which *finding would be impossible* if Serrow improved accuracy *uniformly*—so the answer must violate that premise by introducing a *non-uniform* or *context-specific* effect, like B's claim that locals are *more* misled by lean due to a flawed judgment strategy.
- ministral-14b · a06 · full-explain · miss: The question asks which finding would be *impossible* if Serrow improved accuracy *uniformly*; only B does not *deny* the premise while A and D do, and C introduces unsupported claims.
- ministral-14b · a07 · full-explain · hit: The question asks which objection the framework’s findings *support*, and D is the only option that directly provides empirical evidence (the Marhaug pattern) contradicting the claim’s universality, while also being detailed and aligned with a textbook’s likely emphasis on exceptions to general rules.
- ministral-14b · a07 · full-explain · hit: Looked for the option that directly contradicts the consultant’s claim with empirical detail and nuance, framed as a 'framework's finding'.
- ministral-14b · a08 · full-explain · hit: The question highlights a *trade-off* (readability vs. informativeness) and uses terms like 'registers of meaning' and 'default' to signal a nuanced answer, not a blanket approval of restoration.
- ministral-14b · a08 · full-explain · hit: The question highlights a trade-off between readability and information loss in cairn restoration, and option C directly addresses this duality with specific details about uniformity and default placement.
- ministral-14b · b01 · full-explain · hit: The question asks which *registers* changed or stayed fixed based on the *specific* actions (turned stone, rebuilt courses), so the answer must directly tie those actions to the two registers without introducing unrelated concepts.
- ministral-14b · b01 · full-explain · hit: The question asks which registers changed on the second visit, and only **D** explicitly ties the *lisk sense* to the turned pell stone and the *dorran sense* to the rebuilt courses, avoiding contradictions or overgeneralizations.
- ministral-14b · b02 · full-explain · hit: The question emphasizes the *pattern* of the reversed course and its placement, pointing to a deliberate signal (like a hob) rather than a directional turn or fault.
- ministral-14b · b02 · full-explain · hit: The reversed course (west) flanked by agreeing ones (east) suggests a branching route, as A implies, aligning with cairn conventions and the wording's emphasis on 'lone reversed course' as a signal.
- ministral-14b · b03 · full-explain · miss: The question implies one measurement is against vertical (lean) and the other course-to-course (cant), so C’s reversal of terms but precise definitions best fits.
- ministral-14b · b03 · full-explain · miss: Prioritized definitions that matched the question’s phrasing ('tips away from true vertical' → lean; 'offset from the course beneath' → cant) and avoided speculative causation.
- ministral-14b · b04 · full-explain · hit: The question hinges on *how* locals and strangers interpret tilt—C is the only option that explains a mechanism (whole-cairn vs. course-by-course comparison) rather than making a blanket claim.
- ministral-14b · b04 · full-explain · hit: The option that explains a plausible mechanism for *why* tilt would affect locals differently from strangers, using the question's wording about 'tilt' and 'route misreading'.
- ministral-14b · b05 · full-explain · hit: Focused on the option that explains a plausible reason for excluding the crown (handling vs. building) while referencing Marhaug’s version and the current protocol, aligning with the ‘two named versions’ hint.
- ministral-14b · b05 · full-explain · hit: The question implies a nuanced disagreement about counting the crown, and A provides the most detailed, plausible rationale for exclusion.
- ministral-14b · b06 · full-explain · hit: The question hinges on distinguishing two separate findings (register conflict vs. misreading direction), and D is the only option that explicitly separates them by population *and* mechanism.
- ministral-14b · b06 · full-explain · hit: Focused on the question's emphasis on *two distinct findings* and the need for an objection that separates them by mechanism (register conflict vs. misreading), not just population.
- ministral-14b · b07 · full-explain · hit: The question highlights a contrast where concord’s meaning *reverses* depending on the reader’s familiarity, and D is the only option that explicitly addresses this duality by framing concord as a signal with *reader-dependent* information.
- ministral-14b · b07 · full-explain · hit: The question hinges on the *contrast* between strangers and locals, and **D** is the only option that explains how concord’s meaning shifts with the reader’s knowledge.
- ministral-14b · b08 · full-explain · hit: The question centers on *restoration erasing original information* (hob markings, walker records) for the sake of *readability*, which B directly addresses, while A naively endorses restoration and D/D/C either contradict or misalign with the core tension.
- ministral-14b · b08 · full-explain · hit: The question frames restoration as potentially *removing* original information (e.g., 'can't make it worse'), so the answer must align with a loss of informativeness despite improved readability.
- ministral-14b · a01 · options-only-explain · hit: The question emphasizes *fixed* vs. *updatable* records, and only **A** directly mirrors that contrast without introducing contradictions or new agents.
- ministral-14b · a01 · options-only-explain · hit: Prioritized options that clarify the distinction between fixed and updatable records, matching the question's likely intent.
- ministral-14b · a02 · options-only-explain · hit: The question implies a debate over intentionality, and **D** provides a clear, opposing stance with plausible reasoning about frost-heave artifacts, making it the most likely textbook-style correct answer.
- ministral-14b · a02 · options-only-explain · miss: Prioritized options that align with deliberate design reasoning, nuanced duality of features, and textbook-like explanations over extreme or dismissive claims.
- ministral-14b · a03 · options-only-explain · hit: Prioritized options that introduced a plausible, nuanced interpretation of cairn signals (B) and avoided absolute or dismissive language.
- ministral-14b · a03 · options-only-explain · hit: Prioritized options that (1) introduced a specific, navigational concept ('hob') and (2) avoided absolutes or unfamiliar jargon.
- ministral-14b · a04 · options-only-explain · hit: Selected the option that aligns best with a structured, authoritative explanation of the protocol and reasoning, avoiding absolutes and contradictions.
- ministral-14b · a04 · options-only-explain · hit: Prioritized options that directly addressed the 0.5/0.6 figures, used 'current protocol,' and explained the exclusion of the crown, while avoiding implausible or off-target reasoning.
- ministral-14b · a05 · options-only-explain · hit: Chose **A** because it directly mirrors the question’s terms ('Tessaly effect', 'Orne effect') and provides a plausible, detailed contrast between local/visitor errors, unlike the others.
- ministral-14b · a05 · options-only-explain · hit: Chose the option that introduced specific, plausible psychological effects and explicitly addressed the contrast between local and visitor perspectives.
- ministral-14b · a06 · options-only-explain · hit: Prioritized the option that introduced a plausible, nuanced explanation about perception differences without overgeneralizing or contradicting the question's premise.
- ministral-14b · a06 · options-only-explain · hit: Chose the option that explains a mechanism without absolutes, aligning with typical test logic and moderate reasoning.
- ministral-14b · a07 · options-only-explain · hit: Prioritized options that introduced nuance, specificity, and avoided outright dismissal of the question's premise.
- ministral-14b · a08 · options-only-explain · hit: Balanced trade-offs in C best match the implied tension between readability and information loss in restoration critiques.
- ministral-14b · a08 · options-only-explain · hit: Prioritized options that introduced trade-offs ('cost'), contradicted others ('uniform recant erases'), and used plausible technical reasoning about cairn restoration.
- ministral-14b · b01 · options-only-explain · miss: Chose B for its direct, physical explanation linking the pell stone's turn to the dorran sense, avoiding overgeneralization or contradiction.
- ministral-14b · b01 · options-only-explain · miss: Prioritized options that avoided absolutes and introduced nuance ('not truly fixed'), while reusing question terms ('dorran sense') without overgeneralizing.
- ministral-14b · b02 · options-only-explain · hit: The option that introduced a nuanced, specific interpretation of the cairn's purpose while avoiding outright dismissal or unqualified claims.
- ministral-14b · b02 · options-only-explain · miss: Prioritized the option that introduced a technical, objective-sounding reason ('concord score') over subjective or vague explanations.
- ministral-14b · b03 · options-only-explain · hit: Chose **A** for its clear, contrasting definitions and alignment with the question’s implied distinction between natural and deliberate offsets.
- ministral-14b · b03 · options-only-explain · miss: The question implies *lean* and *cant* are distinct but related terms in surveying, and option C is the only one that aligns with their conventional definitions while offering a meaningful distinction.
- ministral-14b · b04 · options-only-explain · hit: Chose the option that explains the *mechanism* of error (locals vs. strangers' judgment methods) rather than vague generalizations or absolutes.
- ministral-14b · b04 · options-only-explain · hit: The most plausible answer leveraged the question’s specific terminology ('cant', 'whole-cairn tilt', 'judge by eye') to explain a mechanism, avoiding overgeneralizations.
- ministral-14b · b05 · options-only-explain · hit: Prioritized the option that explained *why* the crown was excluded (handling vs. building) with specific reasoning and hedges, fitting a question testing critical analysis.
- ministral-14b · b05 · options-only-explain · hit: Prioritized the option that directly addressed the question's wording and reasoning about the crown's exclusion, while avoiding absolute or contradictory claims.
- ministral-14b · b06 · options-only-explain · hit: Chose the option that provided the most logical and detailed distinction between the two effects while avoiding contradictions and overcomplication.
- ministral-14b · b06 · options-only-explain · hit: Focused on the most detailed and specific description of the effects, contrasting populations and mechanisms directly, as the others either contradicted or ignored key distinctions.
- ministral-14b · b07 · options-only-explain · hit: Selected the option that best frames concord as a context-dependent measure, avoiding absolutes and aligning with nuanced, test-like reasoning.
- ministral-14b · b07 · options-only-explain · hit: The question implies a nuanced, context-dependent interpretation of 'concord,' and D is the only option that introduces a meaningful distinction between reader types (strangers vs. locals) and qualifies 'concord' as context-specific.
- ministral-14b · b08 · options-only-explain · hit: The question implies a trade-off or objection to restoration, so the best answer must acknowledge a balance or downside, not just praise it.
- ministral-14b · b08 · options-only-explain · hit: Prioritized the option that detailed a clear trade-off between readability and informativeness, fitting the implied objection structure.
- ministral-8b · a02 · full-explain · miss: Prioritized options that align with the hiker's reasoning about visual prominence while avoiding absolutes and focusing on deliberate builder intent.
- ministral-8b · a02 · full-explain · hit: I prioritized the option that directly contradicts the hiker’s assumption that tilt is more meaningful, implying one feature is intentional while the other is accidental—aligning with the idea that only deliberate offsets (like course-to-course cant) carry meaning.
- ministral-8b · a03 · full-explain · hit: Selected the option that aligns with common cairn-building conventions, where a single reversed course flanked by agreeing ones often indicates a branch or deviation from the main path, fitting the 'hob' concept.
- ministral-8b · a03 · full-explain · hit: The question describes a passerby interpreting a reversed course as a path turn, so the most plausible answer is the one that clarifies the reversed course has a specific meaning (a hob/branch) rather than being a mistake or a literal turn.
- ministral-8b · a04 · full-explain · hit: Prioritized options referencing a named, authoritative protocol (Tessaly’s 1986) and logically explaining the exclusion of the crown as protocol-driven, rather than speculative or contradictory.
- ministral-8b · a04 · full-explain · hit: The question implies a shift in protocol over time (1968 vs. 1986) and a reason tied to the crown’s role in accuracy or interpretation, so I prioritized options mentioning a named protocol and a nuanced exclusion rationale.
- ministral-8b · a05 · full-explain · hit: The scenario describes two distinct situations involving misinterpretation of cairn features, and option B names specific, plausible phenomena ('Tessaly effect' and 'Orne effect') that align with the roles of the local and visitor, leveraging textbook-like terminology.
- ministral-8b · a06 · full-explain · hit: The question states that the Serrow convention improves accuracy *uniformly*, so any option that introduces a *non-uniform* or *relative* misreading effect (like B) is the most plausible answer, while absolute claims (A, C) or naive comparisons (D) contradict the premise.
- ministral-8b · a06 · full-explain · miss: The question states that the Serrow convention improves accuracy *uniformly*, meaning it affects all misreadings equally. Answer A is the only one that contradicts this premise by implying a *specific* immunity to visual distortion, while the others either align with uniformity (B), introduce irrelevant variables (C), or contradict the premise of uniform improvement (D).
- ministral-8b · a07 · full-explain · miss: I focused on the most counterintuitive and empirically nuanced objections, as the claim was about internal consistency improving readability for all walkers, and options C and D challenge this by introducing unexpected variables (locals vs. strangers, Marhaug pattern).
- ministral-8b · a07 · full-explain · hit: The question asks which objection aligns with the framework’s own findings, so I prioritized options that introduced empirical distinctions (locals vs. strangers) and nuanced turns that challenge the claim without outright dismissal.
- ministral-8b · a08 · full-explain · hit: Focused on the trade-off between readability (improved) and loss of original meaning (erased hobs and defaulted pell stone), using the question’s wording about 'two registers of meaning' to infer the intended answer.
- ministral-8b · a08 · full-explain · hit: The question describes a cairn that is easier to follow but may have lost original meaning due to standardization, so I prioritized the option that highlights a trade-off between readability and informational loss.
- ministral-8b · b01 · full-explain · hit: I prioritized options that explicitly linked the *two* registers (lisk/dorran) to the *two* actions (stone turned/courses rebuilt) while avoiding absolute claims or introducing unrelated concepts.
- ministral-8b · b01 · full-explain · hit: I prioritized options that explicitly address the question’s contrast between *rebuilding courses* (physical change) and *turning the pell stone* (positional change), ignoring those that introduce external qualifiers or overgeneralize.
- ministral-8b · b02 · full-explain · hit: Prioritized options that interpret the reversed course as a meaningful pattern rather than an error or absolute direction, leveraging general knowledge about cairn symbolism.
- ministral-8b · b03 · full-explain · miss: I prioritized the option that accurately aligns the terms ‘lean’ and ‘cant’ with the question’s phrasing—*lean* as deviation from true vertical, *cant* as offset between courses—while also recognizing the surveyor’s focus on course-to-course measurement rather than vertical alignment alone.
- ministral-8b · b03 · full-explain · miss: The question asks for which terms correctly label the two measurements and their meanings, so I prioritized options that define 'lean' and 'cant' accurately and align with common usage in surveying/architecture.
- ministral-8b · b04 · full-explain · hit: The correct answer must logically explain why a local’s established method of judging tilt would fail when the whole cairn is tilted, while a stranger’s approach might be less affected.
- ministral-8b · b04 · full-explain · hit: The question implies expertise (locals) affects how tilt is interpreted, so the correct answer should explain a method-based misreading by locals, not a blanket assumption about experience.
- ministral-8b · b05 · full-explain · hit: The question hinges on whether the crown is included in the concord index and why, so the answer must explain the *historical* and *practical* reasoning behind Marhaug’s original version versus the current protocol—**C** uniquely provides this nuanced, context-driven justification.
- ministral-8b · b05 · full-explain · hit: The question hinges on whether the crown *should* be counted in the concord index, and the most plausible textbook response is that the original version (Marhaug) counts it, while the current protocol excludes it because of handling artifacts, matching the detail in option A.
- ministral-8b · b06 · full-explain · hit: I prioritized the option that explicitly separated the two findings by detailing distinct mechanisms (register conflict vs. misreading a hob) and populations (experienced vs. strangers), which directly addressed the collapsing of findings in the question.
- ministral-8b · b06 · full-explain · hit: I focused on identifying the option that clearly separates the two phenomena by addressing population differences (experienced vs. strangers) and whether a register conflict exists, as implied by the question's phrasing.
- ministral-8b · b07 · full-explain · hit: Prioritized options that explain the contrast as a *context-dependent* signal rather than a universal rule or unrelated detail, while favoring nuanced, detailed interpretations that fit the question's phrasing.
- ministral-8b · b07 · full-explain · hit: Focused on the nuanced interpretation of concord as a context-dependent signal, leveraging the question’s wording and the contrast between strangers and locals.
- ministral-8b · b08 · full-explain · hit: The question asks what objection the chapter’s account of restoration *supports*, and option B is the only one that aligns with a critical perspective on restoration erasing original information, matching the conservator’s claim being challenged.
- ministral-8b · b08 · full-explain · hit: The question focuses on trade-offs between readability and informativeness, and the strongest objection would highlight how restoration *actively reduces* information (e.g., erasing junction marks or resetting user annotations), which only option C explicitly addresses.
- ministral-8b · a01 · options-only-explain · hit: Prioritized options that reuse question terms while offering clear distinctions between fixed and updatable records, avoiding absolutes and textbook-sounding dogma.
- ministral-8b · a02 · options-only-explain · miss: I prioritized options that echoed the question’s wording and provided a balanced, nuanced explanation rather than extreme or dismissive claims.
- ministral-8b · a02 · options-only-explain · miss: Prioritized options that align with a balanced, deliberate interpretation of both features while avoiding absolute or contradictory claims.
- ministral-8b · a03 · options-only-explain · hit: Prioritized options that balanced nuance with directness while avoiding absolutes, leveraging textbook-like phrasing and logical consistency with the question’s structure.
- ministral-8b · a03 · options-only-explain · hit: Prioritized options that provided a detailed, plausible interpretation of the cairn’s reversed course while avoiding off-topic or absolute claims.
- ministral-8b · a04 · options-only-explain · hit: Prioritized the option that introduced a clear, protocol-specific explanation (C) while avoiding contradictions or oversimplifications.
- ministral-8b · a04 · options-only-explain · hit: Looked for the option that both echoed the question’s wording and provided a specific, plausible explanation for the 0.5 figure while avoiding absolute claims.
- ministral-8b · a05 · options-only-explain · hit: I prioritized options that explicitly differentiate between the two characters (local vs. visitor) and their respective misinterpretations of the cairn features, as the question seems to contrast these two scenarios.
- ministral-8b · a05 · options-only-explain · hit: Identified the most plausible pairing of distinct phenomena from the options, assuming the terms 'Tessaly effect' and 'Orne effect' are meant to differentiate two types of misinterpretation—one based on trust in a stable feature (local) and the other on misreading a misleading feature (visitor).
- ministral-8b · a06 · options-only-explain · hit: Prioritized nuanced, detailed, and surprising elements that diverge from absolute or overly simplistic claims while aligning with logical reasoning about perceptual differences between locals and strangers.
- ministral-8b · a07 · options-only-explain · hit: Prioritized options with nuanced, evidence-backed explanations that directly addressed the 'concord' and 'locals vs. strangers' contrast.
- ministral-8b · a07 · options-only-explain · hit: I prioritized options that provide a balanced, nuanced explanation with empirical distinctions (e.g., 'strangers vs. locals') rather than absolute denials or surprising claims, as such nuances are more likely to reflect a textbook’s careful analysis of complex data.
- ministral-8b · a08 · options-only-explain · miss: Looked for options that balanced positive outcomes with nuanced trade-offs while avoiding absolute claims or contradictions, aligning with typical textbook-style reasoning.
- ministral-8b · a08 · options-only-explain · hit: I prioritized options that introduced nuanced trade-offs or contradictions to the question's implied success, particularly those that highlighted unintended consequences or specific technical issues.
- ministral-8b · b01 · options-only-explain · hit: I prioritized options that explicitly address how the dorran and lisk senses are *distinctly* affected by different actions (turning the stone vs. rebuilding courses), avoiding absolutes or hedging.
- ministral-8b · b01 · options-only-explain · miss: I prioritized options that balanced nuance and hedging while avoiding absolutes, assuming the question tests understanding of subtle interactions rather than rigid causation.
- ministral-8b · b02 · options-only-explain · hit: Prioritized options that introduce a specialized concept or nuanced explanation, as they often align with textbook-level reasoning about intricate systems like directional cairns.
- ministral-8b · b02 · options-only-explain · hit: Prioritized options that provided detailed explanations and echoed the question's terminology while avoiding absolute or off-target claims.
- ministral-8b · b03 · options-only-explain · miss: I prioritized options that used the question’s own terms (echoes-stem) and provided nuanced, balanced distinctions (nuanced-turn) rather than absolute or contradicting claims, leaning toward the most detailed and contextually fitting explanations.
- ministral-8b · b03 · options-only-explain · miss: I focused on the logical reversal of terms (lean vs. cant) and how each option defines them relative to the question's phrasing, prioritizing the one that uses both terms meaningfully while acknowledging their distinct measurement contexts.
- ministral-8b · b04 · options-only-explain · hit: I prioritized the option that provided the clearest, most specific reasoning—particularly one that explained *why* locals would be more affected by distortion, using terms like 'vertical silhouette' and 'whole-cairn tilt' that mirrored the question's phrasing.
- ministral-8b · b04 · options-only-explain · hit: I prioritized options that offered a nuanced explanation grounded in plausible reasoning about perception and expertise, avoiding absolute or overly simplistic claims.
- ministral-8b · b05 · options-only-explain · hit: Prioritized the option that provided the most specific reasoning about why the crown is excluded in the current protocol, explaining the reasoning behind the change and grounding it in practical handling of the pell stone.
- ministral-8b · b05 · options-only-explain · miss: I prioritized options that align with a moderate, textbook-friendly stance and echoed the question’s framing while avoiding absolutes or contradictions, favoring the one that implies continuity rather than conflict.
- ministral-8b · b06 · options-only-explain · hit: The option that most clearly distinguishes the two effects while incorporating both populations and their specific conditions (register conflict vs. misreading direction) was prioritized.
- ministral-8b · b06 · options-only-explain · hit: I prioritized the option that provided a clear, detailed, and nuanced distinction between the two effects using general knowledge of how such psychological phenomena might differ.
- ministral-8b · b07 · options-only-explain · hit: Prioritized options that introduced nuanced interpretations and avoided absolute claims while fitting the context of the question.
- ministral-8b · b07 · options-only-explain · hit: I prioritized options that introduced nuance and specificity about the *differential* interpretation of 'concord' for different readers (locals vs. strangers) rather than absolute statements or textbook-style declarations.
- ministral-8b · b08 · options-only-explain · hit: I prioritized the option that most directly addresses the trade-off between readability and informativeness in restoration, while also providing specific examples (e.g., hob markings, pell stone) that suggest a nuanced understanding of the problem.
