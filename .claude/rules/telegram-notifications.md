# Telegram Notification Rule

<EXTREMELY-IMPORTANT>
## Hook-Driven Notifications (Deterministic)

Most Telegram notifications are handled **automatically** by `hooks/notify-hook.sh`. This hook triggers on every ROUTEMAP Edit/Write and detects state changes. LLM does NOT need to send these manually.

**Hook handles:**

| Event | Trigger | Emoji |
|-------|---------|-------|
| Story DONE | `[x] DONE` in ROUTEMAP story row | 📋 |
| Story ESCALATED | `Escalated` in ROUTEMAP Step column | ⚠️ |
| Story FAILED | `Failed` in ROUTEMAP Step column | ❌ |
| Dev Phase DONE | All stories in phase `[x] DONE` | 🎯 |
| Planning COMPLETE | `Current phase` changes from PLANNING | 🏁 |
| Development COMPLETE | All stories `[x] DONE` | 🏁 |
| E2E & Polish COMPLETE | All E2E steps `[x] DONE` | 🏁 |

**State tracking**: `.asel-notify-state` prevents duplicate notifications. First run seeds with existing state (no flood).

**Do NOT manually send Telegram for hook-handled events.** This causes duplicate notifications.

## LLM-Sent Notifications (Non-Deterministic)

These events are NOT in ROUTEMAP or not detectable by hook. LLM must send them manually:

| Event | Message Format | When |
|-------|---------------|------|
| Fix DONE (pre-release) | `🔧 [Project]\nFIX-NNN: [title] ✓` | After QUICKFIX/BUGFIX completed |
| Phase Gate PASS | `🚪 [Project]\nPhase N Gate: PASS ✓` | After Phase Gate passes |
| Phase Gate FAIL | `🚪 [Project]\nPhase N Gate: FAIL ✗` | After Phase Gate fails |
| Release | `🚀 [Project] vX.Y.Z released!` | After git tag created |
| Maintenance DONE | `📋 [Project]\n[PREFIX]-NNN: [title] ✓` | After HOTFIX/BUGFIX/ENHANCE |

```bash
node "{{hookRoot}}/notify-cli.js" "$MESSAGE"
```

## Rules

- ALL values MUST be real — read from ROUTEMAP. No placeholders.
- If script fails → warn user but do NOT block the pipeline
- Hook notifications: automatic, no LLM action needed
- LLM notifications: send IMMEDIATELY after the event
</EXTREMELY-IMPORTANT>
