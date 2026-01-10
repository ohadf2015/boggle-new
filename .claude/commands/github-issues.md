---
allowed-tools: Read, Grep, mcp__github__*, mcp__memory__*
argument-hint: [action] [query/number] | list | create | update | close
description: Manage GitHub issues - list, create, update, and close issues
---

# GitHub Issue Management

Manage GitHub issues using the GitHub MCP.

## Actions

### List Issues
```
/github-issues list [query]
```

### Create Issue
```
/github-issues create [title]
```

### Update Issue
```
/github-issues update [number]
```

### Close Issue
```
/github-issues close [number]
```

## GitHub MCP Commands

### List Open Issues
```
mcp__github__list_issues(state="open")
```

### Search Issues
```
mcp__github__search_issues(query="[keyword] is:issue is:open")
```

### Get Issue Details
```
mcp__github__get_issue(issue_number=[number])
```

### Create Issue
```
mcp__github__create_issue(
  title="[type]: [description]",
  body="## Description\n[detailed description]\n\n## Steps to Reproduce (if bug)\n1. [step 1]\n2. [step 2]\n\n## Expected Behavior\n[expected]\n\n## Actual Behavior\n[actual]",
  labels=["bug"]
)
```

### Update Issue
```
mcp__github__update_issue(
  issue_number=[number],
  title="[updated title]",
  body="[updated body]",
  state="open",
  labels=["bug", "priority-high"]
)
```

### Close Issue
```
mcp__github__update_issue(
  issue_number=[number],
  state="closed"
)
```

### Add Comment
```
mcp__github__add_issue_comment(
  issue_number=[number],
  body="[comment content]"
)
```

## Issue Templates

### Bug Report
```
mcp__github__create_issue(
  title="bug: [short description]",
  body="## Bug Description\n[Clear description of the bug]\n\n## Steps to Reproduce\n1. Go to [page]\n2. Click on [element]\n3. See error\n\n## Expected Behavior\n[What should happen]\n\n## Actual Behavior\n[What actually happens]\n\n## Environment\n- Browser: [browser]\n- Device: [device]\n- Version: [version]\n\n## Screenshots\n[If applicable]",
  labels=["bug"]
)
```

### Feature Request
```
mcp__github__create_issue(
  title="feat: [short description]",
  body="## Feature Description\n[Clear description of the feature]\n\n## Use Case\n[Why is this needed? What problem does it solve?]\n\n## Proposed Solution\n[How should it work?]\n\n## Alternatives Considered\n[Other approaches you've considered]\n\n## Additional Context\n[Any other information]",
  labels=["enhancement"]
)
```

### Tech Debt
```
mcp__github__create_issue(
  title="chore: [short description]",
  body="## Current State\n[What's the current situation?]\n\n## Problem\n[Why is this tech debt?]\n\n## Proposed Improvement\n[What should be done?]\n\n## Impact\n- Performance: [impact]\n- Maintainability: [impact]\n- Security: [impact]",
  labels=["tech-debt"]
)
```

### Documentation
```
mcp__github__create_issue(
  title="docs: [short description]",
  body="## Documentation Needed\n[What needs to be documented?]\n\n## Location\n[Where should this documentation live?]\n\n## Content Outline\n- [Topic 1]\n- [Topic 2]",
  labels=["documentation"]
)
```

## Label Reference

| Label | Use For |
|-------|---------|
| `bug` | Something isn't working |
| `enhancement` | New feature or request |
| `tech-debt` | Code quality improvements |
| `documentation` | Documentation updates |
| `priority-high` | Urgent issues |
| `priority-low` | Nice to have |
| `good-first-issue` | Good for newcomers |
| `help-wanted` | Extra attention needed |

## Search Queries

### Find bugs
```
mcp__github__search_issues(query="is:issue is:open label:bug")
```

### Find high priority
```
mcp__github__search_issues(query="is:issue is:open label:priority-high")
```

### Find by keyword
```
mcp__github__search_issues(query="[keyword] is:issue is:open")
```

### Find assigned to me
```
mcp__github__search_issues(query="is:issue is:open assignee:@me")
```

### Find unassigned
```
mcp__github__search_issues(query="is:issue is:open no:assignee")
```

## Workflow Integration

### Create Issue from Investigation
After `/investigate`, if a fix isn't immediately possible:
```
mcp__github__create_issue(
  title="bug: [error description]",
  body="## Investigation Summary\n[findings from /investigate]\n\n## Root Cause\n[identified cause]\n\n## Proposed Fix\n[recommended solution]\n\n## Related Files\n- [file1]\n- [file2]",
  labels=["bug"]
)
```

### Create Issue from Sentry
Link Sentry errors to GitHub issues:
```
mcp__github__create_issue(
  title="bug: [sentry error title]",
  body="## Sentry Issue\n[link to sentry]\n\n## Error Details\n```\n[stack trace]\n```\n\n## Occurrences\n[count] times, affecting [users] users",
  labels=["bug", "sentry"]
)
```

### Create Issue from Architecture Review
After `/arch-review`, create improvement issues:
```
mcp__github__create_issue(
  title="arch: [improvement area]",
  body="## Current Architecture\n[description]\n\n## Problem\n[identified issue]\n\n## Proposed Improvement\n[recommendation]\n\n## Impact\n[expected benefits]",
  labels=["tech-debt", "architecture"]
)
```

## Memory Integration

### Recall Related Issues
```
mcp__memory__memory_recall(query="github issue [topic] [area]")
```

### Store Issue Context
```
mcp__memory__memory_store(
  content="GitHub issue #[number]: [title]. Status: [status]. Key info: [context].",
  type="fact",
  tags=["github", "issue", "[area]"],
  importance=5
)
```

## Output Format

### List Output
```markdown
## Open Issues ([count])

| # | Title | Labels | Created |
|---|-------|--------|---------|
| [num] | [title] | [labels] | [date] |
```

### Single Issue Output
```markdown
## Issue #[number]: [title]

**Status:** [open/closed]
**Labels:** [labels]
**Created:** [date]
**Assignee:** [assignee]

### Description
[body]

### Comments ([count])
[recent comments]
```

## Rules

1. Always search for existing issues before creating duplicates
2. Use appropriate labels for categorization
3. Provide clear, actionable descriptions
4. Link related issues and PRs
5. Update issues as work progresses
6. Close issues when resolved with reference to fixing PR
