---
allowed-tools: Read, Write, Edit, Bash(npm *), Bash(npx *), Bash(git *), Grep, Glob, Skill(ui), TodoWrite
description: Implement new feature thoroughly - understand first, ask questions, write tests
---

## Process

1. **Context** - Read @CLAUDE.md, @README.md, @package.json
2. **Ask questions** - Scope, location, integration, edge cases, design
3. **Find patterns** - Search similar features, read existing tests
4. **Plan** - Present implementation plan (files, steps, test cases)
5. **Test-first** - Write tests → run (fail) → implement → run (pass)
6. **UI polish** - Run `/ui [component]` if has UI components
7. **Verify** - `npx tsc --noEmit`, `npm run lint`, `npm test`, git diff

## Key Rules
- Always read CLAUDE.md first
- Ask questions if unclear
- Write tests before implementation
- Match existing patterns
- No implementation without approved plan
- Run `/ui` after UI component implementation