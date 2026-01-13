---
name: commit-push
description: Fully autonomous commit and push workflow. Verifies linting, types, tests, and build - fixes any issues automatically - then commits and pushes. NO user confirmation required at any step.
---

# Commit Push (Fully Autonomous)

## Overview

This skill provides a **fully autonomous** pre-commit workflow that requires **ZERO user interaction**. It verifies code quality, fixes all issues automatically, commits with a meaningful message, and pushes to remote. Uses parallel agents for speed.

## CRITICAL: No Permission Required

**This workflow is PRE-AUTHORIZED to:**
- Run all verification commands (lint, tsc, test, build)
- Automatically fix any issues found
- Stage all changes with `git add .`
- Commit without asking for confirmation
- Push to remote without asking for confirmation

**DO NOT ask the user for:**
- Permission to fix issues
- Confirmation of commit message
- Approval to push
- Any other confirmation

**Just execute the entire workflow autonomously and report the results at the end.**

## When to Use This Skill

- User explicitly requests to commit and push changes
- User asks to "verify and push" or "check and commit"
- After completing a feature or bug fix that needs to be committed

## Autonomous Workflow

### Phase 1: Parallel Verification

**Run ALL THREE verification steps in parallel using Task agents in a SINGLE message.**

Launch three agents simultaneously with ONE message containing THREE Task tool calls:

```
Task 1: Linting Agent (subagent_type: Bash)
Task 2: Type Checking Agent (subagent_type: Bash)
Task 3: Test Agent (subagent_type: Bash)
```

#### Agent 1: ESLint Verification
**Prompt:**
```
cd /Users/ohadfisher/git/boggle-new/fe-next
Run: npm run lint
If issues found, run: npm run lint -- --fix
For remaining issues: read files, apply manual fixes per CLAUDE.md guidelines.
Re-run lint to verify zero errors.
Report: linting status and any fixes applied.
Do NOT ask for user permission - fix everything automatically.
```

#### Agent 2: Type Checking Verification
**Prompt:**
```
cd /Users/ohadfisher/git/boggle-new/fe-next
Run: npx tsc --noEmit
If errors found: read files, fix type errors. Never use 'any' type.
Re-run to verify zero errors.
Report: type checking status and any fixes applied.
Do NOT ask for user permission - fix everything automatically.
```

#### Agent 3: Test Verification
**Prompt:**
```
cd /Users/ohadfisher/git/boggle-new/fe-next
Run: npm run test
If failures: analyze each test failure, fix root cause in code (not tests).
Re-run to verify all tests pass.
Report: test status and any fixes applied.
Do NOT ask for user permission - fix everything automatically.
```

**Wait for all three agents to complete.**

### Phase 2: Build Verification

After Phase 1 completes successfully:

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build
```

If build fails:
- Fix compilation/bundling issues immediately
- Re-run until build succeeds
- **DO NOT ask for permission - just fix it**

### Phase 3: Commit and Push (Automatic)

After build succeeds, execute these commands in sequence:

#### Step 1: Check Current State
```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && git status && git diff --stat
```

#### Step 2: Generate Commit Message

Analyze the changes and create a conventional commit message:
- Use: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- First line: Brief summary (50-72 characters)
- Body: Detailed explanation if needed
- Always include: `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`

#### Step 3: Stage and Commit

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && git add . && git commit -m "$(cat <<'EOF'
[Your generated commit message]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

**DO NOT ask for confirmation. Just commit.**

#### Step 4: Push to Remote

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && git push
```

If push fails:
```bash
# Set upstream if needed
git push -u origin $(git rev-parse --abbrev-ref HEAD)
```

If still fails due to diverged branches:
```bash
git pull --rebase && git push
```

**DO NOT ask for confirmation. Just push.**

## Parallel Execution Template

When executing Phase 1, use this exact pattern:

```
[Send ONE message with THREE Task tool calls]

Task 1:
  subagent_type: Bash
  description: "Run linting"
  prompt: [Linting agent prompt]

Task 2:
  subagent_type: Bash
  description: "Check types"
  prompt: [Type checking agent prompt]

Task 3:
  subagent_type: Bash
  description: "Run tests"
  prompt: [Test agent prompt]
```

## Error Handling (Autonomous)

- **Lint errors**: Run --fix, then manual fixes
- **Type errors**: Fix types properly (no `any`)
- **Test failures**: Fix the code, not the tests
- **Build failures**: Fix compilation issues
- **Push failures**: Handle upstream/rebase automatically

**NEVER stop to ask the user. Fix and continue.**

## Success Criteria

- ✅ ESLint passes (zero errors)
- ✅ TypeScript passes (zero errors)
- ✅ All tests pass
- ✅ Build succeeds
- ✅ Changes committed
- ✅ Changes pushed

## Final Report

After ALL steps complete, provide this summary:

```
✅ Commit and Push Complete

Verification Results:
- Linting: [Status] [Fixed X issues if any]
- Type checking: [Status] [Fixed X errors if any]
- Tests: [Status] [Fixed X failures if any]
- Build: [Passed]

Git:
- Commit: [hash]
- Message: [first line]
- Branch: [branch name]
- Remote: [pushed successfully]
```

## Important Notes

1. **This is a FIRE-AND-FORGET skill** - user invokes it and waits for completion
2. **All operations are pre-authorized** - no confirmation dialogs
3. **Fix everything automatically** - don't ask, just fix
4. **Report at the end** - only communicate when complete
5. **Use parallel agents** - maximize speed by running verification in parallel
