status: research-only
attempted: PostHog coverage audit vs GrowthEvent registry, per-mode completion holes, brain-drill game_started regression root-cause

files_touched: none

findings:
  registry_events_total: 107
  dead_in_posthog: 59 (most are low-traffic context-gated: cg_*, school_lead_*, iap_*)
  newly_dead_this_week:
    - growth:avatar_nudge_shown: 4→0 (low volume, inconclusive)
    - growth:achievement_earned: 2→0 (rare event, inconclusive)
    - growth:daily_conversion_shown: 20→2 CRATERED (likely behavioral: more users played daily already; component intact)
  per_mode_completion_holes:
    - random: 80 started / 0 completed (BY-DESIGN: MP resolves to real mode, game_completed fires with resolved mode)
    - connections: 1 started / 0 completed (too small, inconclusive)
    - brain-drill: 0 started / 14 completed (14d), 0 started / 14 completed (7d) — REGRESSION
  brain_drill_regression_detail:
    - drill_started fires 12x/14d (safeCapture in telemetry.ts works)
    - game_started brain-drill fires 0x/14d
    - trackDrillStart calls both: safeCapture('drill_started') AND trackGameStart('brain-drill', ...)
    - Same user has drill_started ×4 but zero game_started brain-drill events
    - game_started fires fine for all other modes (word-wheel/survival/blast for same user)
    - Root cause: trackGameStart('brain-drill') silently fails from telemetry.ts context
    - Likely: module initialization order, circular dep, or exception in growthTracking side-effects
    - Fix needed: wrap trackGameStart call in try/catch in telemetry.ts, add console.error to surface

next_steps: |
  1. Wrap trackGameStart in telemetry.ts in explicit try/catch to surface the silent error
  2. Test locally: open /en/brain/drills/combo-master, check console for errors during useEffect
  3. Check if persistToSupabase throws synchronously before PostHog capture in trackGrowthEvent
  4. If confirmed fixed, verify game_started brain-drill appears in PostHog within 24h
