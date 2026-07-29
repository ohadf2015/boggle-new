---
allowed-tools: Read, Write, Edit, Bash(npm *), Bash(npx *), Bash(git *), Bash(osascript *), Grep, Glob, Skill(ui), TodoWrite, mcp__memory__*, mcp__github__*, mcp__sequential-thinking__*
description: Implement new feature thoroughly - understand first, ask questions, write tests
---

## Notification
When waiting for user feedback or asking questions, notify the user with:
```bash
osascript -e 'display notification "Claude needs your input" with title "Claude Code" sound name "Glass"'
```

## Process

1. **Recall context** - Use `mcp__memory__memory_recall` to search for related features, patterns, and past decisions
2. **Context** - Read @CLAUDE.md, @README.md, @package.json
3. **Ask questions** - Scope, location, integration, edge cases, design
4. **Find patterns** - Search similar features, read existing tests
5. **Plan with Sequential Thinking** - Use `mcp__sequential-thinking__sequentialthinking` for complex features
6. **Present plan** - Implementation plan (files, steps, test cases) - wait for approval
7. **Test-first** - Write tests → run (fail) → implement → run (pass)
8. **UI polish** - Run `/ui [component]` if has UI components
9. **Store memory** - Use `mcp__memory__memory_store` to save feature decisions and patterns
10. **Commit & push** - Use `/commit-push` to verify all checks and push to remote (if user requests commit)
11. **GitHub PR** - Optionally create PR with `mcp__github__create_pull_request` (if requested)

## Key Rules
- Always read CLAUDE.md first
- Ask questions if unclear
- Write tests before implementation
- Match existing patterns
- No implementation without approved plan
- Run `/ui` after UI component implementation

## Memory Integration

### Recall (Step 1)
Search for related memories before starting:
```
mcp__memory__memory_recall(query="feature [feature-name] patterns implementation")
```

### Store (Step 9)
After completing the feature, store:
- **Feature decision** (type: fact): What was implemented and why
- **Implementation pattern** (type: fact): Reusable patterns discovered
- **Component relationship** (type: relationship): How this feature connects to others

Example:
```
mcp__memory__memory_store(
  content="Implemented [feature-name]: [brief description]. Key files: [files]. Pattern used: [pattern].",
  type="fact",
  tags=["feature", "implementation", "[feature-area]"],
  importance=7
)
```

## Sequential Thinking Integration

For complex features, use Sequential Thinking to structure the planning:

### Step 5: Planning Complex Features
```
mcp__sequential-thinking__sequentialthinking(
  thought="Feature: [name]. Requirements: [reqs]. Affected areas: [areas].",
  thoughtNumber=1,
  totalThoughts=4,
  nextThoughtNeeded=true
)
```

Planning sequence:
- **Thought 1**: Feature scope and requirements
- **Thought 2**: Technical approach and file changes
- **Thought 3**: Test strategy and edge cases
- **Thought 4**: Integration points and risks

## GitHub Integration

### Step 11: Create Pull Request (Optional)
If the user requests a PR after feature implementation:

```
mcp__github__create_pull_request(
  title="feat: [feature-name]",
  body="## Summary\n[Description]\n\n## Changes\n- [change 1]\n- [change 2]\n\n## Test Plan\n- [test 1]\n- [test 2]",
  head="[current-branch]",
  base="master"
)
```

### Check Existing Issues
Before implementing, check for related GitHub issues:
```
mcp__github__search_issues(query="[feature-keyword] is:issue")
```

### Link to Issues
When creating PR, link to related issues:
```
mcp__github__create_pull_request(
  title="feat: [feature-name]",
  body="Closes #[issue-number]\n\n## Summary\n..."
)
```