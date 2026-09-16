'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { scanFiles } = require('../.claude/hooks/lib/scan-rules');
const { runHook } = require('./helpers/run-hook');

const SKIP = ['**/__tests__/**', '**/*.test.*'];

test('collects a secret, a SQL injection and a raw <input> from one file in one run', () => {
  const text = [
    "const password = 'hunter2hunter2';",
    'db.query(`SELECT * FROM t WHERE id = ${id}`);',
    '<input value={x} />',
  ].join('\n');
  const r = scanFiles([{ rel: 'src/Form.tsx', text }], { skipPaths: SKIP });
  assert.strictEqual(r.blockers.length, 3, JSON.stringify(r));
  assert.ok(r.blockers.some((b) => /HARDCODED SECRET/.test(b)));
  assert.ok(r.blockers.some((b) => /SQL INJECTION/.test(b)));
  assert.ok(r.blockers.some((b) => /RAW HTML ELEMENT/.test(b)));
});

test('warnings: size, console.log, any, hex colour, inline style, arbitrary px', () => {
  const big = Array.from({ length: 401 }, (_, i) => `// ${i}`).join('\n');
  const r1 = scanFiles([{ rel: 'src/a.ts', text: big }], { skipPaths: SKIP });
  assert.ok(r1.warnings.some((w) => /too large/.test(w)));
  const text = ["console.log('x');", 'const v: any = 1;', "<div style={{ color: '#ff0000' }} className=\"w-[13px]\" />"].join('\n');
  const r2 = scanFiles([{ rel: 'src/b.tsx', text }], { skipPaths: SKIP });
  for (const re of [/console\.log/, /any type/, /hardcoded color/, /inline style/, /arbitrary pixel/]) {
    assert.ok(r2.warnings.some((w) => re.test(w)), String(re));
  }
  assert.deepStrictEqual(r2.blockers, []);
});

test('blockers: non-shadcn import, native dialog, XSS; primitives dir exempt from HTML/XSS rules', () => {
  const text = ["import { Button } from '@mui/material';", 'window.confirm("x");', 'el.innerHTML = html;'].join('\n');
  const r = scanFiles([{ rel: 'src/pages/P.tsx', text }], { skipPaths: SKIP });
  assert.strictEqual(r.blockers.length, 3, JSON.stringify(r));
  const r2 = scanFiles([{ rel: 'src/components/ui/button.tsx', text: '<button />\nel.innerHTML = x;' }], { skipPaths: SKIP });
  assert.deepStrictEqual(r2.blockers, []);
});

test('skipPaths exempt secrets only, never SQL/XSS', () => {
  const text = ["const apiKey = 'abcdefghijklmnop';", 'cursor.execute(f"SELECT {x}")'].join('\n');
  const r = scanFiles([{ rel: 'src/__tests__/x.py', text }], { skipPaths: SKIP });
  assert.strictEqual(r.blockers.length, 1);
  assert.ok(/SQL INJECTION/.test(r.blockers[0]));
});

test('a leading comment does not hide code on the same line', () => {
  const text = [
    '/* noop */ el.innerHTML = html;',
    '/* c */ window.confirm("x");',
    '{/* c */} <input value={x} />',
    '// <input /> real comment',
    '/* c */ window.confirm("y"); /* end */',
    '/* a */ <input value={y} /> /* b */'
  ].join('\n');
  const r = scanFiles([{ rel: 'src/pages/Q.tsx', text }], { skipPaths: SKIP });
  assert.strictEqual(r.blockers.length, 5, JSON.stringify(r));
  assert.strictEqual(r.blockers.filter((b) => /RAW HTML INJECTION/.test(b)).length, 1);
  assert.strictEqual(r.blockers.filter((b) => /NATIVE BROWSER DIALOG/.test(b)).length, 2);
  assert.strictEqual(r.blockers.filter((b) => /RAW HTML ELEMENT/.test(b)).length, 2);
});

test('non-shadcn and native dialog rules apply to all js-like files, not just react', () => {
  const text = ["import { Button } from '@mui/material';", 'if (window.confirm("y")) {}'].join('\n');
  const r = scanFiles([{ rel: 'src/util/x.ts', text }], { skipPaths: SKIP });
  assert.strictEqual(r.blockers.length, 2, JSON.stringify(r));
  assert.ok(r.blockers.some((b) => /NON-SHADCN/.test(b)));
  assert.ok(r.blockers.some((b) => /NATIVE BROWSER DIALOG/.test(b)));
});

test('hook: ignores non-commit commands, blocks on staged secret, passes when disabled; detects renamed files', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'asel-'));
  execSync('git init -q && git config user.email a@b && git config user.name a', { cwd: d });
  fs.mkdirSync(path.join(d, 'src'));
  fs.writeFileSync(path.join(d, 'src', 'k.ts'), "export const secret = 'supersecretvalue';\n");
  execSync('git add -A', { cwd: d });
  const input = (cmd) => ({ hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: d, tool_input: { command: cmd } });
  assert.strictEqual(runHook('quality-scan', input('git status'), { cwd: d }).code, 0);
  const r = runHook('quality-scan', input('git commit -m x'), { cwd: d });
  assert.strictEqual(r.code, 2);
  assert.match(r.stderr, /HARDCODED SECRET/);

  // Test with a real rename: establish history so git can detect a rename
  fs.writeFileSync(path.join(d, 'src', 'k.ts'), ['// line 1', '// line 2', '// line 3', '// line 4', '// line 5', 'export const a = 1;'].join('\n') + '\n');
  execSync('git add -A && git commit -q -m init', { cwd: d });
  execSync('git mv src/k.ts src/k2.ts', { cwd: d });
  fs.appendFileSync(path.join(d, 'src', 'k2.ts'), "export const secret = 'supersecretvalue';\n");
  execSync('git add -A', { cwd: d });
  const status = execSync('git diff --cached --name-status -M', { cwd: d, encoding: 'utf8' });
  assert.match(status, /^R\d*\s/m, 'fixture must stage a rename: ' + status);
  const rr = runHook('quality-scan', input('git commit -m x'), { cwd: d });
  assert.strictEqual(rr.code, 2);
  assert.match(rr.stderr, /HARDCODED SECRET/);

  // Test disabled config
  execSync('git reset --soft HEAD~0 || true', { cwd: d });
  fs.writeFileSync(path.join(d, 'asel.config.json'), JSON.stringify({ guards: { qualityScan: { enabled: false } } }));
  const r3 = runHook('quality-scan', input('git commit -m z'), { cwd: d });
  assert.strictEqual(r3.code, 0);
});

test('the secret exemption is segment-anchored: src/latest/ is not test-like', () => {
  const secret = "const apiKey = 'sk-live-0123456789abcdef';";
  const blocked = scanFiles([{ rel: 'src/latest/config.ts', text: secret }], { skipPaths: [] });
  assert.ok(blocked.blockers.some((b) => /secret/i.test(JSON.stringify(b))), JSON.stringify(blocked));

  for (const rel of ['src/__tests__/x.ts', 'src/x.test.ts', 'tests/x.ts', 'src/fixtures/x.ts', '.env.local']) {
    const r = scanFiles([{ rel, text: secret }], { skipPaths: [] });
    assert.deepStrictEqual(r.blockers, [], `${rel} must stay exempt`);
  }
});
