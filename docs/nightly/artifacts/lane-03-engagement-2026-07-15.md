status: shipped
attempted: Run impact checks on connections hint-gate + MP rageclick revert; wire exp-homepage-click-feedback-v1; ensure all PostHog flags for wired experiments
files_touched:
  - fe-next/components/landing/LandingModeCubes.tsx (wire exp-homepage-click-feedback-v1)
  - docs/nightly/impact-ledger.ndjson (3 verdict/impact entries)
next_steps:
  - Instrument game_completed in connections (biggest gap — 0 fire sites found tonight)
  - /es/multiplayer still 10 rageclicks/7d — investigate what element is being raged on
  - exp-homepage-click-feedback-v1 check after 7 days (baseline 27 homepage rageclicks)
  - connections hint-gate verdict unmeasurable until game_completed is instrumented there
