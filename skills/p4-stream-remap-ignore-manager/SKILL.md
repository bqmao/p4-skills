---
name: p4-stream-remap-ignore-manager
description: Strictly audits Perforce stream Remapped and Ignored sections. Follows a strict interactive workflow to export configurations and generate unified comparison reports.
---

# P4 Stream Remap & Ignore Manager

This skill focuses exclusively on the `Remapped` and `Ignored` sections of Perforce streams.

## Standard Workflow (Mandatory)

To ensure a consistent experience, the agent MUST follow these steps in order:

1.  **Request Nodes**: Ask the user for the list of **P4 stream paths** (e.g., `//OSX/Fish4_0`) and the **Output Directory Path**.
2.  **Initial Export**: Run `export_configs.cjs` to save the raw Remapped/Ignored settings for each node.
3.  **Request Audit Targets**: Ask the user for the specific **Check Items Path** (multiple paths separated by commas) to audit across those nodes.
4.  **Consolidated Report**: Run `check_and_export.cjs` to generate the unified `Comparison_Summary.md` with status icons and highlighted matches.

## Tools & Scripts

### 1. Export Raw Configs
```bash
node scripts/export_configs.cjs <stream_1> <stream_2> ... --output-dir <path>
```

### 2. Unified Comparison Report
```bash
node scripts/check_and_export.cjs --targets "path1,path2" --output-dir <path> <stream1> <stream2> ...
```
