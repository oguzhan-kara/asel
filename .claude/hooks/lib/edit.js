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

const normPath = (p) => {
  const n = path.resolve(p).split(path.sep).join('/');
  return process.platform === 'win32' ? n.toLowerCase() : n;
};

/**
 * True when this Edit/Write targets the project's ROUTEMAP. Matching the configured
 * `paths.routemap` first means a project that renamed it (docs/PLAN.md) is still guarded;
 * the basename check keeps the default convention working when the config is absent.
 */
function isRoutemapEdit(input, config) {
  const rel = input.filePath || '';
  if (!rel) return false;
  const target = path.isAbsolute(rel) ? rel : path.join(input.cwd, rel);
  const routemap = config && config.paths && config.paths.routemap;
  if (routemap && normPath(target) === normPath(path.resolve(input.cwd, routemap))) return true;
  return /routemap/i.test(path.basename(rel));
}

module.exports = { resolveTarget, readCurrent, proposeDocument, isRoutemapEdit };
