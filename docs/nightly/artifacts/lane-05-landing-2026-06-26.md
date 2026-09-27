status: partial

## Shipped
- towerLean.ts: RECENT_WEIGHT_DECAY 0.7→0.50 (faster center recovery; addresses "tower stays on the side")
- towerSway.ts: SWAY_PERIOD_CALM_MS 2600→4500, SWAY_PERIOD_FRANTIC_MS 1650→2800 (real building sway, not twitchy metronome)
- towerSway.ts: SWAY_OFFSET_AT_MAX 0.26→0.20 (green zone reachable while swaying)
- WordTowerPlay.tsx: HUD overlap — SkinPicker hidden on <400px screens via `hidden min-[400px]:contents`
- WordTowerPlay.tsx: Hard-clear now includes setWreckReport(null) + setPerfectBurstKey(0)
- WordTowerPlay.tsx: Perfect drop celebration — PerfectBurstFlash lime overlay + verdict text-3xl on perfect quality
- WordTowerPlay.tsx: setRewardFx(null) added to hard-clear (prior run)

## Not shipped (time-gated)
- Stuck notifications root cause: sab/crane.critical toasts unexamined; auto-dismiss already covers most paths; no new `setX(null)` calls added beyond wreckReport
- New upgrades (doubleDown / blastShield / speedDraft) — multi-file, needs own lane
- HUD left-rail collision (mutator chip fixed left-2) on very narrow screens still possible

## next_steps
- Verify sab toast dismiss logic in useSabotage.ts
- New upgrades lane: doubleDown (2× on perfect-streak-3+), blastShield (first topple = 0 floors), speedDraft (first word of new biome = double height)
