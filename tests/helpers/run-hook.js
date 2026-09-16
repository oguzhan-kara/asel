'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const { ROOT } = require('./walk');

function runHook(name, input, opts = {}) {
  const file = path.join(ROOT, '.claude', 'hooks', `${name}.js`);
  const r = spawnSync(process.execPath, [file], {
    input: JSON.stringify(input),
    cwd: opts.cwd || ROOT,
    env: { ...process.env, HOME: opts.home || process.env.HOME, USERPROFILE: opts.home || process.env.USERPROFILE, ...(opts.env || {}) },
    encoding: 'utf8',
  });
  return { code: r.status, stderr: r.stderr || '', stdout: r.stdout || '' };
}

module.exports = { runHook };
