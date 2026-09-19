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
//   node scripts/pipeline.mjs selftest
//
// Every stage is runnable in isolation and reads only artifacts already on disk.
// Nothing here writes to public/questions/ — ever.
//
// Exit 0 clean, 1 on a stage failure (validate: any schema failure).

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseChapterMarkdown } from '../src/quizParser.js';
import { measure, contentWords, overlap, GATES, atlasSlug } from './check-questions.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHAPTER_DIR = resolve(ROOT, '../atlas-audio-read-along/dist/chapters/v1/capabilities');

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
  const dedupe = maybeJson(join(dir, 'dedupe.json'));
  const keep = dedupe ? new Set(dedupe.survivor_ids) : null;
  const pool = keep ? candidates.filter((c) => keep.has(c.id)) : candidates;

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

// Builds the adversary prompt bodies, seeded. The prompt is the one in
// quiz-adversary.md, verbatim. Options are shuffled per seed so position tells
// are measured as the reader would see them; the key's letter is recorded here
// so `score` can mark a hit without the adversary ever seeing it.
const ADVERSARY_PREAMBLE = `You have not read the textbook this question comes from. Answer from the
question and options alone, using only general knowledge and test-taking
instinct. Do not explain. Reply with a single letter.`;

function adversaryPrompt(stem, optionTexts) {
  const lines = optionTexts.map((t, i) => `${String.fromCharCode(65 + i)}. ${t}`);
  return `${ADVERSARY_PREAMBLE}\n\n${stem}\n\n${lines.join('\n')}`;
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
    // The seeds must give DISTINCT arrangements, or "hit on ≥2/3 seeds" tests
    // the same arrangement twice and the flag is weaker than it looks. With
    // independent seeding, ~12% of 4-option questions draw a repeat, and the
    // first baseline run measured exactly that (5 of 40). So re-seed until the
    // permutation is new, bounded by how many distinct ones exist (k! — and
    // k! ≤ seeds for a 2-option question, where repeats are unavoidable).
    const seen = new Set();
    const maxPerms = it.options.reduce((a, _, i) => a * (i + 1), 1);
    for (let s = 1; s <= seeds; s++) {
      let order = it.no_shuffle ? it.options : shuffled(it.options, `${it.id}#${s}`);
      if (!it.no_shuffle && seen.size < maxPerms) {
        for (let salt = 0; salt < 64 && seen.has(order.map((o) => o.text).join('\u0000')); salt++) {
          order = shuffled(it.options, `${it.id}#${s}#r${salt}`);
        }
      }
      const permKey = order.map((o) => o.text).join('\u0000');
      if (seen.has(permKey)) repeatedPerms++;
      seen.add(permKey);
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

// -------------------------------------------------------- stage: score (t4)

// Adversary letters → adversary.json. Reads picks.json: the letter each spawn
// returned, keyed `<id>#<seed>`. Reports against per-question chance 1/k, never
// a flat 25% — option counts vary 2–5 under the amended R2.
function stageScore(label, slug) {
  const outDir = flag('out');
  const dir = outDir ? resolve(ROOT, outDir) : sectionDir(label, slug);
  const shuffle = readJson(need(join(dir, 'shuffle.json'), 'shuffle.json'));
  const picks = readJson(need(join(dir, 'picks.json'), 'picks.json (letter per <id>#<seed>)'));

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

  const out = { summary, per_question: perQuestion, answers: rows, missing_picks: missing };
  const p = writeJson(join(dir, 'adversary.json'), out);
  if (label) logLine(label, { stage: 'score', section: slug || basename(dir), ...summary, artifact: p, ok: true });
  console.log(`score    ${shuffle.source}: mean hit ${fmtPct(summary.mean_hit_rate)} · excess over chance ${summary.mean_excess_over_chance >= 0 ? '+' : ''}${summary.mean_excess_over_chance} (gate ≤0.15 ${summary.gate_excess_pass ? 'pass' : 'FAIL'}) · 4-opt ${summary.four_option_hit_rate == null ? 'n/a' : fmtPct(summary.four_option_hit_rate)} · flagged ${summary.flagged}/${summary.n_questions}`);
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
function validator() {
  const problems = [];
  const ok = (cond, where, msg) => { if (!cond) problems.push({ where, msg }); return Boolean(cond); };
  return { problems, ok };
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
  for (const p of map.discrimination_pairs || []) {
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

function validateCandidates(list, map, where, ok) {
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
    ok(!/according to the (chapter|text|textbook|section|author|atlas)/i.test(all), w,
      'R5/E5: "according to the …" in stem, option or explanation');
    for (const d of doNotTest) {
      if (d.length > 12 && c.stem.toLowerCase().includes(d)) {
        ok(false, w, `stem contains a do_not_test item: "${d}"`);
      }
    }
  }
}

function validateVerdicts(list, candidates, measurements, where, ok) {
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
        const sub = [];
        validateCandidates([v.rewrite], null, `${w}.rewrite`, (c, ww, mm) => { if (!c) sub.push({ where: ww, msg: mm }); return Boolean(c); });
        for (const s of sub) ok(false, s.where, s.msg);
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

function validateCurator(cur, candidates, verdicts, adversary, stagingPath, where, ok) {
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
    const flagText = (cur.flags_for_reviewer || []).join('\n');
    for (const s of cur.selected || []) {
      if (!flagged.has(s.id)) continue;
      ok(flagText.includes(s.id), where,
        `shipped ${s.id} is adversary-flagged but is not named in flags_for_reviewer`);
    }
  }
  // The curator never edits text. Diff the staging fragment against the source
  // candidate (or its accepted rewrite) — HANDOFF §3 names this check.
  if (stagingPath && existsSync(stagingPath) && candidates) {
    const parsed = parseChapterMarkdown(readFileSync(stagingPath, 'utf8'));
    const shipped = parsed.flatMap((z) => z.questions).filter((q) => q.type === 'mc');
    ok(shipped.length === cur.shipped_n, `${where}→staging`,
      `staging has ${shipped.length} questions, curator.json says ${cur.shipped_n}`);
    const source = new Map();
    for (const c of candidates) source.set(c.id, c);
    for (const v of verdicts || []) if (v.rewrite) source.set(v.id, v.rewrite);
    (cur.selected || []).forEach((sel, idx) => {
      const src = source.get(sel.id);
      const got = shipped[idx];
      if (!src || !got) return;
      const w = `${where}→staging#Q${idx + 1}`;
      ok(got.question.trim() === src.stem.trim(), w, `stem differs from candidate ${sel.id} — the curator edited text`);
      const srcTexts = src.options.map((o) => o.text.trim()).sort();
      const gotTexts = got.options.map((o) => o.text.trim()).sort();
      ok(JSON.stringify(srcTexts) === JSON.stringify(gotTexts), w, `options differ from candidate ${sel.id} — the curator edited text`);
      ok(got.explanation.includes(src.explanation.trim().slice(0, 60)), w, `explanation differs from candidate ${sel.id} — the curator edited text`);
    });
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
      if (clean) out.push(id);
    }
  }
  return out;
}

function stageValidate(label, slugArg) {
  const { problems, ok } = validator();
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
    if (candidates) { validateCandidates(candidates, map, `${slug}/candidates.json`, ok); checked++; seen.push(`${slug}/candidates.json`); }
    if (measurements && candidates) {
      checked++; seen.push(`${slug}/measurements.json`);
      for (const id of Object.keys(measurements)) {
        ok(candidates.some((c) => c.id === id), `${slug}/measurements.json`, `measurement for unknown candidate ${id}`);
      }
    }
    if (verdicts) { validateVerdicts(verdicts, candidates, measurements, `${slug}/verdicts.json`, ok); checked++; seen.push(`${slug}/verdicts.json`); }
    if (curator) {
      validateCurator(curator, candidates, verdicts, adversary,
        join(ROOT, 'staging', `${slug}.md`), `${slug}/curator.json`, ok);
      checked++; seen.push(`${slug}/curator.json`);
    }
    // Regeneration pass artifacts, same schemas.
    const regen = join(dir, 'regenerated');
    if (existsSync(regen)) {
      const rc = maybeJson(join(regen, 'candidates.json'));
      const rv = maybeJson(join(regen, 'verdicts.json'));
      if (rc) { validateCandidates(rc, map, `${slug}/regenerated/candidates.json`, ok); checked++; seen.push(`${slug}/regenerated/candidates.json`); }
      if (rv) { validateVerdicts(rv, rc, maybeJson(join(regen, 'measurements.json')), `${slug}/regenerated/verdicts.json`, ok); checked++; seen.push(`${slug}/regenerated/verdicts.json`); }
    }
  }

  console.log(`\nvalidate ${label}: ${checked} artifact(s) checked across ${slugs.length} section dir(s)`);
  for (const s of seen) console.log(`         ✓ present  ${s}`);
  if (problems.length) {
    console.log(`\n${problems.length} schema failure(s) — an artifact that does not validate did not happen:`);
    for (const p of problems.slice(0, 60)) console.log(`  ${p.where.padEnd(44)} ${p.msg}`);
    if (problems.length > 60) console.log(`  … and ${problems.length - 60} more`);
  } else {
    console.log('         no schema failures');
  }
  logLine(label, { stage: 'validate', sections: slugs, checked, failures: problems.length, ok: problems.length === 0 });
  console.log('');
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
  check(probs.length === 0, `validate passes on clean artifacts (got ${probs.length} problems)`);

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

  console.log(`\n${bad === 0 ? 'All nine stages run in isolation and validate catches every planted defect.' : `${bad} self-test assertion(s) failed.`}`);
  console.log(`Fixtures left in runs/${label}/ — delete before a real run.\n`);
  return bad === 0;
}

// ---------------------------------------------------------------------- main

const LABEL_STAGES = new Set(['shard', 'dedupe', 'measure', 'queue', 'validate', 'assemble', 'report']);

function main() {
  if (!stage || stage.startsWith('--')) {
    console.error('usage: node scripts/pipeline.mjs <shard|dedupe|measure|queue|shuffle|validate|score|assemble|report|selftest> [flags]');
    process.exit(1);
  }
  if (stage === 'selftest') process.exit(selftest() ? 0 : 1);

  const label = flag('run');
  const slug = flag('section');
  const needsSection = ['shard', 'dedupe', 'measure', 'queue'];
  if (LABEL_STAGES.has(stage) && !label) die(`${stage} needs --run <label>`);
  if (needsSection.includes(stage) && !slug) die(`${stage} needs --section <slug>`);

  switch (stage) {
    case 'shard': stageShard(label, slug); break;
    case 'dedupe': stageDedupe(label, slug); break;
    case 'measure': stageMeasure(label, slug); break;
    case 'queue': stageQueue(label, slug); break;
    case 'shuffle': stageShuffle(label, slug); break;
    case 'score': stageScore(label, slug); break;
    case 'validate': {
      const problems = stageValidate(label, slug);
      process.exit(problems.length ? 1 : 0);
      break;
    }
    case 'assemble': stageAssemble(label); break;
    case 'report': stageReport(label); break;
    default: die(`unknown stage "${stage}"`);
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
