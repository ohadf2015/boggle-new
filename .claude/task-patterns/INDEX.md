# Task Recognizer - Complete Index

## What Is This?

A system for recognizing when you repeatedly ask for the same type of work, and converting those patterns into reusable commands with `/command-name` syntax.

## Files in This Directory

### 📌 Start Here

**[QUICK_START.md](QUICK_START.md)** - 5-minute guide
- Quick reference templates
- Copy-paste ready examples
- Minimal setup to create first command
- **Best for**: Getting started fast

### 📚 Learning & Understanding

**[EXAMPLE_HOW_TO_USE.md](EXAMPLE_HOW_TO_USE.md)** - Detailed walkthrough
- Step-by-step example with real workflow
- Shows how to identify patterns
- Demonstrates pattern recognition
- Shows how to track patterns
- **Best for**: Understanding the full process

**[REFERENCE.md](REFERENCE.md)** - Complete technical reference
- File format specifications
- Command file anatomy
- Purpose file anatomy
- Directory structure
- Scaling with multiple commands
- **Best for**: Technical details and syntax

**[PATTERN_DETECTION_CHECKLIST.md](PATTERN_DETECTION_CHECKLIST.md)** - Find your patterns
- Checklist to identify repetitive tasks
- Inventory of common patterns
- Pattern evaluation template
- Quick decision tree
- **Best for**: Finding what to automate

### 📊 Tracking & Management

**[TASK_PATTERNS.md](TASK_PATTERNS.md)** - Master index
- List of all recognized patterns
- Status of each pattern (active/archived)
- Links to command and purpose files
- Usage frequency tracking
- **Best for**: Overview of your patterns

**[EXAMPLE_HOW_TO_USE.md](EXAMPLE_HOW_TO_USE.md)** - Purpose documentation template
- Template structure for purpose files
- Sections to include
- When to create purpose files
- How they link to commands

## The Complete Workflow

```
1. RECOGNIZE
   └─ Use: PATTERN_DETECTION_CHECKLIST.md
   └─ Output: You identify a repetitive task

2. DOCUMENT
   ├─ Create: PURPOSE_[command].md
   │  └─ Use: QUICK_START.md or EXAMPLE_HOW_TO_USE.md
   └─ Create: [command].md in .claude/commands/
      └─ Use: REFERENCE.md for syntax

3. REGISTER
   └─ Update: TASK_PATTERNS.md
      └─ Use: TASK_PATTERNS.md as template

4. USE & REFINE
   ├─ Test: Use /[command] on real work
   └─ Iterate: Refine based on experience
```

## File Relationships

```
PURPOSE_my-command.md
│
├─ Explains WHEN/WHY you use it
├─ Links to the corresponding command
├─ Shows example invocations
│
└─ Links to: .claude/commands/my-command.md

.claude/commands/my-command.md
│
├─ Defines the HOW/WHAT workflow
├─ Lists allowed tools
├─ Specifies key rules
│
└─ Referenced in: TASK_PATTERNS.md entry

TASK_PATTERNS.md
│
├─ Master index of all patterns
├─ Links to each PURPOSE file
├─ Links to each command file
├─ Tracks status and frequency
│
└─ Entry for: my-command
   ├─ Link to: PURPOSE_my-command.md
   └─ Link to: .claude/commands/my-command.md
```

## How to Use This System

### If you want to...

**Create your first command**
1. Open [QUICK_START.md](QUICK_START.md)
2. Use the templates to create two files
3. Add to [TASK_PATTERNS.md](TASK_PATTERNS.md)
4. Done! Use `/my-command`

**Understand the system better**
1. Read [EXAMPLE_HOW_TO_USE.md](EXAMPLE_HOW_TO_USE.md)
2. Follow the step-by-step example
3. See how patterns are recognized
4. See how workflows are created

**Find patterns in your work**
1. Use [PATTERN_DETECTION_CHECKLIST.md](PATTERN_DETECTION_CHECKLIST.md)
2. Mark which tasks you do repeatedly
3. Evaluate which are candidates
4. Pick your top 3 patterns

**Look up command syntax**
1. Check [REFERENCE.md](REFERENCE.md)
2. Find the section you need
3. Copy the format
4. Adapt to your pattern

**See all your patterns**
1. Open [TASK_PATTERNS.md](TASK_PATTERNS.md)
2. View all recognized patterns
3. See status and frequency
4. Find related commands

## Key Concepts

### Pattern
A task you ask for 3+ times that:
- Has the same steps each time
- Uses the same tools
- Follows the same rules
- Has the same goal

### Purpose File
One PURPOSE_[name].md file per command that:
- Explains when/why you use it
- Shows example requests
- Documents how the pattern was identified
- Lists related commands

### Command File
One [name].md file in .claude/commands/ that:
- Defines the exact workflow
- Lists allowed tools
- Specifies key rules
- Can be invoked with /[name]

### TASK_PATTERNS.md
Master index that:
- Lists all recognized patterns
- Tracks status (active/archived)
- Shows usage frequency
- Links to purpose and command files

## Examples in Your Project

Study these existing patterns:

- **[/refactor](././../commands/refactor.md)** - Code quality improvement
- **[/feature](././../commands/feature.md)** - New feature implementation
- **[/fix](././../commands/fix.md)** - Bug fixing
- **[/ui](././../commands/ui.md)** - UI improvement
- **[/investigate](././../commands/investigate.md)** - Deep investigation
- **[/performance-audit](././../commands/performance-audit.md)** - Performance optimization

Each is a great model for new commands!

## Quick Reference

| Task | File | Notes |
|------|------|-------|
| Create first command | [QUICK_START.md](QUICK_START.md) | Templates ready to copy |
| Learn the process | [EXAMPLE_HOW_TO_USE.md](EXAMPLE_HOW_TO_USE.md) | Full walkthrough |
| Find patterns | [PATTERN_DETECTION_CHECKLIST.md](PATTERN_DETECTION_CHECKLIST.md) | Identify your patterns |
| Command syntax | [REFERENCE.md](REFERENCE.md) | Technical specs |
| See all patterns | [TASK_PATTERNS.md](TASK_PATTERNS.md) | Master index |

## File Size Guide

- **QUICK_START.md** - ~2KB, 5 min read
- **EXAMPLE_HOW_TO_USE.md** - ~4KB, 10 min read
- **REFERENCE.md** - ~8KB, 20 min read
- **PATTERN_DETECTION_CHECKLIST.md** - ~6KB, 15 min read
- **TASK_PATTERNS.md** - ~1KB, grows as you add patterns

## Getting Help

**I'm new to this, where do I start?**
→ Open [QUICK_START.md](QUICK_START.md)

**I want to understand how it works**
→ Read [EXAMPLE_HOW_TO_USE.md](EXAMPLE_HOW_TO_USE.md)

**I need to know the exact file format**
→ Check [REFERENCE.md](REFERENCE.md)

**I need to find which tasks to automate**
→ Use [PATTERN_DETECTION_CHECKLIST.md](PATTERN_DETECTION_CHECKLIST.md)

**I need to see all my patterns**
→ Open [TASK_PATTERNS.md](TASK_PATTERNS.md)

## Tips

1. **Start small** - Your first command doesn't need to be perfect
2. **Keep it simple** - Simple workflows are better than complex ones
3. **Follow the template** - Use QUICK_START.md templates, don't reinvent
4. **Test immediately** - Use the command on real work right away
5. **Iterate fast** - Refine based on actual usage
6. **Study examples** - Your existing commands are great models
7. **Track frequency** - Update TASK_PATTERNS.md with real usage

---

**Ready to create your first command?** → [QUICK_START.md](QUICK_START.md)

**Want to understand the system first?** → [EXAMPLE_HOW_TO_USE.md](EXAMPLE_HOW_TO_USE.md)

**Need to identify patterns in your work?** → [PATTERN_DETECTION_CHECKLIST.md](PATTERN_DETECTION_CHECKLIST.md)
