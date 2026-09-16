'use strict';
const RO = 'Read, Grep, Glob';
const PW = '{{playwrightPrefix}}__browser_navigate, {{playwrightPrefix}}__browser_snapshot, {{playwrightPrefix}}__browser_click, {{playwrightPrefix}}__browser_type, {{playwrightPrefix}}__browser_fill_form, {{playwrightPrefix}}__browser_take_screenshot, {{playwrightPrefix}}__browser_console_messages, {{playwrightPrefix}}__browser_wait_for, {{playwrightPrefix}}__browser_close';

const AGENTS = [
  { role: 'planner', source: 'agents/planner-prompt.md', description: 'Writes the story implementation plan (tasks, contracts, risks) and FIX-mode plans for bugs.', tools: `${RO}, Write, Edit` },
  { role: 'developer', source: 'agents/developer-prompt.md', description: 'Implements one plan task at a time with tests, following the story plan and architecture.', tools: '*', skills: 'frontend-design' },
  { role: 'gate-lead', source: 'agents/gate-team/lead-prompt.md', description: 'Consolidates scout findings, fixes as single writer, verifies, writes the gate report.', tools: `${RO}, Bash, Write, Edit` },
  { role: 'gate-scout-analysis', source: 'agents/gate-team/scout-analysis.md', description: 'Read-only static analysis scout for the quality gate.', tools: `${RO}, Bash` },
  { role: 'gate-scout-testbuild', source: 'agents/gate-team/scout-testbuild.md', description: 'Runs build and tests for the quality gate; reports failures.', tools: `${RO}, Bash` },
  { role: 'gate-scout-ui', source: 'agents/gate-team/scout-ui.md', description: 'Browser-based UI scout for the quality gate.', tools: `${RO}, Bash, ${PW}` },
  { role: 'reviewer', source: 'agents/reviewer-prompt.md', description: 'Consistency review of story code vs docs; writes the review report with findings.', tools: `${RO}, Write` },
  { role: 'phase-gate', source: 'agents/phase-gate-prompt.md', description: 'Phase boundary gate (deploy, smoke, E2E, compliance); writes the phase gate report.', tools: `${RO}, Bash, Write, Edit, ${PW}` },
  { role: 'devops', source: 'agents/devops-prompt.md', description: 'Tunes infrastructure (Docker, DB, cache) after Phase 1 first story; writes infra-tuning report.', tools: `${RO}, Bash, Write, Edit` },
  { role: 'setup-verifier', source: 'agents/setup-verifier-prompt.md', description: 'Verifies a fresh setup works end to end; writes setup-verification report.', tools: `${RO}, Bash, Write, Edit` },
  { role: 'deploy-engineer', source: 'agents/deploy-engineer-prompt.md', description: 'Builds and deploys via Makefile/compose on demand.', tools: `${RO}, Bash, Write, Edit` },
  { role: 'seed-generator', source: 'agents/seed-generator-prompt.md', description: 'Generates realistic seed data scripts.', tools: '*' },
  { role: 'e2e-tester', source: 'agents/e2e-tester-prompt.md', description: 'Runs browser E2E passes and writes dated E2E reports.', tools: `${RO}, Bash, Write, ${PW}` },
  { role: 'test-hardener', source: 'agents/test-hardener-prompt.md', description: 'Raises test coverage and robustness after E2E.', tools: '*' },
  { role: 'perf-optimizer', source: 'agents/perf-optimizer-prompt.md', description: 'Measures and optimizes performance hotspots.', tools: '*' },
  { role: 'ui-polisher', source: 'agents/ui-polisher-prompt.md', description: 'Polishes UI against design tokens and accessibility.', tools: `${RO}, Bash, Write, Edit, ${PW}` },
  { role: 'acceptance-tester', source: 'agents/acceptance-tester-prompt.md', description: 'Functional acceptance against USERTEST scenarios.', tools: `${RO}, Bash, Write, ${PW}` },
  { role: 'compliance-auditor', source: 'agents/compliance-auditor-prompt.md', description: 'Doc-vs-code compliance audit with gap matrix.', tools: `${RO}, Bash, Write` },
  { role: 'legacy-gate', source: 'agents/gate-prompt.md', description: 'Single-agent quality gate fallback when the gate team cannot be used.', tools: `${RO}, Bash, Write` },
];

// `tools: *` is not a documented frontmatter value — omitting the key is how an
// agent inherits every tool, so these entries get no `tools:` line at all.
const toolsLine = (a) => (a.tools === '*' ? null : `tools: ${a.tools}`);

module.exports = { AGENTS, toolsLine };
