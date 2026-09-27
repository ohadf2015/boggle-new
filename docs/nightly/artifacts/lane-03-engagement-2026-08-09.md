status: partial
attempted: flag hygiene sweep (exp-* wired-check) + rage-click targeted experiment on homepage/profile + instrumentation gaps
files_touched: fe-next/components/avatar/AvatarBuilderCategoryOptions.tsx
next_steps: |
  - Re-check exp-homepage-click-feedback-v1 once n>=1000/arm (query in triage-queue.md 2026-08-09); retire control if 47%->30% rageclick drop holds.
  - Re-check /he/profile rageclick volume after 7d to confirm the active:scale-95 fix on AvatarBuilderCategoryOptions.tsx worked (query in impact-ledger.ndjson).
  - Did NOT get to: new typed experiment for a funnel gap, 2-3 instrumentation events. Both goals deferred — flag sweep + investigating the 2 rage-click targets ate the time budget. Next lane-03 run should start there (funnel HogQL + instrumentation gap grep) instead of re-sweeping flags (already confirmed clean tonight).
