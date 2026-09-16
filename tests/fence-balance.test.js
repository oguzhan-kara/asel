'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { walk, ROOT } = require('./helpers/walk');

// Strict fence walker (CommonMark fences do not nest): a fence line is
// `^\s{0,3}(`{3,}|~{3,})(.*)$`. While no fence is open, such a line always
// OPENS one (an info string after the marker is allowed and ignored for
// matching purposes). While a fence IS open, a later fence-marker line
// closes it only if the marker character matches, its run length is >= the
// opener's, and nothing but whitespace follows it — otherwise the line is
// just literal fence content, even if it looks like another fence marker.
//
// This is exactly how an inner ```lang example block gets misread: writing
// an outer ```markdown template that itself contains a nested ```sql (or
// ```bash, ```nginx, ...) block using the SAME 3-backtick run length means
// the nested block's own bare closer satisfies the OUTER's closing rule
// (same char, length >= 3, blank rest) and ends the outer fence early. Every
// line after that point is misparsed: real headings can get trapped inside
// a fence that should already be closed, or — just as bad — intentional
// template headings can leak OUT as if they were real document structure,
// and the file can even end with a fence still open. The fix is always the
// same: give the OUTER fence a longer run of backticks than anything nested
// inside it (```markdown -> ````markdown, closer ``` -> ````), so no inner
// 3-backtick block can ever satisfy the outer's closing rule.
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})(.*)$/;

function walkFile(text) {
  const lines = text.split(/\r?\n/);
  let open = null; // { char, length, line }
  const failures = [];
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];
    const m = line.match(FENCE_RE);
    if (m) {
      const run = m[1];
      const rest = m[2];
      const char = run[0];
      const length = run.length;
      if (!open) {
        open = { char, length, line: lineNo };
      } else if (char === open.char && length >= open.length && rest.trim() === '') {
        open = null;
      } else if (rest.trim() !== '' && length >= open.length) {
        // A line that looks like it wants to open ANOTHER fence while one is
        // already open, using a run at least as long as the current
        // opener's — this is the exact "the outer fence needs more
        // backticks than anything nested inside it" bug. (A shorter run,
        // e.g. a ```sql block safely nested inside a ````markdown outer, is
        // legitimate and is not flagged: it can never satisfy the outer's
        // closing rule.)
        failures.push({
          lineNo,
          line,
          reason:
            `nested fence marker (length ${length}) at least as long as the still-open outer fence opened at line ${open.line} (length ${open.length}) — bump the outer fence to more backticks than any nested block`,
        });
        // The line remains fence content either way (its rest is non-blank,
        // so it cannot close per the rule above) — keep walking with the
        // same fence considered open.
      }
      continue;
    }
    if (open && /^> Read /.test(line)) {
      // A split-tooling pointer line must never end up inside a fence: we
      // always insert these between sections, never inside example content.
      // Finding one while a fence is open means a cut boundary landed in
      // the wrong place (or drift from the bug above swallowed it).
      failures.push({ lineNo, line, reason: `pointer line found while a fence (opened at line ${open.line}) is open` });
    }
  }
  if (open) {
    failures.push({ lineNo: open.line, line: lines[open.line - 1], reason: 'file ends with this fence still open' });
  }
  return failures;
}

test('every .md file under .claude/ has a balanced (even) fence-marker count', () => {
  const files = walk(path.join(ROOT, '.claude'), (f) => /\.md$/.test(f));
  const offenders = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const failures = walkFile(text);
    if (failures.length) {
      offenders.push({ f: path.relative(ROOT, f), failures });
    }
  }
  assert.deepStrictEqual(offenders, [], `fence problems (unclosed fence, illegal nesting, or a swallowed pointer line): ${JSON.stringify(offenders, null, 2)}`);
});
