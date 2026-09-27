#!/usr/bin/env node
// Send one review request to Gemini and write the response to disk.
//
//   node scripts/gemini-review.mjs --list-models
//   node scripts/gemini-review.mjs --template review-gemini \
//        --set subject="..." --set questions="..." \
//        --files a.md,b.md --out reviews/x.md [--model <name>]
//
// The prompt is rendered from prompts/<template>.md by the same renderer the
// pipeline uses. Gemini cannot read the repository, so each listed file's full
// contents are attached after the prompt, delimited and labelled by path.
//
// The API key is read from GEMINI_API_KEY, or else from --key-file (default
// ../../key-gemini.txt, i.e. maddy-home/key-gemini.txt, which is outside this repo). It
// is sent ONLY as the x-goog-api-key request header — never in a URL, never
// printed, never written to any file. Error bodies are scrubbed of it before
// they are shown.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { renderTemplate, PromptError, ROOT } from './prompts.mjs';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const allFlags = (n) => { const o = []; for (let i = 0; i < argv.length - 1; i++) if (argv[i] === `--${n}`) o.push(argv[i + 1]); return o; };
const die = (m) => { console.error(`FAIL ${m}`); process.exit(1); };

function loadKey() {
  if (process.env.GEMINI_API_KEY?.trim()) return process.env.GEMINI_API_KEY.trim();
  const kf = resolve(ROOT, flag('key-file', '../../key-gemini.txt'));
  if (!existsSync(kf)) die(`no GEMINI_API_KEY and no key file at ${kf}`);
  // A key file inside this repository could be committed. Refuse it outright.
  if (!relative(ROOT, kf).startsWith('..')) die(`key file ${kf} is inside the repository — move it out`);
  const k = readFileSync(kf, 'utf8').trim();
  if (!k) die(`key file ${kf} is empty`);
  return k;
}

const KEY = loadKey();
const scrub = (s) => String(s).split(KEY).join('***');

// Free-tier Gemini returns 503 "high demand" and 500s in bursts. Those are
// retried with backoff; anything else (auth, quota, bad request) fails at once.
async function call(path, init = {}) {
  const waits = [5000, 15000, 30000, 60000, 90000];
  for (let i = 0; ; i += 1) {
    const res = await fetch(`${API}/${path}`, {
      ...init,
      headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json', ...(init.headers || {}) },
    });
    const text = await res.text();
    if (res.ok) return JSON.parse(text);
    if ((res.status === 503 || res.status === 500) && i < waits.length) {
      console.error(`Gemini ${res.status}, retrying in ${waits[i] / 1000}s`);
      await new Promise((r) => setTimeout(r, waits[i]));
      continue;
    }
    die(`Gemini ${res.status}: ${scrub(text).slice(0, 800)}`);
  }
}

if (argv.includes('--list-models')) {
  const j = await call('models?pageSize=200');
  for (const m of j.models || []) {
    if (!(m.supportedGenerationMethods || []).includes('generateContent')) continue;
    console.log(`${m.name.replace(/^models\//, '').padEnd(42)} in:${String(m.inputTokenLimit).padStart(8)}  out:${String(m.outputTokenLimit).padStart(6)}  ${m.displayName}`);
  }
  process.exit(0);
}

const model = flag('model');
const out = flag('out');
const template = flag('template', 'review-gemini');
if (!model) die('--model is required (run --list-models to choose; this script never guesses a model name)');
if (!out) die('--out is required');

const files = (flag('files') || '').split(',').map((f) => f.trim()).filter(Boolean);
if (!files.length) die('--files is required: Gemini sees nothing but what is attached');
for (const f of files) if (!existsSync(resolve(ROOT, f))) die(`attached file not found: ${f}`);

const vars = { files: files.map((f) => `\`${f}\``).join(', ') };
for (const kv of allFlags('set')) {
  const i = kv.indexOf('=');
  if (i < 1) die(`--set expects key=value, got "${kv}"`);
  vars[kv.slice(0, i)] = kv.slice(i + 1);
}
for (const kv of allFlags('set-file')) {
  const i = kv.indexOf('=');
  if (i < 1) die(`--set-file expects key=path, got "${kv}"`);
  vars[kv.slice(0, i)] = readFileSync(resolve(ROOT, kv.slice(i + 1)), 'utf8').trimEnd();
}

let prompt;
try { prompt = renderTemplate(template, vars, {}); } catch (e) { if (e instanceof PromptError) die(e.message); throw e; }

const attached = files.map((f) => {
  const body = readFileSync(resolve(ROOT, f), 'utf8');
  return `===== FILE: ${f} =====\n${body}\n===== END FILE: ${f} =====`;
}).join('\n\n');
const text = `${prompt}\n\n${attached}\n`;
if (text.includes(KEY)) die('refusing to send: the request text contains the API key');

const j = await call(`models/${encodeURIComponent(model)}:generateContent`, {
  method: 'POST',
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: Number(flag('max-out', '32768')) },
  }),
});

const cand = (j.candidates || [])[0];
const reply = (cand?.content?.parts || []).map((p) => p.text || '').join('');
if (!reply.trim()) die(`empty response (finishReason: ${cand?.finishReason ?? 'none'}; block: ${JSON.stringify(j.promptFeedback || {})})`);
const u = j.usageMetadata || {};
const header = `<!-- gemini-review: model=${model} finish=${cand.finishReason} `
  + `tokens_in=${u.promptTokenCount ?? '?'} tokens_out=${u.candidatesTokenCount ?? '?'} template=${template} -->\n\n`;
mkdirSync(dirname(resolve(ROOT, out)), { recursive: true });
writeFileSync(resolve(ROOT, out), header + reply, 'utf8');
console.log(`OK ${out}  (${model}, finish ${cand.finishReason}, in ${u.promptTokenCount ?? '?'} / out ${u.candidatesTokenCount ?? '?'} tokens)`);
