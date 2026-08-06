---
name: restore-session
description: Reload the most recent saved session snapshot from .claude/sessions/ to restore context and continue where a previous session left off. Use when the user says "/restore-session", "restore session", "resume", "where did we leave off", or "load our last session".
---

# Restore session

Reload a saved session snapshot so work can continue with full context.

## Steps

1. Locate snapshots:
   ```bash
   ls -1 .claude/sessions/ 2>/dev/null
   ```
   - If the folder or `latest.md` is missing, tell the user there's no saved
     session yet and suggest running `/remember` first. Stop.
2. Read **`.claude/sessions/latest.md`** (the newest snapshot).
   - If the user named a specific snapshot (e.g. "restore the 2026-07-10 one"),
     read that timestamped file instead.
   - If they want to choose, list the available snapshots (filenames are
     timestamps) and ask which one.
3. Also read **`CLAUDE.md`** and **`docs/design-system.md`** if not already in
   context, so project + design conventions are loaded alongside the session.
4. Give the user a **brief** orientation (don't dump the whole file):
   - What the last session focused on and what got done.
   - Current state (server/build/branch).
   - The open threads / next steps — as a short checklist.
5. Ask what they'd like to tackle first, then continue.

## Notes
- Read-only: this skill restores context, it does not modify snapshots.
- Prefer `latest.md`; only fall back to timestamped files when the user asks for
  an older one.
