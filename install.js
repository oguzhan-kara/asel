#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DEFAULTS, deepMerge } = require('./.claude/hooks/lib/config');
const { renderPlaceholders } = require('./.claude/hooks/lib/render');

const SRC = path.join(__dirname, '.claude');
const RENDERABLE = /\.(md|js|json)$/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    e.isDirectory() ? walk(f, out) : out.push(f);
  }
  return out;
}
// null means "the file exists but is not valid JSON" — callers must not overwrite it blindly.
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const rel = (base, f) => path.relative(base, f).replace(/\\/g, '/');

function layout(opts) {
  const home = opts.home || os.homedir();
  if (opts.mode === 'global') {
    const root = path.join(home, '.claude');
    return {
      home, root, configFile: path.join(root, 'asel.config.json'), envExample: null, gitignore: null, settingsFile: path.join(root, 'settings.json'),
      hookRoot: '$HOME/.claude/hooks/asel', aselRoot: '$HOME/.claude/skills/asel',
      map: { skills: 'skills', agents: 'agents', hooks: 'hooks/asel' },
    };
  }
  const target = path.resolve(opts.target);
  const root = path.join(target, '.claude');
  return {
    home, root, configFile: path.join(target, 'asel.config.json'), envExample: path.join(target, '.env.example'), gitignore: path.join(target, '.gitignore'), settingsFile: path.join(root, 'settings.json'),
    hookRoot: '$CLAUDE_PROJECT_DIR/.claude/hooks', aselRoot: '.claude/skills/asel',
    map: { skills: 'skills', agents: 'agents', rules: 'rules', hooks: 'hooks' },
  };
}

function resolveConfig(L) {
  if (fs.existsSync(L.configFile)) return { config: deepMerge(DEFAULTS, readJson(L.configFile) || {}), source: L.configFile };
  return { config: deepMerge(DEFAULTS, {}), source: 'defaults' };
}

function renderedFiles(L, ctx) {
  const out = [];
  for (const [srcDir, dstDir] of Object.entries(L.map)) {
    for (const f of walk(path.join(SRC, srcDir))) {
      const r = rel(path.join(SRC, srcDir), f);
      const dst = path.join(L.root, dstDir, r);
      let content = fs.readFileSync(f);
      if (RENDERABLE.test(f)) content = Buffer.from(renderPlaceholders(content.toString('utf8'), ctx));
      out.push({ src: f, dst, content, key: `${dstDir}/${r}` });
    }
  }
  return out;
}

const HOOK_EVENTS = {
  PreToolUse: [
    { matcher: 'Bash', files: ['gate-guard.js', 'quality-scan.js'] },
    { matcher: 'Skill', files: ['skill-guard.js'] },
    { matcher: 'Edit|Write', files: ['story-done-guard.js', 'setup-guard.js'] },
  ],
  PostToolUse: [{ matcher: 'Edit|Write', files: ['phase-gate-guard.js', 'notify-hook.js'] }],
  Stop: [{ matcher: '', files: ['stop-check.js'] }],
};

function hookEntries(hookRoot) {
  const out = {};
  for (const [event, groups] of Object.entries(HOOK_EVENTS)) {
    out[event] = groups.map((g) => ({ matcher: g.matcher, hooks: g.files.map((f) => ({ type: 'command', command: `node "${hookRoot}/${f}"` })) }));
  }
  return out;
}

function mergeSettings(file, hookRoot) {
  const s = fs.existsSync(file) ? readJson(file) : {};
  if (s === null) throw new Error(`${file} is not valid JSON; nothing was changed`);
  s.hooks = s.hooks || {};
  for (const [event, groups] of Object.entries(hookEntries(hookRoot))) {
    const existing = s.hooks[event] || [];
    const known = new Set(existing.flatMap((g) => (g.hooks || []).map((h) => h.command)));
    for (const g of groups) {
      const fresh = g.hooks.filter((h) => !known.has(h.command));
      if (fresh.length) existing.push({ matcher: g.matcher, hooks: fresh });
    }
    s.hooks[event] = existing;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
}

// The notify hook's state file is local bookkeeping. Never create .gitignore — only extend one.
const NOTIFY_STATE = '.asel-notify-state';
function ignoreNotifyState(file) {
  if (!fs.existsSync(file)) return false;
  const body = fs.readFileSync(file, 'utf8');
  if (body.split(/\r?\n/).some((l) => l.trim() === NOTIFY_STATE)) return false;
  fs.writeFileSync(file, `${body.endsWith('\n') || body === '' ? body : body + '\n'}${NOTIFY_STATE}\n`);
  return true;
}

function install(opts) {
  const L = layout(opts);
  const { config, source } = resolveConfig(L);
  const ctx = { config, hookRoot: L.hookRoot, aselRoot: L.aselRoot, playwrightPrefix: opts.playwrightPrefix || 'mcp__plugin_playwright_playwright' };
  const copied = [];
  for (const f of renderedFiles(L, ctx)) {
    fs.mkdirSync(path.dirname(f.dst), { recursive: true });
    fs.writeFileSync(f.dst, f.content);
    copied.push(f.key);
  }
  const skipped = [];
  if (!fs.existsSync(L.configFile)) { fs.mkdirSync(path.dirname(L.configFile), { recursive: true }); fs.writeFileSync(L.configFile, JSON.stringify(DEFAULTS, null, 2) + '\n'); } else skipped.push(L.configFile);
  if (L.envExample) {
    if (!fs.existsSync(L.envExample)) fs.copyFileSync(path.join(__dirname, '.env.example'), L.envExample); else skipped.push(L.envExample);
  }
  if (L.gitignore) ignoreNotifyState(L.gitignore);
  const hooksMode = opts.hooksMode === 'always' ? 'always' : 'skill';
  if (hooksMode === 'always') mergeSettings(L.settingsFile, L.hookRoot);
  return { copied, skipped, configSource: source, hooksMode, playwrightPrefix: ctx.playwrightPrefix };
}

function check(opts) {
  const L = layout(opts);
  const { config } = resolveConfig(L);
  const ctx = { config, hookRoot: L.hookRoot, aselRoot: L.aselRoot, playwrightPrefix: opts.playwrightPrefix || 'mcp__plugin_playwright_playwright' };
  const expected = new Map(renderedFiles(L, ctx).map((f) => [f.key, f]));
  const added = [], removed = [], modified = [];
  for (const [key, f] of expected) {
    if (!fs.existsSync(f.dst)) removed.push(key);
    else if (!fs.readFileSync(f.dst).equals(f.content)) modified.push(key);
  }
  for (const [, dstDir] of Object.entries(L.map)) {
    for (const f of walk(path.join(L.root, dstDir))) {
      const key = `${dstDir}/${rel(path.join(L.root, dstDir), f)}`;
      if (!expected.has(key) && /asel/i.test(key)) added.push(key);
    }
  }
  return { added: added.sort(), removed: removed.sort(), modified: modified.sort() };
}

function parseArgs(argv) {
  const o = { mode: 'project', hooksMode: 'skill', check: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project') { o.mode = 'project'; o.target = argv[++i]; }
    else if (a === '--global') o.mode = 'global';
    else if (a === '--check') o.check = true;
    else if (a.startsWith('--hooks=')) {
      o.hooksMode = a.slice(8);
      if (o.hooksMode !== 'skill' && o.hooksMode !== 'always') throw new Error(`unknown --hooks value: ${o.hooksMode} (expected skill or always)`);
    } else if (a === '--playwright-prefix') o.playwrightPrefix = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown option: ${a}`);
  }
  if (o.mode === 'project' && !o.target) throw new Error('usage: node install.js --project <dir> | --global [--check] [--hooks=skill|always] [--playwright-prefix <name>]');
  return o;
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.check) {
    const d = check(o);
    console.log(JSON.stringify(d, null, 2));
    process.exit(d.added.length + d.removed.length + d.modified.length ? 1 : 0);
  }
  const r = install(o);
  console.log(`Asel installed (${o.mode}).\n  files: ${r.copied.length}\n  config: ${r.configSource}\n  hooks: ${r.hooksMode}\n  playwright prefix: ${r.playwrightPrefix}\n  kept: ${r.skipped.join(', ') || '-'}`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { install, check, mergeSettings, hookEntries, parseArgs, ignoreNotifyState };
