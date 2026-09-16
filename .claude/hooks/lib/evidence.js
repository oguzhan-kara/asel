'use strict';
const fs = require('fs');
const path = require('path');

const CORE_STEPS = ['PLAN', 'DEV', 'GATE', 'REVIEW', 'COMMIT'];
const ARTIFACT_SUFFIX = /-(plan|gate|review|step-log)\.(md|txt)$/;

/** Recursively lists absolute file paths under dir; [] when dir is missing. */
function listFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(full, out);
    else out.push(full);
  }
  return out;
}

function exists(f) { try { return fs.statSync(f).size > 0; } catch { return false; } }
function read(f) { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }

function findStoryFile(cwd, paths, storyId) {
  const root = path.join(cwd, paths.stories);
  const hit = listFiles(root).find((f) => {
    const b = path.basename(f);
    return b.startsWith(storyId + '-') && b.endsWith('.md') && !ARTIFACT_SUFFIX.test(b);
  });
  return hit || null;
}

function findGateReport(cwd, paths, storyId) {
  const dirs = [path.join(cwd, paths.stories), path.join(cwd, paths.reports), path.join(cwd, paths.docs)];
  for (const d of dirs) {
    const hit = listFiles(d).find((f) => {
      const b = path.basename(f);
      return b.startsWith(storyId + '-') && /gate/i.test(b);
    });
    if (hit) return hit;
  }
  return null;
}

function findPhaseGateReport(cwd, paths, phaseNumber) {
  const re = new RegExp(`^phase-${phaseNumber}-gate[^/]*\\.md$`, 'i');
  return listFiles(path.join(cwd, paths.reports)).find((f) => re.test(path.basename(f))) || null;
}

function checkStoryEvidence(cwd, paths, storyId) {
  const storyFile = findStoryFile(cwd, paths, storyId);
  if (!storyFile) return { storyFile: null, missing: [] };
  const dir = path.dirname(storyFile);
  const rel = (f) => path.relative(cwd, f).replace(/\\/g, '/');
  const plan = path.join(dir, `${storyId}-plan.md`);
  const gate = path.join(dir, `${storyId}-gate.md`);
  const review = path.join(dir, `${storyId}-review.md`);
  const stepLog = path.join(dir, `${storyId}-step-log.txt`);
  const missing = [];
  if (!exists(plan)) missing.push(`plan: ${rel(plan)} missing`);
  if (!exists(gate)) missing.push(`gate: ${rel(gate)} missing`);
  if (!exists(review)) missing.push(`review: ${rel(review)} missing`);
  if (!exists(stepLog)) missing.push(`step-log: ${rel(stepLog)} missing`);

  const usertest = path.join(cwd, paths.usertest);
  if (fs.existsSync(usertest) && !new RegExp(`^## ${storyId}:`, 'm').test(read(usertest))) {
    missing.push(`usertest: ${rel(usertest)} has no "## ${storyId}:" section`);
  }
  if (exists(stepLog)) {
    const log = read(stepLog);
    for (const s of CORE_STEPS) {
      if (!new RegExp(`STEP_[0-9.]*[ _]${s}[^A-Za-z].*EXECUTED`).test(log)) missing.push(`step-log-step: ${s} EXECUTED entry missing`);
    }
    if (/<!--\s*ui-story:\s*true\s*-->/.test(read(storyFile)) && !/frontend-design INVOKED/.test(log)) {
      missing.push('ui-story: step-log lacks "frontend-design INVOKED" (mandatory for UI stories)');
    }
  }
  if (exists(review)) {
    const n = (read(review).match(/\|\s*(ESCALATED|OPEN|NEEDS_ATTENTION)\s*\|/g) || []).length;
    if (n > 0) missing.push(`review-unresolved: ${n} unresolved finding(s) in ${rel(review)}`);
  }
  return { storyFile, missing };
}

module.exports = { listFiles, findStoryFile, findGateReport, findPhaseGateReport, checkStoryEvidence, CORE_STEPS };
