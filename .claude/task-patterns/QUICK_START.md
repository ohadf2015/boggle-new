# Task Recognizer Quick Start

## What This Does

Helps you recognize when you're repeatedly asking for the same type of work, and converts those patterns into reusable commands.

## Quick Workflow

### 1. Identify a Pattern
You ask for similar work 3+ times → That's a pattern!

### 2. Document It (5 minutes)
Create two files:
- **Purpose file**: `PURPOSE_[command-name].md` - Why and when you use it
- **Command file**: `[command-name].md` in `.claude/commands/` - How to do it

### 3. Track It
Add one line to `TASK_PATTERNS.md`

### 4. Use It
Now you can just type: `/[command-name]`

## File Templates

### Purpose File
Save as: `.claude/task-patterns/PURPOSE_my-command.md`

```markdown
# Purpose: My Command

## What It Does
One sentence about what this accomplishes.

## When to Use It
- Situation 1
- Situation 2

## Pattern Recognition
Why this is a pattern (frequency, similarity, etc.)

## Example Invocations
- "Example request that triggers this"
- "Another example"
```

### Command File
Save as: `.claude/commands/my-command.md`

```yaml
---
allowed-tools: Read, Write, Edit, Bash(npm *)
description: One-line description
---

# My Command

Brief description of what this does. $ARGUMENTS

## Process

1. **Step name** - Description
2. **Step name** - Description

## Key Rules
- Rule 1
- Rule 2
```

### TASK_PATTERNS.md Entry
Add to `.claude/task-patterns/TASK_PATTERNS.md`:

```markdown
## my-command
- **Pattern**: What makes this repetitive
- **Frequency**: How often (e.g., "3x per week")
- **Tools Used**: npm, git, etc.
- **Command File**: `.claude/commands/my-command.md`
- **Purpose Doc**: `.claude/task-patterns/PURPOSE_my-command.md`
- **Status**: active
- **Created**: 2024-01-08
```

## Examples in Your Project

Your existing commands are great examples:
- `/refactor` - Code quality improvement
- `/feature` - New feature implementation
- `/fix` - Bug fixing
- `/ui` - UI improvement

Each has a clear purpose, workflow, and constraints!

## Signs You Should Create a Command

- [ ] You've asked for this 3+ times recently
- [ ] It involves the same steps each time
- [ ] You always follow certain rules for this type of work
- [ ] You'd like a shorthand to avoid re-explaining

## Next Steps

1. Review your recent requests - what do you ask for repeatedly?
2. Pick one pattern
3. Create the PURPOSE file
4. Create the command file
5. Add it to TASK_PATTERNS.md
6. Test it on your next task
