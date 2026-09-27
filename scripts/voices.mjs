// Non-Claude readers: the multi-family panel for the ablation ladder, and a
// fallback chain for one-off requests. Voices and panels are in scripts/voices.json.
//
//   node scripts/voices.mjs status
//   node scripts/voices.mjs probe  [--panel P | --voices a,b]
//   node scripts/voices.mjs answer --run R --section S [--panel ablation | --voices a,b]
//                                  [--rungs full,options-only,...] [--max-per-voice N] [--retry-errors] [--dry-run]
//   node scripts/voices.mjs ask    --prompt-file F --out O [--panel single | --voices a,b] [--json]
//
// This is the ONLY place in the pipeline that calls a model API. pipeline.mjs
// stays model-free: it writes prompt files and scores replies; this script sends
// the prompt files, unmodified, and files the replies where ablate-score reads
// them (runs/<R>/<S>/ablation/voices/<voice>/<rung>/<NN>.json).
//
// Every voice sees exactly the text in the prompt file — the same text the Claude
// subagent is given. The only per-voice differences are API settings (JSON mode,
// thinking level), and each is recorded in the call record, including any the
// provider rejected and this script therefore dropped.
//
// Free tiers are flaky and capped, so the queue is built to be interrupted:
//   - a reply on disk is never requested again (the files ARE the cache);
//   - a transient failure (503, upstream 429, network) is retried with backoff and,
//     if it persists, left unwritten so the next invocation tries again;
//   - a daily cap, an auth or balance failure, or a model with no quota marks the
//     voice down until its provider's next daily reset (.cache/voices-state.json);
//   - `answer` works through first seeds before later ones, and within a seed
//     answers each question's rungs together, so a run cut short by quota has
//     covered whole questions rather than one rung of many;
//   - a reply cut off by a token limit ("truncated") or empty on a 200 ("empty")
//     is recorded and never scored, and never silently retried forever.
// An API voice structurally cannot read files, which is the isolation the
// quiz-adversary subagent only has behaviourally (HANDOFF §1).

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'scripts', 'voices.json'), 'utf8'));
const STATE_PATH = join(ROOT, '.cache', 'voices-state.json');

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const has = (n) => argv.includes(`--${n}`);
const die = (m) => { console.error(`FAIL ${m}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const nowIso = () => new Date().toISOString();

function writeJson(p, data) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
  return p;
}

// ------------------------------------------------------------------ keys

const KEYS = {};
function key(provider) {
  if (KEYS[provider] !== undefined) return KEYS[provider];
  const pc = CONFIG.providers[provider];
  if (!pc) die(`unknown provider "${provider}"`);
  let k = process.env[pc.env]?.trim() || null;
  if (!k) {
    const kf = resolve(ROOT, pc.key_file);
    // A key file inside the repository could be committed. Refuse it outright.
    if (!relative(ROOT, kf).startsWith('..')) die(`key file ${kf} is inside the repository — move it out`);
    k = existsSync(kf) ? readFileSync(kf, 'utf8').trim() || null : null;
  }
  KEYS[provider] = k;
  return k;
}
const scrub = (s) => {
  let out = String(s);
  for (const k of Object.values(KEYS)) if (k) out = out.split(k).join('***');
  return out;
};

// ----------------------------------------------------------------- state

function loadState() {
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch { return { voices: {} }; }
}
function saveState(s) { writeJson(STATE_PATH, s); }

// The next daily reset of a provider, as an ISO time: five minutes past the next
// local midnight in the provider's reset time zone (Gemini: America/Los_Angeles,
// which moves between 07:00 and 08:00 UTC with daylight saving — review
// 2026-09-23-voices #13; the others: UTC).
function nextReset(provider) {
  const tz = CONFIG.providers[provider]?.reset_tz ?? 'UTC';
  const now = new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' })
    .formatToParts(now).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]));
  const minsToMidnight = 24 * 60 - ((parts.hour % 24) * 60 + parts.minute);
  return new Date(now.getTime() + (minsToMidnight + 5) * 60000).toISOString();
}

function isDown(state, v) {
  const s = state.voices[v.id];
  return s?.down_until && new Date(s.down_until) > new Date() ? s : null;
}
function markDown(state, v, until, reason) {
  state.voices[v.id] = { down_until: until, reason, marked: nowIso() };
  saveState(state);
}

// ---------------------------------------------------------------- voices

function voiceById(id) {
  const v = CONFIG.voices.find((x) => x.id === id);
  if (!v) die(`unknown voice "${id}" — known: ${CONFIG.voices.map((x) => x.id).join(', ')}`);
  return v;
}
function selectVoices(defaultPanel) {
  const list = flag('voices') ? flag('voices').split(',') : CONFIG.panels[flag('panel', defaultPanel)];
  if (!list) die(`unknown panel "${flag('panel')}"`);
  return list.map((id) => voiceById(id.trim()));
}
const usable = (v) => v.enabled !== false;

// ---------------------------------------------------------------- calling

// ------------------------------------------------------------- codex CLI
//
// The OpenAI family through the user's Codex subscription: `codex exec`, one
// fresh process per prompt. Why fresh rather than one long session: a reader
// must never see a second question (cross-question leakage), and a long session
// re-sends its whole growing history every turn. Measured 2026-09-26 from the
// session logs: a fresh exec carries ~33k tokens of Codex's own prompt, ~21k of
// which stays cached across sessions for hours, and nearly all of it when calls
// follow each other within seconds — so run a voice's prompts back to back.
//
// Isolation. A reader voice (workdir "empty") runs in a new empty temp dir with
// a read-only sandbox, as an ephemeral session, with Codex's environment, apps,
// permissions and collaboration preambles switched off. Codex still has a shell,
// so isolation is behavioural, as for the Claude adversary: every tool call in
// the event stream is counted, and a reply that used any tool is recorded as
// status "tool-use" and never scored. A review voice (workdir "repo") runs in
// the repository, read-only, because reading the files is its job.

function codexBin() {
  if (process.env.CODEX_BIN) return process.env.CODEX_BIN;
  for (const raw of CONFIG.providers.codex?.bin_dirs ?? []) {
    const d = raw.replace(/%([A-Z_]+)%/g, (_, k) => process.env[k] ?? '');
    if (!existsSync(d)) continue;
    const f = readdirSync(d).find((x) => /^codex(-x86_64[^.]*)?(\.exe)?$/.test(x));
    if (f) return join(d, f);
  }
  return 'codex';
}

function run(bin, args, input, timeoutMs) {
  return new Promise((res) => {
    const ch = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let out = ''; let err = ''; let timedOut = false;
    const t = setTimeout(() => { timedOut = true; ch.kill(); }, timeoutMs);
    ch.stdout.on('data', (d) => { out += d; });
    ch.stderr.on('data', (d) => { err += d; });
    ch.on('error', (e) => { clearTimeout(t); res({ code: -1, out, err: String(e.message), timedOut }); });
    ch.on('close', (code) => { clearTimeout(t); res({ code, out, err, timedOut }); });
    ch.stdin.end(input);
  });
}

// "try again at 1:27 PM" → that local time today (or tomorrow if past); else +60 min.
function codexRetryAt(msg) {
  const m = String(msg).match(/try again at (\d{1,2}):(\d{2})\s*([AP]M)?/i);
  const d = new Date();
  if (m) {
    let h = Number(m[1]) % 12; if (/pm/i.test(m[3] ?? '')) h += 12; if (!m[3]) h = Number(m[1]);
    const r = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, Number(m[2]) + 2);
    if (r <= d) r.setDate(r.getDate() + 1);
    return r.toISOString();
  }
  return new Date(d.getTime() + 60 * 60000).toISOString();
}

const CODEX_TOOL_ITEMS = new Set(['command_execution', 'file_change', 'mcp_tool_call', 'web_search', 'function_call']);

async function attemptCodex(v, prompt, mode, settings) {
  const reader = v.workdir !== 'repo';
  const work = reader ? mkdtempSync(join(tmpdir(), 'quiz-voice-')) : ROOT;
  const outDir = reader ? work : mkdtempSync(join(tmpdir(), 'quiz-voice-out-'));
  const outFile = join(outDir, 'last.txt');
  // Readers and reviewers are read-only. An author voice (sandbox "workspace-write")
  // may write inside the repo, like the Claude general-purpose author it mirrors.
  const sandbox = reader ? 'read-only' : (v.sandbox ?? 'read-only');
  const args = ['exec', '--json', '--ephemeral', '--skip-git-repo-check', '-C', work, '-s', sandbox, '-m', v.model];
  if (settings.thinking) args.push('-c', `model_reasoning_effort="${settings.thinking}"`);
  if (reader) for (const k of ['include_environment_context', 'include_permissions_instructions', 'include_apps_instructions', 'include_collaboration_mode_instructions']) args.push('-c', `${k}=false`);
  args.push('-o', outFile, '-');
  try {
    const r = await run(codexBin(), args, prompt, v.timeout_ms ?? 600000);
    if (r.timedOut) return { ok: false, cls: 'transient', detail: 'codex exec timed out' };
    const events = r.out.split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const errors = events.filter((e) => e.type === 'error' || e.type === 'turn.failed').map((e) => e.message ?? e.error?.message ?? '');
    const usage = events.filter((e) => e.type === 'turn.completed' && e.usage).map((e) => e.usage).pop() ?? null;
    const toolUses = events.filter((e) => (e.type === 'item.completed' || e.type === 'item.started') && CODEX_TOOL_ITEMS.has(e.item?.type)).length;
    if (errors.length) {
      const msg = errors.join(' | ').slice(0, 400);
      if (/usage limit/i.test(msg)) return { ok: false, cls: 'window', detail: msg, retryAt: codexRetryAt(msg) };
      if (/high demand|overloaded|timed out|temporarily|stream disconnected|5\d\d/i.test(msg)) return { ok: false, cls: 'transient', detail: msg };
      if (/model.*(not (found|supported|available))|unknown model/i.test(msg)) return { ok: false, cls: 'unavailable', detail: msg };
      return { ok: false, cls: 'bad-request', detail: msg };
    }
    if (r.code !== 0) return { ok: false, cls: 'transient', detail: `codex exit ${r.code}: ${r.err.slice(-300)}` };
    const text = existsSync(outFile) ? readFileSync(outFile, 'utf8') : '';
    if (!text.trim()) return { ok: false, cls: 'empty', detail: 'no final message', usage };
    return { ok: true, text, finish: 'stop', usage, model_version: v.model, tool_uses: toolUses };
  } finally {
    if (reader) rmSync(work, { recursive: true, force: true });
    else rmSync(outDir, { recursive: true, force: true });
  }
}

// One HTTP attempt. Returns { ok, text, finish, usage, http, cls, detail, retryAfterMs }.
// `cls` classifies a failure: transient | rate | daily | unavailable | bad-request.
async function attempt(v, prompt, mode, settings) {
  const k = v.provider === 'codex' ? null : key(v.provider);
  if (v.provider === 'codex') return attemptCodex(v, prompt, mode, settings);
  if (!k) return { ok: false, cls: 'unavailable', detail: `no key for ${v.provider}` };
  const base = CONFIG.providers[v.provider].base;
  let url; let init;
  if (v.provider === 'gemini') {
    const gc = {};
    if (settings.temperature != null) gc.temperature = settings.temperature;
    if (settings.thinking) gc.thinkingConfig = { thinkingLevel: settings.thinking };
    if (settings.json) gc.responseMimeType = 'application/json';
    url = `${base}/models/${encodeURIComponent(v.model)}:generateContent`;
    init = { method: 'POST', headers: { 'x-goog-api-key': k, 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: gc }) };
  } else {
    const body = { model: v.model, messages: [{ role: 'user', content: prompt }] };
    if (settings.temperature != null) body.temperature = settings.temperature;
    if (settings.json) body.response_format = { type: 'json_object' };
    url = `${base}/chat/completions`;
    init = { method: 'POST', headers: { authorization: `Bearer ${k}`, 'content-type': 'application/json' }, body: JSON.stringify(body) };
  }
  let res; let raw;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(180000) });
    raw = await res.text();
  } catch (e) {
    return { ok: false, cls: 'transient', detail: `network: ${e.message}` };
  }
  let j = null;
  try { j = JSON.parse(raw); } catch { /* non-JSON error page */ }
  const errMsg = scrub(j?.error?.message ?? j?.message ?? raw).slice(0, 400);
  const errAll = scrub(raw).slice(0, 2000);

  if (res.ok && !j?.error) {
    if (v.provider === 'gemini') {
      const c = j?.candidates?.[0];
      const text = (c?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? '').join('');
      if (!c || !text) return { ok: false, http: res.status, cls: 'empty', detail: `no text (finish ${c?.finishReason ?? 'none'}, block ${j?.promptFeedback?.blockReason ?? 'none'})`, usage: j?.usageMetadata ?? null };
      return { ok: true, http: res.status, text, finish: c.finishReason, usage: j.usageMetadata ?? null, model_version: j.modelVersion ?? null };
    }
    const c = j?.choices?.[0];
    const text = c?.message?.content;
    if (typeof text !== 'string' || !text) return { ok: false, http: res.status, cls: 'empty', detail: `no content (finish ${c?.finish_reason ?? 'none'})`, usage: j?.usage ?? null };
    return { ok: true, http: res.status, text, finish: c.finish_reason, usage: j.usage ?? null, model_version: j.model ?? null };
  }

  // OpenRouter can return HTTP 200 with an error body (an upstream failure), so
  // the error's own code wins over the transport status when there is one.
  const st = (res.ok && Number(j?.error?.code)) || res.status || Number(j?.error?.code) || 0;
  if (/temporarily overloaded|temporarily rate-limited|overloaded|high demand/i.test(errAll) && st !== 429) {
    return { ok: false, http: st, cls: 'transient', detail: errMsg };
  }
  const retryAfter = Number(res.headers.get('retry-after')) * 1000 || null;
  if (v.provider === 'mistral' && st === 429 && res.headers.get('x-ratelimit-limit-req-minute') === '0') {
    return { ok: false, http: st, cls: 'unavailable', detail: 'model has no quota on this plan' };
  }
  if (st === 429) {
    if (/per.?day|PerDay|daily|free-models-per-day/i.test(errAll)) return { ok: false, http: st, cls: 'daily', detail: errMsg };
    if (/temporarily rate-limited upstream|overloaded/i.test(errAll)) return { ok: false, http: st, cls: 'transient', detail: errMsg };
    return { ok: false, http: st, cls: 'rate', detail: errMsg, retryAfterMs: retryAfter };
  }
  if (st === 401 || st === 402 || st === 403 || /insufficient balance|credits are depleted|no longer available/i.test(errAll)) return { ok: false, http: st, cls: 'unavailable', detail: errMsg };
  if (st === 404) return { ok: false, http: st, cls: 'unavailable', detail: errMsg };
  if (st >= 500 || st === 408) return { ok: false, http: st, cls: 'transient', detail: errMsg };
  return { ok: false, http: st, cls: 'bad-request', detail: errMsg };
}

// Settings for a call. None changes a byte of the prompt; all are recorded.
// Temperature is explicit so sampling spread does not vary by provider default.
// A configured thinking level applies to BOTH ablation modes, so a voice's
// explain-vs-letter gap is "asked to explain", not also "allowed to think"
// (review #7). Explain mode asks for JSON where the voice supports it. A
// one-off `ask` (mode "free") keeps the model's own thinking default.
function settingsFor(v, mode) {
  return {
    temperature: v.provider === 'codex' ? null : (v.temperature ?? 1.0),
    thinking: (mode !== 'free' || v.provider === 'codex') && v.thinking ? v.thinking : null,
    json: mode === 'explain' && v.json_mode !== false,
  };
}

const lastCall = {};
async function pace(v) {
  const wait = (lastCall[v.id] ?? 0) + (v.min_interval_ms ?? 1000) - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall[v.id] = Date.now();
}

// A full call with retries. Returns { record } on success or a permanent
// per-request failure, { skip } when it should simply be tried again later, and
// { down } when the voice is out for the day.
async function callVoice(v, prompt, mode, state) {
  const settings = settingsFor(v, mode);
  const dropped = [];
  const t0 = Date.now();
  const backoff = [3000, 10000, 30000];
  let last;
  for (let i = 0; i <= backoff.length; i += 1) {
    await pace(v);
    last = await attempt(v, prompt, mode, settings);
    // A reply cut off by a token limit is recorded but never scored: its text is
    // a fragment, and counting it would turn a delivery failure into a miss (#8).
    if (last.ok && last.tool_uses) {
      return { record: { status: 'tool-use', tool_uses: last.tool_uses, reply_text: last.text, usage: last.usage, model_version: last.model_version, settings, settings_dropped: dropped, attempts: i + 1, latency_ms: Date.now() - t0 } };
    }
    if (last.ok && !/^(stop|end_turn|STOP)$/.test(String(last.finish ?? 'stop'))) {
      return { record: { status: 'truncated', reply_text: last.text, finish: last.finish, usage: last.usage, model_version: last.model_version, settings, settings_dropped: dropped, attempts: i + 1, latency_ms: Date.now() - t0 } };
    }
    if (last.ok) {
      return { record: { status: 'ok', reply_text: last.text, finish: last.finish, usage: last.usage, model_version: last.model_version, settings, settings_dropped: dropped, attempts: i + 1, latency_ms: Date.now() - t0 } };
    }
    if (last.cls === 'window') {
      markDown(state, v, last.retryAt, `window: ${last.detail}`);
      return { down: `usage window until ${last.retryAt}` };
    }
    if (last.cls === 'daily' || last.cls === 'unavailable') {
      markDown(state, v, nextReset(v.provider), `${last.cls}: ${last.detail}`);
      return { down: `${last.cls}: ${last.detail}` };
    }
    // Empty content on a 200 is a real outcome — typically a reasoning model that
    // spent its budget thinking — and is recorded, not retried forever: retrying
    // would lose exactly the questions that made a model think longest (#8).
    if (last.cls === 'empty') {
      return { record: { status: 'empty', http: last.http, error: last.detail, usage: last.usage ?? null, settings, settings_dropped: dropped, attempts: i + 1, latency_ms: Date.now() - t0 } };
    }
    if (last.cls === 'bad-request') {
      // A rejected optional setting is dropped and the call retried once without
      // it; the drop is recorded. Anything else is this request's permanent failure.
      if (settings.thinking && /thinking/i.test(last.detail)) { dropped.push('thinking'); settings.thinking = null; continue; }
      if (settings.json && /response_format|responseMimeType/.test(last.detail)) { dropped.push('json'); settings.json = false; continue; }
      if (settings.temperature != null && /temperature/i.test(last.detail)) { dropped.push('temperature'); settings.temperature = null; continue; }
      return { record: { status: 'error', http: last.http, error: last.detail, settings, settings_dropped: dropped, attempts: i + 1, latency_ms: Date.now() - t0 } };
    }
    if (i < backoff.length) await sleep(last.cls === 'rate' && last.retryAfterMs ? Math.min(last.retryAfterMs, 65000) : backoff[i]);
  }
  return { skip: `${last.cls} x${backoff.length + 1}: ${last.detail}` };
}

// ---------------------------------------------------------------- commands

function cmdStatus() {
  const state = loadState();
  console.log('voice              family         provider    model                                    status');
  for (const v of CONFIG.voices) {
    const d = isDown(state, v);
    const s = !usable(v) ? `disabled — ${v.disabled_why ?? ''}` : d ? `down until ${d.down_until} — ${d.reason.slice(0, 80)}` : (v.provider === 'codex' || key(v.provider) ? 'up (not probed)' : 'no key');
    console.log(`${v.id.padEnd(18)} ${v.family.padEnd(14)} ${v.provider.padEnd(11)} ${v.model.padEnd(40)} ${s}`);
  }
  for (const [name, list] of Object.entries(CONFIG.panels)) if (!name.startsWith('_')) console.log(`panel ${name}: ${list.join(', ')}`);
}

async function cmdProbe() {
  const state = loadState();
  const voices = flag('voices') || flag('panel') ? selectVoices('ablation') : CONFIG.voices;
  await Promise.all(voices.map(async (v) => {
    if (!usable(v)) { console.log(`${v.id.padEnd(18)} disabled`); return; }
    const r = await attempt(v, 'Reply with the single letter B.', 'letter', settingsFor(v, 'letter'));
    if (r.ok) { delete state.voices[v.id]; console.log(`${v.id.padEnd(18)} OK   "${r.text.trim().slice(0, 20)}"`); return; }
    if (r.cls === 'window') markDown(state, v, r.retryAt, `window: ${r.detail}`);
    if (r.cls === 'daily' || r.cls === 'unavailable') markDown(state, v, nextReset(v.provider), `${r.cls}: ${r.detail}`);
    console.log(`${v.id.padEnd(18)} ${r.cls.toUpperCase().padEnd(11)} ${r.http ?? ''} ${r.detail.slice(0, 140)}`);
  }));
  saveState(state);
}

async function cmdAnswer() {
  const label = flag('run'); const slug = flag('section');
  if (!label || !slug) die('answer needs --run and --section');
  const ad = join(ROOT, 'runs', label, slug, 'ablation');
  const manPath = join(ad, 'manifest.json');
  if (!existsSync(manPath)) die(`no ${manPath} — run pipeline.mjs ablate first`);
  const man = JSON.parse(readFileSync(manPath, 'utf8'));
  const apiRungs = new Set(['full', 'options-only', 'full-explain', 'options-only-explain']);
  const want = flag('rungs') ? new Set(flag('rungs').split(',')) : null;
  const maxPer = Number(flag('max-per-voice', 'Infinity'));
  const retryErrors = has('retry-errors');
  const dry = has('dry-run');
  const offset = man.seed_offset ?? 0;
  const rungOrder = ['full', 'options-only', 'full-explain', 'options-only-explain'];
  const entries = man.entries
    .filter((e) => apiRungs.has(e.rung) && (!want || want.has(e.rung)))
    // Seed, then QUESTION, then rung: each question's rungs are answered together,
    // so a voice cut off by quota has compared its rungs on the same questions (#3).
    .sort((a, b) => (a.seed - offset) - (b.seed - offset) || a.id.localeCompare(b.id) || rungOrder.indexOf(a.rung) - rungOrder.indexOf(b.rung));
  if (!entries.length) die('no API-answerable prompts in this manifest for the requested rungs');

  const state = loadState();
  const voices = selectVoices('ablation');
  const vdir = join(ad, 'voices');
  const logPath = join(vdir, 'calls.jsonl');
  const summary = {};

  await Promise.all(voices.map(async (v) => {
    const s = (summary[v.id] = { answered: 0, cached: 0, errors: 0, skipped: 0, stopped: null });
    if (!usable(v)) { s.stopped = `disabled — ${v.disabled_why ?? ''}`; return; }
    const d = isDown(state, v);
    if (d) { s.stopped = `down until ${d.down_until}`; return; }
    if (!dry) writeJson(join(vdir, v.id, 'voice.json'), { id: v.id, provider: v.provider, model: v.model, family: v.family });
    let consecutiveSkips = 0;
    for (const e of entries) {
      const out = join(vdir, v.id, `${e.file}.json`);
      if (existsSync(out)) {
        const prev = JSON.parse(readFileSync(out, 'utf8'));
        if (prev.status === 'ok' || !retryErrors) { s.cached += 1; continue; }
      }
      if (s.answered + s.errors >= maxPer) { s.stopped = `--max-per-voice ${maxPer}`; break; }
      // A scarce voice (a subscription window, not a free API) carries its own cap.
      if (v.max_per_invocation != null && s.answered + s.errors >= v.max_per_invocation) { s.stopped = `max_per_invocation ${v.max_per_invocation} (voices.json)`; break; }
      if (dry) { s.answered += 1; continue; }
      const prompt = readFileSync(join(ad, `${e.file}.txt`), 'utf8');
      const mode = e.rung.endsWith('-explain') ? 'explain' : 'letter';
      const r = await callVoice(v, prompt, mode, state);
      appendFileSync(logPath, `${JSON.stringify({ ts: nowIso(), voice: v.id, file: e.file, result: r.record?.status ?? (r.down ? 'down' : 'skip'), detail: r.record?.error ?? r.down ?? r.skip ?? null })}\n`);
      if (r.down) { s.stopped = r.down.slice(0, 160); break; }
      if (r.skip) {
        s.skipped += 1; consecutiveSkips += 1;
        // A provider failing every request is effectively down; stop hammering it.
        if (consecutiveSkips >= 3) { s.stopped = `3 consecutive failures, last: ${r.skip.slice(0, 120)}`; break; }
        continue;
      }
      consecutiveSkips = 0;
      writeJson(out, {
        file: e.file, voice: v.id, provider: v.provider, model: v.model, family: v.family, mode,
        prompt_sha256: sha256(prompt), ts: nowIso(), ...r.record,
      });
      if (r.record.status === 'ok') s.answered += 1; else { s.errors += 1; (s.not_ok ??= {})[r.record.status] = (s.not_ok?.[r.record.status] ?? 0) + 1; }
    }
  }));

  console.log(`voices   ${label}/${slug}: ${entries.length} API-answerable prompt(s)${dry ? ' (dry run — nothing sent)' : ''}`);
  for (const [id, s] of Object.entries(summary)) {
    console.log(`         ${id.padEnd(18)} new ${String(s.answered).padStart(4)}  cached ${String(s.cached).padStart(4)}  not-ok ${String(s.errors).padStart(3)}${s.not_ok ? ` (${Object.entries(s.not_ok).map(([k, n]) => `${k} ${n}`).join(', ')})` : ''}  retry-later ${String(s.skipped).padStart(3)}${s.stopped ? `  stopped: ${s.stopped}` : ''}`);
  }
  if (!dry) {
    appendFileSync(join(ROOT, 'runs', label, 'run.log'), `${JSON.stringify({ ts: nowIso(), stage: 'voices', section: slug, voices: summary, ok: true })}\n`);
    const remaining = Object.values(summary).some((s) => s.stopped || s.skipped);
    if (remaining) console.log('         some prompts are unanswered; re-run later — answered prompts are never re-sent');
  }
}

async function cmdAsk() {
  const pf = flag('prompt-file'); const out = flag('out');
  if (!pf || !out) die('ask needs --prompt-file and --out');
  const prompt = readFileSync(resolve(ROOT, pf), 'utf8');
  const state = loadState();
  const mode = has('json') ? 'explain' : 'free';
  for (const v of selectVoices('single')) {
    if (!usable(v) || isDown(state, v)) { console.log(`skip  ${v.id} (${usable(v) ? 'down' : 'disabled'})`); continue; }
    const r = await callVoice(v, prompt, mode, state);
    if (r.record?.status === 'ok') {
      writeFileSync(resolve(ROOT, out), r.record.reply_text, 'utf8');
      writeJson(`${resolve(ROOT, out)}.meta.json`, { voice: v.id, provider: v.provider, model: v.model, family: v.family, prompt_file: pf, prompt_sha256: sha256(prompt), ts: nowIso(), ...r.record, reply_text: undefined });
      console.log(`OK    ${out}  (${v.id}, ${v.model}, finish ${r.record.finish})`);
      return;
    }
    console.log(`fall  ${v.id}: ${(r.record?.error ?? r.down ?? r.skip ?? '').slice(0, 160)}`);
  }
  die('no voice in the chain could answer; see above');
}

const commands = { status: cmdStatus, probe: cmdProbe, answer: cmdAnswer, ask: cmdAsk };
if (!commands[cmd]) die(`usage: node scripts/voices.mjs <${Object.keys(commands).join('|')}> [flags] — see the header of this file`);
await commands[cmd]();
