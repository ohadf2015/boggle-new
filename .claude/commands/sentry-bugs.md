---
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm *), Bash(npx *), Bash(git *), mcp__sentry__*, mcp__notion__*, mcp__memory__*, mcp__github__*, TodoWrite, Task, Skill
description: Fetch Sentry errors, enrich with project context, fix bugs, and track in Notion/GitHub
---

# Sentry Bug Processor

This command fetches errors from Sentry, enriches them with project context, fixes them using the /fix approach, and tracks them in Notion for validation.

## Configuration

**Notion Bugs Page ID:** `2df3a83f-6508-80b4-90b3-f03613422bb5`
**Notion Bugs Page URL:** `https://www.notion.so/2df3a83f650880b490b3f03613422bb5`

---

## Phase 1: Fetch Errors from Sentry

Use the Sentry MCP tools to fetch recent errors:

### 1.1 List Available Projects
```
mcp__sentry__list_projects
```

### 1.2 Get Recent Issues
For the relevant project, fetch unresolved issues:
```
mcp__sentry__list_issues with query: "is:unresolved"
```

### 1.3 Get Issue Details
For each issue, get detailed information:
```
mcp__sentry__get_issue with issue_id: [issue_id]
```

Extract from each issue:
- **Error message** and type
- **Stack trace** with file paths and line numbers
- **Frequency** and last seen timestamp
- **Tags** and context data
- **Affected users** count

---

## Phase 2: Enrich with Project Context

For each Sentry error:

### 2.1 Map to Codebase
1. **Parse stack traces** to extract file paths and line numbers
2. **Search codebase** using Grep and Glob to find:
   - The exact files mentioned in the stack trace
   - Related components and dependencies
   - Similar patterns or error handling
3. **Read relevant files** at the error locations

### 2.2 Analyze Root Cause
1. Understand the code flow leading to the error
2. Identify potential causes:
   - Missing null checks
   - Async/await issues
   - Type mismatches
   - API response handling
   - State management bugs
3. Check for related issues in the same area

### 2.3 Create Enriched Error Report
For each error, document:
```markdown
## Sentry Issue: [Issue Title]

### Error Details
- **Type:** [error type]
- **Message:** [error message]
- **Frequency:** [count] occurrences
- **Last Seen:** [timestamp]
- **Affected Users:** [count]

### Stack Trace
[Relevant stack trace entries]

### Codebase Analysis
- **Primary File:** [file:line]
- **Related Files:** [list]
- **Root Cause:** [analysis]

### Fix Approach
[Proposed solution]
```

---

## Phase 3: Create Todo List

Use TodoWrite to track all errors to fix:

```json
[
  {"content": "Fix Sentry: [error 1 title]", "status": "pending", "activeForm": "Fixing Sentry: [error 1 title]"},
  {"content": "Fix Sentry: [error 2 title]", "status": "pending", "activeForm": "Fixing Sentry: [error 2 title]"}
]
```

---

## Phase 4: Fix Each Error

For each error in sequence:

### 4.1 Mark as In Progress
Update the todo status to `in_progress`

### 4.2 Apply Fix Using /fix Approach
1. **Read the file** at the error location
2. **Understand context** (surrounding code, imports, dependencies)
3. **Identify root cause** from stack trace and code analysis
4. **Apply minimal fix** - no unrelated changes
5. **Check if fix resolves** related errors

### 4.3 Mark as Completed
Update the todo status to `completed`

### 4.4 Document Test Instructions
For each fix:
```markdown
## Testing: [Error Title]

### Steps to Verify
1. [Step 1 - how to trigger the scenario]
2. [Step 2 - what to check]
3. [Step 3 - expected behavior]

### Expected Result
[What should happen after the fix]

### Sentry Verification
- Check that no new occurrences appear in Sentry
- Verify error count stops increasing
```

---

## Phase 5: Update Notion

### 5.1 Fetch Current Page
```
mcp__notion__notion-fetch with id: 2df3a83f-6508-80b4-90b3-f03613422bb5
```

### 5.2 Add to Validation Section
Use `mcp__notion__notion-update-page` with `command: "insert_content_after"` to add:

```markdown
## Waiting for Validation

### Sentry Fix: [Error Title] - Fixed [Date]
**Status:** Waiting for validation
**Sentry Issue:** [link to Sentry issue]

**Error Details:**
- Type: [error type]
- Occurrences: [count]
- Affected Users: [count]

**Fix Applied:**
[Brief description of the fix]

**Test Instructions:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:** [What should happen]

**Verification:**
- [ ] No new Sentry occurrences for 24h
- [ ] Manual testing passed
```

---

## Phase 6: Commit & Push (Optional)

If the user requests to commit the changes, use `/commit-push` to:
- Run all verification checks (translations, linting, type checking, tests, build)
- Fix any issues found
- Commit and push to remote

## Phase 7: Report to User

Output a summary in chat:

```markdown
## Sentry Bug Processing Complete

### Errors Fixed: [count]

| Error | Occurrences | Users Affected | Status |
|-------|-------------|----------------|--------|
| [Error 1] | [count] | [users] | Fixed |
| [Error 2] | [count] | [users] | Fixed |

**Next Step:** Run `/commit-push` to verify all checks and push to remote.

### How to Test Each Fix

#### 1. [Error Title]
**Sentry Link:** [link]
1. [Test step 1]
2. [Test step 2]
3. **Expected:** [Result]

#### 2. [Error Title]
**Sentry Link:** [link]
1. [Test step 1]
2. [Test step 2]
3. **Expected:** [Result]

---

**Notion Updated:** Fixes added to "Waiting for Validation" section
**Sentry:** Monitor for 24h to confirm fixes are effective
```

---

## Phase 8: Resolve Fixed Issues in Sentry (MANDATORY)

After fixing issues, mark them as resolved in Sentry to keep the dashboard clean.

### 8.1 Resolve via Sentry Dashboard
The Sentry MCP server is **read-only** — it cannot update issue status.
Provide the user with direct links to resolve each fixed issue:

```markdown
### Issues to Resolve in Sentry

Click each link → click "Resolve" button:
- [ISSUE-ID](https://lexiclash.sentry.io/issues/ISSUE-ID/) — [brief description of fix]
```

### 8.2 Bulk Resolve Non-Actionable Issues
For issues that are not code bugs (transient errors, third-party, stale deployments),
recommend the user bulk-resolve or ignore them in the Sentry dashboard:

```markdown
### Issues to Ignore (not code bugs)
- [ISSUE-ID](link) — transient Supabase 502
- [ISSUE-ID](link) — browser extension / third-party
- [ISSUE-ID](link) — already handled with graceful degradation
```

### 8.3 Noise Reduction
When `logger.warn()` sends non-actionable errors to Sentry, downgrade to `logger.debug()`.
This prevents future Sentry noise while keeping dev-mode visibility.

---

## Phase 9: GitHub Integration (Optional)

### Create GitHub Issue for Complex Bugs
For bugs requiring further investigation or team discussion:
```
mcp__github__create_issue(
  title="bug: [error-type] in [component]",
  body="## Sentry Error\n**Issue ID:** [sentry-id]\n**URL:** [sentry-url]\n\n## Error Details\n- Type: [type]\n- Occurrences: [count]\n- Affected Users: [count]\n\n## Stack Trace\n```\n[stack trace]\n```\n\n## Analysis\n[root cause analysis]\n\n## Proposed Fix\n[fix description]",
  labels=["bug", "sentry"]
)
```

### Link PR to Sentry Issue
When creating a fix PR, reference the Sentry issue:
```
mcp__github__create_pull_request(
  title="fix: [error-type] in [component]",
  body="## Sentry Issue\nFixes errors tracked in [sentry-url]\n\n## Changes\n[description]\n\n## Test Plan\n[steps to verify]"
)
```

### Check Existing Issues
Before creating new issues, check for duplicates:
```
mcp__github__search_issues(query="[error-type] is:issue")
```

---

## Error Handling

- If a Sentry error cannot be fixed, document the blocker in Notion and create a GitHub issue
- If stack trace points to external/node_modules code, document as "External dependency issue"
- If Notion update fails, still report all test instructions in chat
- If build/lint fails after a fix, revert and note the issue

---

## RULES

1. **Prioritize by impact:** Fix errors affecting most users first
2. **Use Sentry context:** Leverage tags, breadcrumbs, and context data
3. **Apply minimal fixes:** No unrelated refactoring
4. **Verify each fix:** Run build/lint/tsc after each change
5. **Always provide test instructions:** Clear steps to verify the fix
6. **Update Notion:** Track all fixes in the validation section
7. **Monitor Sentry:** Confirm no new occurrences after fix

---

## Quick Reference: Sentry MCP Tools

- `mcp__sentry__list_projects` - List all Sentry projects
- `mcp__sentry__list_issues` - Search/filter issues
- `mcp__sentry__get_issue` - Get issue details with stack trace
- `mcp__sentry__update_issue` - Change issue status (resolve, ignore)
- `mcp__sentry__add_issue_comment` - Add comments to issues
- `mcp__sentry__get_event` - Get specific error event details

---

## Memory Integration

### Before Processing (Phase 1.5)
Search for similar past Sentry errors and their fixes:
```
mcp__memory__memory_recall(query="sentry error [error-type] [affected-area]")
```

### After Each Fix (Phase 4.4)
Store the error pattern and fix for future reference:
```
mcp__memory__memory_store(
  content="Sentry fix: [error-title]. Error type: [type]. Root cause: [cause]. Solution: [solution]. File: [file:line].",
  type="fact",
  tags=["sentry", "bug-fix", "[error-type]", "[area]"],
  importance=7
)
```

### For Recurring Patterns
If you notice a pattern of similar errors:
```
mcp__memory__memory_store(
  content="Recurring error pattern: [pattern description]. Common causes: [causes]. Standard fix approach: [approach].",
  type="fact",
  tags=["sentry", "pattern", "[error-type]"],
  importance=8
)
```
