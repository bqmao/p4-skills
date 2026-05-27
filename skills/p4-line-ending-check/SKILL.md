---
name: p4-line-ending-check
description: Audits P4 pending changelists for line-ending differences (CRLF vs LF). Follows a strict interactive workflow to gather CL IDs and output directory before generating a summary report.
---

# P4 Line Ending Check

This skill identifies files in your Perforce pending changelists that appear modified but actually only have line-ending differences.

## Standard Workflow (Mandatory)

To ensure a consistent experience, the agent MUST follow these steps in order:

1.  **Request Input**: Ask the user for the **Pending Changelist IDs** (e.g., `default`, `12345`) and the **Output Directory Path** for the summary report.
2.  **Execute Check**: Run the `check_line_endings.cjs` script with the provided parameters.
3.  **Present Results**: Show the console output and provide the path to the generated Markdown report.

## Tools & Scripts

### Check Line Endings Script
```bash
node scripts/check_line_endings.cjs <cl_id_1> <cl_id_2> ... --output-dir <path>
```

### Output Categories
- ✅ **Safe to Revert**: Only line endings differ. A revert command is provided.
- ⚠️ **Real Modifications**: Content has actual changes.
- ℹ️ **Skipped**: Non-text files (binary, etc.) are ignored.
