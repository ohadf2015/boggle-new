# Commit-Push Skill

## Description
Autonomous commit and push workflow with complete verification. This workflow verifies code quality through linting, type-checking, testing, and building before committing and pushing changes.

## When to Use
- User explicitly requests to commit and push changes
- After completing a feature or bug fix
- When verification and commit are needed

## Tools Required
- `bash` - For running npm scripts and git commands
- `spawn_subagent` - For parallel verification (optional but recommended)
- `file_read` - To check git status

## IMPORTANT: Pre-Authorization

This workflow is designed to run autonomously once invoked. The user's request to "commit and push" is the authorization. Execute the entire workflow and report results at the end.

## Workflow Steps

### Phase 1: Verification (Parallel or Sequential)

**Option A: Parallel (Faster, if possible)**
Use three separate bash commands or spawn three verifier subagents:
```
1. Linting: npm run lint (auto-fix if issues found)
2. Type checking: npx tsc --noEmit (fix type errors)
3. Tests: npm run test (fix failures)
```

**Option B: Sequential (Simple)**
Run verification steps one by one:

#### Step 1: Linting
```bash
cd fe-next && npm run lint
```

**If errors:**
```bash
cd fe-next && npm run lint -- --fix
# Then re-run: npm run lint
```

**If still errors:**
- Read the error files
- Apply manual fixes per CLAUDE.md guidelines
- Re-run lint until zero errors

#### Step 2: Type Checking
```bash
cd fe-next && npx tsc --noEmit
```

**If errors:**
- Read the files with type errors
- Fix type issues (NO `any` types)
- Re-run type check until zero errors

#### Step 3: Testing
```bash
cd fe-next && npm run test
```

**If failures:**
- Analyze test failures
- Fix the code (NOT the tests)
- Re-run tests until all pass

#### Step 4: Build Verification
```bash
cd fe-next && npm run build
```

**If build fails:**
- Fix compilation/bundling issues
- Re-run build until succeeds

#### Step 5: Translation Check
```bash
cd fe-next && npm run check:translations
```

**If missing translations:**
- Add missing keys to all 4 language files
- Re-run check until complete

### Phase 2: Git Operations

#### Step 1: Check Current State
```bash
git status
git diff --stat
```

Review what will be committed.

#### Step 2: Generate Commit Message

Analyze the changes and create a conventional commit message:

**Format:**
```
<type>: <brief summary>

<detailed description if needed>

Co-Authored-By: Verdent AI Assistant <noreply@verdent.ai>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `test:` - Add or update tests
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `style:` - Formatting, styling

**Example:**
```
feat: add multiplayer game synchronization

Implemented real-time game state synchronization using Socket.IO.
Players now see word submissions from other players instantly.
Added tests for socket event handlers and state management.

Co-Authored-By: Verdent AI Assistant <noreply@verdent.ai>
```

#### Step 3: Stage and Commit
```bash
git add .
git commit -m "<commit-message>"
```

#### Step 4: Push to Remote
```bash
git push
```

**If push fails (no upstream):**
```bash
git push -u origin $(git rev-parse --abbrev-ref HEAD)
```

**If push fails (diverged branches):**
```bash
git pull --rebase
git push
```

### Phase 3: Verification Complete

Report summary to user:
```
✅ Commit and Push Complete

Verification Results:
- Linting: Passed (fixed X issues)
- Type checking: Passed (fixed X errors)
- Tests: Passed (all X tests)
- Build: Passed
- Translations: Complete (4 languages)

Git Operations:
- Commit: <hash>
- Message: <first line>
- Branch: <branch-name>
- Remote: Pushed successfully
```

## Error Handling

### Lint Errors Won't Fix
- Review errors manually
- Apply fixes following CLAUDE.md
- Never use `// eslint-disable` unless critical

### Type Errors Persist
- Define proper types (NO `any`)
- Fix null/undefined handling
- Ensure imports are correct

### Tests Fail
- Fix the CODE, not the tests
- Tests define expected behavior
- Ensure no regressions

### Build Fails
- Check compilation errors
- Verify imports
- Check Next.js config

### Push Rejected
- Pull latest changes
- Rebase if needed
- Resolve conflicts
- Push again

## Example Complete Run

```bash
# Phase 1: Verification
cd fe-next

# Linting
npm run lint || npm run lint -- --fix && npm run lint

# Type checking
npx tsc --noEmit

# Tests
npm run test

# Build
npm run build

# Translations
npm run check:translations

# Phase 2: Git Operations
cd ..
git status
git diff --stat

# Stage and commit
git add .
git commit -m "feat: implement new game feature

Added new scoring system with combo multipliers.
Updated translations for all 4 languages.
Added comprehensive tests.

Co-Authored-By: Verdent AI Assistant <noreply@verdent.ai>"

# Push
git push || git push -u origin $(git rev-parse --abbrev-ref HEAD)

# Done!
```

## Success Criteria

- [ ] Linting passes (zero errors)
- [ ] Type checking passes (zero errors)
- [ ] All tests pass
- [ ] Production build succeeds
- [ ] Translations complete (4 languages)
- [ ] Changes committed with conventional message
- [ ] Changes pushed to remote successfully

## Notes

- Run all verification from `fe-next/` directory
- Git operations run from project root
- Fix all issues before committing
- Use conventional commit format
- Always include co-author line
- Report summary at the end

---

**Remember**: This is an autonomous workflow. Once invoked, execute all steps and report results. Don't ask for permission at each step.
