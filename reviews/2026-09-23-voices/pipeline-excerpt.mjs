// EXCERPT of scripts/pipeline.mjs for review: seededOrders, then the ablate and ablate-score stages with the voice and explain additions. Full file is ~3.5k lines; helpers such as parseJsonValues, render, loadPartial, contentWords, overlap, ABSOLUTES and countMatches are defined elsewhere and behave as named.
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
  if (existsSync(join(ad, 'picks.json')) && !force) {
    die(`ablate: ${join(ad, 'picks.json')} already exists. A new manifest would re-point those picks.\n`
      + '       Move the old ablation/ aside, or pass --force if the picks are known to be stale.');
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
        });
        k += 1;
      });
    }
  }
  const centrality = Object.fromEntries(items.map((c) => [c.id, keyCentrality(c)]));
  writeJson(join(ad, 'manifest.json'), {
    source: `${label}/${slug}`, seeds, seed_offset: offset, rungs, passage: passage || null,
    explain_seeds: explainSeeds, claude_seeds: claudeSeeds, claude_explain_seeds: claudeExplainSeeds,
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
// unparsed reply: counted as a miss AND reported, never silently dropped.
function letterRow(e, raw) {
  const m = String(raw).trim().match(/^\W*([A-Za-z])\W*$/);
  const letter = m ? m[1].toUpperCase() : null;
  const ok = letter && letter.charCodeAt(0) - 65 < e.option_count;
  return { ...e, picked: ok ? letter : null, unparsed: !ok, hit: !!ok && letter === e.key_letter };
}

function letterStats(rs) {
  const ids = uniq(rs.map((r) => r.id));
  const perQ = ids.map((id) => {
    const q = rs.filter((r) => r.id === id);
    return { id, hits: q.filter((r) => r.hit).length, trials: q.length, rate: q.filter((r) => r.hit).length / q.length };
  });
  const hits = rs.filter((r) => r.hit).length;
  const chance = mean(rs.map((r) => r.chance));
  return {
    perQ,
    stats: {
      questions: ids.length, trials: rs.length, hits, unparsed: rs.filter((r) => r.unparsed).length,
      hit_rate: rs.length ? hits / rs.length : null,
      mean_chance: chance,
      excess_over_chance: rs.length ? hits / rs.length - chance : null,
      ci_question_unit: questionUnitCI(perQ.map((q) => q.rate)),
    },
  };
}

// One reply of one voice to one prompt file. API voices write a call record
// (<NN>.json, from scripts/voices.mjs); the orchestrator saves a Claude reply
// verbatim (<NN>.txt). A record whose call failed is "not answered", not a miss.
function readVoiceReply(vdir, voice, file) {
  const j = join(vdir, voice, `${file}.json`);
  if (existsSync(j)) { const r = readJson(j); return r.status === 'ok' ? String(r.reply_text ?? '') : null; }
  const t = join(vdir, voice, `${file}.txt`);
  return existsSync(t) ? readFileSync(t, 'utf8') : null;
}

const listVoices = (vdir) => (existsSync(vdir)
  ? readdirSync(vdir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : []);

const voiceMeta = (vdir, v) => maybeJson(join(vdir, v, 'voice.json'))
  ?? (v === CLAUDE_VOICE ? { id: v, provider: 'claude-code', model: 'haiku', family: 'anthropic' } : { id: v });

// Letter replies of every API voice, for the letter rungs an API voice can answer.
// The Claude subagent's letters are picks.json and are not read from here.
function readVoiceLetterRows(ad, man) {
  const vdir = join(ad, 'voices');
  const out = {};
  for (const v of listVoices(vdir).filter((x) => x !== CLAUDE_VOICE)) {
    const rows = [];
    for (const e of man.entries.filter((x) => ABLATION_RUNGS[x.rung].api && !isExplainRung(x.rung))) {
      const raw = readVoiceReply(vdir, v, e.file);
      if (raw != null) rows.push(letterRow(e, raw));
    }
    if (rows.length) out[v] = { meta: voiceMeta(vdir, v), rows };
  }
  return out;
}

// Parse and check one explain reply. This parses; it never repairs. A single
// surrounding code fence is unwrapped and noted — that removes no content. A
// reply that is not one JSON object with an entry per shown letter is `ok:
// false` and counted, never guessed at. Problems that leave the reply usable
// (an unknown code, `other` without a note, p not summing to 100) are recorded
// against it; unknown codes are dropped from the analysis, not coerced.
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
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || !obj.options || typeof obj.options !== 'object') return { ok: false, problems: ['no-options-object'] };
  const letters = Array.from({ length: e.option_count }, (_, i) => String.fromCharCode(65 + i));
  const got = Object.keys(obj.options).map((k) => k.trim().toUpperCase());
  if (got.length !== letters.length || letters.some((l) => !got.includes(l))) return { ok: false, problems: ['option-letters-mismatch'] };
  const options = {};
  for (const [k, v] of Object.entries(obj.options)) {
    const L = k.trim().toUpperCase();
    const p = Number(v?.p);
    const rawCodes = Array.isArray(v?.codes) ? v.codes.map((c) => String(c).trim().toLowerCase()) : [];
    const invalid = rawCodes.filter((c) => !codes.includes(c));
    if (invalid.length) problems.push(`invalid-code:${invalid.join('|')}`);
    const valid = uniq(rawCodes.filter((c) => codes.includes(c)));
    const note = typeof v?.note === 'string' ? v.note.trim() : '';
    if (valid.includes('other') && !note) problems.push('other-without-note');
    if (!Number.isFinite(p) || p < 0) problems.push('p-missing');
    options[L] = { p: Number.isFinite(p) && p >= 0 ? p : null, codes: valid, note };
  }
  const sum = Object.values(options).reduce((a, o) => a + (o.p ?? 0), 0);
  if (Math.abs(sum - 100) > 5) problems.push(`p-sum:${sum}`);
  for (const o of Object.values(options)) o.pn = sum > 0 && o.p != null ? o.p / sum : null;
  const pick = String(obj.pick ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (!letters.includes(pick)) problems.push('pick-invalid');
  return { ok: true, problems, options, pick: letters.includes(pick) ? pick : null, strategy: typeof obj.strategy === 'string' ? obj.strategy.trim() : '' };
}

// What the text itself shows about each displayed option, for checking whether
// the cues a reader CLAIMS are cues the option actually has. `null` = not
// measurable here (no stem on the options-only rung).
function optionMechanics(stem, texts) {
  const uniqueMax = (arr, i) => { const m = Math.max(...arr); return arr[i] === m && arr.filter((x) => x === m).length === 1; };
  const lens = texts.map((t) => t.length);
  const words = texts.map((t) => contentWords(t));
  const sw = stem ? contentWords(stem) : null;
  const echo = sw ? words.map((w) => overlap(sw, w)) : null;
  const cent = words.map((w, i) => mean(words.filter((_, j) => j !== i).map((o) => overlap(w, o))));
  return texts.map((t, i) => ({
    longest: uniqueMax(lens, i),
    absolute: countMatches(t, ABSOLUTES) > 0,
    echoes_stem: echo ? Math.max(...echo) > 0 && uniqueMax(echo, i) : null,
    central: uniqueMax(cent, i),
  }));
}

// claimed code ↔ measurable property. Imperfect pairs on purpose (most-detailed
// is not "longest"), so these are reported as agreement, not as accuracy.
const FAITHFULNESS_PAIRS = [
  ['most-detailed', 'longest'],
  ['absolute', 'absolute'],
  ['echoes-stem', 'echoes_stem'],
  ['like-the-others', 'central'],
];

function explainAnalysis(label, slug, ad, man) {
  const codes = tellCodes();
  const cands = readJson(need(join(sectionDir(label, slug), 'candidates.json'), 'candidates.json'));
  const byId = new Map(cands.map((c) => [c.id, c]));
  const entries = man.entries.filter((e) => isExplainRung(e.rung));
  const vdir = join(ad, 'voices');
  const replies = [];
  const meta = {};
  for (const v of listVoices(vdir)) {
    meta[v] = voiceMeta(vdir, v);
    for (const e of entries) {
      const raw = readVoiceReply(vdir, v, e.file);
      if (raw != null) replies.push({ voice: v, e, parsed: parseExplainReply(raw, e, codes) });
    }
  }

  // One record per (reply, displayed option).
  const recs = [];
  for (const r of replies.filter((x) => x.parsed.ok)) {
    const c = byId.get(r.e.id);
    const shown = r.e.options_shown;
    const mech = optionMechanics(r.e.rung === 'full-explain' ? c.stem : null, shown);
    shown.forEach((text, i) => {
      const L = String.fromCharCode(65 + i);
      const o = r.parsed.options[L];
      recs.push({
        voice: r.voice, id: r.e.id, rung: r.e.rung, file: r.e.file, letter: L,
        option: c.options.findIndex((x) => x.text === text), key: L === r.e.key_letter,
        picked: r.parsed.pick === L, p: o.pn, codes: o.codes, note: o.note, mech: mech[i],
      });
    });
  }

  const rungsPresent = man.rungs.filter(isExplainRung);
  const codeTable = {};
  for (const rung of rungsPresent) {
    const rs = recs.filter((x) => x.rung === rung);
    const K = rs.filter((x) => x.key).length;
    const D = rs.length - K;
    codeTable[rung] = { key_options: K, distractor_options: D, codes: {} };
    for (const code of codes) {
      const onKey = rs.filter((x) => x.key && x.codes.includes(code)).length;
      const onDist = rs.filter((x) => !x.key && x.codes.includes(code)).length;
      if (!onKey && !onDist) continue;
      const rk = K ? onKey / K : null;
      const rd = D ? onDist / D : null;
      codeTable[rung].codes[code] = { on_key: onKey, on_distractors: onDist, rate_key: rk, rate_distractors: rd, lift: rd ? rk / rd : null };
    }
  }

  const allTags = recs.flatMap((x) => x.codes);
  const share = (code) => (allTags.length ? allTags.filter((t) => t === code).length / allTags.length : null);

  const faithfulness = {};
  for (const [code, prop] of FAITHFULNESS_PAIRS) {
    const rs = recs.filter((x) => x.mech[prop] != null);
    const tagged = rs.filter((x) => x.codes.includes(code));
    const trueP = rs.filter((x) => x.mech[prop]);
    const both = tagged.filter((x) => x.mech[prop]).length;
    faithfulness[code] = {
      property: prop, options: rs.length, tagged: tagged.length, property_true: trueP.length,
      tagged_where_true: tagged.length ? both / tagged.length : null,
      true_and_tagged: trueP.length ? both / trueP.length : null,
    };
  }
  // A claim the reader could not have seen: stem echo with no stem shown.
  const impossible = recs.filter((x) => x.rung === 'options-only-explain' && x.codes.includes('echoes-stem')).length;

  const perVoice = {};
  for (const v of Object.keys(meta)) {
    const rv = replies.filter((x) => x.voice === v);
    if (!rv.length) continue;
    const probs = {};
    for (const r of rv) for (const pr of r.parsed.problems) { const k = pr.split(':')[0]; probs[k] = (probs[k] ?? 0) + 1; }
    const byRung = {};
    for (const rung of rungsPresent) {
      const ok = rv.filter((x) => x.e.rung === rung && x.parsed.ok);
      if (!ok.length) continue;
      const kp = recs.filter((x) => x.voice === v && x.rung === rung && x.key).map((x) => x.p).filter((p) => p != null);
      byRung[rung] = { replies: ok.length, explain_hit_rate: ok.filter((x) => x.parsed.pick === x.e.key_letter).length / ok.length, mean_p_key: kp.length ? mean(kp) : null };
    }
    const vt = recs.filter((x) => x.voice === v).flatMap((x) => x.codes);
    perVoice[v] = {
      meta: meta[v], replies: rv.length, unusable: rv.filter((x) => !x.parsed.ok).length, problems: probs, rungs: byRung,
      other_share: vt.length ? vt.filter((t) => t === 'other').length / vt.length : null,
      no_tell_share: vt.length ? vt.filter((t) => t === 'no-tell').length / vt.length : null,
    };
  }

  const perQuestion = {};
  for (const id of uniq(recs.map((x) => x.id))) {
    const c = byId.get(id);
    const q = { rungs: {}, options: [] };
    for (const rung of rungsPresent) {
      const rs = recs.filter((x) => x.id === id && x.rung === rung);
      if (!rs.length) continue;
      const kp = rs.filter((x) => x.key).map((x) => x.p).filter((p) => p != null);
      const nReplies = uniq(rs.map((x) => `${x.voice}|${x.file}`)).length;
      q.rungs[rung] = { replies: nReplies, picked_key: rs.filter((x) => x.key && x.picked).length, mean_p_key: kp.length ? mean(kp) : null, voices: uniq(rs.map((x) => x.voice)) };
    }
    c.options.forEach((o, oi) => {
      const rs = recs.filter((x) => x.id === id && x.option === oi);
      const counts = {};
      for (const x of rs) for (const code of x.codes) counts[code] = (counts[code] ?? 0) + 1;
      const ps = rs.map((x) => x.p).filter((p) => p != null);
      q.options.push({ option: oi, key: !!o.key, text: o.text, ratings: rs.length, mean_p: ps.length ? mean(ps) : null, codes: Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1])) });
    });
    perQuestion[id] = q;
  }

  const notes = recs.filter((x) => x.codes.includes('other')).map((x) => ({ voice: x.voice, id: x.id, rung: x.rung, option: x.option, key: x.key, note: x.note }));
  const strategies = replies.filter((x) => x.parsed.ok && x.parsed.strategy).map((x) => ({ voice: x.voice, id: x.e.id, rung: x.e.rung, hit: x.parsed.pick === x.e.key_letter, strategy: x.parsed.strategy }));

  const summary = {
    replies: replies.length, unusable: replies.filter((x) => !x.parsed.ok).length, voices: Object.keys(perVoice),
    tags: allTags.length, other_share: share('other'), no_tell_share: share('no-tell'),
    impossible_stem_echo_tags: impossible,
  };
  const tells = { source: man.source, codes, summary, code_table: codeTable, faithfulness, per_voice: perVoice, per_question: perQuestion, other_notes: notes, strategies };
  writeJson(join(ad, 'tells.json'), tells);
  writeFileSync(join(ad, 'tells.md'), tellsMarkdown(tells), 'utf8');
  return tells;
}

const pct = (x) => (x == null ? '—' : fmtPct(x));

function tellsMarkdown(t) {
  const L = [];
  L.push(`# Tells — ${t.source}`, '');
  L.push('Explain-mode replies: DIAGNOSIS, not the score. Hit rates here are not comparable with the letter rungs.', '');
  L.push(`${t.summary.replies} replies from ${t.summary.voices.length} voice(s), ${t.summary.unusable} unusable. ${t.summary.tags} cue tags; \`other\` ${pct(t.summary.other_share)}, \`no-tell\` ${pct(t.summary.no_tell_share)}. Stem-echo tags on the options-only rung (impossible claims): ${t.summary.impossible_stem_echo_tags}.`, '');
  L.push('A high `other` share means the code list is missing cues: read the notes at the end and promote recurring ones to codes.', '');
  for (const [rung, ct] of Object.entries(t.code_table)) {
    L.push(`## Cues on keys vs distractors — ${rung}`, '', `${ct.key_options} key ratings, ${ct.distractor_options} distractor ratings. Lift = rate on keys / rate on distractors; well above 1 means the cue points at the key.`, '');
    L.push('| code | on keys | on distractors | lift |', '|---|---|---|---|');
    for (const [code, r] of Object.entries(ct.codes).sort((a, b) => (b[1].lift ?? Infinity) - (a[1].lift ?? Infinity))) {
      L.push(`| \`${code}\` | ${r.on_key} (${pct(r.rate_key)}) | ${r.on_distractors} (${pct(r.rate_distractors)}) | ${r.lift == null ? '∞' : r.lift.toFixed(2)} |`);
    }
    L.push('');
  }
  L.push('## Do the claimed cues match the text?', '', 'For codes the checker can measure. Low "tagged where true" means readers claim this cue on options that do not have it.', '');
  L.push('| code | measured as | tagged | tagged where true | property true | true and tagged |', '|---|---|---|---|---|---|');
  for (const [code, f] of Object.entries(t.faithfulness)) L.push(`| \`${code}\` | ${f.property} | ${f.tagged} | ${pct(f.tagged_where_true)} | ${f.property_true} | ${pct(f.true_and_tagged)} |`);
  L.push('');
  L.push('## Per voice', '', '| voice | family | model | replies | unusable | explain hit (full / options-only) | other | no-tell |', '|---|---|---|---|---|---|---|---|');
  for (const [v, r] of Object.entries(t.per_voice)) {
    const h = (rung) => (r.rungs[rung] ? pct(r.rungs[rung].explain_hit_rate) : '—');
    L.push(`| ${v} | ${r.meta.family ?? '?'} | ${r.meta.model ?? '?'} | ${r.replies} | ${r.unusable} | ${h('full-explain')} / ${h('options-only-explain')} | ${pct(r.other_share)} | ${pct(r.no_tell_share)} |`);
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

  // Other voices (scripts/voices.mjs), and the panel pooled over every voice.
  // An API voice may cover only part of the manifest — free quotas run out — so
  // each is scored on what it answered, with its coverage stated beside it.
  const voiceRows = readVoiceLetterRows(ad, man);
  let panel = null;
  if (Object.keys(voiceRows).length) {
    ladder.voices = {};
    panel = [...rows.filter((r) => r.picked !== undefined).map((r) => ({ ...r, voice: CLAUDE_VOICE }))];
    for (const [v, vr] of Object.entries(voiceRows)) {
      ladder.voices[v] = { meta: vr.meta, rungs: {} };
      for (const rung of man.rungs.filter((r) => ABLATION_RUNGS[r].api && !isExplainRung(r))) {
        const rs = vr.rows.filter((r) => r.rung === rung);
        const total = man.entries.filter((e) => e.rung === rung).length;
        if (!rs.length) { ladder.voices[v].rungs[rung] = { coverage: `0/${total}` }; continue; }
        ladder.voices[v].rungs[rung] = { ...letterStats(rs).stats, coverage: `${rs.length}/${total}` };
        panel.push(...rs.map((r) => ({ ...r, voice: v })));
      }
    }
    ladder.panel = {};
    for (const rung of man.rungs.filter((r) => ABLATION_RUNGS[r].api && !isExplainRung(r))) {
      const rs = panel.filter((r) => r.rung === rung);
      if (!rs.length) continue;
      const { stats, perQ } = letterStats(rs);
      ladder.panel[rung] = { ...stats, voices: uniq(rs.map((r) => r.voice)) };
      for (const q of perQ) ((ladder.per_question[q.id] ??= {}).panel ??= {})[rung] = `${q.hits}/${q.trials}`;
    }
  }

  // Explain rungs: parsed, validated and aggregated into tells.json / tells.md.
  if (man.rungs.some(isExplainRung)) {
    const tells = explainAnalysis(label, slug, ad, man);
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
      ladder.panel_by_claim_type = {};
      for (const rung of Object.keys(ladder.panel ?? {})) {
        for (const type of ['directional', 'passage-only', 'unmapped']) {
          const rs = panel.filter((r) => r.rung === rung && cmap.map[r.id]?.type === type);
          if (!rs.length) continue;
          (ladder.panel_by_claim_type[rung] ??= {})[type] = {
            trials: rs.length, hit_rate: rs.filter((r) => r.hit).length / rs.length,
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
  console.log('  rung           questions  trials   hit    over chance   95% CI, question as unit   unparsed');
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
    console.log('  other voices (each on what it answered; coverage beside it):');
    for (const [v, vr] of Object.entries(ladder.voices)) {
      for (const [rung, r] of Object.entries(vr.rungs)) {
        if (r.hit_rate == null) { console.log(`    ${v.padEnd(16)} ${rung.padEnd(13)} coverage ${r.coverage}`); continue; }
        console.log(`    ${v.padEnd(16)} ${rung.padEnd(13)} ${fmtPct(r.hit_rate).padStart(5)} of ${r.trials} (${r.questions} q), CI ${ciTxt(r)}, coverage ${r.coverage}, unparsed ${r.unparsed}`);
      }
    }
    for (const [rung, r] of Object.entries(ladder.panel ?? {})) {
      console.log(`    PANEL            ${rung.padEnd(13)} ${fmtPct(r.hit_rate).padStart(5)} of ${r.trials} over ${r.voices.length} voice(s), CI ${ciTxt(r)} (question as unit)`);
    }
    for (const [rung, byType] of Object.entries(ladder.panel_by_claim_type ?? {})) {
      for (const [type, r] of Object.entries(byType)) console.log(`    PANEL ${rung}/${type}: ${fmtPct(r.hit_rate)} of ${r.trials} against a floor of ${r.floor == null ? 'n/a' : fmtPct(r.floor)}`);
    }
  }
  if (ladder.explain) {
    const x = ladder.explain;
    console.log(`  explain (diagnosis, not the score): ${x.replies} replies, ${x.unusable} unusable, ${x.voices.length} voice(s); other ${x.other_share == null ? 'n/a' : fmtPct(x.other_share)}, no-tell ${x.no_tell_share == null ? 'n/a' : fmtPct(x.no_tell_share)}; impossible stem-echo tags ${x.impossible_stem_echo_tags}`);
    console.log(`    → ${join(ad, 'tells.md')}`);
  }
  return ladder;
}

