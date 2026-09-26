#!/usr/bin/env node
// Local project dashboard. `npm run status`, then open http://localhost:4747.
//
// Serves status/dashboard.html and a live /api/state built from STATUS.md,
// status/status.json, git, and every worktree's .agent-status/*.json (one file
// per running session; see CLAUDE.md). Read-only: it never writes a file.
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 4747;
const BASE = 'main';
// A registration untouched this long is shown as stale and does not count as active.
const STALE_MS = 3 * 60 * 60 * 1000;

function git(cwd, ...args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function readText(p) {
  try { return readFileSync(p, 'utf8'); } catch { return null; }
}

function readJson(p) {
  const text = readText(p);
  if (text == null) return null;
  try { return JSON.parse(text); } catch (e) { return { error: `${p}: ${e.message}` }; }
}

const norm = p => p.replace(/\\/g, '/').replace(/^\.\//, '');

// "agents/**" matches anything below agents/, "*" stays within one path segment.
function globToRegex(glob) {
  const re = norm(glob)
    .replace(/[.+^${}()|[\]]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0000/g, '.*');
  return new RegExp(`^${re}$`);
}

function worktrees() {
  const list = [];
  let cur = null;
  for (const line of git(ROOT, 'worktree', 'list', '--porcelain').split(/\r?\n/)) {
    if (line.startsWith('worktree ')) list.push(cur = { path: line.slice(9), branch: '(detached)' });
    else if (line.startsWith('HEAD ')) cur.head = line.slice(5, 12);
    else if (line.startsWith('branch ')) cur.branch = line.slice(7).replace('refs/heads/', '');
  }
  return list;
}

// Uncommitted changes in a worktree: Map path -> short git code (M, A, D, ??).
function uncommitted(path) {
  const changed = new Map();
  for (const line of git(path, 'status', '--porcelain=v1').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let file = line.slice(3);
    if (file.includes(' -> ')) file = file.split(' -> ')[1];
    changed.set(norm(file.replace(/^"|"$/g, '')), line.slice(0, 2).trim());
  }
  return changed;
}

function agentsIn(path) {
  const dir = join(path, '.agent-status');
  let names = [];
  try { names = readdirSync(dir).filter(n => n.endsWith('.json')); } catch { return []; }
  return names.map(name => {
    const file = join(dir, name);
    const data = readJson(file) ?? {};
    const mtime = statSync(file).mtimeMs;
    return {
      id: name.replace(/\.json$/, ''),
      agent: data.agent ?? name.replace(/\.json$/, ''),
      task: data.task ?? '',
      plan: Array.isArray(data.plan) ? data.plan : [],
      files: Array.isArray(data.files) ? data.files : [],
      error: data.error,
      updated: new Date(mtime).toISOString(),
      stale: Date.now() - mtime > STALE_MS,
    };
  });
}

function state() {
  const status = readJson(join(ROOT, 'status', 'status.json')) ?? {};
  const hot = (status.hotspots ?? []).map(globToRegex);
  const isHot = p => hot.some(re => re.test(p));

  const trees = worktrees().map((wt, i) => {
    const isMain = i === 0;
    const changed = uncommitted(wt.path);
    const onBranch = !isMain && wt.branch !== BASE
      ? new Set(git(wt.path, 'diff', '--name-only', `${BASE}...HEAD`).split(/\r?\n/).filter(Boolean).map(norm))
      : new Set();
    const agents = agentsIn(wt.path);

    // git reports a new, untracked folder as one entry ("status/"), not per file.
    const newDirs = [...changed.keys()].filter(p => p.endsWith('/'));
    const gitCode = path => changed.get(path) ?? (newDirs.some(d => path.startsWith(d)) ? '??' : null);

    const fileView = (path, declared) => ({
      path,
      hotspot: isHot(path),
      // Active if the agent says so or git sees uncommitted edits; done if committed on the branch.
      state: declared === 'active' || gitCode(path) ? 'active'
        : declared === 'done' || onBranch.has(path) ? 'done' : 'planned',
      git: gitCode(path) ?? (onBranch.has(path) ? 'committed' : null),
      declared: declared != null,
    });

    const claimed = new Set();
    for (const a of agents) {
      a.files = a.files.map(f => {
        const path = norm(typeof f === 'string' ? f : f.path ?? '');
        claimed.add(path);
        return fileView(path, typeof f === 'string' ? 'planned' : f.state ?? 'planned');
      }).filter(f => f.path);
    }
    const unclaimed = [...new Set([...changed.keys(), ...onBranch])]
      .filter(p => !claimed.has(p) && !p.startsWith('.agent-status/'))
      .filter(p => !(p.endsWith('/') && [...claimed].some(c => c.startsWith(p))))
      .map(p => fileView(p, null));
    // With exactly one registered session here, git's changes are its changes.
    const live = agents.filter(a => !a.stale);
    if (live.length === 1) {
      live[0].files.push(...unclaimed);
      unclaimed.length = 0;
    }

    return { path: wt.path, branch: wt.branch, head: wt.head, isMain, agents, unclaimed };
  });

  const activeAgents = trees.flatMap(t => t.agents).filter(a => !a.stale);
  const owners = new Map();
  for (const a of activeAgents) {
    for (const f of a.files) {
      if (f.state === 'done') continue;
      owners.set(f.path, [...(owners.get(f.path) ?? []), a.agent]);
    }
  }
  const overlaps = [...owners].filter(([, who]) => who.length > 1)
    .map(([path, who]) => ({ path, agents: who, hotspot: isHot(path) }));

  const commits = git(ROOT, 'log', BASE, '-12', '--date=short', '--format=%h%x1f%ad%x1f%s')
    .split(/\r?\n/).filter(Boolean)
    .map(l => { const [hash, date, subject] = l.split('\x1f'); return { hash, date, subject }; });

  return {
    generatedAt: new Date().toISOString(),
    status,
    statusMd: readText(join(ROOT, 'STATUS.md')) ?? '',
    commits,
    worktrees: trees,
    activeAgentCount: activeAgents.length,
    overlaps,
  };
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/state') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(state()));
  } else if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(readText(join(ROOT, 'status', 'dashboard.html')) ?? 'status/dashboard.html is missing');
  } else {
    res.writeHead(404).end();
  }
}).listen(PORT, () => console.log(`Project dashboard: http://localhost:${PORT}`));
