---
allowed-tools: Read, Write, Edit, Bash(npm *), Bash(npx *), Bash(git *), mcp__memory__*
description: Fix errors from pasted logs
---

## Process

1. **Recall similar bugs** - Use `mcp__memory__memory_recall` to search for similar past bugs and fixes
2. **Parse errors** - Extract file paths, line numbers, types, messages
3. **Prioritize** - Syntax → Import → Type → Runtime → Warnings
4. **Write failing test** - Create a test that reproduces the bug, run it to confirm it fails
5. **Fix** - Read context, identify root cause, apply minimal fix
6. **Verify test passes** - Run the test again (without modifying it) to confirm the fix works
7. **Store fix memory** - Record the bug pattern and solution for future reference
8. **Commit & push** - Use `/commit-push` to verify all checks and push to remote (if user requests commit)

## Rules
- Fix root cause, not symptoms
- No `any` types or `@ts-ignore` unless critical
- No unrelated refactoring
- Match existing code style
- Never modify the test after writing it - the fix must make the test pass as-is

## Output
`🧪 [test file] - Test written, confirmed failing`
`✅ [file:line] - [issue] → [fix]`
`🧪 [test file] - Test now passing`

## Memory Integration

### Recall (Step 1)
Search for related bug patterns:
```
mcp__memory__memory_recall(query="bug fix [error-type] [affected-area]")
```

### Store (Step 7)
After fixing, store the bug pattern for future reference:
```
mcp__memory__memory_store(
  content="Bug fix: [error-type] in [file]. Root cause: [cause]. Solution: [solution].",
  type="fact",
  tags=["bug", "fix", "[error-type]", "[area]"],
  importance=6
)
```
