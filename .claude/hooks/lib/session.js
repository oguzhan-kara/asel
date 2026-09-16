'use strict';
const fs = require('fs');
const path = require('path');

const EMPTY = { story: '', step: '', mode: '' };

function norm(v) {
  const t = (v || '').trim();
  return t === '—' || t === '-' ? '' : t;
}

function readSession(cwd, claudeMdRel = 'CLAUDE.md') {
  const file = path.join(cwd, claudeMdRel);
  if (!fs.existsSync(file)) return { ...EMPTY };
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/## Asel Session([\s\S]*?)(?:\n## |$)/);
  if (!m) return { ...EMPTY };
  const block = m[1];
  const pick = (key) => {
    const r = block.match(new RegExp(`^- ${key}:\\s*(.*)$`, 'mi'));
    return norm(r ? r[1] : '');
  };
  return { story: pick('Story'), step: pick('Step'), mode: pick('Mode') };
}

module.exports = { readSession };
