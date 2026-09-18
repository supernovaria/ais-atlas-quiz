#!/usr/bin/env node
// Measures the question blocks in docs/EXEMPLARS.md against R8 / R9 / the 1.6x
// spread rule.
//
// The exemplar file is OPTIONAL and currently absent by decision (PIPELINE
// §6.1). No file is the expected state, not an error: this exits 0 and says so.
// Kept because exemplars may be built later from questions that cleared the
// rubric, and that build will want measuring the same way.
//
// EXEMPLARS.md is not a quizParser file — its questions sit in fenced blocks
// interleaved with metadata, and the counter-exemplars are deliberately broken.
// So this reads the fences directly rather than going through
// check-questions.mjs, which expects a shippable file.
//
//   node scripts/measure-exemplars.mjs
//
// Exits non-zero only if a real exemplar fails a length gate. Counter-exemplars
// under the "Counter-exemplars" heading are expected to fail and are reported.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'docs/EXEMPLARS.md');

if (!existsSync(FILE)) {
  console.log('\nNo docs/EXEMPLARS.md — exemplars are optional and currently absent by decision (PIPELINE §6.1). Nothing to measure.\n');
  process.exit(0);
}

const text = readFileSync(FILE, 'utf8');
// Any heading mentioning counter-exemplars starts the expected-to-fail region.
// Matched loosely rather than by section number so a rebuilt file can number
// its sections however it likes.
const counterMatch = text.match(/^#{2,3}\s.*counter-exemplar/im);
const counterStart = counterMatch ? counterMatch.index : -1;

const blocks = [...text.matchAll(/```\n(### Question \d+[\s\S]*?)```/g)].map((m) => ({
  body: m[1],
  isCounter: counterStart !== -1 && m.index > counterStart,
}));

let failures = 0;
console.log('\nEXEMPLARS.md — option-length measurements\n');

for (const { body, isCounter } of blocks) {
  const num = body.match(/### Question (\d+)/)[1];
  const opts = [...body.matchAll(/^- \[([ x])\] (.+)$/gm)]
    .map((m) => ({ key: m[1] === 'x', len: m[2].trim().length }));

  const key = opts.find((o) => o.key);
  const ds = opts.filter((o) => !o.key);
  const label = isCounter ? `counter Q${num}` : `Q${num}`;

  if (!key || ds.length === 0) {
    console.log(`  ${label.padEnd(12)} incomplete (${opts.length} option(s)) — quoted partially by design`);
    continue;
  }

  const all = opts.map((o) => o.len);
  const desc = [...all].sort((a, b) => b - a);
  const max = desc[0];
  const min = desc[desc.length - 1];
  const meanD = ds.reduce((a, o) => a + o.len, 0) / ds.length;
  const ratio = key.len / meanD;
  const spread = max / min;
  const isLongest = key.len === max && all.filter((l) => l === max).length === 1;
  const isShortest = key.len === min && all.filter((l) => l === min).length === 1;
  const gap = isLongest ? key.len - desc[1] : isShortest ? desc[desc.length - 2] - key.len : 0;

  const ok = ratio >= 0.80 && ratio <= 1.20
    && (!(isLongest || isShortest) || gap <= 15)
    && spread <= 1.6;

  const position = isLongest ? `longest by ${gap}` : isShortest ? `shortest by ${gap}` : 'mid';
  console.log(
    `  ${label.padEnd(12)} key ${String(key.len).padStart(3)}  distractors [${ds.map((d) => d.len).join(', ')}]`.padEnd(58)
    + `ratio ${ratio.toFixed(2)}  ${position.padEnd(15)} max/min ${spread.toFixed(2)}  ${ok ? 'pass' : 'FAIL'}`,
  );

  if (!ok && !isCounter) failures++;
}

console.log(
  failures === 0
    ? '\nAll exemplars inside R8 / R9 / 1.6x. Counter-exemplars fail by design.\n'
    : `\n${failures} exemplar(s) outside the length gates.\n`,
);
process.exit(failures === 0 ? 0 : 1);
