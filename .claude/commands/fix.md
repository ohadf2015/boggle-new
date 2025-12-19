---
allowed-tools: Read, Write, Bash(npm *), Bash(npx *), Bash(git diff *)
description: Fix errors from pasted logs
---

The user will paste error logs after this command.

## Process

### 1. Parse Errors
Extract from the pasted content:
- File paths and line numbers
- Error types and messages
- Stack traces if present

### 2. Prioritize
Fix in this order:
1. Syntax errors (blocks everything)
2. Import/module errors
3. Type errors
4. Runtime errors
5. Warnings

### 3. Fix Each Error
For each error:
1. Read the file at the error location
2. Understand context (5 lines above/below)
3. Identify root cause
4. Apply minimal fix
5. Check if fix resolves related errors

### 4. Verify
After all fixes, run the relevant check:
- TypeScript errors → `npx tsc --noEmit`
- ESLint errors → `npx eslint [files]`
- Test failures → `npm test`
- Build errors → `npm run build`

## Constraints
- Fix root cause, not symptoms
- No `any` types or `@ts-ignore` unless critical
- No unrelated refactoring
- Match existing code style

## Output
Brief summary per fix:
`✅ [file:line] - [what was wrong] → [what you changed]`
