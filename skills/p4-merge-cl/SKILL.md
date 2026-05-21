---
name: p4-merge-cl
description: >
  Merges a specific Perforce changelist from a source stream into one or more target streams
  using p4 merge/integrate. Handles shelving already-open files, syncing to latest, finding
  the CL by number or description, safe resolve, and creating new pending changelists.
  Supports parallel dispatch for multiple source→target pairs. Trigger whenever the user
  wants to merge, integrate, or propagate a specific P4 changelist between streams — even
  if they phrase it as "merge CL from X to Y", "integrate this changelist across branches",
  "merge from source to target", or "batch merge across streams".
---

# Merge P4 Changelist Across Streams

This skill merges a specific submitted Perforce changelist from a source stream into a target
stream using `p4 merge`. It handles workspace preparation (shelving already-open files,
syncing to latest), finding the CL by number or description, performing the merge with safe
resolve, and organizing results into new pending changelists.

## When to Use

Trigger this skill when the user wants to:

- Merge a changelist from one stream/workspace to another
- Integrate a specific CL from a source stream to a target stream
- Batch-merge the same change across multiple source→target pairs in parallel
- "Merge CL X from source to target", "integrate this fix across streams"
- Mentions merging, integrating, or propagating a specific changelist between P4 streams

Do **not** use for:

- `p4 integrate` without a specific changelist (full stream integrations)
- File-level porting (copying file content manually) — use `p4-port-cl` instead
- Moving files between changelists within the same workspace

## What You Need from the User

1. **Source→Target pairs** (required) — one or more pairs, each consisting of:
   - A source workspace/client name
   - A target workspace/client name
2. **Changelist identifier** (required) — either:
   - A specific CL number per source, OR
   - A description to search for (searched independently in each source stream)
3. **New CL description** (required) — what to put on the pending changelist in each target

If any of these are missing, ask the user before proceeding.

## Workflow

### Parallel Dispatch

When multiple source→target pairs are provided, dispatch one subagent per pair and run them
all in parallel. Each pair is independent — the source CL is found separately in each source
stream (the same description will often correspond to different CL numbers across streams).

### Step 0: Workspace Validation

Use `-c <client>` on every `p4` command. Do not rely on the default client context. This
ensures operations target the correct workspace regardless of the current working directory.

### Step 1: Find the Source Changelist

**If the user provided a CL number:** Verify it exists with:
```
p4 -c <source_client> describe -s <CL_number>
```

**If the user provided a description to search for:** Search incrementally:
```
p4 -c <source_client> changes -m 10 -s submitted //<source_client>/...
```
Scan results for the matching description. If not found, expand the search:
- Try `-m 25`, then `-m 50`, then `-m 100`
- Stop as soon as a match is found
- If still not found after 100, report failure — do not guess

Record the CL number for use in subsequent steps.

### Step 2: Prepare the Target Workspace

#### 2a: Check for Already-Opened Files

```
p4 -c <target_client> opened
```

If files are already open in the target workspace:

1. Create a shelving changelist:
   ```
   echo "Change: new\nClient: <target_client>\nStatus: new\nDescription:\n\tAuto-shelved before merge\n" | p4 -c <target_client> change -i
   ```
2. Move open files to that CL:
   ```
   p4 -c <target_client> reopen -c <shelve_CL> //<target_client>/...
   ```
3. Shelve them:
   ```
   p4 -c <target_client> shelve -c <shelve_CL>
   ```
4. Revert the local files:
   ```
   p4 -c <target_client> revert //<target_client>/...
   ```

This ensures the workspace is clean before merging so that only the merge results end up in
the final changelist.

#### 2b: Sync to Latest

```
p4 -c <target_client> sync //<target_client>/...
```

### Step 3: Perform the Merge

```
p4 -c <target_client> merge //<source_client>/...@=<CL_NUMBER>,@=<CL_NUMBER>
```

If `merge` is not supported (older server versions), fall back to:
```
p4 -c <target_client> integrate //<source_client>/...@<CL_NUMBER>,@<CL_NUMBER>
```

### Step 4: Resolve (Safe)

```
p4 -c <target_client> resolve -as
```

The `-as` flag performs safe resolve — it accepts the merge only when there are no conflicts.
After resolving, check for remaining unresolved files:

```
p4 -c <target_client> resolve -n
```

If unresolved files remain, report them to the user but continue with the rest of the
workflow. The user will handle conflicts manually.

### Step 5: Create New Pending Changelist

Create a pending CL with the user-specified description:

```
echo "Change: new\nClient: <target_client>\nStatus: new\nDescription:\n\t<user_description>\n" | p4 -c <target_client> change -i
```

### Step 6: Move Merged Files to New Changelist

```
p4 -c <target_client> reopen -c <new_CL> //<target_client>/...
```

### Step 7: Report Results

For each target workspace, report:

| Field | Value |
|-------|-------|
| Source CL | The CL number that was merged |
| Target Workspace | Client name |
| Files Merged | Count of files in the new CL |
| New Pending CL | The CL number created |
| Unresolved Conflicts | List of files (if any) |
| Shelved CL | CL number where pre-existing files were shelved (if applicable) |

When multiple targets are processed in parallel, present a summary table at the end.

## Edge Cases

- **"All revision(s) already integrated"**: Report this to the user — the change was already
  merged previously. No new CL is created.
- **Source CL not found by description**: After searching up to 100 results, report that no
  matching CL was found and ask the user to verify the description or provide a CL number.
- **No files opened after merge**: The merge produced no file actions (possibly already
  integrated). Report and skip CL creation.
- **Target workspace has no open files**: Skip the shelve/revert step entirely (Step 2a) and
  proceed directly to sync.

## Important Notes

- Always use `-c <client>` on every p4 command — never assume the default client is correct.
- The merge description is provided by the user — do not invent or modify it.
- Use `resolve -as` (safe), not `-at` (accept-theirs). The user wants to handle conflicts
  manually if any exist.
- When dispatching parallel subagents, each subagent is fully independent — no shared state
  between them.
