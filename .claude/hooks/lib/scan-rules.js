'use strict';
const { matchesAny } = require('./glob');

// PRIMITIVE_DIR excludes UI component libraries and test utilities from HTML/XSS checks
// (their tag definitions and wrapper implementations would otherwise self-flag).
// .claude/hooks/lib is included because the scanner's own regex pattern definitions
// (e.g., const XSS = /...innerHTML.../) would trigger false positives.
const PRIMITIVE_DIR = /\/(ui|atoms|primitives)\/|ui-kit\/|^docs\/|\/__tests__\/|\.claude\/hooks\/lib\//;
const SECRET_SKIP = /(^|[\/._-])(tests?|spec|__tests__|mocks?|examples?|fixtures?|seeds?|\.superpowers)([\/._-]|$)|(^|\/)\.env/i;
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

// A line is comment-only when nothing but whitespace remains after removing every
// block comment (with optional JSX braces) — or when the remainder is a line comment.
function isCommentOnly(line) {
  const rest = line.replace(/\{?\/\*.*?\*\/\}?/g, '').trim();
  return rest === '' || rest.startsWith('//');
}

function firstMatch(lines, re, skipComments = false) {
  for (let i = 0; i < lines.length; i++) {
    if (skipComments && isCommentOnly(lines[i])) continue;
    if (re.test(lines[i])) return { n: i + 1, line: lines[i].trim() };
  }
  return null;
}

function allMatches(lines, re, skipComments = false) {
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    if (skipComments && isCommentOnly(lines[i])) continue;
    if (re.test(lines[i])) matches.push({ n: i + 1, line: lines[i].trim() });
  }
  return matches;
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
  if (isJsLike(ext)) {
    for (const m of allMatches(lines, NON_SHADCN)) block(at(m, 'NON-SHADCN UI LIBRARY (use shadcn/ui from @/components/ui/)'));
    if (!PRIMITIVE_DIR.test(rel)) {
      for (const m of allMatches(lines, NATIVE_DIALOG, true)) block(at(m, 'NATIVE BROWSER DIALOG (use ConfirmDialog/AlertDialog wrapper or toast)'));
    }
  }
  if (isReact(ext)) {
    if ((m = firstMatch(lines, /#[0-9a-fA-F]{3,8}\b/, true))) warn(at(m, 'hardcoded color (use design token)'));
    if ((m = firstMatch(lines, /style=\{\{?/))) warn(at(m, 'inline style (use CSS class/token)'));
    if ((m = firstMatch(lines, /-\[[0-9]+px\]/))) warn(at(m, 'arbitrary pixel value (use spacing token)'));
    if (!PRIMITIVE_DIR.test(rel)) {
      for (const m of allMatches(lines, RAW_HTML, true)) block(at(m, 'RAW HTML ELEMENT (use project wrapper: Input/Button/Select/Textarea/Dialog/Table)'));
    }
  }
  const secretExempt = SECRET_SKIP.test(rel) || matchesAny(rel, opts.skipPaths || []);
  if (!secretExempt) {
    for (const m of allMatches(lines, SECRET)) block(at(m, 'HARDCODED SECRET (move to env)'));
  }
  if (SQLI[ext]) {
    for (const m of allMatches(lines, SQLI[ext])) block(at(m, 'SQL INJECTION (use parameterized query)'));
  }
  if (isJsLike(ext) && !PRIMITIVE_DIR.test(rel)) {
    for (const m of allMatches(lines, XSS)) block(at(m, 'RAW HTML INJECTION / XSS RISK (use sanitizing wrapper component)'));
  }
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
