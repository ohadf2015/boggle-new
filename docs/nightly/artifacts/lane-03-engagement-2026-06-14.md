---
status: shipped
date: 2026-06-14
lane: 03-engagement
files_touched:
  - fe-next/lib/practice/telemetry.ts
  - fe-next/components/practice/PracticeWheelSandbox.tsx
  - fe-next/components/practice/__tests__/PracticeWheelSandbox.retryCta.test.tsx
  - fe-next/translations/en.js + es.js + he.js + sv.js + ja.js
  - docs/nightly/triage-queue.md
  - docs/nightly/reports/2026-06-14.md
next_steps: |
  HUMAN: create PostHog flag exp-practice-wheel-cta-v1 [control, retry-cta] 50/50 (wired this night)
  HUMAN: create flags exp-mp-quickplay-wait-v1 + exp-invite-arrival-clarity-v1 (dark 5+ nights)
  HUMAN: prune 4 dead flags from PostHog — see triage-queue.md 2026-06-14 section
---
Wired exp-practice-wheel-cta-v1 retry-cta variant: timer-expiry overlay with Try Again.
New events: practice_game_over + practice_retry_tapped. 4 dead flags flagged for prune.
