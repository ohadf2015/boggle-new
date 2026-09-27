status: research-only
attempted: audit GrowthEvent registry vs PostHog 14d; classify DEAD/CRATERED/per-mode holes; identify root cause of random-mode completion gap
files_touched: none
next_steps: |
  PRIORITY: Fix random-mode game_started labeling.
  Root cause: server resolves 'random'→'classic/blast/etc' before sending startGame payload,
  so game_completed fires with the resolved mode. But game_started fires with mode='random'
  because useGameStartTelemetry fires when gameModeConfirmed=true, and at that point
  gameMode IS the resolved mode — yet PostHog shows 59 events with mode='random'.
  SUSPECT: useMpGameTracking (obfuscated to 'n') is called somewhere with gameMode='random'
  before the mode is resolved, bypassing the gameModeConfirmed gate. Find callers of
  useMpGameTracking and verify the gameMode arg is always resolved (not 'random').
  Fix: either filter out 'random' in trackMpGameStart, or defer the start call until mode confirmed.
  Also document: 56 DEAD events in registry are long-standing zeros (both d7=0 and prev7=0),
  NOT regressions — these are unimplemented features (adventure, share cards, cg_*, etc.).
