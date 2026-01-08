# Task Recognizer Reference

## Directory Structure

```
.claude/
├── skills/
│   └── task-recognizer/
│       └── SKILL.md              # This skill documentation
├── commands/
│   ├── existing-commands.md      # Your current commands
│   └── new-command.md            # New commands you create
└── task-patterns/
    ├── TASK_PATTERNS.md          # Index of all patterns
    ├── QUICK_START.md            # Quick reference guide
    ├── EXAMPLE_HOW_TO_USE.md     # Examples and tips
    ├── REFERENCE.md              # This file
    ├── PURPOSE_existing-cmd.md   # Purpose docs for each command
    └── PURPOSE_new-cmd.md        # Add more as needed
```

## File Relationships

### Purpose File → Command File

Each purpose file documents the "why" and links to a corresponding command file:

```
PURPOSE_my-command.md
├── Explains when/why to use it
├── Links to: .claude/commands/my-command.md
└── Shows example invocations

↓ (links to)

my-command.md
├── Defines the workflow
├── Lists allowed tools
└── Specifies key rules
```

### TASK_PATTERNS.md Index

The master index that connects everything:

```
TASK_PATTERNS.md
├── Entry for command-1
│   ├── Links to: .claude/commands/command-1.md
│   ├── Links to: PURPOSE_command-1.md
│   └── Shows frequency and status
├── Entry for command-2
│   ├── Links to: .claude/commands/command-2.md
│   ├── Links to: PURPOSE_command-2.md
│   └── Shows frequency and status
└── ... (more entries)
```

## Command File Anatomy

### Frontmatter (YAML)

```yaml
---
allowed-tools: Tool1, Tool2, Bash(pattern *), Skill(other-skill)
description: One-line description of what the command does
---
```

**allowed-tools options:**
- `Read` - File reading
- `Write` - File writing
- `Edit` - File editing
- `Bash(pattern)` - Bash commands (use * for any args)
  - `Bash(npm *)` - Any npm command
  - `Bash(git *)` - Any git command
  - `Bash(npx *)` - Any npx command
- `Grep` - Code searching
- `Glob` - File pattern matching
- `TodoWrite` - Task tracking
- `Skill(name)` - Call another skill

### Content Sections

**Required:**
1. **Title** - `# Command Name`
2. **Goal** - What it achieves (can include `$ARGUMENTS`)
3. **Process** - Numbered steps
4. **Key Rules** - Constraints and best practices

**Optional:**
- **Process Sections** - Subsections of Process
- **Techniques** - Methods or patterns
- **Dataset Selection** - How to choose data sources
- **Implementation Details** - Specific guidance
- **Troubleshooting** - Common issues

### Example Command File

```yaml
---
allowed-tools: Read, Write, Edit, Bash(npm *), Bash(git *)
description: Run tests and fix failures
---

# Test and Fix

Run tests, fix failures, and commit changes. $ARGUMENTS

## Process

1. **Run baseline** - Execute `npm test` to identify failures
2. **Analyze failures** - Read error messages to understand issues
3. **Fix incrementally** - Fix one issue at a time
   - Edit the problematic file
   - Run tests to verify the fix
   - Move to next issue
4. **Verify linting** - Run `npm run lint`
5. **Commit** - Create git commit with summary

## Key Rules
- Run tests after each fix
- Don't batch fixes
- Keep commits focused
- One logical change per commit
```

## Purpose File Anatomy

### Header and Purpose

```markdown
# Purpose: Command Name

## What It Does
One-sentence description of what this accomplishes.

## When to Use It
- Situation or trigger 1
- Situation or trigger 2
- Situation or trigger 3
```

### Pattern Information

```markdown
## Pattern Recognition
Explanation of how this pattern was identified.
Examples:
- "User asks this 3-4 times per week"
- "Repetitive workflow with 5 consistent steps"
- "Always followed by same tools and rules"

## Example Invocations
- "Example request type 1"
- "Example request type 2"
- "Example request type 3"
```

### Additional Sections

```markdown
## Related Commands
Links to similar or complementary commands.

## Workflow Highlights
Key aspects of how the workflow operates.

## Edge Cases
Special situations or considerations.
```

### Full Example Purpose File

```markdown
# Purpose: Refactor Code

## What It Does
Improves code quality while preserving behavior and keeping tests green.

## When to Use It
- You want to simplify code logic
- Code needs better organization
- Variable/function names need improvement
- You want to reduce duplication

## Pattern Recognition
User asks 2-3 times per week:
- "Can you clean up this code?"
- "This is hard to read, simplify it"
- "Refactor this to be more maintainable"

Involves consistent 5-step workflow with incremental testing.

## Example Invocations
- "Refactor this component for readability"
- "Can you improve the code quality in this file?"
- "Make this function simpler"
- "Remove duplication in this code"

## Workflow Highlights
- Tests run before and after refactoring
- Changes are committed incrementally
- Linting validates all changes
- Behavior is preserved end-to-end

## Related Commands
- `/feature` - Adding new functionality
- `/ui` - Visual design improvements
```

## TASK_PATTERNS.md Format

Master index of all patterns:

```markdown
# Recognized Task Patterns

## refactor-code
- **Pattern**: User repeatedly asks to improve code quality
- **Frequency**: 2-3 times per week
- **Tools Used**: read, edit, bash, npm, lint
- **Command File**: `.claude/commands/refactor.md`
- **Purpose Doc**: `.claude/task-patterns/PURPOSE_refactor.md`
- **Status**: active
- **Created**: 2024-01-08
- **Last Used**: 2024-01-08

## test-and-fix
- **Pattern**: User asks to run tests, fix failures, commit
- **Frequency**: 3-4 times per week
- **Tools Used**: npm, git, bash
- **Command File**: `.claude/commands/test-and-fix.md`
- **Purpose Doc**: `.claude/task-patterns/PURPOSE_test-and-fix.md`
- **Status**: active
- **Created**: 2024-01-08
```

## Workflow for Creating Commands

### 1. Recognition Phase
- Observe similar requests 3+ times
- Note the steps involved
- Identify consistent constraints

### 2. Documentation Phase
- Write PURPOSE file (when/why)
- Write command file (how/what)
- Define allowed-tools carefully

### 3. Registration Phase
- Add entry to TASK_PATTERNS.md
- Update status to "active"
- Record creation date

### 4. Usage Phase
- Use the command on real tasks
- Refine based on experience
- Update documentation if needed

### 5. Maintenance Phase
- Archive commands no longer used
- Update frequencies in TASK_PATTERNS.md
- Refine workflows based on feedback

## Tips and Best Practices

### Do's ✅
- Keep commands focused and specific
- Document the "why" in PURPOSE files
- Include concrete examples
- Update patterns based on real usage
- Archive old commands
- Reference related commands
- Use clear, actionable language

### Don'ts ❌
- Create commands for one-time tasks
- Make commands too broad
- Skip the PURPOSE documentation
- Use confusing tool patterns
- Let old patterns accumulate
- Over-constrain with allowed-tools
- Make workflows too long

### Common Patterns to Look For

1. **Repetitive multi-step workflows**
   - Same sequence of steps done regularly
   - Could be: test, build, deploy; or read, analyze, refactor

2. **Recurring decision patterns**
   - Always asking same type of clarification
   - Could be: "where should this file go?", "what naming convention?"

3. **Tool usage patterns**
   - Same set of tools used together
   - Could be: git + npm + lint, or read + edit + test

4. **Context-switching patterns**
   - Repeatedly needing to load same knowledge
   - Could be: "explain codebase structure", "show me existing patterns"

5. **Quality check patterns**
   - Consistent validation steps
   - Could be: lint, type check, test, build

## Scaling with More Commands

As you accumulate more commands, keep TASK_PATTERNS.md organized:

```markdown
# Recognized Task Patterns

## Code Quality Commands
- refactor-code
- test-and-fix
- remove-unused-code

## Feature Development Commands
- feature
- ui
- accessibility-audit

## Debugging Commands
- fix
- investigate
- sentry-bugs

## Optimization Commands
- performance-audit
- refactor

## Project Commands
- new-feature
- backlog
```

This organization makes it easy to find related commands.
