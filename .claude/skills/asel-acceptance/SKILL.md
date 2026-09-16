---
name: asel-acceptance
description: Functional acceptance mid-project; 'kabul', 'acceptance'
context: fork
agent: asel-acceptance-tester
---

Run functional acceptance as described in your agent definition against the project at the current working directory, with context "mid-project". Read `{{paths.stories}}` and `docs/PRODUCT.md` first, verify every story acceptance criterion and business rule, and write the acceptance report. Return a summary with pass/fail counts.
