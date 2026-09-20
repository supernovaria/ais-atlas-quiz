# Run report — _selftest

Generated 2026-09-20T14:46:29.497Z by `pipeline.mjs report`. Tables per HANDOFF §5.

## Spawn / stage counts (cost proxy — per-call cost is unavailable, HANDOFF §8)

| stage | entries | failed |
|---|---|---|
| shard | 1 | 0 |
| dedupe | 1 | 0 |
| measure | 1 | 0 |
| queue | 1 | 0 |
| shuffle | 1 | 0 |
| score | 1 | 0 |
| validate | 10 | 8 |

## forecasting-timelines

| metric | value |
|---|---|
| target N | 4 |
| earns_question ideas | 3 |
| shards / pool size | 3 / 8 |
| candidates generated | 5 |
| dedupe: collapsed (critic calls saved) | 1 |
| first-draft R8 pass | 4/4 (100%) |
| first-draft R8+R9+1.6× pass | 4/4 (100%) |
| first-draft R5 matches | 0 (gate 0) |
| verdict split pass/rewrite/reject | 3/0/0 |
| failed-criteria histogram | none |
| provenance_verified false rate (D1) | 0/9 |
| explanation_true_standalone false (E8) | 0/3 |
| level agreement with generator | 2/3 |
| second critic passes invoked | 0 |
| adversary mean hit | 67% |
| adversary mean(hit − 1/k) | 0.417 (gate ≤0.15 FAIL) |
| adversary 4-option-only rate | 67% |
| adversary flagged (≥2/3 seeds) | 3/4 |
| curator | n/a — curate did not run |

## Adversary vs baseline

Baseline (current 40-question file, same toolless haiku agent): mean hit **98%**, mean(hit − 1/k) **0.733**, 4-option-only **98%**, flagged 39/40.

QUIZ-PLAN's "≥60%" is an API-era figure measured a different way and is **not** a valid comparator.

