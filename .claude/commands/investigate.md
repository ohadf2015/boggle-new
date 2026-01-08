---
allowed-tools: Read, Grep, Bash(git *), Task(ultrathink-debugger)
description: Deep investigation to find root cause - NO fixes until understood
---

## Critical Rules
1. **NO CODE** until root cause fully understood
2. **NO PATCHES** - find the real fix, not workarounds
3. **USE ULTRATHINK** for complex issues

## Process

1. **Use ultrathink-debugger** - Let it analyze the issue deeply
2. **Map execution flow** - Entry point → functions involved → problem area
3. **Analyze deep** - Data flow, state, race conditions, assumptions
4. **Check history** - `git log --oneline -10 -- [file]` and blame
5. **Form hypothesis** - WHAT, WHERE, WHY, PROOF
6. **Report** - Execution flow, root cause, evidence, recommendation
7. **WAIT** - Stop here, get user confirmation before any fix

## Report Format
```
## Investigation Report

### Execution Flow
1. [entry] → 2. [service] → 3. [problem]

### Root Cause
File: [path], Line: [number]
Issue: [what's wrong]
Why: [explanation]

### Evidence
- [finding 1]
- [finding 2]

### Recommended Fix
[description only - NO CODE YET]
```