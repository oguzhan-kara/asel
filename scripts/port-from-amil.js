#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { AGENTS } = require('./agent-manifest');

const [amilSrc, amilRules] = process.argv.slice(2);
if (!amilSrc || !amilRules) { console.error('usage: node scripts/port-from-amil.js <AMIL_SRC> <AMIL_RULES_DIR>'); process.exit(1); }
const OUT = path.join(__dirname, '..', '.claude');

const REPLACEMENTS = [
  [/\.amil-notify-state/g, '.asel-notify-state'],
  [/agents\/gate-team\/lead-prompt\.md/g, 'asel-gate-lead'],
  [/agents\/gate-team\/scout-(analysis|testbuild|ui)\.md/g, 'asel-gate-scout-$1'],
  [/agents\/gate-prompt\.md/g, 'asel-legacy-gate'],
  [/agents\/([a-z0-9-]+)-prompt\.md/g, 'asel-$1'],
  [/via Task tool/g, 'via Agent tool'],
  [/Task tool/g, 'Agent tool'],
  [/\bTask\(/g, 'Agent('],
  [/\bTask(?= (?:calls?|dispatch(?:es|ed)?|prompts?|invocations?)\b)/g, 'Agent'],
  [/\bTask-based\b/g, 'Agent-based'],
  [/\(Task, /g, '(Agent, '],
  [/`dev-browser`|dev-browser/g, 'Playwright MCP tools ({{playwrightPrefix}}__browser_*)'],
  [/~\/\.claude\/skills\/amil\/scripts\/notify-telegram\.sh "\$MESSAGE"/g, 'node "{{hookRoot}}/notify-cli.js" "$MESSAGE"'],
  [/\.claude\/skills\/amil\//g, '{{aselRoot}}/'],
  [/\bAmil\b/g, 'Asel'], [/\bamil\b/g, 'asel'], [/\bAMIL\b/g, 'ASEL'],
  [/\s*\(`?model: "(opus|sonnet)"`?\)/g, ''],
  [/\((Agent tool|Agent), `?model: "(?:opus|sonnet)"`?\)/g, '($1)'],
  [/,\s*`?model: "(?:opus|sonnet)"`?(?=\))/g, ''],
  [/ run with `model: "(?:opus|sonnet)"`\. This is NOT optional\./g, ' (model comes from the agent definition).'],
];

function port(text) { return REPLACEMENTS.reduce((t, [re, to]) => t.replace(re, to), text); }
function write(dst, text) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, text); }
function copyTree(srcDir, dstDir) {
  for (const e of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, e.name), d = path.join(dstDir, e.name);
    if (e.isDirectory()) copyTree(s, d); else write(d, port(fs.readFileSync(s, 'utf8')));
  }
}

// 1) phases + templates
copyTree(path.join(amilSrc, 'phases'), path.join(OUT, 'skills', 'asel', 'phases'));
copyTree(path.join(amilSrc, 'templates'), path.join(OUT, 'skills', 'asel', 'templates'));

// 2) agents with frontmatter
for (const a of AGENTS) {
  const body = port(fs.readFileSync(path.join(amilSrc, a.source), 'utf8')).replace(/^---[\s\S]*?---\n/, '');
  const fm = ['---', `name: asel-${a.role}`, `description: ${a.description}`, `tools: ${a.tools}`,
    `model: {{agents.${a.role}.model}}`, `effort: {{agents.${a.role}.effort}}`, a.skills ? `skills: ${a.skills}` : null, '---', ''].filter((x) => x !== null).join('\n');
  write(path.join(OUT, 'agents', `asel-${a.role}.md`), fm + body);
}

// 3) utility skills (asel-setup is rewritten by hand in Task 18, not ported)
for (const s of ['help', 'checkup', 'commit', 'changelog', 'deploy', 'codex-review']) {
  const src = path.join(amilSrc, '..', `amil-${s}`, 'SKILL.md');
  write(path.join(OUT, 'skills', `asel-${s}`, 'SKILL.md'), port(fs.readFileSync(src, 'utf8')));
}

// 4) rules (project-current versions, excluding project-specific build-speed.md)
for (const f of fs.readdirSync(amilRules)) {
  if (!f.endsWith('.md') || f === 'build-speed.md') continue;
  write(path.join(OUT, 'rules', f), port(fs.readFileSync(path.join(amilRules, f), 'utf8')));
}

// 5) report oversize
const big = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (f.endsWith('.md') && fs.readFileSync(f, 'utf8').split(/\r?\n/).length > 400) big.push(path.relative(OUT, f)); } })(OUT);
console.log('ported. files over 400 lines (split by hand):\n  ' + big.join('\n  '));
