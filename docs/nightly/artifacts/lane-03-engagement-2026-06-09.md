status: shipped
attempted: investigate rage clicks on /es/multiplayer, triage stale flags, wire exp-mp-quickplay-wait-v1 experiment, instrument mp_quickplay_seeking + mp_quickplay_joined events
files_touched:
  - fe-next/components/multiplayer/QuickPlaySeekingOverlay.tsx (new)
  - fe-next/components/multiplayer/__tests__/QuickPlaySeekingOverlay.test.tsx (new)
  - fe-next/components/multiplayer/MultiplayerFlow.tsx (wired experiment + overlay)
  - fe-next/app/[locale]/multiplayer/PageClient.tsx (mp_quickplay_joined event)
  - fe-next/utils/growthTracking.ts (mp_quickplay_seeking type added)
  - fe-next/translations/en.js (seekingMatch + seekingMatchSub keys)
  - fe-next/translations/he.js (seekingMatch + seekingMatchSub keys)
  - fe-next/translations/sv.js (seekingMatch + seekingMatchSub keys)
  - docs/nightly/triage-queue.md (4 stale flags + experiment action item)
  - docs/nightly/reports/2026-06-09.md (lane summary appended)
next_steps:
  - CREATE PostHog flag exp-mp-quickplay-wait-v1 (control/match-seeking, 50/50) — experiment inert until done
  - Add seekingMatch/seekingMatchSub to es.js and ja.js (hit 8-file scope cap tonight)
  - Retire share-prompt-timing + show-signup-after-first-win after human review (triage-queue.md has call sites)
  - Verify mp_quickplay_joined fires correctly once PostHog flag is live
