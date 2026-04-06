# Current Capabilities

### Question 1
What was significant about AlphaGo's "Move 37" during its match against Lee Sedol?

- [ ] It was a well-known opening move from classical Go strategy that demonstrated AlphaGo had deeply studied historical games
- [ ] It was a defensive move that prevented a critical capture sequence, saving AlphaGo from losing on points
- [x] It was a highly unconventional move that commentators initially thought was a mistake, but proved decisive
- [ ] It perfectly replicated a famous 1933 "ear-reddening" game move between human grandmasters, showing AlphaGo's historical knowledge

**Explanation**: Move 37 in game 2 was remarkable because it deviated from centuries of human play. With a 1 in 10,000 probability of being used by a human player, commentators initially thought it was an error. It later proved to be the decisive move that led to winning the game, and is often cited as an example of genuine creativity emerging from AI systems.

### Question 2
What distinguished MuZero (2020) from earlier game-playing AI systems like AlphaGo (2016)?

- [ ] MuZero was the first system to beat a human professional at Go, which AlphaGo had only managed against amateurs
- [ ] MuZero used large language models to reason about game strategy in natural language before selecting moves
- [x] MuZero played multiple games without being told the rules of any of them
- [ ] MuZero achieved superhuman performance by training on a single game and then transferring that knowledge across all other games simultaneously

**Explanation**: MuZero represented a major advance over its predecessors in generality. While AlphaGo was trained specifically for Go with knowledge of the game rules, MuZero could play multiple different games — Atari, Go, chess, and shogi — without even being provided the rules, learning them entirely through self-play.

### Question 3
How did tool use change the performance of AI models, according to the chapter?

- [ ] Tool use made models slightly faster but did not improve accuracy, which is why most benchmarks don't distinguish between tool-assisted and unassisted runs
- [ ] Tool use replaced the need for larger models entirely, since a small model with a calculator outperforms any large model without one
- [x] It significantly boosted performance, enough that companies began reporting benchmark scores separately with and without tools
- [ ] Tool use was only beneficial for mathematical reasoning tasks, where calculators and code interpreters could verify symbolic computations

**Explanation**: The chapter emphasizes that tool use (calculators, code interpreters, search engines) significantly improved model performance. The improvement was substantial enough that companies began reporting benchmark results separately — with and without tools — because the gap was meaningful.

### Question 4
What does the chapter identify as the relationship between "inference time scaling" (letting models think longer) and model performance?

- [ ] Thinking longer has no measurable effect on accuracy, so labs focus exclusively on scaling training compute instead
- [ ] Thinking longer helps primarily for creative writing tasks, where iterative refinement produces more nuanced prose and storytelling
- [x] Longer thinking time tends to improve responses, contributing to gold-medal IMO performance in 2025
- [ ] Thinking longer improves consistency across repeated runs but decreases peak accuracy on any single attempt

**Explanation**: Inference time scaling (allocating more "thinking time" per problem) is described as a key technique. OpenAI's o1 was the first "reasoning" model to explicitly trade thinking time for accuracy. Using these techniques, both OpenAI and Google DeepMind achieved gold-medal performance at the 2025 International Mathematical Olympiad.

### Question 5
How did AI performance on real GitHub issues (SWE-bench) change between 2024 and 2025?

- [ ] It improved from 5% to 25%, driven mainly by better prompting techniques rather than model improvements
- [x] It jumped from about 15% to about 74%, driven by combining better models with tool use
- [ ] It remained roughly the same at around 50%, suggesting GitHub issues require human-level understanding that current models lack
- [ ] It improved from 30% to 45%, with most gains coming from fine-tuning models specifically on open-source codebases

**Explanation**: The chapter highlights that on SWE-bench — which tests AI against real open-source GitHub issues — AI systems went from solving just 15% of problems in 2024 (Claude 3 Opus) to 74% in 2025 (Tools + Claude 4 Opus). This dramatic improvement came from combining better models with tool use.

---

# Foundation Models

### Question 1
What is the core idea behind foundation models, as distinguished from the traditional approach to AI development?

- [ ] Building one highly specialized model per task using hand-labeled data
- [x] Training a single large-scale model on massive data that serves as a general "foundation" and is later fine-tuned for specific tasks
- [ ] Combining many small specialized models into one system at deployment time
- [ ] Using reinforcement learning exclusively instead of supervised learning

**Explanation**: Foundation models represent a paradigm shift: instead of training a specialized model for each task (which was bottlenecked by labeled data and couldn't transfer knowledge), a large model is pre-trained on massive unlabeled data via self-supervised learning, and then adapted to specific downstream tasks through fine-tuning or prompting.

### Question 2
What is the key technical innovation that makes foundation model pre-training possible?

- [ ] Reinforcement learning from human feedback (RLHF)
- [ ] Generative adversarial networks (GANs)
- [x] Self-supervised learning (SSL), which uses the inherent structure of data to create training signals without requiring human labels
- [ ] Transfer learning from pre-existing specialized models

**Explanation**: Self-supervised learning is the "key technical innovation" that enables pre-training. Rather than requiring expensive human-labeled data, SSL leverages the structure of the data itself — for example, predicting a hidden part of an image from the visible part, or predicting the next word in a sentence. This allows models to learn from the vast amounts of unlabeled data available on the internet.

### Question 3
What is the difference between a foundation model and a frontier model?

- [ ] They are identical concepts — the terms are interchangeable
- [ ] Foundation models are always more advanced than frontier models
- [x] Frontier models are the most advanced in their domain; most are also foundation models, but some (like AlphaFold) are frontier without being foundational because they're specialized for a single task
- [ ] Frontier models are open-source while foundation models are proprietary

**Explanation**: Frontier models represent the cutting edge of AI capabilities in their respective domains. While many frontier models (like Claude or GPT-4) are also foundation models, this isn't always the case. AlphaFold is a frontier model in protein structure prediction but isn't considered a foundation model because it serves one specific task rather than being a general foundation for multiple applications.

### Question 4
Which of the following is NOT identified in the chapter as a safety challenge unique to the foundation model training process?

- [ ] Self-supervised pre-training means we have limited control over what the model learns
- [ ] The adaptation process needs to reliably preserve safety properties established during pre-training
- [x] Foundation models require too much human-labeled data, creating opportunities for malicious labelers to introduce biases
- [ ] The massive scale of training makes it difficult to thoroughly understand or audit what the model has learned

**Explanation**: The chapter identifies three safety challenges of foundation model training: (1) limited control over what is learned during self-supervised pre-training, (2) preserving safety properties through adaptation, and (3) difficulty in auditing due to massive scale. The wrong answer reverses a key point — foundation models were specifically enabled by *not* requiring human-labeled data (using self-supervised learning instead).

### Question 5
How does generalization in foundation models differ from generalization in traditional AI systems, and why is this a safety concern?

- [ ] Foundation models cannot generalize at all — they only memorize training data
- [ ] Foundation models generalize better and this makes them inherently safer
- [x] Foundation models can generalize capabilities across domains in surprising ways, but this generalization of capabilities often happens without a corresponding generalization of goals or constraints
- [ ] Foundation models generalize only within a single narrow domain, just like traditional AI

**Explanation**: The chapter highlights a critical asymmetry: foundation models can generalize their *capabilities* across domains in surprising ways (e.g., a text model developing coding ability), but the *goals and safety constraints* don't necessarily generalize along with them. A model might generalize its ability to manipulate text in unexpected ways without maintaining the safety constraints we intended. This is flagged as a key concern explored further in the chapter on goal misgeneralization.

---

# Defining and Measuring AGI

### Question 1
Why does the chapter argue that consciousness-based definitions of intelligence are less useful for AI safety work?

- [ ] Because consciousness has been conclusively proven to not exist in AI systems
- [ ] Because conscious AI systems are always safe
- [x] Because consciousness is even harder to define than intelligence, may not be linked to intelligence, and a system doesn't need to be conscious to cause harm — what matters for safety is what a system can *do*
- [ ] Because all major AI researchers agree that consciousness is irrelevant to AI

**Explanation**: The chapter argues that consciousness-based approaches (like Searle's Chinese Room) are less actionable for safety because: (1) consciousness is even harder to define than intelligence, (2) intelligence and consciousness may not be linked — a system could be intelligent without being conscious or vice versa, and (3) whether an AI is conscious has little bearing on its ability to make high-impact or dangerous decisions. A system doesn't need to be conscious to cause harm.

### Question 2
In the two-dimensional framework for defining AGI presented in the chapter, what do the two axes represent?

- [ ] Speed and accuracy
- [ ] Training cost and model size
- [x] Capability (how well a system performs specific cognitive tasks) and generality (the percentage of cognitive domains where it achieves expert-level performance)
- [ ] Autonomy and intelligence

**Explanation**: The framework uses two continuous axes: *capability* measures depth — how well a system executes individual cognitive tasks, from 0% to superhuman. *Generality* measures breadth — the percentage of cognitive domains (from the CHC framework's ten domains) where a system achieves expert-level performance (roughly 80th-90th percentile). Together they allow concrete statements like "this system outperforms 85% of humans in 30% of cognitive domains."

### Question 3
According to the chapter's definitions, what distinguishes Transformative AI (TAI) from Artificial General Intelligence (AGI)?

- [ ] TAI is always more capable than AGI
- [ ] TAI requires consciousness while AGI does not
- [x] AGI is defined by cognitive performance (expert-level across most domains), while TAI is defined by *impact potential* — it could mean moderate capability across many tasks OR exceptional capability on a few critical domains like automated ML R&D
- [ ] AGI refers to future systems while TAI refers to current systems

**Explanation**: The chapter defines AGI as matching a well-educated adult's cognitive versatility (80-90th percentile across 80-90% of domains). TAI, by contrast, is defined by its potential to trigger economic/social transitions comparable to the agricultural or industrial revolution. Crucially, TAI could be achieved with moderate capability across many domains OR exceptional capability on just a few critical ones — it's about impact, not cognitive architecture.

### Question 4
What is the (t,n)-AGI framework, and how does it offer an alternative way to think about AGI?

- [ ] It measures AGI by the number of tasks (t) and neurons (n) in the model
- [x] It defines AGI through time and scale: a system is t-AGI if it can outperform a human expert given time frame 't', and (t,n)-AGI if it can outperform 'n' experts working together for time 't'
- [ ] It defines AGI by the number of training tokens (t) and parameters (n) used
- [ ] It measures AGI by temperature (t) and number of samples (n) during inference

**Explanation**: The (t,n)-AGI framework defines intelligence through task completion horizons. A "one-second AGI" exceeds expert capability on one-second cognitive tasks. A "one-year AGI" would beat humans at basically everything, since most projects can be divided into shorter sub-tasks. A superintelligence could be framed as a (one year, eight billion)-AGI — outperforming all eight billion humans coordinating for a year.

### Question 5
Which of the following is a criticism of the capability-generality percentage framework for measuring AGI?

- [ ] It is too qualitative and doesn't allow for any numerical measurement
- [x] CHC-based human psychometric tests may miss capabilities universal in humans but lacking in AI (coverage bias), and percentage scores can misleadingly imply linear progress toward AGI
- [ ] It focuses too heavily on consciousness rather than observable behavior
- [ ] It only measures a single dimension of intelligence

**Explanation**: The chapter presents several criticisms: (1) coverage bias — CHC derives from human individual differences and may miss capabilities universal in all humans that AI lacks (e.g., robust object permanence); (2) arbitrary thresholds — human percentile cutoffs may not translate to machines; (3) non-linear progress — scores like "57% AGI" misleadingly suggest linear progress when final capabilities may be disproportionately hard; (4) species-specific risk — non-human-like AI could pose transformative risks despite low scores on human-centric tests.

---

# Leveraging Scale

### Question 1
What is the "bitter lesson" of AI research, as described by Richard Sutton?

- [ ] That AI research is fundamentally impossible and will never succeed
- [ ] That small, efficient models always outperform large ones
- [x] That general methods leveraging massive computation consistently beat human-engineered domain knowledge, even though researchers repeatedly try encoding expertise first
- [ ] That only biologically-inspired approaches can achieve general intelligence

**Explanation**: The bitter lesson, articulated by Richard Sutton, is that across 70 years of AI research, general methods that leverage computation have ultimately proven most effective — by a large margin. Researchers repeatedly tried to build domain knowledge into agents (hand-crafted chess strategies, phonetics-based speech recognition, etc.), which helped initially but plateaued. Breakthrough progress consistently came from scaling computation through search and learning.

### Question 2
What are the four key variables in scaling laws for AI models?

- [ ] Architecture, learning rate, batch size, and epochs
- [ ] GPUs, researchers, electricity, and time
- [x] Compute (total FLOPs during training), parameters (model size), data (training examples/tokens), and accuracy (inverse of loss)
- [ ] Pre-training, fine-tuning, prompting, and deployment

**Explanation**: Scaling laws describe empirical relationships between these four variables: compute (total floating-point operations), parameters (the adjustable numbers in a model — roughly "model size"), data (training examples measured in tokens for LLMs), and accuracy (how well the model performs, inverse of loss). These relationships help labs make engineering decisions about resource allocation.

### Question 3
What key finding did the "Chinchilla" research (Hoffmann et al., 2022) reveal about optimal training?

- [ ] That models should always be as large as possible regardless of data
- [x] That optimal training requires roughly 20 tokens of data per parameter — about 10x more data than earlier scaling laws suggested — meaning previous large models were undertrained relative to their size
- [ ] That data is irrelevant and only model size matters
- [ ] That training should stop after a fixed number of epochs regardless of model size

**Explanation**: The Chinchilla research showed that optimal training requires approximately 20 tokens of data per parameter, which was about 10x more data than early scaling laws from Kaplan et al. (2020) suggested. This meant that many previous large models had been undertrained — they were too big for the amount of data they were trained on. This fundamentally changed how labs allocated resources between model size and training data.

### Question 4
What is the difference between the "strong" and "weak" scaling hypotheses?

- [ ] The strong hypothesis says scaling will never work; the weak hypothesis says it sometimes works
- [ ] The strong hypothesis applies to language models; the weak hypothesis applies to vision models
- [x] The strong hypothesis says simply scaling existing architectures with more compute and data is sufficient for transformative AI; the weak hypothesis says scale will be the primary driver but targeted architectural/algorithmic improvements will also be needed
- [ ] The strong hypothesis is supported by evidence; the weak hypothesis is purely theoretical

**Explanation**: The strong scaling hypothesis proposes that we already have the fundamental components needed for transformative AI — it's just a matter of scaling them up. The weak scaling hypothesis agrees that scale is the primary driver but holds that we'll also need targeted (not fundamental) architectural and algorithmic improvements to overcome specific bottlenecks.

### Question 5
Why does the chapter argue that debates about scaling laws alone miss an important part of the picture?

- [ ] Because scaling laws have been disproven
- [ ] Because only theoretical research matters for AI progress
- [x] Because scaling laws only predict foundation model capabilities — they don't account for improvements in "scaffolding" (chain-of-thought, tool use, retrieval, multi-model systems) that can dramatically boost overall capability even if core model scaling stops
- [ ] Because scaling laws only apply to image generation models

**Explanation**: The chapter makes a crucial distinction: scaling laws track the performance of a single foundation model, but overall AI capability also depends on external techniques — tool use, chain-of-thought prompting, inference time scaling, retrieval-augmented generation, and multi-model systems. These "unhobbling" or "scaffolding" improvements can continue advancing capabilities even if core model scaling plateaus. For instance, the same base model's benchmark score can jump dramatically through reasoning-specific training and extended thinking.

---

# Forecasting Timelines

### Question 1
Why does the chapter argue that predicting AI timelines matters for safety, rather than being merely an academic exercise?

- [ ] Because investors need accurate predictions to make money
- [ ] Because AI researchers want to plan their careers
- [x] Because the difference between TAI arriving in 10 years vs. 50 years fundamentally changes which safety strategies are viable — short timelines demand solutions that work with current systems, while long timelines allow for fundamental research
- [ ] Because governments need to plan tax revenue from AI companies

**Explanation**: The chapter frames forecasting as directly safety-relevant: if TAI arrives by 2030, we need safety solutions that work with current systems and scale quickly — no time for slow theoretical research. If it's 2050, there's breathing room for fundamental alignment research, robust governance frameworks, and trustworthy evaluation methods. The timeline determines the viable strategy space.

### Question 2
What is "effective compute" and why does it grow faster than any single input?

- [ ] It is the total number of GPUs owned by a company
- [ ] It is a theoretical maximum that cannot be measured
- [x] It is the product of software efficiency, hardware efficiency, and number of chips — because each factor can improve independently, the total compounds faster than any single input
- [ ] It is the compute used only during inference, not training

**Explanation**: Effective compute = software efficiency x hardware efficiency x number of chips. The key insight is that each factor improves independently: better algorithms (software ~3x/year), faster chips (hardware ~1.35x/year), and more chips produced (production ~2.3x/year). When all three improve simultaneously, effective compute compounds much faster than any single factor. The car analogy: it's like measuring travel distance by combining how many cars you have, how fast each goes, and how efficiently you drive.

### Question 3
According to the chapter, approximately when might high-quality public text data be exhausted at current scaling rates?

- [ ] It was already exhausted in 2023
- [x] Between 2026 and 2032, with the indexed web containing roughly 500 trillion tokens and consumption scaling at about 4x per year
- [ ] Not until at least 2050
- [ ] Text data is unlimited and will never run out

**Explanation**: The chapter states that the indexed web contains roughly 500 trillion tokens of text (after deduplication), with the largest 2024 models training on about 15 trillion tokens. At ~4x/year scaling, projections indicate exhaustion of high-quality public text data between 2026 and 2032. However, three potential escape routes exist: multimodal data, synthetic data, and task-based/self-play learning.

### Question 4
What is the range of uncertainty in biological anchors estimates for the compute needed for general intelligence?

- [ ] A factor of 2x (between $10^{28}$ and $10^{29}$ FLOP)
- [ ] A factor of 100x
- [x] Twelve orders of magnitude — from ~$10^{28}$ FLOP (learning during a human lifetime) to ~$10^{41}$ FLOP (total compute across evolutionary history)
- [ ] There is virtually no uncertainty — estimates converge on $10^{35}$ FLOP

**Explanation**: The biological anchors approach uses the human brain as a proof of concept but yields dramatically different estimates depending on the reference process. A lower bound uses compute from skill learning during a human lifetime (~$10^{28}$ FLOP), while an upper bound accounts for all compute across evolutionary history (~$10^{41}$ FLOP). That's twelve orders of magnitude of uncertainty — "like not knowing if something costs one dollar or a trillion dollars."

### Question 5
Which of the following is NOT listed as a potential "escape route" for the data wall?

- [ ] Multimodal data (images, video) that could 3-10x the effective data supply
- [ ] Synthetic data generated by AI itself
- [x] Purchasing proprietary datasets from corporations and governments
- [ ] Task-based self-play reinforcement learning that generates training data through environment interaction

**Explanation**: The chapter identifies three escape routes for the data constraint: (1) multimodal data — the internet's ~10 trillion images and ~10 trillion seconds of video could multiply effective data supply; (2) synthetic data — AI generating its own training data; and (3) task-based learning through self-play RL, generating data through environment interaction (like AlphaZero). Purchasing proprietary datasets is not mentioned as one of the escape routes.

---

# Takeoff

### Question 1
What is the key distinction between "takeoff speed" and "AI timelines"?

- [ ] They are the same concept described with different words
- [ ] Timelines refer to hardware development while takeoff speed refers to software
- [x] Timelines tell us *when* transformative AI might arrive; takeoff speed tells us what happens *after* it arrives — whether capability and impact increase gradually over years or explosively over days/weeks
- [ ] Takeoff speed is about deployment speed while timelines are about training duration

**Explanation**: The chapter carefully distinguishes these: AI timelines address when advanced AI will be developed. Takeoff speed addresses what happens next — does AI capability and societal impact ramp up gradually over months/years (slow takeoff) or explode over days/weeks (fast takeoff)? A system could arrive on a long timeline but still have a fast takeoff once it reaches a critical capability threshold.

### Question 2
What type of mathematical growth characterizes a fast takeoff scenario?

- [ ] Linear growth — capabilities increase by the same fixed amount each period
- [ ] Logarithmic growth — capabilities increase rapidly at first, then slow down
- [x] Superexponential or hyperbolic growth — the growth *rate itself* increases over time (doubling every year, then every month, then every week)
- [ ] Exponential growth at a constant rate

**Explanation**: Fast takeoff is characterized by superexponential or hyperbolic growth, where the growth rate itself accelerates. Rather than capabilities doubling at a constant interval (exponential), they might double every month, then every week, then every day. This could be driven by recursive self-improvement feedback loops. Note that even regular exponential growth (constant doubling time) is classified under *slow* takeoff in this framework.

### Question 3
What is a "hardware overhang" and why might it matter for takeoff dynamics?

- [ ] When hardware becomes obsolete faster than it can be manufactured
- [x] When sufficient computing hardware exists to run many powerful AI systems, but the software hasn't been developed yet — once the software catches up, many powerful AI copies could exist almost immediately
- [ ] When hardware costs exceed the economic value AI can produce
- [ ] When one company monopolizes all available computing hardware

**Explanation**: A hardware overhang occurs when computing capacity has been built up but the algorithms to fully exploit it haven't arrived yet. This "stored potential" means that once the right software exists, there wouldn't just be one powerful AI — there could immediately be many, because the hardware to run them already exists. This is an argument for why takeoff might be more sudden than hardware scaling alone would suggest.

### Question 4
What is the "automating research" argument for accelerating AI takeoff, as described by Ajeya Cotra?

- [ ] That AI will replace all human researchers by 2030
- [ ] That research automation is impossible because AI lacks creativity
- [x] That each generation of AI models handles harder tasks, so humans delegate more work to them, making the next generation arrive faster — creating a self-reinforcing loop that accelerates progressively until AI does all ML R&D at superhuman speed
- [ ] That AI will only automate administrative tasks in research, not core scientific work

**Explanation**: Cotra describes a progressive feedback loop: initially, human researchers delegate a small fraction of work to LLMs. The next generation handles harder tasks, so more work gets delegated, making the following generation arrive even faster. Each round accelerates the field more than the last. Eventually, the process transitions from AI assistants doing most research to AI doing *all* research at superhuman speeds — potentially leading to a recursive intelligence explosion.

### Question 5
According to the chapter, why do the majority of AI experts agree on AI risks while sometimes being *reported* as disagreeing?

- [ ] Because they actually do fundamentally disagree about whether AI poses any risks at all
- [ ] Because journalists fabricate expert disagreements for attention
- [x] Because the real disagreements are in the nuances — specifically whether problems will be noticeable and fixable in time (slow takeoff) or too fast for us to respond (fast takeoff) — but these nuanced differences sometimes get misreported as fundamental disagreement about whether risks exist
- [ ] Because experts only disagree about which company will build AGI first

**Explanation**: The chapter emphasizes that "the majority of experts, researchers and engineers agree that AI will pose risks and it should be developed responsibly." The actual disagreements concern nuances of response strategy — whether problems will emerge gradually enough to fix iteratively (as Andrew Ng suggests with the airplane analogy) or whether they might arrive too fast to correct. These nuanced differences are "sometimes misreported as AI experts disagree on AI risks."

---

# Synthesis: Cross-Chapter Multiple Choice

### Question 1
The chapter describes several techniques that boost AI performance beyond what the base foundation model can achieve alone. Which combination of techniques best represents what the chapter calls "unhobbling" or "scaffolding"?

- [ ] Increasing model parameter count and training data volume
- [ ] Using better GPU hardware and increasing training duration
- [x] Chain-of-thought prompting, tool use (calculators, search, code interpreters), inference time scaling (letting models think longer), and retrieval-augmented generation
- [ ] Fine-tuning on labeled data and reinforcement learning from human feedback

**Explanation**: The chapter distinguishes between *scaling* the base model (more parameters, data, compute) and *scaffolding/unhobbling* — techniques applied on top of or around an existing model. The latter includes chain-of-thought prompting, tool use, inference time scaling, RAG, and multi-model systems. The chapter argues these are a separate (and sometimes underappreciated) source of capability gains that can continue advancing even if core model scaling plateaus.

### Question 2
Consider this progression: AlphaGo (2016) -> MuZero (2020) -> Voyager/GPT-4 in Minecraft (2023) -> SIMA-2 (2025). What broader trend does this sequence illustrate about AI development?

- [ ] A shift from language-based AI to vision-based AI
- [ ] A trend toward smaller, more efficient models
- [x] A progression from superhuman narrow capability (one game), to generality without rules (multiple games), to open-ended planning via LLMs, to learning and transferring skills across many games — reflecting the move along both capability and generality axes simultaneously
- [ ] A demonstration that game-playing AI has no relevance to real-world applications

**Explanation**: This progression maps directly onto the chapter's capability-generality framework. AlphaGo was superhuman but narrow (high capability, low generality). MuZero expanded to multiple games without needing rules. Voyager showed LLMs could plan in open-ended environments. SIMA-2 transfers learned abilities across games. Each step moves further along both the capability and generality dimensions — the exact trajectory the chapter describes for AI development overall.

### Question 3
The chapter presents the "bitter lesson" and then discusses scaling laws. How are these two concepts related?

- [ ] They are unrelated — the bitter lesson is about philosophy while scaling laws are about engineering
- [ ] The bitter lesson disproves scaling laws
- [x] The bitter lesson provides the historical/philosophical foundation (general methods + compute beat hand-crafted knowledge), and scaling laws provide the empirical quantification of exactly *how* performance improves as you scale compute, data, and parameters
- [ ] Scaling laws are the mathematical proof that the bitter lesson is wrong

**Explanation**: The bitter lesson is the high-level historical observation that compute-leveraging methods consistently win. Scaling laws are the empirical formalization of this — they quantify the precise relationships between inputs (compute, parameters, data) and outputs (accuracy/loss). Together, they form the case for why labs invest billions in scale: the bitter lesson says scale wins, and scaling laws tell you how much performance you'll get for each dollar of additional compute.

### Question 4
If someone told you "AI has reached 57% AGI according to the framework in the chapter," which of the following critiques would the chapter itself consider valid?

- [ ] This is a perfectly precise and meaningful statement — no critiques apply
- [ ] The only issue is that 57% seems too high
- [x] The percentage can misleadingly imply linear progress when final capabilities may represent disproportionately hard bottlenecks, and CHC-based human tests may miss capabilities universal in humans but absent in AI
- [ ] The framework doesn't use percentages at all, so this statement makes no sense

**Explanation**: The chapter explicitly presents this counter-argument in the "Arbitrary thresholds aggregated and framed as a misleading percentage" section. Key critiques include: percentage scores misleadingly imply linear progress (the remaining 43% might be disproportionately harder); CHC coverage bias may miss universal human capabilities; and benchmark scores don't align with general perception — LLMs scoring 90% on tests still disappoint on tasks an educated adult would handle easily.

### Question 5
How does the concept of "autonomy levels" (0-5) relate to the capability-generality framework for AGI?

- [ ] They are the same thing measured differently
- [ ] Higher capability always means higher autonomy
- [x] They are deliberately separated: capability/generality describe what a system *can do*, while autonomy describes how it's *deployed* with respect to human oversight — a highly capable system might be safely deployed at Level 2 but dangerous at Level 5
- [ ] Autonomy levels replace the capability-generality framework in practice

**Explanation**: The chapter is explicit that these dimensions should be considered separately. Capability and generality are inherent to the system. Autonomy is a deployment choice about human oversight. The same system scoring 90% on 80% of domains could be safely used as a consultant (Level 2) but dangerous as a fully autonomous agent (Level 5). Higher capability "unlocks" higher autonomy levels — but having the capability doesn't mean you should use maximum autonomy.

### Question 6
The chapter discusses multiple feedback loops that could accelerate AI development. Which of the following correctly identifies TWO distinct feedback loops described in the chapter?

- [ ] The marketing loop (better AI -> more users -> more revenue -> better AI) and the academic loop (more papers -> more citations -> more funding -> more papers)
- [x] The investment loop (better AI -> larger economic role -> more investment -> more compute -> better AI) and the automation loop (better AI -> automates more AI research -> better algorithms/hardware -> even better AI)
- [ ] The hardware loop (better chips -> faster training -> more chips) and the data loop (more data -> better models -> more data)
- [ ] The regulation loop (more regulation -> safer AI -> less regulation) and the competition loop (more companies -> faster progress -> fewer companies)

**Explanation**: The chapter identifies these two specific feedback loops from Tom Davidson's compute-centric framework: (1) the *investment* feedback loop — AI plays a larger economic role, driving more investment, increasing compute, increasing capabilities; and (2) the *automation* feedback loop — more capable AI automates more AI R&D work (better algorithms, chip design), directly increasing AI capability, which automates even more R&D. These loops can compound to create either gradual or rapid acceleration.

### Question 7
What is the relationship between effective compute growth and the three factors that compose it, as of 2025?

- [ ] All three factors grow at the same rate of about 2x per year
- [ ] Hardware efficiency is by far the fastest-growing factor
- [x] Algorithmic/software efficiency grows fastest (~3x/year), followed by chip production (~2.3x/year), with hardware efficiency growing slowest (~1.35x/year) — but all three multiply together
- [ ] Only chip production matters; the other factors are negligible

**Explanation**: The chapter provides specific growth rates: algorithmic efficiency ~3x/year (cutting compute needed for a given result), chip production ~2.3x/year, and hardware efficiency ~1.35x/year. Because these multiply together (effective compute = software efficiency x hardware efficiency x number of chips), the combined growth far exceeds any single factor. Notably, the *software* improvements — which receive less public attention than chip counts — are actually the fastest-growing component.

### Question 8
The chapter discusses several approaches to defining intelligence. Which pair of approaches does the chapter ultimately synthesize into its working definition?

- [ ] Consciousness-based (Searle's Chinese Room) and goal-achievement (Legg & Hutter)
- [ ] The Turing Test and process/adaptability views (Chollet)
- [x] Behaviorist/capabilities-focused approaches (focus on what systems can observably do) combined with psychometric measurement frameworks (CHC theory's concrete cognitive domains)
- [ ] Economic definitions (OpenAI's "economically valuable work") and philosophical definitions (consciousness debates)

**Explanation**: The chapter explicitly states its synthesis: "We adopt the behaviorist insight from Turing — primarily focusing on what systems can observably do. We use the psychometric tradition's concrete measurement framework from CHC theory." It acknowledges adaptability views but prioritizes final capabilities, and sets aside consciousness debates as not actionable for safety work. The result is the two-axis (capability x generality) framework measured across CHC cognitive domains.

### Question 9
Why might a slow takeoff scenario still be extremely challenging for safety, despite providing more time to respond?

- [x] Even a "slow" takeoff is described as potentially 10-100x faster than the Industrial Revolution, with GDP possibly growing 10-30% annually — fast enough that institutions and governance may struggle to keep pace
- [ ] A slow takeoff is not challenging at all — it gives us all the time we need
- [ ] Because slow takeoffs never actually happen according to the evidence
- [ ] Because slow takeoffs only affect developing countries

**Explanation**: The chapter quotes Paul Christiano describing slow takeoff as "similar to the Industrial Revolution but 10-100x faster." Even in this "slow" scenario, GDP might grow at 10-30% annually before accelerating further. The Industrial Revolution already caused massive societal upheaval over decades — compressing that by 10-100x still represents unprecedented speed of change. "Slow" is relative to *fast* takeoff (days/hours), not to normal human timescales.

### Question 10
Based on the chapter's discussion of training costs, infrastructure constraints, and effective compute, which statement best captures the overall feasibility outlook for continued scaling through 2030?

- [ ] Scaling is physically impossible beyond 2026 due to data and energy constraints
- [ ] Scaling faces no meaningful constraints and will continue effortlessly
- [x] Analysis suggests scaling through 2030 is feasible but will require unprecedented infrastructure (hundreds of billions of dollars per training run, gigawatts of power), and the real question is whether economic incentives justify it and whether infrastructure constraints can be overcome in time
- [ ] Scaling will continue only if entirely new computing paradigms (like quantum computing) are developed

**Explanation**: The chapter presents a nuanced picture: current trajectories point to training runs requiring hundreds of billions of dollars and gigawatts of power by 2030 (comparable to running a small city). Analysis suggests this isn't physically impossible — there's headroom in hardware efficiency, chip production can scale, power plants can be built. But the constraints are real: chip supply chains are concentrated (TSMC, ASML), new fabs take 4-5 years to build, and each 10x compute increase adds roughly a year of lead time. The chapter frames it as technically feasible but contingent on economic incentives and infrastructure buildout.

---

# Synthesis: Free Response Questions

### Free Response 1
Explain how the chapter's two-dimensional AGI framework (capability x generality) changes the way we should think about AI safety compared to treating AGI as a binary yes/no threshold. In your answer, discuss why continuous measurement matters and give an example of how a system that hasn't reached "full AGI" could still pose significant safety risks.

**Context**: The evaluator should look for: (1) understanding that the framework replaces a binary "AGI or not" with continuous axes; (2) appreciation that this enables tracking progress, setting regulatory thresholds, and identifying risks *before* reaching human-level; (3) a concrete example of how partial generality combined with high capability in specific domains (e.g., automated ML R&D, persuasion, cyber-offense) could pose risks well before "100% AGI"; (4) bonus if they mention the TAI definition — which shows moderate capability across many domains OR exceptional capability in a few critical ones could be transformative. The answer should also ideally note the criticisms — that percentage scores can be misleading and that non-human-like capability profiles may pose risks that human-centric benchmarks miss.

**Short Answer**: The binary AGI framing leads to endless debates about whether something "counts" as AGI, delays action because risks seem distant until the threshold is crossed, and misses that a system excelling at 30% of cognitive domains at superhuman level could already be transformative. The continuous framework lets us set specific, measurable thresholds for regulation and safety measures along the way. For example, a system achieving superhuman capability in code generation and scientific research (just 2-3 domains) could automate AI R&D and trigger recursive improvement — this is the TAI scenario with only ~20% generality but extreme capability in critical areas. Safety planning needs to respond to capability profiles, not wait for a binary "AGI" label.

**Hint**: Think about why the chapter introduces *Transformative AI* as a separate concept from AGI — what does it mean that TAI can be achieved with high capability on just a few domains? What does that imply about when risks become real?

### Free Response 2
The chapter describes three sources of effective compute growth (software efficiency, hardware efficiency, chip production) and also discusses "scaffolding" improvements (tool use, inference time scaling, etc.). Explain how these different drivers of AI progress interact, and why understanding their independence matters for forecasting whether AI capabilities will plateau or continue advancing.

**Context**: The evaluator should look for: (1) correct identification of the three effective compute components and their approximate growth rates; (2) understanding that these multiply together (not add), so total growth exceeds any individual factor; (3) recognition that scaffolding/unhobbling is an *additional* capability driver on top of effective compute — it operates outside what scaling laws predict; (4) the key insight that capabilities can continue advancing even if one or more drivers plateau, because the others are independent — if chip production slows, algorithmic efficiency can compensate; if core model scaling plateaus entirely, scaffolding can still improve overall capability; (5) the implication that arguments like "scaling is hitting a wall" need to specify *which* factor is hitting a wall, because the others may continue.

**Short Answer**: Effective compute grows as the product of three independent factors: software efficiency (~3x/year), hardware efficiency (~1.35x/year), and chip production (~2.3x/year). Because they multiply, total effective compute grows far faster than any single factor. On top of this, scaffolding (tool use, chain-of-thought, inference time scaling, RAG) provides an entirely separate source of capability improvement that isn't captured by scaling laws at all. The independence matters because even if one factor plateaus — say, chip production hits supply chain limits — the others continue. And even if *all* core model scaling stops, scaffolding can continue advancing overall capability (the chapter shows benchmark scores jumping from ~4.5% to 25% purely through post-training techniques). This means claims about AI progress "hitting a wall" need to be very specific about which wall, because there are at least four independent mechanisms, all of which would need to plateau simultaneously for overall capability to stagnate.

**Hint**: Think about the car analogy from the chapter — more cars, faster cars, more efficient driving. What happens if one factor stalls but the others don't? And then consider: what about improvements *outside* the car entirely?

### Free Response 3
The chapter presents arguments for both slow and fast takeoff, along with several specific mechanisms (overhangs, the automation feedback loop, the intelligence explosion). Drawing on the material from the entire chapter — including current capabilities, scaling trends, and the nature of foundation models — construct the strongest case you can for why takeoff speed is one of the most consequential uncertainties in AI safety, and explain how different takeoff speeds demand fundamentally different safety strategies.

**Context**: The evaluator should look for: (1) a clear articulation of what takeoff speed means and why it's distinct from timelines; (2) concrete references to chapter material — e.g., how current feedback loops (investment, automation of R&D) already exist in early forms, how foundation models' emergent capabilities show unpredictable jumps, how overhangs could amplify transitions; (3) specific safety strategy differences — slow takeoff allows iterative testing, fixing, and governance development (Andrew Ng's airplane analogy), while fast takeoff requires getting safety right *before* deployment because there may be no time to fix problems; (4) connection to the broader framework — e.g., how the continuous capability-generality framework helps monitor progress in slow takeoff but may be less useful if there are discontinuous jumps; (5) appreciation of nuance — the chapter notes that even "slow" takeoff could be historically unprecedented in speed, and that the majority of experts agree on risks but differ on whether problems will be fixable in time. The best answers will synthesize across multiple sections rather than just summarizing the takeoff section.

**Short Answer**: Takeoff speed is arguably the most consequential uncertainty because it determines the *type* of safety work that's valuable. In slow takeoff, we can use the iterative approach — deploy systems, discover problems, fix them, repeat. Current practices like red-teaming, benchmark tracking along the capability-generality axes, and governance frameworks all assume we have time to observe and respond. The scaling laws and current feedback loops (investment driving compute, AI partially automating R&D) are consistent with accelerating but still gradual progress. However, several mechanisms could produce fast takeoff: hardware overhangs could mean one software breakthrough creates many powerful systems overnight; the automation feedback loop could accelerate as AI handles more R&D; and foundation models already show emergent capabilities that weren't predicted by scaling curves. In fast takeoff, we might only get one shot — safety measures need to be robust *before* deployment because a rapidly self-improving system may be impossible to correct after the fact. This is why Yudkowsky and others emphasize getting alignment right in advance, while Ng and others advocate for the iterative airplane-building approach. The honest answer is that we don't know which scenario we're in, which means hedging — pursuing both robust pre-deployment safety research *and* iterative testing infrastructure — is the rational strategy.

**Hint**: Think about Andrew Ng's airplane analogy versus the concerns of researchers like Yudkowsky and Hinton. What *assumption* makes each of their approaches reasonable, and how does takeoff speed determine which assumption is correct? Connect this back to what the chapter showed about current AI capabilities and the feedback loops already in motion.
