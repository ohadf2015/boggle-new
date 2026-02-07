---
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm *), Bash(npx *), Bash(git *), mcp__notion__*, mcp__memory__*, TodoWrite, Task, Skill, AskUserQuestion
description: Process improvement tasks from Notion - analyze, implement with /feature workflow, and mark for validation
---

# New Feature Processor

This command fetches pending improvement tasks from the Notion page, expands them with project context, implements them using the /feature workflow, and marks them for validation.

## Configuration

**Notion Page ID:** `2df3a83f-6508-80b4-90b3-f03613422bb5`
**Notion Page URL:** `https://www.notion.so/2df3a83f650880b490b3f03613422bb5`

---

## Project Context (LexiClash)

LexiClash is a multiplayer word game built with:

### Tech Stack
- **Frontend:** Next.js 16, React 19, TypeScript
- **Backend:** Express + Socket.io for real-time multiplayer
- **Database:** Supabase (PostgreSQL + Auth)
- **Styling:** Tailwind CSS, Radix UI components
- **State:** XState for game state machines
- **Testing:** Jest (unit), Playwriter (e2e)

### Project Structure
```
fe-next/
├── app/[locale]/          # Next.js App Router with i18n
│   ├── daily/            # Daily challenge mode
│   ├── singleplayer/     # Single player vs bots
│   ├── multiplayer/      # Multiplayer rooms
│   ├── profile/          # User profile & stats
│   └── api/              # API routes
├── components/            # React components
│   ├── grid/             # Game grid components
│   ├── multiplayer/      # Multiplayer-specific UI
│   ├── singleplayer/     # Single player UI
│   └── ui/               # Shared UI components (shadcn)
├── hooks/                 # Custom React hooks
├── contexts/             # React contexts
├── backend/              # Socket.io server & game logic
├── shared/               # Shared types & utilities
└── locales/              # i18n translation files (en, he, es, sv)
```

### Key Features
- Real-time multiplayer word finding game
- Daily challenges with global leaderboards
- Single player vs AI bots
- Achievement system
- Friend system with invites
- Multiple languages support

---

## Phase 1: Fetch Pending Improvements

Use the Notion MCP tool to fetch the page:

```
mcp__notion__notion-fetch with id: 2df3a83f-6508-80b4-90b3-f03613422bb5
```

Parse the content under `## improvements` section:
- **Pending tasks:** Items marked with `- [ ]` (unchecked)
- **Completed tasks:** Items marked with `- [x]` (checked) - skip these

If no pending improvements found, inform the user and stop.

---

## Phase 2: Analyze Each Improvement

For each pending improvement:

### 2.1 Expand with Project Context

Search the codebase to understand what the improvement involves:

1. **Parse keywords** from the improvement description
2. **Search codebase** for related:
   - Components that would be affected
   - Hooks or contexts involved
   - API routes if applicable
   - Existing similar patterns to follow
3. **Check product backlog** at `docs/ux-research/product-backlog.md` for related user stories
4. **Document findings:**
   - Related existing code
   - Similar patterns in the codebase
   - Integration points
   - Potential impact areas

### 2.2 Create Expanded Feature Spec

For each improvement, create an expanded version:
```
## Feature: [Original improvement description]

### Context Analysis
- **Related Components:** [list]
- **Existing Patterns:** [similar features to follow]
- **Integration Points:** [where this connects]
- **Related User Stories:** [from product backlog if any]

### Proposed Implementation
- **Files to Create:** [if any]
- **Files to Modify:** [list with brief descriptions]
- **New Dependencies:** [if any needed]

### Acceptance Criteria (inferred)
- [ ] [Criteria 1]
- [ ] [Criteria 2]
- [ ] [Criteria 3]

### Test Cases
- [ ] [Test case 1]
- [ ] [Test case 2]
```

---

## Phase 3: Create Todo List

Use TodoWrite to create a checklist:

```
[
  {"content": "Implement: [improvement 1]", "status": "pending", "activeForm": "Implementing: [improvement 1]"},
  {"content": "Implement: [improvement 2]", "status": "pending", "activeForm": "Implementing: [improvement 2]"},
  ...
]
```

---

## Phase 4: Implement Each Feature

For each improvement, follow the /feature workflow:

### 4.1 Mark as In Progress
Update the todo status to `in_progress`

### 4.2 Phase: Clarify if Needed
If requirements are ambiguous, use AskUserQuestion to clarify:
- Scope boundaries
- Design requirements
- Edge case handling

### 4.3 Phase: Find Similar Patterns
Search for existing patterns to follow:
```bash
# Find similar implementations
grep -rn "[feature_keyword]" --include="*.tsx" --include="*.ts"
```
Read 2-3 similar files to match project style.

### 4.4 Phase: Implementation Plan
Create and present plan before coding:
- Files to create
- Files to modify
- Implementation steps
- Test cases

### 4.5 Phase: Test-First Implementation
1. Write tests first (if applicable)
2. Implement minimal code to pass tests
3. Refactor if needed

### 4.6 Mark as Completed
Update the todo status to `completed`

### 4.7 Document Test Instructions
For each feature, document:
```
## Testing: [Feature Title]

### How to Test
1. [Step 1 - navigation/setup]
2. [Step 2 - action to take]
3. [Step 3 - what to observe]

### Expected Behavior
[Detailed description of expected result]

### Edge Cases to Verify
- [Edge case 1]
- [Edge case 2]

### Before/After Comparison
- **Before:** [Previous behavior]
- **After:** [New behavior]
```

---

## Phase 5: Update Notion

### 5.1 Mark Improvements as Done
Update the Notion page to check completed items under `## improvements`:
- Change `- [ ] Improvement description` to `- [x] Improvement description`

### 5.2 Add to New Feature Validation Section
Add entries to `## new feature validation` section:

```markdown
### [Feature Title] - Implemented [Date]
**Status:** Waiting for validation

**What Changed:**
[Brief description of implementation]

**Test Instructions:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:** [What should happen]

**Files Changed:**
- `path/to/file1.tsx` - [brief description]
- `path/to/file2.ts` - [brief description]
```

Use `mcp__notion__notion-update-page` with:
- `command: "replace_content_range"` to update improvements checkboxes
- `command: "insert_content_after"` to add validation entries

---

## Phase 6: Commit & Push (Optional)

If the user requests to commit the changes, use `/commit-push` to:
- Run all verification checks (translations, linting, type checking, tests, build)
- Fix any issues found
- Commit and push to remote

## Phase 7: Report to User

Output a summary in chat:

```markdown
## New Feature Processing Complete

### Features Implemented: [count]

| Feature | Status | Files Changed |
|---------|--------|---------------|
| [Feature 1] | Implemented | [count] files |
| [Feature 2] | Implemented | [count] files |

### Verification Results
- TypeScript: ✅/❌
- Lint: ✅/❌
- Build: ✅/❌
- Tests: ✅/❌

---

### How to Test Each Feature

#### 1. [Feature Title]
**What Changed:** [Brief description]

**Test Steps:**
1. [Navigate to X]
2. [Do Y]
3. [Observe Z]

**Expected Result:** [What you should see]

**Edge Cases:**
- [Edge case to verify]

---

#### 2. [Feature Title]
**What Changed:** [Brief description]

**Test Steps:**
1. [Navigate to X]
2. [Do Y]
3. [Observe Z]

**Expected Result:** [What you should see]

---

**Notion Updated:** Features marked as done and moved to "New Feature Validation"
```

---

## Error Handling

- If a feature cannot be implemented, keep it unchecked and document the blocker
- If tests fail, attempt to fix; if unable, document the issue
- If Notion update fails, still report all instructions in chat
- For breaking changes, warn the user before proceeding

---

## RULES

1. Always expand improvements with project context before implementing
2. Follow existing patterns in the codebase
3. Use the /feature workflow (clarify → plan → test-first → verify)
4. No implementation without understanding scope
5. Match existing code style (TypeScript, Tailwind, component patterns)
6. Always verify with build/lint/tsc/tests
7. Provide clear, actionable test instructions
8. Update Notion with validation status
9. Report all test instructions in chat
10. Ask questions if requirements are ambiguous

---

## Memory Integration

### Before Processing (Phase 1.5)
Recall related features and patterns:
```
mcp__memory__memory_recall(query="feature [feature-area] implementation pattern")
```

### After Each Feature (Phase 4.7)
Store feature implementation for future reference:
```
mcp__memory__memory_store(
  content="Feature: [feature-name]. Implementation: [brief description]. Key files: [files]. Pattern: [pattern used].",
  type="fact",
  tags=["feature", "implementation", "[feature-area]"],
  importance=7
)
```
