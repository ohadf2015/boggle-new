# Verdent Command System for LexiClash

Welcome to the Verdent command system - a comprehensive workflow framework adapted from Claude Code patterns for the LexiClash project.

## Overview

This directory contains structured workflows, commands, agents, and skills designed to streamline development on the LexiClash multiplayer word game. All workflows are adapted to work with Verdent's capabilities while respecting project-specific constraints.

## Directory Structure

```
.verdent/
├── commands/           # Command workflows (/feature, /fix, /investigate, etc.)
├── agents/             # Specialized agent personas (debugging, architecture, etc.)
├── skills/             # Reusable skill modules (commit-push, testing, etc.)
├── task-patterns/      # Documentation for recognizing and creating patterns
├── workflows/          # Complex multi-step workflows
├── memory/             # Project knowledge base (if MCP memory unavailable)
├── project-context/    # Links to key project documentation
├── config.json         # Verdent-specific configuration
└── README.md           # This file
```

## Quick Start

### Available Commands

Core development commands (use as workflow guides):
- **feature** - New feature implementation (context → plan → test-first → implement)
- **fix** - Bug fixing workflow (reproduce → test → fix → verify)
- **investigate** - Deep investigation (NO fixes until root cause understood)
- **refactor** - Code quality improvement (preserve behavior, keep tests green)
- **e2e-test** - End-to-end testing with Playwright
- **complete-translation** - Translation management (4 languages)
- **ui** - UI component improvement (Neo-Brutalist compliance)

### Using Commands

Commands are workflow guides, not slash commands. To use them:

1. **Read the command file**: `.verdent/commands/[command-name].md`
2. **Follow the process steps**: Each command has a clear workflow
3. **Use Verdent tools**: Commands reference available Verdent tools
4. **Respect project constraints**: All commands integrate CLAUDE.md standards

Example:
```
To implement a new feature, follow .verdent/commands/feature.md:
1. Read context (CLAUDE.md, README.md, package.json)
2. Ask clarifying questions
3. Find similar patterns in codebase
4. Present implementation plan
5. Write tests first
6. Implement feature
7. Verify with tests
```

## Specialized Agents

When you need expert guidance, refer to agent files in `.verdent/agents/`:

- **ultrathink-debugger** - Deep debugging methodology
- **next-js-architect** - Next.js 16 best practices
- **react-wizard** - React 19 patterns and hooks
- **tailwind-master** - Neo-Brutalist design system
- **supabase-master** - Database and backend expertise
- **game-designer** - Game mechanics and UX
- **code-quality-pragmatist** - Anti-slop, DRY, SOLID enforcement

## Skills

Reusable skill modules in `.verdent/skills/`:

- **commit-push** - Autonomous verification and commit workflow
- **senior-qa** - Test generation and coverage analysis
- **ux-writer** - Translation management and consistency
- **contrast-fixer** - WCAG accessibility compliance

## Project Context

Always reference these before starting work:

1. **AGENTS.md** - Commands, architecture, development hints
2. **fe-next/CLAUDE.md** - Coding standards, design system, tech stack
3. **GAME_DESIGN_DOCUMENT.md** - Game mechanics, scoring, progression
4. **claude.md** - Project overview and quick start

## Critical Constraints (From CLAUDE.md)

### Translation-First Development
- ALL UI text MUST use `t('key')` from LanguageContext
- Support 4 languages: Hebrew (RTL), English, Swedish, Japanese
- Run `npm run check:translations` to verify completeness
- Translation keys: `section.component.element` pattern

### Design System (Neo-Brutalist)
- Dark-only theme, no light mode
- Hard shadows with NO blur: `shadow-hard`, `shadow-hard-lg`
- Chunky borders: `border-neo` (3px), `border-neo-thick` (4px)
- Color palette: `neo-yellow`, `neo-orange`, `neo-pink`, `neo-cyan`, `neo-navy`
- Container queries preferred over viewport units

### Code Quality (Zero-Tolerance)
- NO `any` types - Full type safety mandatory
- Modular files - Max 500 lines per file
- DRY principle - Extract repeated logic
- SOLID principles - Single responsibility
- Mandatory testing - Every feature needs tests
- Error handling - No empty catch blocks

### Development Workflow
```bash
# From fe-next/ directory
npm run dev              # Development server
npm run lint             # ESLint validation
npx tsc --noEmit         # Type checking
npm run test             # All tests
npm run build            # Production build
npm run check:translations  # Translation verification
```

## Verdent Tools Available

Core tools you can use:
- **bash** - Terminal commands (npm, git, etc.)
- **glob** - File pattern matching
- **grep_content** / **grep_file** - Code search
- **file_read** / **file_edit** / **file_write** - File operations
- **spawn_subagent** - Launch specialized agents (verifier, general, code-reviewer, file-navigator)
- **todo_update** - Task tracking
- **web_fetch** / **web_search** - Research
- **clarification_tool** - Ask user questions

## Subagent Types

Leverage subagents for complex tasks:
- **verifier** - Code verification (lint, type-check, tests)
- **general** - Multi-step tasks, research, implementation
- **code-reviewer** - Pre-commit code review
- **file-navigator** - Fast codebase exploration

## MCP Integration

### Configured MCP Servers
Check `.verdent/config.json` for currently configured MCP servers.

### Recommended MCP Servers
1. **Memory MCP** - Store/recall project decisions, patterns, bug fixes
2. **GitHub MCP** - Create PRs, manage issues, link commits
3. **Playwright MCP** - Interactive E2E testing

### Fallback Strategies
If MCP servers unavailable:
- Memory → Store in `.verdent/memory/` markdown files
- GitHub → Use `gh` CLI via bash tool
- Playwright → Use bash with `npx playwright` commands

## Task Patterns

Learn to recognize and create reusable patterns in `.verdent/task-patterns/`:
- **START_HERE.md** - Introduction
- **QUICK_START.md** - How to create patterns
- **TASK_PATTERNS.md** - Pattern registry

## Workflows

Complex multi-step workflows in `.verdent/workflows/`:
- **feature-development.md** - Full feature lifecycle
- **bug-investigation-fix.md** - Investigation → Fix → Verify
- **code-quality-improvement.md** - Analysis → Refactor → Document
- **multiplayer-testing.md** - LexiClash-specific multiplayer flows

## Getting Started

1. **Read project context**: Start with `AGENTS.md` and `fe-next/CLAUDE.md`
2. **Choose a workflow**: Pick a command based on your task type
3. **Follow the process**: Each command has clear steps
4. **Use available tools**: Leverage Verdent's tools and subagents
5. **Respect constraints**: Always follow CLAUDE.md standards
6. **Test thoroughly**: Run lint, type-check, tests, build
7. **Verify translations**: Check all 4 languages updated

## Quick Reference

### Common Tasks

| Task | Command | Key Steps |
|------|---------|-----------|
| New feature | `feature.md` | Context → Plan → Test-first → Implement |
| Fix bug | `fix.md` | Reproduce → Test → Fix → Verify |
| Investigate | `investigate.md` | Map flow → Analyze → Report (NO fixes) |
| Refactor | `refactor.md` | Baseline tests → Refactor → Keep green |
| E2E test | `e2e-test.md` | Navigate → Interact → Capture → Verify |
| Translations | `complete-translation.md` | Check 4 languages → Add keys → Verify |
| UI work | `ui.md` | Neo-Brutalist → Hard shadows → RTL check |

### Pre-Commit Checklist

Before committing code:
```bash
cd fe-next
npm run lint                    # ESLint - must pass
npx tsc --noEmit                # TypeScript - zero errors
npm run test                    # Jest - all pass
npm run check:translations      # 4 languages complete
npm run build                   # Production build succeeds
```

### Design System Quick Ref

```css
/* Hard shadows (NO blur) */
shadow-hard       /* 4px 4px 0px black */
shadow-hard-lg    /* 8px 8px 0px black */

/* Borders */
border-neo        /* 3px solid black */
border-neo-thick  /* 4px solid black */

/* Colors */
neo-yellow    #FFE135
neo-orange    #FF6B35
neo-pink      #FF1493
neo-cyan      #00FFFF
neo-navy      #1a1a2e
neo-white     #FFFFFF

/* Container queries (prefer over viewport units) */
text-[3cqw]   /* 3% of container width */
p-[2cqi]      /* 2% of container inline size */
```

## Support & Documentation

- **Main project docs**: See root `AGENTS.md` and `fe-next/CLAUDE.md`
- **Game design**: `GAME_DESIGN_DOCUMENT.md`
- **Architecture**: `AGENTS.md` → "Architecture" section
- **Commands**: `.verdent/commands/` directory
- **Agents**: `.verdent/agents/` directory

---

**Last Updated**: 2026-01-13  
**Verdent Version**: Compatible with Verdent AI Assistant  
**Project**: LexiClash (Boggle-style multiplayer word game)
