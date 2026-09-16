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
  const text = ['/* noop */ el.innerHTML = html;', '/* c */ window.confirm("x");', '{/* c */} <input value={x} />', '// <input /> real comment'].join('\n');
  const r = scanFiles([{ rel: 'src/pages/Q.tsx', text }], { skipPaths: SKIP });
  assert.strictEqual(r.blockers.length, 3, JSON.stringify(r));
  assert.ok(r.blockers.some((b) => /RAW HTML INJECTION/.test(b)));
  assert.ok(r.blockers.some((b) => /NATIVE BROWSER DIALOG/.test(b)));
  assert.ok(r.blockers.some((b) => /RAW HTML ELEMENT/.test(b)));
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
  // Reset and test renamed file detection
  execSync('git reset --soft HEAD~0 || true', { cwd: d });
  execSync('git mv src/k.ts src/k2.ts', { cwd: d });
  execSync('git add -A', { cwd: d });
  const r2 = runHook('quality-scan', input('git commit -m y'), { cwd: d });
  assert.strictEqual(r2.code, 2, `renamed file should still be blocked: ${r2.stderr}`);
  assert.match(r2.stderr, /HARDCODED SECRET/);
  // Test disabled config
  execSync('git reset --soft HEAD~0 || true', { cwd: d });
  fs.writeFileSync(path.join(d, 'asel.config.json'), JSON.stringify({ guards: { qualityScan: { enabled: false } } }));
  const r3 = runHook('quality-scan', input('git commit -m z'), { cwd: d });
  assert.strictEqual(r3.code, 0);
});
