// Generate each harness's agent files from one source per agent.
//
//   node scripts/sync-agents.mjs            write .claude/agents/*.md and .codex/agents/*.toml
//   node scripts/sync-agents.mjs --check    exit 1 if either is out of date (the selftest runs this)
//
// Source: agents/<name>.md. Front matter (flat `key: value` lines):
//   name, description             shared
//   claude_tools, claude_model    → .claude/agents/<name>.md front matter (tools, model)
//   codex_model, codex_reasoning_effort → .codex/agents/<name>.toml (model, model_reasoning_effort)
// Body: shared Markdown, plus harness-only blocks:
//   <!-- only:claude --> … <!-- /only -->     kept for Claude Code, dropped for Codex
//   <!-- only:codex -->  … <!-- /only -->     kept for Codex, dropped for Claude Code
//
// Why generate rather than keep two copies: duplicated rules drift apart, which
// is the rule the whole prompts/ directory exists to enforce. Why not symlink:
// the two harnesses need different formats (Markdown with front matter vs TOML),
// and a Claude-only fact ("tools: [] grants all tools") is false in Codex.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'agents');
const HARNESSES = ['claude', 'codex'];
const check = process.argv.includes('--check');

function parse(file) {
  const text = readFileSync(join(SRC, file), 'utf8').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error(`${file}: no front matter`);
  const fm = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 1) throw new Error(`${file}: bad front-matter line "${line}"`);
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const k of ['name', 'description', 'claude_tools', 'claude_model', 'codex_model', 'codex_reasoning_effort']) {
    if (!fm[k]) throw new Error(`${file}: front matter lacks ${k}`);
  }
  if (`${fm.name}.md` !== file) throw new Error(`${file}: name "${fm.name}" does not match the file name`);
  return { fm, body: text.slice(m[0].length) };
}

// Keep this harness's blocks, drop the others', remove the marker lines. An
// unclosed or nested block, or an unknown harness, is an error, not a guess.
function bodyFor(body, harness, file) {
  const out = [];
  let inside = null;
  for (const line of body.split('\n')) {
    const open = line.match(/^<!-- only:([a-z]+) -->$/);
    if (open) {
      if (inside) throw new Error(`${file}: nested only-block`);
      if (!HARNESSES.includes(open[1])) throw new Error(`${file}: unknown harness "${open[1]}"`);
      inside = open[1];
      continue;
    }
    if (line === '<!-- /only -->') {
      if (!inside) throw new Error(`${file}: /only without only`);
      inside = null;
      continue;
    }
    if (/<!--\s*\/?only/.test(line)) throw new Error(`${file}: malformed only-marker "${line}"`);
    if (!inside || inside === harness) out.push(line);
  }
  if (inside) throw new Error(`${file}: unclosed only:${inside} block`);
  return out.join('\n');
}

const tomlBasic = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function renderClaude({ fm, body }, file) {
  return `---\nname: ${fm.name}\ndescription: ${fm.description}\ntools: ${fm.claude_tools}\nmodel: ${fm.claude_model}\n---\n`
    + `<!-- GENERATED from agents/${file} by scripts/sync-agents.mjs. Edit the source, then run it. -->\n`
    + bodyFor(body, 'claude', file);
}

function renderCodex({ fm, body }, file) {
  const b = bodyFor(body, 'codex', file);
  // A TOML multi-line literal string takes the text verbatim — no escapes to
  // mangle (the hand-imported copies had turned every CRLF into a literal \r).
  if (b.includes("'''")) throw new Error(`${file}: body contains ''' and cannot be a TOML literal string`);
  return `# GENERATED from agents/${file} by scripts/sync-agents.mjs. Edit the source, then run it.\n`
    + `name = ${tomlBasic(fm.name)}\n`
    + `description = ${tomlBasic(fm.description)}\n`
    + `model = ${tomlBasic(fm.codex_model)}\n`
    + `model_reasoning_effort = ${tomlBasic(fm.codex_reasoning_effort)}\n`
    + `developer_instructions = '''\n${b.replace(/\n+$/, '')}\n'''\n`;
}

const targets = [];
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.md')).sort()) {
  const src = parse(file);
  targets.push([join(ROOT, '.claude', 'agents', file), renderClaude(src, file)]);
  targets.push([join(ROOT, '.codex', 'agents', file.replace(/\.md$/, '.toml')), renderCodex(src, file)]);
}

const stale = targets.filter(([p, t]) => !existsSync(p) || readFileSync(p, 'utf8').replace(/\r\n/g, '\n') !== t);
if (check) {
  if (stale.length) {
    console.error(`FAIL agent files out of date — run node scripts/sync-agents.mjs:\n  ${stale.map(([p]) => p.slice(ROOT.length + 1)).join('\n  ')}`);
    process.exit(1);
  }
  console.log(`agents   ${targets.length} generated files match their sources`);
} else {
  for (const [p, t] of stale) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, t, 'utf8'); }
  console.log(`agents   wrote ${stale.length} of ${targets.length} file(s)`);
}
