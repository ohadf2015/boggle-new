---
name: task-recognizer
description: This skill helps identify repetitive task patterns and create reusable commands. When users repeatedly ask for similar types of work, this skill recognizes patterns and creates command templates with documented purposes and workflows.
---

# Task Recognizer Skill

## Purpose

This skill identifies repetitive tasks that you ask for frequently and transforms them into reusable commands. It maintains documentation about the purpose and workflow of each pattern, reducing the need to re-explain the same task requirements repeatedly.

## When to Use This Skill

Use this skill when:
- You notice you're asking for similar types of work multiple times
- You want to create a shorthand command for a complex workflow
- You need to document the purpose and steps of a frequently-needed task
- You want to capture domain-specific knowledge into a reusable format

## How It Works

### 1. Pattern Recognition

The skill tracks your requests over time and identifies patterns:
- Similar request structures
- Recurring task types
- Common workflow sequences
- Repeated problem-solving approaches

### 2. Purpose Documentation

Each command includes a documented purpose:
- **Goal**: What the task achieves
- **Context**: When and why you'd use it
- **Key Rules**: Constraints and best practices
- **Process**: Step-by-step workflow

### 3. Command Creation

Create commands by:
1. **Identify the pattern**: Describe the type of work you do repeatedly
2. **Document the purpose**: Explain what this workflow accomplishes
3. **Define the workflow**: List the repeatable steps and tools
4. **Set constraints**: Define which tools are allowed and key rules
5. **Test the command**: Use it on a real task to validate it works

## Command File Format

Commands are markdown files in `.claude/commands/` with YAML frontmatter:

```yaml
---
allowed-tools: Read, Write, Edit, Bash(npm *), Bash(npx *), Bash(git *)
description: Short description of what the command does
---

# Command Name

**Goal:** What this accomplishes. $ARGUMENTS

## Process

1. **Step name** - Brief description
2. **Step name** - Brief description
3. **Step name** - Brief description

## Key Rules
- Rule 1
- Rule 2
- Rule 3
```

### Frontmatter Fields

- **allowed-tools**: List tools the command can use (constrains what Claude can do)
- **description**: One-line description shown in command list

### Content Sections

- **Goal**: What the command achieves, supports `$ARGUMENTS` placeholder
- **Process**: Numbered steps with descriptions
- **Key Rules**: Important constraints and practices
- **Optional**: Additional sections like "Refactoring Techniques", "Dataset Selection", etc.

## Purpose Documentation File

For each command, maintain a `.claude/task-patterns/PURPOSE_<command-name>.md` file:

```markdown
# Purpose: Command Name

## What It Does
Brief description of the command's purpose.

## When to Use It
Situations where you'd invoke this command.

## Pattern Recognition
How this pattern was identified (e.g., "User asks 3+ times per week to...", "Repetitive workflow with steps...")

## Example Invocations
- "Describe an example request that triggers this"
- "Another example of similar requests"

## Related Commands
Links to similar or complementary commands.
```

## Implementation Steps

To create a new command when you identify a pattern:

1. **Confirm the pattern** - Verify this is truly repetitive (3+ times)
2. **Document the purpose** - Create PURPOSE file explaining the pattern
3. **Define the workflow** - List the exact steps you want automated
4. **Create the command** - Write the command markdown file
5. **Test it** - Use the command on a real task
6. **Iterate** - Refine based on how it performs

## Tracking Patterns

Keep a lightweight index of recognized patterns in `.claude/TASK_PATTERNS.md`:

```markdown
# Recognized Task Patterns

## [Command Name]
- **Pattern**: Description of what makes this repetitive
- **Frequency**: Approximate usage frequency
- **Tools Used**: Key tools involved
- **Last Used**: Date
- **Status**: active/archived
```

## Tips for Effective Commands

1. **Be specific** - Narrow commands work better than overly broad ones
2. **Document tradeoffs** - Explain why certain approaches are chosen
3. **Constrain tools** - Use `allowed-tools` to prevent unintended actions
4. **Include examples** - Show how the command would be invoked
5. **Evolve over time** - Update commands based on real usage
6. **Archive old ones** - Mark commands as archived when no longer needed
