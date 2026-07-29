# Admin game log — missing modes instrumentation

**Date:** 2026-06-07
**Report:** "other modes played not logged into admin logs (wordcraft, blast, etc.)"

## Root cause (primary-source confirmed)

Admin game log (`/api/admin/game-logs`, default `source=analytics`) reads
`analytics_events WHERE event_type IN ('game_started','game_completed','game_abandoned')`.
Only events routed through `trackGrowthEvent` (utils/growthTracking.ts:268) persist to
Supabase (`persistToSupabase`, line 321). The canonical mode helper `trackGameEnd`
(line 930) is that route.

Modes that bypass it never appear:
- **solo blast** — `blastTelemetry.trackBlastRunEnded` emits `game_completed` via
  `safeCapture` = `posthog.capture` only (PostHog, never Supabase). MP-blast logs because
  it rides the backend MP lifecycle → `mpGameTracking` → `trackGameEnd` (130 live rows, all
  `engineMode:multiplayer`).
- **word-craft** — `wordCraftTelemetry` has no game-end event at all.
- **crossword** — `useCrosswordGame` fires `onSolved` but emits no analytics.
- **brain drills** — `useSaveDrillResult` (central chokepoint) emits no analytics.
- **party** — results screen unbuilt ("coming in Sprint 4"); cannot instrument. Deferred.

Read side has NO mode allowlist; unknown modes render with a `titleCase` fallback label.
For full stats-bucket visibility, modes are added to `CANONICAL_MODE_BUCKETS`.

## Fix

Route each mode's end-of-game through the shared `trackGameEnd(mode, score, wordCount,
completed, durationSec, extras)`. `completed=true` for any game that REACHED its end (a
loss is still a played game → must show in admin); win/loss rides in `extras.isWinner`.

| Mode | Helper (TDD, growthTracking mocked) | Wired into | mode string |
|---|---|---|---|
| blast (solo) | reroute `blastTelemetry` canonical emits | (in place) | `blast` |
| word-craft | `emitWordCraftGameEnd` in `wordCraftTelemetry.ts` | PageClient game-over effect (once-guard) | `word-craft` |
| crossword | `emitCrosswordGameEnd` in `lib/crossword/telemetry.ts` | `useCrosswordGame` solved effect | `crossword` |
| brain | `emitBrainDrillGameEnd` in `lib/brain/drillAnalytics.ts` | `useSaveDrillResult` | `brain-drill` |

Read-side: add `word-craft`/`crossword`/`brain-drill` to mode buckets, labels, icons.

Scope note: this fixes the default `source=analytics` view. `source=tables` reads
`game_results` (MP-only backend lifecycle) — out of scope.
