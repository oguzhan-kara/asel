'use strict';

function globToRegExp(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      i++;
      if (pattern[i + 1] === '/') { i++; re += '(?:.*/)?'; } else { re += '.*'; }
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '.';
    else if ('.+^$(){}[]|\\'.includes(c)) re += '\\' + c;
    else re += c;
  }
  return new RegExp('^' + re + '$');
}

function matchesAny(file, patterns = []) {
  const f = file.replace(/\\/g, '/');
  return patterns.some((p) => globToRegExp(p).test(f));
}

module.exports = { globToRegExp, matchesAny };
