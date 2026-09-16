# Documentation Cycle

> Generate specification, presentations, rollout guide, and user guide documents.
> Before starting: Update ROUTEMAP — set `Current phase: DOCUMENTATION`
> After completion: Update ROUTEMAP — Documentation Phase `[DONE]`

## Phase Kickoff

1. Read ROUTEMAP → verify Development Phase AND E2E & Polish Phase are complete
2. If not complete → warn user, suggest completing prior phases first
3. Check pandoc + xelatex availability
4. Create `docs/output/_templates/` directory and LaTeX template if not exists
5. Create subdirectories: `docs/output/specifications/`, `docs/output/presentations/`, `docs/output/rollouts/`, `docs/output/endusers/`

## Documentation Cycle

For each doc set (D1 → D2 → D3 → D4) in order:

```
┌──────────────────────────────────────────────────────────────────┐
│                  DOCUMENTATION CYCLE                              │
│                                                                   │
│  1. OUTLINE                                                       │
│     Read relevant input docs                                      │
│     Prepare content outline / slide outline                       │
│     Present to user                                               │
│                                                                   │
│  2. USER APPROVAL                                                 │
│     User reviews outline                                          │
│     Approves or requests changes                                  │
│     Loop until approved                                           │
│                                                                   │
│  3. GENERATE                                                      │
│     Create document(s) based on approved outline                  │
│     For presentations: create self-contained HTML files           │
│     For user guide: capture screenshots first via Playwright MCP tools ({{playwrightPrefix}}__browser_*)     │
│                                                                   │
│  4. USER REVIEW                                                   │
│     Present generated document to user                            │
│     For presentations: open in browser via Playwright MCP tools ({{playwrightPrefix}}__browser_*)             │
│     User reviews content and formatting                           │
│                                                                   │
│  5. FIX LOOP                                                      │
│     If user requests changes → apply fixes → re-present           │
│     Loop until user approves                                      │
│                                                                   │
│  6. PDF GENERATION (if applicable)                                │
│     Generate PDF via pandoc + xelatex                             │
│     Enterprise-grade template with cover, TOC, headers/footers    │
│                                                                   │
│  7. CLOSE                                                         │
│     Update ROUTEMAP (mark doc set as DONE)                        │
│     Update decisions.md                                           │
│     Display progress bar                                          │
│     Proceed to next doc set                                       │
└──────────────────────────────────────────────────────────────────┘
```

## Doc Sets

| Step | Name | Output Directory | Language | PDF |
|------|------|-----------------|----------|-----|
| D1 | Specification | `docs/output/specifications/` | English | No |
| D2 | Presentations (Sales + Technical) | `docs/output/presentations/` | English | No (HTML) |
| D3 | Rollout Guide | `docs/output/rollouts/` | English | Yes |
| D4 | User Guide | `docs/output/endusers/` | Turkish | Yes |

## User Guide Special Process

D4 (User Guide) has a unique 3-phase process:
1. **Phase A — Screenshots**: Use Playwright MCP tools ({{playwrightPrefix}}__browser_*) to navigate all screens, capture screenshots
2. **Phase B — Writing**: Create user-guide.md with embedded screenshots
3. **Phase C — PDF**: Generate PDF with pandoc + xelatex

## PDF Generation Rules

- Engine: `xelatex` (full Unicode/Turkish support)
- Template: `docs/output/_templates/nar-enterprise.tex`
- Cover page: product name, NAR SISTEM TEKNOLOJI A.S., date
- TOC, headers, footers, page numbers
- Command: `pandoc input.md -o output.pdf --pdf-engine=xelatex --template=docs/output/_templates/nar-enterprise.tex --toc`

## ROUTEMAP Updates

After each doc set, update ROUTEMAP Documentation Phase table:
- Mark completed step as `[x] DONE` with date
- When all 4 done → mark Documentation Phase as `[DONE]`

## When Complete

- All 4 doc sets completed (D1-D4)
- Update ROUTEMAP: Documentation Phase `[DONE]`
- Update decisions.md with documentation decisions
- Announce: "Documentation phase complete. Tum dokumanlar docs/output/ altinda."
- Next: User triggers release → Read `phases/release/release-process.md`
