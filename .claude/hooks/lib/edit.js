'use strict';
const fs = require('fs');
const path = require('path');

/** Absolute path of the file an Edit/Write targets; falls back to `fallbackRel` under cwd. */
function resolveTarget(input, fallbackRel) {
  const rel = input.filePath || fallbackRel || '';
  return path.isAbsolute(rel) ? rel : path.join(input.cwd, rel);
}

function readCurrent(target) {
  return fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
}

/**
 * The document as it will look after this Edit/Write, or null when the edit
 * cannot apply (old_string absent) — the tool itself will fail in that case.
 */
function proposeDocument(input, current) {
  if (input.tool === 'Write' || (!input.oldString && input.content)) return input.content || '';
  if (!input.oldString || !current.includes(input.oldString)) return null;
  const replaceAll = !!(input.raw && input.raw.tool_input && input.raw.tool_input.replace_all);
  return replaceAll ? current.split(input.oldString).join(input.newString) : current.replace(input.oldString, () => input.newString);
}

module.exports = { resolveTarget, readCurrent, proposeDocument };
