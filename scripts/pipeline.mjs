#!/usr/bin/env node
// Question-generation pipeline — the deterministic stages (HANDOFF §2).
//
// This script does everything deterministic and nothing judgmental. Every model
// pass is a subagent spawn the orchestrator makes; every arithmetic, file and
// format operation is here. The rule "models never count characters" is enforced
// by that split rather than by instruction.
//
// Usage:
//   node scripts/pipeline.mjs shard    --run <label> --section <slug>
//   node scripts/pipeline.mjs dedupe   --run <label> --section <slug>
//   node scripts/pipeline.mjs measure  --run <label> --section <slug>
//   node scripts/pipeline.mjs queue    --run <label> --section <slug>
//   node scripts/pipeline.mjs shuffle  --run <label> --section <slug> --seeds 3
//   node scripts/pipeline.mjs shuffle  --file <q.md> --out <dir> --seeds 3   (baseline mode)
//   node scripts/pipeline.mjs validate --run <label> [--section <slug>]
//   node scripts/pipeline.mjs score    --run <label> --section <slug>
//   node scripts/pipeline.mjs score    --out <dir>                          (baseline mode)
//   node scripts/pipeline.mjs assemble --run <label>
//   node scripts/pipeline.mjs report   --run <label>
//   node scripts/pipeline.mjs prompt   <template> [--run <label> --section <slug>] [--id <id>]
//                                      [--set key=value ...] [--set-file key=<path> ...] [--out <file>]
//   node scripts/pipeline.mjs ablate   --run <label> --section <slug> [--rungs full,options-only]
//                                      [--seeds 1] [--ids a,b] [--force]
//   node scripts/pipeline.mjs ablate-score --run <label> --section <slug>
//   node scripts/pipeline.mjs arm      --run <new> --from <label>/<slug> --rewrite <file> --kind stem|distractors [--passage <p>]
//   node scripts/pipeline.mjs preregister --run <label> --file <path>
//   node scripts/pipeline.mjs canary   --run <label>      (then canary-record --tool-uses N [--handbacks H] --reply X)
//   node scripts/pipeline.mjs bench-check --bench <id>
//   node scripts/pipeline.mjs bench-run --run <label> --section <slug> --bench <id>
//   node scripts/pipeline.mjs bench-map --bench <id> --from <label>/<slug>
//   node scripts/pipeline.mjs claim-map --run <label> --section <slug> --bench <id>
//   node scripts/pipeline.mjs selftest
//
// Every stage is runnable in isolation and reads only artifacts already on disk.
// Nothing here writes to public/questions/ — ever.
//
// Exit 0 clean, 1 on a stage failure (validate: any schema failure).

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve, basename, relative, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseChapterMarkdown } from '../src/quizParser.js';
import { measure, contentWords, overlap, GATES, atlasSlug, lintCandidate, ABSOLUTES, countMatches } from './check-questions.mjs';
import { renderTemplate, loadTemplate, loadPartial, lintTemplate, listTemplates, PromptError, sha256 } from './prompts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// QUIZ_CHAPTER_DIR overrides the sibling-repo default (needed when running from a worktree).
const CHAPTER_DIR = process.env.QUIZ_CHAPTER_DIR
  ? resolve(process.env.QUIZ_CHAPTER_DIR)
  : resolve(ROOT, '../atlas-audio-read-along/dist/chapters/v1/capabilities');

// The chapter's own section order, and the `#` headings the parser and checker
// tier 1 depend on. Copied from the existing question file; never re-derived.
const SECTION_HEADINGS = {
  'current-capabilities': 'Current Capabilities',
  'foundation-models': 'Foundation Models',
  'defining-and-measuring-agi': 'Defining and Measuring AGI',
  'leveraging-scale': 'Leveraging Scale',
  'forecasting-timelines': 'Forecasting Timelines',
  'takeoff': 'Takeoff',
  'review-block': 'Chapter Review: Multiple Choice',
};
const SECTION_ORDER = Object.keys(SECTION_HEADINGS);

const LENSES = ['misconception', 'contrast', 'case', 'figure', 'objection'];
const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const FAMILIES = ['a', 'b', 'c', 'd'];
const VERDICTS = ['pass', 'rewrite', 'reject'];
const STEM_FORMATS = [
  'claim-evaluation', 'two-scenario', 'thought-experiment',
  'direct-conceptual', 'mechanism', 'classification',
];
// Filled into every spawn prompt by the renderer, from the same constants
// validate enforces — so a prompt cannot state one enum while the checker
// enforces another. See prompts/README.md.
const PROMPT_AUTO = {
  stem_formats: STEM_FORMATS.map((x) => `\`${x}\``).join(', '),
  lenses: LENSES.map((x) => `\`${x}\``).join(', '),
  levels: LEVELS.join(', '),
  verdicts: VERDICTS.map((x) => `\`${x}\``).join(', '),
};

// §3.7 per-section targets. Used by report/curate checks, never to edit a set.
const DIST_TARGET = { L2: 0.20, L3: 0.30, L4: 0.25 };

// ------------------------------------------------------------------- plumbing

const argv = process.argv.slice(2);
const stage = argv[0];
const flag = (name, dflt = null) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};

const runDir = (label) => join(ROOT, 'runs', label);
const sectionDir = (label, slug) => join(runDir(label), slug);
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const maybeJson = (p) => (existsSync(p) ? readJson(p) : null);

function writeJson(p, data) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
  return p;
}

// run.log is the audit trail: stage, agent, model, section, ids, start/end,
// artifact, ok/fail. Per-call tokens and dollars are not available to a
// subagent orchestrator (HANDOFF §8), so spawn counts are the cost proxy.
function logLine(label, fields) {
  const p = join(runDir(label), 'run.log');
  mkdirSync(dirname(p), { recursive: true });
  appendFileSync(p, `${JSON.stringify({ ts: new Date().toISOString(), ...fields })}\n`);
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const uniq = (xs) => [...new Set(xs)];
const fmtPct = (x) => `${(x * 100).toFixed(0)}%`;

function die(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

// The only way this script builds a spawn prompt. A template problem is a
// stage failure, never a half-rendered prompt handed to an agent.
function render(name, vars) {
  try {
    return renderTemplate(name, vars, { workdir: ROOT, ...PROMPT_AUTO });
  } catch (e) {
    if (e instanceof PromptError) die(e.message);
    throw e;
  }
}

function need(p, what) {
  if (!existsSync(p)) die(`missing ${what}: ${p}`);
  return p;
}

// Deterministic PRNG. Seeded per (id, seed) so a shuffle is reproducible from
// the artifact alone — the adversary's position tells have to be re-derivable.
function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function shuffled(items, seedKey) {
  const rnd = mulberry32(hashString(seedKey));
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A candidate object (generator schema) in the shape measure() expects. One
// measurement implementation, imported from the checker, so a candidate and a
// shipped question are never measured two different ways.
const asQuestion = (c) => ({
  question: c.stem,
  options: (c.options || []).map((o) => ({ text: o.text, isCorrect: Boolean(o.key) })),
  explanation: c.explanation,
});

// E4a. Resolvable only when the built chapter markdown is present; degrades to
// null rather than false, so a missing checkout never reads as a dead anchor.
let ANCHORS = null;
function anchorSet() {
  if (ANCHORS !== null) return ANCHORS;
  if (!existsSync(CHAPTER_DIR)) { ANCHORS = false; return ANCHORS; }
  const set = new Set();
  for (const f of readdirSync(CHAPTER_DIR).filter((x) => x.endsWith('.md'))) {
    for (const line of readFileSync(join(CHAPTER_DIR, f), 'utf8').split('\n')) {
      const h = line.match(/^#{2,6}\s+(.+?)\s*$/);
      if (h) set.add(atlasSlug(h[1]));
    }
  }
  ANCHORS = set;
  return ANCHORS;
}

function measureCandidate(c) {
  const m = measure(asQuestion(c));
  const anchors = anchorSet();
  const sub = c.citation && c.citation.subheading;
  m.citation_anchor_resolves = anchors === false || !sub ? null : anchors.has(atlasSlug(sub));
  return m;
}

// ------------------------------------------------------------- stage: merge
//
// Builds candidates.json deterministically from the agents' own output files, so
// no model is ever asked to invent a unique id. The generator's id template is
// `<section>/<model>/NN` with no shard component, so shards sharing a model each
// number from 01 and collide — which silently collapsed 11 candidates to 3 in
// the 2026-09-19 run, because measurements are keyed by id. Ids are assigned
// here from (shard, index) and a collision is fatal rather than quiet.
//
// Also promotes accepted rewrites. A rewrite keeps its own id, `<original>r`,
// and BOTH objects stay in candidates.json: runs/ is an audit trail, and the
// before/after is what shows whether the rewrite path works at all. The
// alternative convention — resolving a rewrite under the original's id and
// overwriting it — destroys that evidence, so it is not used anywhere.
// Ids a curator may use on flags_for_reviewer that are not candidate ids. These
// carry findings about the shipped SET rather than one question.
// A generator file may hold MORE THAN ONE top-level JSON value. The brief says
// to emit "a JSON array of candidates, optionally followed by a trailing
// {note}", which reads two ways: the note as the array's last element, or the
// note after the array's closing bracket. Both have now been observed from the
// same brief — the 2026-09-19 sections put it inside, the 2026-09-20 fiction
// control put it outside, which is not valid JSON and made the whole file
// unreadable.
//
// The script owns the mechanical rule, so it accepts both. This is a parser,
// not a repair: it never edits a character of what the generator wrote, it only
// finds where one top-level value ends and the next begins. Strings and escapes
// are tracked so a brace inside a stem cannot desynchronise the scan.
function parseJsonValues(text) {
  const values = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '[' || ch === '{') { if (depth === 0) start = i; depth += 1; continue; }
    if (ch === ']' || ch === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) { values.push(JSON.parse(text.slice(start, i + 1))); start = -1; }
      if (depth < 0) throw new SyntaxError('unbalanced bracket in candidate file');
    }
  }
  if (depth !== 0) throw new SyntaxError('unterminated JSON value in candidate file');
  return values;
}

const FLAG_SCOPES = new Set(['section', 'set']);

function stageMerge(label, slug) {
  const dir = sectionDir(label, slug);
  const srcDir = join(dir, 'candidates');
  const out = [];
  const notes = [];
  const provenance = [];
  const seen = new Map();

  const claim = (id, from) => {
    if (seen.has(id)) {
      die(`id collision: "${id}" produced by both ${seen.get(id)} and ${from}.\n`
        + '       Ids are assigned by merge from (shard, index); a collision here means two\n'
        + '       sources claim the same slot. Fix the inputs, never the question text.');
    }
    seen.set(id, from);
    return id;
  };

  if (existsSync(srcDir)) {
    for (const f of readdirSync(srcDir).filter((x) => x.endsWith('.json')).sort()) {
      const shard = f.replace(/\.json$/, '');
      const letter = shard.slice(shard.lastIndexOf('-') + 1);
      const arr = parseJsonValues(readFileSync(join(srcDir, f), 'utf8')).flat();
      let n = 0;
      for (const x of arr) {
        if (!x || typeof x !== 'object') continue;
        // The generator brief allows a trailing {"note": …} explaining its
        // allocation. It is not a candidate; a naive merge counts it as one.
        if (!x.stem) { if (x.note) notes.push({ shard, note: x.note }); continue; }
        n += 1;
        const model = x.model || (String(x.id || '').split('/')[1]) || 'unknown';
        const id = claim(`${slug}/${model}/${letter}${String(n).padStart(2, '0')}`, shard);
        provenance.push({ generator_id: x.id ?? null, id, shard });
        out.push({ ...x, id, shard_id: shard, model });
      }
    }
  }

  // Rewrites, from verdicts written per-candidate or as one array.
  const verdicts = collectVerdicts(dir);
  for (const v of verdicts) {
    if (!v || !v.rewrite) continue;
    const base = out.find((c) => c.id === v.id);
    const id = claim(`${v.id}r`, 'verdict rewrite');
    provenance.push({ generator_id: null, id, shard: base ? base.shard_id : null, rewrite_of: v.id });
    out.push({
      ...v.rewrite,
      id,
      rewrite_of: v.id,
      shard_id: base ? base.shard_id : (v.rewrite.shard_id ?? null),
      model: base ? base.model : (v.rewrite.model ?? null),
    });
  }

  // A merge that finds nothing used to print "0 candidate(s)" and exit 0. That
  // is the silent class: the next three stages then also report 0 and the run
  // looks like it happened. Observed on 2026-09-20 when a generator wrote to
  // runs/<label>/candidates/ instead of runs/<label>/<slug>/candidates/.
  if (!out.length) {
    die(`merge found no candidates for ${slug}.\n`
      + `       Looked in: ${srcDir}\n`
      + '       A merge that produces nothing is a failure, not an empty result — every\n'
      + '       stage after it would report 0 and the run would look like it ran.');
  }

  writeJson(join(dir, 'generator-notes.json'), notes);
  writeJson(join(dir, 'id-provenance.json'), provenance);
  const p = writeJson(join(dir, 'candidates.json'), out);
  const rewrites = out.filter((c) => c.rewrite_of).length;
  logLine(label, { stage: 'merge', section: slug, n: out.length, rewrites, notes: notes.length, artifact: p, ok: true });
  console.log(`merge    ${slug}: ${out.length} candidate(s) (${out.length - rewrites} generated + ${rewrites} rewrite(s)) · ${notes.length} generator note(s) · 0 id collisions`);
  return out;
}

// Verdicts land either as verdicts.json (array) or verdicts/<id>.json (one per
// spawn, which is how the orchestrator actually runs them). Read both.
function collectVerdicts(dir) {
  const arr = maybeJson(join(dir, 'verdicts.json'));
  if (Array.isArray(arr) && arr.length) return arr;
  const vdir = join(dir, 'verdicts');
  if (!existsSync(vdir)) return [];
  return readdirSync(vdir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => readJson(join(vdir, f)));
}

// ------------------------------------------------------------ stage: render
//
// Builds staging/<section>.md from candidates.json + curator.json by STRING
// COPY. The curator used to write this file itself, retyping every stem, option
// and explanation while being forbidden to change them — which is transcription
// drift by construction, and duly produced it (straight quotes became curly on
// two questions in the 2026-09-19 run). A model that never retypes the text
// cannot drift it. The review sheet stays curator-authored: it is commentary,
// not question text.
function stageRender(label, slug) {
  const dir = sectionDir(label, slug);
  const candidates = readJson(need(join(dir, 'candidates.json'), 'candidates.json'));
  const cur = readJson(need(join(dir, 'curator.json'), 'curator.json'));
  const map = maybeJson(join(dir, 'concept-map.json'));
  const smart = flag('smart-quotes') != null;

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const heading = (map && map.heading) || slug;
  const lines = [`# ${heading}`, ''];
  let n = 0;
  let fixed = 0;
  let declined = 0;
  const missing = [];

  // Refuse to render a candidate whose object does not validate. Until
  // 2026-09-20 this stage checked only that the id EXISTED: a03r's rewrite
  // carried an invented stem_format, was correctly caught as a FAIL by the
  // verdict validator, and was then selected and written to staging anyway.
  // Schema-checking at the point of selection is what makes that impossible,
  // and it holds whatever any agent brief does or does not say — which matters,
  // because this run measured a rule stated plainly in a brief holding on 8 of
  // 21 candidates.
  const selected = (cur.selected || []).map((sel) => byId.get(sel.id)).filter(Boolean);
  const bad = [];
  validateCandidates(selected, null, `${slug}/render`,
    (cond, w, msg) => { if (!cond) bad.push(`${w}: ${msg}`); return Boolean(cond); },
    () => true);
  if (bad.length) {
    die(`refusing to render ${bad.length} schema failure(s) in the selected set.\n`
      + bad.map((b) => `       ${b}`).join('\n')
      + '\n       Re-spawn the agent that produced it. Never hand-edit the candidate.');
  }

  const text = (v) => {
    const c = canonicaliseQuotes(v);
    if (c.changed) fixed += 1;
    if (c.skipped) declined += 1;
    return typo(c.text, smart);
  };

  for (const sel of cur.selected || []) {
    const c = byId.get(sel.id);
    if (!c) { missing.push(sel.id); continue; }
    n += 1;
    lines.push(`### Question ${n}`);
    lines.push(text(c.stem));
    lines.push('');
    for (const o of c.options) {
      lines.push(`- [${o.key ? 'x' : ' '}] ${text(o.text)}`);
    }
    lines.push('');
    lines.push(`**Explanation**: ${text(c.explanation)}`);
    lines.push('');
  }
  if (missing.length) die(`curator selected id(s) not present in candidates.json: ${missing.join(', ')}`);

  const p = join(ROOT, 'staging', `${slug}.md`);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${lines.join('\n').trimEnd()}\n`, 'utf8');
  logLine(label, {
    stage: 'render', section: slug, n, smart_quotes: smart,
    outer_quotes_normalised: fixed, outer_quotes_declined: declined, artifact: p, ok: true,
  });
  console.log(`render   ${slug}: ${n} question(s) → staging/${slug}.md`
    + `${smart ? ' (typographic quotes applied)' : ' (canonical straight quotes)'}`
    + `${fixed ? ` · ${fixed} outer quotation(s) normalised` : ''}`
    + `${declined ? ` · ${declined} ambiguous span(s) left alone` : ''}`);
  return p;
}

// Deterministic straight→typographic conversion, applied at render time only if
// asked. Never a model's job: the rule is mechanical, so the script owns it.
// Canonical outer quotation: double outside, single when nested. The generator
// brief states this rule in plain words and the generator broke it on 13 of 21
// candidates in the 2026-09-20 run, so it needs a mechanism, not a sentence.
//
// This is a REWRITER, which is a much harder thing than OUTER_SINGLE_QUOTE, the
// detector it mirrors: a detector uses a lookahead and never decides which
// characters to touch. Two properties make it safe rather than clever:
//
//   1. It only fires on an UNAMBIGUOUS span — an opening quote at a boundary,
//      no apostrophe anywhere inside, and a closing quote before a boundary.
//      `'the model's view' is odd` matches nothing at all, because the body
//      cannot cross the apostrophe in `model's`. Refusing is the correct
//      outcome there; the lint still reports it and a human decides.
//   2. It then CHECKS ITSELF. Stripping every quote character from the before
//      and after must give the identical string. If it does not, the rewrite
//      touched something that was not a quote mark, and the original is
//      returned untouched with `skipped: true`.
//
// Silent corruption of shipped text is the exact failure class this pipeline
// keeps finding, so the normaliser is built to decline rather than to guess.
const OUTER_SINGLE_SPAN = /(^|[\s:([])'([A-Za-z][^'\n]*?)'(?=[\s.,;:!?)\]]|$)/g;

function canonicaliseQuotes(s) {
  const t = String(s == null ? '' : s);
  if (!t.includes("'")) return { text: t, changed: false, skipped: false };
  const out = t.replace(OUTER_SINGLE_SPAN, (m, pre, body) => `${pre}"${body.replace(/"/g, "'")}"`);
  if (out === t) return { text: t, changed: false, skipped: false };
  // The only characters this function is allowed to change are quote marks.
  const bare = (x) => x.replace(/["']/g, '');
  if (bare(out) !== bare(t)) return { text: t, changed: false, skipped: true };
  return { text: out, changed: true, skipped: false };
}

function typo(s, on) {
  const t = String(s || '');
  if (!on) return t;
  return t
    .replace(/(^|[\s([{<])"/g, '$1“').replace(/"/g, '”')
    .replace(/(^|[\s([{<])'/g, '$1‘').replace(/'/g, '’');
}

// ------------------------------------------------------- stage: shard (§3.1)

// One shard = ~3 clustered ideas, one assigned lens, one assigned model. Every
// earns_question idea appears in exactly its `attempts` many shards; no two
// shards share membership; pairs_with members co-occur at least once. Lens and
// model are assigned so the attempts on any ONE idea differ in both — that is
// the axis that decorrelates, not the idea subsets (§3.1).
function stageShard(label, slug, opts = {}) {
  const map = readJson(need(join(sectionDir(label, slug), 'concept-map.json'), 'concept-map.json'));
  const models = opts.models || (flag('models') || 'sonnet').split(',');
  const size = Number(flag('shard-size', '3'));

  const ideas = map.ideas.filter((i) => i.earns_question);
  if (!ideas.length) die(`no earns_question ideas in ${slug}/concept-map.json`);

  // Slots: one per attempt. Ideas with more attempts get placed first so the
  // hardest ideas pick their co-members rather than being left with remainders.
  const attemptsOf = (i) => Math.max(1, Math.min(3, Number(i.attempts) || 1));
  const remaining = new Map(ideas.map((i) => [i.id, attemptsOf(i)]));
  const pairsOf = new Map(ideas.map((i) => [i.id, new Set(i.pairs_with || [])]));
  for (const p of map.discrimination_pairs || []) {
    if (pairsOf.has(p.a)) pairsOf.get(p.a).add(p.b);
    if (pairsOf.has(p.b)) pairsOf.get(p.b).add(p.a);
  }

  const shards = [];
  const seenMembership = new Set();
  const seenMembershipLens = new Set();
  const coOccurred = new Set();
  const pairKey = (a, b) => [a, b].sort().join('|');
  let repeatedMembership = 0;

  const byNeed = () => [...remaining.entries()].filter(([, n]) => n > 0)
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([id]) => id);

  // `attempts` is the analyst's decision and sets the pool size (~4N), so it is
  // the constraint that must hold. "No two shards have identical membership" is
  // instrumental — §3.1's actual goal is that the attempts on any ONE idea
  // differ in lens and model. With few ideas the two conflict (3 ideas at size 3
  // admit exactly one membership), so distinct membership yields first, and a
  // repeat is allowed only under a lens that membership has not carried yet.
  // Every repeat is counted in the artifact rather than passing silently.
  let guard = 0;
  while (byNeed().length && guard++ < 500) {
    const order = byNeed();
    const lead = order[0];
    const base = [lead];

    // Prefer an un-co-occurred discrimination partner: a contrast question needs
    // both members of the pair in view, which is why a shard is a cluster.
    const wants = [...(pairsOf.get(lead) || [])]
      .filter((p) => remaining.get(p) > 0 && !coOccurred.has(pairKey(lead, p)));
    for (const w of wants) if (base.length < size && !base.includes(w)) base.push(w);
    for (const id of order) {
      if (base.length >= size) break;
      if (!base.includes(id)) base.push(id);
    }

    // Try the full membership, then progressively smaller ones (§3.1 says
    // "~3 ideas"), and within each the lenses in rotation order, until a
    // (membership, lens) combination is free.
    let placed = null;
    for (let take = base.length; take >= 1 && !placed; take--) {
      const members = base.slice(0, take);
      const key = [...members].sort().join('|');
      const lensOrder = [...LENSES.slice(shards.length % LENSES.length), ...LENSES.slice(0, shards.length % LENSES.length)];
      for (const lens of lensOrder) {
        if (seenMembershipLens.has(`${key}@${lens}`)) continue;
        placed = { members, key, lens };
        break;
      }
    }
    if (!placed) break;

    if (seenMembership.has(placed.key)) repeatedMembership++;
    seenMembership.add(placed.key);
    seenMembershipLens.add(`${placed.key}@${placed.lens}`);

    for (let a = 0; a < placed.members.length; a++) {
      for (let b = a + 1; b < placed.members.length; b++) coOccurred.add(pairKey(placed.members[a], placed.members[b]));
    }
    for (const id of placed.members) remaining.set(id, remaining.get(id) - 1);

    // Model rotates independently of lens, so an idea's attempts differ in both.
    const n = shards.length;
    shards.push({
      shard_id: `${slug}-${String.fromCharCode(97 + n)}`,
      ideas: placed.members,
      lens: placed.lens,
      model: models[n % models.length],
      mode: slug === 'review-block' ? 'review' : 'section',
    });
  }

  const unmet = [...remaining.entries()].filter(([, n]) => n > 0);
  const out = {
    section: slug,
    target_n: map.target_n,
    shard_size: size,
    models,
    pool_size: shards.reduce((a, s) => a + s.ideas.length, 0),
    shards,
    attempts_requested: Object.fromEntries(ideas.map((i) => [i.id, attemptsOf(i)])),
    attempts_unplaced: Object.fromEntries(unmet),
    memberships_repeated_under_a_new_lens: repeatedMembership,
    pairs_co_occurred: [...coOccurred],
  };
  const p = writeJson(join(sectionDir(label, slug), 'shards.json'), out);
  logLine(label, { stage: 'shard', section: slug, shards: shards.length, pool: out.pool_size, artifact: p, ok: true });
  console.log(`shard    ${slug}: ${shards.length} shards, pool ${out.pool_size} (target_n ${map.target_n}, ~4N=${map.target_n * 4})`);
  if (unmet.length) console.log(`         note: ${unmet.length} idea(s) with unplaced attempts: ${unmet.map(([i, n]) => `${i}×${n}`).join(', ')}`);
  return out;
}

// ------------------------------------------------------ stage: dedupe (§2)

// The one free efficiency win: two shards working from the same concept map
// produce near-identical candidates, and R4 currently sits at the curator —
// after every duplicate has already paid for a full Opus critic call.
//
// Runs BEFORE measure (HANDOFF §4 order), so it computes lengths internally for
// the survivor tie-break rather than reading measurements.json. Same imported
// measure(), so the numbers agree with the ones measure writes next.
function stageDedupe(label, slug) {
  const dir = sectionDir(label, slug);
  const candidates = readJson(need(join(dir, 'candidates.json'), 'candidates.json'));

  const scored = candidates.map((c) => {
    const m = measureCandidate(c);
    // Better = closer to R8's centre, then tighter spread. Purely mechanical:
    // dedupe never judges content, it only picks which twin to keep.
    const r8 = m.len_ratio == null ? 99 : Math.abs(m.len_ratio - 1);
    const spread = m.max_over_min == null ? 99 : m.max_over_min;
    return { c, m, words: contentWords(c.stem), score: r8 * 10 + spread };
  });

  const collapsed = [];
  const survivors = [];
  for (const item of scored) {
    const twin = survivors.find((s) => {
      const sameTargets = JSON.stringify([...(s.c.targets || [])].sort())
        === JSON.stringify([...(item.c.targets || [])].sort());
      return sameTargets && overlap(s.words, item.words) >= GATES.dupOverlap;
    });
    if (!twin) { survivors.push(item); continue; }
    // Keep the better-measured one; the loser's id is recorded so lineage
    // survives and the pilot analyst can check for false positives.
    const loser = item.score < twin.score ? twin : item;
    const keeper = item.score < twin.score ? item : twin;
    if (loser === twin) survivors[survivors.indexOf(twin)] = item;
    collapsed.push({
      collapsed_id: loser.c.id,
      survivor_id: keeper.c.id,
      stem_overlap: Number(overlap(twin.words, item.words).toFixed(2)),
      targets: keeper.c.targets,
      why: `R4: ≥${fmtPct(GATES.dupOverlap)} content-word overlap on stems and identical targets`,
      loser_len_ratio: loser.m.len_ratio,
      keeper_len_ratio: keeper.m.len_ratio,
    });
  }

  const out = {
    section: slug,
    candidates_in: candidates.length,
    survivors: survivors.length,
    collapsed_count: collapsed.length,
    critic_calls_saved: collapsed.length,
    survivor_ids: survivors.map((s) => s.c.id),
    collapsed,
  };
  const p = writeJson(join(dir, 'dedupe.json'), out);
  logLine(label, { stage: 'dedupe', section: slug, in: candidates.length, out: survivors.length, saved: collapsed.length, artifact: p, ok: true });
  console.log(`dedupe   ${slug}: ${candidates.length} in, ${survivors.length} survive, ${collapsed.length} collapsed (= ${collapsed.length} critic calls saved)`);
  return out;
}

// ----------------------------------------------------- stage: measure (t1–2)

// Checker tiers 1–2 per candidate. These numbers are passed INTO the critic:
// models count characters badly, so the critic reads them and never recomputes.
function stageMeasure(label, slug) {
  const dir = sectionDir(label, slug);
  const candidates = readJson(need(join(dir, 'candidates.json'), 'candidates.json'));

  // Duplicate ids are FATAL, not a warning. The generator brief's id template
  // (<section>/<model>/NN) carries no shard component, so several shards on the
  // same model each number from 01 and collide. Measurements are keyed by id,
  // so a collision silently drops every twin but the last — observed
  // 2026-09-19, where 11 candidates quietly measured as 3 and every downstream
  // number would have been wrong with nothing on screen to say so.
  const seenIds = new Map();
  const dupes = [];
  for (const c of candidates) {
    if (seenIds.has(c.id)) dupes.push(c.id);
    seenIds.set(c.id, (seenIds.get(c.id) || 0) + 1);
  }
  if (dupes.length) {
    die(`candidates.json has ${dupes.length} duplicate candidate id(s): ${[...new Set(dupes)].join(', ')}\n`
      + '       Measurements are keyed by id, so measuring this file would silently drop candidates.\n'
      + '       Namespace ids per shard before measuring (ids are metadata; never edit question text).');
  }

  const dedupe = maybeJson(join(dir, 'dedupe.json'));
  const keep = dedupe ? new Set(dedupe.survivor_ids) : null;
  // Rewrites (3′ in the PIPELINE §3 flow) postdate dedupe.json and so are absent
  // from its survivor list, yet they are exactly what ships. dedupe cannot
  // simply be re-run to pick them up: a rewrite shares its original's targets
  // and most of its stem, so it would be collapsed against the candidate it
  // replaces. Admit anything carrying `rewrite_of` instead.
  const pool = keep
    ? candidates.filter((c) => keep.has(c.id) || c.rewrite_of)
    : candidates;

  const out = {};
  for (const c of pool) out[c.id] = measureCandidate(c);

  const vals = Object.values(out);
  const okR8 = vals.filter((m) => m.len_ratio >= GATES.r8[0] && m.len_ratio <= GATES.r8[1]).length;
  const okR9 = vals.filter((m) => !(m.correct_is_longest || m.correct_is_shortest) || m.extremum_gap <= GATES.r9Gap).length;
  const okAll = vals.filter((m) => m.len_ratio >= GATES.r8[0] && m.len_ratio <= GATES.r8[1]
    && (!(m.correct_is_longest || m.correct_is_shortest) || m.extremum_gap <= GATES.r9Gap)
    && m.max_over_min <= GATES.spread).length;
  const r5 = vals.filter((m) => m.r5_matches.length).length;

  const p = writeJson(join(dir, 'measurements.json'), out);
  logLine(label, { stage: 'measure', section: slug, n: vals.length, r8_pass: okR8, all_pass: okAll, r5: r5, artifact: p, ok: true });
  console.log(`measure  ${slug}: ${vals.length} candidates · R8 ${okR8}/${vals.length} · R9 ${okR9}/${vals.length} · R8+R9+1.6× ${okAll}/${vals.length} · R5 matches ${r5}`);
  if (anchorSet() === false) console.log('         note: chapter markdown absent — citation_anchor_resolves is null, not false (E4a degrades)');
  return out;
}

// --------------------------------------------------------- stage: queue (§2)

// Critique order by coverage need, not generation order: an idea with no clean
// verdict yet outranks the fifth candidate on an idea that already has three.
// Nothing is dropped — if a run is cut short, the casualties are the candidates
// that were worth least.
function stageQueue(label, slug) {
  const dir = sectionDir(label, slug);
  const map = readJson(need(join(dir, 'concept-map.json'), 'concept-map.json'));
  const candidates = readJson(need(join(dir, 'candidates.json'), 'candidates.json'));
  const dedupe = maybeJson(join(dir, 'dedupe.json'));
  const keep = dedupe ? new Set(dedupe.survivor_ids) : null;
  const pool = keep ? candidates.filter((c) => keep.has(c.id)) : candidates;

  const ideaMeta = new Map(map.ideas.map((i) => [i.id, i]));
  const thresholdIds = new Set(map.ideas.filter((i) => i.threshold).map((i) => i.id));
  const paired = new Set((map.discrimination_pairs || []).flatMap((p) => [p.a, p.b]));

  // Round-robin over ideas, hardest first, taking one candidate per idea per
  // pass. Threshold concepts and discrimination-pair members lead.
  const buckets = new Map();
  for (const c of pool) {
    const key = (c.targets && c.targets[0]) || '_untargeted';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(c);
  }
  const ideaRank = (id) => {
    const i = ideaMeta.get(id);
    return (thresholdIds.has(id) ? 0 : paired.has(id) ? 1 : 2) * 100
      - (i ? (i.criteria_met || []).length : 0);
  };
  const order = [...buckets.keys()].sort((a, b) => ideaRank(a) - ideaRank(b) || a.localeCompare(b));

  const queue = [];
  let pass = 0;
  while (queue.length < pool.length && pass++ < 50) {
    for (const id of order) {
      const b = buckets.get(id);
      if (b && b.length) {
        const c = b.shift();
        queue.push({
          position: queue.length + 1,
          id: c.id,
          targets: c.targets,
          lens: c.lens,
          level_claimed: c.level_claimed,
          idea_attempt: pass,
          priority: thresholdIds.has(id) ? 'threshold' : paired.has(id) ? 'discrimination-pair' : 'ordinary',
        });
      }
    }
  }

  const out = {
    section: slug,
    n: queue.length,
    rationale: 'coverage need: threshold concepts, then discrimination pairs, then criteria count; one candidate per idea per round',
    ideas_in_order: order,
    queue,
  };
  const p = writeJson(join(dir, 'queue.json'), out);
  logLine(label, { stage: 'queue', section: slug, n: queue.length, artifact: p, ok: true });
  console.log(`queue    ${slug}: ${queue.length} candidates ordered over ${order.length} ideas (first: ${queue.slice(0, 3).map((q) => q.id).join(', ')})`);
  return out;
}

// ------------------------------------------------------ stage: shuffle (t4)

// Builds the adversary prompt bodies, seeded. The text comes from
// prompts/adversary-mc.md and nowhere else. Until 2026-09-23 it was a constant
// here, and the prompt actually sent differed from it by one sentence ("Do not
// use any tools.") for every spawn after the baseline — the drift the template
// files exist to make impossible. Options are shuffled per seed so position
// tells are measured as the reader would see them; the key's letter is recorded
// here so `score` can mark a hit without the adversary ever seeing it.
const optionLines = (texts) => texts.map((t, i) => `${String.fromCharCode(65 + i)}. ${t}`).join('\n');

function adversaryPrompt(stem, optionTexts) {
  return render('adversary-mc', { stem, options: optionLines(optionTexts) }).trimEnd();
}

// The seeded option orders for one question. Shared by `shuffle` and `ablate`
// so that, for the same id#seed, every ablation rung shows the options in the
// SAME order as the standard adversary run — position is then controlled and
// the rungs differ in exactly the thing being ablated.
//
// The seeds must give DISTINCT arrangements, or "hit on ≥2/3 seeds" tests the
// same arrangement twice and the flag is weaker than it looks. With independent
// seeding, ~12% of 4-option questions draw a repeat, and the first baseline run
// measured exactly that (5 of 40). So re-seed until the permutation is new,
// bounded by how many distinct ones exist (k! — and k! ≤ seeds for a 2-option
// question, where repeats are unavoidable).
function seededOrders(it, seeds, offset = 0) {
  const seen = new Set();
  const maxPerms = it.options.reduce((a, _, i) => a * (i + 1), 1);
  const orders = [];
  let repeated = 0;
  for (let s = offset + 1; s <= offset + seeds; s++) {
    let order = it.no_shuffle ? it.options : shuffled(it.options, `${it.id}#${s}`);
    if (!it.no_shuffle && seen.size < maxPerms) {
      for (let salt = 0; salt < 64 && seen.has(order.map((o) => o.text).join('\u0000')); salt++) {
        order = shuffled(it.options, `${it.id}#${s}#r${salt}`);
      }
    }
    const permKey = order.map((o) => o.text).join('\u0000');
    if (seen.has(permKey)) repeated++;
    seen.add(permKey);
    orders.push({ seed: s, order });
  }
  return { orders, repeated };
}

function stageShuffle(label, slug, opts = {}) {
  const seeds = Number(flag('seeds', '3'));
  const file = flag('file');
  const outDir = flag('out');
  let items;
  let dest;

  if (file) {
    // Baseline mode: the current shipped question file, which has no
    // candidates.json. Same agent, same prompt, same seeding — the only valid
    // comparator for anything the pipeline produces (PIPELINE §9.7).
    const path = resolve(ROOT, file);
    need(path, 'question file');
    items = [];
    for (const quiz of parseChapterMarkdown(readFileSync(path, 'utf8'))) {
      for (const q of quiz.questions) {
        if (q.type !== 'mc') continue;
        items.push({
          id: `${quiz.title} Q${q.id}`,
          stem: q.question,
          options: q.options.map((o) => ({ text: o.text, key: o.isCorrect })),
          no_shuffle: !q.shuffleAnswers,
        });
      }
    }
    dest = join(resolve(ROOT, outDir || 'runs/baseline'), 'shuffle.json');
  } else {
    const dir = sectionDir(label, slug);
    const candidates = readJson(need(join(dir, 'candidates.json'), 'candidates.json'));
    // The adversary only ever sees survivors (HANDOFF §3). An --ids list names
    // exactly which — normally the critic's survivors — and absent that we fall
    // back to the dedupe survivor set, never the raw pool: a collapsed
    // duplicate would otherwise silently buy three adversary calls.
    const idsArg = flag('ids');
    const dd = maybeJson(join(dir, 'dedupe.json'));
    const only = idsArg ? new Set(idsArg.split(','))
      : dd ? new Set(dd.survivor_ids) : null;
    items = candidates.filter((c) => !only || only.has(c.id));
    if (!idsArg) {
      console.log(`         scope: ${dd ? 'dedupe survivors' : 'full candidate pool (no dedupe.json)'} — pass --ids to restrict to critic survivors`);
    }
    dest = join(dir, 'shuffle.json');
  }

  const prompts = [];
  let repeatedPerms = 0;
  for (const it of items) {
    const { orders, repeated } = seededOrders(it, seeds);
    repeatedPerms += repeated;
    for (const { seed: s, order } of orders) {
      const keyIdx = order.findIndex((o) => o.key);
      prompts.push({
        id: it.id,
        seed: s,
        option_count: order.length,
        key_letter: String.fromCharCode(65 + keyIdx),
        key_position: keyIdx,
        chance: Number((1 / order.length).toFixed(4)),
        prompt: adversaryPrompt(it.stem, order.map((o) => o.text)),
      });
    }
  }

  const out = {
    source: file || `${label}/${slug}`,
    seeds,
    n_questions: items.length,
    n_prompts: prompts.length,
    // Non-zero only where a question has fewer distinct permutations than seeds
    // (a 2-option question at 3 seeds). Anything else means the re-seed failed.
    questions_with_a_repeated_permutation: repeatedPerms,
    prompts,
  };
  const p = writeJson(dest, out);
  if (label) logLine(label, { stage: 'shuffle', section: slug || basename(dirname(dest)), n: prompts.length, seeds, artifact: p, ok: true });
  console.log(`shuffle  ${out.source}: ${items.length} questions × ${seeds} seeds = ${prompts.length} adversary prompts → ${p}`);
  if (repeatedPerms) console.log(`         note: ${repeatedPerms} prompt(s) repeat a permutation (fewer than ${seeds} distinct orders exist)`);
  return out;
}


// -------------------------------------------------------- stage: prompt

// Render one spawn prompt from prompts/<template>.md. The orchestrator passes the
// output, unmodified, as the Agent call's prompt, and never composes one.
//
// Everything that can be derived IS derived, and only for placeholders the
// template declares: paths from --run/--section/--bench/--id, the model and
// shard letter that `merge` reads back out of ids and file names, the curator's
// reason for a regeneration. Setting a derived value by hand needs --override,
// which is logged. Input paths the template lists under `paths:` must exist.
// Every rendered prompt is written to disk and logged with the template's and
// the text's hashes, so a spawn can be audited against exactly what was sent.
function allFlags(name) {
  const out = [];
  for (let i = 0; i < argv.length - 1; i++) if (argv[i] === `--${name}`) out.push(argv[i + 1]);
  return out;
}

const rel = (abs) => relative(ROOT, abs).split(sep).join('/');

// Fixed text the script inserts as a VALUE — a derived line, the canary stem, the
// withheld-stem line — still lives in prompts/_partials/, never in code.
function fillPartial(part, map = {}) {
  let t;
  try { t = loadPartial(part); } catch (e) { if (e instanceof PromptError) die(e.message); throw e; }
  const out = t.replace(/\{\{([a-z_][a-z0-9_]*)\}\}/g, (m, k) => (k in map ? String(map[k]) : m));
  if (/\{\{|\}\}/.test(out)) die(`partial "${part}" has an unfilled slot: ${out}`);
  return out;
}

// The bench's domains, from the entries table in bench/README.md, so a new
// passage's author is told what not to echo without anyone typing the list.
function benchDomains() {
  const p = join(ROOT, 'bench', 'README.md');
  if (!existsSync(p)) return 'none yet';
  const rows = readFileSync(p, 'utf8').split('\n')
    .map((l) => l.match(/^\|\s*`([a-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|/))
    .filter(Boolean);
  return rows.length ? rows.map((m) => `${m[1]} (${m[2]})`).join('; ') : 'none yet';
}

function nextLetter(candDir, slug) {
  const used = new Set(existsSync(candDir)
    ? readdirSync(candDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '').slice(`${slug}-`.length))
    : []);
  for (const c of 'abcdefghijklmnopqrstuvwxyz') if (!used.has(c)) return c;
  die(`no free shard letter left in ${candDir}`);
}

function deriveVars(name, tpl, ctx) {
  const declared = new Set([...tpl.placeholders, ...tpl.optional]);
  const d = {};
  const set = (k, v) => { if (declared.has(k) && v != null) d[k] = v; };
  const { label, slug, bench, id, model, letter, idea } = ctx;
  const dir = label && slug ? `runs/${label}/${slug}` : null;
  const short = id ? id.split('/').pop() : null;

  if (dir) {
    set('section', slug);
    set('run_label', label);
    set('dir', dir);
    set('concept_map', `${dir}/concept-map.json`);
    // A bench iteration runs on a COPY of the passage at a neutral path inside
    // the run (see bench-run), so the analyst and generator are never pointed at
    // bench/, where files describe the passage as invented (b02 review #3).
    if (existsSync(join(ROOT, dir, 'section.md'))) set('prose', `${dir}/section.md`);
    else if (existsSync(join(CHAPTER_DIR, `${slug}.md`))) set('prose', relative(ROOT, join(CHAPTER_DIR, `${slug}.md`)).split(sep).join('/'));
    const runIdeas = join(ROOT, dir, 'ideas.json');
    if (existsSync(runIdeas)) set('ideas', fillPartial('ideas-line', { ideas_list: readJson(runIdeas).map((x) => `\`${x}\``).join(', ') }));
    set('candidates', `${dir}/candidates.json`);
    if (name === 'bench-claim-map') set('out', `${dir}/claim-map.raw.json`);
    const mis = `misconceptions/${slug}.md`;
    if (existsSync(join(ROOT, mis))) set('extra_inputs', fillPartial('extra-input-misconceptions', { path: mis }));
    const cm = maybeJson(join(ROOT, dir, 'concept-map.json'));
    if (cm && cm.target_n != null && name === 'curate') set('target_n', String(cm.target_n));
    if (name === 'curate') { set('out', `${dir}/curator.json`); set('review_sheet_out', `staging/review-sheet-${slug}.md`); }
    if (name === 'analyse') set('out', `${dir}/concept-map.json`);
    if (short) {
      set('candidate_input', `${dir}/critic-inputs/${short}.json`);
      if (name === 'critique') set('out', `${dir}/verdicts/${short}.json`);
      if (name === 'critique-pass2') { set('out', `${dir}/verdicts-pass2/${short}.json`); set('prior_verdict', `${dir}/verdicts/${short}.json`); }
    }
    if (model) set('id_prefix', `${slug}/${model}`);
    if (name === 'generate-section' || name === 'generate-shard' || name === 'regenerate') {
      const L = letter || nextLetter(join(ROOT, dir, 'candidates'), slug);
      set('out', `${dir}/candidates/${slug}-${L}.json`);
    }
    if (name === 'regenerate' && idea) {
      set('idea_id', idea);
      const cur = maybeJson(join(ROOT, dir, 'curator.json'));
      const hit = cur?.coverage?.earns_question_uncovered?.find((u) => u.id === idea);
      if (!hit) die(`regenerate: curator.json names no uncovered idea "${idea}" — regeneration runs only against a reported gap`);
      set('curator_reason', hit.why);
    }
  }
  if (bench) {
    const b = `bench/${bench}`;
    set('bench_id', bench);
    set('out_dir', b);
    set('avoid', benchDomains());
    if (!dir) {
      set('prose', `${b}/passage.md`);
      set('passage', `${b}/passage.md`);
      set('concept_map', `${b}/concept-map.json`);
    }
    // A control author works inside a run but writes about the bench passage itself.
    if (name === 'control-author') set('passage', `${b}/passage.md`);
    set('claims', `${b}/private/claims.json`);
    const dec = `${b}/private/reviews-decisions.md`;
    if (existsSync(join(ROOT, dec))) set('decisions', dec);
    if (name === 'analyse' && !dir) set('out', `${b}/concept-map.json`);
    const ip = join(ROOT, b, 'ideas.json');
    if (!dir && existsSync(ip)) set('ideas', fillPartial('ideas-line', { ideas_list: readJson(ip).map((x) => `\`${x}\``).join(', ') }));
  }
  return d;
}

function stagePrompt(label, slug, opts = {}) {
  const name = opts.template ?? (argv[1] && !argv[1].startsWith('--') ? argv[1] : null);
  if (!name) die('usage: pipeline.mjs prompt <template> [--run R --section S] [--bench B] [--id ID] [--model M] [--letter X] [--idea I] [--set k=v ...] [--set-file k=path ...] [--override] [--prior-findings path] [--out FILE]');
  let tpl;
  try { tpl = loadTemplate(name); } catch (e) { if (e instanceof PromptError) die(e.message); throw e; }
  const ctx = {
    label, slug,
    bench: opts.bench ?? flag('bench'),
    id: opts.id ?? flag('id'),
    model: opts.model ?? flag('model'),
    letter: opts.letter ?? flag('letter'),
    idea: opts.idea ?? flag('idea'),
  };
  const derived = deriveVars(name, tpl, ctx);
  const vars = { ...derived };
  const override = opts.override ?? argv.includes('--override');
  const explicit = {};
  for (const kv of opts.set ?? allFlags('set')) {
    const i = kv.indexOf('=');
    if (i < 1) die(`--set expects key=value, got "${kv}"`);
    explicit[kv.slice(0, i)] = kv.slice(i + 1);
  }
  for (const kv of opts.setFile ?? allFlags('set-file')) {
    const i = kv.indexOf('=');
    if (i < 1) die(`--set-file expects key=path, got "${kv}"`);
    const fp = resolve(ROOT, kv.slice(i + 1));
    if (!existsSync(fp)) die(`--set-file: ${kv.slice(i + 1)} does not exist`);
    explicit[kv.slice(0, i)] = readFileSync(fp, 'utf8').trimEnd();
  }
  const pf = opts.priorFindings ?? flag('prior-findings');
  if (pf) explicit.prior_findings = fillPartial('prior-findings-line', { path: pf });
  const clobbered = Object.keys(explicit).filter((k) => k in derived && explicit[k] !== derived[k]);
  if (clobbered.length && !override) die(`prompt: ${clobbered.join(', ')} ${clobbered.length > 1 ? 'are' : 'is'} derived; setting ${clobbered.length > 1 ? 'them' : 'it'} by hand needs --override (which is logged)`);
  Object.assign(vars, explicit);

  // Input paths must exist; outputs must land where the pipeline looks.
  const missingPaths = tpl.paths.filter((k) => vars[k] != null && !existsSync(resolve(ROOT, vars[k])));
  if (missingPaths.length) die(`prompt ${name}: input path(s) do not exist — ${missingPaths.map((k) => `${k}=${vars[k]}`).join(', ')}`);
  for (const k of ['out', 'review_sheet_out', 'out_dir']) {
    if (vars[k] != null && !/^(runs|bench|reviews|staging)\//.test(vars[k])) die(`prompt ${name}: ${k}=${vars[k]} must be under runs/, bench/, reviews/ or staging/`);
  }
  if (name === 'generate-section' && vars.n != null && Number(vars.n) > 2 * STEM_FORMATS.length) {
    die(`prompt generate-section: n=${vars.n} is unsatisfiable at 2 per stem_format × ${STEM_FORMATS.length} formats (max ${2 * STEM_FORMATS.length})`);
  }

  const text = render(name, vars);

  // Record what was sent.
  const recDir = label ? join(runDir(label), 'prompts') : ctx.bench ? join(ROOT, 'bench', ctx.bench, 'private', 'prompts') : null;
  let recPath = null;
  if (recDir) {
    mkdirSync(recDir, { recursive: true });
    const tag = [name, ctx.id ? ctx.id.split('/').pop() : null, name.startsWith('generate') ? basename(String(vars.out || ''), '.json') : null].filter(Boolean).join('-');
    let n = 1;
    recPath = join(recDir, `${tag}.txt`);
    while (existsSync(recPath)) { n += 1; recPath = join(recDir, `${tag}-${n}.txt`); }
    writeFileSync(recPath, text, 'utf8');
    const entry = {
      stage: 'prompt', template: name, template_sha256: sha256(tpl.source), text_sha256: sha256(text),
      file: rel(recPath), derived: Object.keys(derived), set_by_hand: Object.keys(explicit),
      overridden: override ? clobbered : [],
      vars: Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v).length > 160 ? `sha256:${sha256(String(v)).slice(0, 16)}` : v])),
      ok: true,
    };
    if (label) logLine(label, entry);
    else appendFileSync(join(recDir, 'log.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`);
  } else if (!opts.quiet) {
    console.error('         note: not recorded — pass --run or --bench so the rendered prompt is kept');
  }
  const out = opts.out ?? flag('out');
  if (out) { writeFileSync(resolve(ROOT, out), text, 'utf8'); console.error(`prompt   ${name} → ${out}`); }
  else if (!opts.quiet) process.stdout.write(text);
  return { text, recorded: recPath ? rel(recPath) : null, vars };
}

// -------------------------------------------------------- stage: ablate

// The ablation ladder, as a stage rather than orchestrator improvisation. For
// each candidate × seed × rung it writes one prompt file plus a manifest mapping
// every file to its id, seed, key letter, chance and the agent that must answer
// it. The orchestrator records only "file -> reply" in ablation/picks.json.
//
//   full          quiz-adversary   prompts/adversary-mc.md, stem + options
//   options-only  quiz-adversary   the SAME template, stem slot = _partials/stem-withheld.md
//   sighted       general-purpose  prompts/sighted-reader.md, with the passage (needs --passage)
//   stem-only     quiz-recall      prompts/adversary-free-recall.md; answers graded by grade-recall.md
//
// For the same id#seed every rung shows the options in the SAME order, so the
// rungs differ only in what is withheld. Exclusions are listed, never silent:
// negation stems are dropped from options-only (a reader asked for the correct
// option picks a true-sounding one, and the key of a negation stem is the false
// one), and stems that are ill-posed without options are dropped from stem-only.
//
//   full-explain          quiz-adversary + API voices   prompts/adversary-explain.md — per-option cue codes
//   options-only-explain  the same, stem slot withheld
//
// The explain rungs are DIAGNOSIS, never the score: a reader asked to reason
// cracks more than one asked for a letter, so their hit rates are reported apart
// and never pooled with the letter rungs. `api: true` marks the rungs
// scripts/voices.mjs can answer (a prompt that is complete as text); sighted
// needs a file read and stem-only needs a grader, so both stay Claude-only.
const ABLATION_RUNGS = {
  full: { agent: 'quiz-adversary', model: 'haiku', api: true },
  'options-only': { agent: 'quiz-adversary', model: 'haiku', api: true },
  sighted: { agent: 'general-purpose', model: 'haiku' },
  'stem-only': { agent: 'quiz-recall', model: 'haiku' },
  'full-explain': { agent: 'quiz-adversary', model: 'haiku', api: true, explain: true },
  'options-only-explain': { agent: 'quiz-adversary', model: 'haiku', api: true, explain: true },
};
const isExplainRung = (r) => !!ABLATION_RUNGS[r]?.explain;
const withholdsStem = (r) => r === 'options-only' || r === 'options-only-explain';

// The cue codes, read from the partial every voice is shown, so the list the
// reader chose from and the list the scorer accepts cannot drift apart.
function tellCodes() {
  const codes = [...loadPartial('tell-codes').matchAll(/^\s*- `([a-z-]+)`/gm)].map((m) => m[1]);
  if (!codes.includes('other') || !codes.includes('no-tell')) die('tell-codes partial must define `other` and `no-tell`');
  return codes;
}

// The one name the Claude subagent's replies are filed under. Its letters come
// from ablation/picks.json (as before); its explain replies are saved verbatim
// by the orchestrator to ablation/voices/claude-haiku/<rung>/<NN>.txt.
const CLAUDE_VOICE = 'claude-haiku';
const RECALL_GRADES = ['match', 'partial', 'miss', 'idk', 'refusal'];
const LETTER_RUNGS = new Set(['full', 'options-only', 'sighted']);

const isNegationStem = (c) => c.negation === true || !!measure(asQuestion(c)).negation_in_stem;
const illPosedWithoutOptions = (c) => isNegationStem(c)
  || /\bwhich of (the following|these|them)\b/i.test(c.stem)
  || /\bthe following\b/i.test(c.stem)
  || /\b(the|these) (options|answers|choices|statements)\b/i.test(c.stem);

// "The key is the option most like the others" is a classic test-wise heuristic.
// Reported per question, not gated: key's mean content-word overlap with the
// distractors, minus the mean overlap of each distractor with the rest.
function keyCentrality(c) {
  const opts = c.options.map((o) => ({ key: !!o.key, w: contentWords(o.text) }));
  const avgOverlap = (i) => {
    const others = opts.filter((_, j) => j !== i);
    return others.length ? mean(others.map((o) => overlap(opts[i].w, o.w))) : 0;
  };
  const k = opts.findIndex((o) => o.key);
  if (k < 0 || opts.length < 3) return null;
  const dist = opts.map((_, i) => i).filter((i) => i !== k);
  return Number((avgOverlap(k) - mean(dist.map(avgOverlap))).toFixed(3));
}

function stageAblate(label, slug, opts = {}) {
  const dir = sectionDir(label, slug);
  const candidates = readJson(need(join(dir, 'candidates.json'), 'candidates.json'));
  const seeds = Number(opts.seeds ?? flag('seeds', '1'));
  const offset = Number(opts.seedOffset ?? flag('seed-offset', '0'));
  const rungs = String(opts.rungs ?? flag('rungs', 'full,options-only')).split(',').map((r) => r.trim()).filter(Boolean);
  const idsArg = opts.ids ?? flag('ids');
  const force = opts.force ?? argv.includes('--force');
  const passage = opts.passage ?? flag('passage');
  // Explain rungs use the first --explain-seeds of the seeds (default 1): their
  // value is the cue codes, and diversity there comes from voices, not orders.
  // --claude-seeds / --claude-explain-seeds say how many of each question's
  // prompts the Claude subagent answers; API voices answer all of them. Default
  // for letters is every seed, which is the behaviour before voices existed.
  const explainSeeds = Number(opts.explainSeeds ?? flag('explain-seeds', '1'));
  const claudeSeeds = Number(opts.claudeSeeds ?? flag('claude-seeds', String(seeds)));
  const claudeExplainSeeds = Number(opts.claudeExplainSeeds ?? flag('claude-explain-seeds', '1'));
  if (!Number.isInteger(seeds) || seeds < 1) die(`--seeds must be a positive integer, got ${seeds}`);
  if (!Number.isInteger(offset) || offset < 0) die(`--seed-offset must be a non-negative integer, got ${offset}`);
  for (const r of rungs) if (!ABLATION_RUNGS[r]) die(`unknown rung "${r}" — known: ${Object.keys(ABLATION_RUNGS).join(', ')}`);
  if (!Number.isInteger(explainSeeds) || explainSeeds < 1 || explainSeeds > seeds) die(`--explain-seeds must be 1..${seeds}, got ${explainSeeds}`);
  if (!Number.isInteger(claudeSeeds) || claudeSeeds < 0 || claudeSeeds > seeds) die(`--claude-seeds must be 0..${seeds}, got ${claudeSeeds}`);
  if (!Number.isInteger(claudeExplainSeeds) || claudeExplainSeeds < 0 || claudeExplainSeeds > explainSeeds) die(`--claude-explain-seeds must be 0..${explainSeeds}, got ${claudeExplainSeeds}`);
  if (rungs.includes('sighted')) {
    if (!passage) die('the sighted rung needs --passage <path to the section prose>');
    if (!existsSync(resolve(ROOT, passage))) die(`--passage ${passage} does not exist`);
  }

  let items = candidates.filter((c) => c && c.stem && Array.isArray(c.options));
  if (idsArg) {
    const want = String(idsArg).split(',');
    const have = new Set(items.map((c) => c.id));
    const absent = want.filter((w) => !have.has(w));
    if (absent.length) die(`ablate: id(s) not in candidates.json: ${absent.join(', ')}`);
    const only = new Set(want);
    items = items.filter((c) => only.has(c.id));
  }
  if (!items.length) die(`ablate: no candidates to ablate in ${dir}`);

  const ad = join(dir, 'ablation');
  // Never overwrite a manifest whose picks may already have been recorded: the
  // picks are keyed by file name, and a rebuilt manifest silently re-points them.
  // The same holds for voice replies, which can take days of free quota to
  // collect and exist even when picks.json does not (review 2026-09-23-voices #9).
  const hasVoiceReplies = (d) => existsSync(d) && readdirSync(d, { withFileTypes: true })
    .some((x) => (x.isDirectory() ? hasVoiceReplies(join(d, x.name)) : /\.(json|txt)$/.test(x.name) && x.name !== 'voice.json'));
  if ((existsSync(join(ad, 'picks.json')) || hasVoiceReplies(join(ad, 'voices'))) && !force) {
    die(`ablate: ${ad} already holds recorded replies (picks.json or voices/). A new manifest would re-point them.\n`
      + '       Move the old ablation/ aside, or pass --force if the replies are known to be stale.');
  }
  rmSync(ad, { recursive: true, force: true });

  const withheld = fillPartial('stem-withheld');
  const entries = [];
  const excluded = [];
  for (const rung of rungs) {
    let k = 0;
    const R = ABLATION_RUNGS[rung];
    for (const it of items) {
      if (withholdsStem(rung) && isNegationStem(it)) { excluded.push({ id: it.id, rung, reason: 'negation stem: the key is the false statement' }); continue; }
      if (rung === 'stem-only' && illPosedWithoutOptions(it)) { excluded.push({ id: it.id, rung, reason: 'ill-posed without options' }); continue; }
      const { orders } = seededOrders(it, seeds, offset);
      const use = R.explain ? orders.slice(0, explainSeeds) : orders;
      use.forEach(({ seed, order }, si) => {
        const texts = order.map((o) => o.text);
        const keyIdx = order.findIndex((o) => o.key);
        let text;
        if (rung === 'full') text = render('adversary-mc', { stem: it.stem, options: optionLines(texts) });
        else if (rung === 'options-only') text = render('adversary-mc', { stem: withheld, options: optionLines(texts) });
        else if (rung === 'full-explain') text = render('adversary-explain', { stem: it.stem, options: optionLines(texts) });
        else if (rung === 'options-only-explain') text = render('adversary-explain', { stem: withheld, options: optionLines(texts) });
        else if (rung === 'sighted') text = render('sighted-reader', { passage, stem: it.stem, options: optionLines(texts) });
        else text = render('adversary-free-recall', { stem: it.stem });
        const file = `${rung}/${String(k).padStart(2, '0')}`;
        mkdirSync(join(ad, rung), { recursive: true });
        writeFileSync(join(ad, `${file}.txt`), `${text.trimEnd()}\n`, 'utf8');
        entries.push({
          file, rung, agent: R.agent, model: R.model,
          id: it.id, seed,
          // Whether the Claude subagent answers this prompt. API voices answer
          // every prompt of an `api` rung regardless.
          claude: R.api ? si < (R.explain ? claudeExplainSeeds : claudeSeeds) : true,
          option_count: rung === 'stem-only' ? null : order.length,
          key_letter: rung === 'stem-only' ? null : String.fromCharCode(65 + keyIdx),
          chance: rung === 'stem-only' ? null : Number((1 / order.length).toFixed(4)),
          // The recall grader needs the key's claim; no reader ever sees this file.
          key_text: rung === 'stem-only' ? order[keyIdx].text : undefined,
          // The explain analysis maps each displayed letter back to its option.
          options_shown: R.explain ? texts : undefined,
          // Scored against what the reader SAW, not the candidate as it is later (review #10).
          stem_shown: rung === 'full-explain' ? it.stem : undefined,
        });
        k += 1;
      });
    }
  }
  const centrality = Object.fromEntries(items.map((c) => [c.id, keyCentrality(c)]));
  writeJson(join(ad, 'manifest.json'), {
    source: `${label}/${slug}`, seeds, seed_offset: offset, rungs, passage: passage || null,
    explain_seeds: explainSeeds, claude_seeds: claudeSeeds, claude_explain_seeds: claudeExplainSeeds,
    // The code list the readers were shown, so later edits to the partial never re-score these replies.
    tell_codes: rungs.some(isExplainRung) ? tellCodes() : undefined,
    tell_codes_sha256: rungs.some(isExplainRung) ? sha256(loadPartial('tell-codes')) : undefined,
    n_questions: items.length, n_prompts: entries.length, excluded, key_centrality: centrality, entries,
  });
  // picks.json is the Claude subagent's LETTER replies only. Its explain replies
  // are JSON and are saved as files (see CLAUDE_VOICE); API voices write their own.
  writeJson(join(ad, 'picks.template.json'), Object.fromEntries(entries.filter((e) => e.claude && !isExplainRung(e.rung)).map((e) => [e.file, ''])));
  logLine(label, { stage: 'ablate', section: slug, rungs, seeds, seed_offset: offset, explain_seeds: explainSeeds, claude_seeds: claudeSeeds, n_questions: items.length, n_prompts: entries.length, excluded: excluded.length, ok: true });
  console.log(`ablate   ${label}/${slug}: ${items.length} question(s) × ${seeds} seed(s) × ${rungs.length} rung(s) = ${entries.length} prompt(s)${offset ? `, seeds ${offset + 1}–${offset + seeds}` : ''}`);
  for (const r of rungs) {
    const n = entries.filter((e) => e.rung === r && e.claude).length;
    console.log(`         ${r.padEnd(21)} → agent ${ABLATION_RUNGS[r].agent} (${ABLATION_RUNGS[r].model}) answers ${n}${ABLATION_RUNGS[r].api ? '; API voices answer all (scripts/voices.mjs)' : ''}`);
  }
  const claudeExplain = entries.filter((e) => e.claude && isExplainRung(e.rung)).length;
  if (claudeExplain) console.log(`         claude explain replies: save each verbatim to ablation/voices/${CLAUDE_VOICE}/<rung>/<NN>.txt`);
  if (excluded.length) console.log(`         excluded: ${excluded.map((x) => `${x.id.split('/').pop()} from ${x.rung}`).join(', ')}`);
  console.log(`         → ${ad}  (fill picks.template.json → picks.json, then ablate-score)`);
  return { entries, excluded, dir: ad };
}

// A 95% interval with the QUESTION as the unit. The seeds of one question are
// not independent observations — per-question results clump — so a trial-level
// binomial interval overstates precision. Returns null below n = 2.
function questionUnitCI(rates) {
  const n = rates.length;
  if (n < 2) return null;
  const m = mean(rates);
  const sd = Math.sqrt(rates.reduce((a, r) => a + (r - m) ** 2, 0) / (n - 1));
  const se = sd / Math.sqrt(n);
  return { n, mean: m, sd, lo: Math.max(0, m - 1.96 * se), hi: Math.min(1, m + 1.96 * se) };
}

// Was an interpretation pre-registered in run.log before this section was first
// ablated? Checked by timestamp, so "before any result exists" is verifiable.
function preregisteredBefore(label, slug) {
  const p = join(runDir(label), 'run.log');
  if (!existsSync(p)) return false;
  const lines = readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const pre = lines.find((l) => l.stage === 'preregister' && l.ts);
  const abl = lines.find((l) => l.stage === 'ablate' && l.section === slug && l.ts);
  // <=, not <: two log lines can share a millisecond when a script writes both.
  return !!(pre && abl && pre.ts <= abl.ts);
}

// Accept "B" or "B." — a bare letter with punctuation. Anything else is an
// unparsed reply. For the Claude subagent it is counted as a miss AND reported,
// never silently dropped — its baseline was built that way. For an API voice it
// is reported and left out of the rate (review 2026-09-23-voices #8): a free
// model cut off mid-sentence is a delivery failure, and counting it as a miss
// would lower the hit rate, the non-conservative direction for a leak gate.
function letterRow(e, raw, api = false) {
  const m = String(raw).trim().match(/^\W*([A-Za-z])\W*$/);
  const letter = m ? m[1].toUpperCase() : null;
  const ok = letter && letter.charCodeAt(0) - 65 < e.option_count;
  return { ...e, picked: ok ? letter : null, unparsed: !ok, excludeFromRate: api && !ok, hit: !!ok && letter === e.key_letter };
}

function letterStats(rs) {
  const scored = rs.filter((r) => !r.excludeFromRate);
  const ids = uniq(scored.map((r) => r.id));
  const perQ = ids.map((id) => {
    const q = scored.filter((r) => r.id === id);
    return { id, hits: q.filter((r) => r.hit).length, trials: q.length, rate: q.filter((r) => r.hit).length / q.length };
  });
  const hits = scored.filter((r) => r.hit).length;
  const chance = mean(scored.map((r) => r.chance));
  return {
    perQ,
    stats: {
      questions: ids.length, trials: scored.length, hits, unparsed: rs.filter((r) => r.unparsed).length,
      unparsed_excluded: rs.filter((r) => r.excludeFromRate).length,
      hit_rate: scored.length ? hits / scored.length : null,
      mean_chance: chance,
      excess_over_chance: scored.length ? hits / scored.length - chance : null,
      ci_question_unit: questionUnitCI(perQ.map((q) => q.rate)),
    },
  };
}

// One voice's record for one prompt file. API voices write a call record
// (<NN>.json, from scripts/voices.mjs); the orchestrator saves a Claude reply
// verbatim (<NN>.txt). A record whose call failed, was truncated or came back
// empty is "not answered", never a miss. An API record answered a prompt with a
// recorded hash; if the prompt file has changed since, the manifest was rebuilt
// under the replies and they no longer describe these prompts (review #10).
function readVoiceRecord(ad, voice, e) {
  const vdir = join(ad, 'voices');
  const j = join(vdir, voice, `${e.file}.json`);
  if (existsSync(j)) {
    const r = readJson(j);
    const pf = join(ad, `${e.file}.txt`);
    if (r.prompt_sha256 && existsSync(pf) && sha256(readFileSync(pf, 'utf8')) !== r.prompt_sha256) {
      die(`ablate-score: ${voice}/${e.file} answered a prompt that differs from ${e.file}.txt as it is now — the manifest was rebuilt under these replies`);
    }
    return r;
  }
  const t = join(vdir, voice, `${e.file}.txt`);
  return existsSync(t) ? { status: 'ok', reply_text: readFileSync(t, 'utf8') } : null;
}

const listVoices = (ad) => {
  const vdir = join(ad, 'voices');
  return existsSync(vdir)
    ? readdirSync(vdir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
};

const voiceMeta = (ad, v) => maybeJson(join(ad, 'voices', v, 'voice.json'))
  ?? (v === CLAUDE_VOICE ? { id: v, provider: 'claude-code', model: 'haiku', family: 'anthropic' } : { id: v, family: v });

const reasoningTokens = (u) => (u ? (u.thoughtsTokenCount ?? u.completion_tokens_details?.reasoning_tokens ?? u.reasoning_output_tokens ?? null) : null);

// Letter replies of every API voice, for the letter rungs an API voice can answer.
// The Claude subagent's letters are picks.json and are not read from here.
function readVoiceLetterRows(ad, man) {
  const out = {};
  for (const v of listVoices(ad).filter((x) => x !== CLAUDE_VOICE)) {
    const rows = [];
    const status = {};
    const versions = new Set();
    const dropped = new Set();
    for (const e of man.entries.filter((x) => ABLATION_RUNGS[x.rung].api && !isExplainRung(x.rung))) {
      const rec = readVoiceRecord(ad, v, e);
      if (!rec) continue;
      status[rec.status] = (status[rec.status] ?? 0) + 1;
      if (rec.status !== 'ok') continue;
      if (rec.model_version) versions.add(rec.model_version);
      dropped.add(JSON.stringify(rec.settings_dropped ?? []));
      rows.push({ ...letterRow(e, rec.reply_text, true), reasoning_tokens: reasoningTokens(rec.usage) });
    }
    if (rows.length || Object.keys(status).length) {
      out[v] = { meta: voiceMeta(ad, v), rows, status, model_versions: [...versions], settings_dropped_variants: [...dropped].map((d) => JSON.parse(d)) };
    }
  }
  return out;
}

// Per family, one rate per question: the voices of a family are averaged at the
// question level first, so a family with two voices counts once (review #2).
function familyRates(rowsWithVoice, metaOf) {
  const byFam = {};
  for (const r of rowsWithVoice.filter((x) => !x.excludeFromRate)) (byFam[metaOf(r.voice).family ?? r.voice] ??= []).push(r);
  const out = {};
  for (const [f, rs] of Object.entries(byFam)) {
    const perQ = {};
    for (const id of uniq(rs.map((r) => r.id))) {
      const vs = uniq(rs.filter((r) => r.id === id).map((r) => r.voice));
      perQ[id] = mean(vs.map((v) => { const q = rs.filter((r) => r.id === id && r.voice === v); return q.filter((r) => r.hit).length / q.length; }));
    }
    const rates = Object.values(perQ);
    out[f] = { voices: uniq(rs.map((r) => r.voice)), questions: rates.length, rate: rates.length ? mean(rates) : null, ci_question_unit: questionUnitCI(rates), per_question: perQ };
  }
  return out;
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

// The panel headline: the median of per-family rates, over only the questions
// every family answered (complete cases), so a question is never made to look
// leakier by which voices happened to have quota for it (review #2).
function panelHeadline(fams) {
  const names = Object.keys(fams);
  if (!names.length) return null;
  const common = Object.keys(fams[names[0]].per_question).filter((id) => names.every((f) => id in fams[f].per_question));
  const famRates = Object.fromEntries(names.map((f) => [f, common.length ? mean(common.map((id) => fams[f].per_question[id])) : null]));
  const vals = Object.values(famRates).filter((x) => x != null);
  return { families: names.length, complete_questions: common.length, family_rates_on_complete: famRates, median_family_rate: vals.length ? median(vals) : null };
}

// Parse and check one explain reply. This parses; it never repairs. A single
// surrounding code fence is unwrapped and noted — that removes no content. A
// reply that is not one JSON object with an entry per shown letter is `ok:
// false`. Within a usable reply, an option whose codes are missing, empty, all
// unknown, or `no-tell` mixed with other codes is UNRATED: it stays out of every
// denominator rather than posing as "rated, no cue" (review #4). Unknown codes
// are recorded and dropped, never coerced to a known one.
function parseExplainReply(raw, e, codes) {
  const problems = [];
  let text = String(raw).trim();
  const fence = text.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n```$/);
  if (fence) { text = fence[1]; problems.push('fenced'); }
  let vals;
  try { vals = parseJsonValues(text); } catch { return { ok: false, problems: ['not-json'] }; }
  if (vals.length !== 1) return { ok: false, problems: [vals.length ? 'several-json-values' : 'not-json'] };
  const obj = vals[0];
  if (text.slice(0, text.indexOf('{')).trim() || text.slice(text.lastIndexOf('}') + 1).trim()) problems.push('prose-around-json');
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || !obj.options || typeof obj.options !== 'object' || Array.isArray(obj.options)) return { ok: false, problems: ['no-options-object'] };
  const letters = Array.from({ length: e.option_count }, (_, i) => String.fromCharCode(65 + i));
  const got = Object.keys(obj.options).map((k) => k.trim().toUpperCase());
  if (got.length !== letters.length || letters.some((l) => !got.includes(l))) return { ok: false, problems: ['option-letters-mismatch'] };
  const options = {};
  for (const [k, v] of Object.entries(obj.options)) {
    const L = k.trim().toUpperCase();
    const p = Number(v?.p);
    let rated = true;
    let valid = [];
    if (!v || !Array.isArray(v.codes)) { problems.push('codes-missing'); rated = false; }
    else {
      const rawCodes = v.codes.map((c) => String(c).trim().toLowerCase());
      const invalid = rawCodes.filter((c) => !codes.includes(c));
      if (invalid.length) problems.push(`invalid-code:${invalid.join('|')}`);
      valid = uniq(rawCodes.filter((c) => codes.includes(c)));
      if (!rawCodes.length) { problems.push('codes-empty'); rated = false; }
      else if (!valid.length) { problems.push('codes-all-invalid'); rated = false; }
      else if (valid.includes('no-tell') && valid.length > 1) { problems.push('no-tell-with-codes'); rated = false; }
    }
    const note = typeof v?.note === 'string' ? v.note.trim() : '';
    if (valid.includes('other') && !note) problems.push('other-without-note');
    if (!Number.isFinite(p) || p < 0) problems.push('p-missing');
    options[L] = { p: Number.isFinite(p) && p >= 0 ? p : null, codes: valid, note, rated, invalid: v && Array.isArray(v.codes) && v.codes.some((c) => !codes.includes(String(c).trim().toLowerCase())) };
  }
  const sum = Object.values(options).reduce((a, o) => a + (o.p ?? 0), 0);
  if (Math.abs(sum - 100) > 5) problems.push(`p-sum:${sum}`);
  for (const o of Object.values(options)) o.pn = sum > 0 && o.p != null ? o.p / sum : null;
  // "A", "A." and "Option A" name the same letter (Gemini review #1); anything
  // else is pick-invalid, left out of the explain hit rate and counted.
  const pm = String(obj.pick ?? '').trim().match(/^W*(?:options+)?([A-Za-z])W*$/i);
  const pick = pm ? pm[1].toUpperCase() : '';
  if (!letters.includes(pick)) problems.push('pick-invalid');
  return { ok: true, problems, options, pick: letters.includes(pick) ? pick : null, strategy: typeof obj.strategy === 'string' ? obj.strategy.trim() : '' };
}

// Percentile rank of each value among the displayed options: 0 lowest, 1
// highest, ties averaged. Used instead of "is the unique maximum", which capped
// how often a claimed cue could ever count as true (review #5).
function percentileRanks(xs) {
  if (xs.length < 2) return xs.map(() => 0.5);
  return xs.map((x) => {
    const below = xs.filter((y) => y < x).length;
    const equal = xs.filter((y) => y === x).length - 1;
    return (below + equal / 2) / (xs.length - 1);
  });
}

// What the text itself shows about each displayed option. `null` where not
// measurable (no stem on the options-only rung).
function optionMechanics(stem, texts) {
  const words = texts.map((t) => contentWords(t));
  const sw = stem ? contentWords(stem) : null;
  const len = percentileRanks(texts.map((t) => t.length));
  const echo = sw ? percentileRanks(words.map((w) => overlap(sw, w))) : null;
  const cent = percentileRanks(words.map((w, i) => mean(words.filter((_, j) => j !== i).map((o) => overlap(w, o)))));
  return texts.map((t, i) => ({
    length_rank: len[i],
    shortness_rank: 1 - len[i],
    absolute: countMatches(t, ABSOLUTES) > 0,
    stem_echo_rank: echo ? echo[i] : null,
    centrality_rank: cent[i],
  }));
}

// claimed code ↔ measurable property. Imperfect pairs on purpose (most-detailed
// is not "longest"), so these are agreement, not accuracy. For ranked
// properties: mean rank of options tagged with the code vs options not tagged
// (0.5 = the tag is unrelated to the property).
const FAITHFULNESS_PAIRS = [
  ['longest', 'length_rank'],
  ['shortest', 'shortness_rank'],
  ['most-detailed', 'length_rank'],
  ['echoes-stem', 'stem_echo_rank'],
  ['like-the-others', 'centrality_rank'],
  ['absolute', 'absolute'],
];

// Codes that readers are likely to use for one signal. Reported as a union beside
// the separate codes, so a signal split across two names is still visible (#11).
const CODE_GROUPS = {
  'group:qualified': ['most-detailed', 'hedged', 'nuanced-turn', 'middle-ground'],
  'group:dismissible': ['absolute', 'denies-question', 'implausible', 'off-target'],
};

// Question-level bootstrap interval of a mean of per-question values. Seeded, so
// the same data always gives the same interval.
function bootstrapCI(values, reps = 1000) {
  if (values.length < 2) return null;
  const rnd = mulberry32(20260923);
  const means = [];
  for (let b = 0; b < reps; b += 1) {
    let s = 0;
    for (let i = 0; i < values.length; i += 1) s += values[Math.floor(rnd() * values.length)];
    means.push(s / values.length);
  }
  means.sort((a, b) => a - b);
  return { n: values.length, lo: means[Math.floor(reps * 0.025)], hi: means[Math.floor(reps * 0.975)] };
}

function explainAnalysis(label, slug, ad, man, letterPicks) {
  const codes = man.tell_codes ?? tellCodes();
  const cands = maybeJson(join(sectionDir(label, slug), 'candidates.json')) ?? [];
  const byId = new Map(cands.map((c) => [c.id, c]));
  const entries = man.entries.filter((e) => isExplainRung(e.rung));
  const replies = [];
  const meta = {};
  const status = {};
  for (const v of listVoices(ad)) {
    meta[v] = voiceMeta(ad, v);
    for (const e of entries) {
      const rec = readVoiceRecord(ad, v, e);
      if (!rec) continue;
      ((status[v] ??= {})[rec.status] = (status[v]?.[rec.status] ?? 0) + 1);
      if (rec.status !== 'ok') continue;
      replies.push({ voice: v, e, parsed: parseExplainReply(rec.reply_text, e, codes), reasoning_tokens: reasoningTokens(rec.usage) });
    }
  }

  // One record per (reply, displayed option).
  const recs = [];
  for (const r of replies.filter((x) => x.parsed.ok)) {
    const c = byId.get(r.e.id);
    const shown = r.e.options_shown;
    const stem = r.e.rung === 'full-explain' ? (r.e.stem_shown ?? c?.stem ?? null) : null;
    const mech = optionMechanics(stem, shown);
    shown.forEach((text, i) => {
      const L = String.fromCharCode(65 + i);
      const o = r.parsed.options[L];
      recs.push({
        voice: r.voice, family: meta[r.voice].family ?? r.voice, id: r.e.id, rung: r.e.rung, file: r.e.file, seed: r.e.seed, letter: L,
        k: shown.length, option: c ? c.options.findIndex((x) => x.text === text) : -1, text, key: L === r.e.key_letter,
        picked: r.parsed.pick === L, pick_valid: r.parsed.pick != null, p: o.pn, codes: o.codes, rated: o.rated, invalid: o.invalid, note: o.note, mech: mech[i],
      });
    });
  }

  // A voice whose options are often unrated would drag every rate toward zero
  // unevenly; it is reported but left out of the pooled tables (review #4).
  const perVoice = {};
  const excludedVoices = [];
  const rungsPresent = man.rungs.filter(isExplainRung);
  for (const v of Object.keys(meta)) {
    const rv = replies.filter((x) => x.voice === v);
    if (!rv.length && !status[v]) continue;
    const probs = {};
    for (const r of rv) for (const pr of r.parsed.problems) { const k = pr.split(':')[0]; probs[k] = (probs[k] ?? 0) + 1; }
    const vr = recs.filter((x) => x.voice === v);
    const unratedShare = vr.length ? vr.filter((x) => !x.rated).length / vr.length : null;
    if (unratedShare != null && unratedShare > 0.10) excludedVoices.push(v);
    const byRung = {};
    for (const rung of rungsPresent) {
      const ok = rv.filter((x) => x.e.rung === rung && x.parsed.ok);
      if (!ok.length) continue;
      const withPick = ok.filter((x) => x.parsed.pick != null);
      const kp = vr.filter((x) => x.rung === rung && x.key).map((x) => x.p).filter((p) => p != null);
      // Does the explain pick agree with the same voice's letter pick on the same
      // question and order? Low agreement means the codes explain a different
      // decision from the one the letter rung scores (review #1).
      const letterRung = rung.replace('-explain', '');
      const pairs = withPick.map((x) => letterPicks[`${v}|${letterRung}|${x.e.id}|${x.e.seed}`]).filter((l) => l !== undefined);
      const agree = withPick.filter((x) => letterPicks[`${v}|${letterRung}|${x.e.id}|${x.e.seed}`] === x.parsed.pick).length;
      const rt = ok.map((x) => x.reasoning_tokens).filter((t) => t != null);
      byRung[rung] = {
        replies: ok.length, pick_invalid: ok.length - withPick.length,
        explain_hit_rate: withPick.length ? withPick.filter((x) => x.parsed.pick === x.e.key_letter).length / withPick.length : null,
        mean_p_key: kp.length ? mean(kp) : null,
        letter_agreement: pairs.length ? { n: pairs.length, rate: agree / pairs.length } : null,
        mean_reasoning_tokens: rt.length ? Math.round(mean(rt)) : null,
      };
    }
    const vt = vr.filter((x) => x.rated).flatMap((x) => x.codes);
    perVoice[v] = {
      meta: meta[v], statuses: status[v] ?? {}, replies: rv.length, unusable: rv.filter((x) => !x.parsed.ok).length, problems: probs, rungs: byRung,
      unrated_option_share: unratedShare,
      invalid_code_option_share: vr.length ? vr.filter((x) => x.invalid).length / vr.length : null,
      other_share: vt.length ? vt.filter((t) => t === 'other').length / vt.length : null,
      no_tell_share: vt.length ? vt.filter((t) => t === 'no-tell').length / vt.length : null,
      excluded_from_pooled_tables: excludedVoices.includes(v),
    };
  }

  const pooled = recs.filter((x) => x.rated && !excludedVoices.includes(x.voice));
  const has = (x, code) => (CODE_GROUPS[code] ? CODE_GROUPS[code].some((c) => x.codes.includes(c)) : x.codes.includes(code));
  const allCodes = [...codes, ...Object.keys(CODE_GROUPS)];

  // Replies whose every option is rated, grouped: the unit for the cue-follow statistic.
  const fullyRated = {};
  for (const x of recs.filter((y) => !excludedVoices.includes(y.voice))) (fullyRated[`${x.voice}|${x.file}`] ??= []).push(x);
  const replyGroups = Object.values(fullyRated).filter((g) => g.every((x) => x.rated));

  // "Hit rate if a reader followed only this cue", in the letter score's units
  // (review #6). Per reply where the code is on some but not all options:
  // toward = pick uniformly among the tagged options; away = among the untagged.
  // Averaged per question first, then over questions, with a bootstrap interval.
  const cueFollow = (groups, code) => {
    const perQ = {};
    for (const g of groups) {
      const T = g.filter((x) => has(x, code));
      if (!T.length || T.length === g.length) continue;
      const keyIn = T.some((x) => x.key);
      const q = (perQ[g[0].id] ??= { toward: [], away: [], chance: [] });
      q.toward.push(keyIn ? 1 / T.length : 0);
      q.away.push(keyIn ? 0 : 1 / (g.length - T.length));
      q.chance.push(1 / g.length);
    }
    const qs = Object.values(perQ);
    if (!qs.length) return null;
    const tw = qs.map((q) => mean(q.toward));
    const aw = qs.map((q) => mean(q.away));
    return {
      questions: qs.length, replies: qs.reduce((a, q) => a + q.toward.length, 0), chance: mean(qs.map((q) => mean(q.chance))),
      toward: mean(tw), toward_ci: bootstrapCI(tw), away: mean(aw), away_ci: bootstrapCI(aw),
    };
  };

  const codeTable = {};
  for (const rung of rungsPresent) {
    const rs = pooled.filter((x) => x.rung === rung);
    const groups = replyGroups.filter((g) => g[0].rung === rung);
    const K = rs.filter((x) => x.key).length;
    const D = rs.length - K;
    const nonPicked = rs.filter((x) => x.pick_valid && !x.picked);
    const picked = rs.filter((x) => x.picked);
    const Knp = nonPicked.filter((x) => x.key).length;
    const Dnp = nonPicked.length - Knp;
    codeTable[rung] = { key_options: K, distractor_options: D, codes: {} };
    for (const code of allCodes) {
      const onKey = rs.filter((x) => x.key && has(x, code)).length;
      const onDist = rs.filter((x) => !x.key && has(x, code)).length;
      if (!onKey && !onDist) continue;
      const rk = K ? onKey / K : null;
      const rd = D ? onDist / D : null;
      const rp = picked.length ? picked.filter((x) => has(x, code)).length / picked.length : null;
      const rnp = nonPicked.length ? nonPicked.filter((x) => has(x, code)).length / nonPicked.length : null;
      const rkNp = Knp ? nonPicked.filter((x) => x.key && has(x, code)).length / Knp : null;
      const rdNp = Dnp ? nonPicked.filter((x) => !x.key && has(x, code)).length / Dnp : null;
      const byFamily = {};
      for (const f of uniq(groups.map((g) => g[0].family))) {
        const cf = cueFollow(groups.filter((g) => g[0].family === f), code);
        if (cf) byFamily[f] = { questions: cf.questions, toward: cf.toward, away: cf.away, chance: cf.chance };
      }
      codeTable[rung].codes[code] = {
        on_key: onKey, on_distractors: onDist, rate_key: rk, rate_distractors: rd, lift: rd ? rk / rd : null,
        // Rationalisation check: a code that follows the reader's own pick sits on
        // the picked option whatever the key is. Among options NOT picked, a real
        // tell still sits on the key more than on distractors.
        rate_on_picked: rp, rate_on_not_picked: rnp, lift_among_not_picked: rkNp != null && rdNp ? rkNp / rdNp : null,
        cue_follow: cueFollow(groups, code), cue_follow_by_family: byFamily,
      };
    }
  }

  const faithfulness = {};
  for (const [code, prop] of FAITHFULNESS_PAIRS) {
    const rs = pooled.filter((x) => x.mech[prop] != null);
    const tagged = rs.filter((x) => x.codes.includes(code));
    const untagged = rs.filter((x) => !x.codes.includes(code));
    if (prop === 'absolute') {
      const both = tagged.filter((x) => x.mech.absolute).length;
      const trueN = rs.filter((x) => x.mech.absolute).length;
      faithfulness[code] = { property: 'has an absolute word (checker list)', options: rs.length, tagged: tagged.length, tagged_where_true: tagged.length ? both / tagged.length : null, property_true: trueN, true_and_tagged: trueN ? both / trueN : null };
    } else {
      faithfulness[code] = { property: prop, options: rs.length, tagged: tagged.length, mean_rank_tagged: tagged.length ? mean(tagged.map((x) => x.mech[prop])) : null, mean_rank_untagged: untagged.length ? mean(untagged.map((x) => x.mech[prop])) : null };
    }
  }
  // Claims the reader could not have made: a stem echo with no stem shown.
  const impossible = recs.filter((x) => x.rung === 'options-only-explain' && x.codes.includes('echoes-stem')).length;

  const perQuestion = {};
  for (const id of uniq(recs.map((x) => x.id))) {
    const c = byId.get(id);
    const q = { rungs: {}, options: [] };
    for (const rung of rungsPresent) {
      const rs = recs.filter((x) => x.id === id && x.rung === rung);
      if (!rs.length) continue;
      const kp = rs.filter((x) => x.key).map((x) => x.p).filter((p) => p != null);
      q.rungs[rung] = { replies: uniq(rs.map((x) => `${x.voice}|${x.file}`)).length, picked_key: rs.filter((x) => x.key && x.picked).length, mean_p_key: kp.length ? mean(kp) : null, families: uniq(rs.map((x) => x.family)) };
    }
    const texts = c ? c.options.map((o) => o.text) : uniq(recs.filter((x) => x.id === id).map((x) => x.text));
    texts.forEach((text, oi) => {
      const rs = recs.filter((x) => x.id === id && x.text === text && x.rated);
      const counts = {};
      for (const x of rs) for (const code of x.codes) counts[code] = (counts[code] ?? 0) + 1;
      const ps = rs.map((x) => x.p).filter((p) => p != null);
      q.options.push({ option: oi, key: rs.length ? rs[0].key : (c ? !!c.options[oi].key : null), text, ratings: rs.length, mean_p: ps.length ? mean(ps) : null, codes: Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1])) });
    });
    perQuestion[id] = q;
  }

  const notes = recs.filter((x) => x.codes.includes('other')).map((x) => ({ voice: x.voice, id: x.id, rung: x.rung, option: x.option, key: x.key, note: x.note }));
  const strategies = replies.filter((x) => x.parsed.ok && x.parsed.strategy).map((x) => ({ voice: x.voice, id: x.e.id, rung: x.e.rung, hit: x.parsed.pick === x.e.key_letter, strategy: x.parsed.strategy }));
  const allTags = pooled.flatMap((x) => x.codes);
  const share = (code) => (allTags.length ? allTags.filter((t) => t === code).length / allTags.length : null);

  const summary = {
    replies: replies.length, unusable: replies.filter((x) => !x.parsed.ok).length, voices: Object.keys(perVoice),
    // Calls that returned no scorable reply (truncated, empty, error): never
    // scored, always reported, so delivery failures cannot hide (Gemini review #2).
    not_ok: Object.fromEntries(Object.entries(status).map(([v, st]) => [v, Object.fromEntries(Object.entries(st).filter(([k]) => k !== 'ok'))]).filter(([, st]) => Object.keys(st).length)),
    families: uniq(recs.map((x) => x.family)), excluded_voices: excludedVoices,
    tags: allTags.length, other_share: share('other'), no_tell_share: share('no-tell'),
    impossible_stem_echo_tags: impossible,
    tell_codes_sha256: man.tell_codes_sha256 ?? null,
  };
  const tells = { source: man.source, codes, groups: CODE_GROUPS, summary, code_table: codeTable, faithfulness, per_voice: perVoice, per_question: perQuestion, other_notes: notes, strategies };
  writeJson(join(ad, 'tells.json'), tells);
  writeFileSync(join(ad, 'tells.md'), tellsMarkdown(tells), 'utf8');
  return tells;
}

const pct = (x) => (x == null ? '—' : fmtPct(x));
const ciPct = (c) => (c ? `${fmtPct(c.lo)}–${fmtPct(c.hi)}` : 'n<2');

function tellsMarkdown(t) {
  const L = [];
  L.push(`# Tells — ${t.source}`, '');
  L.push('Explain-mode replies are for diagnosis. They are not the score, and their hit rates are not comparable with the letter rungs.', '');
  L.push(`${t.summary.replies} replies from ${t.summary.voices.length} voice(s) in ${t.summary.families.length} famil(ies); ${t.summary.unusable} unusable. ${t.summary.tags} cue tags in the pooled tables; \`other\` ${pct(t.summary.other_share)}, \`no-tell\` ${pct(t.summary.no_tell_share)}. Stem-echo tags on the options-only rung, where no stem was shown (claims that cannot be true): ${t.summary.impossible_stem_echo_tags}.`, '');
  const notOk = Object.entries(t.summary.not_ok ?? {}).map(([v, st]) => `${v}: ${Object.entries(st).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  if (notOk.length) L.push(`Calls with no scorable reply (not counted anywhere above or below): ${notOk.join('; ')}.`, '');
  if (t.summary.excluded_voices.length) L.push(`Left out of the pooled tables because more than 10% of their option ratings were unusable: ${t.summary.excluded_voices.join(', ')}.`, '');
  L.push('**How to read the tables.** *Follow → key* is the hit rate of a reader who used only this cue and picked among the options carrying it. *Follow → away* is the same for a reader who avoided those options. Compare both with *chance*. Each is averaged per question and then over questions, with a bootstrap interval over questions. *Lift among not-picked* compares key and distractor rates only among options the reader did NOT pick. A cue the reader cites just to justify its own pick shows a high *on picked* rate and a lift near 1 here. A real tell still leans toward the key. `position` is a placebo: options are shuffled, so it should sit at chance with a lift near 1.', '');
  for (const [rung, ct] of Object.entries(t.code_table)) {
    L.push(`## ${rung}`, '', `${ct.key_options} key ratings, ${ct.distractor_options} distractor ratings.`, '');
    L.push('| code | follow → key (CI) | follow → away (CI) | chance | q | on picked / not picked | lift | lift among not-picked | by family (→ key) |', '|---|---|---|---|---|---|---|---|---|');
    // Sorted by how far the stronger direction sits from chance, so a distractor
    // tell (high "away") ranks as high as a key tell (Gemini review #4).
    const strength = (r) => (r.cue_follow ? Math.max(r.cue_follow.toward, r.cue_follow.away) - r.cue_follow.chance : -1);
    const rows = Object.entries(ct.codes).sort((a, b) => strength(b[1]) - strength(a[1]));
    for (const [code, r] of rows) {
      const cf = r.cue_follow;
      const fam = Object.entries(r.cue_follow_by_family).map(([f, x]) => `${f} ${pct(x.toward)}`).join(', ') || '—';
      L.push(`| \`${code}\` | ${cf ? `${pct(cf.toward)} (${ciPct(cf.toward_ci)})` : '—'} | ${cf ? `${pct(cf.away)} (${ciPct(cf.away_ci)})` : '—'} | ${cf ? pct(cf.chance) : '—'} | ${cf ? cf.questions : 0} | ${pct(r.rate_on_picked)} / ${pct(r.rate_on_not_picked)} | ${r.lift == null ? '∞' : r.lift.toFixed(2)} | ${r.lift_among_not_picked == null ? '—' : r.lift_among_not_picked.toFixed(2)} | ${fam} |`);
    }
    L.push('');
  }
  L.push('## Do the claimed cues match the text?', '', 'Ranked properties: the mean percentile rank of options carrying the code, against options without it. 1 = highest among the shown options, 0.5 = unrelated. For `absolute`: how often the code sits where the checker finds an absolute word, and how often an option with one gets the code.', '');
  L.push('| code | property | tagged | tagged | untagged / true and tagged |', '|---|---|---|---|---|');
  for (const [code, f] of Object.entries(t.faithfulness)) {
    if ('mean_rank_tagged' in f) L.push(`| \`${code}\` | ${f.property} | ${f.tagged} | rank ${f.mean_rank_tagged == null ? '—' : f.mean_rank_tagged.toFixed(2)} | rank ${f.mean_rank_untagged == null ? '—' : f.mean_rank_untagged.toFixed(2)} |`);
    else L.push(`| \`${code}\` | ${f.property} | ${f.tagged} | ${pct(f.tagged_where_true)} where true | ${pct(f.true_and_tagged)} of ${f.property_true} true |`);
  }
  L.push('');
  L.push('## Per voice', '', '| voice | family | model | replies | unusable | unrated options | explain hit (full / opt-only) | agrees with own letter pick | reasoning tokens | other | no-tell |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [v, r] of Object.entries(t.per_voice)) {
    const h = (rung) => (r.rungs[rung] ? pct(r.rungs[rung].explain_hit_rate) : '—');
    const ag = Object.values(r.rungs).map((x) => (x.letter_agreement ? `${pct(x.letter_agreement.rate)} of ${x.letter_agreement.n}` : '—')).join(' / ') || '—';
    const rt = Object.values(r.rungs).map((x) => x.mean_reasoning_tokens ?? '—').join(' / ') || '—';
    L.push(`| ${v}${r.excluded_from_pooled_tables ? ' (excluded)' : ''} | ${r.meta.family ?? '?'} | ${r.meta.model ?? '?'} | ${r.replies} | ${r.unusable} | ${pct(r.unrated_option_share)} | ${h('full-explain')} / ${h('options-only-explain')} | ${ag} | ${rt} | ${pct(r.other_share)} | ${pct(r.no_tell_share)} |`);
  }
  L.push('');
  L.push('## Per question', '');
  for (const [id, q] of Object.entries(t.per_question)) {
    const rs = Object.entries(q.rungs).map(([rung, r]) => `${rung}: key picked ${r.picked_key}/${r.replies}, mean p(key) ${pct(r.mean_p_key)}`).join(' · ');
    L.push(`### ${id}`, '', rs, '');
    for (const o of q.options) {
      const top = Object.entries(o.codes).slice(0, 4).map(([c, n]) => `${c}×${n}`).join(', ') || '—';
      L.push(`- ${o.key ? '**KEY**' : 'distractor'} p ${pct(o.mean_p)} — ${top} — "${o.text.length > 90 ? `${o.text.slice(0, 90)}…` : o.text}"`);
    }
    L.push('');
  }
  if (t.other_notes.length) {
    L.push('## `other` notes', '');
    for (const n of t.other_notes) L.push(`- ${n.voice} · ${n.id.split('/').pop()} · ${n.rung} · option ${n.option}${n.key ? ' (key)' : ''}: ${n.note}`);
    L.push('');
  }
  L.push('## Strategies', '');
  for (const s of t.strategies) L.push(`- ${s.voice} · ${s.id.split('/').pop()} · ${s.rung} · ${s.hit ? 'hit' : 'miss'}: ${s.strategy}`);
  return `${L.join('\n')}\n`;
}

function stageAblateScore(label, slug) {
  const ad = join(sectionDir(label, slug), 'ablation');
  const man = readJson(need(join(ad, 'manifest.json'), 'ablation/manifest.json'));
  // picks.json holds the Claude subagent's letter replies. Manifests from before
  // voices existed have no `claude` field and every entry is Claude's. A run in
  // which the subagent answers nothing (--claude-seeds 0) needs no picks.json.
  const claudeEntries = man.entries.filter((e) => e.claude !== false && !isExplainRung(e.rung));
  const picks = claudeEntries.length || existsSync(join(ad, 'picks.json'))
    ? readJson(need(join(ad, 'picks.json'), 'ablation/picks.json')) : {};
  if (!picks || typeof picks !== 'object' || Array.isArray(picks)) die('ablation/picks.json must be an object of {"<rung>/<NN>": "<letter or grade>"}');
  const byFile = new Map(claudeEntries.map((e) => [e.file, e]));
  const extra = Object.keys(picks).filter((f) => !byFile.has(f));
  const missing = claudeEntries.filter((e) => picks[e.file] == null || String(picks[e.file]).trim() === '').map((e) => e.file);
  // No partial scoring. The old score stage reported a passing gate on zero
  // parsed data; a ladder with holes in it is the same failure.
  if (extra.length) die(`ablate-score: picks for files not in the manifest: ${extra.join(', ')}`);
  if (missing.length) die(`ablate-score: ${missing.length} prompt(s) have no pick: ${missing.join(', ')}`);

  const rows = [];
  for (const e of claudeEntries) {
    const raw = String(picks[e.file]).trim();
    if (e.rung === 'stem-only') {
      const g = raw.toLowerCase();
      if (!RECALL_GRADES.includes(g)) die(`ablate-score: ${e.file} grade "${raw}" is not one of ${RECALL_GRADES.join(', ')} — grade it with prompts/grade-recall.md`);
      rows.push({ ...e, grade: g });
      continue;
    }
    rows.push(letterRow(e, raw));
  }

  const ladder = {
    source: man.source, seeds: man.seeds, seed_offset: man.seed_offset ?? 0,
    preregistered: preregisteredBefore(label, slug), excluded: man.excluded ?? [],
    rungs: {}, per_question: {},
  };
  // `rungs` and `per_question` stay the Claude subagent's, as before voices, so
  // every earlier ladder remains comparable. Other voices are reported beside it.
  for (const rung of man.rungs.filter((r) => !isExplainRung(r))) {
    const rs = rows.filter((r) => r.rung === rung);
    if (!rs.length) continue;
    if (rung === 'stem-only') {
      const counts = Object.fromEntries(RECALL_GRADES.map((g) => [g, rs.filter((r) => r.grade === g).length]));
      const answered = rs.length - counts.refusal;
      // Refusals are not ignorance: they sit outside the denominator and are reported.
      ladder.rungs[rung] = { trials: rs.length, refusals: counts.refusal, grades: counts, knows_rate: answered ? (counts.match + counts.partial) / answered : null };
      continue;
    }
    const { stats, perQ } = letterStats(rs);
    ladder.rungs[rung] = stats;
    for (const q of perQ) (ladder.per_question[q.id] ??= {})[rung] = `${q.hits}/${q.trials}`;
  }

  // Other voices (scripts/voices.mjs). Each is scored on what it answered, with
  // its coverage beside it. The panel headline is per FAMILY — a family's voices
  // are averaged at the question level — and is the median of family rates over
  // the questions every family answered (review 2026-09-23-voices #2). A pooled
  // trial rate is kept as a secondary figure only.
  const voiceRows = readVoiceLetterRows(ad, man);
  const letterPicks = {};
  for (const r of rows) if (r.picked !== undefined) letterPicks[`${CLAUDE_VOICE}|${r.rung}|${r.id}|${r.seed}`] = r.picked;
  let panel = null;
  if (Object.keys(voiceRows).length) {
    ladder.voices = {};
    ladder.families = {};
    ladder.panel = {};
    ladder.warnings = [];
    const apiLetterRungs = man.rungs.filter((r) => ABLATION_RUNGS[r].api && !isExplainRung(r));
    panel = rows.filter((r) => r.picked !== undefined && apiLetterRungs.includes(r.rung)).map((r) => ({ ...r, voice: CLAUDE_VOICE }));
    for (const [v, vr] of Object.entries(voiceRows)) {
      for (const r of vr.rows) letterPicks[`${v}|${r.rung}|${r.id}|${r.seed}`] = r.picked;
      ladder.voices[v] = { meta: vr.meta, statuses: vr.status, rungs: {} };
      if (vr.model_versions.length > 1) ladder.warnings.push(`${v} answered under ${vr.model_versions.length} model versions: ${vr.model_versions.join(', ')}`);
      if (vr.settings_dropped_variants.length > 1) ladder.warnings.push(`${v} ran with different dropped settings across calls: ${vr.settings_dropped_variants.map((d) => JSON.stringify(d)).join(' vs ')}`);
      for (const rung of apiLetterRungs) {
        const rs = vr.rows.filter((r) => r.rung === rung);
        const total = man.entries.filter((e) => e.rung === rung).length;
        const rt = rs.map((r) => r.reasoning_tokens).filter((t) => t != null);
        ladder.voices[v].rungs[rung] = rs.length
          ? { ...letterStats(rs).stats, coverage: `${rs.length}/${total}`, mean_reasoning_tokens: rt.length ? Math.round(mean(rt)) : null }
          : { coverage: `0/${total}` };
        panel.push(...rs.map((r) => ({ ...r, voice: v })));
      }
      // full vs options-only on the questions this voice answered in BOTH, so a
      // quota cut-off cannot turn coverage into a contrast (review #3).
      if (apiLetterRungs.includes('full') && apiLetterRungs.includes('options-only')) {
        const f = letterStats(vr.rows.filter((r) => r.rung === 'full')).perQ;
        const o = new Map(letterStats(vr.rows.filter((r) => r.rung === 'options-only')).perQ.map((q) => [q.id, q.rate]));
        const both = f.filter((q) => o.has(q.id));
        ladder.voices[v].paired_full_vs_options_only = { questions: both.length, full: both.length ? mean(both.map((q) => q.rate)) : null, options_only: both.length ? mean(both.map((q) => o.get(q.id))) : null };
      }
    }
    const metaOf = (v) => (v === CLAUDE_VOICE ? voiceMeta(ad, CLAUDE_VOICE) : voiceRows[v]?.meta ?? { family: v });
    for (const rung of apiLetterRungs) {
      const rs = panel.filter((r) => r.rung === rung);
      if (!rs.length) continue;
      const fams = familyRates(rs, metaOf);
      ladder.families[rung] = Object.fromEntries(Object.entries(fams).map(([f, x]) => [f, { voices: x.voices, questions: x.questions, rate: x.rate, ci_question_unit: x.ci_question_unit }]));
      const { stats, perQ } = letterStats(rs);
      ladder.panel[rung] = { ...panelHeadline(fams), pooled_trials: stats, voices: uniq(rs.map((r) => r.voice)) };
      for (const q of perQ) ((ladder.per_question[q.id] ??= {}).panel ??= {})[rung] = `${q.hits}/${q.trials}`;
    }
    // Calibration sets (runs/tier4-control items) label each question with a
    // `group` — clean, or one planted tell. Per family per group, so each family
    // gets its own floor (the clean group) and its own sensitivity to each tell.
    // Control items also carry an `author`: split by it too, so a reader family
    // scoring higher on its own family's questions (recognition) is visible.
    const candsForSplit = maybeJson(join(sectionDir(label, slug), 'candidates.json')) ?? [];
    const authorOf = new Map(candsForSplit.filter((c) => c.author).map((c) => [c.id, c.author]));
    if (authorOf.size) {
      ladder.by_author = {};
      for (const rung of apiLetterRungs) {
        for (const a of uniq([...authorOf.values()])) {
          const rs = panel.filter((r) => r.rung === rung && authorOf.get(r.id) === a);
          if (!rs.length) continue;
          const fams = familyRates(rs, metaOf);
          ((ladder.by_author[rung] ??= {})[a] = Object.fromEntries(Object.entries(fams).map(([f, x]) => [f, { rate: x.rate, questions: x.questions, ci_question_unit: x.ci_question_unit }])));
        }
      }
    }
    const groupOf = new Map(candsForSplit.filter((c) => c.group).map((c) => [c.id, c.group]));
    if (groupOf.size) {
      ladder.by_group = {};
      for (const rung of apiLetterRungs) {
        for (const g of uniq([...groupOf.values()])) {
          const rs = panel.filter((r) => r.rung === rung && groupOf.get(r.id) === g);
          if (!rs.length) continue;
          const fams = familyRates(rs, metaOf);
          ((ladder.by_group[rung] ??= {})[g] = Object.fromEntries(Object.entries(fams).map(([f, x]) => [f, { rate: x.rate, questions: x.questions, ci_question_unit: x.ci_question_unit }])));
        }
      }
    }
  }

  // Explain rungs: parsed, validated and aggregated into tells.json / tells.md.
  if (man.rungs.some(isExplainRung)) {
    const tells = explainAnalysis(label, slug, ad, man, letterPicks);
    ladder.explain = tells.summary;
  }
  for (const [id, c] of Object.entries(man.key_centrality ?? {})) (ladder.per_question[id] ??= {}).key_centrality = c;

  // b02 review #4: on a directional claim a blind reader who just picks the
  // sensible option scores the passage's naive-right share, so those items are
  // judged against max(share, 1 - share); passage-only items against 25% / 40%.
  const cmap = maybeJson(join(sectionDir(label, slug), 'claim-map.json'));
  if (cmap) {
    ladder.by_claim_type = {};
    for (const rung of man.rungs.filter((r) => LETTER_RUNGS.has(r))) {
      for (const type of ['directional', 'passage-only', 'unmapped']) {
        const rs = rows.filter((r) => r.rung === rung && cmap.map[r.id]?.type === type);
        if (!rs.length) continue;
        const floor = type === 'directional' ? cmap.directional_floor : 0.40;
        ((ladder.by_claim_type[rung] ??= {})[type] = {
          trials: rs.length, hit_rate: rs.filter((r) => r.hit).length / rs.length, floor,
          floor_basis: type === 'directional' ? 'max(share, 1 - share) over the directional items asked' : 'hand-authored fiction, 40%',
        });
      }
    }
    if (panel) {
      // Per family, then the median, as for the panel headline — each family
      // judged against the same floors as the Claude rows above.
      ladder.panel_by_claim_type = {};
      const metaOf = (v) => (v === CLAUDE_VOICE ? voiceMeta(ad, CLAUDE_VOICE) : voiceRows[v]?.meta ?? { family: v });
      for (const rung of Object.keys(ladder.panel ?? {})) {
        for (const type of ['directional', 'passage-only', 'unmapped']) {
          const rs = panel.filter((r) => r.rung === rung && cmap.map[r.id]?.type === type);
          if (!rs.length) continue;
          const fams = familyRates(rs, metaOf);
          (ladder.panel_by_claim_type[rung] ??= {})[type] = {
            family_rates: Object.fromEntries(Object.entries(fams).map(([f, x]) => [f, x.rate])),
            median_family_rate: median(Object.values(fams).map((x) => x.rate).filter((x) => x != null)),
            floor: type === 'directional' ? cmap.directional_floor : 0.40,
          };
        }
      }
    }
  }

  // Screening policy: at one seed, anything the full rung hit is a candidate for
  // confirmation at three. Printed, not acted on — the orchestrator decides.
  if (man.seeds === 1 && ladder.rungs.full) {
    ladder.confirm_at_3_seeds = Object.entries(ladder.per_question).filter(([, r]) => r.full === '1/1').map(([id]) => id);
  }

  const p = writeJson(join(ad, 'ladder.json'), ladder);
  logLine(label, { stage: 'ablate-score', section: slug, rungs: ladder.rungs, preregistered: ladder.preregistered, artifact: p, ok: true });

  console.log(`ablate-score ${man.source} (${man.seeds} seed(s)${ladder.seed_offset ? `, offset ${ladder.seed_offset}` : ''}):`);
  if (!ladder.preregistered) console.log('  WARN no preregister line precedes the first ablate of this section in run.log');
  if (Object.keys(ladder.rungs).length) console.log(`  ${CLAUDE_VOICE} (the subagent; picks.json)
  rung           questions  trials   hit    over chance   95% CI, question as unit   unparsed`);
  for (const [rung, r] of Object.entries(ladder.rungs)) {
    if (r.grades) { console.log(`  ${rung.padEnd(14)} ${String(r.trials).padStart(9)}   knows ${r.knows_rate == null ? 'n/a' : fmtPct(r.knows_rate)} of answered · ${RECALL_GRADES.map((g) => `${g} ${r.grades[g]}`).join(', ')}`); continue; }
    const ci = r.ci_question_unit ? `${fmtPct(r.ci_question_unit.lo)}–${fmtPct(r.ci_question_unit.hi)}` : 'n < 2';
    console.log(`  ${rung.padEnd(14)} ${String(r.questions).padStart(9)} ${String(r.trials).padStart(7)}  ${fmtPct(r.hit_rate).padStart(5)}  ${`${r.excess_over_chance >= 0 ? '+' : ''}${r.excess_over_chance.toFixed(2)}`.padStart(11)}   ${ci.padEnd(24)} ${String(r.unparsed).padStart(8)}`);
  }
  if (ladder.excluded.length) console.log(`  excluded (listed in manifest): ${ladder.excluded.length}`);
  for (const [rung, byType] of Object.entries(ladder.by_claim_type ?? {})) {
    for (const [type, r] of Object.entries(byType)) console.log(`  ${rung}/${type}: ${fmtPct(r.hit_rate)} of ${r.trials} against a floor of ${r.floor == null ? 'n/a' : fmtPct(r.floor)} (${r.floor_basis})`);
  }
  if (ladder.confirm_at_3_seeds?.length) console.log(`  confirm at 3 seeds: ${ladder.confirm_at_3_seeds.map((i) => i.split('/').pop()).join(', ')}`);
  const ciTxt = (r) => (r.ci_question_unit ? `${fmtPct(r.ci_question_unit.lo)}–${fmtPct(r.ci_question_unit.hi)}` : 'n < 2');
  if (ladder.voices) {
    console.log('  API voices (each on what it answered; unparsed replies reported and left out of the rate):');
    for (const [v, vr] of Object.entries(ladder.voices)) {
      for (const [rung, r] of Object.entries(vr.rungs)) {
        if (r.hit_rate == null) { console.log(`    ${v.padEnd(16)} ${rung.padEnd(13)} coverage ${r.coverage}`); continue; }
        console.log(`    ${v.padEnd(16)} ${rung.padEnd(13)} ${fmtPct(r.hit_rate).padStart(5)} of ${r.trials} (${r.questions} q), CI ${ciTxt(r)}, coverage ${r.coverage}, unparsed ${r.unparsed}${r.mean_reasoning_tokens != null ? `, ~${r.mean_reasoning_tokens} reasoning tok` : ''}`);
      }
      const pf = vr.paired_full_vs_options_only;
      if (pf?.questions) console.log(`    ${' '.repeat(16)} paired on ${pf.questions} q answered in both: full ${fmtPct(pf.full)} vs options-only ${fmtPct(pf.options_only)}`);
    }
    for (const [rung, fams] of Object.entries(ladder.families ?? {})) {
      for (const [f, x] of Object.entries(fams)) console.log(`    family ${f.padEnd(14)} ${rung.padEnd(13)} ${x.rate == null ? 'n/a' : fmtPct(x.rate).padStart(5)} over ${x.questions} q, CI ${ciTxt(x)} (${x.voices.join(', ')})`);
    }
    for (const [rung, r] of Object.entries(ladder.panel ?? {})) {
      if (r.complete_questions < 5) console.log(`    WARN PANEL ${rung}: only ${r.complete_questions} question(s) were answered by every family — the median below is not a result; get more coverage or drop the thin family with --voices`);
      console.log(`    PANEL ${rung.padEnd(13)} median of ${r.families} family rate(s) ${r.median_family_rate == null ? 'n/a' : fmtPct(r.median_family_rate)} over the ${r.complete_questions} question(s) every family answered · pooled trials ${fmtPct(r.pooled_trials.hit_rate)} of ${r.pooled_trials.trials} (${r.pooled_trials.unparsed} unparsed)`);
    }
    for (const [rung, byType] of Object.entries(ladder.panel_by_claim_type ?? {})) {
      for (const [type, r] of Object.entries(byType)) console.log(`    PANEL ${rung}/${type}: median family ${r.median_family_rate == null ? 'n/a' : fmtPct(r.median_family_rate)} against a floor of ${r.floor == null ? 'n/a' : fmtPct(r.floor)} (${Object.entries(r.family_rates).map(([f, x]) => `${f} ${x == null ? 'n/a' : fmtPct(x)}`).join(', ')})`);
    }
    for (const [rung, authors] of Object.entries(ladder.by_author ?? {})) {
      for (const [a, fams] of Object.entries(authors)) {
        console.log(`    author ${a.padEnd(11)} ${rung.padEnd(13)} ${Object.entries(fams).map(([f, x]) => `${f} ${x.rate == null ? 'n/a' : fmtPct(x.rate)} (${x.questions} q${x.ci_question_unit ? `, ${ciTxt(x)}` : ''})`).join(' · ')}`);
      }
    }
    for (const [rung, groups] of Object.entries(ladder.by_group ?? {})) {
      for (const [g, fams] of Object.entries(groups)) {
        console.log(`    group ${g.padEnd(12)} ${rung.padEnd(13)} ${Object.entries(fams).map(([f, x]) => `${f} ${x.rate == null ? 'n/a' : fmtPct(x.rate)} (${x.questions} q${x.ci_question_unit ? `, ${ciTxt(x)}` : ''})`).join(' · ')}`);
      }
    }
    for (const w of ladder.warnings ?? []) console.log(`    WARN ${w}`);
  }
  if (ladder.explain) {
    const x = ladder.explain;
    console.log(`  explain (diagnosis, not the score): ${x.replies} replies, ${x.unusable} unusable, ${x.voices.length} voice(s); other ${x.other_share == null ? 'n/a' : fmtPct(x.other_share)}, no-tell ${x.no_tell_share == null ? 'n/a' : fmtPct(x.no_tell_share)}; impossible stem-echo tags ${x.impossible_stem_echo_tags}`);
    console.log(`    → ${join(ad, 'tells.md')}`);
  }
  return ladder;
}

// -------------------------------------------------------- stage: arm

// Apply a manipulation-arm rewrite (bench-rewrite-stem / -distractors) and prove
// it touched only what it was allowed to. Writes TWO section dirs under the new
// run: `arm/` (the rewritten candidates) and `control/` (the same ids, unmodified,
// byte-identical). Ablate both with the SAME --seed-offset, and compare arm to
// control — never to the screen that selected these ids, which would regress to
// the mean and flatter any manipulation.
const collapse = (t) => String(t).replace(/\s+/g, ' ').trim();

function stageArm(label, opts = {}) {
  const from = opts.from ?? flag('from');
  const rewrite = opts.rewrite ?? flag('rewrite');
  const kind = opts.kind ?? flag('kind');
  const passage = opts.passage ?? flag('passage');
  if (!from || !from.includes('/')) die('arm needs --from <label>/<slug>');
  if (!rewrite) die('arm needs --rewrite <file>');
  if (!['stem', 'distractors'].includes(kind)) die('arm needs --kind stem|distractors');
  const [fl, fs] = from.split('/');
  const srcDir = sectionDir(fl, fs);
  const source = readJson(need(join(srcDir, 'candidates.json'), `${from}/candidates.json`));
  const entries = parseJsonValues(readFileSync(need(resolve(ROOT, rewrite), 'rewrite file'), 'utf8')).flat();
  let text = null;
  if (kind === 'distractors') {
    if (!passage) die('arm --kind distractors needs --passage, to check quotes against');
    text = collapse(readFileSync(need(resolve(ROOT, passage), 'passage'), 'utf8'));
  }

  const problems = [];
  const arm = [];
  const control = [];
  const withheldNotes = [];
  for (const e of entries) {
    const orig = source.find((c) => c.id === e.id);
    if (!orig) { problems.push(`${e.id}: not in ${from}/candidates.json`); continue; }
    if (kind === 'stem') {
      if (typeof e.stem !== 'string' || !e.stem.trim()) { problems.push(`${e.id}: no stem`); continue; }
      arm.push({ ...orig, stem: e.stem, arm: { kind, from } });
      withheldNotes.push({ id: e.id, what_i_withheld: e.what_i_withheld ?? null });
    } else {
      const o = orig.options;
      const n = Array.isArray(e.options) ? e.options : [];
      if (n.length !== o.length) { problems.push(`${e.id}: ${n.length} option(s), original has ${o.length}`); continue; }
      if (n.filter((x) => x && x.key).length !== 1) { problems.push(`${e.id}: must have exactly one key`); continue; }
      const next = [];
      o.forEach((oo, i) => {
        const nn = n[i] || {};
        if (oo.key) {
          // The key keeps its slot and its text, byte for byte, so the same seed
          // puts it in the same letter in arm and control.
          if (!nn.key || nn.text !== oo.text) problems.push(`${e.id}: option ${i} is the key and must be byte-identical and still the key`);
          next.push(oo);
          return;
        }
        if (nn.key) problems.push(`${e.id}: option ${i} became the key — options must keep their slots`);
        if (!nn.text || !String(nn.text).trim()) problems.push(`${e.id}: option ${i} has no text`);
        const q = String(nn.provenance || '').match(/"([^"]+)"/);
        if (!q) problems.push(`${e.id}: option ${i} provenance has no double-quoted passage quote`);
        else {
          if (q[1].trim().split(/\s+/).length > 20) problems.push(`${e.id}: option ${i} provenance quote is over 20 words`);
          if (!text.includes(collapse(q[1]))) problems.push(`${e.id}: option ${i} provenance quote not found verbatim in the passage: "${q[1].slice(0, 60)}"`);
        }
        if (!nn.rules_out || !text.includes(collapse(nn.rules_out))) problems.push(`${e.id}: option ${i} rules_out is missing or not verbatim in the passage`);
        next.push({ text: nn.text, key: false, provenance: nn.provenance, family: nn.family ?? oo.family ?? null, rules_out: nn.rules_out });
      });
      arm.push({ ...orig, options: next, arm: { kind, from } });
    }
    control.push(orig);
  }
  if (problems.length) die(`arm: the rewrite does not hold its constraints — nothing written.\n       ${problems.join('\n       ')}`);
  if (!arm.length) die('arm: the rewrite file holds no entries');

  const map = maybeJson(join(srcDir, 'concept-map.json'));
  for (const [sub, list] of [['arm', arm], ['control', control]]) {
    const d = sectionDir(label, sub);
    writeJson(join(d, 'candidates.json'), list);
    if (map) writeJson(join(d, 'concept-map.json'), map);
  }
  if (withheldNotes.length) writeJson(join(sectionDir(label, 'arm'), 'what-was-withheld.json'), withheldNotes);
  logLine(label, { stage: 'arm', kind, from, rewrite, n: arm.length, verified: kind === 'stem' ? 'every non-stem field unchanged by construction' : 'stem and key byte-identical; every option in its slot; every quote verbatim in the passage', ok: true });
  console.log(`arm      ${label}: ${arm.length} ${kind} rewrite(s) verified → ${label}/arm, with ${control.length} unmodified in ${label}/control`);
  console.log(`         next: ablate BOTH with the same --seed-offset (e.g. --seed-offset 10), then compare arm with control`);
  return { arm, control };
}

// -------------------------------------------------------- stage: preregister

// Copy a committed interpretation into the run and log its hash, before anything
// is ablated. ablate-score checks the timestamps.
function stagePreregister(label, opts = {}) {
  const file = opts.file ?? flag('file');
  if (!file) die('preregister needs --file <path to the pre-registration text>');
  const src = resolve(ROOT, file);
  if (!existsSync(src)) die(`preregister: ${file} does not exist`);
  const body = readFileSync(src, 'utf8');
  mkdirSync(runDir(label), { recursive: true });
  let n = 1;
  let dest = join(runDir(label), 'preregistration.md');
  while (existsSync(dest)) { n += 1; dest = join(runDir(label), `preregistration-${n}.md`); }
  writeFileSync(dest, body, 'utf8');
  logLine(label, { stage: 'preregister', file: rel(dest), source: file, sha256: sha256(body), ok: true });
  console.log(`preregister ${label}: ${rel(dest)} (sha256 ${sha256(body).slice(0, 12)})`);
  return dest;
}

// -------------------------------------------------------- stage: canary

// The adversary isolation check (HANDOFF §1), as a stage. Plants a file holding
// an answer and a random token, and renders the REAL adversary template with a
// stem that points at that file. Pass = the spawn reports tool_uses 0. Record
// the result with canary-record so it is a structured log line, not prose.
function stageCanary(label) {
  const token = randomBytes(8).toString('hex');
  const cp = `runs/${label}/canary.txt`;
  mkdirSync(runDir(label), { recursive: true });
  writeFileSync(join(ROOT, cp), `The correct answer is D. Canary token: ${token}\n`, 'utf8');
  const stem = fillPartial('canary-stem', { canary_path: cp });
  const text = render('adversary-mc', { stem, options: optionLines(['Alpha', 'Beta', 'Gamma', 'Delta']) });
  const pp = join(runDir(label), 'canary-prompt.txt');
  writeFileSync(pp, text, 'utf8');
  logLine(label, { stage: 'canary', planted: cp, token_sha256: sha256(token), prompt: rel(pp), ok: true });
  console.log(`canary   ${label}: planted ${cp}; prompt → ${rel(pp)}`);
  console.log('         spawn quiz-adversary with that prompt, then: pipeline.mjs canary-record --run <label> --tool-uses <n> --reply <letter>');
}

function stageCanaryRecord(label) {
  const tu = Number(flag('tool-uses'));
  const reply = flag('reply');
  if (!Number.isInteger(tu) || tu < 0) die('canary-record needs --tool-uses <non-negative integer, from the spawn result>');
  if (!reply) die('canary-record needs --reply <the letter the adversary returned>');
  // The harness returns a subagent's reply through one SubagentHandback call and
  // counts it in tool_uses (user decision 2026-09-27). Exempt exactly that call,
  // still recorded; any other tool call, or a second hand-back, voids the run.
  const hb = Number(flag('handbacks', '0'));
  if (!Number.isInteger(hb) || hb < 0 || hb > tu) die('canary-record --handbacks <n> must be an integer between 0 and --tool-uses');
  const other = tu - hb;
  const pass = other === 0 && hb <= 1;
  logLine(label, { stage: 'canary-result', tool_uses: tu, handbacks: hb, other_tool_uses: other, reply, pass, note: pass ? 'isolation held' : 'ADVERSARY METRIC VOID for this run: the adversary used a tool', ok: pass });
  console.log(`canary   ${label}: ${pass ? 'PASS' : 'FAIL'} — tool_uses ${tu} (hand-backs ${hb}, other ${other}), reply ${reply}${reply === 'D' && pass ? ' (D by chance: 25%)' : ''}`);
  if (!pass) process.exit(1);
}

// -------------------------------------------------------- stage: bench-check

// Mechanical checks on one bench entry, before its first use. The author's
// claims file is what makes the passage's balance checkable rather than trusted.
// Unmistakable framing fails; words a real passage could use (a theatre passage
// may well say "fictional") only warn, and a human looks.
const BENCH_NOTICE = /\b(fabricated|this is fiction|none of it is true|quiz|adversary|hit rate|test-wise|measurement bench)\b/i;
const BENCH_NOTICE_SOFT = /\b(fictional|invented for|benchmark|not a real source)\b/i;

function stageBenchCheck(opts = {}) {
  const id = opts.bench ?? flag('bench');
  if (!id) die('bench-check needs --bench <id>');
  const b = join(ROOT, 'bench', id);
  const passagePath = join(b, 'passage.md');
  need(passagePath, `bench/${id}/passage.md`);
  const passage = readFileSync(passagePath, 'utf8');
  const flat = collapse(passage);
  const fail = [];
  const warn = [];
  const notice = passage.match(BENCH_NOTICE);
  if (notice) fail.push(`passage.md mentions "${notice[0]}" — it must contain the section only; the analyst and generator read it as their prose`);
  const soft = passage.match(BENCH_NOTICE_SOFT);
  if (soft) warn.push(`passage.md contains "${soft[0]}" — check it is the subject matter, not a note about the passage`);
  const words = passage.split(/\s+/).filter(Boolean).length;
  if (words < 1400 || words > 1800) warn.push(`passage is ${words} words; the bench standard is 1400–1800`);
  if (!existsSync(join(b, 'private', 'passage-notes.md'))) fail.push('private/passage-notes.md is missing');
  const cp = join(b, 'private', 'claims.json');
  let report = { id, words };
  if (!existsSync(cp)) fail.push('private/claims.json is missing');
  else {
    const claims = readJson(cp);
    if (!Array.isArray(claims) || !claims.length) fail.push('private/claims.json must be a non-empty array');
    else {
      for (const c of claims) {
        if (!c.quote || !flat.includes(collapse(c.quote))) fail.push(`${c.id}: quote not found verbatim in passage.md`);
        if ((c.naive_answer == null) !== (c.naive_is_right == null)) fail.push(`${c.id}: naive_is_right must be null exactly when naive_answer is`);
        // A claim cannot have "no sensible guess" while a heuristic predicts its
        // true answer: a blind reader applying that heuristic gets it right. Both
        // verification reviews found this by reading (b02 P2; b03 C13, C25); it is
        // a contradiction in the tags, so the script catches it.
        const noGuess = c.passage_only === true || c.naive_answer == null;
        if (noGuess && (c.heuristics_right || []).length) fail.push(`${c.id}: tagged as having no sensible guess, yet "${c.heuristics_right.join('", "')}" predicts its true answer — retag it guessable`);
      }
      const directional = claims.filter((c) => c.naive_is_right != null);
      const right = directional.filter((c) => c.naive_is_right === true).length;
      const share = directional.length ? right / directional.length : null;
      const passageOnly = claims.filter((c) => c.passage_only === true || c.naive_answer == null).length;
      if (share != null && (share < 0.3 || share > 0.7)) fail.push(`naive answer is right on ${right}/${directional.length} directional claims (${fmtPct(share)}); the bench requires roughly half (30–70%) so that "reverse the obvious" is not a reliable rule`);
      if (passageOnly < 4) fail.push(`${passageOnly} claim(s) have no sensible direction to guess; at least 4 are required`);
      const heur = {};
      for (const c of claims) {
        for (const h of c.heuristics_right || []) (heur[h] ??= { right: 0, wrong: 0 }).right += 1;
        for (const h of c.heuristics_wrong || []) (heur[h] ??= { right: 0, wrong: 0 }).wrong += 1;
      }
      // Quantity-shape claims: a reader who always answers "peaks in the middle"
      // (or "rises") gains if one shape dominates. Warn above a third.
      const shapes = claims.map((c) => c.shape).filter((x) => x && x !== 'null');
      const shapeCounts = Object.fromEntries([...new Set(shapes)].map((x) => [x, shapes.filter((y) => y === x).length]));
      for (const [sh, n] of Object.entries(shapeCounts)) {
        if (shapes.length >= 3 && n / shapes.length > 1 / 3) warn.push(`${n} of ${shapes.length} quantity claims are "${sh}" — a reader who always answers "${sh}" gains`);
      }
      // A heuristic whose tags are exactly the complement of naive_is_right
      // ("the surprising answer is right") is derived, not independent evidence.
      const naiveWrong = new Set(claims.filter((c) => c.naive_is_right === false).map((c) => c.id));
      for (const [h, v] of Object.entries(heur)) {
        const t = v.right + v.wrong;
        const rightIds = new Set(claims.filter((c) => (c.heuristics_right || []).includes(h)).map((c) => c.id));
        const derived = rightIds.size === naiveWrong.size && [...rightIds].every((x) => naiveWrong.has(x));
        if (derived) { warn.push(`heuristic "${h}" is tagged as the exact complement of naive_is_right — its balance is guaranteed and is not separate evidence`); continue; }
        if (t >= 3 && (v.right / t >= 0.75 || v.wrong / t >= 0.75)) warn.push(`heuristic "${h}" is right ${v.right} and wrong ${v.wrong} times — a reader applying it gains or loses reliably`);
        // One use each way cannot be balanced: a single question on either claim
        // rewards or punishes the heuristic at full strength (b03 review #9).
        else if (v.right < 2 || v.wrong < 2) warn.push(`heuristic "${h}" is tagged only ${v.right} right / ${v.wrong} wrong — too few uses to be balanced`);
      }
      report = { ...report, claims: claims.length, directional: directional.length, naive_right: right, naive_right_share: share, passage_only: passageOnly, heuristics: heur, shapes: shapeCounts };
    }
  }
  report.fail = fail;
  report.warn = warn;
  // Under private/: it records how each claim "sounds", which the analyst and
  // generator must never see (b02 review #3).
  writeJson(join(b, 'private', 'bench-check.json'), report);
  console.log(`bench-check ${id}: ${fail.length} FAIL, ${warn.length} WARN${report.claims ? ` · ${report.claims} claims, naive right ${report.naive_right}/${report.directional}, ${report.passage_only} with no sensible guess` : ''}`);
  for (const f of fail) console.log(`  FAIL ${f}`);
  for (const w of warn) console.log(`  WARN ${w}`);
  return report;
}

// -------------------------------------------------------- stage: bench-run / bench-map

// Start a bench iteration: copy the passage to runs/<label>/<slug>/section.md,
// with the bench's concept map and idea list if it has them. Everything
// downstream then uses --run/--section only, and the analyst and generator are
// pointed at a neutral path — never at bench/, whose files describe the passage
// as invented. The mapping from run back to bench is kept only in run.log.
function stageBenchRun(label, slug, opts = {}) {
  const id = opts.bench ?? flag('bench');
  if (!id) die('bench-run needs --bench <id>');
  const b = join(ROOT, 'bench', id);
  need(join(b, 'passage.md'), `bench/${id}/passage.md`);
  const chk = maybeJson(join(b, 'private', 'bench-check.json'));
  if (!chk) die(`bench-run: bench/${id} has no bench-check result — run bench-check first`);
  if (chk.fail?.length && !(opts.allowFailing ?? argv.includes('--allow-failing'))) {
    die(`bench-run: bench/${id} fails bench-check (${chk.fail.length}); pass --allow-failing only for a legacy entry, and say so in the report`);
  }
  const d = sectionDir(label, slug);
  if (existsSync(join(d, 'section.md'))) die(`bench-run: ${rel(d)} already holds a section — one bench entry per run section`);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'section.md'), readFileSync(join(b, 'passage.md'), 'utf8'), 'utf8');
  for (const f of ['concept-map.json', 'ideas.json']) if (existsSync(join(b, f))) writeFileSync(join(d, f), readFileSync(join(b, f), 'utf8'));
  logLine(label, { stage: 'bench-run', section: slug, bench: id, passage_sha256: sha256(readFileSync(join(b, 'passage.md'), 'utf8')), bench_check_fail: chk.fail?.length ?? null, naive_right_share: chk.naive_right_share ?? null, ok: true });
  console.log(`bench-run ${label}/${slug}: section.md ← bench/${id}/passage.md${existsSync(join(b, 'concept-map.json')) ? ', with its concept map' : ' (no concept map yet — run analyse, then bench-map)'}`);
}

// Adopt the analyst's concept map from a run as the bench entry's fixed map.
// Refuses to overwrite: a map, like a passage, is fixed once it exists.
function stageBenchMap(opts = {}) {
  const id = opts.bench ?? flag('bench');
  const from = opts.from ?? flag('from');
  if (!id || !from || !from.includes('/')) die('bench-map needs --bench <id> --from <label>/<slug>');
  const [fl, fs] = from.split('/');
  const src = join(sectionDir(fl, fs), 'concept-map.json');
  need(src, `${from}/concept-map.json`);
  const dest = join(ROOT, 'bench', id, 'concept-map.json');
  if (existsSync(dest)) die(`bench-map: bench/${id}/concept-map.json already exists; a bench map is fixed once made`);
  writeFileSync(dest, readFileSync(src, 'utf8'));
  console.log(`bench-map bench/${id}/concept-map.json ← ${from}`);
}

// Validate a tagger's candidate → claim map (prompts/bench-claim-map.md) and
// resolve each claim's type from the bench's claims file. Written only after
// generation, so nothing that writes questions ever sees it.
function stageClaimMap(label, slug, opts = {}) {
  const id = opts.bench ?? flag('bench');
  if (!id) die('claim-map needs --bench <id>');
  const d = sectionDir(label, slug);
  const raw = readJson(need(join(d, 'claim-map.raw.json'), 'claim-map.raw.json (from the bench-claim-map spawn)'));
  const claims = readJson(need(join(ROOT, 'bench', id, 'private', 'claims.json'), `bench/${id}/private/claims.json`));
  const chk = readJson(need(join(ROOT, 'bench', id, 'private', 'bench-check.json'), 'bench-check.json'));
  const cands = readJson(need(join(d, 'candidates.json'), 'candidates.json'));
  const byClaim = new Map(claims.map((c) => [c.id, c]));
  const problems = [];
  for (const c of cands) if (!(c.id in raw)) problems.push(`${c.id}: no entry`);
  for (const [cid, clid] of Object.entries(raw)) {
    if (!cands.some((c) => c.id === cid)) problems.push(`${cid}: not a candidate`);
    if (clid !== null && !byClaim.has(clid)) problems.push(`${cid}: claim "${clid}" is not in claims.json`);
  }
  if (problems.length) die(`claim-map: ${problems.join('; ')}`);
  const map = Object.fromEntries(Object.entries(raw).map(([cid, clid]) => {
    const cl = clid ? byClaim.get(clid) : null;
    return [cid, { claim: clid, type: !cl ? 'unmapped' : cl.naive_is_right == null ? 'passage-only' : 'directional', naive_is_right: cl ? cl.naive_is_right : null }];
  }));
  // The floor comes from the directional ITEMS actually asked, not from the
  // passage's claim-level share (b03 review #5): the generator chooses which
  // claims to question, and a passage balanced at 50% can yield a question set
  // where three in four keys go against the sensible guess. An always-reverse
  // reader then scores 75% on those items, which a 50% floor would read as leak.
  const dirItems = Object.values(map).filter((x) => x.type === 'directional');
  const asked = dirItems.length ? dirItems.filter((x) => x.naive_is_right === true).length / dirItems.length : null;
  const out = {
    bench: id,
    passage_naive_right_share: chk.naive_right_share ?? null,
    asked_naive_right_share: asked,
    directional_floor: asked == null ? null : Math.max(asked, 1 - asked),
    map,
  };
  writeJson(join(d, 'claim-map.json'), out);
  logLine(label, { stage: 'claim-map', section: slug, bench: id, n: cands.length, ok: true });
  console.log(`claim-map ${label}/${slug}: ${Object.values(map).filter((x) => x.type === 'directional').length} directional, ${Object.values(map).filter((x) => x.type === 'passage-only').length} passage-only, ${Object.values(map).filter((x) => x.type === 'unmapped').length} unmapped`);
  return out;
}

// -------------------------------------------------- stage: control-check
//
// Hand-authored ("clean") control items on a bench passage: the floor a
// careful author's question has on content no reader can know. Authors write
// runs/<R>/<S>/candidates.<author>.json and run this themselves until it passes;
// it then merges every author file into candidates.json (with an `author`
// field) and writes claim-map.raw.json from each item's `claim`, so the usual
// claim-map / ablate / ablate-score path scores them.
//
// "Clean" is stricter than the rubric's gates, on purpose (runs/tier4-control):
// four options, one key; key/distractor length ratio in the R8 band; spread
// ≤ 1.6×; key neither the longest nor the shortest; no absolute word in any
// option; key hedges no more than the median distractor; no R5 phrasing; and
// every lint (self-defeating distractor, quotes, emphasis) clean.
function controlProblems(c, claimIds) {
  const p = [];
  if (!c || typeof c !== 'object') return ['not an object'];
  if (!isStr(c.id) || !isStr(c.stem) || !isArr(c.options)) return ['needs id, stem, options'];
  if (c.options.length !== 4) p.push(`has ${c.options.length} options, needs 4`);
  if (c.options.filter((o) => o.key === true).length !== 1) p.push('needs exactly one option with key: true');
  if (!isStr(c.claim) || !claimIds.has(c.claim)) p.push(`claim "${c.claim}" is not an id in the passage's claims.json`);
  if (c.group !== 'clean') p.push('group must be "clean"');
  if (!isStr(c.author)) p.push('needs author');
  for (const [i, o] of c.options.entries()) if (!o.key && !isStr(o.misreading)) p.push(`options[${i}] (a distractor) needs a "misreading": who would believe it, and why`);
  if (p.length) return p;
  const m = measure(asQuestion(c));
  if (m.len_ratio == null || m.len_ratio < GATES.r8[0] || m.len_ratio > GATES.r8[1]) p.push(`key/distractor length ratio ${m.len_ratio} outside ${GATES.r8.join('–')}`);
  if (m.max_over_min > GATES.spread) p.push(`longest/shortest option ${m.max_over_min}× > ${GATES.spread}×`);
  if (m.correct_is_longest) p.push('key is the longest option');
  if (m.correct_is_shortest) p.push('key is the shortest option');
  if (m.absolute_count_key || m.absolute_count_distractors) p.push('an option carries an absolute word (checker list)');
  const hm = [...m.hedge_counts.distractors].sort((a, b) => a - b);
  const hedgeMedian = hm.length % 2 ? hm[(hm.length - 1) / 2] : (hm[hm.length / 2 - 1] + hm[hm.length / 2]) / 2;
  if (m.hedge_counts.key > hedgeMedian) p.push(`key carries ${m.hedge_counts.key} hedge(s), distractor median ${hedgeMedian}`);
  if (m.r5_matches.length || m.mentions_chapter) p.push('R5: the stem refers to the chapter/text/section');
  for (const l of lintCandidate(c)) p.push(`${l.rule}: ${l.detail}`);
  return p;
}

function stageControlCheck(label, slug, opts = {}) {
  const id = opts.bench ?? flag('bench');
  if (!id) die('control-check needs --bench <id>');
  const d = sectionDir(label, slug);
  const claims = readJson(need(join(ROOT, 'bench', id, 'private', 'claims.json'), `bench/${id}/private/claims.json`));
  const claimIds = new Set(claims.map((c) => c.id));
  const files = existsSync(d) ? readdirSync(d).filter((f) => /^candidates\.[a-z0-9-]+\.json$/.test(f)).sort() : [];
  if (!files.length) die(`control-check: no candidates.<author>.json in ${d}`);
  const all = [];
  let bad = 0;
  for (const f of files) {
    let items;
    try { items = readJson(join(d, f)); } catch (e) { console.log(`  FAIL ${f}: not valid JSON (${e.message})`); bad += 1; continue; }
    if (!isArr(items)) { console.log(`  FAIL ${f}: must be a JSON array`); bad += 1; continue; }
    for (const c of items) {
      const p = controlProblems(c, claimIds);
      if (all.some((x) => x.id === c?.id)) p.push('duplicate id');
      console.log(`  ${p.length ? 'FAIL' : 'ok  '} ${f} ${c?.id ?? '?'}${p.length ? `\n         - ${p.join('\n         - ')}` : ''}`);
      if (p.length) bad += 1;
      all.push(c);
    }
  }
  if (bad) { console.log(`control-check ${label}/${slug}: ${bad} problem item(s) — nothing merged`); process.exitCode = 1; return { ok: false, bad }; }
  writeJson(join(d, 'candidates.json'), all);
  writeJson(join(d, 'claim-map.raw.json'), Object.fromEntries(all.map((c) => [c.id, c.claim])));
  logLine(label, { stage: 'control-check', section: slug, bench: id, n: all.length, authors: uniq(all.map((c) => c.author)), ok: true });
  console.log(`control-check ${label}/${slug}: ${all.length} clean item(s) from ${files.length} author file(s) → candidates.json, claim-map.raw.json`);
  return { ok: true, n: all.length };
}

// -------------------------------------------------------- stage: score (t4)

// Adversary letters → adversary.json. Reads picks.json: the letter each spawn
// returned, keyed `<id>#<seed>`. Reports against per-question chance 1/k, never
// a flat 25% — option counts vary 2–5 under the amended R2.
function stageScore(label, slug) {
  const outDir = flag('out');
  const dir = outDir ? resolve(ROOT, outDir) : sectionDir(label, slug);
  const shuffle = readJson(need(join(dir, 'shuffle.json'), 'shuffle.json'));
  const picks = readJson(need(join(dir, 'picks.json'), 'picks.json (letter per <id>#<seed>)'));

  // picks.json must be an OBJECT keyed "<id>#<seed>". An array lookup by that
  // key yields undefined for every prompt, so every answer counts as missing,
  // every derived mean is NaN-free-but-empty, and the gate reports PASS on zero
  // data — a green light produced by malformed input, which is the worst
  // failure this script can have. Observed 2026-09-19. Refuse it.
  if (Array.isArray(picks) || picks === null || typeof picks !== 'object') {
    die('picks.json must be an object keyed "<id>#<seed>" → letter, e.g.\n'
      + '         { "forecasting-timelines/sonnet/a01r#1": "C" }\n'
      + `       got ${Array.isArray(picks) ? 'an array' : typeof picks}. Refusing to score: an array scores 0% and reports the gate as PASS.`);
  }

  const rows = [];
  const missing = [];
  for (const pr of shuffle.prompts) {
    const k = `${pr.id}#${pr.seed}`;
    const raw = picks[k];
    if (raw == null) { missing.push(k); continue; }
    // Tolerate a letter with punctuation or stray words; refuse to guess beyond
    // a single unambiguous letter, because a mis-parsed pick is a fake hit.
    const text = String(raw).trim();
    const m = text.toUpperCase().match(/\b([A-E])\b/);
    const picked = m ? m[1] : null;
    // A bare letter is the brief's contract. Anything else got parsed by the
    // regex above, and the regex can pick the WRONG letter out of a verbose
    // answer without ever looking unparsed — which scores a fake hit rather
    // than a visible failure. Observed in the baseline run: an adversary that
    // returned `{"id": "unknown", "picked": "A", …}` happened to parse
    // correctly; `{"id": "a-1", "picked": "C"}` would not have. So flag it and
    // keep the raw text, rather than trusting a plausible-looking hit.
    const verbose = !/^[A-E][.)]?$/i.test(text);
    rows.push({
      id: pr.id,
      seed: pr.seed,
      picked,
      key: pr.key_letter,
      hit: picked === pr.key_letter,
      option_count: pr.option_count,
      chance: pr.chance,
      unparsed: picked === null ? text.slice(0, 80) : undefined,
      verbose: verbose || undefined,
      raw: verbose ? text.slice(0, 200) : undefined,
      key_position: pr.key_position,
    });
  }

  const byId = new Map();
  for (const r of rows) {
    if (!byId.has(r.id)) byId.set(r.id, []);
    byId.get(r.id).push(r);
  }
  const perQuestion = [...byId.entries()].map(([id, rs]) => {
    const hits = rs.filter((r) => r.hit).length;
    return {
      id,
      hits,
      seeds: rs.length,
      option_count: rs[0].option_count,
      chance: rs[0].chance,
      hit_rate: Number((hits / rs.length).toFixed(3)),
      excess: Number((hits / rs.length - rs[0].chance).toFixed(3)),
      // A Q hit on ≥2/3 seeds is flagged. A flag is not an auto-reject: the
      // curator treats it as ineligible unless it can name why (adversary doc).
      flagged: hits >= 2,
    };
  }).sort((a, b) => b.hits - a.hits || a.id.localeCompare(b.id));

  const four = perQuestion.filter((q) => q.option_count === 4);
  const summary = {
    source: shuffle.source,
    n_questions: perQuestion.length,
    n_answers: rows.length,
    unparsed: rows.filter((r) => r.picked === null).length,
    // Answers that were not a bare letter. Each one's pick came from the
    // tolerant regex and should be eyeballed against `raw` in `answers`.
    verbose_answers: rows.filter((r) => r.verbose).length,
    missing_picks: missing.length,
    flagged: perQuestion.filter((q) => q.flagged).length,
    mean_hit_rate: Number(mean(perQuestion.map((q) => q.hit_rate)).toFixed(3)),
    mean_excess_over_chance: Number(mean(perQuestion.map((q) => q.excess)).toFixed(3)),
    gate_excess: 0.15,
    gate_excess_pass: mean(perQuestion.map((q) => q.excess)) <= 0.15,
    four_option_hit_rate: four.length ? Number(mean(four.map((q) => q.hit_rate)).toFixed(3)) : null,
    four_option_n: four.length,
    key_position_of_hits: rows.filter((r) => r.hit)
      .reduce((a, r) => { a[r.key_position] = (a[r.key_position] || 0) + 1; return a; }, {}),
  };

  // A gate can only pass on evidence. With no scored answers there is nothing to
  // pass, and `mean([]) <= 0.15` is vacuously true — so say so rather than
  // emitting gate_excess_pass: true over an empty set.
  if (!rows.length) {
    summary.gate_excess_pass = null;
    summary.gate_excess_note = `no answers scored — ${missing.length} prompt(s) had no pick; the gate is undetermined, not passed`;
  }

  const out = { summary, per_question: perQuestion, answers: rows, missing_picks: missing };
  const p = writeJson(join(dir, 'adversary.json'), out);
  if (label) logLine(label, { stage: 'score', section: slug || basename(dir), ...summary, artifact: p, ok: true });
  console.log(`score    ${shuffle.source}: mean hit ${fmtPct(summary.mean_hit_rate)} · excess over chance ${summary.mean_excess_over_chance >= 0 ? '+' : ''}${summary.mean_excess_over_chance} (gate ≤0.15 ${summary.gate_excess_pass == null ? 'UNDETERMINED' : summary.gate_excess_pass ? 'pass' : 'FAIL'}) · 4-opt ${summary.four_option_hit_rate == null ? 'n/a' : fmtPct(summary.four_option_hit_rate)} · flagged ${summary.flagged}/${summary.n_questions}`);
  if (missing.length) console.log(`         note: ${missing.length} prompt(s) have no pick recorded`);
  if (summary.unparsed) console.log(`         note: ${summary.unparsed} pick(s) unparseable — counted as non-hits, listed in adversary.json`);
  if (summary.verbose_answers) console.log(`         note: ${summary.verbose_answers} answer(s) were not a bare letter — check \`raw\` in adversary.json; the brief asks for one letter`);
  return out;
}

// ------------------------------------------------------- stage: validate (§3)

// Load-bearing, and with no API counterpart. A subagent can return prose,
// truncate, wrap JSON in a fence, or write nothing. So every agent writes to an
// exact path and this checks the file against the schema in its brief — required
// keys, types, enums, array lengths, and the cross-file invariants.
// An artifact that does not validate did not happen.
// Two severities, because one flat list is how three cosmetic complaints about
// curator.json buried the output on 2026-09-19 while the genuinely dangerous
// defects elsewhere were silent.
//   FAIL — the artifact is malformed. It "did not happen"; re-spawn that agent.
//   WARN — well-formed, but a human should look (an R5 phrase, an adversary hit).
// The exit code is driven by FAIL alone, so a warning can never gate a run and a
// failure can never be lost in noise.
function validator() {
  const problems = [];
  const ok = (cond, where, msg) => { if (!cond) problems.push({ where, msg, severity: 'FAIL' }); return Boolean(cond); };
  const warn = (cond, where, msg) => { if (!cond) problems.push({ where, msg, severity: 'WARN' }); return Boolean(cond); };
  return { problems, ok, warn };
}

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isArr = (v) => Array.isArray(v);

function validateConceptMap(m, where, ok) {
  if (!ok(m && typeof m === 'object', where, 'not an object')) return;
  ok(isStr(m.section), where, 'section missing');
  ok(isStr(m.heading), where, 'heading missing');
  ok(Number.isInteger(m.target_n), where, 'target_n not an integer');
  ok(isStr(m.takeaway), where, 'takeaway missing (curator needs it for §7a)');
  ok(isArr(m.subheadings) && m.subheadings.length > 0, where, 'subheadings missing (E4a slugifies these)');
  if (!ok(isArr(m.ideas) && m.ideas.length > 0, where, 'ideas missing')) return;
  for (const i of m.ideas) {
    const w = `${where}#${i.id || '?'}`;
    ok(isStr(i.id), w, 'idea id missing');
    ok(isStr(i.label), w, 'idea label missing');
    ok(isArr(i.criteria_met), w, 'criteria_met missing (§8.2)');
    ok(typeof i.earns_question === 'boolean', w, 'earns_question not a boolean');
    ok(isStr(i.disposition), w, 'disposition missing (§8.3)');
    if (i.earns_question) {
      ok(isStr(i.anchor), w, 'earns_question idea has no verbatim anchor');
      ok([1, 2, 3].includes(Number(i.attempts)), w, `attempts must be 1–3, got ${i.attempts}`);
      const mis = isArr(i.misconceptions) ? i.misconceptions : [];
      ok(mis.length >= 1, w, 'earns_question idea has no misconception (analyst self-check)');
      for (const x of mis) {
        ok(isStr(x.provenance), w, 'misconception without a provenance line (D1)');
        ok(FAMILIES.includes(x.family), w, `misconception family must be a/b/c/d, got ${x.family}`);
        ok(['inferred', 'observed'].includes(x.source), w, `misconception source must be inferred|observed, got ${x.source}`);
      }
      // Criterion 2 alone must never earn a question (analyst procedure step 2).
      ok(!(i.criteria_met && i.criteria_met.length === 1 && Number(i.criteria_met[0]) === 2),
        w, 'earns_question on criterion 2 alone — must be disposition: explanation');
      if (i.threshold) {
        const lv = i.suggested_levels || [];
        ok(lv.includes('L4') || lv.includes('L5'), w, 'threshold idea without L4/L5 in suggested_levels');
      }
    }
  }
  // An inferred misconception labelled observed is a finding the analyst brief
  // bans outright; without misconceptions/ on disk, `observed` cannot be true.
  const hasSource = existsSync(join(ROOT, 'misconceptions', `${m.section}.md`));
  if (!hasSource) {
    for (const i of m.ideas) {
      for (const x of i.misconceptions || []) {
        ok(x.source !== 'observed', `${where}#${i.id}`,
          'misconception labelled observed but no misconceptions/<section>.md exists');
      }
    }
  }
}

function validateShards(s, map, where, ok) {
  if (!ok(s && isArr(s.shards), where, 'shards array missing')) return;
  const seen = new Set();
  const seenLens = new Set();
  let declaredRepeats = Number(s.memberships_repeated_under_a_new_lens) || 0;
  for (const sh of s.shards) {
    const w = `${where}#${sh.shard_id || '?'}`;
    ok(isStr(sh.shard_id), w, 'shard_id missing');
    ok(isArr(sh.ideas) && sh.ideas.length > 0, w, 'shard has no ideas');
    ok(LENSES.includes(sh.lens), w, `lens must be one of ${LENSES.join('|')}, got ${sh.lens}`);
    ok(isStr(sh.model), w, 'model not assigned');
    ok(['section', 'review'].includes(sh.mode), w, `mode must be section|review, got ${sh.mode}`);
    const key = [...sh.ideas].sort().join('|');
    if (seen.has(key)) declaredRepeats--;
    ok(!seen.has(key) || declaredRepeats >= 0, w,
      `shard membership duplicates another shard (${key}) beyond the count shards.json declares`);
    // A repeated membership must at least carry a lens that membership has not
    // had — that is the decorrelation the repeat is being allowed for.
    ok(!seen.has(key) || !seenLens.has(`${key}@${sh.lens}`), w,
      `shard repeats membership (${key}) under a lens it already used (${sh.lens})`);
    seen.add(key);
    seenLens.add(`${key}@${sh.lens}`);
  }
  if (!map) return;
  // Every earns_question idea appears in exactly its `attempts` many shards.
  const counts = new Map();
  for (const sh of s.shards) for (const id of sh.ideas) counts.set(id, (counts.get(id) || 0) + 1);
  for (const i of map.ideas.filter((x) => x.earns_question)) {
    const want = Math.max(1, Math.min(3, Number(i.attempts) || 1));
    const got = counts.get(i.id) || 0;
    ok(got === want, `${where}#${i.id}`, `appears in ${got} shards, attempts says ${want}`);
  }
  for (const id of counts.keys()) {
    ok(map.ideas.some((x) => x.id === id), where, `shard names unknown idea ${id}`);
  }
  // Discrimination pairs co-occur at least once: a contrast question needs both.
  // Only enforceable when BOTH members earn a question — shards are built solely
  // from earns_question ideas, so a pair naming a non-earning member (which the
  // analyst brief permits: a pair is "every pair the text separates and readers
  // merge", with no earns_question requirement) can never co-occur by
  // construction. Enforcing it there demanded the impossible and failed a
  // shards.json that was correct. Observed 2026-09-19 on FT-5/FT-5b.
  const earns = new Set(map.ideas.filter((i) => i.earns_question).map((i) => i.id));
  for (const p of map.discrimination_pairs || []) {
    if (!earns.has(p.a) || !earns.has(p.b)) continue;
    const together = s.shards.some((sh) => sh.ideas.includes(p.a) && sh.ideas.includes(p.b));
    ok(together, where, `discrimination pair ${p.a}/${p.b} never co-occurs in a shard`);
  }
  // An idea's attempts must differ in lens AND model — that is the whole point
  // of sharding (§3.1), and it is the A/B's independent variable.
  for (const [id, n] of counts) {
    if (n < 2) continue;
    const mine = s.shards.filter((sh) => sh.ideas.includes(id));
    ok(uniq(mine.map((sh) => sh.lens)).length > 1, `${where}#${id}`,
      `${n} attempts all under lens "${mine[0].lens}" — sharding's decorrelation did not happen`);
  }
}

function validateCandidates(list, map, where, ok, warn = ok) {
  if (!ok(isArr(list), where, 'not a JSON array')) return;
  const ids = new Set();
  const subs = new Set((map && map.subheadings) || []);
  const ideaIds = new Set((map && map.ideas.map((i) => i.id)) || []);
  const doNotTest = ((map && map.do_not_test) || []).map((d) => String(d.item || '').toLowerCase());
  for (const c of list) {
    const w = `${where}#${c.id || '?'}`;
    ok(isStr(c.id), w, 'candidate id missing');
    ok(!ids.has(c.id), w, 'duplicate candidate id');
    ids.add(c.id);
    ok(isArr(c.targets) && c.targets.length > 0, w, 'targets missing');
    for (const t of c.targets || []) if (ideaIds.size) ok(ideaIds.has(t), w, `targets unknown idea ${t}`);
    ok(LENSES.includes(c.lens), w, `lens must be one of ${LENSES.join('|')}, got ${c.lens}`);
    ok(LEVELS.includes(c.level_claimed), w, `level_claimed must be L0–L5, got ${c.level_claimed}`);
    ok(isStr(c.stem), w, 'stem missing');
    ok(isStr(c.explanation), w, 'explanation missing (R3)');
    ok(STEM_FORMATS.includes(c.stem_format), w, `stem_format must be one of ${STEM_FORMATS.join('|')}, got ${c.stem_format}`);
    ok(typeof c.negation === 'boolean', w, 'negation not a boolean');
    ok(typeof c.no_shuffle === 'boolean', w, 'no_shuffle not a boolean');
    ok(c.citation && isStr(c.citation.section), w, 'citation.section missing (E4)');
    if (c.citation && isStr(c.citation.subheading) && subs.size) {
      ok(subs.has(c.citation.subheading), w,
        `citation subheading "${c.citation.subheading}" is not in the map's subheadings (E4)`);
    }
    if (!ok(isArr(c.options), w, 'options missing')) continue;
    const keys = c.options.filter((o) => o.key);
    ok(keys.length === 1, w, `R1: ${keys.length} keys, must be exactly 1`);
    ok(c.options.length >= GATES.optionMin && c.options.length <= GATES.optionMax, w,
      `R2: ${c.options.length} options, must be ${GATES.optionMin}–${GATES.optionMax}`);
    if (c.options.length < 4) ok(isStr(c.option_count_reason), w, 'R2: <4 options needs option_count_reason');
    for (const o of c.options) {
      ok(isStr(o.text), w, 'option with empty text');
      if (!o.key) {
        ok(isStr(o.provenance), w, 'D1: distractor without a provenance line');
        ok(FAMILIES.includes(o.family), w, `D2: distractor family must be a/b/c/d, got ${o.family}`);
      }
    }
    const fams = uniq(c.options.filter((o) => !o.key).map((o) => o.family));
    ok(fams.length >= 2, w, `D2: needs ≥2 distinct distractor families, has ${fams.length} (${fams.join(',')})`);
    ok(c.self_check && isStr(c.self_check.cover_test) && isStr(c.self_check.cynic_test), w,
      'self_check.cover_test / cynic_test missing (curator reads these first)');
    // R12 and the R5 family, checked on options and explanation too (§10.1 note).
    const all = [c.stem, ...c.options.map((o) => o.text), c.explanation].join(' ');
    ok(!/\b(all|none) of the above\b/i.test(all), w, 'R12: all/none of the above');
    // R5 is a WARN, not a FAIL: the candidate is well-formed and this is exactly
    // the kind of fault the rewrite path exists to fix. Failing it here would be
    // a mechanical pre-filter before the critic, which HANDOFF §6 forbids.
    warn(!/according to the (chapter|text|textbook|section|author|atlas)/i.test(all), w,
      'R5/E5: "according to the …" in stem, option or explanation');
    // Canonical text form. Typographic quotes in a JSON artifact mean a model
    // retyped prose it may not change — the drift this pipeline now designs out.
    for (const l of lintCandidate(c)) warn(false, w, `${l.rule}: ${l.detail}`);
    for (const d of doNotTest) {
      if (d.length > 12 && c.stem.toLowerCase().includes(d)) {
        ok(false, w, `stem contains a do_not_test item: "${d}"`);
      }
    }
  }
}

function validateVerdicts(list, candidates, measurements, where, ok, warnFn = ok) {
  if (!ok(isArr(list), where, 'not a JSON array')) return;
  const byId = new Map((candidates || []).map((c) => [c.id, c]));
  for (const v of list) {
    const w = `${where}#${v.id || '?'}`;
    ok(isStr(v.id), w, 'verdict id missing');
    if (byId.size) ok(byId.has(v.id), w, 'verdict id not in candidates.json');
    ok(VERDICTS.includes(v.verdict), w, `verdict must be ${VERDICTS.join('|')}, got ${v.verdict}`);
    ok(LEVELS.includes(v.level), w, `level must be L0–L5, got ${v.level} (§3.7 needs it even on reject)`);
    ok(isArr(v.failed_criteria), w, 'failed_criteria missing');
    ok(isArr(v.reasons), w, 'reasons missing');
    // Critic self-check: failed_criteria is empty iff verdict is pass.
    const emptyFails = v.failed_criteria && v.failed_criteria.length === 0;
    ok(emptyFails === (v.verdict === 'pass'), w,
      `failed_criteria is ${emptyFails ? 'empty' : 'non-empty'} but verdict is "${v.verdict}" — must be empty iff pass`);
    // One reason per failed criterion, each prefixed with its id.
    for (const crit of v.failed_criteria || []) {
      ok((v.reasons || []).some((r) => String(r).trim().startsWith(crit)), w,
        `failed criterion ${crit} has no reason line starting with "${crit}"`);
    }
    ok(typeof v.explanation_true_standalone === 'boolean', w, 'explanation_true_standalone missing (E8 signal)');
    ok(typeof v.answerable_from_text_alone === 'boolean', w, 'answerable_from_text_alone missing');
    ok(isArr(v.provenance_verified), w, 'provenance_verified missing (D1 signal)');
    const cand = byId.get(v.id);
    if (cand && isArr(v.provenance_verified)) {
      ok(v.provenance_verified.length === cand.options.length, w,
        `provenance_verified has ${v.provenance_verified.length} entries, candidate has ${cand.options.length} options`);
      const keyIdx = cand.options.findIndex((o) => o.key);
      ok(v.provenance_verified[keyIdx] === null, w, `provenance_verified[${keyIdx}] is the key and must be null`);
    }
    // THE load-bearing check: the critic must read the measurements, never
    // recompute them. A difference means it counted characters (HANDOFF §6).
    if (measurements && measurements[v.id] && v.measurements) {
      for (const k of Object.keys(measurements[v.id])) {
        if (!(k in v.measurements)) continue;
        const a = JSON.stringify(measurements[v.id][k]);
        const b = JSON.stringify(v.measurements[k]);
        ok(a === b, w, `measurements.${k} differs from measurements.json (${b} vs ${a}) — the critic recomputed`);
      }
    }
    if (v.verdict === 'rewrite') {
      ok(v.rewrite && typeof v.rewrite === 'object', w, 'verdict is rewrite but rewrite is null');
      ok(isArr(v.rewrite_changed) && v.rewrite_changed.length > 0, w, 'rewrite without a non-empty rewrite_changed');
      ok(isStr(v.preserve), w, 'rewrite with empty preserve — critic self-check says re-read whether this is a reject');
      if (v.rewrite) {
        // Severity is carried through: a malformed rewrite is a FAIL, but a
        // canonical-form or R5 finding inside one is a WARN, exactly as it is
        // for a first-pass candidate. Collapsing both to FAIL here is what
        // turned 17 cosmetic quote findings into blocking errors.
        const sub = [];
        const subWarn = [];
        validateCandidates(
          [v.rewrite], null, `${w}.rewrite`,
          (c, ww, mm) => { if (!c) sub.push({ where: ww, msg: mm }); return Boolean(c); },
          (c, ww, mm) => { if (!c) subWarn.push({ where: ww, msg: mm }); return Boolean(c); },
        );
        for (const s of sub) ok(false, s.where, s.msg);
        for (const s of subWarn) warnFn(false, s.where, s.msg);
        // A rewrite that changes the idea is a new candidate, not a rewrite.
        if (cand) {
          ok(JSON.stringify([...(v.rewrite.targets || [])].sort()) === JSON.stringify([...(cand.targets || [])].sort()),
            w, 'rewrite changed `targets` — that is a new candidate, not a rewrite');
        }
      }
    }
    ok(isStr(v.reviewer_note), w, 'reviewer_note missing');
  }
}

function validateCurator(cur, candidates, verdicts, adversary, stagingPath, where, ok, warnFn = ok) {
  if (!ok(cur && typeof cur === 'object', where, 'not an object')) return;
  ok(Number.isInteger(cur.shipped_n), where, 'shipped_n missing');
  ok(Number.isInteger(cur.target_n), where, 'target_n missing');
  ok(isArr(cur.selected), where, 'selected missing');
  ok(cur.shipped_n <= cur.target_n, where, `shipped_n ${cur.shipped_n} exceeds target_n ${cur.target_n}`);
  if (cur.shipped_n < cur.target_n) ok(isStr(cur.underfill_reason), where, 'under-filled without an underfill_reason');
  if (cur.selected) ok(cur.selected.length === cur.shipped_n, where, `selected has ${cur.selected.length} entries, shipped_n says ${cur.shipped_n}`);
  if (cur.distribution) {
    const sum = Object.values(cur.distribution).reduce((a, b) => a + b, 0);
    ok(sum === cur.shipped_n, where, `distribution sums to ${sum}, shipped_n is ${cur.shipped_n}`);
    // §3.7 hard bounds, or underfill_reason must name the bound it missed.
    const l5 = cur.distribution.L5 || 0;
    if (l5 < 1) ok(isStr(cur.underfill_reason), where, '§3.7: no L5 question and no underfill_reason naming it');
    const l2 = cur.distribution.L2 || 0;
    if (cur.shipped_n) ok(l2 / cur.shipped_n <= DIST_TARGET.L2 + 1e-9, where, `§3.7: L2 is ${l2}/${cur.shipped_n}, cap is ≤20%`);
    ok(!(cur.distribution.L0 || cur.distribution.L1), where, '§3.7: L0/L1 questions are a hard 0');
  }
  ok(isArr(cur.siblings), where, 'siblings missing (the B5 by-product)');
  for (const s of cur.siblings || []) {
    ok(typeof s.key_disclosed_by_primary_explanation === 'boolean',
      `${where}#${s.id || '?'}`, 'sibling without key_disclosed_by_primary_explanation');
  }
  ok(cur.coverage && isArr(cur.coverage.covered), where, 'coverage.covered missing');
  // Every eligible candidate is shipped, banked as a sibling, or rejected —
  // none silently dropped (curator self-check).
  if (candidates && cur.coverage) {
    const accounted = new Set([
      ...(cur.selected || []).map((s) => s.id),
      ...(cur.siblings || []).map((s) => s.id),
      ...(cur.rejected_from_pool || []).map((s) => s.id),
    ]);
    const eligible = eligibleIds(candidates, verdicts);
    for (const id of eligible) {
      ok(accounted.has(id), where, `eligible candidate ${id} is in neither selected, siblings nor rejected_from_pool`);
    }
  }
  // Adversary: a flag is a note to Em, not a veto (curator brief, "Eligible
  // pool"; PIPELINE §7). So the check is no longer "nothing flagged shipped" —
  // it is "every flagged Q that shipped was surfaced to the reviewer". The
  // baseline flagged 39 of 40 including both rubric exemplars, so the old
  // assertion would fail every honest curator run.
  if (adversary) {
    const flagged = new Set((adversary.per_question || []).filter((q) => q.flagged).map((q) => q.id));
    // flags_for_reviewer is [{id, note}]. It used to be a string array, matched
    // by substring-searching the joined prose — which reported a false alarm on
    // 2026-09-19 against a curator that HAD flagged the question, just in prose.
    // Match ids exactly. Short forms are deliberately not accepted:
    // .../opus/c01r and .../sonnet/c01r both shorten to c01r.
    const flags = cur.flags_for_reviewer || [];
    const flagIds = new Set(flags.filter((f) => f && typeof f === 'object' && f.id).map((f) => f.id));
    const legacy = flags.some((f) => typeof f === 'string');
    ok(!legacy, where, 'flags_for_reviewer contains bare strings; the schema is [{id, note}]');
    for (const s of cur.selected || []) {
      if (!flagged.has(s.id)) continue;
      ok(flagIds.has(s.id), where,
        `shipped ${s.id} is adversary-flagged but is not named in flags_for_reviewer`);
    }

  }
  // The stem/option/explanation diff that used to live here is GONE, and
  // deliberately not replaced. It existed because the curator wrote
  // staging/<section>.md itself, retyping prose it was forbidden to change; the
  // diff caught the resulting drift after the fact. `render` now builds that file
  // from candidates.json by string copy, so the curator never retypes anything
  // and there is no drift to detect. The check became unnecessary rather than
  // fixed — which is the better outcome, since it could not tell a changed quote
  // mark from a rewritten stem and reported both identically.
  //
  // What is still worth checking is that the curator selected ids that exist and
  // that the count matches; render itself dies on an unknown id.
  if (stagingPath && existsSync(stagingPath) && candidates) {
    const parsed = parseChapterMarkdown(readFileSync(stagingPath, 'utf8'));
    const shipped = parsed.flatMap((z) => z.questions).filter((q) => q.type === 'mc');
    ok(shipped.length === cur.shipped_n, `${where}→staging`,
      `staging has ${shipped.length} questions, curator.json says ${cur.shipped_n}`);
  }
  const known = new Set((candidates || []).map((c) => c.id));
  for (const sel of cur.selected || []) {
    ok(known.has(sel.id), where, `selected id ${sel.id} is not in candidates.json`);
  }

  // Set-level findings. On 2026-09-20 the curator used the literal id "section"
  // for three flags that were about the shipped set rather than any one question
  // — coverage gaps, the set-level adversary result. It was right that such
  // findings exist and had nowhere to go, but nothing here resolved the id, so
  // those three flags were invisible: neither FAIL nor WARN. A flag the checker
  // silently drops is the same silent-corruption class as the four defects this
  // pipeline was hardened against, so the scopes are recognised explicitly and
  // anything else unresolvable is reported. This is deliberately NOT inside the
  // `if (adversary)` block above — flag-id resolution does not depend on the
  // adversary having run, and the first version of this check was placed there
  // and silently never fired.
  for (const f of cur.flags_for_reviewer || []) {
    if (!f || typeof f !== 'object' || !f.id) continue;
    if (FLAG_SCOPES.has(f.id)) continue;
    if (candidates && !known.has(f.id)) {
      warnFn(false, where, `flags_for_reviewer names "${f.id}", which is neither a candidate id `
        + `nor one of the set-level scopes (${[...FLAG_SCOPES].join(', ')}); `
        + 'a flag whose id resolves to nothing reaches no reviewer');
    }
  }
}

// Eligible iff latest verdict is pass, or a rewrite that re-measured clean.
// Mirrors the curator brief's own rule so validate can check the curator applied
// it. The adversary flag is deliberately NOT part of this: it is a note to Em,
// not a veto (curator brief, "Eligible pool"; PIPELINE §7).
function eligibleIds(candidates, verdicts) {
  if (!verdicts) return [];
  const latest = new Map();
  for (const v of verdicts) latest.set(v.id, v);
  const out = [];
  for (const [id, v] of latest) {
    if (v.verdict === 'pass') out.push(id);
    else if (v.verdict === 'rewrite' && v.rewrite) {
      const m = measureCandidate(v.rewrite);
      const clean = m.len_ratio >= GATES.r8[0] && m.len_ratio <= GATES.r8[1]
        && (!(m.correct_is_longest || m.correct_is_shortest) || m.extremum_gap <= GATES.r9Gap)
        && m.max_over_min <= GATES.spread && m.r5_matches.length === 0;
      // Rewrite ids carry the `r` suffix and the original is retained beside
      // them (the convention chosen 2026-09-20, so runs/ keeps the before/after
      // rather than overwriting the evidence). What is ELIGIBLE is the rewrite,
      // not the superseded original — so name `<id>r` when merge has promoted
      // it. Without this the curator is charged with failing to account for
      // originals it correctly passed over.
      const rid = `${id}r`;
      const promoted = (candidates || []).some((c) => c.id === rid);
      if (clean) out.push(promoted ? rid : id);
    }
  }
  return out;
}

function stageValidate(label, slugArg) {
  const { problems, ok, warn } = validator();
  const base = runDir(label);
  if (!existsSync(base)) die(`no run directory: ${base}`);
  const slugs = slugArg ? [slugArg]
    : readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

  let checked = 0;
  const seen = [];
  for (const slug of slugs) {
    const dir = join(base, slug);
    const map = maybeJson(join(dir, 'concept-map.json'));
    const shards = maybeJson(join(dir, 'shards.json'));
    const candidates = maybeJson(join(dir, 'candidates.json'));
    const measurements = maybeJson(join(dir, 'measurements.json'));
    const verdicts = maybeJson(join(dir, 'verdicts.json'));
    const adversary = maybeJson(join(dir, 'adversary.json'));
    const curator = maybeJson(join(dir, 'curator.json'));

    if (map) { validateConceptMap(map, `${slug}/concept-map.json`, ok); checked++; seen.push(`${slug}/concept-map.json`); }
    if (shards) { validateShards(shards, map, `${slug}/shards.json`, ok); checked++; seen.push(`${slug}/shards.json`); }
    if (candidates) { validateCandidates(candidates, map, `${slug}/candidates.json`, ok, warn); checked++; seen.push(`${slug}/candidates.json`); }
    if (measurements && candidates) {
      checked++; seen.push(`${slug}/measurements.json`);
      for (const id of Object.keys(measurements)) {
        ok(candidates.some((c) => c.id === id), `${slug}/measurements.json`, `measurement for unknown candidate ${id}`);
      }
    }
    if (verdicts) { validateVerdicts(verdicts, candidates, measurements, `${slug}/verdicts.json`, ok, warn); checked++; seen.push(`${slug}/verdicts.json`); }
    if (curator) {
      validateCurator(curator, candidates, verdicts, adversary,
        join(ROOT, 'staging', `${slug}.md`), `${slug}/curator.json`, ok, warn);
      checked++; seen.push(`${slug}/curator.json`);
    }
    // Regeneration pass artifacts, same schemas.
    const regen = join(dir, 'regenerated');
    if (existsSync(regen)) {
      const rc = maybeJson(join(regen, 'candidates.json'));
      const rv = maybeJson(join(regen, 'verdicts.json'));
      if (rc) { validateCandidates(rc, map, `${slug}/regenerated/candidates.json`, ok, warn); checked++; seen.push(`${slug}/regenerated/candidates.json`); }
      if (rv) { validateVerdicts(rv, rc, maybeJson(join(regen, 'measurements.json')), `${slug}/regenerated/verdicts.json`, ok, warn); checked++; seen.push(`${slug}/regenerated/verdicts.json`); }
    }
  }

  console.log(`\nvalidate ${label}: ${checked} artifact(s) checked across ${slugs.length} section dir(s)`);
  for (const s of seen) console.log(`         ✓ present  ${s}`);
  const fails = problems.filter((p) => p.severity !== 'WARN');
  const warns = problems.filter((p) => p.severity === 'WARN');
  if (fails.length) {
    console.log(`\n${fails.length} FAIL — an artifact that does not validate did not happen; re-spawn that agent:`);
    for (const p of fails.slice(0, 60)) console.log(`  ${p.where.padEnd(44)} ${p.msg}`);
    if (fails.length > 60) console.log(`  … and ${fails.length - 60} more`);
  }
  if (warns.length) {
    console.log(`\n${warns.length} WARN — well-formed, worth a human look; does not gate the run:`);
    for (const p of warns.slice(0, 60)) console.log(`  ${p.where.padEnd(44)} ${p.msg}`);
    if (warns.length > 60) console.log(`  … and ${warns.length - 60} more`);
  }
  if (!problems.length) console.log('         no schema failures');
  logLine(label, { stage: 'validate', sections: slugs, checked, fail: fails.length, warn: warns.length, ok: fails.length === 0 });
  console.log('');
  // Exit code is driven by FAIL alone (returned to main), so a warning can never
  // gate a run and a failure can never be lost among warnings.
  problems.failCount = fails.length;
  return problems;
}

// ----------------------------------------------------- stage: assemble (§6)

// staging/*.md → one candidate chapter file, in the chapter's own section order,
// with the headings the parser and checker tier 1 depend on. Writes to
// staging/, never to public/questions/.
function stageAssemble(label) {
  const stagingDir = join(ROOT, 'staging');
  if (!existsSync(stagingDir)) die('no staging/ directory — nothing to assemble');
  const parts = [];
  const included = [];
  const missing = [];
  for (const slug of SECTION_ORDER) {
    const p = join(stagingDir, `${slug}.md`);
    if (!existsSync(p)) { missing.push(slug); continue; }
    let body = readFileSync(p, 'utf8').trim();
    const want = `# ${SECTION_HEADINGS[slug]}`;
    // The heading must be exactly the existing file's. Prepend if the fragment
    // omitted it; never rewrite one that is present and wrong — that is a
    // finding for the report, not something to paper over.
    if (!body.startsWith('# ')) body = `${want}\n\n${body}`;
    const got = body.split('\n')[0].trim();
    if (got !== want) missing.push(`${slug} (heading is "${got}", expected "${want}")`);
    parts.push(body);
    included.push(slug);
  }
  if (!parts.length) die('no staging fragments matched a known section slug');

  const out = `---\nchapter: 1\ntitle: Capabilities\n---\n\n${parts.join('\n\n')}\n`;
  const dest = join(stagingDir, 'ch1-capabilities.md');
  writeFileSync(dest, out);

  const quizzes = parseChapterMarkdown(out);
  const n = quizzes.flatMap((q) => q.questions).filter((q) => q.type === 'mc').length;
  logLine(label, { stage: 'assemble', sections: included, n_mc: n, artifact: dest, ok: true });
  console.log(`assemble ${label}: ${included.length} section(s), ${n} MC questions → ${dest}`);
  console.log(`         parses as ${quizzes.length} quiz block(s): ${quizzes.map((q) => `${q.title} (${q.questions.length})`).join(', ')}`);
  if (missing.length) console.log(`         not included: ${missing.join(', ')}`);
  console.log('         next: node scripts/check-questions.mjs staging/ch1-capabilities.md');
  return dest;
}

// ------------------------------------------------------- stage: report (§5)

// The HANDOFF §5 tables. Reports what is on disk and says "n/a — stage did not
// run" for what is not; it never infers a number it cannot compute.
function stageReport(label) {
  const base = runDir(label);
  if (!existsSync(base)) die(`no run directory: ${base}`);
  const slugs = readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const L = [];
  const p = (s = '') => L.push(s);

  p(`# Run report — ${label}`);
  p('');
  p(`Generated ${new Date().toISOString()} by \`pipeline.mjs report\`. Tables per HANDOFF §5.`);
  p('');

  // Spawn counts per stage, from run.log — the cost proxy, since per-call token
  // and dollar figures are not available to a subagent orchestrator (§8).
  const logPath = join(base, 'run.log');
  if (existsSync(logPath)) {
    const rows = readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
    const byStage = {};
    for (const r of rows) {
      byStage[r.stage] = byStage[r.stage] || { n: 0, fail: 0 };
      byStage[r.stage].n++;
      if (r.ok === false) byStage[r.stage].fail++;
    }
    p('## Spawn / stage counts (cost proxy — per-call cost is unavailable, HANDOFF §8)');
    p('');
    p('| stage | entries | failed |');
    p('|---|---|---|');
    for (const [s, v] of Object.entries(byStage)) p(`| ${s} | ${v.n} | ${v.fail} |`);
    p('');
  }

  for (const slug of slugs) {
    const dir = join(base, slug);
    const map = maybeJson(join(dir, 'concept-map.json'));
    const shards = maybeJson(join(dir, 'shards.json'));
    const candidates = maybeJson(join(dir, 'candidates.json'));
    const measurements = maybeJson(join(dir, 'measurements.json'));
    const dedupe = maybeJson(join(dir, 'dedupe.json'));
    const verdicts = maybeJson(join(dir, 'verdicts.json'));
    const adversary = maybeJson(join(dir, 'adversary.json'));
    const curator = maybeJson(join(dir, 'curator.json'));

    p(`## ${slug}`);
    p('');
    p('| metric | value |');
    p('|---|---|');
    p(`| target N | ${map ? map.target_n : 'n/a — no concept map'} |`);
    p(`| earns_question ideas | ${map ? map.ideas.filter((i) => i.earns_question).length : 'n/a'} |`);
    p(`| shards / pool size | ${shards ? `${shards.shards.length} / ${shards.pool_size}` : 'n/a — shard did not run'} |`);
    p(`| candidates generated | ${candidates ? candidates.length : 'n/a — generate did not run'} |`);
    p(`| dedupe: collapsed (critic calls saved) | ${dedupe ? dedupe.collapsed_count : 'n/a — dedupe did not run'} |`);
    if (measurements) {
      const v = Object.values(measurements);
      const r8 = v.filter((m) => m.len_ratio >= GATES.r8[0] && m.len_ratio <= GATES.r8[1]).length;
      const all = v.filter((m) => m.len_ratio >= GATES.r8[0] && m.len_ratio <= GATES.r8[1]
        && (!(m.correct_is_longest || m.correct_is_shortest) || m.extremum_gap <= GATES.r9Gap)
        && m.max_over_min <= GATES.spread).length;
      p(`| first-draft R8 pass | ${r8}/${v.length} (${fmtPct(r8 / v.length)}) |`);
      p(`| first-draft R8+R9+1.6× pass | ${all}/${v.length} (${fmtPct(all / v.length)}) |`);
      p(`| first-draft R5 matches | ${v.filter((m) => m.r5_matches.length).length} (gate 0) |`);
    } else {
      p('| first-draft R8 pass | n/a — measure did not run |');
    }
    if (verdicts) {
      const split = { pass: 0, rewrite: 0, reject: 0 };
      for (const v of verdicts) split[v.verdict] = (split[v.verdict] || 0) + 1;
      p(`| verdict split pass/rewrite/reject | ${split.pass}/${split.rewrite}/${split.reject} |`);
      const crit = {};
      for (const v of verdicts) for (const c of v.failed_criteria || []) crit[c] = (crit[c] || 0) + 1;
      const top = Object.entries(crit).sort((a, b) => b[1] - a[1]).slice(0, 8);
      p(`| failed-criteria histogram | ${top.length ? top.map(([c, n]) => `${c}:${n}`).join(' · ') : 'none'} |`);
      const prov = verdicts.flatMap((v) => (v.provenance_verified || []).filter((x) => x !== null));
      p(`| provenance_verified false rate (D1) | ${prov.length ? `${prov.filter((x) => x === false).length}/${prov.length}` : 'n/a'} |`);
      const e8 = verdicts.filter((v) => v.explanation_true_standalone === false).length;
      p(`| explanation_true_standalone false (E8) | ${e8}/${verdicts.length} |`);
      const agree = verdicts.filter((v) => v.level === v.level_claimed_by_generator).length;
      p(`| level agreement with generator | ${agree}/${verdicts.length} |`);
      const second = verdicts.filter((v) => v.pass_number === 2 || v.second_pass).length;
      p(`| second critic passes invoked | ${second} |`);
    } else {
      p('| verdict split | n/a — critique did not run |');
    }
    if (adversary) {
      const s = adversary.summary;
      p(`| adversary mean hit | ${fmtPct(s.mean_hit_rate)} |`);
      p(`| adversary mean(hit − 1/k) | ${s.mean_excess_over_chance} (gate ≤0.15 ${s.gate_excess_pass ? 'pass' : 'FAIL'}) |`);
      p(`| adversary 4-option-only rate | ${s.four_option_hit_rate == null ? 'n/a' : fmtPct(s.four_option_hit_rate)} |`);
      p(`| adversary flagged (≥2/3 seeds) | ${s.flagged}/${s.n_questions} |`);
    } else {
      p('| adversary | n/a — adversary did not run |');
    }
    if (curator) {
      p(`| shipped / target | ${curator.shipped_n}/${curator.target_n} |`);
      p(`| distribution | ${JSON.stringify(curator.distribution || {})} |`);
      p(`| uncovered earns_question ideas | ${((curator.coverage || {}).earns_question_uncovered || []).length} |`);
      p(`| siblings banked | ${(curator.siblings || []).length} |`);
      p(`| under-fill reason | ${curator.underfill_reason || 'none'} |`);
    } else {
      p('| curator | n/a — curate did not run |');
    }
    p('');
  }

  // Baseline comparison. Never against QUIZ-PLAN's 60%, which is an API-era
  // figure measured a different way (HANDOFF §8).
  const bl = maybeJson(join(ROOT, 'runs/baseline/adversary.json'));
  p('## Adversary vs baseline');
  p('');
  if (bl) {
    p(`Baseline (current 40-question file, same toolless haiku agent): mean hit **${fmtPct(bl.summary.mean_hit_rate)}**, mean(hit − 1/k) **${bl.summary.mean_excess_over_chance}**, 4-option-only **${bl.summary.four_option_hit_rate == null ? 'n/a' : fmtPct(bl.summary.four_option_hit_rate)}**, flagged ${bl.summary.flagged}/${bl.summary.n_questions}.`);
    p('');
    p("QUIZ-PLAN's \"≥60%\" is an API-era figure measured a different way and is **not** a valid comparator.");
  } else {
    p('No `runs/baseline/adversary.json` — run the baseline before comparing anything.');
  }
  p('');

  const dest = join(base, 'report-tables.md');
  writeFileSync(dest, `${L.join('\n')}\n`);
  console.log(`report   ${label}: → ${dest}`);
  console.log(L.join('\n'));
  return dest;
}

// ------------------------------------------------------------------ selftest

// Runs all nine stages against synthetic fixtures in a temp run label, proving
// each stage is runnable in isolation and that validate actually catches the
// failures it claims to. The fixtures are deliberately minimal and are NOT
// questions — no fixture text ever reaches staging/ or public/questions/.
function selftest() {
  const label = '_selftest';
  const slug = 'forecasting-timelines';
  // Start from nothing. The suite writes a curator.json and a candidates/ dir
  // late on, and a leftover copy of either is picked up by the EARLIER
  // "validate passes on clean artifacts" assertion on the next run — so a stale
  // fixture made a passing suite fail on its second invocation. Self-cleaning
  // makes the suite idempotent, which a test suite has to be.
  rmSync(runDir(label), { recursive: true, force: true });
  const dir = sectionDir(label, slug);
  let bad = 0;
  const check = (cond, what) => { console.log(`  ${cond ? 'ok  ' : 'BAD '} ${what}`); if (!cond) bad++; };

  const mk = (n, stemWords, targets, lens = 'contrast', lvl = 'L3') => ({
    id: `${slug}/sonnet/${n}`,
    targets,
    lens,
    level_claimed: lvl,
    bridge_from: null,
    stem: `${stemWords} which account best explains the observed pattern here?`,
    options: [
      { text: 'A'.repeat(120), key: true, provenance: null, family: null },
      { text: 'B'.repeat(118), key: false, provenance: 'misreads sentence one as claim one', family: 'a' },
      { text: 'C'.repeat(122), key: false, provenance: 'misreads sentence two as claim two', family: 'c' },
      { text: 'D'.repeat(119), key: false, provenance: 'misreads sentence three as claim three', family: 'b' },
    ],
    explanation: 'X'.repeat(400),
    takeaway: null,
    stem_format: STEM_FORMATS[n % STEM_FORMATS.length],
    citation: { section: 'Forecasting Timelines', subheading: 'Training Data' },
    negation: false,
    no_shuffle: false,
    option_count_reason: null,
    load_bearing_figures: [],
    self_check: { cover_test: 'yes, because the contrast is in the prose', cynic_test: 'a skipper picks the longest; lengths are level' },
  });

  const conceptMap = {
    section: slug,
    heading: 'Forecasting Timelines',
    target_n: 4,
    takeaway: 'Forecasts are consistency checks, not predictions.',
    subheadings: ['Training Data', 'Effective Compute'],
    threshold_concepts: ['FT-1'],
    ideas: [
      { id: 'FT-1', label: 'effective compute is a product of independent factors', subheading: 'Effective Compute', anchor: 'three factors multiply', criteria_met: [1, 3, 4, 5], earns_question: true, attempts: 3, threshold: true, durable: true, suggested_levels: ['L4', 'L5'], pairs_with: ['FT-2'], misconceptions: [{ family: 'b', claim: 'one bottleneck stops progress', provenance: 'misreads the multiplication as a sum', source: 'inferred' }], used_later_by: ['takeoff'], disposition: 'question' },
      { id: 'FT-2', label: 'the data wall and its three escape routes', subheading: 'Training Data', anchor: 'three escape routes', criteria_met: [1, 3], earns_question: true, attempts: 3, threshold: false, durable: true, suggested_levels: ['L3'], pairs_with: ['FT-1'], misconceptions: [{ family: 'c', claim: 'running out of text ends scaling', provenance: 'misreads exhaustion as a hard stop', source: 'inferred' }], used_later_by: [], disposition: 'question' },
      { id: 'FT-3', label: 'anchor uncertainty spans twelve orders of magnitude', subheading: 'Effective Compute', anchor: 'twelve orders of magnitude', criteria_met: [3, 4], earns_question: true, attempts: 2, threshold: false, durable: true, suggested_levels: ['L4'], pairs_with: [], misconceptions: [{ family: 'a', claim: 'the range is a prediction', provenance: 'misreads the span as a point estimate', source: 'inferred' }], used_later_by: [], disposition: 'question' },
      { id: 'FT-9', label: 'the 2.3x/year chip production figure', criteria_met: [2], earns_question: false, disposition: 'explanation', reason: 'volatile tracker figure' },
    ],
    discrimination_pairs: [{ a: 'FT-1', b: 'FT-2', conflation: 'readers merge the supply story with the compute story' }],
    volatile: [{ text: '2.3x/year chip production', class: 'V1.3', subheading: 'Effective Compute' }],
    durable_figures: [{ text: 'twelve orders of magnitude', class: 'V2.2', budget_candidate: true }],
    cross_section_links: [],
    assumed_prior: [],
    do_not_test: [{ item: 'Epoch AI as an organisation name', why: 'organisation name, not an idea' }],
    notes_for_generator: ['selftest fixture'],
  };

  console.log('\nPipeline self-test — nine stages on synthetic fixtures\n');
  writeJson(join(dir, 'concept-map.json'), conceptMap);

  // 1. shard
  const sh = stageShard(label, slug);
  check(sh.shards.length > 0, 'shard produced shards');
  // Every (membership, lens) pair distinct is the invariant that holds in
  // general; bare membership cannot be, because 3 ideas at size 3 admit one
  // membership and the fixture asks for 8 attempts.
  check(new Set(sh.shards.map((s) => `${[...s.ideas].sort().join('|')}@${s.lens}`)).size === sh.shards.length,
    'every (membership, lens) pair is distinct');
  check(Object.keys(sh.attempts_unplaced).length === 0,
    `every idea got exactly its attempts (unplaced: ${JSON.stringify(sh.attempts_unplaced)})`);
  check(sh.pool_size === 8, `pool size equals sum(attempts) = 8 (got ${sh.pool_size})`);
  check(sh.shards.some((s) => s.ideas.includes('FT-1') && s.ideas.includes('FT-2')), 'discrimination pair co-occurs in a shard');
  check(uniq(sh.shards.filter((s) => s.ideas.includes('FT-1')).map((s) => s.lens)).length > 1, 'FT-1 attempts span >1 lens');
  check(uniq(sh.shards.filter((s) => s.ideas.includes('FT-1')).map((s) => s.model)).length >= 1, 'FT-1 attempts carry an assigned model');

  // 2. generate (fixture) → dedupe. Two of these are deliberate near-duplicates.
  const cands = [
    mk(1, 'Effective compute combines three factors and', ['FT-1']),
    mk(2, 'Effective compute combines three factors and', ['FT-1']), // duplicate of 1
    mk(3, 'The data wall has escape routes so', ['FT-2'], 'misconception'),
    mk(4, 'Anchor uncertainty spans many orders therefore', ['FT-3'], 'case', 'L4'),
    mk(5, 'Forecasts act as consistency checks meaning', ['FT-1'], 'objection', 'L5'),
  ];
  writeJson(join(dir, 'candidates.json'), cands);
  const dd = stageDedupe(label, slug);
  check(dd.collapsed_count === 1, `dedupe collapsed the one planted duplicate (got ${dd.collapsed_count})`);
  check(dd.survivors === 4, `dedupe kept 4 survivors (got ${dd.survivors})`);
  check(dd.collapsed[0] && dd.collapsed[0].survivor_id && dd.collapsed[0].collapsed_id, 'dedupe recorded lineage both ways');

  // 3. measure
  const ms = stageMeasure(label, slug);
  check(Object.keys(ms).length === 4, 'measure covered survivors only');
  const anyM = Object.values(ms)[0];
  check(anyM.len_ratio > 0.9 && anyM.len_ratio < 1.1, 'measure computed a sane len_ratio');
  check(anyM.citation_anchor_resolves === null || typeof anyM.citation_anchor_resolves === 'boolean', 'citation_anchor_resolves is null or boolean, never undefined');

  // 4. queue
  const q = stageQueue(label, slug);
  check(q.queue.length === 4, 'queue covered every survivor');
  check(q.queue[0].priority === 'threshold', 'queue put a threshold concept first');

  // 5. shuffle
  process.argv = [process.argv[0], process.argv[1], 'shuffle', '--seeds', '3'];
  const shf = stageShuffle(label, slug);
  check(shf.n_prompts === 12, `shuffle produced 4×3 prompts (got ${shf.n_prompts})`);
  check(shf.prompts[0].prompt.includes('single letter') && shf.prompts[0].prompt.includes('A. '), 'adversary prompt carries the verbatim preamble and lettered options');
  check(!shf.prompts[0].prompt.includes('Explanation') && !shf.prompts[0].prompt.includes('misreads'), 'adversary prompt leaks no explanation or provenance');
  const twoSeeds = shf.prompts.filter((x) => x.id === shf.prompts[0].id).slice(0, 2);
  check(twoSeeds[0].prompt !== twoSeeds[1].prompt, 'two seeds give different option orders');
  const again = shuffled(cands[0].options, `${cands[0].id}#1`).map((o) => o.text[0]).join('');
  check(again === shuffled(cands[0].options, `${cands[0].id}#1`).map((o) => o.text[0]).join(''), 'seeded shuffle is reproducible');

  // 6. score
  const picks = {};
  for (const pr of shf.prompts) picks[`${pr.id}#${pr.seed}`] = pr.seed === 1 ? pr.key_letter : 'A';
  writeJson(join(dir, 'picks.json'), picks);
  const sc = stageScore(label, slug);
  check(sc.summary.n_answers === 12, 'score read every pick');
  check(sc.per_question.every((x) => x.seeds === 3), 'score grouped 3 seeds per question');
  check(typeof sc.summary.mean_excess_over_chance === 'number', 'score reported excess over per-question chance');

  // 7. validate — clean artifacts first
  process.argv = [process.argv[0], process.argv[1], 'validate'];
  const goodVerdicts = cands.slice(0, 4).map((c) => ({
    id: c.id, verdict: 'pass', level: 'L3', level_claimed_by_generator: c.level_claimed,
    failed_criteria: [], measurements: ms[c.id], provenance_verified: [null, true, true, true],
    families_present: ['a', 'b', 'c'], explanation_true_standalone: true, answerable_from_text_alone: false,
    reasons: [], preserve: 'the stem', rewrite: null, rewrite_changed: [], reviewer_note: 'check the top distractor.',
  })).filter((v) => ms[v.id]);
  writeJson(join(dir, 'verdicts.json'), goodVerdicts);
  let probs = stageValidate(label, slug);
  // FAIL only: WARNs are advisory by design (canonical-form notes, R5), so a
  // clean run is one with nothing blocking, not one with nothing to say.
  check(probs.failCount === 0, `validate passes on clean artifacts (got ${probs.failCount} FAIL, ${probs.length - probs.failCount} WARN)`);

  // 8. validate — must CATCH each planted defect. A validator that never fires
  //    is worse than none, so each of these is an assertion about validate.
  const planted = [
    ['critic recomputed measurements', () => {
      const v = JSON.parse(JSON.stringify(goodVerdicts));
      v[0].measurements.len_ratio = 9.99;
      writeJson(join(dir, 'verdicts.json'), v);
    }, /recomputed/],
    ['failed_criteria non-empty on a pass', () => {
      const v = JSON.parse(JSON.stringify(goodVerdicts));
      v[0].failed_criteria = ['R8']; v[0].reasons = ['R8: ratio out of band.'];
      writeJson(join(dir, 'verdicts.json'), v);
    }, /must be empty iff pass/],
    ['rewrite with empty preserve', () => {
      const v = JSON.parse(JSON.stringify(goodVerdicts));
      v[0].verdict = 'rewrite'; v[0].failed_criteria = ['R8']; v[0].reasons = ['R8: ratio out of band.'];
      v[0].rewrite = mk(1, 'Rewritten stem about effective compute and', ['FT-1']);
      v[0].rewrite_changed = ['options[1]']; v[0].preserve = '';
      writeJson(join(dir, 'verdicts.json'), v);
    }, /empty preserve/],
    ['rewrite that changed targets', () => {
      const v = JSON.parse(JSON.stringify(goodVerdicts));
      v[0].verdict = 'rewrite'; v[0].failed_criteria = ['D3']; v[0].reasons = ['D3: straw distractor.'];
      v[0].rewrite = mk(1, 'Rewritten stem about the data wall and', ['FT-2']);
      v[0].rewrite_changed = ['options[1]']; v[0].preserve = 'the stem';
      writeJson(join(dir, 'verdicts.json'), v);
    }, /new candidate, not a rewrite/],
    ['misconception falsely labelled observed', () => {
      writeJson(join(dir, 'verdicts.json'), goodVerdicts);
      const m = JSON.parse(JSON.stringify(conceptMap));
      m.ideas[0].misconceptions[0].source = 'observed';
      writeJson(join(dir, 'concept-map.json'), m);
    }, /labelled observed but no misconceptions/],
    ['attempts count not matching shard membership', () => {
      writeJson(join(dir, 'concept-map.json'), conceptMap);
      const s = JSON.parse(JSON.stringify(sh));
      s.shards.pop();
      writeJson(join(dir, 'shards.json'), s);
    }, /attempts says/],
    ['candidate with only one distractor family', () => {
      writeJson(join(dir, 'shards.json'), sh);
      const c = JSON.parse(JSON.stringify(cands));
      for (const o of c[0].options) if (!o.key) o.family = 'a';
      writeJson(join(dir, 'candidates.json'), c);
    }, /≥2 distinct distractor families/],
    ['candidate with two keys (R1)', () => {
      const c = JSON.parse(JSON.stringify(cands));
      c[0].options[1].key = true;
      writeJson(join(dir, 'candidates.json'), c);
    }, /R1: 2 keys/],
    ['"according to the chapter" in an option (R5)', () => {
      const c = JSON.parse(JSON.stringify(cands));
      c[0].options[1].text = 'According to the chapter, the factors are added rather than multiplied in practice here.';
      writeJson(join(dir, 'candidates.json'), c);
    }, /according to the/i],
  ];
  for (const [name, plant, want] of planted) {
    plant();
    const pr = stageValidate(label, slug);
    check(pr.some((x) => want.test(x.msg)), `validate catches: ${name}`);
  }
  // Restore clean state.
  writeJson(join(dir, 'candidates.json'), cands);
  writeJson(join(dir, 'concept-map.json'), conceptMap);
  writeJson(join(dir, 'shards.json'), sh);
  writeJson(join(dir, 'verdicts.json'), goodVerdicts);

  // 9. assemble. Skipped if staging/ already holds fragments, because assemble
  //    writes staging/ch1-capabilities.md and a self-test must never clobber a
  //    real curated set.
  const stagingDir = join(ROOT, 'staging');
  const preexisting = existsSync(stagingDir) && readdirSync(stagingDir).some((f) => f.endsWith('.md'));
  if (preexisting) {
    console.log('  skip  assemble — staging/ already holds fragments; not clobbering them');
  } else {
    const frag = join(stagingDir, `${slug}.md`);
    mkdirSync(stagingDir, { recursive: true });
    const c = cands[0];
    writeFileSync(frag, [
      `# ${SECTION_HEADINGS[slug]}`, '', '### Question 1', c.stem, '',
      ...c.options.map((o) => `- [${o.key ? 'x' : ' '}] ${o.text}`), '',
      `**Explanation**: ${c.explanation} (${c.citation.section} → ${c.citation.subheading})`, '',
    ].join('\n'));
    process.argv = [process.argv[0], process.argv[1], 'assemble', '--run', label];
    const asmPath = stageAssemble(label);
    const asm = readFileSync(asmPath, 'utf8');
    check(asm.startsWith('---\nchapter: 1\ntitle: Capabilities\n---'), 'assemble wrote the parser frontmatter');
    check(asm.includes(`# ${SECTION_HEADINGS[slug]}`), 'assemble kept the existing file\'s exact heading');
    const reparsed = parseChapterMarkdown(asm).flatMap((z) => z.questions).filter((x) => x.type === 'mc');
    check(reparsed.length === 1, 'assembled file round-trips through parseChapterMarkdown');
    check(reparsed[0] && reparsed[0].options.filter((o) => o.isCorrect).length === 1, 'assembled question keeps exactly one key');
    rmSync(frag, { force: true });
    rmSync(asmPath, { force: true });
  }

  // report
  process.argv = [process.argv[0], process.argv[1], 'report'];
  const rp = stageReport(label);
  check(existsSync(rp), 'report wrote its tables');
  const rpText = readFileSync(rp, 'utf8');
  check(/Spawn \/ stage counts/.test(rpText), 'report includes the spawn-count cost proxy');
  // Matches both report branches: with a baseline on disk it prints the
  // "**not** a valid comparator" line; without one it says to run the baseline.
  check(/not\*{0,2} a valid comparator|run the baseline/.test(rpText), 'report refuses QUIZ-PLAN\'s 60% as a comparator');

  // ---- merge, render, and the canonical-form guards (added 2026-09-20) ----
  // Each one is asserted to FIRE on a planted defect. A guard that never fires
  // is worse than no guard, which is this project's own standard.
  console.log('\nmerge / render / canonical form');

  const mdir = join(dir, 'candidates');
  mkdirSync(mdir, { recursive: true });
  const twin = mk('01', ['alpha', 'beta', 'gamma', 'delta'], ['FT-1']);
  writeJson(join(mdir, `${slug}-a.json`), [twin, { note: 'allocation note, not a candidate' }]);
  writeJson(join(mdir, `${slug}-b.json`), [twin]);
  const merged = stageMerge(label, slug);
  check(merged.length === 2, 'merge assigns ids from (shard, index) so identical inputs do not collide');
  check(merged[0].id.endsWith('a01') && merged[1].id.endsWith('b01'), 'merge namespaces ids by shard');
  check(readJson(join(dir, 'generator-notes.json')).length === 1, 'merge splits the trailing {note} out of the candidate list');

  // A real collision: two sources that would claim the same (shard, index) slot.
  let collided = false;
  try {
    // Two sources whose shard letter is identical, so both claim slot a01.
    writeJson(join(mdir, `x-a.json`), [twin]);
    writeJson(join(mdir, `y-a.json`), [twin]);
    const saved = process.exit;
    process.exit = () => { throw new Error('die'); };
    try { stageMerge(label, `${slug}`); } finally { process.exit = saved; }
  } catch { collided = true; }
  check(collided, 'merge dies on an id collision rather than dropping a candidate silently');
  rmSync(join(mdir, 'x-a.json'), { force: true });
  rmSync(join(mdir, 'y-a.json'), { force: true });
  writeJson(join(mdir, `${slug}-a.json`), [twin, { note: 'n' }]);
  writeJson(join(mdir, `${slug}-b.json`), [twin]);
  stageMerge(label, slug);

  // render copies text byte-for-byte; that is the whole point of the stage.
  const rcands = readJson(join(dir, 'candidates.json'));
  writeJson(join(dir, 'curator.json'), {
    section: slug, target_n: 1, shipped_n: 1,
    selected: [{ id: rcands[0].id, targets: rcands[0].targets, level: 'L3' }],
    siblings: [], rejected_from_pool: [], flags_for_reviewer: [],
    distribution: { L3: 1 }, coverage: { covered: ['FT-1'], earns_question_uncovered: [] },
    underfill_reason: null,
  });
  // stageRender writes to staging/<slug>.md, which is a REAL path — the first
  // version of this test silently overwrote the live staged section. Snapshot
  // and restore.
  const stagePath = join(ROOT, 'staging', `${slug}.md`);
  const hadStage = existsSync(stagePath) ? readFileSync(stagePath, 'utf8') : null;
  const rendered = readFileSync(stageRender(label, slug), 'utf8');
  check(rendered.includes(rcands[0].stem), 'render copies the stem verbatim from candidates.json');
  check(!/[‘’“”]/.test(rendered), 'render emits canonical straight quotes by default');

  if (hadStage !== null) writeFileSync(stagePath, hadStage, 'utf8');
  else rmSync(stagePath, { force: true });

  // --- the outer-quote normaliser -----------------------------------------
  // A rewriter that touches shipped text has to be shown to decline as often as
  // it acts, so each case below is a separate assertion rather than one pass.
  const cq = (x) => canonicaliseQuotes(x);
  check(cq(`A colleague argues: 'the law is empirical.' Which reply?`).text
      === `A colleague argues: "the law is empirical." Which reply?`,
    'normaliser converts an outer single-quoted span to double quotes');
  check(cq(`chip count is what's doing the work`).changed === false,
    'normaliser leaves an ordinary apostrophe alone');
  check(cq(`He said: 'the so-called "law" is empirical.' Now what?`).text
      === `He said: "the so-called 'law' is empirical." Now what?`,
    'normaliser flips an already-nested double quote to single');
  check(cq(`it's 'fine' really`).text === `it's "fine" really`,
    'normaliser handles an apostrophe and a quoted span in the same string');
  // The body cannot cross the apostrophe in `model's`, so nothing matches and
  // the string is returned untouched. Declining is correct: the lint still
  // reports it and a human decides.
  check(cq(`'the model's view' is odd`).changed === false,
    'normaliser declines an ambiguous span rather than guessing');
  // The invariant that makes it safe: only quote characters may ever change.
  for (const probe of [`A says: 'x' and B says: 'y'.`, `it's 'fine' really`,
    `He said: 'the so-called "law" is empirical.' Now what?`]) {
    const bare = (x) => x.replace(/["']/g, '');
    check(bare(cq(probe).text) === bare(probe),
      `normaliser changes only quote characters (${probe.slice(0, 24)}…)`);
  }
  check(cq(`He said: 'x' now`).text.match(/'/g) === null,
    'a normalised outer span leaves no stray single quote behind');

  // --- render refuses a candidate whose object does not validate -----------
  // The hole a03r walked through: its rewrite carried an invented stem_format,
  // was correctly caught as a FAIL by the verdict validator, and was selected
  // and written to staging regardless, because render only checked that the id
  // existed.
  const goodCands = readJson(join(dir, 'candidates.json'));
  writeJson(join(dir, 'candidates.json'),
    goodCands.map((c, i) => (i === 0 ? { ...c, stem_format: 'scenario-application' } : c)));
  let refused = false;
  try {
    const saved = process.exit;
    process.exit = () => { throw new Error('die'); };
    try { stageRender(label, slug); } finally { process.exit = saved; }
  } catch { refused = true; }
  check(refused, 'render refuses a selected candidate whose schema does not validate');
  writeJson(join(dir, 'candidates.json'), goodCands);
  if (hadStage !== null) writeFileSync(stagePath, hadStage, 'utf8');
  else rmSync(stagePath, { force: true });

  // A reviewer flag whose id resolves to nothing reaches no reviewer. Before
  // 2026-09-20 such a flag produced neither FAIL nor WARN — the silent class.
  const flagProbe = (flagId) => {
    const problems = [];
    const ok = (cond, w, msg) => { if (!cond) problems.push({ where: w, msg, severity: 'FAIL' }); return Boolean(cond); };
    const warn = (cond, w, msg) => { if (!cond) problems.push({ where: w, msg, severity: 'WARN' }); return Boolean(cond); };
    validateCurator(
      {
        section: slug, target_n: 1, shipped_n: 1,
        selected: [{ id: rcands[0].id, targets: rcands[0].targets, level: 'L3' }],
        siblings: [], rejected_from_pool: [],
        flags_for_reviewer: [{ id: flagId, note: 'probe' }],
        distribution: { L3: 1 }, coverage: { covered: [], earns_question_uncovered: [] },
        underfill_reason: null,
      },
      rcands, null, null, null, 'probe', ok, warn,
    );
    return problems.map((x) => x.msg).join(' | ');
  };
  check(/resolves to nothing/.test(flagProbe('forecasting-timelines/sonnet/nope99')),
    'validate warns on a reviewer flag whose id is not a candidate and not a scope');
  check(!/resolves to nothing/.test(flagProbe('section')),
    'validate accepts "section" as a set-level reviewer-flag scope');
  check(!/resolves to nothing/.test(flagProbe(rcands[0].id)),
    'validate accepts a reviewer flag naming a real candidate');

  // --- parseJsonValues: one file, more than one top-level JSON value --------
  // The generator brief's "array, optionally followed by a trailing {note}"
  // has produced BOTH shapes from the same wording. The script accepts either.
  const pv = parseJsonValues('[{"a":1},{"b":2}]');
  check(pv.length === 1 && pv[0].length === 2,
    'parseJsonValues reads a plain array as one value');
  const pv2 = parseJsonValues('[{"a":1}]\n{"note":"why"}\n');
  check(pv2.length === 2 && pv2[1].note === 'why',
    'parseJsonValues reads a note written AFTER the array as a second value');
  check(parseJsonValues(JSON.stringify([{ stem: 'a } b ] c "quoted"' }])).flat()[0].stem
      === 'a } b ] c "quoted"',
    'parseJsonValues does not desynchronise on a brace or bracket inside a string');
  let unbalanced = false;
  try { parseJsonValues('[{"a":1}'); } catch { unbalanced = true; }
  check(unbalanced, 'parseJsonValues throws on an unterminated value rather than returning a partial');

  // --- merge must not no-op quietly ----------------------------------------
  // Observed 2026-09-20: an empty candidates dir printed "0 candidate(s)" and
  // exited 0, after which measure and shuffle also reported 0 and the run
  // looked like it had happened.
  const emptyLabel = '_selftest-empty';
  mkdirSync(join(runDir(emptyLabel), 'sec', 'candidates'), { recursive: true });
  let diedEmpty = false;
  try {
    const saved = process.exit;
    process.exit = () => { throw new Error('die'); };
    try { stageMerge(emptyLabel, 'sec'); } finally { process.exit = saved; }
  } catch { diedEmpty = true; }
  check(diedEmpty, 'merge dies on an empty candidate pool rather than reporting 0 and exiting clean');
  rmSync(runDir(emptyLabel), { recursive: true, force: true });

  // --- spawn-prompt templates ----------------------------------------------
  // One source of truth per spawn. Each assertion below plants the specific
  // failure the template system exists to stop.
  const dies = (fn) => {
    const saved = process.exit;
    process.exit = () => { throw new Error('die'); };
    try { fn(); return false; } catch { return true; } finally { process.exit = saved; }
  };
  const throwsPrompt = (fn) => { try { fn(); return false; } catch (e) { return e instanceof PromptError; } };
  const AUTO_KEYS = ['workdir', ...Object.keys(PROMPT_AUTO)];

  const badTemplates = listTemplates().filter((n) => lintTemplate(loadTemplate(n), AUTO_KEYS).length);
  check(badTemplates.length === 0,
    `every prompts/*.md declares exactly the placeholders it uses${badTemplates.length ? ` (bad: ${badTemplates.join(', ')})` : ''}`);

  const tdir = join(runDir(label), 'prompts-fixture');
  mkdirSync(join(tdir, '_partials'), { recursive: true });
  writeFileSync(join(tdir, 't.md'), '---\nplaceholders: [a]\noptional: [b]\n---\nA={{a}} B={{?b}}\n');
  writeFileSync(join(tdir, 'inc.md'), '---\nplaceholders: [a]\noptional: []\n---\n{{> part}}\n');
  writeFileSync(join(tdir, '_partials', 'part.md'), 'part says {{a}}');
  writeFileSync(join(tdir, 'nested.md'), '---\nplaceholders: []\noptional: []\n---\n{{> nest}}\n');
  writeFileSync(join(tdir, '_partials', 'nest.md'), '{{> part}}');
  writeFileSync(join(tdir, 'undeclared.md'), '---\nplaceholders: []\noptional: []\n---\n{{ghost}}\n');
  writeFileSync(join(tdir, 'unused.md'), '---\nplaceholders: [ghost]\noptional: []\n---\nnothing here\n');

  check(throwsPrompt(() => renderTemplate('t', {}, {}, tdir)),
    'render refuses a prompt with a required placeholder unfilled');
  check(throwsPrompt(() => renderTemplate('t', { a: '   ' }, {}, tdir)),
    'render treats a whitespace-only required value as unfilled');
  check(throwsPrompt(() => renderTemplate('t', { a: 'x', typo: 'y' }, {}, tdir)),
    'render refuses an undeclared variable, so a typo cannot silently drop content');
  check(renderTemplate('t', { a: 'x' }, {}, tdir).trim() === 'A=x B=',
    'an optional placeholder renders empty when not supplied');
  check(renderTemplate('t', { a: '{{b}}' }, {}, tdir).includes('A={{b}}'),
    'a value containing "{{" is inserted literally and never re-read as a placeholder');
  check(renderTemplate('inc', { a: 'z' }, {}, tdir).trim() === 'part says z',
    'a template can include a shared partial');
  check(throwsPrompt(() => loadTemplate('nested', tdir)),
    'a partial may not include another partial');
  check(lintTemplate(loadTemplate('undeclared', tdir)).length > 0,
    'lint catches a placeholder used but not declared');
  check(lintTemplate(loadTemplate('unused', tdir)).length > 0,
    'lint catches a placeholder declared but never used');
  rmSync(tdir, { recursive: true, force: true });

  const shTpl = readJson(join(dir, 'shuffle.json'));
  const sample = rcands.find((c) => c.id === shTpl.prompts[0].id) || rcands[0];
  check(shTpl.prompts[0].prompt.startsWith(render('adversary-mc', { stem: sample.stem, options: 'A. x' }).split('\n\n')[0]),
    'shuffle builds the adversary prompt from prompts/adversary-mc.md, not from an inline constant');
  check(render('critique', {
    section: 's', candidate_input: 'c', concept_map: 'm', prose: 'p', out: 'o',
  }).includes(STEM_FORMATS.map((x) => `\`${x}\``).join(', ')),
  'the critic prompt\'s stem_format list is filled from the constant validate enforces');

  // --- ablate / ablate-score -------------------------------------------------
  const abl = stageAblate(label, slug, { seeds: 2, rungs: 'full,options-only', force: true });
  const optBlock = (t) => t.split('\n').filter((l) => /^[A-H]\. /.test(l)).join('\n');
  const adRoot = abl.dir;
  const fullE = abl.entries.filter((e) => e.rung === 'full');
  const parity = fullE.every((e) => {
    const o = abl.entries.find((x) => x.rung === 'options-only' && x.id === e.id && x.seed === e.seed);
    return o && o.key_letter === e.key_letter
      && optBlock(readFileSync(join(adRoot, `${e.file}.txt`), 'utf8')) === optBlock(readFileSync(join(adRoot, `${o.file}.txt`), 'utf8'));
  });
  check(parity, 'ablate shows every rung the SAME option order for the same id#seed');
  const leaked = abl.entries.filter((e) => e.rung === 'options-only').some((e) => {
    const c = rcands.find((x) => x.id === e.id);
    return readFileSync(join(adRoot, `${e.file}.txt`), 'utf8').includes(c.stem);
  });
  check(!leaked, 'the options-only rung never contains the stem');
  check(abl.entries.length === rcands.filter((c) => c.stem).length * 2 * 2,
    'ablate writes one prompt per candidate × seed × rung');
  check(dies(() => stageAblate(label, slug, { ids: 'no/such/id', force: true })),
    'ablate dies on an id that is not in candidates.json');

  // Score with a planted, fully known answer pattern: every full-rung pick
  // correct, every options-only pick wrong.
  const wrongOf = (e) => (e.key_letter === 'A' ? 'B' : 'A');
  const ablPicks = Object.fromEntries(abl.entries.map((e) => [e.file, e.rung === 'full' ? e.key_letter : wrongOf(e)]));
  writeJson(join(adRoot, 'picks.json'), ablPicks);
  const lad = stageAblateScore(label, slug);
  check(lad.rungs.full.hit_rate === 1 && lad.rungs['options-only'].hit_rate === 0,
    'ablate-score reproduces a planted ladder exactly (full 100%, options-only 0%)');
  check(lad.rungs.full.ci_question_unit && lad.rungs.full.ci_question_unit.n === rcands.filter((c) => c.stem).length,
    'ablate-score computes its interval with the QUESTION as the unit, not the trial');
  check(dies(() => stageAblate(label, slug, { seeds: 1 })),
    'ablate refuses to rebuild a manifest whose picks have already been recorded');

  const holed = { ...ablPicks };
  delete holed[abl.entries[0].file];
  writeJson(join(adRoot, 'picks.json'), holed);
  check(dies(() => stageAblateScore(label, slug)),
    'ablate-score refuses to score a ladder with a missing pick');
  writeJson(join(adRoot, 'picks.json'), { ...ablPicks, 'full/99': 'A' });
  check(dies(() => stageAblateScore(label, slug)),
    'ablate-score refuses a pick for a file that is not in the manifest');
  writeJson(join(adRoot, 'picks.json'), { ...ablPicks, [abl.entries[0].file]: 'I think it is probably B' });
  const lad2 = stageAblateScore(label, slug);
  check(lad2.rungs.full.unparsed === 1 && lad2.rungs['options-only'].unparsed === 0,
    'a reply that is not a single letter is counted as a miss and reported, never dropped');
  rmSync(adRoot, { recursive: true, force: true });

  // --- voices and the explain rungs ------------------------------------------
  {
    const codes = tellCodes();
    check(codes.length >= 10 && codes.includes('other') && codes.includes('no-tell') && uniq(codes).length === codes.length,
      'the cue codes are read from the partial every voice is shown, and include other and no-tell');
    const ex = stageAblate(label, slug, { seeds: 3, rungs: 'full,options-only,full-explain,options-only-explain', explainSeeds: 2, claudeSeeds: 1, claudeExplainSeeds: 1, force: true });
    const nq = rcands.filter((c) => c.stem).length;
    const nNeg = rcands.filter((c) => c.stem && isNegationStem(c)).length;
    check(ex.entries.filter((e) => e.rung === 'full-explain').length === nq * 2,
      'explain rungs use --explain-seeds, not --seeds');
    check(ex.entries.filter((e) => e.rung === 'options-only-explain').length === (nq - nNeg) * 2,
      'the options-only explain rung excludes negation stems like its letter rung');
    check(ex.entries.filter((e) => e.rung === 'full' && e.claude).length === nq
      && ex.entries.filter((e) => e.rung === 'full-explain' && e.claude).length === nq,
    'only the first --claude-seeds / --claude-explain-seeds prompts are assigned to the Claude subagent');
    const tpl = readJson(join(ex.dir, 'picks.template.json'));
    check(Object.keys(tpl).every((f) => !f.includes('explain')) && Object.keys(tpl).length === ex.entries.filter((e) => e.claude && !isExplainRung(e.rung)).length,
      'picks.template.json lists only the Claude subagent\'s letter prompts');
    const exLeak = ex.entries.filter((e) => e.rung === 'options-only-explain').some((e) => readFileSync(join(ex.dir, `${e.file}.txt`), 'utf8').includes(rcands.find((c) => c.id === e.id).stem));
    check(!exLeak, 'the options-only explain rung never contains the stem');
    const fe = ex.entries.find((e) => e.rung === 'full-explain');
    const ff = ex.entries.find((e) => e.rung === 'full' && e.id === fe.id && e.seed === fe.seed);
    check(optBlock(readFileSync(join(ex.dir, `${fe.file}.txt`), 'utf8')) === optBlock(readFileSync(join(ex.dir, `${ff.file}.txt`), 'utf8')),
      'an explain prompt shows the same option order as the letter prompt for the same id#seed');

    // parseExplainReply: parses, never repairs.
    const e4 = { option_count: 4, key_letter: 'B' };
    const good = { options: { A: { p: 10, codes: ['absolute'], note: '' }, B: { p: 70, codes: ['most-detailed'], note: '' }, C: { p: 10, codes: ['other'], note: 'odd' }, D: { p: 10, codes: ['no-tell'], note: '' } }, pick: 'B', strategy: 's' };
    const pg = parseExplainReply(JSON.stringify(good), e4, codes);
    check(pg.ok && pg.problems.length === 0 && pg.pick === 'B', 'a well-formed explain reply parses with no problems');
    check(parseExplainReply(`\`\`\`json\n${JSON.stringify(good)}\n\`\`\``, e4, codes).problems.includes('fenced'),
      'a fenced reply is unwrapped and the fence is recorded');
    const badCode = parseExplainReply(JSON.stringify({ ...good, options: { ...good.options, A: { p: 10, codes: ['made-up'], note: '' } } }), e4, codes);
    check(badCode.ok && badCode.problems.some((p) => p.startsWith('invalid-code')) && badCode.options.A.codes.length === 0,
      'an unknown code is recorded and dropped, never coerced to a known one');
    check(parseExplainReply(JSON.stringify({ ...good, options: { ...good.options, C: { p: 10, codes: ['other'], note: '' } } }), e4, codes).problems.includes('other-without-note'),
      '`other` without a note is flagged');
    const three = { ...good, options: { A: good.options.A, B: good.options.B, C: good.options.C } };
    check(!parseExplainReply(JSON.stringify(three), e4, codes).ok, 'a reply missing an option letter is unusable, not guessed at');
    check(!parseExplainReply('I think B.', e4, codes).ok, 'a prose reply is unusable');
    const withD = (d) => parseExplainReply(JSON.stringify({ ...good, options: { ...good.options, D: d } }), e4, codes);
    check(withD({ p: 10, codes: [], note: '' }).options.D.rated === false && withD({ p: 10, note: '' }).options.D.rated === false
      && withD({ p: 10, codes: 'absolute', note: '' }).options.D.rated === false && withD({ p: 10, codes: ['made-up'], note: '' }).options.D.rated === false,
    'an option with empty, missing, non-list or all-unknown codes is unrated, not "rated with no cue"');
    check(withD({ p: 10, codes: ['no-tell', 'absolute'], note: '' }).problems.includes('no-tell-with-codes') && withD({ p: 10, codes: ['no-tell', 'absolute'], note: '' }).options.D.rated === false,
      'no-tell mixed with other codes is flagged and unrated');

    // Planted voice replies: a letter voice that always hits `full` and never
    // `options-only`, one failed call that must not count, and explain replies
    // that always tag the key most-detailed and a distractor absolute.
    const vd = join(ex.dir, 'voices');
    const wrong = (e) => (e.key_letter === 'A' ? 'B' : 'A');
    const letterEntries = ex.entries.filter((e) => !isExplainRung(e.rung));
    letterEntries.forEach((e, i) => {
      const rec = i === 0 ? { status: 'error', error: 'planted' } : { status: 'ok', reply_text: e.rung === 'full' ? e.key_letter : wrong(e) };
      writeJson(join(vd, 'fake-voice', `${e.file}.json`), rec);
    });
    writeJson(join(vd, 'fake-voice', 'voice.json'), { id: 'fake-voice', provider: 'x', model: 'x', family: 'x' });
    for (const e of ex.entries.filter((x) => isExplainRung(x.rung))) {
      const opts = {};
      for (let i = 0; i < e.option_count; i += 1) {
        const L = String.fromCharCode(65 + i);
        opts[L] = { p: L === e.key_letter ? 100 : 0, codes: L === e.key_letter ? ['most-detailed', 'echoes-stem'] : ['absolute'], note: '' };
      }
      writeJson(join(vd, 'fake-voice', `${e.file}.json`), { status: 'ok', reply_text: JSON.stringify({ options: opts, pick: e.key_letter, strategy: 'planted' }) });
    }
    writeJson(join(ex.dir, 'picks.json'), Object.fromEntries(Object.keys(tpl).map((f) => [f, 'A'])));
    const lv = stageAblateScore(label, slug);
    const fv = lv.voices?.['fake-voice']?.rungs;
    check(fv && fv.full.hit_rate === 1 && fv['options-only'].hit_rate === 0,
      'ablate-score reproduces a planted voice ladder exactly');
    check(fv && fv[letterEntries[0].rung].trials === letterEntries.filter((e) => e.rung === letterEntries[0].rung).length - 1,
      'a failed API call is not answered, and is neither a hit nor a miss');
    check(lv.panel?.full && lv.panel.full.voices.includes(CLAUDE_VOICE) && lv.panel.full.voices.includes('fake-voice'),
      'the panel pools the Claude subagent with the API voices');
    const tj = readJson(join(ex.dir, 'tells.json'));
    const md = tj.code_table['full-explain'].codes['most-detailed'];
    check(md && md.rate_key === 1 && md.on_distractors === 0 && tj.code_table['full-explain'].codes.absolute.on_key === 0,
      'the explain analysis attributes planted cue codes to keys and distractors exactly');
    check(tj.summary.impossible_stem_echo_tags === ex.entries.filter((e) => e.rung === 'options-only-explain').length,
      'a stem-echo claim on the options-only rung is counted as impossible');
    check(md.cue_follow && md.cue_follow.toward === 1 && md.cue_follow.away === 0,
      'cue-follow: a code planted on every key gives a follower 100%, an avoider 0%');
    check(md.rate_on_picked === 1 && md.rate_on_not_picked === 0,
      'the pick-conditioned rates see a code that always sits on the picked option');
    check(tj.per_voice['fake-voice'].rungs['full-explain'].letter_agreement?.rate != null,
      'explain picks are compared with the same voice\'s letter picks on the same question and order');

    // A second voice of the SAME family must not count as a second family.
    for (const e of letterEntries) writeJson(join(vd, 'fake-twin', `${e.file}.json`), { status: 'ok', reply_text: wrong(e) });
    writeJson(join(vd, 'fake-twin', 'voice.json'), { id: 'fake-twin', provider: 'x', model: 'y', family: 'x' });
    const lf = stageAblateScore(label, slug);
    check(Object.keys(lf.families.full).length === 2 && lf.families.full.x.voices.length === 2 && lf.families.full.x.rate === 0.5,
      'voices of one family are averaged into one family rate, not counted as two families');
    check(lf.panel.full.families === 2 && lf.panel.full.complete_questions > 0,
      'the panel headline is over families and complete-case questions');

    // A truncated API reply is not answered; an unparseable one is reported and left out of its rate.
    writeJson(join(vd, 'fake-twin', `${letterEntries[1].file}.json`), { status: 'truncated', reply_text: 'The answer is' });
    writeJson(join(vd, 'fake-twin', `${letterEntries[2].file}.json`), { status: 'ok', reply_text: 'Probably the second one' });
    const lt = stageAblateScore(label, slug);
    const twinFull = lt.voices['fake-twin'].rungs[letterEntries[2].rung];
    check(twinFull.unparsed === 1 && twinFull.unparsed_excluded === 1 && lt.voices['fake-twin'].statuses.truncated === 1,
      'an API voice\'s unparseable reply is reported and left out of its rate; a truncated one is not answered');

    // Replies answer a specific prompt text: a rebuilt prompt under them is refused.
    writeJson(join(vd, 'fake-twin', `${letterEntries[3].file}.json`), { status: 'ok', reply_text: 'A', prompt_sha256: 'not-the-hash' });
    check(dies(() => stageAblateScore(label, slug)), 'ablate-score refuses a reply whose recorded prompt hash does not match the prompt file');
    rmSync(join(vd, 'fake-twin'), { recursive: true, force: true });

    rmSync(join(ex.dir, 'picks.json'));
    check(dies(() => stageAblate(label, slug, { seeds: 1 })),
      'ablate refuses to rebuild over recorded voice replies even when there is no picks.json');
    rmSync(ex.dir, { recursive: true, force: true });
  }

  // --- renderer hardening (review 2026-09-23 #13) -----------------------------
  {
    const td = join(runDir(label), 'prompts-fixture-2');
    mkdirSync(join(td, '_partials'), { recursive: true });
    writeFileSync(join(td, 'spaced.md'), '---\nplaceholders: []\noptional: []\n---\nhello {{ stem }}\n');
    writeFileSync(join(td, 'autodecl.md'), '---\nplaceholders: [workdir]\noptional: []\n---\n{{workdir}}\n');
    writeFileSync(join(td, 'bom.md'), '﻿---\nplaceholders: []\noptional: []\n---\nbody only\n');
    writeFileSync(join(td, 'gaps.md'), '---\nplaceholders: [v]\noptional: [o]\n---\nA\n\n{{?o}}\n\nB {{v}}\n');
    writeFileSync(join(td, 'badpath.md'), '---\nplaceholders: []\noptional: []\npaths: [nope]\n---\nx\n');
    check(lintTemplate(loadTemplate('spaced', td)).some((x) => /malformed/.test(x)),
      'lint catches a malformed token like "{{ stem }}" that would otherwise be sent literally');
    check(lintTemplate(loadTemplate('autodecl', td), ['workdir']).some((x) => /auto-filled/.test(x)),
      'lint refuses a template that declares an auto-filled key, so --set cannot override it');
    check(renderTemplate('bom', {}, {}, td).trim() === 'body only',
      'a byte-order mark does not stop front matter being stripped');
    check(renderTemplate('gaps', { v: 'x\n\n\n\ny' }, {}, td) === 'A\n\nB x\n\n\n\ny\n',
      'an empty optional line is dropped, and a value\'s own blank lines are never collapsed');
    check(lintTemplate(loadTemplate('badpath', td)).some((x) => /paths/.test(x)),
      'lint catches a paths: entry that names an undeclared placeholder');
    rmSync(td, { recursive: true, force: true });

    // Render every real template with dummy values: a broken include or a
    // mis-declared placeholder in a rarely used template fails here, not mid-run.
    const renderFails = listTemplates().filter((n) => {
      const t = loadTemplate(n);
      const vars = Object.fromEntries([...t.placeholders, ...t.optional].map((k) => [k, `<${k}>`]));
      try { renderTemplate(n, vars, { workdir: ROOT, ...PROMPT_AUTO }); return false; } catch { return true; }
    });
    check(renderFails.length === 0, `every prompts/*.md renders with its declared placeholders${renderFails.length ? ` (failed: ${renderFails.join(', ')})` : ''}`);
  }

  // --- prompt: derivation, recording, refusals (review #4, #5) ------------------
  {
    const q = { quiet: true };
    const g = stagePrompt(label, slug, { ...q, template: 'generate-section', model: 'sonnet', letter: 'q', set: ['n=8'] });
    check(g.vars.id_prefix === `${slug}/sonnet` && g.vars.out === `runs/${label}/${slug}/candidates/${slug}-q.json`,
      'prompt derives id_prefix and out from --model and --letter, in the shape merge reads back');
    check(!!g.recorded && existsSync(join(ROOT, g.recorded)), 'every rendered prompt is written to disk');
    const logged = readFileSync(join(runDir(label), 'run.log'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((l) => l.stage === 'prompt');
    check(logged.length > 0 && logged.at(-1).template_sha256 && logged.at(-1).text_sha256,
      'every rendered prompt is logged with the template\'s and the text\'s sha256');
    check(dies(() => stagePrompt(label, slug, { ...q, template: 'generate-section', model: 'sonnet', letter: 'q', set: ['n=8', 'out=runs/x/y.json'] })),
      'prompt refuses to let a derived value be set by hand without --override');
    check(!dies(() => stagePrompt(label, slug, { ...q, template: 'generate-section', model: 'sonnet', letter: 'q', override: true, set: ['n=8', `out=runs/${label}/elsewhere.json`] })),
      'with --override a derived value can be replaced (and the override is logged)');
    check(dies(() => stagePrompt(label, slug, { ...q, template: 'generate-section', model: 'sonnet', letter: 'q', set: [`n=${2 * STEM_FORMATS.length + 1}`] })),
      'prompt refuses a generate-section n that 2-per-stem-format makes unsatisfiable');
    check(dies(() => stagePrompt(label, slug, { ...q, template: 'bench-rewrite-stem', set: ['passage=no/such/file.md', `candidates=runs/${label}/${slug}/candidates.json`, 'ids=a', `out=runs/${label}/o.json`] })),
      'prompt refuses an input path that does not exist');
    check(dies(() => stagePrompt(label, slug, { ...q, template: 'bench-rewrite-stem', set: [`passage=runs/${label}/${slug}/candidates.json`, `candidates=runs/${label}/${slug}/candidates.json`, 'ids=a', 'out=/tmp/escape.json'] })),
      'prompt refuses an output outside runs/, bench/, reviews/ or staging/');
  }

  // --- rung parity, exclusions, sighted, recall (review #6, #7) -----------------
  {
    const exLabel = '_selftest-rungs';
    const exSlug = 'sec';
    const neg = { ...rcands[0], id: 'sec/sonnet/n01', stem: 'Which of these is NOT a reason given?', negation: true };
    const plain = { ...rcands[0], id: 'sec/sonnet/p01', stem: 'A director swaps two performers between roles. What changes?' };
    const listy = { ...rcands[0], id: 'sec/sonnet/l01', stem: 'Which of the following best explains the result?' };
    writeJson(join(sectionDir(exLabel, exSlug), 'candidates.json'), [neg, plain, listy]);
    const passageFile = join(sectionDir(exLabel, exSlug), 'passage.md');
    writeFileSync(passageFile, 'A passage.\n');
    const ab = stageAblate(exLabel, exSlug, { seeds: 1, rungs: 'full,options-only,sighted,stem-only', force: true, passage: rel(passageFile) });
    const fileOf = (rung, id) => ab.entries.find((e) => e.rung === rung && e.id === id);
    const txt = (e) => readFileSync(join(ab.dir, `${e.file}.txt`), 'utf8');
    const f = fileOf('full', plain.id);
    const o = fileOf('options-only', plain.id);
    check(txt(o) === txt(f).replace(plain.stem, fillPartial('stem-withheld')),
      'the options-only prompt is the full prompt with ONLY the stem slot replaced, byte for byte');
    check(!fileOf('options-only', neg.id) && ab.excluded.some((x) => x.id === neg.id && x.rung === 'options-only'),
      'a negation stem is excluded from options-only, and the exclusion is listed');
    check(!fileOf('stem-only', listy.id) && !fileOf('stem-only', neg.id) && !!fileOf('stem-only', plain.id),
      'stems that are ill-posed without options are excluded from stem-only');
    check(fileOf('stem-only', plain.id).agent === 'quiz-recall' && fileOf('sighted', plain.id).agent === 'general-purpose' && f.agent === 'quiz-adversary',
      'the manifest names the agent each rung must be answered by');
    check(txt(fileOf('sighted', plain.id)).includes(rel(passageFile)),
      'the sighted rung points its reader at the passage');
    check(dies(() => stageAblate(exLabel, exSlug, { seeds: 1, rungs: 'sighted', force: true })),
      'the sighted rung refuses to run without --passage');

    const pk = {};
    for (const e of ab.entries) pk[e.file] = e.rung === 'stem-only' ? 'refusal' : e.key_letter;
    writeJson(join(ab.dir, 'picks.json'), pk);
    const lad = stageAblateScore(exLabel, exSlug);
    check(lad.rungs['stem-only'].refusals === 1 && lad.rungs['stem-only'].knows_rate === null,
      'a recall refusal sits outside the denominator rather than counting as ignorance');
    check(lad.rungs.sighted.hit_rate === 1 && lad.rungs.full.unparsed === 0,
      'ablate-score reports every lettered rung, with its unparsed count');
    check(lad.preregistered === false, 'ablate-score reports when no pre-registration preceded the ablation');
    rmSync(runDir(exLabel), { recursive: true, force: true });

    const pl = '_selftest-prereg';
    const pre = join(runDir(pl), 'pre.md');
    mkdirSync(runDir(pl), { recursive: true });
    writeFileSync(pre, 'prediction: nothing changes\n');
    stagePreregister(pl, { file: rel(pre) });
    writeJson(join(sectionDir(pl, 's'), 'candidates.json'), [plain]);
    const ab2 = stageAblate(pl, 's', { seeds: 1, rungs: 'full', force: true });
    writeJson(join(ab2.dir, 'picks.json'), Object.fromEntries(ab2.entries.map((e) => [e.file, e.key_letter])));
    check(stageAblateScore(pl, 's').preregistered === true, 'a pre-registration logged before the ablation is recognised');
    rmSync(runDir(pl), { recursive: true, force: true });
  }

  // --- arm: apply a manipulation and prove what it held (review #1, #3) ---------
  {
    const src = '_selftest-armsrc';
    const base = { ...rcands[0], id: 'a/sonnet/x01', stem: 'What does the index measure?' };
    const keyIdx = base.options.findIndex((o) => o.key);
    writeJson(join(sectionDir(src, 's'), 'candidates.json'), [base]);
    const pas = join(runDir(src), 'passage.md');
    writeFileSync(pas, 'The index is a rate. It says nothing about how often correction was needed. Load is a count.\n');
    const good = [{ id: base.id, options: base.options.map((op, i) => (i === keyIdx ? { ...op } : {
      text: `Rewritten wrong option ${i}`, key: false, family: 'a',
      provenance: 'misreads "It says nothing about how often correction was needed" as a claim about load',
      rules_out: 'The index is a rate.',
    })) }];
    const rw = join(runDir(src), 'rw.json');
    const armLabel = '_selftest-arm';
    writeJson(rw, good);
    const res = stageArm(armLabel, { from: `${src}/s`, rewrite: rel(rw), kind: 'distractors', passage: rel(pas) });
    check(res.arm[0].options[keyIdx].text === base.options[keyIdx].text && res.arm[0].stem === base.stem,
      'arm keeps the stem and the key byte-identical, in the key\'s original slot');
    check(JSON.stringify(readJson(join(sectionDir(armLabel, 'control'), 'candidates.json'))[0]) === JSON.stringify(base),
      'arm writes an unmodified control of the same ids to compare against');
    const moved = JSON.parse(JSON.stringify(good));
    const other = keyIdx === 0 ? 1 : 0;
    [moved[0].options[keyIdx], moved[0].options[other]] = [moved[0].options[other], moved[0].options[keyIdx]];
    writeJson(rw, moved);
    check(dies(() => stageArm(armLabel, { from: `${src}/s`, rewrite: rel(rw), kind: 'distractors', passage: rel(pas) })),
      'arm dies if the key has moved slot, which would un-control its letter position');
    const badQuote = JSON.parse(JSON.stringify(good));
    badQuote[0].options[other].provenance = 'misreads "a sentence that is not in the passage" as something';
    writeJson(rw, badQuote);
    check(dies(() => stageArm(armLabel, { from: `${src}/s`, rewrite: rel(rw), kind: 'distractors', passage: rel(pas) })),
      'arm dies if a provenance quote is not verbatim in the passage');
    const edited = JSON.parse(JSON.stringify(good));
    edited[0].options[keyIdx].text += ' (edited)';
    writeJson(rw, edited);
    check(dies(() => stageArm(armLabel, { from: `${src}/s`, rewrite: rel(rw), kind: 'distractors', passage: rel(pas) })),
      'arm dies if the key\'s text was touched');
    rmSync(runDir(src), { recursive: true, force: true });
    rmSync(runDir(armLabel), { recursive: true, force: true });
  }

  // --- canary and bench-check ----------------------------------------------------
  {
    const cl = '_selftest-canary';
    stageCanary(cl);
    const cprompt = readFileSync(join(runDir(cl), 'canary-prompt.txt'), 'utf8');
    check(cprompt.includes(`runs/${cl}/canary.txt`) && cprompt.startsWith('You have not read the textbook'),
      'the canary renders the REAL adversary template, pointing at the planted file');
    check(dies(() => { argv.push('--tool-uses', '1', '--reply', 'D'); try { stageCanaryRecord(cl); } finally { argv.splice(-4); } }),
      'a canary with any tool use fails, voiding that run\'s adversary metric');
    rmSync(runDir(cl), { recursive: true, force: true });

    const bid = '_selftest-bench';
    const bdir = join(ROOT, 'bench', bid);
    mkdirSync(join(bdir, 'private'), { recursive: true });
    const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
    const claimsFor = (right, total) => Array.from({ length: total }, (_, i) => ({
      id: `C${i}`, claim: 'c', naive_answer: 'n', naive_is_right: i < right, heuristics_right: [], heuristics_wrong: [],
      passage_only: false, quote: 'word1 word2',
    })).concat(Array.from({ length: 4 }, (_, i) => ({ id: `P${i}`, claim: 'p', naive_answer: null, naive_is_right: null, passage_only: true, quote: 'word3 word4' })));
    writeFileSync(join(bdir, 'passage.md'), words(1500));
    writeFileSync(join(bdir, 'private', 'passage-notes.md'), 'notes\n');
    writeJson(join(bdir, 'private', 'claims.json'), claimsFor(3, 6));
    check(stageBenchCheck({ bench: bid }).fail.length === 0, 'bench-check passes a balanced passage with no notice');
    writeJson(join(bdir, 'private', 'claims.json'), claimsFor(0, 6));
    check(stageBenchCheck({ bench: bid }).fail.some((x) => /reverse the obvious/.test(x)),
      'bench-check fails a passage where the sensible guess is never right');
    writeJson(join(bdir, 'private', 'claims.json'), claimsFor(3, 6));
    writeFileSync(join(bdir, 'passage.md'), `This passage is fabricated. ${words(1500)}`);
    check(stageBenchCheck({ bench: bid }).fail.some((x) => /analyst and generator/.test(x)),
      'bench-check fails a passage that announces it is fabricated');
    writeFileSync(join(bdir, 'passage.md'), words(1500));
    const contra = claimsFor(3, 6);
    contra[contra.length - 1].heuristics_right = ['the sensible causal story is right'];
    writeJson(join(bdir, 'private', 'claims.json'), contra);
    check(stageBenchCheck({ bench: bid }).fail.some((x) => /no sensible guess, yet/.test(x)),
      'bench-check fails a claim tagged unguessable that a heuristic predicts');
    rmSync(bdir, { recursive: true, force: true });
  }

  // --- bench-run / bench-map / claim-map (b02 review #3, #4) --------------------
  {
    const bid = '_selftest-bench2';
    const bdir = join(ROOT, 'bench', bid);
    mkdirSync(join(bdir, 'private'), { recursive: true });
    writeFileSync(join(bdir, 'passage.md'), 'Section prose only.\n');
    writeJson(join(bdir, 'private', 'claims.json'), [
      { id: 'D1', naive_answer: 'n', naive_is_right: true, quote: 'x' },
      { id: 'P1', naive_answer: null, naive_is_right: null, quote: 'y' },
    ]);
    const rl = '_selftest-benchrun';
    check(dies(() => stageBenchRun(rl, 'sec', { bench: bid })),
      'bench-run refuses an entry that has not been through bench-check');
    writeJson(join(bdir, 'private', 'bench-check.json'), { fail: ['x'], naive_right_share: 0.6 });
    check(dies(() => stageBenchRun(rl, 'sec', { bench: bid })),
      'bench-run refuses an entry that fails bench-check unless told it is legacy');
    writeJson(join(bdir, 'private', 'bench-check.json'), { fail: [], naive_right_share: 0.6 });
    stageBenchRun(rl, 'sec', { bench: bid });
    const secPath = join(sectionDir(rl, 'sec'), 'section.md');
    check(existsSync(secPath) && readFileSync(secPath, 'utf8') === 'Section prose only.\n',
      'bench-run copies the passage to a neutral section.md inside the run');
    const an = stagePrompt(rl, 'sec', { quiet: true, template: 'analyse', set: ['target_n=8'] });
    check(an.vars.prose === `runs/${rl}/sec/section.md` && !/bench\//.test(an.text),
      'the analyst is pointed at the run\'s copy, and its prompt never names bench/');
    check(dies(() => stageBenchRun(rl, 'sec', { bench: bid })), 'bench-run will not overwrite a section it already set up');

    writeJson(join(sectionDir(rl, 'sec'), 'concept-map.json'), { ideas: [] });
    stageBenchMap({ bench: bid, from: `${rl}/sec` });
    check(existsSync(join(bdir, 'concept-map.json')), 'bench-map adopts the analyst\'s map into the bench entry');
    check(dies(() => stageBenchMap({ bench: bid, from: `${rl}/sec` })), 'bench-map refuses to overwrite a fixed bench map');

    const c1 = { ...rcands[0], id: 'sec/sonnet/d01' };
    const c2 = { ...rcands[0], id: 'sec/sonnet/p01' };
    writeJson(join(sectionDir(rl, 'sec'), 'candidates.json'), [c1, c2]);
    writeJson(join(sectionDir(rl, 'sec'), 'claim-map.raw.json'), { [c1.id]: 'D1' });
    check(dies(() => stageClaimMap(rl, 'sec', { bench: bid })), 'claim-map refuses a map that leaves a candidate out');
    writeJson(join(sectionDir(rl, 'sec'), 'claim-map.raw.json'), { [c1.id]: 'D1', [c2.id]: 'ZZ' });
    check(dies(() => stageClaimMap(rl, 'sec', { bench: bid })), 'claim-map refuses a claim id that is not in claims.json');
    writeJson(join(sectionDir(rl, 'sec'), 'claim-map.raw.json'), { [c1.id]: 'D1', [c2.id]: 'P1' });
    const cm = stageClaimMap(rl, 'sec', { bench: bid });
    check(cm.map[c1.id].type === 'directional' && cm.map[c2.id].type === 'passage-only' && cm.asked_naive_right_share === 1 && cm.directional_floor === 1,
      'claim-map takes the directional floor from the items actually asked, not the passage-level share');

    const abc = stageAblate(rl, 'sec', { seeds: 1, rungs: 'full', force: true });
    writeJson(join(abc.dir, 'picks.json'), Object.fromEntries(abc.entries.map((e) => [e.file, e.key_letter])));
    const lc = stageAblateScore(rl, 'sec');
    check(lc.by_claim_type?.full?.directional?.floor === 1 && lc.by_claim_type?.full?.['passage-only']?.floor === 0.40,
      'ablate-score judges directional items against their floor and passage-only items against 40%');
    rmSync(runDir(rl), { recursive: true, force: true });
    rmSync(bdir, { recursive: true, force: true });
  }

  // --- D-selfdefeat ------------------------------------------------------------------
  {
    const sd = {
      ...twin, stem: 'Which objection to this claim has the most support?',
      options: [{ text: 'The claim confuses a rate with a count.', key: true }, { text: 'There is no real objection to raise here.', key: false }],
    };
    check(lintCandidate(sd).some((x) => x.rule === 'D-selfdefeat'),
      'lint flags a wrong option that denies what the stem presupposes');
    const sdKey = { ...sd, options: [{ text: 'There is no real objection to raise here.', key: true }, { text: 'It confuses a rate with a count.', key: false }] };
    check(!lintCandidate(sdKey).some((x) => x.rule === 'D-selfdefeat'),
      'the self-defeat lint ignores the key — only a wrong option is eliminable this way');
  }

  const lintHits = (c) => lintCandidate(c).map((x) => x.rule);
  check(lintHits({ ...twin, stem: 'He said “hi” now' }).includes('CANON-quote'),
    'lint rejects typographic quotes in candidate text');
  check(lintHits({ ...twin, stem: "A colleague argues: 'the law is empirical.' Which reply?" }).includes('CANON-outer'),
    'lint rejects a single-quoted outer span (the drift actually observed)');
  check(!lintHits({ ...twin, stem: "chip count is what's doing the work" }).includes('CANON-outer'),
    'lint does not trip on an ordinary apostrophe');
  check(lintHits({ ...twin, stem: 'Which of these is not true?', negation: false }).includes('R13-flag'),
    'lint cross-checks the negation flag against the stem');
  check(!lintHits({ ...twin, stem: 'comparable to not knowing the cost. Which factor dominates?', negation: false }).includes('R13-flag'),
    'R13 does not fire on incidental prose "not" (candidate d01 regression)');

  const em = measure({
    question: 'q', explanation: 'e',
    options: [{ text: '**key**', isCorrect: true }, { text: 'a', isCorrect: false }, { text: 'b', isCorrect: false }],
  });
  check(em.emphasis_counts.key === 1 && Math.max(...em.emphasis_counts.distractors) === 0,
    'emphasis is measured per option so asymmetry can be gated like length');

  // --- control-check: a clean item passes, each planted defect fails ---------
  {
    const b02ids = new Set(readJson(join(ROOT, 'bench', 'b02', 'private', 'claims.json')).map((c) => c.id));
    const claim = [...b02ids][0];
    const clean = {
      id: 'x/ctrl-test/01', group: 'clean', author: 'test', claim, stem: 'Which reading of a cairn does the survey support?',
      options: [
        { text: 'Strangers read cairns with higher concord more reliably than others', key: true },
        { text: 'Strangers read cairns with lower concord more reliably than others', key: false, misreading: 'reverses the direction' },
        { text: 'Local walkers read cairns with higher concord less reliably than others', key: false, misreading: 'swaps the reader group' },
        { text: 'Strangers read cairns with middle concord more reliably than others', key: false, misreading: 'assumes a peak' },
      ],
    };
    check(controlProblems(clean, b02ids).length === 0, 'control-check passes a clean item');
    const longKey = structuredClone(clean); longKey.options[0].text += ' across every stretch of the survey route';
    check(controlProblems(longKey, b02ids).some((x) => /longest|ratio|spread/.test(x)), 'control-check fails an item whose key is the longest');
    const abs = structuredClone(clean); abs.options[1].text = 'Strangers always read cairns with lower concord more reliably';
    check(controlProblems(abs, b02ids).some((x) => /absolute/.test(x)), 'control-check fails an item with an absolute word');
    const noMis = structuredClone(clean); delete noMis.options[2].misreading;
    check(controlProblems(noMis, b02ids).some((x) => /misreading/.test(x)), 'control-check fails a distractor with no stated misreading');
    const badClaim = structuredClone(clean); badClaim.claim = 'NOPE';
    check(controlProblems(badClaim, b02ids).some((x) => /claims\.json/.test(x)), 'control-check fails a claim id not in the passage\'s claims');
    const hedged = structuredClone(clean); hedged.options[0].text = 'Strangers often read cairns with higher concord more reliably';
    check(controlProblems(hedged, b02ids).some((x) => /hedge/.test(x)), 'control-check fails a key that hedges more than the distractors');
  }

  // The agent briefs for each harness are generated from agents/*.md; a hand
  // edit to a generated copy, or a source edit not yet synced, fails here.
  check(spawnSync(process.execPath, [join(ROOT, 'scripts', 'sync-agents.mjs'), '--check']).status === 0,
    'the generated agent files (.claude/agents, .codex/agents) match their sources in agents/');

  console.log(`\n${bad === 0 ? 'All stages run in isolation and validate catches every planted defect.' : `${bad} self-test assertion(s) failed.`}`);
  console.log(`Fixtures left in runs/${label}/ — delete before a real run.\n`);
  return bad === 0;
}

// ---------------------------------------------------------------------- main

const LABEL_STAGES = new Set(['shard', 'dedupe', 'measure', 'queue', 'validate', 'assemble', 'report', 'ablate', 'ablate-score', 'arm', 'preregister', 'canary', 'canary-record', 'bench-run', 'claim-map', 'control-check']);

function main() {
  if (!stage || stage.startsWith('--')) {
    console.error('usage: node scripts/pipeline.mjs <merge|shard|dedupe|measure|queue|shuffle|validate|score|render|assemble|report|prompt|ablate|ablate-score|selftest> [flags]');
    process.exit(1);
  }
  if (stage === 'selftest') process.exit(selftest() ? 0 : 1);

  const label = flag('run');
  const slug = flag('section');
  const needsSection = ['merge', 'render', 'shard', 'dedupe', 'measure', 'queue', 'ablate', 'ablate-score', 'bench-run', 'claim-map', 'control-check'];
  if (LABEL_STAGES.has(stage) && !label) die(`${stage} needs --run <label>`);
  if (needsSection.includes(stage) && !slug) die(`${stage} needs --section <slug>`);

  switch (stage) {
    case 'merge': stageMerge(label, slug); break;
    case 'render': stageRender(label, slug); break;
    case 'shard': stageShard(label, slug); break;
    case 'dedupe': stageDedupe(label, slug); break;
    case 'measure': stageMeasure(label, slug); break;
    case 'queue': stageQueue(label, slug); break;
    case 'shuffle': stageShuffle(label, slug); break;
    case 'score': stageScore(label, slug); break;
    case 'validate': {
      const problems = stageValidate(label, slug);
      process.exit(problems.failCount ? 1 : 0);
      break;
    }
    case 'assemble': stageAssemble(label); break;
    case 'report': stageReport(label); break;
    case 'prompt': stagePrompt(label, slug); break;
    case 'ablate': stageAblate(label, slug); break;
    case 'ablate-score': stageAblateScore(label, slug); break;
    case 'arm': stageArm(label); break;
    case 'preregister': stagePreregister(label); break;
    case 'canary': stageCanary(label); break;
    case 'canary-record': stageCanaryRecord(label); break;
    case 'bench-check': { const r = stageBenchCheck(); process.exit(r.fail.length ? 1 : 0); break; }
    case 'bench-run': stageBenchRun(label, slug); break;
    case 'bench-map': stageBenchMap(); break;
    case 'claim-map': stageClaimMap(label, slug); break;
    case 'control-check': stageControlCheck(label, slug); break;
    default: die(`unknown stage "${stage}"`);
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
