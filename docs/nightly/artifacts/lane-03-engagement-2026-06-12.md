status: shipped
attempted: flag hygiene (scan active flags, escalate 94-rage-click urgency for 2 dark experiments) + register exp-practice-wheel-cta-v1 targeting 43% practice funnel drop + instrument practice_abandoned event
files_touched:
  - fe-next/lib/practice/telemetry.ts (added trackPracticeAbandoned + PracticeAbandonedArgs)
  - fe-next/app/[locale]/practice/[mode]/PageClient.tsx (wired practice_abandoned on unmount)
  - fe-next/lib/experiments.ts (registered exp-practice-wheel-cta-v1)
  - docs/nightly/triage-queue.md (URGENT escalation: 94 rage clicks, 2 dark experiments need PostHog flags)
  - docs/nightly/reports/2026-06-12.md (appended Lane 03 section)
next_steps:
  - HUMAN ACTION: create PostHog flag exp-mp-quickplay-wait-v1 (control/match-seeking, 50/50) — wired 06-09, STILL DARK
  - HUMAN ACTION: create PostHog flag exp-invite-arrival-clarity-v1 (control/status-card, 50/50) — wired 06-10, STILL DARK
  - Wire exp-practice-wheel-cta-v1 in PracticeWheelSandbox.tsx (game-over state, "Try Again" button)
  - Create PostHog flag exp-practice-wheel-cta-v1 after wire
  - Retire share-prompt-timing / show-signup-after-first-win flags (72d/71d, human PostHog results check needed)
