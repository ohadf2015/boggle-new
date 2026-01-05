---
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm *), Bash(npx *), Bash(git *), mcp__notion__*, TodoWrite, Task, Skill
description: Process bugs from Notion backlog - analyze, fix, and mark for validation
---

# Backlog Bug Processor

This command fetches pending bugs from the Notion bugs database, analyzes them in project context, fixes them, and marks them for validation.

## Configuration

**Notion Bugs Page ID:** `2df3a83f-6508-80b4-90b3-f03613422bb5`
**Notion Bugs Page URL:** `https://www.notion.so/2df3a83f650880b490b3f03613422bb5`

---

## Phase 1: Fetch Pending Bugs

Use the Notion MCP tool to fetch the bugs page:

```
mcp__notion__notion-fetch with id: 2df3a83f-6508-80b4-90b3-f03613422bb5
```

Parse the page content and extract:
- **Pending bugs:** Items marked with `- [ ]` (unchecked)
- **Completed bugs:** Items marked with `- [x]` (checked) - skip these

If no pending bugs found, inform the user and stop.

---

## Phase 2: Analyze Each Bug

For each pending bug:

### 2.1 Expand Bug Context
Search the codebase to understand what the bug is referring to:

1. **Parse keywords** from the bug description
2. **Search codebase** using Grep and Glob for:
   - Related component names
   - Feature names mentioned
   - Error messages or behaviors described
3. **Read relevant files** to understand the current implementation
4. **Document findings:**
   - Where the bug likely manifests (files, components)
   - Root cause hypothesis
   - Related code locations

### 2.2 Create Expanded Bug Report
For each bug, create an expanded version with:
```
## Bug: [Original bug description]

### Analysis
- **Affected Files:** [list of files]
- **Root Cause:** [hypothesis]
- **Related Code:** [key code references]

### Fix Approach
[Brief description of how to fix]
```

---

## Phase 3: Create Todo List

Use TodoWrite to create a todo list with all bugs:

```
[
  {"content": "Fix: [bug 1 title]", "status": "pending", "activeForm": "Fixing: [bug 1 title]"},
  {"content": "Fix: [bug 2 title]", "status": "pending", "activeForm": "Fixing: [bug 2 title]"},
  ...
]
```

---

## Phase 4: Fix Each Bug

For each bug in sequence:

### 4.1 Mark as In Progress
Update the todo status to `in_progress`

### 4.2 Apply Fix
Use the /fix skill approach:
1. Read the file at the error/bug location
2. Understand context
3. Identify root cause
4. Apply minimal fix
5. Check if fix resolves the issue

### 4.3 Verify Fix
Run relevant checks:
- `npx tsc --noEmit` - TypeScript errors
- `npm run lint` - Linting
- `npm run build` - Build verification

### 4.4 Mark as Completed
Update the todo status to `completed`

### 4.5 Document Test Instructions
For each fix, document:
```
## Testing: [Bug Title]

### Steps to Verify
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Result
[What should happen after the fix]

### How to Reproduce (Before Fix)
[Steps that would show the bug before the fix]
```

---

## Phase 5: Update Notion

### 5.1 Mark Bugs as Done
Update the Notion page to mark fixed bugs as checked:
- Change `- [ ] Bug description` to `- [x] Bug description`

### 5.2 Add Validation Section
Add a new section to the Notion page:

```markdown
## Waiting for Validation

### [Bug Title] - Fixed [Date]
**Status:** Waiting for validation

**Test Instructions:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:** [What should happen]
```

Use `mcp__notion__notion-update-page` with:
- `command: "insert_content_after"`
- Insert the validation section after the bugs list

---

## Phase 6: Report to User

Output a summary in chat:

```markdown
## Backlog Processing Complete

### Bugs Fixed: [count]

| Bug | Status | Test Instructions |
|-----|--------|------------------|
| [Bug 1] | Fixed | [Brief test steps] |
| [Bug 2] | Fixed | [Brief test steps] |

### Verification Commands
Run these to verify fixes:
- `npm run build`
- `npm run lint`
- `npx tsc --noEmit`

### How to Test Each Fix

#### 1. [Bug Title]
1. [Test step 1]
2. [Test step 2]
3. **Expected:** [Result]

#### 2. [Bug Title]
1. [Test step 1]
2. [Test step 2]
3. **Expected:** [Result]

---

**Notion Updated:** Bugs marked as done and moved to "Waiting for Validation"
```

---

## Error Handling

- If a bug cannot be fixed, keep it unchecked in Notion and add a comment explaining why
- If Notion update fails, still report the test instructions in chat
- If build/lint fails after a fix, revert and note the issue

---

## RULES

1. Always analyze bugs in project context before fixing
2. Apply minimal, focused fixes - no unrelated changes
3. Verify each fix with build/lint/tsc
4. Always provide clear test instructions
5. Update Notion with validation status
6. Report all test instructions in chat for the user
