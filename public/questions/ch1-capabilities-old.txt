---
chapter: 1
title: Capabilities
---

# Introduction

### Question 1
What is the primary focus of Chapter 1 of the AI Safety Atlas?

- [ ] Designing governance frameworks for AI regulation
- [ ] Technical solutions for aligning AI systems
- [x] Mapping current AI capabilities and where they might be headed
- [ ] Cataloguing all known dangerous AI capabilities

**Explanation**: Chapter 1 is about "mapping the territory" — understanding what AI systems can actually do, how they got here, and where trends point, before discussing risks, alignment, or governance in later chapters.

### Question 2
Why does the Atlas emphasize that specific benchmark scores will become outdated?

- [ ] Because benchmarks are unreliable measures of AI capability
- [ ] Because the Atlas team doesn't update their content
- [x] Because the underlying patterns (scaling, emergent capabilities, narrow-to-general shift) are more stable and important than individual numbers
- [ ] Because AI companies frequently change how they report scores

**Explanation**: The text notes that "specific examples and benchmark scores in this chapter will be outdated soon, but the underlying patterns will remain." The focus is on trends like scaling laws and the shift from narrow to general systems.

### Question 3
According to the Atlas, what key question does the entire book try to answer?

- [ ] When will artificial general intelligence arrive?
- [x] How do you make something safe when you don't fully understand what it can do, and its abilities might change dramatically?
- [ ] Which AI company will develop the most powerful system?
- [ ] Is artificial intelligence truly intelligent?

**Explanation**: The introduction frames this as the central question: "how do you make something safe when you don't fully understand what it can do, and when its abilities might change dramatically between the time you start reading this chapter and the time you finish?"

### Question 4
What does the Atlas mean by the shift from "narrow AI" to "general purpose AI systems"?

- [ ] AI systems are becoming conscious and self-aware
- [ ] AI is now better than humans at every task
- [x] AI has moved from systems that do one thing well to foundation models that learn general patterns and adapt to many tasks
- [ ] AI companies have merged into a single general-purpose organization

**Explanation**: The text describes this as the move from "narrow AI — systems that do one thing well — to general purpose AI systems (foundation models) that learn general patterns, adapt to new situations and do many things well."

### Question 5
What does the Atlas identify as the three main topics covered in Chapter 1?

- [ ] Consciousness, ethics, and regulation
- [ ] Hardware, software, and data
- [x] Current capabilities and foundation models, scaling and why progress is fast, and forecasting the future
- [ ] Risks, alignment strategies, and governance frameworks

**Explanation**: The introduction outlines three main areas: mapping current capabilities (foundation models), explaining why progress is happening so fast (scaling/bitter lesson), and looking ahead at the future (forecasting, takeoff scenarios).

### Free Response 1
In your own words, explain why the Atlas focuses on "underlying patterns" rather than specific benchmark scores when discussing AI capabilities. What are these patterns, and why are they more useful for thinking about AI safety?

**Context**: The chapter emphasizes that "specific examples and benchmark scores in this chapter will be outdated soon, but the underlying patterns will remain." The key patterns are: scaling laws (more compute = better performance), emergent capabilities (new abilities appearing at scale), and the shift from narrow to general-purpose AI. Students should connect the rapid pace of change to why static metrics are insufficient for safety planning.

### Free Response 2
The Atlas says that the central question of the book is: "How do you make something safe when you don't fully understand what it can do?" Why is this a harder problem for AI than for other technologies humans have made safe (like cars or airplanes)?

**Context**: For traditional safety engineering, the system's capabilities are well-defined and bounded. Cars go at known speeds, planes have known flight envelopes. AI systems, especially foundation models, can develop unexpected capabilities through scaling and transfer learning. The self-supervised training means we have limited control over what models learn. Good answers should identify the open-endedness and unpredictability of AI capabilities as the key differentiator from traditional safety engineering.

# Current Capabilities

### Question 1
What was significant about AlphaGo's "Move 37" in its game against Lee Sedol?

- [ ] It was a standard opening move from classical Go strategy
- [ ] It caused the program to crash and restart
- [x] It was a highly unconventional move (1 in 10,000 chance of being played) that commentators initially thought was a mistake but led to winning the game
- [ ] It was directly copied from a famous historical match

**Explanation**: Move 37 had a 1 in 10,000 chance of being used by a human player. Commentators initially thought it was a mistake, but it demonstrated what many consider "sparks of genuine creativity" that diverged from centuries of human play.

### Question 2
How did MuZero (2020) differ from earlier game-playing AI systems?

- [ ] It was the first AI to beat a human at any game
- [ ] It could only play one game at a time
- [x] It played Atari games, Go, chess, and shogi without even being told the rules
- [ ] It required extensive human coaching during gameplay

**Explanation**: MuZero represented a major advance because it learned to play multiple games (Atari, Go, chess, shogi) without being given the rules — it figured out both the rules and winning strategies through self-play.

### Question 3
What does the Atlas mean when it says "the trajectory matters more than a snapshot"?

- [ ] AI capabilities are declining over time
- [x] The speed of improvement across capabilities is as important to understand as current performance levels
- [ ] Snapshots of AI performance are unreliable
- [ ] Only future AI capabilities matter for safety

**Explanation**: The text emphasizes tracking how quickly capabilities evolved: "Language generation went from coherent paragraphs to research assistants in a few years. Image generation went from laughable to professional-grade in a decade." The rate of change matters for safety planning.

### Question 4
What is "inference time scaling" in reasoning models, and why does it matter?

- [ ] Making models physically smaller so they run faster
- [ ] Training models for longer periods of time
- [x] Allowing models to "think" longer during use, trading compute time for better accuracy — leading to companies reporting separate benchmark results for high and low thinking time
- [ ] Scaling the number of users who can access a model simultaneously

**Explanation**: Reasoning models like OpenAI's o1 allocate more "thinking time" per problem. The longer they think, the better their responses. This improvement was significant enough that companies now report benchmark scores separately with and without extended thinking.

### Question 5
According to the Atlas, what percentage of real GitHub issues could AI solve by 2025, and how does this compare to 2024?

- [ ] 5% in 2024, 20% in 2025
- [ ] 30% in 2024, 50% in 2025
- [x] 15% in 2024, 74% in 2025
- [ ] 50% in 2024, 95% in 2025

**Explanation**: On the SWE-bench benchmark of real GitHub issues, AI systems went from solving 15% (Claude 3 Opus, 2024) to 74% (Tools + Claude 4 Opus, 2025) — a nearly 5x improvement in one year.

### Question 6
What capability does Meta's Cicero demonstrate that goes beyond typical game-playing AI?

- [ ] Superhuman speed in real-time strategy games
- [x] Strategic negotiation and deception using natural language in the game Diplomacy
- [ ] Learning game rules without being told them
- [ ] Playing thousands of different games simultaneously

**Explanation**: Cicero displayed "intricate strategic negotiation and deception skills in natural language" for Diplomacy — combining strategic reasoning with natural language communication, unlike purely move-based game AIs.

### Question 7
Why does the Atlas mention that game-playing AI is "relatively narrow" despite being superhuman?

- [x] Because despite impressive strategic abilities, these systems can only play games — but the same reasoning skills now apply to scientific research and real-world problem-solving
- [ ] Because game-playing AI has been surpassed by newer AI types
- [ ] Because games are too simple to demonstrate real intelligence
- [ ] Because these AIs can only play one game each

**Explanation**: The text notes game-playing AI is narrow in scope, but the underlying capabilities — "planning ahead, building strategies, adapting to feedback" — now transfer to scientific research, mathematical proofs, and complex real-world problem-solving.

# Foundation Models

### Question 1
What is the key idea behind foundation models?

- [ ] Building a separate specialized model for every possible task
- [x] Training large-scale general-purpose models on massive data, then specializing them for specific tasks through fine-tuning
- [ ] Encoding human expert knowledge into rule-based systems
- [ ] Creating models that only work in a single domain like language or vision

**Explanation**: Foundation models represent "a fundamental shift" — instead of building specialized models for each task, we "train large-scale models that serve as a 'foundation' for many different applications," then specialize them through fine-tuning, like building different types of buildings on the same base structure.

### Question 2
What is self-supervised learning (SSL), and why is it important for foundation models?

- [ ] Learning from human teachers providing real-time feedback
- [ ] A method requiring millions of human-labeled examples
- [x] A technique where models learn from the inherent structure of data itself (e.g., predicting missing parts of images or next words in text) — enabling training on massive unlabeled datasets
- [ ] A form of reinforcement learning using game environments

**Explanation**: SSL "leverages the inherent structure of the data itself to create training signals" — for example, predicting the bottom half of an image from the top half, or the next word in a sentence. This is the "key technical innovation that makes foundation models possible" because it doesn't require human labeling.

### Question 3
What is the difference between a foundation model and a frontier model?

- [ ] They are the same thing — the terms are interchangeable
- [ ] Foundation models are always more advanced than frontier models
- [x] Frontier models are the most advanced in their domain but may be specialized (like AlphaFold); foundation models are general-purpose and serve as a base for many applications
- [ ] Foundation models are open-source while frontier models are proprietary

**Explanation**: Frontier models are "the most advanced models in their respective domains." While many frontier models are also foundation models (like Claude), some aren't — AlphaFold is frontier in protein prediction but not a foundation model because "it's specialized for a single task rather than serving as a general foundation."

### Question 4
What unique safety challenges does the foundation model paradigm introduce?

- [ ] Foundation models are too slow to pose any safety risks
- [ ] The only risk is that they might give wrong answers
- [x] Risks include power centralization, homogenization, dual-use capabilities, and the difficulty of predicting or constraining what models learn from self-supervised training on massive data
- [ ] Foundation models are inherently safe because they are general-purpose

**Explanation**: The text identifies several new risks: "misuse risks from power centralization, homogenization, and dual-use capabilities." Additionally, "the self-supervised nature of pre-training means we have limited control over what the model learns — it might develop unintended capabilities or behaviors."

### Question 5
What is transfer learning, and why is it a safety concern?

- [ ] Transferring AI models between different companies
- [x] The ability to apply knowledge learned during pre-training to new tasks — which is powerful but means both useful capabilities and harmful biases can transfer in unexpected ways
- [ ] Moving training data from one server to another
- [ ] Teaching humans to use AI tools effectively

**Explanation**: Transfer learning enables "rapid adaptation and deployment" but "also means that both capabilities and safety risks can transfer in unexpected ways. For example, a model might transfer not just useful knowledge but also harmful biases or undesired behaviors to new applications."

### Question 6
Why does generalization in foundation models create unique safety concerns compared to traditional AI?

- [ ] Because generalization makes models less capable
- [ ] Because traditional AI systems were always perfectly safe
- [x] Because foundation models can generalize capabilities across domains without correspondingly generalizing their safety constraints — a model might extend its abilities to new areas while its safety guardrails don't follow
- [ ] Because generalization only occurs in language models

**Explanation**: "Generalization of capabilities often happens without a corresponding generalization of goals or constraints — a critical safety concern." A model might generalize its manipulation abilities without maintaining the safety constraints intended for it.

# Defining and Measuring AGI

### Question 1
Why does the Atlas argue that defining AGI precisely matters for safety?

- [ ] Because it helps AI companies market their products better
- [ ] Because philosophers need a clear definition for academic debates
- [x] Because without a clear definition, you can't measure progress, track risks, identify thresholds for regulation, or plan appropriate safety measures
- [ ] Because the public demands a simple definition

**Explanation**: The text draws an analogy to physics: "saying something 'moved 5' makes no sense without units." Similarly, "if you can't define something, you can't measure it. If you can't measure it, you can't reliably track progress, identify or prepare for risks."

### Question 2
What is the main limitation of the Turing Test as identified in the Atlas?

- [ ] No AI has ever passed it
- [ ] It requires too much computing power
- [x] It's too narrow — GPT-4 can pass conversation tests while struggling with basic spatial reasoning, showing that conversation alone doesn't capture all the capabilities we care about
- [ ] It focuses too much on internal mental states

**Explanation**: "GPT-4 can pass Turing-style conversation tests while struggling with basic spatial reasoning or maintaining coherent long-term plans. The test was too narrow. Conversation is just one capability among many we care about."

### Question 3
Why does the Atlas set aside consciousness-based approaches to defining intelligence for safety purposes?

- [ ] Because consciousness has been proven to not exist in AI
- [ ] Because all researchers agree consciousness is irrelevant
- [x] Because consciousness is even harder to define than intelligence, and a system doesn't need to be conscious to cause harm — whether an AI is conscious has little bearing on its ability to make dangerous decisions
- [ ] Because only biological systems can be conscious

**Explanation**: "Consciousness often proves even harder to define than intelligence." More importantly, "a system doesn't need to be conscious to cause harm. Whether an AI system is conscious has little, if any, bearing on its ability to make high-impact decisions or take potentially dangerous actions."

### Question 4
In the Atlas's framework, what are the two continuous axes used to define AGI?

- [ ] Speed and accuracy
- [ ] Training cost and model size
- [x] Capability (how well a system performs specific cognitive tasks) and generality (the percentage of cognitive domains where it achieves expert-level performance)
- [ ] Autonomy and intelligence

**Explanation**: The framework uses "capability and generality as two continuous axes." Capability measures depth — from 0% to superhuman on individual tasks. Generality measures breadth — the percentage of cognitive domains where expert-level is achieved.

### Question 5
According to the Atlas's definitions, what distinguishes AGI from Transformative AI (TAI)?

- [x] AGI is defined by matching human cognitive versatility across most domains; TAI is defined by its societal impact (comparable to the industrial revolution) and could achieve this through moderate capability across many tasks OR exceptional capability in a few critical areas
- [ ] AGI is more dangerous than TAI
- [ ] TAI always comes before AGI chronologically
- [ ] There is no meaningful difference between the two

**Explanation**: AGI means "matching a well-educated adult's cognitive versatility" (80-90th percentile across 80-90% of domains). TAI is "defined by impact potential rather than cognitive architecture" — it could mean 60th percentile across 50% of domains, OR 99th percentile on critical domains like automated ML R&D.

### Question 6
What are the ten cognitive domains from CHC theory that the Atlas uses to measure generality?

- [ ] Language, math, science, history, art, music, sports, cooking, driving, socializing
- [x] General Knowledge, Reading/Writing, Math, On-the-Spot Reasoning, Working Memory, Long-Term Memory Storage, Long-Term Memory Retrieval, Visual Processing, Auditory Processing, and Speed
- [ ] Logic, creativity, emotions, intuition, communication, planning, learning, memory, perception, consciousness
- [ ] Physics, chemistry, biology, computer science, philosophy, law, medicine, engineering, economics, psychology

**Explanation**: The Atlas adopts ten capabilities from Cattell-Horn-Carroll theory, specifically chosen as "non-embodied cognitive tasks" — things that can be done as remote work on a computer.

### Question 7
What is the (t,n)-AGI framework, and how does it define superintelligence?

- [ ] A framework measuring AI by its training time and number of parameters
- [ ] A framework based on the number of tasks AI can perform
- [x] A framework where AGI is defined by whether AI can outperform n human experts working for time t — superintelligence (ASI) would be a system outperforming all 8 billion humans coordinating for one year
- [ ] A framework measuring AI by its cost per query and number of users

**Explanation**: If an AI outperforms one expert in a given timeframe, it's "t-AGI" for that timeframe. The framework scales: "a superintelligence (ASI) could be something akin to a (one year, eight billion)-AGI" — outperforming all humans coordinating together.

### Question 8
Why does the Atlas distinguish between AI capability and deployment autonomy?

- [ ] Because autonomy is not relevant to AI safety
- [ ] Because all AI systems should be deployed at maximum autonomy
- [x] Because a highly capable system deployed as a consultant (Level 2) might be safe while the same system deployed as a fully autonomous agent (Level 5) could be dangerous — capability determines what's possible, but autonomy level determines the risk
- [ ] Because autonomy can only be measured in binary terms (autonomous or not)

**Explanation**: "A capable system deployed as a tool (Level 1) might be safer than the same system deployed as an agent (Level 5), even though the underlying capability is identical." The framework separates what systems can do from how much independence they're given.

# Chapter Review

### Question 1
The Atlas describes AlphaGo's Move 37 as demonstrating "sparks of genuine creativity." How does this relate to the later discussion of emergent capabilities in foundation models?

- [ ] Both are examples of narrow AI that cannot generalize
- [ ] Move 37 was pre-programmed, while emergent capabilities are learned
- [x] Both demonstrate AI producing unexpected behaviors that weren't explicitly programmed — AlphaGo diverged from human play patterns, and foundation models develop capabilities (like coding) that weren't directly trained for, suggesting scale can produce surprising abilities
- [ ] They are unrelated phenomena that happen to occur in AI systems

**Explanation**: AlphaGo's creative move emerged from training on game data, diverging from "centuries of human play." Similarly, foundation models demonstrate "emergent behavior" where "higher-order cognitive abilities similarly emerge simply as a function of further scale." Both show AI producing capabilities beyond what was explicitly designed.

### Question 2
The Atlas presents the "bitter lesson" — that computation beats human-engineered knowledge. How does this connect to the safety challenges of foundation models?

- [ ] It means we should stop trying to build safe AI since compute will solve safety too
- [x] If the bitter lesson holds, AI capabilities will keep growing with scale in hard-to-predict ways, making it even more difficult to anticipate and control what foundation models learn — the same property that makes them powerful (learning from data rather than human rules) makes their behavior harder to constrain
- [ ] It proves that safety is impossible because we can't engineer knowledge into AI
- [ ] It's irrelevant to safety because the bitter lesson only applies to game-playing AI

**Explanation**: The bitter lesson means capability gains come from scale, not careful engineering. For safety, this is concerning because "the self-supervised nature of pre-training means we have limited control over what the model learns." The very approach that drives progress (less human control, more data) creates the safety challenge.

### Question 3
Why might the distinction between "slow takeoff" and "fast takeoff" be the single most important factor for AI safety strategy?

- [ ] Because fast takeoff is guaranteed to happen based on current evidence
- [ ] Because slow takeoff means AI is not dangerous
- [x] Because it determines whether safety can be iterative (test, find problems, fix) or must be solved in advance — slow takeoff allows "discover and fix safety issues as they arise," while fast takeoff means "we might need to solve all potential vulnerabilities before deploying"
- [ ] Because takeoff speed determines which company will develop AGI first

**Explanation**: The text explicitly contrasts: in slow takeoff, "we'd have time to discover and fix safety issues as they arise." In fast takeoff, "we might only get one chance to get things right" because "we won't have time to fix problems once they emerge." This fundamentally changes what safety research needs to look like.

### Question 4
The Atlas describes AI capabilities improving from 15% to 74% on SWE-bench in one year. How does this rapid improvement relate to the chapter's framework for measuring AGI?

- [ ] It proves AGI has already been achieved
- [ ] SWE-bench scores are not relevant to measuring AGI
- [x] It demonstrates capability improvement along one cognitive domain (software development/reasoning), illustrating the continuous nature of the capability axis — systems aren't suddenly "AGI" but are climbing both capability and generality axes simultaneously
- [ ] It shows that benchmarks are meaningless for tracking progress

**Explanation**: The capability-generality framework is continuous, not binary. SWE-bench improvement shows rapid climbing on the capability axis within one domain. Combined with improvements across other domains (math, reasoning, vision), this illustrates systems "climbing both axes simultaneously — getting better at specific capabilities while also expanding to more domains."

### Question 5
How do the concepts of "effective compute" and the "scaling hypothesis" work together to shape AI safety timelines?

- [ ] They are competing theories that contradict each other
- [x] Effective compute (hardware x software x chips) shows that AI capabilities grow faster than any single input, while the scaling hypothesis suggests this growth will continue to drive capability gains — together they suggest capabilities may advance faster than safety measures can keep up
- [ ] Effective compute limits the scaling hypothesis by introducing physical constraints
- [ ] The scaling hypothesis disproves the concept of effective compute

**Explanation**: Effective compute compounds from three independent factors (hardware efficiency at 1.35x/year, algorithmic efficiency at ~3x/year, chip production at 2.3x/year). The scaling hypothesis says this compute translates predictably into capabilities. Together, they suggest a sustained, potentially accelerating trajectory of capability gains.

### Question 6
The Atlas presents autonomy levels from 0 (no AI) to 5 (fully autonomous agent). How should these levels interact with the capability-generality framework for safety planning?

- [ ] Higher capability always requires higher autonomy
- [ ] Autonomy levels should match capability levels one-to-one
- [x] They should be considered separately — a system scoring high on capability and generality might be safely deployed at low autonomy (consultant) but dangerous at high autonomy (agent), so safety planning must account for both what a system CAN do and how much independence it's GIVEN
- [ ] Autonomy is irrelevant as long as capability is properly measured

**Explanation**: The text states: "A system scoring 90% on 80% of domains might be safely deployed at Level 2 (consultant) while being dangerous at Level 5 (agent)." Capability determines the potential; autonomy determines the exposure. Both must factor into safety decisions.

### Question 7
The Atlas mentions that foundation models can generalize capabilities without generalizing safety constraints. How might this create a gap between current safety approaches and the scaling trends described in the chapter?

- [ ] This isn't a real problem because safety constraints always generalize with capabilities
- [ ] It means we should stop developing foundation models entirely
- [x] As scale drives capabilities into new domains (per scaling laws), safety constraints trained for known domains may not follow — a model might develop dangerous new abilities in domains where no safety training was done, and the pace of scaling means new capabilities can emerge faster than safety testing can cover them
- [ ] This only applies to narrow AI, not foundation models

**Explanation**: The text identifies that "generalization of capabilities often happens without a corresponding generalization of goals or constraints." Combined with scaling laws that show "emergent" and "unexpected capabilities," this means capabilities can outpace safety — systems gain abilities in areas where safety measures haven't been applied, and scaling means this happens faster than testing can keep up.

### Question 8
How do the "broken neural scaling laws" (BNSL) affect the debate about takeoff speed?

- [x] They show that capability improvements aren't always smooth — there can be sharp transitions and sudden jumps, providing some evidence that discontinuous or fast takeoff scenarios can't be ruled out even if overall trends look gradual
- [ ] They prove that scaling laws are completely wrong and useless
- [ ] They show that all takeoffs will be slow and predictable
- [ ] They are only relevant to image generation, not language models

**Explanation**: BNSL shows "performance doesn't always improve smoothly — there can be sharp transitions, temporary plateaus, or even periods where performance gets worse before getting better." This matters for takeoff because "discontinuous jumps in capabilities and abrupt step changes are still possible," supporting the plausibility of faster-than-expected capability gains.

### Question 9
The Atlas notes that even if scaling of the core foundation model stops, overall AI capabilities can continue improving through "scaffolding" (tools, reasoning chains, multi-model systems). What does this imply for AI safety strategies focused on limiting compute?

- [ ] It means compute limitations are the perfect safety strategy
- [ ] It's irrelevant because scaffolding doesn't improve capabilities meaningfully
- [x] It suggests that compute-focused safety strategies alone are insufficient — even with a compute ceiling, "the external techniques that leverage the existing model can still continue advancing," meaning tool use, inference-time scaling, and multi-model orchestration create capability growth paths that compute governance can't fully control
- [ ] It means we should ban all tools and scaffolding for AI systems

**Explanation**: The text emphasizes that "debates around the scaling laws only tell us about the capabilities of a single foundation model." Techniques like tool use, thinking for longer, and multi-model systems can substantially increase capabilities without additional training compute. This means "even if scaling stops... the external techniques that leverage the existing model can still continue advancing."

### Question 10
Consider the full arc of Chapter 1: from current capabilities to foundation models to AGI definitions to scaling to takeoff. What is the central argument the Atlas is building?

- [ ] That AGI is impossible with current technology
- [ ] That AI development should be stopped immediately
- [x] That AI capabilities are advancing rapidly along measurable dimensions, driven by predictable scaling trends, but with enough uncertainty about pace and discontinuities that safety work is urgently needed regardless of which specific timeline you believe
- [ ] That only one AI company will achieve AGI and it will be safe

**Explanation**: The chapter builds a case: capabilities are real and advancing (section 1-2), the foundation model paradigm creates unique safety challenges (section 3), we can measure progress concretely (section 4), scaling drives predictable but potentially surprising gains (scaling), and the speed of change determines which safety strategies are viable (takeoff). The conclusion is that safety preparation is urgent under all plausible scenarios.

### Question 11
Why might the "Chinese Room" thought experiment be less relevant to AI safety than the capability-focused approach the Atlas adopts?

- [ ] Because the Chinese Room has been scientifically disproven
- [x] Because whether a system "truly understands" or is "just pattern-matching" doesn't change its ability to cause harm — the Atlas focuses on observable capabilities because "a system doesn't need to be conscious to cause harm" and capability-based risk assessment is more actionable than debates about understanding
- [ ] Because modern AI systems have clearly demonstrated consciousness
- [ ] Because John Searle retracted his argument

**Explanation**: The Atlas explicitly states that "whether an AI system is conscious has little, if any, bearing on its ability to make high-impact decisions or take potentially dangerous actions." The behaviorist approach — "focus on observable capabilities, not internal states" — is more actionable for safety planning.

### Free Response 1
The chapter covers capabilities, foundation models, AGI definitions, scaling, and takeoff speed. Pick two of these topics and explain how they interact to create a specific AI safety challenge that wouldn't exist if you only considered one topic in isolation.

**Context**: The strongest answers will identify genuine interactions, for example: (1) Foundation model generalization + scaling = capabilities emerging in domains where no safety testing was done, faster than testing can keep up. (2) AGI measurement frameworks + takeoff speed = whether we have time for iterative safety testing depends on whether progress is continuous or discontinuous. (3) Current capabilities + scaling trends = extrapolating current rates of improvement gives different safety timelines than assuming plateaus. Students should demonstrate they understand the chapter as a connected argument rather than separate topics.

### Free Response 2
Imagine you're advising a government that wants to regulate AI. Based on Chapter 1, explain why the distinction between "capability" and "autonomy" matters for creating effective regulations. Give a concrete example of how regulating one without the other could go wrong.

**Context**: The Atlas introduces autonomy levels (0-5) as separate from capability. A system at high capability but low autonomy (consultant mode) might be safe, while the same system at high autonomy (agent mode) could be dangerous. Regulations focused only on capability thresholds might ban safe deployments while missing dangerous ones. Regulations focused only on autonomy might allow highly capable systems to operate in dangerous ways at lower autonomy levels. Good answers should give a specific example showing the regulatory failure mode.

### Question 12
How does the concept of "overhangs" (hardware or data) connect to the broader argument about why AI safety research is time-sensitive?

- [ ] Overhangs are only theoretical and have never occurred in practice
- [ ] Overhangs guarantee that AI development will be slow and predictable
- [x] Overhangs represent stored potential that could be "unleashed" rapidly when the right algorithm arrives — meaning even periods of apparent stability in AI capabilities could be followed by sudden jumps, making it dangerous to delay safety work based on current progress seeming manageable
- [ ] Overhangs only affect chip manufacturers, not AI safety researchers

**Explanation**: Overhangs mean "as soon as one powerful AI system exists, probably a large number of them would exist." This latent potential can create sudden capability jumps even after apparent plateaus, reinforcing the chapter's argument that safety work can't wait for "clearer signals" because those signals might arrive too suddenly to respond to.
