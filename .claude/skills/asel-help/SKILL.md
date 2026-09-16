---
name: asel-help
description: Internal reference card. Only invoke when user explicitly types /asel-help slash command. Never auto-trigger.
user-invocable: true
disable-model-invocation: true
---

# Asel Help — Kullanım Kılavuzu

Asel'in nasıl çalıştığını ve nasıl kullanıldığını gösterir.

## Rules

- Read-only — NO file changes
- Display in user's language (Turkish)
- Do NOT auto-invoke — only when user explicitly calls `/asel-help`
- Show the full guide below, formatted exactly as specified

## Output

Read the three reference files below, in order, and display each one's content to the user verbatim (they together form the guide banner-by-banner):

> Read `references/help-planning.md` now and follow it, then return here.
> Read `references/help-development.md` now and follow it, then return here.
> Read `references/help-modes.md` now and follow it, then return here.
