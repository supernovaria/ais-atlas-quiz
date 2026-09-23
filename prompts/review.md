---
stage: review — critique a set of artifacts (Opus subagent)
agent: general-purpose
model: opus
placeholders: [subject, files, questions, out]
optional: []
reply: OK <path> | FAIL <reason>
notes: >
  Same body as review-gemini.md, via the shared partial, so two reviewers see the
  same request and differ only in delivery. The subagent reads the files itself.
---
{{> review-body}}

Read every file listed above yourself, from the working directory `{{workdir}}`. Also state your exact model ID in the first line of the review.

Write your review to exactly: `{{out}}`

Reply with one line only: `OK {{out}}` or `FAIL <one-clause reason>`. Nothing else.
