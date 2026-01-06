---
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm *), Bash(npx *), Bash(git *), mcp__sentry__*, mcp__notion__*, TodoWrite, Task, Skill
description: Fetch Sentry errors, enrich with project context, fix bugs, and track in Notion
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

### 4.3 Verify Fix
Run relevant checks:
```bash
npx tsc --noEmit     # TypeScript errors
npm run lint         # Linting
npm run build        # Build verification
```

### 4.4 Mark as Completed
Update the todo status to `completed`

### 4.5 Document Test Instructions
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

## Phase 6: Report to User

Output a summary in chat:

```markdown
## Sentry Bug Processing Complete

### Errors Fixed: [count]

| Error | Occurrences | Users Affected | Status |
|-------|-------------|----------------|--------|
| [Error 1] | [count] | [users] | Fixed |
| [Error 2] | [count] | [users] | Fixed |

### Verification Commands
```bash
npm run build
npm run lint
npx tsc --noEmit
```

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

## Phase 7: Sentry Issue Management (Optional)

If fixes are confirmed working:

### 7.1 Resolve Issues in Sentry
```
mcp__sentry__update_issue with issue_id: [id], status: "resolved"
```

### 7.2 Add Resolution Comment
```
mcp__sentry__add_issue_comment with issue_id: [id], comment: "Fixed in commit [hash]"
```

---

## Error Handling

- If a Sentry error cannot be fixed, document the blocker in Notion
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
