#!/usr/bin/env node
'use strict';
const { loadConfig } = require('./lib/config');
const { sendTelegram } = require('./lib/notify');

const message = process.argv.slice(2).join(' ').trim();
if (!message) process.exit(0);
const { config } = loadConfig(process.cwd());
sendTelegram(config, message).then((r) => {
  if (!r.sent) process.stderr.write(`asel notify: not sent (${r.reason})\n`);
  process.exit(0);
});
