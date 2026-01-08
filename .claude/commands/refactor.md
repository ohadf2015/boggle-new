---
allowed-tools: Read, Write, Edit, Bash(npm *), Bash(npx *), Bash(git *), Grep, TodoWrite
description: Intelligently refactor and improve code quality
---

## Process

1. Analyze code and refactoring needs
2. Test baseline before changes
3. Refactor incrementally with tests passing
4. Verify with `npm run lint` and `npx tsc --noEmit`

## Rules
- Preserve external behavior
- Keep tests green throughout
- No performance degradation