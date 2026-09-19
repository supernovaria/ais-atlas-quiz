#!/usr/bin/env node
// Question checker — RUBRIC.md §2 mechanical gates.
//
// Usage:
//   node scripts/check-questions.mjs [file]            all tiers, human report
//   node scripts/check-questions.mjs [file] --json     machine report
//   node scripts/check-questions.mjs [file] --measurements <out.json>
//   node scripts/check-questions.mjs --selftest        reproduce RUBRIC Appendix A
//
// Exit 0 clean, 1 on any tier-1/tier-2 hard failure. Tier 1b and tier 3 warn only.

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseChapterMarkdown } from '../src/quizParser.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_FILE = join(ROOT, 'public/questions/ch1-capabilities.md');
const CHAPTER_DIR = resolve(ROOT, '../atlas-audio-read-along/dist/chapters/v1/capabilities');

// ---------------------------------------------------------------- thresholds

export const GATES = {
  keyLongest: 0.35,          // §2.3.1
  keyExtremum: 0.60,         // §2.3.1
  meanRatio: [0.90, 1.10],   // §2.3.1
  r8: [0.80, 1.20],          // R8
  r9Gap: 15,                 // R9
  spread: 1.6,               // R9 closing rule
  optionMin: 2,              // R2 as amended 2026-09-18 (PIPELINE §8)
  optionMax: 5,
  dupOverlap: 0.70,          // R4
};

// R5. Appendix A reports two counts: 12 stems on the "narrow" family and 16
// containing "chapter" at all. These four reproduce the 12 exactly.
const R5_NARROW = [
  /according to the (chapter|text|textbook|section|author|atlas)/i,
  /(what|which|why|how) does the (chapter|text|section|author)\s+(identify|argue|describe|say|state|claim|present|define|discuss|list|mention|call)/i,
  /the (chapter|text|section) (identifies|argues|describes|states|claims|presents|discusses|lists|mentions|defines)/i,
  /as (described|discussed|presented|identified|defined|stated|mentioned) (in|by) the (chapter|text|section)/i,
];

// The fifth R5 regex. Warned, not gated: it fires on both of R5's own
// documented exemptions — including Chapter Review Q4, which the rubric calls
// the best question in the file. Gating on it would reject a §10 exemplar.
const R5_LOOSE = [/in the (chapter|text|section)('s)?\b/i];

// D4. The rubric names the list prosaically ("words like …"); this is that list
// plus `cannot`, which reproduces Appendix A's 22/120 distractors exactly.
// See selftest() on why the 3/40 keys row does not reproduce.
const ABSOLUTES = [
  /\balways\b/i, /\bnever\b/i, /\bentirely\b/i, /\bexclusively\b/i,
  /\bconclusively\b/i, /\bimpossible\b/i, /\bcannot\b/i, /\bno\b[^.]*\bat all\b/i,
];

// D10's hedge list. This is the checker's list, and it is NOT identical to the
// one RUBRIC D10 prints in parentheses — the same situation as D4 above, recorded
// rather than quietly reconciled.
//
//   both:         tends to, often, may, typically, largely
//   rubric only:  roughly, approximately, can, primarily, about
//   checker only: might, could, sometimes, generally, usually, likely, broadly,
//                 somewhat, partly
//
// This list stays as-is because `hedge_counts` is already passed into the critic
// and `pipeline.mjs validate` byte-compares those numbers against verdicts;
// re-defining the list would silently change measurements in circulation. The
// rubric's `can` and `about` are also too polysemous to regex safely ("can be
// measured" vs "a tin can", "about 20 tokens" vs "a claim about scaling").
// Finding for RUBRIC v2: state D10's list as a closed list and reconcile it with
// this one, exactly as D4 needs.
const HEDGES = [
  /\bmay\b/i, /\bmight\b/i, /\bcould\b/i, /\boften\b/i, /\bsometimes\b/i,
  /\bgenerally\b/i, /\btypically\b/i, /\busually\b/i, /\btends? to\b/i,
  /\blikely\b/i, /\blargely\b/i, /\bbroadly\b/i, /\bsomewhat\b/i, /\bpartly\b/i,
];

const STOPWORDS = new Set(`a an the and or but if then than that this these those
of in on at to for from by with without about into over under as is are was were
be been being do does did doing have has had having it its their his her they
them we you your our what which who whom when where why how not no nor so such
only own same too very can will just should now`.split(/\s+/));

// ------------------------------------------------------------------- helpers

const pct = (n, d) => (d === 0 ? 0 : n / d);
const fmtPct = (x) => `${(x * 100).toFixed(0)}%`;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const countMatches = (text, patterns) => patterns.filter((p) => p.test(text)).length;

// The Atlas site's heading slugify, for E4a anchors. Deliberately NOT
// quizParser's slugify: that one serves free-response refs and strips
// differently. Two slugs, two jobs — do not merge them.
export const atlasSlug = (text) =>
  text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

export function contentWords(stem) {
  return new Set(
    stem.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

export function overlap(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size);
}

// -------------------------------------------------------------- measurements

export function measure(q) {
  const key = q.options.find((o) => o.isCorrect);
  const distractors = q.options.filter((o) => !o.isCorrect);
  const keyLen = key ? key.text.length : 0;
  const dLens = distractors.map((o) => o.text.length);
  const allLens = q.options.map((o) => o.text.length);
  const meanD = mean(dLens);

  const maxLen = Math.max(...allLens);
  const minLen = Math.min(...allLens);
  const isLongest = key != null && keyLen === maxLen && allLens.filter((l) => l === maxLen).length === 1;
  const isShortest = key != null && keyLen === minLen && allLens.filter((l) => l === minLen).length === 1;

  const sorted = [...allLens].sort((a, b) => b - a);
  let extremumGap = 0;
  if (isLongest) extremumGap = keyLen - sorted[1];
  else if (isShortest) extremumGap = sorted[sorted.length - 2] - keyLen;

  const stemWords = contentWords(q.question);
  const singletons = [...stemWords].filter((w) => {
    const hits = q.options.filter((o) => new RegExp(`\\b${w}\\b`, 'i').test(o.text)).length;
    return hits === 1;
  });

  return {
    correct_len: keyLen,
    distractor_lens: dLens,
    mean_distractor_len: Number(meanD.toFixed(1)),
    len_ratio: meanD ? Number((keyLen / meanD).toFixed(2)) : null,
    correct_is_longest: isLongest,
    correct_is_shortest: isShortest,
    extremum_gap: extremumGap,
    max_over_min: minLen ? Number((maxLen / minLen).toFixed(2)) : null,
    r5_matches: R5_NARROW.filter((p) => p.test(q.question)).map((p) => p.source),
    r5_loose_matches: R5_LOOSE.filter((p) => p.test(q.question)).map((p) => p.source),
    mentions_chapter: /\bchapter\b/i.test(q.question),
    absolute_count_key: key ? countMatches(key.text, ABSOLUTES) : 0,
    absolute_count_distractors: distractors.filter((o) => countMatches(o.text, ABSOLUTES) > 0).length,
    hedge_counts: {
      key: key ? countMatches(key.text, HEDGES) : 0,
      distractors: distractors.map((o) => countMatches(o.text, HEDGES)),
    },
    stem_word_singletons: singletons,
    option_count: q.options.length,
    has_explanation: Boolean(q.explanation && q.explanation.trim()),
    explanation_words: q.explanation ? q.explanation.trim().split(/\s+/).length : 0,
    key_count: q.options.filter((o) => o.isCorrect).length,
  };
}

// --------------------------------------------------------------------- tiers

function tier1(items) {
  const fails = [];
  for (const { ref, q, m } of items) {
    if (m.key_count !== 1) fails.push({ ref, rule: 'R1', detail: `${m.key_count} keys` });
    if (m.option_count < GATES.optionMin || m.option_count > GATES.optionMax) {
      fails.push({ ref, rule: 'R2', detail: `${m.option_count} options` });
    }
    if (!m.has_explanation) fails.push({ ref, rule: 'R3', detail: 'no explanation' });
    if (/\b(all|none) of the above\b/i.test(q.options.map((o) => o.text).join(' '))) {
      fails.push({ ref, rule: 'R12', detail: 'all/none of the above' });
    }
  }

  // R4 — duplicate stems across the whole file.
  const seen = items.map(({ ref, q }) => ({ ref, words: contentWords(q.question), raw: q.question }));
  for (let i = 0; i < seen.length; i++) {
    for (let j = i + 1; j < seen.length; j++) {
      if (/<!--\s*duplicate-ok\s*-->/.test(seen[i].raw) || /<!--\s*duplicate-ok\s*-->/.test(seen[j].raw)) continue;
      const ov = overlap(seen[i].words, seen[j].words);
      if (ov >= GATES.dupOverlap) {
        fails.push({ ref: seen[i].ref, rule: 'R4', detail: `${fmtPct(ov)} overlap with ${seen[j].ref}` });
      }
    }
  }
  return fails;
}

function tier1b(items) {
  const warnings = [];
  if (!existsSync(CHAPTER_DIR)) {
    return [{ ref: '-', rule: 'E4a', detail: `chapter dir not found: ${CHAPTER_DIR}` }];
  }
  const anchors = new Set();
  for (const f of readdirSync(CHAPTER_DIR).filter((f) => f.endsWith('.md'))) {
    const text = readFileSync(join(CHAPTER_DIR, f), 'utf8');
    for (const line of text.split('\n')) {
      const h = line.match(/^#{2,6}\s+(.+?)\s*$/);
      if (h) anchors.add(atlasSlug(h[1]));
    }
  }
  for (const { ref, q } of items) {
    // E4 trailing citation: (Section → Sub-heading)
    const cite = q.explanation && q.explanation.match(/\(([^()]+?)\s*→\s*([^()]+?)\)\s*$/);
    if (!cite) continue;
    const slug = atlasSlug(cite[2]);
    if (!anchors.has(slug)) {
      warnings.push({ ref, rule: 'E4a', detail: `sub-heading "${cite[2].trim()}" → /${slug} does not resolve; degrade to section-only` });
    }
  }
  return warnings;
}

function tier2(items) {
  const fails = [];
  for (const { ref, m } of items) {
    if (m.len_ratio != null && (m.len_ratio < GATES.r8[0] || m.len_ratio > GATES.r8[1])) {
      fails.push({ ref, rule: 'R8', detail: `ratio ${m.len_ratio}, band ${GATES.r8[0]}–${GATES.r8[1]}` });
    }
    if ((m.correct_is_longest || m.correct_is_shortest) && m.extremum_gap > GATES.r9Gap) {
      fails.push({ ref, rule: 'R9', detail: `extremum gap ${m.extremum_gap} > ${GATES.r9Gap}` });
    }
    if (m.max_over_min != null && m.max_over_min > GATES.spread) {
      fails.push({ ref, rule: 'R9-spread', detail: `max/min ${m.max_over_min} > ${GATES.spread}` });
    }
    if (m.r5_matches.length) fails.push({ ref, rule: 'R5', detail: `${m.r5_matches.length} match(es)` });
    if (m.absolute_count_distractors > 1) {
      fails.push({ ref, rule: 'D4', detail: `${m.absolute_count_distractors} distractors carry an absolute (max 1)` });
    }
    // D10 — hedge-density tell. "The key must not carry more than one more hedge
    // than the median distractor." Promoted to a tier-2 hard failure on
    // 2026-09-19: the planted-tell control (runs/tier4-control/) measured this as
    // the second-strongest tell available to a test-wise reader, +62 points over
    // chance against length's +68 — yet length was gated three ways (R8, R9,
    // R9-spread) and this was gated nowhere, despite already being measured.
    // Keys hedge because they are true; distractors assert because they are
    // invented, which is why the asymmetry is as readable as length is.
    const hedgeMedian = median(m.hedge_counts.distractors);
    if (m.hedge_counts.key > hedgeMedian + 1) {
      fails.push({
        ref,
        rule: 'D10',
        detail: `key carries ${m.hedge_counts.key} hedges vs distractor median ${hedgeMedian} (max median+1)`,
      });
    }
  }
  return fails;
}

export function setLevel(items) {
  // §2.3.1 is defined over 4-option questions; 2- and 3-option questions are
  // reported separately (PIPELINE §9.3) because "key is longest" has a
  // different chance baseline at each k.
  const four = items.filter((i) => i.m.option_count === 4);
  const n = four.length;
  const longest = four.filter((i) => i.m.correct_is_longest).length;
  const shortest = four.filter((i) => i.m.correct_is_shortest).length;
  const meanKey = mean(four.map((i) => i.m.correct_len));
  const meanD = mean(four.flatMap((i) => i.m.distractor_lens));

  const totalDistractors = items.reduce((a, i) => a + i.m.distractor_lens.length, 0);
  const absD = items.reduce((a, i) => a + i.m.absolute_count_distractors, 0);
  const absK = items.filter((i) => i.m.absolute_count_key > 0).length;

  return {
    n_mc: items.length,
    n_four_option: n,
    key_longest: longest,
    key_longest_rate: pct(longest, n),
    key_shortest: shortest,
    key_extremum: longest + shortest,
    key_extremum_rate: pct(longest + shortest, n),
    mean_key_len: Number(meanKey.toFixed(1)),
    mean_distractor_len: Number(meanD.toFixed(1)),
    mean_ratio: Number((meanKey / meanD).toFixed(2)),
    r5_stems: items.filter((i) => i.m.r5_matches.length).length,
    r5_loose_stems: items.filter((i) => i.m.r5_loose_matches.length).length,
    chapter_stems: items.filter((i) => i.m.mentions_chapter).length,
    absolutes_distractors: absD,
    total_distractors: totalDistractors,
    absolutes_keys: absK,
    d10_hedge_fails: items.filter((i) => i.m.hedge_counts.key > median(i.m.hedge_counts.distractors) + 1).length,
    absolute_enrichment: absK === 0
      ? null
      : Number(((absD / totalDistractors) / (absK / items.length)).toFixed(1)),
    r8_pass: items.filter((i) => i.m.len_ratio >= GATES.r8[0] && i.m.len_ratio <= GATES.r8[1]).length,
    r9_pass: items.filter((i) => !(i.m.correct_is_longest || i.m.correct_is_shortest) || i.m.extremum_gap <= GATES.r9Gap).length,
    all_length_pass: items.filter((i) => {
      const okR8 = i.m.len_ratio >= GATES.r8[0] && i.m.len_ratio <= GATES.r8[1];
      const okR9 = !(i.m.correct_is_longest || i.m.correct_is_shortest) || i.m.extremum_gap <= GATES.r9Gap;
      const okSpread = i.m.max_over_min <= GATES.spread;
      return okR8 && okR9 && okSpread;
    }).length,
    option_counts: items.reduce((acc, i) => {
      acc[i.m.option_count] = (acc[i.m.option_count] || 0) + 1;
      return acc;
    }, {}),
    key_positions: items.reduce((acc, i) => {
      acc[i.keyIndex] = (acc[i.keyIndex] || 0) + 1;
      return acc;
    }, {}),
  };
}

// ---------------------------------------------------------------------- main

export function collect(file) {
  const quizzes = parseChapterMarkdown(readFileSync(file, 'utf8'));
  const items = [];
  for (const quiz of quizzes) {
    for (const q of quiz.questions) {
      if (q.type !== 'mc') continue;
      items.push({
        ref: `${quiz.title} Q${q.id}`,
        section: quiz.title,
        q,
        m: measure(q),
        keyIndex: q.options.findIndex((o) => o.isCorrect),
      });
    }
  }
  return items;
}

function report(file) {
  const items = collect(file);
  const t1 = tier1(items);
  const t1b = tier1b(items);
  const t2 = tier2(items);
  const s = setLevel(items);

  const gateRow = (label, value, gate, ok) =>
    `  ${label.padEnd(34)} ${String(value).padStart(8)}   gate ${gate.padEnd(11)} ${ok ? 'pass' : 'FAIL'}`;

  console.log(`\n${file}`);
  console.log(`  ${s.n_mc} multiple-choice questions (${s.n_four_option} with 4 options)\n`);

  console.log('Tier 2 — set-level (§2.3.1, over 4-option questions)');
  const okLongest = s.key_longest_rate <= GATES.keyLongest;
  const okExtremum = s.key_extremum_rate <= GATES.keyExtremum;
  const okRatio = s.mean_ratio >= GATES.meanRatio[0] && s.mean_ratio <= GATES.meanRatio[1];
  const okR5 = s.r5_stems === 0;
  console.log(gateRow('key is longest', `${s.key_longest}/${s.n_four_option} ${fmtPct(s.key_longest_rate)}`, '≤35%', okLongest));
  console.log(gateRow('key is longest or shortest', `${s.key_extremum}/${s.n_four_option} ${fmtPct(s.key_extremum_rate)}`, '≤60%', okExtremum));
  console.log(gateRow('mean key ÷ mean distractor', s.mean_ratio, '0.90–1.10', okRatio));
  console.log(gateRow('R5 recall-framing stems', `${s.r5_stems}/${s.n_mc}`, '0', okR5));
  console.log(`  ${'R5 loose ("in the chapter")'.padEnd(34)} ${`${s.r5_loose_stems}/${s.n_mc}`.padStart(8)}   (warn — has exemptions)`);
  console.log(`  ${'stems containing "chapter"'.padEnd(34)} ${`${s.chapter_stems}/${s.n_mc}`.padStart(8)}   (reported)`);
  const enr = s.absolute_enrichment;
  const okEnr = enr === null || enr <= 1.5;
  console.log(`  ${'absolute-quantifier enrichment'.padEnd(34)} ${(enr === null ? 'n/a' : `${enr}×`).padStart(8)}   gate ≤1.5×      ${okEnr ? 'pass' : 'FAIL'}`);
  console.log(`  ${'  distractors / keys'.padEnd(34)} ${`${s.absolutes_distractors}/${s.total_distractors}, ${s.absolutes_keys}/${s.n_mc}`.padStart(8)}`);
  const okD10 = s.d10_hedge_fails === 0;
  console.log(gateRow('D10 key-hedge tell', `${s.d10_hedge_fails}/${s.n_mc}`, '0', okD10));
  console.log(`  ${'option-count distribution'.padEnd(34)} ${JSON.stringify(s.option_counts)}`);
  console.log(`  ${'key position skew'.padEnd(34)} ${JSON.stringify(s.key_positions)}   (reported, not gated)`);

  console.log('\nPer-question length pass rates');
  console.log(`  R8 alone                           ${s.r8_pass}/${s.n_mc}`);
  console.log(`  R9 alone                           ${s.r9_pass}/${s.n_mc}`);
  console.log(`  R8 + R9 + 1.6× spread              ${s.all_length_pass}/${s.n_mc}`);

  for (const [name, list] of [['Tier 1 — structural', t1], ['Tier 2 — per-question', t2]]) {
    console.log(`\n${name}: ${list.length} failure(s)`);
    for (const f of list.slice(0, 40)) console.log(`  ${f.rule.padEnd(10)} ${f.ref.padEnd(38)} ${f.detail}`);
    if (list.length > 40) console.log(`  … and ${list.length - 40} more`);
  }

  console.log(`\nTier 1b — citation anchors: ${t1b.length} warning(s)`);
  for (const w of t1b.slice(0, 20)) console.log(`  ${w.rule.padEnd(10)} ${w.ref.padEnd(38)} ${w.detail}`);

  const hardFail = t1.length > 0 || t2.length > 0 || !okLongest || !okExtremum || !okRatio || !okR5;
  console.log(`\n${hardFail ? 'FAIL' : 'PASS'}\n`);
  return { items, summary: s, tier1: t1, tier1b: t1b, tier2: t2, hardFail };
}

// RUBRIC Appendix A is the checker's own test case: if these do not reproduce,
// the checker is wrong, not the rubric (QUIZ-PLAN phase 3).
function selftest() {
  const expected = {
    n_mc: 40,
    key_longest: 24,
    key_shortest: 6,
    key_extremum: 30,
    mean_key_len: 149.3,
    mean_distractor_len: 107.5,
    mean_ratio: 1.39,
    r5_stems: 12,
    chapter_stems: 16,
    absolutes_distractors: 22,
    total_distractors: 120,
    r8_pass: 17,
    r9_pass: 20,
    all_length_pass: 12,
  };

  // Appendix A reports 3 of 40 keys carrying a strict absolute. No closed word
  // list reproduces that and 22/120 distractors at the same time: the list that
  // gives 22 distractors gives 0 keys, and the lists that give 3 keys (adding
  // "all") give 29. The keys row looks like a hand-audit figure with an
  // unstated list. Left divergent rather than reverse-engineered, because
  // fitting a word list to two targets would make the gate mean nothing.
  // Finding for RUBRIC v2: state D4's word list as a closed list.
  const divergent = { absolutes_keys: 3 };

  const s = setLevel(collect(DEFAULT_FILE));
  let bad = 0;
  console.log('\nSelf-test against RUBRIC Appendix A\n');
  console.log(`  note ${'D10 hedge-tell gate'.padEnd(24)} ${String(s.d10_hedge_fails).padStart(6)} of ${s.n_mc} current questions breach it (added 2026-09-19, post-dates Appendix A)`);
  console.log('');
  for (const [k, want] of Object.entries(expected)) {
    const got = s[k];
    const ok = Number.isInteger(want) ? got === want : Math.abs(got - want) < 0.05;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${k.padEnd(24)} expected ${String(want).padStart(7)}   got ${String(got).padStart(7)}`);
  }
  console.log('');
  for (const [k, want] of Object.entries(divergent)) {
    console.log(`  note ${k.padEnd(24)} appendix ${String(want).padStart(6)}   got ${String(s[k]).padStart(7)}   documented divergence, see selftest()`);
  }
  // D10's boundary, asserted on inline fixtures rather than on Appendix A, which
  // predates the gate. The rule allows median+1 and fails at median+2, and both
  // halves matter: a gate that fires one hedge early would reject keys that hedge
  // because the claim genuinely is hedged, which is D10's whole allowance.
  const hedgeCase = (keyText, distractorTexts) => tier2([{
    ref: 'fixture',
    m: measure({
      question: 'Which account best explains the observed pattern?',
      options: [{ text: keyText, isCorrect: true }, ...distractorTexts.map((t) => ({ text: t, isCorrect: false }))],
      explanation: 'x',
    }),
  }]).filter((f) => f.rule === 'D10').length;
  const flat = ['The mechanism is the second one described in the passage above here', 'The mechanism is the third one described in the passage above here', 'The mechanism is the fourth one described in the passage above here'];
  const d10 = [
    ['allows key at distractor median + 1', hedgeCase('It often works that way in the cases described in the passage', flat), 0],
    ['fails key at distractor median + 2', hedgeCase('It may often work that way in the cases described in the passage', flat), 1],
    ['allows a hedged key when distractors hedge too', hedgeCase('It may often work that way in the cases described here',
      ['It may often fail that way in the cases described in this passage', 'It may often hold that way in the cases described in this passage', 'It may often break that way in the cases described in this passage']), 0],
  ];
  console.log('D10 hedge-gate boundary\n');
  for (const [label, got, want] of d10) {
    const ok = got === want;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${label.padEnd(46)} expected ${want}   got ${got}`);
  }

  console.log(`\n${bad === 0
    ? 'Checker reproduces the baseline (1 documented divergence) and D10 holds its boundary.'
    : `${bad} check(s) failed — the checker is wrong.`}\n`);
  return bad === 0;
}

// Guard the CLI: pipeline.mjs imports measure()/collect() from this file, and an
// unguarded main would run the whole report on import.
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const args = process.argv.slice(2);
if (!invokedDirectly) {
  // imported as a module — export only
} else if (args.includes('--selftest')) {
  process.exit(selftest() ? 0 : 1);
} else {
  const file = args.find((a) => !a.startsWith('--')) || DEFAULT_FILE;
  const out = report(file);
  const mIdx = args.indexOf('--measurements');
  if (mIdx !== -1 && args[mIdx + 1]) {
    const byId = Object.fromEntries(out.items.map((i) => [i.ref, i.m]));
    writeFileSync(args[mIdx + 1], JSON.stringify(byId, null, 2));
    console.log(`measurements → ${args[mIdx + 1]}\n`);
  }
  if (args.includes('--json')) console.log(JSON.stringify(out.summary, null, 2));
  process.exit(out.hardFail ? 1 : 0);
}
