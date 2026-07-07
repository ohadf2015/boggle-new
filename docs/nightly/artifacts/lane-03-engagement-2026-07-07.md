status: partial
files_touched:
  - fe-next/app/[locale]/PageClient.tsx (landing_view event — fixes 0-count funnel top step)
  - fe-next/lib/experiments.ts (exp-singleplayer-word-goal-v1 defined)
  - fe-next/components/singleplayer/SinglePlayerGame.tsx (first_word_found event)
next_steps:
  - Create PostHog flag exp-singleplayer-word-goal-v1 (50/50, variants control/word-goal) via posthog-experiment.sh
  - Wire word-goal badge overlay in SinglePlayerGame.tsx (experiment defined but variant-B render not added)
  - No flags retired — all active experiments have <30 users/arm, none eligible (need 1000+/arm)
  - exp-blast-wave-banner-v1 is active=false (already off) — code call sites can be cleaned up
