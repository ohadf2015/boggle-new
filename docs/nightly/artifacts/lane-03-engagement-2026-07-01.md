status: shipped
attempted: Flag hygiene sweep + new experiment targeting /es rage-click drop + PostHog flag creation
files_touched:
  - fe-next/lib/experiments.ts (added exp-landing-quick-play-v1 definition)
  - fe-next/components/landing/LandingHero.tsx (wired exp-landing-quick-play-v1, quick-play button + exposure tracking)
  - docs/nightly/triage-queue.md (added mp-signup-nudge-copy-v1 54d inconclusive + exp-blast-wave-banner-v1 ghost flag)
next_steps:
  - Monitor exp-landing-quick-play-v1 conversion (game_started within 2min of landing_view) vs bounce rate guardrail
  - Human: retire mp-signup-nudge-copy-v1 (54d, no winner) and delete exp-blast-wave-banner-v1 ghost flag from PostHog
  - Add landing_locale_bounce instrumentation event once experiment has sufficient data (n>=500/arm)
