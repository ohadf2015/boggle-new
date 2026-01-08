# 🎯 START HERE

## What You Have

A complete system for recognizing repetitive tasks and turning them into reusable commands.

## The Problem It Solves

You repeatedly ask for the same type of work:
- "Run tests and fix failures" (3x per week)
- "Improve the UI of this component" (2x per week)
- "Refactor this for readability" (2x per week)

**Solution**: Create `/my-command` to do it automatically!

## How It Works (30 seconds)

```
1. Ask for similar work 3+ times
   ↓
2. Create PURPOSE_my-command.md (why/when)
3. Create my-command.md (how/what)
   ↓
4. Add to TASK_PATTERNS.md
   ↓
5. Use: /my-command
```

## Getting Started (Choose One)

### 🚀 Fast Track: 5 Minutes
**I just want to create a command NOW**

Open: [QUICK_START.md](QUICK_START.md)
- Copy templates
- Fill in your pattern
- Done!

### 📚 Learning Path: 30 Minutes
**I want to understand the whole system**

Open: [EXAMPLE_HOW_TO_USE.md](EXAMPLE_HOW_TO_USE.md)
- Step-by-step example
- Real workflow walkthrough
- Learn by doing

### 🔍 Discovery Path: 15 Minutes
**I want to find patterns in my work first**

Open: [PATTERN_DETECTION_CHECKLIST.md](PATTERN_DETECTION_CHECKLIST.md)
- Identify your repetitive tasks
- Find your top 3 patterns
- Then create commands for each

### 📖 Complete Reference
**I want all the technical details**

Open: [REFERENCE.md](REFERENCE.md)
- File format specifications
- Complete anatomy of files
- Advanced usage

## Example: Real Workflow

You ask 3 times per week:
- "Run tests and fix any failures"
- "Make sure tests pass"
- "Test everything"

This is a pattern! Create:

**File 1**: `.claude/task-patterns/PURPOSE_test-and-fix.md`
```markdown
# Purpose: Test and Fix

## What It Does
Runs tests, fixes failures, and commits changes.

## When to Use It
After making code changes to verify everything works.

## Example Invocations
- "Run tests and fix any failures"
- "Make sure tests pass"
- "Test everything"
```

**File 2**: `.claude/commands/test-and-fix.md`
```yaml
---
allowed-tools: Bash(npm *), Bash(git *)
description: Run tests, fix failures, commit
---

# Test and Fix

Run tests, fix failures, and commit changes.

## Process
1. Run npm test
2. Fix failures incrementally
3. Run npm run lint
4. Commit changes
```

**Step 3**: Add to `TASK_PATTERNS.md`:
```
## test-and-fix
- **Pattern**: Repeated 3x per week
- **Command**: .claude/commands/test-and-fix.md
- **Purpose**: .claude/task-patterns/PURPOSE_test-and-fix.md
- **Status**: active
```

**Step 4**: Use it!
```
/test-and-fix
```

## File Organization

```
.claude/
├── skills/
│   └── task-recognizer/
│       └── SKILL.md                  ← Skill definition
│
├── task-patterns/                    ← You are here!
│   ├── START_HERE.md                 ← This file
│   ├── INDEX.md                      ← File navigation
│   ├── QUICK_START.md                ← 5-min quick ref ⭐
│   ├── EXAMPLE_HOW_TO_USE.md         ← Full walkthrough
│   ├── REFERENCE.md                  ← Technical specs
│   ├── PATTERN_DETECTION_CHECKLIST.md ← Find patterns
│   └── TASK_PATTERNS.md              ← Pattern index
│
└── commands/
    ├── existing.md                   ← Your current commands
    └── my-command.md                 ← You create these
```

## The Documents

| File | Time | Best For |
|------|------|----------|
| **[QUICK_START.md](QUICK_START.md)** | 5 min | Creating your first command fast |
| **[EXAMPLE_HOW_TO_USE.md](EXAMPLE_HOW_TO_USE.md)** | 30 min | Understanding the full process |
| **[PATTERN_DETECTION_CHECKLIST.md](PATTERN_DETECTION_CHECKLIST.md)** | 15 min | Finding patterns in your work |
| **[REFERENCE.md](REFERENCE.md)** | 20 min | Technical specifications |
| **[INDEX.md](INDEX.md)** | 5 min | Navigation guide to all files |
| **[TASK_PATTERNS.md](TASK_PATTERNS.md)** | - | Master index (reference) |

## Your Existing Commands (Study These!)

Your project already has great examples:

- **[/refactor](./../commands/refactor.md)** - Code quality
- **[/feature](./../commands/feature.md)** - New features
- **[/fix](./../commands/fix.md)** - Bug fixes
- **[/ui](./../commands/ui.md)** - UI improvement
- **[/investigate](./../commands/investigate.md)** - Investigation
- **[/performance-audit](./../commands/performance-audit.md)** - Optimization

Each shows how to structure a command correctly!

## Quick Checklist

Does this task qualify as a pattern?

- [ ] You ask for this 3+ times per week
- [ ] The steps are always the same
- [ ] The tools are always the same
- [ ] You'd like a shorthand for it

**If yes to all 4**: Create a command!

**If not yet**: Wait for more data and check again

## Common First Patterns

Based on typical workflows, these are often the first patterns people create:

1. **Code Quality** - Run tests, fix failures, commit
2. **Feature Development** - Implement feature → test → commit
3. **Debugging** - Investigate error → find cause → fix
4. **UI Polish** - Improve component → test → commit
5. **Performance** - Profile → identify bottleneck → optimize

## Decision Tree

```
Do you ask for this?
├─ No → Not a pattern yet
└─ Yes → Is it 3+ times per week?
   ├─ No → Wait for more data
   └─ Yes → Are the steps consistent?
      ├─ No → Wait for consistency
      └─ Yes → CREATE COMMAND! ✓
```

## Next Action

Pick your path and open the file:

1. **Just want to build it** → [QUICK_START.md](QUICK_START.md)
2. **Want to learn first** → [EXAMPLE_HOW_TO_USE.md](EXAMPLE_HOW_TO_USE.md)
3. **Want to find patterns** → [PATTERN_DETECTION_CHECKLIST.md](PATTERN_DETECTION_CHECKLIST.md)
4. **Need all the details** → [REFERENCE.md](REFERENCE.md)
5. **Want file navigation** → [INDEX.md](INDEX.md)

---

## One More Thing

The PURPOSE file is important! It's not just documentation:

- **For you**: Explains when/why to use the command
- **For Claude**: Provides context and usage examples
- **For future self**: Reminds you why you created it
- **For improvement**: Tracks how the pattern was identified

Always create both:
1. PURPOSE_my-command.md (why/when)
2. my-command.md (how/what)

## Questions?

| Question | Answer |
|----------|--------|
| Where do I start? | You're reading it! Next: Pick a path above |
| How long does setup take? | 5-30 minutes depending on path |
| Can I update commands later? | Yes! Iterate based on real usage |
| What if a pattern changes? | Update the command and refine it |
| Can I have overlapping commands? | Yes, but keep them focused |
| How do I know if it's working? | You use /command instead of re-explaining |

---

**You're all set!**

Choose your learning path and get started. The system is designed to work exactly how you use Claude - helping you automate the repetitive parts so you can focus on the creative parts.

Pick one:
- 🚀 [QUICK_START.md](QUICK_START.md)
- 📚 [EXAMPLE_HOW_TO_USE.md](EXAMPLE_HOW_TO_USE.md)
- 🔍 [PATTERN_DETECTION_CHECKLIST.md](PATTERN_DETECTION_CHECKLIST.md)
