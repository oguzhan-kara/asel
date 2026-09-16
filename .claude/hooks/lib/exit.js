'use strict';

function finish(level, message, io = {}) {
  const stderr = io.stderr || process.stderr;
  const exit = io.exit || process.exit;
  if (!message) return exit(0);
  stderr.write(message.endsWith('\n') ? message : message + '\n');
  return exit(level === 'block' ? 2 : 0);
}

/** Surfaces config-loading problems (bad JSON, unreadable file) without changing the exit code. */
function emitWarnings(warnings, io = {}) {
  const stderr = io.stderr || process.stderr;
  for (const w of warnings || []) stderr.write(`asel: ${w}\n`);
}

module.exports = { finish, emitWarnings };
