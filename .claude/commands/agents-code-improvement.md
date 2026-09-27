# Project Improvement Workflow Using Claude Code Agents

## Overview
This prompt orchestrates multiple specialized agents to improve the project systematically. Each phase completes before the next begins, preventing conflicts and ensuring changes build upon each other.

---

## Phase 1: Discovery & Understanding (Read-Only)

### Step 1.1: Codebase Exploration
```
Use the Explore agent to analyze the codebase structure:
- Map all major directories and their purposes
- Identify key components, services, and utilities
- Document the tech stack and dependencies
- Note any patterns or conventions used
- Output a summary report (do NOT modify any files)
```

### Step 1.2: Architecture Review
```
Run /arch-review to:
- Analyze current architecture and design patterns
- Identify architectural strengths and weaknesses
- Document component dependencies and data flow
- List potential architectural improvements
- Output findings as a structured report (do NOT modify any files)
```

**Checkpoint:** Review Phase 1 findings before proceeding.

---

## Phase 2: Code Analysis (Read-Only)

### Step 2.1: Unused Code Detection
```
Use the unused-code-cleaner agent to:
- Scan for unused imports across all files
- Identify dead functions and classes
- Find unused variables and exports
- List orphaned files with no references
- Output a removal candidates list (do NOT delete yet)
```

### Step 2.2: Code Quality Assessment
```
Use the code-quality-pragmatist agent to:
- Review for over-engineering patterns
- Identify unnecessary abstractions
- Find premature optimizations
- Spot anti-patterns and code smells
- Check for YAGNI violations
- Output improvement recommendations (do NOT modify any files)
```

**Checkpoint:** Review Phase 2 findings. Approve which items to address.

---

## Phase 3: Cleanup & Fixes (Write Phase - Sequential)

### Step 3.1: Remove Unused Code
```
Based on approved unused-code-cleaner findings:
- Remove unused imports (one file at a time)
- Delete dead code (commit after each logical group)
- Remove orphaned files
- Run build/tests after each change to verify no breakage
```

### Step 3.2: Fix Identified Issues
```
Use /fix or /investigate for any bugs found:
- Address one issue at a time
- Verify fix with tests before moving to next
- Commit each fix separately with descriptive message
```

### Step 3.3: Refactor Problem Areas
```
Run /refactor on approved areas from code-quality review:
- Simplify over-engineered code
- Remove unnecessary abstractions
- Apply one refactor at a time
- Test after each refactor
- Commit with clear refactor description
```

**Checkpoint:** Run full test suite. Verify all changes work together.

---

## Phase 4: UI Improvements (After Code Stabilization)

### Step 4.1: UI Enhancement
```
Run /ui to:
- Review current UI components
- Identify UX improvements
- Simplify complex components
- Align with project design system
- Implement changes incrementally
- Test each UI change visually
```

### Step 4.2: UI Testing
```
Use ui-comprehensive-tester agent to:
- Test all modified UI components
- Verify user flows still work
- Check responsive behavior
- Validate accessibility
- Document any issues found
```

**Checkpoint:** Manual UI review before proceeding.

---

## Phase 5: Feature Development (Optional)

### Step 5.1: Plan New Features
```
Use the Plan agent to:
- Design implementation strategy for approved features
- Identify files to modify/create
- Consider architectural impact
- Plan test coverage
- Get user approval before implementation
```

### Step 5.2: Implement Features
```
Run /feature for each approved feature:
- Understand existing patterns first
- Ask clarifying questions
- Write tests alongside implementation
- Commit incrementally
```

---

## Phase 6: Final Validation

### Step 6.1: Deep Bug Investigation
```
Use ultrathink-debugger agent if any issues surfaced:
- Investigate root causes
- Trace execution paths
- Identify subtle bugs
- Implement robust fixes
```

### Step 6.2: Reality Check
```
Use the karen agent to:
- Validate what's actually complete vs claimed
- Ensure implementations match requirements
- Create realistic completion plan for remaining work
- No BS assessment of project state
```

---

## Execution Rules

### Conflict Prevention
1. **One agent writes at a time** - Never run multiple write-phase agents in parallel
2. **Commit between phases** - Each phase's changes are committed before next phase
3. **Test between changes** - Run tests after each modification
4. **Review checkpoints** - Get user approval at each checkpoint

### Agent Isolation
| Phase | Agents | Mode | Can Run in Parallel |
|-------|--------|------|---------------------|
| 1 | Explore, /arch-review | Read-only | Yes |
| 2 | unused-code-cleaner, code-quality-pragmatist | Read-only | Yes |
| 3 | /fix, /refactor | Write | No - Sequential |
| 4 | /ui, ui-comprehensive-tester | Write then Test | No - Sequential |
| 5 | Plan, /feature | Write | No - Sequential |
| 6 | ultrathink-debugger, karen | Varies | No - Sequential |

### Rollback Strategy
- Each phase creates a git tag: `improvement-phase-N-complete`
- If issues arise, rollback to previous phase tag
- Re-run problematic phase with adjusted parameters

---

## Quick Start Command

Copy and paste this to begin:

```
Execute the Project Improvement Workflow:

1. Start with Phase 1 (Discovery) - run Explore and /arch-review agents in parallel
2. Wait for my approval before Phase 2
3. Present findings in a structured summary
4. Do NOT modify any files until I explicitly approve moving to Phase 3

Begin Phase 1 now.
```

---

## Single-Phase Commands

### Quick Cleanup Only
```
Run Phase 2 (unused-code-cleaner + code-quality-pragmatist) in read-only mode,
then with my approval, execute Phase 3 cleanup. Skip all other phases.
```

### UI Focus Only
```
Skip to Phase 4. Run /ui to improve the UI components, then validate with
ui-comprehensive-tester. Present changes for review before committing.
```

### Architecture Deep-Dive
```
Run Phase 1 only with extra depth. Use Explore agent thoroughly, then
/arch-review with detailed analysis. Output comprehensive architecture
documentation. No modifications.
```

### Bug Hunt
```
Use ultrathink-debugger to investigate [describe issue]. Find root cause
before any fixes. Then use /fix to implement solution. Test thoroughly.
```
