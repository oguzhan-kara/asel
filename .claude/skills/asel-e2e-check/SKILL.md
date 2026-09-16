---
name: asel-e2e-check
description: Scoped browser E2E check; 'test et', 'gez', 'e2e check', 'son N story test'
context: fork
agent: asel-e2e-tester
---

Run a scoped browser E2E pass as described in your agent definition against the project at the current working directory. Mode: e2e-check, headless OFF, dated report, bucket findings as BUG / SCOPE. Read `{{paths.routemap}}` first to resolve the requested scope (all / phase-N / STORY-NNN). Write the dated report and return a summary with the bucketed findings for bulk approval.
