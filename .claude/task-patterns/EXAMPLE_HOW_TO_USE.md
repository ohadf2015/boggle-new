# How to Use Task Recognizer

This document shows how to identify patterns and create commands using the task-recognizer skill.

## Example: Identifying a Pattern

Let's say you notice you ask Claude to:
1. Run tests
2. Fix failing tests
3. Commit the changes
4. Run lint

And you do this **3+ times a week**. This is a pattern!

## Step 1: Document the Purpose

Create `.claude/task-patterns/PURPOSE_test-and-fix.md`:

```markdown
# Purpose: Test and Fix

## What It Does
Runs the full test suite, fixes failing tests, and commits changes with proper linting.

## When to Use It
When you've made code changes and want to verify everything works before moving to the next task.

## Pattern Recognition
User asks 3-4 times per week: "run tests and fix any failures", "make sure tests pass", "test everything"

## Example Invocations
- "Run tests and fix any failures"
- "Make sure the tests pass"
- "Test everything before committing"

## Workflow
1. Run full test suite
2. Review failures
3. Fix issues incrementally
4. Run lint check
5. Commit with message about fixes
```

## Step 2: Create the Command File

Create `.claude/commands/test-and-fix.md`:

```yaml
---
allowed-tools: Read, Write, Edit, Bash(npm *), Bash(npx *)
description: Run tests, fix failures, and commit changes with linting
---

# Test and Fix

Run the full test suite, fix any failing tests, verify linting passes, and commit the changes.

## Process

1. **Run tests** - Execute `npm test` to get baseline
2. **Review failures** - Understand what's broken
3. **Fix incrementally** - Fix one issue at a time, run tests after each fix
4. **Lint check** - Run `npm run lint` to verify code quality
5. **Commit** - Create commit with summary of fixes

## Key Rules
- Run tests after each fix to verify progress
- Don't batch all fixes at once
- Check lint before committing
- Keep commits focused on specific fixes
```

## Step 3: Track It

Update `.claude/task-patterns/TASK_PATTERNS.md`:

```markdown
## test-and-fix
- **Pattern**: User repeatedly asks to run tests, fix failures, and commit
- **Frequency**: 3-4 times per week
- **Tools Used**: npm, bash, git
- **Command File**: `.claude/commands/test-and-fix.md`
- **Purpose Doc**: `.claude/task-patterns/PURPOSE_test-and-fix.md`
- **Status**: active
- **Created**: 2024-01-08
```

## Step 4: Use It

Now you can just ask: `/test-and-fix`

The command will automatically:
- Know which tools to use
- Follow the documented workflow
- Apply the key rules
- Know the purpose and context

## Pattern Recognition Tips

Look for these signs of a repetitive pattern:

1. **Same request structure** - You ask the same thing multiple times with minor variations
2. **Multi-step workflows** - You repeatedly do a sequence of steps in the same order
3. **Specific constraints** - Certain rules or practices you always follow for this type of work
4. **Context switching** - You repeatedly need the same knowledge to complete the task

## Examples of Common Patterns

### UI Improvement Pattern
- "Can you improve the UI of [component]?"
- "Make this look better"
- "Polish the design"
→ Command: `/ui`

### Bug Fixing Pattern
- "Fix the error in [file]"
- "There's a bug in production"
- "This is broken"
→ Command: `/fix`

### Feature Implementation Pattern
- "Add [feature] to [component]"
- "Implement [functionality]"
- "Build a new [feature]"
→ Command: `/feature`

### Performance Optimization Pattern
- "This is slow"
- "Optimize the performance"
- "Make [feature] faster"
→ Command: `/performance-audit`

## When to Create a Command

Create a new command when:
- ✅ You ask for the same type of work 3+ times
- ✅ It involves a specific, repeatable workflow
- ✅ It has consistent constraints or rules
- ✅ You'd benefit from having it as a shorthand

Don't create a command if:
- ❌ It's a one-time task
- ❌ The workflow varies too much each time
- ❌ It's too simple to warrant documentation
- ❌ There's already a similar command
