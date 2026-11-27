status: research-only
attempted: Ran PostHog coverage audit (DEAD/CRATERED events + per-mode completion holes), triaged, deep-dived the top candidates.
files_touched: none (docs/nightly/reports/2026-11-26.md appended; no fe-next code changed)
next_steps: |
  - Verdicts reached, no code shipped: last night's 3 "CRATERED" classroom-join events and
    rewarded_ad_offered are confirmed noise (low-baseline events rolling out of the 7d window),
    not the suspected PR #2050 regression — no fix needed there.
  - hint_used fully audited end-to-end (button -> useHints -> socket requestHint ->
    backend/handlers/hintHandler.ts (registered in handlers/index.ts:66) -> hintResponse ->
    trackHintUsed -> trackGrowthEvent). Every link verified correct; still 0 volume in 14d.
    Did NOT force a blind fix. Tomorrow: live-device repro (tap the hint button on a real
    phone in a solo game) to see if it's truly zero real-world usage or a runtime-only gap
    invisible from source.
  - word-craft vs wordcraft mode-label "split" ruled out as a bug — two distinct features
    (standalone mode vs education/classroom lesson-practice variant), do not touch.
  - Per-mode game_started->game_completed now healthy (70-84%) across all modes; June's
    "random 94->1" completion hole from docs/telemetry-audit-2026-06-23.md is resolved —
    that doc's §2 table is stale and could be refreshed.
  - Backlog untouched: ~130 DEAD events remain, mostly legit low-traffic-by-context
    (cg_*, iap_*, edu_trial_*). Next night: drain a §1b never-wired P1 social event
    (friend_added/profile_viewed still 0 call sites) instead of re-chasing hint_used again
    without new evidence.
