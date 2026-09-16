---
name: asel-audit
description: Doc-vs-code compliance audit for the current project; run in an isolated subagent. Invoke for "audit", "compliance", "doğrulama", "kontrol et".
context: fork
agent: asel-compliance-auditor
---

Run the compliance audit as described in your agent definition against the project at the current working directory. Read `{{paths.routemap}}` first. Write the report to `docs/reports/compliance-audit-<YYYY-MM-DD>.md` and return a summary with the gap matrix counts.
