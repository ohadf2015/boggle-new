status: research-only
attempted: rage-click root cause on /es/multiplayer (reach=9, score=0.915), flag hygiene sweep, new exp targeting mp funnel drop, 2-3 instrumentation events

files_touched: none

findings:
  - exp-mp-room-join-loading-v1 DEFINED in experiments.ts but NOT wired: RoomListView.tsx
    has loading-state code (showJoinLoading prop, spinner) but no useExperiment() call.
    Component never reads the flag so 100% control served to all users.
  - useExperiment hook exists (hooks/useExperiment.ts) but imported by ZERO production
    components. All 33 typed experiments are dark/unwired.
  - usePostHogFlag IS used by useWordTowerEnabled (feature gates work; A/B tests do not).
  - $exception events: 1724 in 24h (high - may cause rage clicks).
  - PostHog flag ensure NOT run: rule requires >=1 wired call site before creating flag.
  - Old flags >7d flagged for human review: share-prompt-timing (100d),
    show-signup-after-first-win (100d), mp-signup-nudge-copy-v1 (62d).

next_steps: |
  Wire exp-mp-room-join-loading-v1 in RoomListView.tsx:
    1. Import useExperiment, add: const { variant } = useExperiment('exp-mp-room-join-loading-v1')
    2. Trace showJoinLoading prop in MultiplayerFlow.tsx - override with variant === 'loading-state'
    3. Run posthog-experiment.sh ensure after wiring
    4. Add mp_room_join_clicked posthog.capture in onRoomClick for funnel visibility
  Investigate 1724 $exception/24h - likely contributing to rage clicks
