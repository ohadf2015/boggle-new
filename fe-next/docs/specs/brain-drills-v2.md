# Brain Drills v2 — honest measurement, less chrome, more flow (2026-09-25)

## Problems (v1)
- "Brain Score" = EMA over a crude `score/maxScore*80 + level*5`, every domain seeded at 50,
  training level baked in → rises with practice/leveling, not ability. Tiers, radar, history
  chart, share card and "Cognitive Baseline Established!" after ONE run all present it as a
  psychometric instrument. It is not.
- Training drills change difficulty as you level → raw scores are not comparable over time.
- 5 near-identical drill PageClients (~200 lines each, 95% copy).
- Pattern Switcher: 19 runs lifetime, 3 in 30d (prod, 2026-09-25) — nobody comes back.
- Difficulty only ratchets up; a player stuck above their level just keeps failing.
- Memory Insights card: "memory score up X%" from the seeded EMA + words averaged across levels.

## Design
### 1. Brain Check (measurement) — separate from training
- Per drill, a **fixed protocol**: same level/params for everyone, forever
  (`BRAIN_CHECK_PROTOCOL` in `shared/utils/brainCheck.ts`). No boosts in check mode.
- Stored as normal `drill_sessions` rows with `extra_data.benchmark = true` (no migration).
  Check runs never touch training level / drill_progress.
- Cooldown: one check per drill per 20h (server-enforced; a too-early or off-protocol check is
  stored as `benchmark:false, benchmarkRejected:true`, never as a measurement).
- Metric per drill (higher = better): lightning = words/min, memory = recall accuracy,
  combo = best chain, rare-gems = gem points.
- Analysis (pure, `analyzeBrainChecks`):
  - run #1 = **familiarisation**, excluded (largest practice jump is run 1→2).
  - baseline = mean of runs #2–#3; current = mean of latest 2 runs (disjoint → ≥5 runs).
  - noise = within-person SD from successive differences (von Neumann MSSD, robust to trend),
    floored at 5% of baseline.
  - Reliable Change Index (Jacobson & Truax 1991): RCI = (current − baseline) / (sd·√(1/2+1/2)).
    |RCI| ≥ 1.96 and ≥7 days between last baseline run and latest → improved / declined; else stable.
  - fewer runs → `need-more`. No verdict is ever inferred from 1–4 runs.
- Copy is honest in all 6 locales: measures performance on these word tasks under fixed
  conditions; transfer to everyday cognition is not established.

### 2. Removed
- Hub: BrainScoreHero, CognitiveRadarChart(+Inner), CognitiveDomainGrid, DeltaDisplay,
  BrainScoreHistoryChart(+Inner), ScientificTipsCarousel, BrainScoreShareCard,
  FirstGameCelebration, WelcomeBackCard, DrillResearchIntro, PersonalizedDrillRecommendation,
  DrillUnlockProgress, MemoryInsightsCard (+ /api/brain/memory-insights).
- Pattern Switcher drill (route redirects to /brain). DrillType keeps it for historical rows.
- 5 PageClients → one `DrillPageShell` (+ 10-line per-route stubs to keep bundles lean).
- Unlock gates (rare-gems needed 10 games) — every drill open from visit one.
- `brain_scores` writes stay (regular games + TV spotlight read them); the hub stops showing them.

### 3. Fun
- Adaptive staircase: promote on crossing target (as before); **demote** after two consecutive
  runs at the same level below 40% of its target → drills stay in flow.
- Each drill card shows the level it will start at.
- Brain Check is a daily ritual: card per drill with sparkline, verdict chip, cooldown timer,
  and a result reveal that stays open to be read.
- Bug: `/api/drills/random-words` rejected `ru` → Russian boards had no placed words.
