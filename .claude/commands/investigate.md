---
allowed-tools: Read, Grep, Bash(git *), Task(ultrathink-debugger), mcp__memory__*, mcp__sequential-thinking__*
description: Deep investigation to find root cause - NO fixes until understood
---

## Critical Rules
1. **NO CODE** until root cause fully understood
2. **NO PATCHES** - find the real fix, not workarounds
3. **USE SEQUENTIAL THINKING** for structured analysis
4. **USE ULTRATHINK** for complex debugging
5. **STORE FINDINGS** in memory for future reference

## Process

1. **Recall past investigations** - Search memory for similar issues or related areas
2. **Sequential thinking analysis** - Use `mcp__sequential-thinking__sequentialthinking` for structured problem breakdown
3. **Use ultrathink-debugger** - Let it analyze the issue deeply (for complex cases)
4. **Map execution flow** - Entry point → functions involved → problem area
5. **Analyze deep** - Data flow, state, race conditions, assumptions
6. **Check history** - `git log --oneline -10 -- [file]` and blame
7. **Form hypothesis** - WHAT, WHERE, WHY, PROOF
8. **Report** - Execution flow, root cause, evidence, recommendation
9. **Store investigation** - Save findings to memory
10. **WAIT** - Stop here, get user confirmation before any fix

## Sequential Thinking Integration

Use Sequential Thinking MCP for structured problem analysis:

### Step 2: Structured Analysis
```
mcp__sequential-thinking__sequentialthinking(
  thought="[Current understanding of the problem]",
  thoughtNumber=1,
  totalThoughts=5,
  nextThoughtNeeded=true
)
```

Continue the sequence:
- **Thought 1**: Problem definition and symptoms
- **Thought 2**: Potential causes (brainstorm)
- **Thought 3**: Evidence gathering plan
- **Thought 4**: Root cause hypothesis
- **Thought 5**: Validation approach

### When to Use Sequential Thinking vs Ultrathink
| Scenario | Tool |
|----------|------|
| Need structured breakdown | Sequential Thinking |
| Complex multi-system bug | Ultrathink Debugger |
| Race condition analysis | Both (Sequential → Ultrathink) |
| Architectural issue | Sequential Thinking |
| Performance problem | Ultrathink Debugger |

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

## Memory Integration

### Recall (Step 1)
Search for related past investigations:
```
mcp__memory__memory_recall(query="investigation [area] [symptom] root cause")
```

### Store (Step 8)
Store investigation findings for future reference:
```
mcp__memory__memory_store(
  content="Investigation: [issue summary]. Root cause: [cause] in [file:line]. Evidence: [evidence]. Related areas: [areas].",
  type="fact",
  tags=["investigation", "root-cause", "[area]", "[symptom-type]"],
  importance=8
)
```

For architectural insights discovered:
```
mcp__memory__memory_store(
  content="Architecture insight: [component] - [insight about how it works or interacts].",
  type="relationship",
  entities=["[component1]", "[component2]"],
  tags=["architecture", "[area]"],
  importance=7
)
```