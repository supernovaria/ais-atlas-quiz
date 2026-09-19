# Forecasting Timelines

### Question 1
A colleague argues: "When people say the compute behind frontier models keeps growing, they just mean labs have more and faster chips — chip count is what's doing the work." Which reply identifies the substantive error in that account of effective compute?

- [x] Chip count, hardware efficiency and software efficiency are separate multiplied terms, so growth in one of them raises the total while the others sit still.
- [ ] Hardware and software efficiency gains are ways of counting the same chips as though the fleet had grown, so chip count is still the quantity that really matters.
- [ ] Chip production sets the ceiling for the other two, so growth in the total can only keep pace with the rate at which new chips are made.
- [ ] Chip count is the dominant term, so the two efficiency factors amount to second-order corrections that can shift the total only at the margin.

**Explanation**: Effective compute is the product of three terms — chip count, hardware efficiency, software efficiency — and each can move without the other two. That is why a doubling can come entirely from better algorithms with chip count unchanged, and why the total grows faster than any single input. The reply that recasts efficiency gains as counting the same chips "as though the fleet had grown" keeps the colleague's error intact: it collapses three multiplied terms back into one, so it still predicts that growth stalls when chip supply does. The reply that makes chip production a ceiling fails for the same reason — better software makes use of existing hardware. And the fleet analogy lists the three factors; it does not rank them. (Forecasting Timelines → Effective Compute)

### Question 2
A reading-group member picks their own figures for how fast investment, software efficiency, and hardware efficiency are improving, adds a figure for how much automation each order of magnitude of compute unlocks, multiplies them out, and announces: "There - that combined number is when transformative AI arrives." Which response best captures what the exercise has actually produced?

- [x] It checks whether their separate beliefs on each trend are mutually consistent; a surprising combined result is a signal to revisit one of the inputs.
- [ ] It applies the field's consensus growth rates, so its output is the expected arrival date rather than something particular to this person's beliefs.
- [ ] It converts individually reasonable inputs into a date that inherits their reasonableness, making the combined result the estimate to adopt.
- [ ] It compounds each input's uncertainty until the margins swamp the answer, which is why the whole procedure gives you a number too soft to act on.

**Explanation**: Plug your own numbers into a growth-and-automation model and what comes out is a consistency check on those numbers, not a forecast to adopt: if the implied future surprises you, that is a signal one of your inputs needs revisiting, not that you now hold a new prediction. The option treating the input rates as field consensus misreads the worked "if you think investment grows this fast AND software efficiency improves that fast" framing - those rates are placeholders for whatever you happen to believe, and the method works with any of them plugged in. The option about compounding error margins reverses their role: the width of the uncertainty is itself the informative output, and it is what stops any single combined number from being read as a date. (Forecasting Timelines)

### Question 3
A lab's synthetic-data pipeline turns out to produce text too repetitive to improve model reasoning, and the lab abandons that route. What does this failure establish about whether data availability will constrain scaling?

- [x] That the other routes are untouched, since they draw on different sources, so whether data binds still turns on how well they work.
- [ ] That scaling now meets a hard limit, since manufacturing text was the only way to add supply once the public stock is consumed.
- [ ] That self-play goes with it, since both routes rely on a model producing its own training examples and share the same defect.
- [ ] That data now caps scaling at whatever images and video can add, since the routes left both draw on human-produced material.

**Explanation**: The data wall's three escape routes run on different mechanisms: multimodal data taps images and video, synthetic data manufactures text under a quality condition, and task-based self-play generates data by interacting with an environment that supplies its own rules and success signal. So one route failing leaves the other two where they were; whether data constrains scaling still turns on how well those alternatives work, and the text is candid that self-play in particular remains speculative. The self-play option is the closest miss — it treats self-play and synthetic text as a single mechanism because both are machine-generated, when self-play data is disciplined by the environment rather than by the model's own writing. The images-and-video option forgets that self-play needs no human-produced examples. (Forecasting Timelines → Training Data)
