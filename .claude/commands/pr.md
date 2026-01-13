---
allowed-tools: Bash(git *), mcp__github__*, mcp__memory__*
argument-hint: [title] | --draft | --base [branch]
description: Create GitHub PR with proper formatting and linked issues
---

# Create Pull Request

Create a well-formatted GitHub PR using the GitHub MCP.

## Process

1. **Check branch status** - Verify commits, ensure pushed to remote
2. **Recall context** - Search memory for related features/bugs
3. **Gather changes** - Analyze commits since branch diverged
4. **Generate PR content** - Title, description, test plan
5. **Create PR** - Use GitHub MCP to create the PR
6. **Link issues** - Associate with related GitHub issues
7. **Store memory** - Record PR creation for future reference

## GitHub MCP Integration

### Step 1: Check Repository Status
```bash
git status
git log origin/master..HEAD --oneline
```

### Step 4: Analyze Changes
```
mcp__github__get_file_contents(path=".", ref="HEAD")
```

### Step 5: Create Pull Request
```
mcp__github__create_pull_request(
  title="[type]: [description]",
  body="## Summary\n[1-3 bullet points describing the change]\n\n## Changes\n- [specific change 1]\n- [specific change 2]\n\n## Test Plan\n- [ ] [test step 1]\n- [ ] [test step 2]\n\n## Related Issues\nCloses #[issue-number]",
  head="[current-branch]",
  base="master",
  draft=false
)
```

### Step 6: Link to Issues
Search for related issues to link:
```
mcp__github__search_issues(query="[keyword] is:issue is:open")
```

## PR Title Conventions

Use conventional commits format:
- `feat: [description]` - New feature
- `fix: [description]` - Bug fix
- `refactor: [description]` - Code refactoring
- `docs: [description]` - Documentation
- `test: [description]` - Tests
- `chore: [description]` - Maintenance

## PR Body Template

```markdown
## Summary
[Brief description of what this PR does]

## Changes
- [Change 1]
- [Change 2]
- [Change 3]

## Test Plan
- [ ] Unit tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual testing: [specific steps]

## Screenshots (if UI changes)
[Before/After screenshots]

## Related Issues
Closes #[issue-number]
```

## Draft PRs

Create a draft PR for work in progress:
```
mcp__github__create_pull_request(
  title="[WIP] [type]: [description]",
  body="## Work in Progress\n[description of what's done and what's remaining]",
  draft=true
)
```

## Memory Integration

### Recall (Step 2)
```
mcp__memory__memory_recall(query="PR [feature/bug area] related changes")
```

### Store (Step 7)
```
mcp__memory__memory_store(
  content="PR created: [title]. Branch: [branch]. Key changes: [changes]. Issue: #[number].",
  type="fact",
  tags=["pr", "github", "[area]"],
  importance=5
)
```

## Quick Reference

### List Open PRs
```
mcp__github__list_pull_requests(state="open")
```

### Get PR Details
```
mcp__github__get_pull_request(pull_number=[number])
```

### Add Reviewers
```
mcp__github__request_reviewers(pull_number=[number], reviewers=["username"])
```

### Merge PR
```
mcp__github__merge_pull_request(pull_number=[number], merge_method="squash")
```

## Rules

1. Include meaningful description, not just "fixes bug"
2. Link to related issues when applicable
3. Add test plan with specific verification steps
4. Use conventional commit format for titles
5. Create draft PRs for incomplete work
6. Use `/commit-push` before creating PR to ensure all checks pass
