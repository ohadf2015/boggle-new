status: partial
files_touched:
  - fe-next/components/auth/InlineSignupCard.tsx
next_steps: |
  Wire exp-results-daily-nudge-v1 in SinglePlayerResults.tsx + experiments.ts.
  Retire share-prompt-timing (0 exposures 30d) + show-signup-after-first-win (65d, 0 conv).
  game_complete->day2_return = 6.25% is the primary lever.

instrumentation_fixed: signup_prompt_shown now fires on InlineSignupCard mount (surface=inline_results)
flags_for_human_review:
  - share-prompt-timing: 65d old, 0 PostHog exposures in 30d — likely broken trigger condition
  - show-signup-after-first-win: 65d old, 35 exposures, 0 signups both arms — re-evaluate after tracking fix
  - mp-signup-nudge-copy-v1: 27d, 75 exposures, 0 signups — insufficient n, wait
experiment_spec:
  key: exp-results-daily-nudge-v1
  hypothesis: inline daily-challenge nudge on SP results lifts day-2 return from 6.25%
  variants: control | daily-teaser
