'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const { ROOT } = require('./walk');

function runHook(name, input, opts = {}) {
  const file = path.join(ROOT, '.claude', 'hooks', `${name}.js`);
  // CLAUDE_PROJECT_DIR outranks the payload's cwd, so a test run from inside a
  // Claude session must not inherit it — each test states the project dir it wants.
  const base = { ...process.env };
  delete base.CLAUDE_PROJECT_DIR;
  const r = spawnSync(process.execPath, [file], {
    input: JSON.stringify(input),
    cwd: opts.cwd || ROOT,
    env: { ...base, HOME: opts.home || process.env.HOME, USERPROFILE: opts.home || process.env.USERPROFILE, ...(opts.env || {}) },
    encoding: 'utf8',
  });
  return { code: r.status, stderr: r.stderr || '', stdout: r.stdout || '' };
}

module.exports = { runHook };
