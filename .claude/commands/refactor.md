---
allowed-tools: Read, Write, Edit, Bash(npm *), Bash(npx *), Bash(git *), Grep, TodoWrite, mcp__memory__*
description: Intelligently refactor and improve code quality
---

## Process

1. **Recall context** - Search memory for past refactoring decisions and patterns in this area
2. Analyze code and refactoring needs
3. Test baseline before changes
4. Refactor incrementally with tests passing
5. **Store decision** - Record refactoring rationale for future reference
6. **Commit & push** - Use `/commit-push` to verify all checks and push to remote (if user requests commit)

## Rules
- Preserve external behavior
- Keep tests green throughout
- No performance degradation

## Memory Integration

### Recall (Step 1)
Search for related refactoring history:
```
mcp__memory__memory_recall(query="refactor [component] [area] pattern")
```

### Store (Step 5)
Record significant refactoring decisions:
```
mcp__memory__memory_store(
  content="Refactoring: [what was refactored]. Reason: [why]. Pattern applied: [pattern]. Files: [files].",
  type="fact",
  tags=["refactor", "[area]", "[pattern-type]"],
  importance=6
)
```

For architectural changes:
```
mcp__memory__memory_store(
  content="Architecture change: [component] - [old approach] → [new approach]. Reason: [rationale].",
  type="relationship",
  entities=["[component1]", "[component2]"],
  tags=["architecture", "refactor"],
  importance=7
)
```