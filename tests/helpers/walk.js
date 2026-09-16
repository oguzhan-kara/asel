'use strict';
const fs = require('fs');
const path = require('path');

function walk(dir, filter = () => true, out = [], excludeDirs = new Set(['node_modules', '.git'])) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludeDirs.has(entry.name)) continue;
      walk(full, filter, out, excludeDirs);
    } else if (filter(full)) {
      out.push(full);
    }
  }
  return out;
}

module.exports = { walk, ROOT: path.resolve(__dirname, '..', '..') };
