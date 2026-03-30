# Adventure Mode Full Audit — 2026-03-30

> **4-expert panel**: Game Designer, UX/Playability, Balance Specialist, Code Quality
> **Scope**: Gameplay, upgrades, difficulty, economy, bosses, playability, code bugs, security

---

## Executive Summary

Adventure Mode has strong foundations: 10 unique bosses, thoughtful grid/timer scaling, a deep upgrade tree, and solid accessibility. However, **3 critical systemic issues** threaten the entire mode:

1. **Boss damage formula is broken** — `floor(score/10)` makes 3-4 letter words deal **zero damage**, making W5+ bosses mathematically impossible
2. **Gold economy collapses after W6** — 28K gold supply vs 9K upgrade cost = massive dead zone
3. **Completion data silently discarded** on DB edge case — one-line bug in `transforms.ts:27`

**Total findings: 72** (6 CRITICAL, 16 HIGH, 28 MEDIUM, 22 LOW)

---

## CRITICAL Findings (6)

### CRIT-1: Boss damage formula makes W5+ bosses impossible
- **Source**: Balance Specialist
- **File**: `hooks/useAdventureWordSubmit.ts:201-206`
- **Details**: `baseDamage = floor(scoreValue / 10)`. A 3-letter word (3 pts) = 0 damage. A 4-letter word (5-8 pts) = 0 damage. Only 5+ letter words deal any damage (1-4). W10 boss has 1000 HP — would require ~667 words at average damage of 1.5. Players find ~30-40 words per boss fight.
- **Fix**: Change to `ceil(scoreValue / 3)` or use `wordLength` as base damage. Reduce boss HP to 30 (W1) → 250 (W10).

### CRIT-2: Gold economy dead zone after W6
- **Source**: Game Designer + Balance Specialist
- **Files**: `lib/adventure/upgradeConfig.ts`, `lib/adventure/lootConfig.ts`
- **Details**: Total upgrade cost = ~9,280 gold. Total gold earned W1-W10 at 2-star = ~28,117 gold (3x surplus). Quest gold alone (19,280) exceeds all upgrade costs. A dedicated player maxes upgrades around W5-6, then earns ~17K gold with nothing to spend it on.
- **Fix**: Add gold sinks (consumable items, cosmetic tile skins, boss rematch wagers, prestige upgrades) OR increase upgrade costs 2-2.5x and add more tiers.

### CRIT-3: transforms.ts discards completions on missing progression
- **Source**: Code Quality
- **File**: `app/api/adventure/transforms.ts:27`
- **Details**: When `player_progression` row is null, `transformProgression(null, completions)` ignores the `completions` parameter and returns `completions: []`. Documented in test file but never fixed.
- **Fix**: Change `completions: [],` → `completions,` (one-line fix).

### CRIT-4: W10 Lexicon Dragon — 9 phases with no checkpoint
- **Source**: Game Designer
- **File**: `lib/adventure/bossConfig.ts` (W10 config)
- **Details**: 1000 HP, 9 phases cycling all 9 prior boss mechanics at 15s intervals, speed 1.0→2.2x. No checkpoint, no continue. A single loss restarts the entire fight. Combined with CRIT-1, this boss is currently unbeatable.
- **Fix**: Add checkpoint every 3 phases, or allow "continue" for gold cost.

### CRIT-5: No prestige/ascension system — zero post-completion loop
- **Source**: Game Designer
- **Details**: After completing 10 worlds, there is no reset loop. Games like Hades (Mirror), Slay the Spire (Ascension 1-20), BTD6 (Paragons) all have meta-progression. LexiClash has none.
- **Fix**: Add Ascension system: completing all worlds unlocks Ascension 1 (enemies +10% HP, reduced timer). 10 levels with cumulative modifiers and exclusive rewards.

### CRIT-6: No interactive tutorial (FTUE)
- **Source**: UX/Playability
- **File**: `components/adventure/AdventureView.tsx:472-507`
- **Details**: Only onboarding is a dismissible banner. No guidance on word forming, objectives, combos, world mechanics, or the upgrade shop. Once dismissed, never returns.
- **Fix**: Add step-by-step tutorial overlay for W1L1 with coach marks: grid → objectives → timer → stars.

---

## HIGH Findings (16)

### HIGH-1: Stars and score are client-reported — no server validation
- **File**: `app/api/adventure/complete/route.ts:73-81`
- **Details**: `stars` (0-3) and `score` are sent by client with no upper bound or server recalculation. A cheater can always report 3 stars, inflating gold/XP.
- **Fix**: Server should recalculate stars from objective completion data.

### HIGH-2: fuelTank trivializes mid-game timer pressure
- **File**: `lib/adventure/upgradeConfig.ts` (fuelTank config)
- **Details**: Max tier (+40s) turns W10's 160s into 200s (5.1s/tile from 3.3s/tile). Undoes the carefully calibrated timer curve.
- **Fix**: Cap at +25s, or make it decay (-1s per world after W5).

### HIGH-3: gemDetector and blastShield effects not wired
- **Files**: `lib/adventure/upgradeConfig.ts` (configs exist), unconnected to gameplay
- **Details**: Both purchasable but do nothing. Total 1,620 gold wasted by players.
- **Fix**: Wire effects or remove from shop.

### HIGH-4: Lucky Pickaxe compounds with loot formula — runaway inflation
- **File**: `lib/adventure/lootConfig.ts`
- **Details**: Max tier = 1.75x multiplier applied to ALL gold drops including bonusGold and bossTrophy. W10 boss 3-star with maxed pickaxe = ~1,084 gold from one level.
- **Fix**: Apply multiplier only to baseGold, not bonus/trophy.

### HIGH-5: Boss Rush hardcoded to bosses 1-5
- **File**: `lib/adventure/bossRush.ts`
- **Details**: `bossSequence = [1,2,3,4,5]`. Players who beat the game never fight late bosses in rush. `runeFragments` reward references non-existent system.
- **Fix**: Add difficulty tiers (Easy 1-5, Hard 6-10, All 1-10). Randomize order.

### HIGH-6: Chain and Time tile types fully implemented but never spawn
- **Files**: `lib/adventure/levelConfig.ts:629-664`, `types/adventure.ts:26`, reducer
- **Details**: ~100 lines of reducer logic, 10 theme definitions, rendering — but `generateSpecialTiles()` never creates them. Complete dead features.
- **Fix**: Add to level configs for W4+ (chain) and W7+ (time), or remove dead code.

### HIGH-7: No failure explanation on defeat
- **Source**: UX/Playability
- **Details**: Defeat cinematic shows generic encouragement. Doesn't show which objectives were missed, how close the player was, or what to improve.
- **Fix**: After defeat cinematic, show "What went wrong" panel with objective progress vs. targets.

### HIGH-8: World mechanics not explained during gameplay
- **Source**: UX/Playability
- **Details**: Score popup shows bonus amount but not why (synonym, etymology, etc.). Players don't know what triggered extra points.
- **Fix**: Add contextual tooltip on mechanic bonus: "+15 Synonym Pair!" with first-time explanation overlay per world.

### HIGH-9: First-time players dumped on WorldMap without context
- **File**: `components/adventure/AdventureView.tsx`
- **Details**: Zero-completion players see all 10 worlds. Must scroll to find W1.
- **Fix**: For new players, auto-select W1 and show level grid directly.

### HIGH-10: Debug error message visible in production
- **File**: `components/adventure/AdventureView.tsx:280-285`
- **Details**: Raw `error.message` rendered to users. May leak stack traces.
- **Fix**: Remove or gate behind `NODE_ENV === 'development'`.

### HIGH-11: Non-English locales get reduced flash challenge pools
- **File**: `lib/adventure/flashChallengeConfig.ts`
- **Details**: `startsWith`, `endsWith`, `specificLetter` filtered for non-English. Palindrome appears disproportionately.
- **Fix**: Add locale-aware challenges (Hebrew letter challenges, Japanese kana).

### HIGH-12: No build diversity — all upgrades can be maxed
- **Source**: Game Designer
- **Details**: No decision tension. Players just buy everything. No specialization paths.
- **Fix**: Cap simultaneous upgrade tiers (e.g., max 30 total across all 11 upgrades) or add mutually exclusive paths.

### HIGH-13: No run modifiers / mutators for replay
- **Source**: Game Designer
- **Details**: No way to make completed content harder. Endless mode is separate, not a modifier.
- **Fix**: Add World Mutators (No Hints, Speed Run, Fragile, etc.) with bonus rewards.

### HIGH-14: Endless mode plateaus at floor 31
- **File**: `lib/adventure/endlessMode.ts`
- **Details**: Timer floor = 30s at floor 31. Grid caps at 7x7 at floor 25. After floor 31, every floor is identical.
- **Fix**: Add milestones every 5 floors, mechanic combos after floor 30, escalating mini-events.

### HIGH-15: Concurrent level completion can lose data (409 not retried)
- **File**: `app/api/adventure/complete/route.ts:366-441`
- **Details**: Optimistic lock retries once. If both attempts fail, returns 409. Client has no retry logic.
- **Fix**: Use atomic increment (`gold = gold + N`) instead of optimistic lock, or add client retry.

### HIGH-16: Mid-session engagement gap (levels 2-6 are generic)
- **Source**: Game Designer
- **Details**: Levels 1 and 7 (boss) are memorable. Levels 2-6 are grid puzzles with incrementally harder objectives. No narrative, no mini-bosses, no special configs.
- **Fix**: Add mini-boss at level 4, narrative dialogue at levels 1 and 4.

---

## MEDIUM Findings (28)

| ID | Finding | Source |
|----|---------|--------|
| MED-1 | Flash challenge gold rewards flat, not world-scaled (45-150 coins in W1 or W10) | Game Design |
| MED-2 | Quest gold dominates economy (68% of income) — level loot feels irrelevant | Balance |
| MED-3 | 1-star player blocked at W2 (needs 11 stars, gets 7) | Balance |
| MED-4 | W2→W3 timer cliff (-1.28 s/tile) is steepest transition | Balance |
| MED-5 | speedMultiplier in boss phases ambiguous — bosses are untimed, what does speed multiply? | Game Design |
| MED-6 | Mastery upgrades (wordDynamite, timeFreeze) unlock at W5 but needed at W3-4 grid jump | Game Design |
| MED-7 | wordRadar tier values inconsistent (decimals vs integers mid-upgrade) | Game Design |
| MED-8 | salvageClaw tier values incoherent (5, 0.5, 1 across tiers) | Game Design |
| MED-9 | Flash challenges trigger once per level at fixed 30% time — predictable, no surprise | Game Design |
| MED-10 | Quest types repetitive — wordCountChapter in 9/10 worlds | Game Design |
| MED-11 | flashChallengeMaster quest may require more challenges than possible in chapter | Game Design |
| MED-12 | No loot variety beyond gold/XP — no cosmetics, materials, consumables | Game Design |
| MED-13 | Star farming is only replay incentive for completed worlds | Game Design |
| MED-14 | No session pacing awareness — no break prompts after 3+ consecutive levels | UX |
| MED-15 | Combo system not explained anywhere in UI | UX |
| MED-16 | Star gate requirement not communicated when player is blocked | UX |
| MED-17 | No settings panel in adventure mode (sound, music, language) | UX |
| MED-18 | Hardcoded English aria-labels in SegmentedHPBar | UX |
| MED-19 | Boss phase banner English fallbacks (BUG-008 pattern) | UX |
| MED-20 | armorPlating and timeFreeze are trap upgrades with poor gold efficiency | Balance |
| MED-21 | retainedScore (Salvage Claw) calculated but never persisted server-side | Code |
| MED-22 | XP sync fire-and-forget — can silently fail with no retry | Code |
| MED-23 | Loot persistence in after() callback — failure swallowed | Code |
| MED-24 | Weekly quest update failures swallowed | Code |
| MED-25 | Words array accepted without grid validation — cheaters can inject arbitrary words | Code |
| MED-26 | transforms.ts uses unsafe `as` casts without null checks | Code |
| MED-27 | CLEAR_ACTIVATION_EFFECTS allocates 49 objects every call on 7x7 grid | Code |
| MED-28 | AdventureGame.tsx exceeds 500-line limit (632 lines) | Code |

---

## LOW Findings (22)

| ID | Finding |
|----|---------|
| LOW-1 | Boss intro cinematic not always skippable |
| LOW-2 | WorldMap scroll-to-bottom race condition (100ms timeout) |
| LOW-3 | No gold earning hint when stuck in upgrade shop |
| LOW-4 | English in SegmentedHPBar aria-label template |
| LOW-5 | No animation speed control or skip-all |
| LOW-6 | No partial word undo (must clear and restart) |
| LOW-7 | W4-W5 difficulty valley (both 5x5, minimal change) |
| LOW-8 | All bosses follow identical 100/66/33 HP thresholds |
| LOW-9 | flash-palindrome extremely language-dependent |
| LOW-10 | collectGems/noDamage/surviveBattle/mechanicTrigger objectives never generated |
| LOW-11 | Deprecated pendingUpdate/acknowledgePersistence in useAdventureCurrency |
| LOW-12 | useShuffle requestAnimationFrame guard bypassable on slow devices |
| LOW-13 | eslint-disable for exhaustive-deps in initialState useMemo |
| LOW-14 | `as any` in updateWeeklyQuestProgress |
| LOW-15 | recordCompletion accepts `any` parameter |
| LOW-16 | `as any` widespread in test mocks (18+ instances) |
| LOW-17 | Type mismatch TODOs in 3 test files |
| LOW-18 | sendBeacon fallback has no auth — may arrive unauthenticated |
| LOW-19 | Word album read-full-array on every completion (O(n) on album size) |
| LOW-20 | timerStore sync via useEffect on every TICK |
| LOW-21 | Boss dialogue translation fallback (BUG-008) |
| LOW-22 | W10 boss fight length not communicated to player |

---

## Prioritized Sprint Plan

### Sprint 1: Critical Fixes & Security (3-4 days)

| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| 1 | CRIT-1 | Fix boss damage formula: `ceil(score/3)` + reduce boss HP (30→250) | S |
| 2 | CRIT-3 | One-line fix: `transforms.ts:27` completions parameter | XS |
| 3 | HIGH-1 | Server-side star recalculation from objective data | M |
| 4 | HIGH-10 | Remove debug error display in production | XS |
| 5 | HIGH-3 | Wire gemDetector/blastShield effects or hide from shop | M |
| 6 | HIGH-15 | Replace optimistic lock with atomic gold increment | S |
| 7 | MED-25 | Add plausible score cap per world/level | S |

### Sprint 2: Economy Rebalance (2-3 days)

| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| 8 | CRIT-2 | Add gold sinks: consumable hints, timer extensions, cosmetic tile skins | L |
| 9 | HIGH-2 | Nerf fuelTank to max +25s | S |
| 10 | HIGH-4 | Lucky Pickaxe multiplier on baseGold only | S |
| 11 | MED-1 | Scale flash rewards: `coins * (1 + worldId * 0.15)` | S |
| 12 | MED-2 | Reduce quest rewards 30%, increase base level gold | S |
| 13 | MED-3 | Lower W2 unlock to 7 stars | XS |
| 14 | MED-20 | Rebalance armorPlating (apply to non-boss damage) and timeFreeze (lower cost) | S |

### Sprint 3: UX & Onboarding (3-4 days)

| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| 15 | CRIT-6 | Interactive W1L1 tutorial with coach marks | L |
| 16 | HIGH-7 | Defeat screen: "What went wrong" panel with objective progress | M |
| 17 | HIGH-8 | World mechanic explanation overlays + score popup context | M |
| 18 | HIGH-9 | Auto-select W1 for new players | S |
| 19 | MED-15 | Combo system explainer tooltip | S |
| 20 | MED-16 | Star gate communication: "Earn X more stars to unlock" | S |
| 21 | MED-18/19 | i18n fixes: aria-labels, boss banners | S |

### Sprint 4: Boss & Content Polish (2-3 days)

| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| 22 | CRIT-4 | W10 Dragon: checkpoint every 3 phases | M |
| 23 | HIGH-5 | Boss Rush: add tiers (Easy/Hard/All), randomize, fix rewards | M |
| 24 | HIGH-6 | Activate chain/time tiles in W4+ and W7+ level configs | M |
| 25 | HIGH-16 | Add mini-boss at level 4 per world | M |
| 26 | MED-5 | Clarify speedMultiplier — make it control mechanic frequency | S |
| 27 | MED-11 | Validate quest targets vs chapter level counts | S |

### Sprint 5: Replay & Retention (4-5 days)

| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| 28 | CRIT-5 | Ascension system: 10 levels with cumulative modifiers | L |
| 29 | HIGH-12 | Upgrade specialization: cap total tiers at 30 | M |
| 30 | HIGH-13 | World Mutators (No Hints, Speed Run, Fragile) with bonus rewards | L |
| 31 | HIGH-14 | Endless mode: milestones every 5 floors, mechanic combos post-30 | M |
| 32 | MED-12 | Cosmetic loot drops in chests (tile skins, profile frames) | M |
| 33 | HIGH-11 | Locale-aware flash challenges | M |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `hooks/useAdventureWordSubmit.ts:201-206` | Boss damage formula (CRIT-1) |
| `app/api/adventure/transforms.ts:27` | Completions bug (CRIT-3) |
| `lib/adventure/upgradeConfig.ts` | All upgrade definitions and costs |
| `lib/adventure/constants.ts` | Grid sizes, timers, world unlocks |
| `lib/adventure/bossConfig.ts` | 10 boss configurations |
| `lib/adventure/lootConfig.ts` | Loot chest generation |
| `lib/adventure/flashChallengeConfig.ts` | Flash challenge pools |
| `lib/adventure/questConfig.ts` | 90 chapter quests |
| `lib/adventure/levelConfig.ts` | Level generation (tile spawning) |
| `lib/adventure/bossRush.ts` | Boss Rush (hardcoded 1-5) |
| `lib/adventure/endlessMode.ts` | Endless mode scaling |
| `app/api/adventure/complete/route.ts` | Server completion (security boundary) |
| `components/adventure/AdventureView.tsx` | Main view (debug leak, FTUE) |
| `components/adventure/AdventureGame.tsx` | Game orchestrator (632 lines) |
