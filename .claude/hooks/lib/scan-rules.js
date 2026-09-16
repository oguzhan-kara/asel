'use strict';
const { matchesAny } = require('./glob');

const PRIMITIVE_DIR = /\/(ui|atoms|primitives)\/|ui-kit\/|^docs\/|\/__tests__\/|\.claude\/hooks\/lib\//;
const SECRET_SKIP = /test|mock|example|fixture|seed|\.env|\.superpowers/i;
const DEBUG = {
  ts: /^\s*console\.(log|debug|info)\(/, tsx: /^\s*console\.(log|debug|info)\(/, js: /^\s*console\.(log|debug|info)\(/, jsx: /^\s*console\.(log|debug|info)\(/,
  go: /^\s*fmt\.Print(ln|f)?\(/, py: /^\s*print\(|^\s*breakpoint\(\)|^\s*import\s+pdb/,
  java: /^\s*System\.out\.print|^\s*println\(/, kt: /^\s*System\.out\.print|^\s*println\(/, kts: /^\s*println\(/,
  rs: /^\s*println!\(|^\s*dbg!\(/,
};
const SQLI = {
  ts: /query\s*\(\s*`.*\$\{|execute\s*\(\s*`.*\$\{/, js: /query\s*\(\s*`.*\$\{|execute\s*\(\s*`.*\$\{/,
  tsx: /query\s*\(\s*`.*\$\{|execute\s*\(\s*`.*\$\{/, jsx: /query\s*\(\s*`.*\$\{|execute\s*\(\s*`.*\$\{/,
  py: /execute\s*\(\s*f"|cursor\.execute\s*\(\s*f"/,
  java: /createQuery\s*\(\s*".*"\s*\+\s*|nativeQuery.*"\s*\+\s*/, kt: /createQuery\s*\(\s*".*"\s*\+\s*/, kts: /createQuery\s*\(\s*".*"\s*\+\s*/,
};
const SECRET = /(password|secret|api[_-]?key|private[_-]?key)\s*[:=]\s*["'][^"']{8,}/i;
const XSS = /dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(/;
const NON_SHADCN = /from ['"](@mui\/|antd|@chakra-ui\/|@mantine\/|react-bootstrap|@headlessui\/react)/;
const RAW_HTML = /<(input|button|select|textarea|dialog|table)\b/;
const NATIVE_DIALOG = /(^|[^a-zA-Z0-9_.])(window\.)?(alert|confirm|prompt)\s*\(/;
const isJsLike = (e) => ['ts', 'tsx', 'js', 'jsx'].includes(e);
const isReact = (e) => e === 'tsx' || e === 'jsx';

function firstMatch(lines, re, skipComments = false) {
  for (let i = 0; i < lines.length; i++) {
    if (skipComments && /^\s*(\/\/|\{\/\*|\/\*)/.test(lines[i])) continue;
    if (re.test(lines[i])) return { n: i + 1, line: lines[i].trim() };
  }
  return null;
}

function scanFile(file, opts, out) {
  const { rel, text } = file;
  const ext = rel.includes('.') ? rel.slice(rel.lastIndexOf('.') + 1) : '';
  const lines = text.split(/\r?\n/);
  const warn = (msg) => out.warnings.push(`${rel}: ${msg}`);
  const block = (msg) => out.blockers.push(`${rel}: ${msg}`);
  const at = (m, msg) => `${msg} (line ${m.n}: ${m.line.slice(0, 80)})`;
  let m;

  if (lines.length > 400) warn(`${lines.length} lines — file too large, consider splitting`);
  if (DEBUG[ext] && (m = firstMatch(lines, DEBUG[ext]))) warn(at(m, 'debug statement'));
  if ((ext === 'ts' || ext === 'tsx') && (m = firstMatch(lines, /:\s*any\b|<any>|as\s+any\b/))) warn(at(m, 'any type'));
  if (isReact(ext)) {
    if ((m = firstMatch(lines, /#[0-9a-fA-F]{3,8}\b/, true))) warn(at(m, 'hardcoded color (use design token)'));
    if ((m = firstMatch(lines, /style=\{\{?/))) warn(at(m, 'inline style (use CSS class/token)'));
    if ((m = firstMatch(lines, /-\[[0-9]+px\]/))) warn(at(m, 'arbitrary pixel value (use spacing token)'));
    if ((m = firstMatch(lines, NON_SHADCN))) block(at(m, 'NON-SHADCN UI LIBRARY (use shadcn/ui from @/components/ui/)'));
    if (!PRIMITIVE_DIR.test(rel)) {
      if ((m = firstMatch(lines, RAW_HTML, true))) block(at(m, 'RAW HTML ELEMENT (use project wrapper: Input/Button/Select/Textarea/Dialog/Table)'));
      if ((m = firstMatch(lines, NATIVE_DIALOG, true))) block(at(m, 'NATIVE BROWSER DIALOG (use ConfirmDialog/AlertDialog wrapper or toast)'));
    }
  }
  const secretExempt = SECRET_SKIP.test(rel) || matchesAny(rel, opts.skipPaths || []);
  if (!secretExempt && (m = firstMatch(lines, SECRET))) block(at(m, 'HARDCODED SECRET (move to env)'));
  if (SQLI[ext] && (m = firstMatch(lines, SQLI[ext]))) block(at(m, 'SQL INJECTION (use parameterized query)'));
  if (isJsLike(ext) && !PRIMITIVE_DIR.test(rel) && (m = firstMatch(lines, XSS, true))) block(at(m, 'RAW HTML INJECTION / XSS RISK (use sanitizing wrapper component)'));
}

function scanFiles(files, opts = {}) {
  const out = { blockers: [], warnings: [] };
  for (const f of files) scanFile(f, opts, out);
  return out;
}

function formatReport(r) {
  let s = '';
  if (r.blockers.length) s += 'BLOCKED — security/architecture issues (fix before commit):\n' + r.blockers.map((b) => '  ' + b).join('\n') + '\n';
  if (r.warnings.length) s += (r.blockers.length ? '\n' : '') + 'Quality scan warnings (non-blocking):\n' + r.warnings.map((w) => '  ' + w).join('\n') + '\n';
  return s;
}

module.exports = { scanFiles, formatReport };
