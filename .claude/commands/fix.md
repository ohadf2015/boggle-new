---
allowed-tools: Read, Write, Edit, Bash(npm *), Bash(npx *), Bash(git *)
description: Fix errors from pasted logs
---

## Process

1. **Parse errors** - Extract file paths, line numbers, types, messages
2. **Prioritize** - Syntax → Import → Type → Runtime → Warnings
3. **Fix** - Read context, identify root cause, apply minimal fix
4. **Verify** - Run `npx tsc --noEmit`, `npm run lint`, `npm run build`

## Rules
- Fix root cause, not symptoms
- No `any` types or `@ts-ignore` unless critical
- No unrelated refactoring
- Match existing code style

## Output
`✅ [file:line] - [issue] → [fix]`
