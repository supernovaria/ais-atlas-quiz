# Defining and Measuring AGI

### Question 1
Two systems end up with identical expert-level scores across the same set of cognitive domains. One got there from a handful of demonstrations; the other required a billion training examples. A colleague argues: "the second system is less intelligent, so it is also the less worrying one to deploy." How should that argument be assessed?

- [x] The intelligence claim is defensible on a learning-efficiency account, but the deployment claim is not: what these two systems can do, not how they learned it, sets the risk.
- [ ] The intelligence claim is the mistaken step: needing a billion examples means the capability itself is shallower, so the matching scores overstate what it can really do.
- [ ] Both claims hold: a system that needs a billion examples has only memorised them, and cannot act outside that data, which is what makes it the safer deployment.
- [ ] Neither claim holds: intelligence is just what a system can do once trained, so two systems with matching scores are equally capable and equally risky.

**Explanation**: The adaptability account of intelligence - the efficiency with which a system turns experience and priors into skills - does rate the sample-hungry system as the less intelligent of the two, so the first half of the argument stands. The risk conclusion does not follow. If a system can perform dangerous tasks, it makes no difference whether it got there by efficient learning or by brute-force memorisation; the risks exist either way. The option that endorses both halves is the common form of this slip, letting the learning path rather than the resulting capability decide how worrying a system is. The option that rejects both halves overcorrects: final capability is what gets prioritised for safety, but the efficiency point is acknowledged, not discarded. (Defining and Measuring AGI → Case Studies)

### Question 2
A hospital deploys the same diagnostic AI system in two settings. In the first, it only flags anomalies for a radiologist who makes every final call. In the second, it orders follow-up tests and finalizes reports on its own, with a human reviewing a sample of cases afterwards. The system's measured capability is unchanged across the two settings. What follows about the risk each deployment carries?

- [x] Risk exposure differs between the settings even though the system is the same, because how much of the task the AI does alone is set at deployment, not by capability.
- [ ] The more autonomous setting is more dangerous in itself, because how much a system acts without oversight is part of what the system is, not of how it is used.
- [ ] The system is capable enough to run with light oversight, so keeping it under close human supervision wastes capability and is itself the less responsible option here.
- [ ] Both deployments carry the same risk, since capability is what determines how much harm a system can do, and the level of human oversight changes only who watches it work.

**Explanation**: Autonomy describes how a task is divided between a human and an AI at deployment; capability describes what the system can do. Holding capability fixed and changing only that division changes risk exposure, not the system. That is why a capable system deployed as a tool can be safer than the same system deployed as an agent. The option calling the more autonomous setting more dangerous in itself makes the change intrinsic to the system, when what moved was the deployment. The option saying both carry the same risk assumes danger tracks capability alone, which is the belief this separation exists to correct. And being capable enough for high autonomy unlocks it without obliging anyone to use it. (Defining and Measuring AGI -> Defining General Intelligence)

### Question 3
Suppose researchers predict that AI will reach human-level performance within the next decade, without specifying anything further. The same framework that treats capability and generality as continuous variables also stipulates fixed percentile and domain-coverage thresholds for terms like AGI. What follows about evaluating the researchers' prediction?

- [x] The prediction is evaluable only when pinned to a stipulated threshold - the continuous axes can describe how far a system has come, but only a cutoff says when it has "arrived".
- [ ] The prediction is unevaluable in principle, because a framework that treats intelligence as continuous cannot coherently define any moment when human-level has been reached.
- [ ] The prediction exposes an inconsistency in the framework, since stipulating a fixed threshold for AGI is incompatible with treating capability and generality as continuous variables.
- [ ] The prediction can be evaluated on the capability axis alone, since a system that reaches human-level depth on individual tasks has thereby covered the domains that generality counts.

**Explanation**: The framework is continuous precisely to avoid binary AGI debates, but a claim like "human-level within a decade" still has to resolve to a yes or no at some point, and only a stipulated cutoff supplies one - here, roughly 80-90th percentile capability across 80-90% of domains. Continuum and threshold are not in tension: the continuum describes the terrain, the threshold marks the point on it at which a claim like this becomes checkable. Distractor 1 reads the absence of one natural boundary as the absence of any boundary. Distractor 2 mistakes a cutoff layered on a continuum for a contradiction of it. Distractor 3 judges depth alone, when a human-level claim is a claim about breadth too. (Defining and Measuring AGI -> Defining General Intelligence)
