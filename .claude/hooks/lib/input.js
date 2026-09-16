'use strict';
const fs = require('fs');

function parseInput(raw) {
  let json = {};
  try { json = JSON.parse(raw || '{}'); } catch { json = {}; }
  if (!json || typeof json !== 'object') json = {};
  const ti = json.tool_input && typeof json.tool_input === 'object' ? json.tool_input : {};
  return {
    event: json.hook_event_name || '',
    tool: json.tool_name || '',
    cwd: process.env.CLAUDE_PROJECT_DIR || json.cwd || process.cwd(),
    command: typeof ti.command === 'string' ? ti.command : '',
    filePath: ti.file_path || ti.filePath || '',
    oldString: ti.old_string || '',
    newString: ti.new_string || '',
    content: ti.content || '',
    skill: ti.skill || ti.name || '',
    raw: json,
  };
}

function readInput() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { raw = ''; }
  return parseInput(raw);
}

module.exports = { parseInput, readInput };
