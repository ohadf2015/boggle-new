status: research-only
attempted: telemetry coverage audit + impact check; identified survival results_viewed hole (58 completed, 0 results_viewed); confirmed lobby_daily_ember_shown intentionally removed (PR #717)
files_touched: docs/nightly/impact-ledger.ndjson (verdict appended)
next_steps: wire results_viewed to survival results screen — find parent component that mounts DailyWordHuntSurvival and handles onComplete, add trackGrowthEvent('results_viewed', {mode:'survival', score}) in the results display effect (mirror DailyWordHuntResults.tsx:90 pattern); also consider removing dead LobbyDailyEmber.tsx + test file
