status: shipped
files_touched:
  - fe-next/components/landing/LandingModeCubes.tsx
  - fe-next/utils/growthTracking.ts
next_steps:
  - Fire mp_lobby_join_attempted in multiplayer lobby join/create button handlers (type added, fire site pending)
  - Human: deactivate zombie flag exp-mp-room-join-loading-v1 in PostHog (active but 0 call sites, not in experiments.ts)
  - Check mode_card_rapid_reclick event in PostHog after 3 days to confirm rage-click signal is live
  - Monitor homepage rageclick count after 7 days to measure exp-homepage-click-feedback-v1 impact
