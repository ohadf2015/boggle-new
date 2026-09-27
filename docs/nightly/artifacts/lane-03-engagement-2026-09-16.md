status: shipped
attempted: flag hygiene sweep + one new typed experiment targeting biggest funnel drop + 2-3 instrumentation events
files_touched:
  - fe-next/components/word-craft/wordCraftTelemetry.ts (3 new track fns)
  - fe-next/lib/word-craft/useWordCraftGame.ts (wired submit-blocked telemetry)
  - fe-next/components/word-craft/WordCraftGameScreen.tsx (wired dict-retry telemetry)
  - docs/nightly/triage-queue.md (appended 2 findings)
  - docs/nightly/reports/2026-09-16.md (Lane 2 section)
  - docs/nightly/impact-ledger.ndjson (1 entry)
next_steps: |
  Flag hygiene: no decided winner found (needs per-flag PostHog experiment-results
  query, out of scope this run). New experiment goal not shipped — instead found
  `exp-game-abandon-confirm-v1` is fully UNWIRED (pure resolveQuitConfirmDescription()
  helper, zero non-test callers). Next lane should: (1) find the ConfirmationDialog
  render inside components/singleplayer/game/SinglePlayerShell.tsx, (2) wire
  useExperiment('exp-game-abandon-confirm-v1') + resolveQuitConfirmDescription,
  (3) add singlePlayer.quitConfirmMessageWithStats in 5 locales, flag already live
  (id 209541). Instrumentation goal shipped: 3 new events on /en/word-craft submit
  path to test the rage-click hypothesis (board disable logic already looked
  correct — events will show if a race bypasses it). Re-query in ~3 days.
