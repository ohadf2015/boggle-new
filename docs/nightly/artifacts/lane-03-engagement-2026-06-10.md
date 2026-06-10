---
status: shipped
attempted: Flag hygiene + new experiment exp-invite-arrival-clarity-v1 + invite_redirect_fired instrumentation
files_touched:
  - fe-next/lib/experiments.ts
  - fe-next/utils/growthTracking.ts
  - fe-next/app/[locale]/PageClient.tsx
next_steps: Create PostHog flag exp-invite-arrival-clarity-v1 (control/status-card 50/50). Create exp-mp-quickplay-wait-v1 (still pending). Human retire share-prompt-timing + show-signup-after-first-win. Monitor invite_redirect_fired baseline.
---
