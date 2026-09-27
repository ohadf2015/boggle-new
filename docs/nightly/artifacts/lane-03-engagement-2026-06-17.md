status: research-only
attempted: wire exp-practice-wheel-cta-v1 or exp-game-abandon-confirm-v1, ensure PostHog flags, add instrumentation events for multiplayer funnel
files_touched: none (research only — all wiring targets absent from codebase)
next_steps: |
  Key findings for tomorrow:

  EXPERIMENTS NOW LIVE (flags created 2026-06-16, both wired):
  - exp-mp-quickplay-wait-v1 (id 206583) — QuickPlaySeekingOverlay variant-B wired in MultiplayerFlow.tsx:141,453
  - exp-invite-arrival-clarity-v1 (id 206584) — status-card variant-B wired in PageClient.tsx:90,157

  WIRED BUT FLAG MISSING:
  - exp-leaderboard-play-cta-v1 — tracking code in posthogEngagement.ts:484 but
    variant-B banner blocked (leaderboard/PageClient.tsx = 519 lines, over 500 cap).
    Refactor to <500 lines first, THEN: ensure flag control play-cta "Leaderboard play-now CTA"

  UNWIRED (must wire before flag creation — do NOT create flag):
  - exp-practice-wheel-cta-v1 — PracticeWheelSandbox.tsx does not exist in components/practice/
    Wire: add "Try Again" button to WheelRush game-over state (lib/wheelRush/ has logic)
  - exp-game-abandon-confirm-v1 — ExitConfirmation.tsx does not exist; useNavigationGuard
    not wired; game_abandon_attempted event not emitted yet
  - wheel-signup-offer-v1 — WordWheelResults component not found; daily/word-wheel page.tsx only
  - wheel-replay-cta-v1 — already-played dead-end state not found in codebase

  DEAD FLAG TRIAGE (already in triage-queue 2026-06-16 entry):
  - share-prompt-timing (~70d, ~0 exp) — human: delete in PostHog
  - show-signup-after-first-win (41 exposures, inconclusive 77d) — human: delete
  - mp-signup-nudge-copy-v1 (0/77 converts) — human: delete

  INSTRUMENTATION GAPS TO ADD NEXT RUN:
  - mp_quickplay_joined event (conversion metric for exp-mp-quickplay-wait-v1)
    Wire: after successful room join in useQuickPlay or MultiplayerFlow join handler
  - invite_consumed event (conversion for exp-invite-arrival-clarity-v1)
    Wire: in the multiplayer room-join success path when entered via ?room= param
  - wheel_results_bounced event (guardrail for wheel-signup-offer-v1)
    Wire: in daily-word-wheel result page on unmount without navigation

  POSTHOG FLAG ENSURE (run once per-experiment after wiring):
    scripts/nightly/lib/posthog-experiment.sh ensure wheel-replay-cta-v1 control practice-cta "Already-played wheel replay CTA"
    scripts/nightly/lib/posthog-experiment.sh ensure wheel-signup-offer-v1 control streak-value "Wheel daily guest signup CTA"
