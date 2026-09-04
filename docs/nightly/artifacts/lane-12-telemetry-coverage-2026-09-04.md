status: shipped
attempted: run posthog-coverage audit (DEAD/CRATERED classify + per-mode completion), triage, fix highest-leverage wired-but-silent or newly-dead event
files_touched: fe-next/components/results/AutoPlayCountdown.tsx, fe-next/components/results/__tests__/AutoPlayCountdown.test.tsx
next_steps: 11 DEAD events remain (all triaged, mostly legit low-context — see docs/nightly/reports/2026-09-04.md Lane 12 section). Next best candidate: page_view — trackPageView() in growthTracking.ts has zero callers anywhere in the app (real gap), needs a route-change listener wired across the App Router — bigger than a single-file slice, budget for a full night. connections mode has game_started=1/game_completed=0 in 14d but sample too small to act on; recheck in a week.
