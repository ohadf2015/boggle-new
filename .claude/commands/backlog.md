---
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm *), Bash(npx *), Bash(git *), mcp__notion__*, TodoWrite
description: Process bugs from Notion backlog - analyze, fix, and mark for validation
---

## Process

**Notion Bugs Page ID:** `2df3a83f-6508-80b4-90b3-f03613422bb5`

1. **Fetch bugs** - Use `mcp__notion__notion-fetch` with page ID above
2. **Extract pending** - Items marked `- [ ]` (skip completed `- [x]`)
3. **Analyze each** - Search codebase, identify affected files, root cause hypothesis
4. **Create todos** - Use TodoWrite for all bugs
5. **Fix** - Read context, identify root cause, apply minimal fix
6. **Verify** - `npx tsc --noEmit`, `npm run lint`, `npm run build`
7. **Document tests** - Steps to verify, expected result, how to reproduce
8. **Update Notion** - Mark as done, add validation section
9. **Report** - Summary of bugs fixed and test instructions

## Key Rules
- Analyze in context before fixing
- Minimal, focused fixes only
- Verify with build/lint/tsc
- Always provide clear test instructions
- Update Notion status
