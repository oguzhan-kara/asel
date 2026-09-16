#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { readInput } = require('./lib/input');
const { loadConfig } = require('./lib/config');
const { parseRoutemap, progress } = require('./lib/routemap');
const { sendTelegram } = require('./lib/notify');

const STATE_FILE = '.asel-notify-state';

function phaseComplete(p) { return p.stories.length > 0 && p.stories.every((s) => s.done); }
function planningComplete(rm) { return /COMPLETE|DEVELOPMENT|E2E/i.test(rm.macroPhase); }
function devComplete(rm) { const pr = progress(rm); return pr.total > 0 && pr.done === pr.total; }
function e2eComplete(rm) { return rm.e2e.length > 0 && rm.e2e.every((e) => e.done); }

function seedState(rm) {
  const s = [];
  for (const st of rm.stories) if (st.done) s.push(`STORY:${st.id}`);
  for (const p of rm.phases) if (phaseComplete(p)) s.push(`PHASE:${p.number}`);
  if (planningComplete(rm)) s.push('MACRO:PLANNING');
  if (devComplete(rm)) s.push('MACRO:DEVELOPMENT');
  if (e2eComplete(rm)) s.push('MACRO:E2E');
  return s;
}

function artifact(cwd, paths, id, suffix) {
  const root = path.join(cwd, paths.stories);
  if (!fs.existsSync(root)) return '✗';
  for (const phaseDir of fs.readdirSync(root)) {
    const dir = path.join(root, phaseDir);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (fs.readdirSync(dir).some((f) => f.startsWith(id) && f.endsWith(`${suffix}.md`))) return '✓';
  }
  return '✗';
}

function computeEvents(rm, state, cwd, paths) {
  const events = [];
  const pr = progress(rm);
  const tail = `Toplam: ${pr.done}/${pr.total} (%${pr.pct})`;
  const push = (key, message) => { if (!state.has(key)) events.push({ key, message }); };
  for (const p of rm.phases) {
    const done = p.stories.filter((s) => s.done).length;
    for (const s of p.stories) {
      if (!s.done) continue;
      const a = ['plan', 'gate', 'deliverable', 'review'].map((x) => artifact(cwd, paths, s.id, x));
      if (a[0] === '✗') continue; // premature ROUTEMAP edit; wait for next edit
      push(`STORY:${s.id}`, `📋 *${rm.project}*\n${s.id}: ${s.title} ✓\nPlan ${a[0]} | Gate ${a[1]} | Deliv ${a[2]} | Review ${a[3]}\nPhase ${p.number}: ${done}/${p.stories.length} — ${tail}`);
    }
  }
  for (const s of rm.stories) {
    if (s.escalated) push(`ESCALATED:${s.id}`, `⚠️ *${rm.project}*\n${s.id}: ${s.title} — ESCALATED\nMüdahale gerekli\n${tail}`);
    if (s.failed) push(`FAILED:${s.id}`, `❌ *${rm.project}*\n${s.id}: ${s.title} — FAILED\nMüdahale gerekli\n${tail}`);
  }
  for (const p of rm.phases) {
    if (phaseComplete(p)) push(`PHASE:${p.number}`, `🎯 *${rm.project}*\nPhase ${p.number}: ${p.name} COMPLETE ✓\nStories: ${p.stories.length}/${p.stories.length}\n${tail}`);
  }
  if (planningComplete(rm)) push('MACRO:PLANNING', `🏁 *${rm.project}*\nPLANNING COMPLETE ✓\n${rm.planning.filter((x) => x.done).length} adım tamamlandı\nDevelopment fazına hazır`);
  if (devComplete(rm)) push('MACRO:DEVELOPMENT', `🏁 *${rm.project}*\nDEVELOPMENT COMPLETE ✓\nTüm ${pr.done} story tamamlandı\nE2E & Polish fazına hazır`);
  if (e2eComplete(rm)) push('MACRO:E2E', `🏁 *${rm.project}*\nE2E & POLISH COMPLETE ✓\n${rm.e2e.length} kontrol tamamlandı`);
  return { events };
}

async function main() {
  const input = readInput();
  if (!/routemap/i.test(input.filePath)) return;
  const { config } = loadConfig(input.cwd);
  const rmFile = path.join(input.cwd, config.paths.routemap);
  if (!fs.existsSync(rmFile)) return;
  const rm = parseRoutemap(fs.readFileSync(rmFile, 'utf8'));
  const stateFile = path.join(input.cwd, STATE_FILE);
  if (!fs.existsSync(stateFile)) { fs.writeFileSync(stateFile, seedState(rm).join('\n') + '\n'); return; }
  const state = new Set(fs.readFileSync(stateFile, 'utf8').split(/\r?\n/).filter(Boolean));
  const { events } = computeEvents(rm, state, input.cwd, config.paths);
  for (const e of events) {
    await sendTelegram(config, e.message);
    fs.appendFileSync(stateFile, e.key + '\n');
  }
}

if (require.main === module) main().then(() => process.exit(0), () => process.exit(0));
module.exports = { computeEvents, seedState };
