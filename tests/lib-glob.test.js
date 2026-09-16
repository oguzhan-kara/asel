'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { globToRegExp, matchesAny } = require('../.claude/hooks/lib/glob');

test('globToRegExp handles ** and *', () => {
  assert.ok(globToRegExp('**/__tests__/**').test('src/a/__tests__/b.ts'));
  assert.ok(globToRegExp('**/*.test.*').test('src/x.test.ts'));
  assert.ok(!globToRegExp('docs/**').test('src/docs.ts'));
  assert.ok(globToRegExp('backend/**').test('backend/x/y.java'));
  assert.ok(globToRegExp('Makefile').test('Makefile'));
});

test('matchesAny returns true when any pattern matches', () => {
  assert.ok(matchesAny('docs/a.md', ['src/**', 'docs/**']));
  assert.ok(!matchesAny('lib/a.md', ['src/**', 'docs/**']));
});
