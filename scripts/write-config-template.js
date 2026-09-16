'use strict';
const fs = require('fs');
const path = require('path');
const { DEFAULTS } = require('../.claude/hooks/lib/config');
const out = path.join(__dirname, '..', 'asel.config.json');
fs.writeFileSync(out, JSON.stringify(DEFAULTS, null, 2) + '\n');
console.log('wrote', out);
