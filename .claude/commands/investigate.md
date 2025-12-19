---
allowed-tools: Read, Bash(grep *), Bash(find *), Bash(git log *), Bash(git blame *)
description: Deep investigation to find root cause - NO fixes until understood
---

## CRITICAL RULES
1. **DO NOT WRITE ANY CODE** until root cause is fully understood
2. **NO PATCHES** - we want the real fix, not a workaround
3. **USE ULTRATHINK** for complex analysis

---

## Phase 1: Map the Flow

ultrathink about this issue.

Find all files involved:
```bash
grep -rn "[relevant_keyword]" --include="*.ts" --include="*.tsx" --include="*.js"
```

Trace execution path from entry point to failure:
```
Entry Point (file:line)
  → Function A (file:line)
    → Function B (file:line)
      → Problem Area (file:line)
```

---

## Phase 2: Deep Analysis

For each component in the flow, analyze:

**Data Flow:**
- What data enters?
- How is it transformed?
- Where could it become invalid?

**State:**
- What state does this depend on?
- Race conditions? Timing issues?
- Stale or missing data?

**Assumptions:**
- What does the code assume?
- What happens with null/undefined/empty?

**History:**
```bash
git log --oneline -10 -- [file]
git blame [file] | grep -A2 -B2 "[line]"
```

---

## Phase 3: Form Hypothesis

Present findings:
```
WHAT: [Specific bug description]
WHERE: [Exact file:line]
WHY: [Root cause explanation]
PROOF: [Evidence from code]
```

---

## Phase 4: Wait for Confirmation

**STOP HERE.** Present the investigation report and wait for user to confirm before any fix.

Report format:
```
## Investigation Report

### Execution Flow
1. [entry] → 2. [service] → 3. [problem]

### Root Cause
File: [path]
Line: [number]
Issue: [what's wrong]
Why: [explanation]

### Evidence
- [finding 1]
- [finding 2]

### Recommended Fix
[description only - NO CODE YET]
```