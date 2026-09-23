---
stage: review — critique a set of artifacts (Gemini, via scripts/gemini-review.mjs)
agent: gemini (external API)
model: chosen at run time from the models the key can list
placeholders: [subject, files, questions]
optional: []
reply: the review as the entire response
notes: >
  Gemini cannot read the repository. scripts/gemini-review.mjs attaches each
  listed file's contents after this prompt, delimited and labelled by path, and
  writes the response to disk. Same body as review.md.
---
{{> review-body}}

The full contents of every file listed above are attached after this message, each delimited and labelled with its path. You cannot open anything else; if a finding depends on a file you were not given, say so rather than guessing its contents.

Return the review as your entire response, in the format above.
