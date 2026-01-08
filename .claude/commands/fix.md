---
allowed-tools: Read, Write, Edit, Bash(npm *), Bash(npx *), Bash(git *)
description: Fix errors from pasted logs
---

## Process

1. **Parse errors** - Extract file paths, line numbers, types, messages
2. **Prioritize** - Syntax → Import → Type → Runtime → Warnings
3. **Write failing test** - Create a test that reproduces the bug, run it to confirm it fails
4. **Fix** - Read context, identify root cause, apply minimal fix
5. **Verify test passes** - Run the test again (without modifying it) to confirm the fix works
6. **Verify build** - Run `npx tsc --noEmit`, `npm run lint`, `npm run build`

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
