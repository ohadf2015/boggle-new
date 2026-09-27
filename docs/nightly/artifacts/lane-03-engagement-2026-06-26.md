status: shipped
attempted: Fix Word Tower physics + add centerMagnet upgrade + PERFECT drop celebration + engagement flag hygiene
files_touched:
  - fe-next/lib/wordTower/towerLean.ts (RECENT_WEIGHT_DECAY 0.7→0.50, faster center recovery)
  - fe-next/lib/wordTower/towerSway.ts (sway periods 4500/2800ms, SWAY_MAX_DEG 2.2 deg, SWAY_OFFSET_AT_MAX 0.20)
  - fe-next/components/wordTower/WordTowerPlay.tsx (PerfectBurstFlash on PERFECT drops, belt-and-suspenders enhanced, passiveLeanResetGetter)
  - fe-next/components/wordTower/useCraneDrop.ts (passiveLeanResetMult param + passive lean relaxation on every drop)
  - fe-next/lib/wordTower/upgrades.ts (centerMagnet upgrade: passiveLeanReset effect, maxLevel 3, baseCost 350)
  - fe-next/translations/en.js he.js sv.js ja.js es.js (centerMagnet i18n x5)
next_steps:
  - Rage clicks on /en/multiplayer (score 0.589) need targeted fix — wire exp-mp-lobby-rage-fix-v1
  - Connections puzzle he-e-055 (2 dislikes, 2 likes) should be replaced
  - Add goldenDrop upgrade (PERFECT drops award coins directly) — needs addCoins in useCraneDrop
  - HUD overlap: verify 4-button row on 375px screens still clear of mute FAB
founder_directives_addressed:
  - tower-stays-on-side: decay faster (0.7->0.50) + centerMagnet upgrade
  - too-fast-sway: sway period 4500ms/2800ms (was 2600/1650) + amplitude 2.2 deg (was 3.4)
  - notifications-stuck: rewardFx/wreckReport/perfectBurstKey added to word-start belt-and-suspenders
  - celebrate-green: PerfectBurstFlash full-screen lime flash on every PERFECT
  - more-interesting-upgrades: centerMagnet (10 upgrades total, all wired)
