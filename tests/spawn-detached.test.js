'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '.claude', 'hooks', 'lib', 'spawn-detached.js');

function waitForFile(filePath, expectedContent, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content === expectedContent) return true;
    }
  }
  return false;
}

test('spawn-detached.js launches a detached process even when the target path contains spaces', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spawn detached test '));
  try {
    const outFile = path.join(dir, 'out.txt');
    const writeScript = "require('fs').writeFileSync(process.argv[1],'ok')";

    const result = spawnSync(process.execPath, [SCRIPT, '--', process.execPath, '-e', writeScript, outFile], {
      encoding: 'utf8',
    });

    assert.strictEqual(result.status, 0, `spawn-detached.js exited non-zero: ${result.stderr}`);
    const pid = Number.parseInt(result.stdout.trim(), 10);
    assert.ok(Number.isInteger(pid) && pid > 0, `expected a PID on stdout, got: ${JSON.stringify(result.stdout)}`);

    const ok = waitForFile(outFile, 'ok', 3000);
    assert.ok(ok, `expected ${outFile} to contain "ok" within 3s`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function hasBash() {
  const probe = spawnSync('bash', ['-c', 'exit 0'], { encoding: 'utf8' });
  return !probe.error && probe.status === 0;
}

test('spawn-detached.js carries a multi-line bash -c payload', (t) => {
  if (!hasBash()) {
    t.skip('bash is not on PATH');
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spawn detached bash '));
  try {
    const outFile = path.join(dir, 'out.txt');
    const posixOut = outFile.split(path.sep).join('/');
    const body = [
      'set -e',
      `out="${posixOut}"`,
      'cat <<\'EOF\' > "$out.tmp"',
      'ok',
      'drop-me',
      'EOF',
      'grep -v drop-me "$out.tmp" | head -c 2 > "$out"',
      '',
    ].join('\n');

    const result = spawnSync(process.execPath, [SCRIPT, '--', 'bash', '-c', body], { encoding: 'utf8' });

    assert.strictEqual(result.status, 0, `spawn-detached.js exited non-zero: ${result.stderr}`);
    const pid = Number.parseInt(result.stdout.trim(), 10);
    assert.ok(Number.isInteger(pid) && pid > 0, `expected a PID on stdout, got: ${JSON.stringify(result.stdout)}`);

    assert.ok(waitForFile(outFile, 'ok', 3000), `expected ${outFile} to contain "ok" within 3s`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
