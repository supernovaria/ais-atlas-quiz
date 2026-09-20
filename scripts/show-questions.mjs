#!/usr/bin/env node
// Print every question the pipeline has staged, from one command.
//
// The questions live in one file per section under staging/, which is fine for
// the pipeline and inconvenient for a person who just wants to read them. This
// gathers them into one stream.
//
//   node scripts/show-questions.mjs                 every staged section
//   node scripts/show-questions.mjs --plain         no answer marked (read it cold)
//   node scripts/show-questions.mjs --out FILE.md   write one combined markdown file
//   node scripts/show-questions.mjs --run 2026-09-20-FICTION
//                                                   a run's pool instead of staging
//
// It reads and prints. It never edits a question.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};
const has = (n) => argv.includes(`--${n}`);

const plain = has('plain');
const outFile = flag('out');
const runLabel = flag('run');

// ---------------------------------------------------------------- collecting

// A staged section file: "### Question N", stem, "- [x] key", "- [ ] other",
// then "**Explanation**: …". Parsed rather than regex-replaced so that a stem
// containing a bracket cannot be mistaken for an option.
function parseStaged(text) {
  const out = [];
  let cur = null;
  let heading = null;
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (/^#\s+/.test(line)) { heading = line.replace(/^#\s+/, ''); continue; }
    if (/^###\s+Question\b/.test(line)) {
      if (cur) out.push(cur);
      cur = { heading, stem: [], options: [], explanation: null };
      continue;
    }
    if (!cur) continue;
    const opt = line.match(/^- \[([ xX])\]\s+(.*)$/);
    if (opt) { cur.options.push({ key: opt[1].toLowerCase() === 'x', text: opt[2] }); continue; }
    const exp = line.match(/^\*\*Explanation\*\*:\s*(.*)$/);
    if (exp) { cur.explanation = exp[1]; continue; }
    if (line && !cur.options.length) cur.stem.push(line);
  }
  if (cur) out.push(cur);
  return out.map((q) => ({ ...q, stem: q.stem.join(' ').trim() }));
}

function fromStaging() {
  const dir = join(ROOT, 'staging');
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('review-sheet-'))
    .sort();
  return files.flatMap((f) => {
    const qs = parseStaged(readFileSync(join(dir, f), 'utf8'));
    return qs.map((q) => ({ ...q, source: `staging/${f}` }));
  });
}

function fromRun(label) {
  const base = join(ROOT, 'runs', label);
  if (!existsSync(base)) { console.error(`no such run: runs/${label}`); process.exit(1); }
  const out = [];
  for (const slug of readdirSync(base)) {
    const cands = join(base, slug, 'candidates.json');
    if (!existsSync(cands)) continue;
    const all = JSON.parse(readFileSync(cands, 'utf8'));
    // Prefer the curator's selection where one exists; otherwise show the pool.
    const curPath = join(base, slug, 'curator.json');
    let chosen = all;
    let note = 'full candidate pool (no curator.json)';
    if (existsSync(curPath)) {
      const ids = new Set((JSON.parse(readFileSync(curPath, 'utf8')).selected || []).map((s) => s.id));
      chosen = all.filter((c) => ids.has(c.id));
      note = 'curator selection';
    }
    for (const c of chosen) {
      out.push({
        heading: slug,
        stem: c.stem,
        options: (c.options || []).map((o) => ({ key: !!o.key, text: o.text })),
        explanation: c.explanation,
        source: `runs/${label}/${slug} · ${note}`,
        id: c.id,
      });
    }
  }
  return out;
}

// ----------------------------------------------------------------- rendering

const questions = runLabel ? fromRun(runLabel) : fromStaging();

if (!questions.length) {
  console.error(runLabel
    ? `runs/${runLabel} holds no candidates.json`
    : 'staging/ holds no staged sections yet.');
  process.exit(1);
}

const lines = [];
const label = runLabel ? `runs/${runLabel}` : 'staging/';
lines.push(`# Questions — ${label}`, '');
lines.push(`${questions.length} question(s)${plain ? ', answers hidden' : ', correct answer marked **✓**'}.`, '');

let lastHeading = null;
let n = 0;
for (const q of questions) {
  if (q.heading !== lastHeading) {
    lines.push('', `## ${q.heading}`, '', `*${q.source}*`, '');
    lastHeading = q.heading;
    n = 0;
  }
  n += 1;
  const tag = q.id ? ` — \`${q.id.split('/').pop()}\`` : '';
  lines.push(`### Question ${n}${tag}`, '');
  lines.push(q.stem, '');
  const letters = 'ABCDEFGH';
  q.options.forEach((o, i) => {
    const mark = !plain && o.key ? ' **✓**' : '';
    lines.push(`- **${letters[i]}.**${mark} ${o.text}`);
  });
  lines.push('');
  if (q.explanation && !plain) lines.push(`> **Why:** ${q.explanation}`, '');
}

const text = `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;

if (outFile) {
  writeFileSync(outFile, text, 'utf8');
  console.error(`wrote ${questions.length} question(s) → ${outFile}`);
} else {
  process.stdout.write(text);
}
