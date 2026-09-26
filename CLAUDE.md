# Working in ais-atlas-quiz

**If you were spawned as a subagent (any `quiz-*` role, or any agent given its
task by another agent), ignore this file and follow your brief.** Everything
below is for top-level sessions.

Orientation: `STATUS.md` (where things stand, what's next; written for the
user), `docs/KNOWLEDGE.md` (what's established, what was withdrawn, traps). To
run the pipeline, start from `docs/ORCHESTRATOR-PROMPT.md`.

## Parallel sessions

The user often runs several sessions at once, sometimes in git worktrees. A
dashboard (`npm run status`, http://localhost:4747) shows what each one does.

1. **Register.** Before your first file edit, write
   `.agent-status/<short-task-name>.json` in the folder you work in
   (gitignored):
   `{"agent": "<short-task-name>", "task": "<one sentence>", "plan": ["<step>", ...], "files": [{"path": "<repo-relative>", "state": "planned|active|done"}]}`.
   Update it when your plan or file list changes; git fills in which files have
   uncommitted edits, so you don't need to update it for every edit. Delete it
   when the task is finished.
2. **Hotspots.** Once you know which files you'll change, check them against
   `hotspots` in `status/status.json`. If any match, tell the user which files
   those are and wait for their go-ahead before editing them.
3. **Commit explicit paths** and leave out files another session lists.

## Keeping status current

- `STATUS.md` is rewritten, never appended to: plain language, no internal
  codes, under ~120 lines. Update it **only in the main folder** (not in a
  worktree), when a milestone lands or a branch is merged, so parallel
  branches don't conflict on it. Also update `updated` and `milestones` in
  `status/status.json`.
- `docs/KNOWLEDGE.md` is edited in place when a finding is established,
  weakened or withdrawn, or a trap catches you.
- **Dashboard wishes**: if something you learned can't be shown well on the
  dashboard, add an entry to `display_requests` in `status/status.json`
  (`{"date", "from", "request", "why", "status": "open"}`). Don't edit
  `status/dashboard.html` or `scripts/status-dashboard.mjs` unless the user
  asked for dashboard work.
