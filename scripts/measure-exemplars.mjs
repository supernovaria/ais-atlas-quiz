#!/usr/bin/env node
// Measures the question blocks in docs/EXEMPLARS.md against R8 / R9 / the 1.6x
// spread rule.
//
// EXEMPLARS.md is not a quizParser file — its questions sit in fenced blocks
// interleaved with metadata, and two of them are deliberately broken
// counter-exemplars. So this reads the fences directly rather than going
// through check-questions.mjs, which expects a shippable file.
//
//   node scripts/measure-exemplars.mjs
//
// Exits non-zero if any exemplar in §1-§9 fails a length gate. The
// counter-exemplars in §10 are expected to fail and are reported, not gated.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, 'docs/EXEMPLARS.md');

const text = readFileSync(FILE, 'utf8');
const counterStart = text.indexOf('## 10 — Counter-exemplars');

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
