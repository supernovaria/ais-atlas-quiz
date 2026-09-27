// Spawn-prompt templates: load, lint, render. See prompts/README.md.
//
// Every subagent spawn is built from a file in prompts/. This module is the only
// thing that turns one into text, and it is strict on purpose: an improvised or
// half-filled prompt is exactly what this replaced.
//
//   {{name}}    required — rendering dies if it is missing or empty
//   {{?name}}   optional — renders empty when not supplied
//   {{> part}}  include prompts/_partials/<part>.md (one level; partials may not include)
//
// Front matter (between leading --- lines) documents the template and is never
// sent. Three keys in it are read: `placeholders: [..]`, `optional: [..]`, and
// `paths: [..]` — the placeholders whose values are input files, which the
// caller checks exist before sending.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PROMPT_DIR = join(ROOT, 'prompts');

const PLACEHOLDER = /\{\{(\?)?([a-z_][a-z0-9_]*)\}\}/g;
const INCLUDE = /\{\{>\s*([a-z0-9_-]+)\s*\}\}/g;
const ANY_INCLUDE = /\{\{>\s*[a-z0-9_-]+\s*\}\}/;
const LONE_OPTIONAL = /^\s*\{\{\?([a-z_][a-z0-9_]*)\}\}\s*$/;

export class PromptError extends Error {}

export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

function parseList(line) {
  const m = line.match(/\[(.*)\]/);
  if (!m) return [];
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

// A leading byte-order mark would stop the front matter being recognised, and a
// template with no placeholders would then ship its front matter to the agent.
const clean = (s) => s.replace(/^﻿/, '').replace(/\r\n/g, '\n');

export function loadTemplate(name, dir = PROMPT_DIR) {
  const path = join(dir, `${name}.md`);
  if (!existsSync(path)) throw new PromptError(`no prompt template "${name}" (looked for ${path})`);
  const source = readFileSync(path, 'utf8');
  const raw = clean(source);
  let body = raw;
  let placeholders = [];
  let optional = [];
  let paths = [];
  if (raw.startsWith('---\n')) {
    const end = raw.indexOf('\n---\n', 4);
    if (end === -1) throw new PromptError(`${name}: front matter is not closed`);
    const fm = raw.slice(4, end);
    body = raw.slice(end + 5);
    for (const line of fm.split('\n')) {
      if (/^placeholders:/.test(line)) placeholders = parseList(line);
      if (/^optional:/.test(line)) optional = parseList(line);
      if (/^paths:/.test(line)) paths = parseList(line);
    }
  }
  body = body.replace(INCLUDE, (_, part) => {
    const pp = join(dir, '_partials', `${part}.md`);
    if (!existsSync(pp)) throw new PromptError(`${name}: include "${part}" not found (${pp})`);
    const text = clean(readFileSync(pp, 'utf8'));
    // A separate, non-global regex: calling .test() on INCLUDE itself would move
    // the lastIndex of the regex this replace is iterating with.
    if (ANY_INCLUDE.test(text)) throw new PromptError(`${name}: partial "${part}" may not include another`);
    return text.trimEnd();
  });
  return { name, path, source, body, placeholders, optional, paths };
}

export function loadPartial(part, dir = PROMPT_DIR) {
  const pp = join(dir, '_partials', `${part}.md`);
  if (!existsSync(pp)) throw new PromptError(`partial "${part}" not found (${pp})`);
  return clean(readFileSync(pp, 'utf8')).trim();
}

function used(body) {
  const req = new Set();
  const opt = new Set();
  for (const m of body.matchAll(PLACEHOLDER)) (m[1] ? opt : req).add(m[2]);
  return { req, opt };
}

// A template's front matter must say exactly what its body uses, in both
// directions; auto-filled keys may be used but never declared (a declared auto
// key could be overridden by --set); and nothing brace-shaped may survive that
// is not a real token (`{{ stem }}`, `{{Stem}}` or a stray `}}` would otherwise
// be sent to the agent literally).
export function lintTemplate(tpl, autoKeys = []) {
  const problems = [];
  const { req, opt } = used(tpl.body);
  const auto = new Set(autoKeys);
  const declReq = new Set(tpl.placeholders);
  const declOpt = new Set(tpl.optional);
  for (const n of req) if (!declReq.has(n) && !auto.has(n)) problems.push(`uses {{${n}}} but does not declare it in placeholders`);
  for (const n of opt) if (!declOpt.has(n)) problems.push(`uses {{?${n}}} but does not declare it in optional`);
  for (const n of declReq) if (!req.has(n)) problems.push(`declares placeholder "${n}" but never uses {{${n}}}`);
  for (const n of declOpt) if (!opt.has(n)) problems.push(`declares optional "${n}" but never uses {{?${n}}}`);
  for (const n of declReq) if (declOpt.has(n)) problems.push(`"${n}" is declared both required and optional`);
  for (const n of [...declReq, ...declOpt]) if (auto.has(n)) problems.push(`declares "${n}", which is auto-filled and must not be overridable`);
  for (const n of tpl.paths) if (!declReq.has(n) && !declOpt.has(n)) problems.push(`lists "${n}" in paths but does not declare it`);
  const residue = tpl.body.replace(PLACEHOLDER, '');
  if (/\{\{|\}\}/.test(residue)) {
    const bad = residue.match(/.{0,20}(\{\{|\}\}).{0,20}/)[0].replace(/\n/g, ' ');
    problems.push(`malformed placeholder, would be sent literally: "${bad.trim()}"`);
  }
  return problems;
}

export function listTemplates(dir = PROMPT_DIR) {
  return readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace(/\.md$/, '')).sort();
}

// vars: the per-call values. auto: values the caller fills from code (workdir,
// enums). A var the template does not declare is an error, not a no-op: a typo
// in an optional name would otherwise drop content silently.
//
// Whitespace is normalised in the TEMPLATE only, before any value goes in. A
// line holding nothing but an empty optional is dropped, and blank-line runs in
// the template are collapsed; a value's own spacing — a stem, an option — is
// never touched, so the agent sees exactly the text that ships.
export function renderTemplate(name, vars = {}, auto = {}, dir = PROMPT_DIR) {
  const tpl = loadTemplate(name, dir);
  const lint = lintTemplate(tpl, Object.keys(auto));
  if (lint.length) throw new PromptError(`${name}: template is inconsistent —\n  ${lint.join('\n  ')}`);
  const declared = new Set([...tpl.placeholders, ...tpl.optional]);
  const unknown = Object.keys(vars).filter((k) => !declared.has(k));
  if (unknown.length) throw new PromptError(`${name}: unknown variable(s) ${unknown.join(', ')} — declared: ${[...declared].join(', ') || '(none)'}`);

  const isEmpty = (v) => v == null || String(v) === '';
  const skeleton = tpl.body
    .split('\n')
    .filter((line) => { const m = line.match(LONE_OPTIONAL); return !(m && isEmpty(vars[m[1]])); })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  const missing = [];
  // One pass, so a value containing "{{" is inserted literally and never re-read.
  const text = skeleton.replace(PLACEHOLDER, (_, q, key) => {
    const v = key in vars ? vars[key] : auto[key];
    if (q) return isEmpty(v) ? '' : String(v);
    if (v == null || String(v).trim() === '') { missing.push(key); return ''; }
    return String(v);
  });
  if (missing.length) throw new PromptError(`${name}: required placeholder(s) not filled: ${[...new Set(missing)].join(', ')}`);
  return `${text.replace(/^\n+/, '').trimEnd()}\n`;
}
