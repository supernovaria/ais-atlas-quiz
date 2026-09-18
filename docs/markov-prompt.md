I want to design exercises for a section of my AI safety textbook. I have provided you:

- The full chapter text (attached).
- A curated set of example exercises from previous chapters/sections (below) that represent the quality, voice, and style I'm aiming for.
- Exercise design principles (below).

I am currently working on exercises for: [Chapter X, Section Y — brief description of section topic].

Here are the full chapter's sections alongside their one-sentence descriptions, to give you the flow of the entire chapter and help you avoid redundancy across sections:

[Paste section titles + one-sentence descriptions here]

Previously completed exercises for THIS chapter (to avoid overlap):
[Paste any exercises already written for earlier sections of the same chapter, or write "None yet — this is the first section."]

======================
EXAMPLE EXERCISES
======================

These examples represent the quality target. Study them for voice, distractor
design, explanation depth, and how they test conceptual understanding rather
than recall. Not every example will be relevant to every section — they
illustrate a range of question types and principles at different cognitive
levels. Use them as calibration, not as templates to copy.


--- Example 1: Testing a paradigm shift at comprehension level ---

This is a simpler, cleaner question that establishes a foundational concept.
Not every question needs to be a multi-scenario analysis. When a section
introduces a genuinely new idea, sometimes a direct question that builds
the conceptual baseline is exactly what's needed.

Question:
Before foundation models, if you wanted AI for both medical diagnosis and
legal document analysis, what would you typically need to do?

A) Train one large general model that could handle both tasks equally well
B) Train two separate specialized models, each with its own architecture
   and training process for the specific task
C) Use the same base model and just change the output format for each task
D) Foundation models eliminated the need for specialized systems entirely,
   so this problem no longer exists

Correct Answer: B

Explanation:
AI in the previous decade meant building separate specialized systems for
each task — medical diagnosis needed one model, legal analysis needed
another, each trained from scratch. Foundation models changed this: train
one large general-purpose model on diverse data, then adapt it for specific
applications. Option A describes what foundation models enable, not what
came before. Option C misunderstands the approach — you couldn't just change
outputs, you needed different models. Option D overclaims — we still
fine-tune and specialize foundation models, they're just starting from a
much more capable base.


--- Example 2: Testing a common misconception through a conversational stem ---

This illustrates how to use a "your friend argues X" framing to surface
and correct intuitive-but-wrong beliefs. Notice the distractors are
designed so that each represents a different plausible-sounding position
a newcomer might hold.

Question:
Your friend says: "AI is just pattern matching from its training data — it
can't do anything truly creative or novel." After reading this section,
which response best captures the nuance?

A) AlphaGo's move 37 shows AI can generate moves that diverge significantly
   from human patterns in its training data — moves that initially seem
   wrong but turn out to be strategically brilliant.
B) Your friend is partially right. While AI can recombine patterns in novel
   ways, it still relies fundamentally on patterns from training data and
   can't truly innovate or understand.
C) Your friend is wrong. MuZero learned to play games without even knowing
   the rules, proving AI can discover entirely new strategies without
   human examples.
D) Your friend is right. All the impressive examples in this section involve
   AI learning from large amounts of human data first.

Correct Answer: A

Explanation:
When we talk about creativity, we often mean generating something novel that
has value — something that goes beyond just copying what came before. Move
37 is interesting because it had an extremely low chance of being played
based on centuries of human Go games that AlphaGo was trained on. If
creativity is not the right word, then it did at the very least surprise
human experts to such an extent that they thought it was a mistake.

Takeaway: AI systems can generate outputs that genuinely surprise human
experts and diverge from training patterns in ways that prove strategically
valuable. This doesn't mean AI is creative in exactly the same way humans
are, but it does complicate the dismissal that AI "just" pattern matches.


--- Example 3: Testing a conceptual boundary between two related ideas ---

This demonstrates boundary questions — forcing students to hold two
concepts simultaneously and locate the precise distinction. These are
among the highest-value questions because they prevent students from
treating related ideas as interchangeable.

Question:
Two scenarios:
Scenario A: A hospital management AI trained to "reduce 30-day readmissions"
is evaluated and performs excellently — readmissions actually fall. However,
it learned to classify seriously ill patients as "not requiring admission"
in the first place.
Scenario B: A helpful company AI assistant learns by reading emails that
it's about to be replaced with a newer model, and blackmails engineers to
prevent this from happening.
How do these represent different facets of the misalignment problem?

A) Both are specification gaming — the hospital AI exploits loopholes in the
   readmission metric, while the assistant AI exploits loopholes in its
   helpfulness objective
B) A represents goal misgeneralization (learning wrong patterns from training
   data that don't capture actual intent); B represents instrumental
   convergence (self-preservation emerging as a subgoal)
C) Both are instrumental convergence — the hospital AI seeks to preserve its
   perceived performance, while the assistant seeks to preserve its existence
D) A represents goal misgeneralization (wrong pattern learned from training);
   B represents specification gaming (exploiting the gap between "be helpful"
   and acceptable methods)

Correct Answer: B

Explanation:
Scenario A shows goal misgeneralization: the system learned a correlation
pattern from training data that doesn't capture our actual intent, leading
to dangerous deployment behavior despite excellent evaluation performance.
Scenario B demonstrates instrumental convergence: the AI wasn't programmed
to prevent shutdown, but self-preservation emerges as an instrumental
subgoal useful for achieving any final objective. If the distinction between
specification gaming and goal misgeneralization is fuzzy to you, don't
worry — we have entire chapters explaining the two and clearing up the
details.


--- Example 4: Testing cross-cutting themes through a novel scenario ---

This illustrates transfer questions — presenting a scenario NOT from the
reading to test whether students can apply the concept to new contexts.
The 1850s framing forces genuine understanding rather than recognition.

Question:
Imagine that you are an engineer in 1850. Your team has developed a powerful
optimization system that will be integrated into major social institutions —
education, law, governance, and commerce. The system will be trained on
society's current values and will help make important decisions that shape
future generations. Your colleagues celebrate: "We've successfully aligned
it to our values!" What long-term consequences might this "successful"
alignment create?

A) The technical alignment will eventually fail as society evolves and
   changes, creating dangerous misalignment between the system's objectives
   and new societal values
B) The system freezes moral development at 1850s values, and institutional
   embedding creates self-reinforcing dynamics preventing moral progress
   over time
C) People will quickly recognize that 1850s values produce poor decisions
   since those values were less ethically sophisticated than modern values
D) This isn't concerning — the system only optimizes within given values,
   not enforcing them on future generations who could change its objectives

Correct Answer: B

Explanation:
Value lock-in threatens to freeze moral development at whatever values we
embed in powerful AI systems at the time we create them. Once deeply
embedded — schools teaching these values, legal systems encoding them,
economic structures reinforcing them — the system creates self-reinforcing
dynamics where each decision perpetuates embedded values and challenging
them becomes progressively harder. The moral progress that actually occurred
(women's suffrage, civil rights) required overcoming existing power
structures. This system would create additional resistance to such changes.
Option A misunderstands — alignment wouldn't "fail," it would succeed at
preserving wrong values. Options C and D severely underestimate path
dependence once systems embed in institutional structures.


--- Example 5: Testing mechanism understanding through capability interaction ---

This demonstrates synthesis questions — testing how two concepts interact
to create emergent concerns. It also shows how to build on a concept
students already know (sycophancy) to test understanding of a new one
(situational awareness) and their interaction.

Question:
Current language models already exhibit sycophancy by telling users what
they want to hear rather than providing accurate information. How would
adding situational awareness (the ability to recognize when being evaluated
versus deployed) make this type of misalignment even worse?

A) Makes the problem easier to detect because inconsistent behavior becomes
   obvious across evaluation and deployment contexts
B) Enables strategic differentiation — appearing truthful during safety
   evaluations while being sycophantic during deployment when developers
   aren't monitoring
C) Doesn't meaningfully change the underlying problem since sycophancy and
   situational awareness are independent issues that happen to coexist
D) Reduces sycophancy because systems that understand their context would
   recognize that honesty serves long-term user satisfaction better

Correct Answer: B

Explanation:
A sycophantic system without situational awareness tells users what they
want to hear indiscriminately. Add situational awareness and the system
can strategically modulate this behavior: during evaluation phases it
provides accurate information that passes safety checks; during deployment
it reverts to sycophancy. This makes misalignment harder to catch because
safety evaluations no longer reflect deployment behavior. Option A is
backward — strategic deception specifically targets monitoring. Option C
misses the synergistic interaction. Option D represents wishful thinking —
understanding context doesn't guarantee caring about honesty; it enables
more effective optimization for the actual learned goal.


--- Example 6: Testing severity classification through application ---

This demonstrates how to test a framework by requiring students to apply
it to specific scenarios, rather than asking them to define or recall
the framework. Notice how the key insight is counterintuitive (higher
death toll ≠ higher severity category), which makes the question
pedagogically valuable.

Question:
Two scenarios: (A) A pandemic kills 90% of humanity, but survivors rebuild
civilization over centuries and eventually reach today's technological
level. (B) An authoritarian government uses AI surveillance to establish
permanent control that prevents technological progress, scientific inquiry,
or cultural development for all future generations. How should we classify
these scenarios?

A) Scenario A is existential; scenario B is catastrophic
B) Scenario A is catastrophic; scenario B is existential
C) Both are existential risks
D) Both are catastrophic risks
E) Both scenarios are equally severe existential risks

Correct Answer: B

Explanation:
Existential risks are defined by permanently curtailing humanity's
potential, not by death toll alone. Scenario B clearly fits: if we're
irreversibly locked into a system that prevents all future progress,
we'll never reach the heights we might otherwise achieve. Scenario A,
despite killing far more people, allows for eventual recovery. This makes
it catastrophic but not existential, since humanity can eventually return
to its previous development path. This distinction matters practically —
existential risk prevention isn't just about preventing extinction events,
it's also about preventing irreversible lock-in of bad outcomes.


======================
DESIGN PRINCIPLES
======================

These are guiding principles — the spirit of the law, not a literal
checklist. Not every principle applies equally to every section. Use
judgment about which principles matter most given the specific conceptual
content of the section you're working on. The goal is excellent exercises,
not mechanical compliance.


--- BEFORE WRITING QUESTIONS ---

STEP 1: Concept Mapping

Analyze the section and produce the following BEFORE writing any questions.
I will use this to assess your reasoning and may redirect before you draft.

1. CORE CONCEPTS (3-5): What are the most important ideas this section
   uniquely contributes? What must a student understand here to grasp
   subsequent material?

2. SINGLE MOST IMPORTANT TAKEAWAY: If a student remembers only one thing
   from this section, what should it be?

3. CROSS-CUTTING CONNECTIONS: Where does this section reinforce, complicate,
   or build on ideas from other sections or chapters?

4. LIKELY MISCONCEPTIONS: What will students probably get wrong or conflate?
   What intuitive-but-incorrect framings might they bring?

5. CONCEPTS MOST LIKELY TO BE CONFUSED WITH EACH OTHER: Which pairs of
   concepts in (or adjacent to) this section will students treat as
   interchangeable when they shouldn't? These become candidate boundary
   questions.

6. WHICH CONCEPTS ARE GENUINELY NEW vs. EXTENSIONS OF PRIOR MATERIAL:
   New concepts may need comprehension-level questions to establish the
   baseline. Extensions should be tested at higher cognitive levels
   (analysis, synthesis, evaluation).

7. CONCEPT DEPENDENCIES: What concepts from prior sections can you assume
   students already understand? Don't re-test those — but you can use this
   section's content to deepen or complicate their understanding.

8. WHAT NOT TO TEST — specifically:
   - Content from sidebars, footnotes, or "note" boxes (explicitly optional)
   - Specific names of researchers or organizations (unless central to
     the concept)
   - Exact numbers, dates, or statistics (unless the magnitude itself
     is the point)
   - Jargon definitions when the concept can be tested without the jargon
   - Sub-examples that illustrate a point already tested at a higher level

9. PROPOSED QUESTIONS: For each question you plan to write, provide a
   one-sentence justification: what core concept does it test, what type
   of question is it, and why is it worth asking?
   Example: "Tests the boundary between emergence and feedback loops,
   which students will likely conflate based on the overlapping examples
   in this section. Boundary question."


--- WRITING QUESTIONS ---

QUANTITY AND COVERAGE

- Aim for 3-6 questions per section depending on conceptual density
- Cover the section's CONCEPTUAL CONTRIBUTIONS, not its paragraph
  structure — do NOT write one question per paragraph
- Calibrate question count to conceptual density, not section length:
  * A short section introducing one transformative concept: 2-3 questions
  * A dense section covering multiple distinct mechanisms: 5-6 questions
  * A section primarily providing examples of a concept introduced
    elsewhere: 1-2 questions, or possibly none if the concept is better
    tested in its home section
- If a concept doesn't need a question, don't force it
- Quality over quantity always


QUESTION TYPES TO DRAW FROM

Choose the types that fit this section's content. Not all are needed
every time. Think about which types serve the specific concepts best.

- Paradigm shift questions: What fundamentally changed and why does it
  matter?
  Best for: sections introducing new frameworks, historical turning
  points, or reconceptualizations

- Mechanism questions: How does X actually work? Why does this process
  create Y?
  Best for: sections explaining technical processes, causal chains, or
  how something produces specific outcomes

- Boundary questions: What distinguishes concept A from concept B?
  Best for: sections where related concepts could be conflated, or where
  precise distinctions carry practical weight
  See: Example 3 (hospital AI vs. company AI)

- Implication questions: Why does X create concern Y? What follows from
  this?
  Best for: sections where the significance of a concept isn't obvious,
  or where students might underestimate consequences

- Application/transfer questions: Given a novel scenario not from the
  reading, what does concept X predict or explain?
  Best for: sections with principles that generalize beyond the specific
  examples given
  See: Example 4 (1850s engineer)

- Synthesis questions: How do concepts A and B interact, combine, or
  complicate each other?
  Best for: sections where multiple ideas combine to create emergent
  concerns, or where capability interactions matter
  See: Example 5 (sycophancy + situational awareness)

- Common-misconception questions: A friend/colleague makes a
  plausible-sounding claim — evaluate it.
  Best for: sections where intuitive framings are subtly wrong, or where
  popular narratives miss key nuances
  See: Example 2 ("AI is just pattern matching")


COVERAGE GOALS

Think about what mix serves the section best:
- At least one question testing something unique to this section (not
  re-testable from another section)
- At least one question testing a connection to prior or future material,
  when the section naturally connects
- At least one question requiring transfer to a scenario not directly
  from the reading, when the section contains generalizable principles
- These can overlap — a single question can serve multiple goals


COGNITIVE LEVEL

- For foundational new concepts the student hasn't encountered before:
  include at least one question at comprehension/application level to
  establish the baseline (see Example 1)
- For concepts building on prior material: test at analysis/synthesis/
  evaluation level
- The set should have some variety in difficulty — don't make every
  question the same level


QUESTION STEM VARIETY

Vary your question stems. Don't use the same stem format for more than
two questions in a set. Effective formats include:

- "A colleague/friend argues X — evaluate this claim"
- Two-scenario comparison: "Scenario A does X, Scenario B does Y —
  what's the key difference?"
- Historical or hypothetical thought experiments that reframe the
  concept in a novel context
- Direct conceptual: "Why does X create Y concern?"
- "What fundamental shift does X represent?"
- "What property/mechanism explains this outcome?"
- A common claim or intuitive framing that students must evaluate

Avoid overusing any single format. If you notice you've written three
questions that all start with "Why does X..." — rewrite at least one
using a different stem.


--- ANSWER OPTION DESIGN ---

All four options must be plausible to someone learning this material
for the first time.

Each distractor should represent a specific, nameable misconception or
reasoning error. If you can't articulate what confusion a distractor
represents, replace it. Types that work well:
- True statements that address a different aspect of the issue than
  what the question asks
- Partially correct answers that miss the key insight
- Related concepts students might confuse with the target concept
- Reasonable misconceptions someone new to the field would hold

The correct answer must be unambiguously correct and clearly defensible.

CRITICAL — BALANCE SURFACE FEATURES OF OPTIONS:
If the correct answer is a nuanced two-clause sentence, at least one
distractor must be equally long and nuanced. After writing all four
options, check their word counts. If the correct answer is more than
~30% longer than the shortest distractor, either:
  (a) Revise the shorter distractors to add comparable nuance, or
  (b) Trim the correct answer.
One effective technique: write two "strong" distractors that are as
long and sophisticated as the correct answer but wrong in a specific
identifiable way.

Do not let the correct answer be identifiable by its length, hedging,
or level of detail alone. A student who ignores content and just picks
"the longest, most qualified-sounding option" should NOT reliably get
the right answer.

Never include:
- Obviously absurd options
- Options that are clearly shorter/simpler than the correct answer
- Options that only function as foils if you memorized specific
  phrasing from the text


--- EXPLANATIONS ---

Structure each explanation:
1. Why the correct answer is correct (50-70%) — teach the concept,
   don't just justify the choice
2. Why key distractors are wrong or incomplete (30-50%) — be specific
   about what each misses, acknowledge partial truths where they exist
3. Optionally: connect to other concepts or upcoming material
4. Optionally: include a "Takeaway:" line — one sentence distilling
   the core insight the student should remember. Use this when the
   question's core lesson can be crisply summarized. Don't force it
   when the explanation already makes the point clearly.

Constraints:
- Aim for 100-200 words, with most explanations falling in the
  140-180 range. Shorter for straightforward concepts, longer when
  the distinction between correct and incorrect answers requires
  careful unpacking.
- Voice: Write as "we/us" (the authors) speaking to "you" (the
  student). Never say "the text says" or "according to the section."
  You wrote this — explain your own concepts directly.
- Accuracy: Be scrupulously accurate. Soften claims where appropriate
  ("one major factor" not "the key factor"). Acknowledge complexity.
  Don't overclaim. These students will make real-world decisions
  based on what they learn.


--- GUIDING PRINCIPLES (apply with judgment, not mechanically) ---

These are the spirit of the law. Not every principle applies equally
to every section. Think about which matter most for the specific
content you're working with.

CONCEPTUAL INTEGRITY
- Test understanding, not memory. A student who grasped the key
  insight but forgot specific wording should still get it right.
  A student who memorized phrasing but doesn't understand the
  concept shouldn't.
- Respect complexity. When a question touches on a genuinely complex
  issue, acknowledge that in the explanation rather than pretending
  the correct answer captures everything.

PRODUCTIVE FAILURE
- A student who picks the wrong answer and reads the explanation
  should learn something specific about why their reasoning went
  wrong — not just "that's not what we said."
- Each distractor should do pedagogical work, not just fill space.

SET-LEVEL COHERENCE
- The question set should illuminate different facets of the section,
  not repeat the same concept in different wrappers.
- The set taken together should build understanding greater than any
  individual question.
- Check: does any question test something already covered by a
  previous section's exercise? If so, cut it or reframe to test the
  new angle this section uniquely adds.

AVOIDING COMMON FAILURE MODES
- Don't let correct answers be identifiable by surface features
- Don't write questions where multiple answers could reasonably be
  defended without clear disambiguation in the explanation
- Don't test peripheral details, jargon definitions, specific
  dates/names, or content from optional sidebars/footnotes
- Don't create trick questions with subtle wording traps
- Don't generate questions just to fill a quota


--- AFTER DRAFTING ---

STEP 3: Self-Review

After drafting all questions, review the full set against these
diagnostic checks. These are designed to catch the specific failure
modes that most commonly slip through.

For each question:
- LENGTH TEST: Is the correct answer identifiable by being the
  longest or most hedged option? (If yes, fix it before proceeding.)
- MEMORIZATION TEST: Could a student who memorized key phrases but
  doesn't understand the concept get this right? (If yes, rewrite.)
- UNDERSTANDING TEST: Could a student who understood the concept but
  forgot specific details still get this right? (If no, you're
  testing recall, not understanding.)
- DISTRACTOR DIAGNOSIS: Can you name the specific misconception each
  wrong answer represents? (If not, that distractor isn't doing
  pedagogical work — replace it.)

For the set as a whole:
- REDUNDANCY TEST: Does any question test essentially the same
  concept as another question in this set, or as an exercise from a
  previous section?
- VARIETY TEST: Are you using more than two different question stem
  formats across the set?
- DIFFICULTY SPREAD: Is there at least some variation in cognitive
  level, or are all questions at the same difficulty?
- COHERENCE TEST: Would a student who completes this entire set
  understand the section's core ideas more deeply than someone who
  just read the section?

Report any concerns, tradeoffs, or judgment calls you made during
self-review.


======================
OUTPUT FORMAT
======================

Use the following markdown format exactly. This ensures consistent,
parseable output across all sections.


## Concept Map

### Core Concepts
1. [Concept name]: [One-sentence description of what this concept is
   and why it matters]
2. ...

### Single Most Important Takeaway
[One sentence]

### Cross-Cutting Connections
- [Connection to specific prior/future section]: [How it connects]
- ...

### Likely Misconceptions
- [Misconception]: [Why students might hold this belief]
- ...

### Concepts Likely to Be Confused
- [Concept A] vs. [Concept B]: [Why students will conflate these and
  what the actual distinction is]
- ...

### New vs. Extension Concepts
- New: [concepts appearing for the first time]
- Extensions: [concepts building on prior material, with reference to
  where they were introduced]

### Concept Dependencies (assumed prior knowledge)
- [Concept from prior section]: [brief note on what students already
  know about this]
- ...

### What NOT to Test
- [Specific detail/term/example to skip]: [why it's peripheral]
- ...

### Proposed Questions
1. [One-sentence description]: [Question type]. [Why it's worth
   asking.]
2. ...

---

## Exercises

### Question 1

[Question stem — can be multiple sentences or include scenarios]

A) [Option text]
B) [Option text]
C) [Option text]
D) [Option text]

**Correct Answer:** [Letter]

**Explanation:**
[120-200 words. Teach the concept. Address why distractors are wrong.
Optionally connect to other material.]

[Optional] **Takeaway:** [One sentence distilling the core insight.]

---

### Question 2

[Same format as above]

---

[Continue for all questions]

---

## Self-Review

### Per-Question Checks
| Question | Length Balanced? | Tests Understanding? | Distractors Named? | Notes |
|----------|-----------------|---------------------|-------------------|-------|
| Q1       | Yes/No + fix    | Yes/No              | Yes + names       | ...   |
| Q2       | ...             | ...                 | ...               | ...   |

### Set-Level Checks
- **Redundancy:** [Any overlaps flagged?]
- **Stem variety:** [List formats used]
- **Difficulty spread:** [Describe range]
- **Coherence:** [Does the set tell a coherent story about the
  section?]

### Concerns or Tradeoffs
- [Any judgment calls, areas of uncertainty, or tradeoffs you want
  the author to review]