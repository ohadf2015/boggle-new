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

## Growth Radar trailer (product PRs)

A product/UX PR that should be graded appends one column-0 line per surface, outside fences and comments. Hermes dev and UR-card PRs include it. The card should name surface, kind, metric, and hypothesis so the line can be copied. Push to master records each line (`gr-intervention.yml`, app lexiclash, evidence = PR URL + merge sha). Do not add the line to SEO `radar/*` PRs (radar-merged.yml records those), to docs/refactors, or to a detector opt-out — an opt-out grades as a fake win.

```
GR-Intervention: surface=/en/multiplayer kind=ux metric=frustration hypothesis="why this metric should move"
```

kind: `ux` | `bugfix` | `feature`. metric: `frustration` | `errors` | `funnel_conversion` | `conversions` (or another scorer metric). A bad line fails the gr-intervention check; edit the merged PR body and re-run that job within 26 hours. Later than that is a post-fix baseline — do not back-record.
