---
name: asel-setup
description: First-time developer setup for Asel projects. Adds a statusline only if none exists, adds permission rules with valid syntax, sets recommended settings. Run with /asel-setup.
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(node:*), Read
---

# Asel Setup

Run: `node "{{aselRoot}}/../asel-setup/setup.js"` and show its report to the user. The script is idempotent; it never removes existing settings and never replaces an existing statusline (it prints how to switch instead).
