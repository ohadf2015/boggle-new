status: research-only
attempted: Coverage audit + impact check for blast results_viewed + traced lobby_daily_ember_shown regression
files_touched: docs/nightly/impact-ledger.ndjson (verdict appended)
next_steps: |
  REGRESSION TO FIX: lobby_daily_ember_shown (346→0). Component LobbyDailyEmber.tsx exists with
  call site but is orphaned — no importer in app/ or player/ code. Fix: import LobbyDailyEmber
  in fe-next/player/components/PlayerWaitingView.tsx and include in selfActions slot passed to
  PlayerRoster. Read HostPreGameView.tsx selfRosterActions pattern to match shape. TDD required.
  Also check: rewarded_ad_offered drop 121→42 (per brief: context-gated, not a code bug).
