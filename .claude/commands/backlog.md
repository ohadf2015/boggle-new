---
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm *), Bash(npx *), Bash(git *), mcp__notion__*, mcp__memory__*, TodoWrite
description: Process bugs from Notion backlog - analyze, fix, and mark for validation
---

## Process

**Notion Bugs Page ID:** `2df3a83f-6508-80b4-90b3-f03613422bb5`

1. **Recall context** - Search memory for similar bugs and past fixes in related areas
2. **Fetch bugs** - Use `mcp__notion__notion-fetch` with page ID above
3. **Extract pending** - Items marked `- [ ]` (skip completed `- [x]`)
4. **Analyze each** - Search codebase, identify affected files, root cause hypothesis
5. **Create todos** - Use TodoWrite for all bugs
6. **Fix** - Read context, identify root cause, apply minimal fix
7. **Document tests** - Steps to verify, expected result, how to reproduce
8. **Store fix memory** - Record bug pattern and solution
9. **Update Notion** - Mark as done, add validation section
10. **Report** - Summary of bugs fixed and test instructions
11. **Commit & push** - Use `/commit-push` to verify all checks and push to remote (if user requests commit)

## Key Rules
- Analyze in context before fixing
- Minimal, focused fixes only
- Verify with build/lint/tsc
- Always provide clear test instructions
- Update Notion status

## Memory Integration

### Recall (Step 1)
Search for related bugs and fixes:
```
mcp__memory__memory_recall(query="bug [area] [symptom]")
```

### Store (Step 8)
After each fix:
```
mcp__memory__memory_store(
  content="Backlog fix: [bug-title]. Root cause: [cause]. Solution: [solution]. File: [file].",
  type="fact",
  tags=["backlog", "bug-fix", "[area]"],
  importance=6
)
```
