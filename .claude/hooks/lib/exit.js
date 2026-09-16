'use strict';

function finish(level, message, io = {}) {
  const stderr = io.stderr || process.stderr;
  const exit = io.exit || process.exit;
  if (!message) return exit(0);
  stderr.write(message.endsWith('\n') ? message : message + '\n');
  return exit(level === 'block' ? 2 : 0);
}

module.exports = { finish };
