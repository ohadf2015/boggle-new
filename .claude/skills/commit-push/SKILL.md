---
name: commit-push
description: Fully autonomous commit and push workflow. Scopes linting, types, tests, and build to ONLY changed files since last push - fixes any issues automatically - then commits and pushes. NO user confirmation required at any step.
---

# Commit Push (Fully Autonomous, Delta-Scoped)

## Overview

This skill provides a **fully autonomous** pre-commit workflow that requires **ZERO user interaction**. It **only verifies what changed** since the last push — no full-project lint/test/build unless necessary. Fixes all issues automatically, commits with a meaningful message, and pushes to remote.

## CRITICAL: No Permission Required

**This workflow is PRE-AUTHORIZED to:**
- Run scoped verification commands (lint, tsc, test, build)
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

### Phase 0: Determine Changed Files (MUST RUN FIRST)

Compute the delta — all changed files since last push. This scopes every subsequent phase.

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next

# Get the remote tracking branch (e.g., origin/master)
REMOTE_REF=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "origin/$(git rev-parse --abbrev-ref HEAD)")

# Files changed since last push (staged + unstaged + untracked)
CHANGED_SINCE_PUSH=$(git diff --name-only "$REMOTE_REF"...HEAD 2>/dev/null; git diff --name-only; git diff --name-only --cached; git ls-files --others --exclude-standard)

# Deduplicate
CHANGED_FILES=$(echo "$CHANGED_SINCE_PUSH" | sort -u)

# Categorize
SRC_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' | grep -v '__tests__' | grep -v '\.test\.' | grep -v '\.spec\.')
TEST_FILES=$(echo "$CHANGED_FILES" | grep -E '(__tests__/.*\.(ts|tsx|js|jsx)$|\.test\.(ts|tsx|js|jsx)$|\.spec\.(ts|tsx|js|jsx)$)')
BACKEND_FILES=$(echo "$SRC_FILES" | grep '^backend/')
FRONTEND_FILES=$(echo "$SRC_FILES" | grep -v '^backend/')
CONFIG_FILES=$(echo "$CHANGED_FILES" | grep -E '(next\.config|tsconfig|tailwind\.config|package\.json|vitest\.config|eslint)')
```

Save these lists — they drive all subsequent phases.

**Decision matrix based on delta:**

| What changed | Lint | Types | Tests | Build |
|---|---|---|---|---|
| Only test files | skip | skip | run related tests only | skip |
| Only frontend src | lint changed files | full tsc | vitest --related | skip (unless config changed) |
| Only backend src | lint changed files | full tsc | vitest --related | skip |
| Config files (next.config, tsconfig, etc.) | full lint | full tsc | full tests | full build |
| package.json / lock file | full lint | full tsc | full tests | full build |
| Mix of above | lint changed files | full tsc | related tests only | full build only if config changed |

### Phase 1: Parallel Scoped Verification

**Run verification steps in parallel using agents in a SINGLE message.** Skip any step the decision matrix says to skip.

#### Agent 1: Scoped ESLint

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next

# If config files changed → full lint: npm run lint
# Otherwise → lint only changed .ts/.tsx/.js/.jsx files
LINT_FILES="[space-separated list of changed source + test files]"

if [ -n "$LINT_FILES" ]; then
  npm run lint -- $LINT_FILES --fix
  # If --fix didn't resolve all: read files, apply manual fixes
  npm run lint -- $LINT_FILES  # verify clean
fi
```

Report: linting status, which files were linted, fixes applied.
Do NOT ask for user permission - fix everything automatically.

#### Agent 2: Type Checking (skip if only test files changed)

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next

# tsc is project-wide by design — cannot scope to files.
# BUT: skip entirely if only test files or non-TS files changed.
npx tsc --noEmit
```

If errors found: fix type errors (never use `any`). Re-run to verify.
Do NOT ask for user permission - fix everything automatically.

#### Agent 3: Scoped Tests

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next

# --changed uses git status internally to find affected tests — no file lists needed
npx vitest run --config vitest.config.ts --changed
npx vitest run --config backend/vitest.config.ts --changed
```

If failures: fix root cause in code (not tests). Re-run to verify.
Do NOT ask for user permission - fix everything automatically.

**Wait for all agents to complete.**

### Phase 2: Conditional Build

**Skip build entirely if:**
- No config files changed (next.config, tsconfig, tailwind.config, package.json)
- No new dependencies added
- Changes are only in source/test files (not build-affecting)

**Run full build if:**
- Config files changed
- package.json or lock file changed
- New files were created that might affect routing (app/ directory changes)
- User explicitly requested build verification

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next

# Use build:fast (skips schema compilation) unless schema files changed
SCHEMA_FILES_CHANGED=$(echo "$CHANGED_FILES" | grep -E '(backend/utils/schemas\.ts|backend/modules/scoringEngine\.ts|shared/schemas/|shared/types/|shared/stateMachines/)')
if [ -n "$SCHEMA_FILES_CHANGED" ]; then
  npm run build          # full build with schema compilation
else
  npm run build:fast     # skip schema compilation (~5-10s saved)
fi
```

If build fails: fix issues immediately, re-run. **DO NOT ask for permission.**

### Phase 3: Commit and Push (Automatic)

#### Step 1: Check Current State
```bash
cd /Users/ohadfisher/git/boggle-new && git status && git diff --stat
```

#### Step 2: Generate Commit Message

Analyze changes and create a conventional commit message:
- Use: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- First line: Brief summary (50-72 characters)
- Body: Detailed explanation if needed
- Always include: `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`

#### Step 3: Stage and Commit

```bash
cd /Users/ohadfisher/git/boggle-new && git add -A && git commit -m "$(cat <<'EOF'
[Your generated commit message]

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

**DO NOT ask for confirmation. Just commit.**

#### Step 4: Push to Remote

```bash
cd /Users/ohadfisher/git/boggle-new && git push
```

If push fails:
```bash
git push -u origin $(git rev-parse --abbrev-ref HEAD)
```

If still fails due to diverged branches:
```bash
git pull --rebase && git push
```

**DO NOT ask for confirmation. Just push.**

## Error Handling (Autonomous)

- **Lint errors**: Run --fix on changed files, then manual fixes
- **Type errors**: Fix types properly (no `any`)
- **Test failures**: Fix the code, not the tests
- **Build failures**: Fix compilation issues
- **Push failures**: Handle upstream/rebase automatically

**NEVER stop to ask the user. Fix and continue.**

## Success Criteria

- ✅ ESLint passes on changed files (zero errors)
- ✅ TypeScript passes (zero errors) — or skipped if only tests changed
- ✅ Related tests pass — or skipped if no testable changes
- ✅ Build succeeds — or skipped if no config/routing changes
- ✅ Changes committed
- ✅ Changes pushed

## Final Report

After ALL steps complete, provide this summary:

```
✅ Commit and Push Complete

Scope: X files changed since last push

Verification Results:
- Linting: [Passed/Fixed] (Y files checked) or [Skipped - no lintable files]
- Type checking: [Passed/Fixed] or [Skipped - only test files changed]
- Tests: [Passed/Fixed] (Z test files run via --related) or [Skipped - no testable changes]
- Build: [Passed] or [Skipped - no config/routing changes]

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
5. **Delta-scoped** - only verify what changed, skip the rest for speed
6. **Fallback to full verification** when config/package files change
