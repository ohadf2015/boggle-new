# Git Workflow Rules

## Commit Messages
Conventional commits: `type(scope): description`
Types: feat, fix, docs, style, refactor, test, chore, perf

## PIV Phase-Based Commits

Commits happen AFTER each major phase — always ASK user before committing:

1. **Plan** → `plan: [feature]`
2. **Implement** → `feat: [feature]` (includes TDD tests + code)
3. **Validate fixes** → `chore: fix validation issues`
4. **Simplify** → `refactor: [what was simplified]`

One commit per phase. Implementation includes all RED-GREEN-REFACTOR cycles.

## Branch Naming
- `feature/name`, `fix/description`, `hotfix/critical`, `docs/update`, `refactor/component`
- Direct commits to main allowed for maintainers with passing tests
- Feature branches recommended for large/collaborative changes

## Before Committing
1. `git status` / `git diff`
2. Tests pass
3. Build succeeds
4. Conventional commit message
