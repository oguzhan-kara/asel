'use strict';

const STORY_ID = /STORY-\d+(?:\.\d+)*[a-z]?/;

function splitRow(line) {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
}

function parseRoutemap(text) {
  const rm = { project: 'Project', macroPhase: '', planning: [], phases: [], e2e: [], stories: [] };
  let section = '';
  let phase = null;
  for (const line of text.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^# Project Roadmap:\s*(.+?)\s*$/))) { rm.project = m[1]; continue; }
    if ((m = line.match(/^> Current phase:\s*([A-Za-z_]+)/))) { rm.macroPhase = m[1]; continue; }
    if ((m = line.match(/^## (.+?)(?:\s*\[[^\]]*\])?\s*$/))) { section = m[1].trim(); phase = null; continue; }
    if ((m = line.match(/^### Phase (\d+):\s*(.*?)\s*(?:\[([^\]]+)\])?\s*$/))) {
      phase = { number: Number(m[1]), name: m[2].trim(), status: (m[3] || '').trim(), stories: [] };
      rm.phases.push(phase);
      continue;
    }
    if ((m = line.match(new RegExp(`^\\|\\s*(${STORY_ID.source})\\s*\\|`)))) {
      const c = splitRow(line);
      const row = { id: m[1], title: c[1] || '', status: c[3] || '', step: c[4] || '' };
      row.done = /\[x\]/.test(row.status);
      row.inProgress = /\[~\]/.test(row.status);
      row.escalated = /Escalated/i.test(row.step);
      row.failed = /Failed/i.test(row.step);
      (phase ? phase.stories : rm.stories).push(row);
      continue;
    }
    if (/^E2E/i.test(section) && (m = line.match(/^\|\s*(E\d+)\s*\|/))) {
      const c = splitRow(line);
      rm.e2e.push({ id: m[1], done: /\[x\]/.test(c[2] || '') });
      continue;
    }
    if (/^Planning/i.test(section) && (m = line.match(/^\|\s*(\d+(?:\.\d+)?)\s*\|/))) {
      const c = splitRow(line);
      rm.planning.push({ step: m[1], done: /\[x\]/.test(c[2] || '') });
    }
  }
  rm.stories = rm.phases.flatMap((p) => p.stories).concat(rm.stories);
  return rm;
}

function inProgressPhase(rm) {
  return rm.phases.find((p) => /IN PROGRESS/i.test(p.status)) || null;
}

function progress(rm) {
  const total = rm.stories.length;
  const done = rm.stories.filter((s) => s.done).length;
  return { total, done, pct: total ? Math.floor((done * 100) / total) : 0 };
}

function doneIdsIn(text) {
  const ids = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!/\[x\].*DONE/.test(line)) continue;
    const m = line.match(STORY_ID);
    if (m) ids.add(m[0]);
  }
  return [...ids].sort();
}

module.exports = { parseRoutemap, inProgressPhase, progress, doneIdsIn, STORY_ID };
