---
name: p4-move-conflict-files
description: >
  Moves all unresolved conflict files from a given Perforce (P4) changelist into a new pending
  P4 changelist. Trigger when the user asks to move, isolate, or separate P4 conflict files
  out of a p4 changelist, or mentions "p4 conflict CL", "p4 resolve conflicts", "move p4
  conflicts", or "conflict changelist" in the context of Perforce.
---

# Move P4 Conflict Files

This skill moves all unresolved conflict files from a source **Perforce (p4) changelist** into a
freshly created pending changelist, so the conflicts can be resolved in isolation without blocking
the rest of the original CL.

## When to Use

Trigger this skill when the user:
- Asks to move P4 conflict files out of a p4 changelist
- Wants to isolate unresolved files into their own p4 CL
- Says something like "move the p4 conflicts from CL 12345 to a new changelist"

Do **not** trigger this skill for git merge conflicts, SVN conflicts, or any non-Perforce conflict.

## What You Need from the User

Before running, you must know the **source changelist number**. If the user hasn't provided it,
ask:

> "Which changelist number should I move the conflict files from?"

Do **not** proceed without a valid numeric changelist number.

## How to Execute

Run the bundled PowerShell script non-interactively by passing `-Changelist` directly.
The script requires no user interaction when the parameter is supplied.

**Command (run from the project's workspace directory):**

```powershell
pwsh -NonInteractive -File "<skill_scripts_dir>\Move-ConflictFiles.ps1" -Changelist <CL_NUMBER>
```

Or with Windows PowerShell 5.1:

```powershell
powershell -NonInteractive -File "<skill_scripts_dir>\Move-ConflictFiles.ps1" -Changelist <CL_NUMBER>
```

Replace `<skill_scripts_dir>` with the absolute path to this skill's `scripts/` directory:
`D:\FishWorkspaces\.agents\skills\move-conflict-files\scripts`

Replace `<CL_NUMBER>` with the numeric changelist number provided by the user.

### Working Directory

The script auto-detects the P4 client from the current working directory. **Always run the script
from inside the P4 workspace root** (or any subdirectory of it), not from the agent's default
working directory.

### Example invocation (Bash tool):

```bash
pwsh -NonInteractive -File "D:/FishWorkspaces/.agents/skills/move-conflict-files/scripts/Move-ConflictFiles.ps1" -Changelist 12345
```

Use the `workdir` parameter of the Bash tool to point at the correct workspace directory.

## Reading the Output

The script prints its progress to stdout. Key lines to surface to the user:

| Output line | Meaning |
|---|---|
| `Client  : <name>` | Detected P4 workspace client |
| `Found N conflict file(s) in CL XXXXX` | How many files will be moved |
| `Created new changelist: YYYYY` | The new CL number — **always report this back** |
| `[OK] ...` | Each successfully reopened file |
| `[FAIL] ...` | Any file that failed to reopen (warn the user) |
| `Done.` summary block | Final counts — always include in your reply |

## After Running

Always tell the user:
1. How many files were moved
2. The **new changelist number** they should use to resolve conflicts
3. Whether any files failed (if `$failCount > 0`)

## Error Handling

| Error message | What to tell the user |
|---|---|
| `'p4' is not installed or not on PATH` | p4 is not available; ensure p4 is installed and on PATH |
| `Could not determine P4 client` | The working directory is not inside a P4 workspace |
| `Changelist XXXXX not found` | The CL number doesn't exist or isn't accessible |
| `Changelist XXXXX is not a pending changelist` | Only pending CLs are supported (not submitted/shelved) |
| `No unresolved conflict files found` | Nothing to do — workspace has no pending resolves |
| `No conflict files from CL XXXXX found` | The conflicts exist but aren't in that specific CL |
