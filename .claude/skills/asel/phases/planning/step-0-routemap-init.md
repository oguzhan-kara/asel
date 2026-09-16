# Step 0: ROUTEMAP Initialization

> First action for a new project. Before ANY other step.
> Asel handles directly — no agent dispatch needed.

<EXTREMELY-IMPORTANT>
This is the FIRST action Asel takes for a new project. Before ANY skill dispatch.
</EXTREMELY-IMPORTANT>

## Process

1. Create `docs/` directory if it doesn't exist
2. Create `docs/ROUTEMAP.md` from template (`templates/ROUTEMAP.template.md`)
3. Set project name (from user's first message or ask)
4. Set `Last updated` to today's date
5. Set `Current phase: PLANNING` (valid values: PLANNING | DEVELOPMENT | E2E_POLISH | DOCUMENTATION)
6. All planning steps start as `[ ] PENDING`
7. Development Phase section shows `[NOT STARTED]`
8. Create `docs/brainstorming/` directory
9. Create `docs/brainstorming/decisions.md` with header

This gives us a trackable state from second zero.

## After Completion

Display planning progress bar:
```
═══ PLANNING ══════════════════════════════════════════════════════════════
[▶] Discovery → [ ] Gap Analysis → [ ] Product → [ ] Future → [ ] Architecture → [ ] Screens → [ ] Theme → [ ] Stories → [ ] UAT → [ ] Review → [ ] Dev-Readiness
═══════════════════════════════════════════════════════════════════════════
```

Proceed to Step 1 (Discovery) → Read `phases/planning/step-1-discovery.md`.
