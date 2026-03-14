# Adventure Mode Expert Audit — Unified Report

> **Date:** 2026-03-14
> **Agents:** Game Designer, UI/UX Designer, Code Explorer, Performance Optimizer, Growth Hacker

---

## Part 1: Critical Bugs & Broken Systems

These must be fixed before any new features. The adventure mode has significant systems that are built but **not connected**.

### 🔴 CRITICAL — Gold & XP Never Persist

- `useAdventureGameInit.ts` destructures `pendingUpdate` and `acknowledgePersistence` from both `useAdventureXp` and `useAdventureCurrency` — then **silently discards them** (not included in return object, lines 149–192)
- `userId` is hardcoded as `'temp-user-id'` (lines 75, 89)
- No `/api/adventure/gold` endpoint exists
- No `gold` or `upgrades` column in `player_progression` table
- **Result:** All gold, upgrades, and in-game XP are lost on page reload

### 🔴 CRITICAL — XP Formula Divergence

- **In-game (System B):** RuneScape formula in `shared/utils/adventureXpUtils.ts` — used by `useAdventureXp`, `useAdventureLevelCompletion`
- **Database (System A):** `N^1.5 * 100` in `constants.ts` and `049_adventure_mode.sql`
- At level 30: System A = ~164K XP, System B = ~13K XP — **12x divergence**
- `constants.ts` XP functions are dead code (only imported in tests)

### 🔴 CRITICAL — Boss Ability Registry Built But Never Queried

- `registerAllAbilities()` correctly populates the registry on mount (`useAdventureGameInit.ts:30–32`)
- 24 abilities across 10 files define `triggerCondition`, `effect`, `priority`
- **No gameplay code ever calls `abilityRegistry.get()` or `abilityRegistry.getForBoss()`**
- `useBossMechanics.ts` uses `getBossConfig()` directly, bypassing the registry entirely
- Result: Boss abilities are decorative config — none execute during fights

### 🔴 CRITICAL — Flash Challenges Never Activated

- `useFlashChallenge.ts` is fully implemented (trigger at 30% elapsed, random selection, completion monitoring)
- **Never imported by `AdventureGame.tsx` or any sub-hook**
- `FlashChallengeToast` component exists in isolation
- Result: Flash challenges are dead code

### 🟡 HIGH — World Mechanics Not Wired for Regular Levels

- 9 world mechanics declared in `WORLD_CONFIGS` (`synonymPairs`, `etymologyRoots`, `idioms`, etc.)
- **No scoring hook, reducer, or word handler reads `getWorldConfig(world).mechanic`**
- Boss twist mechanics ARE wired (via `useBossMechanics.ts` switch statement)
- Result: Regular levels in all worlds play identically — themed mechanics are config-only

### 🟡 HIGH — Skill Tree Effects Partially Unwired

- 14 skills defined, store works (localStorage), effects computed by `useSkillEffects.ts`
- **Wired:** bossDamageMultiplier, longWordDamageMultiplier, comboMultiplierBonus, powerUpCooldown, maxPowerUpSlots, hintDuration
- **NOT wired:** `ice_melt_adjacent`, `cascade_bonus_words`, `chain_duration_extend`, `rare_letter_crit` — no gameplay code reads these
- Skill tree has **no database persistence** (localStorage only)

### 🟡 HIGH — Quest System: Only World 1

- `questConfig.ts` has 6 quests, all `worldId: 1`, chapters 1–2 only
- Worlds 2–10: empty array returned silently
- Chapter mapping uses `Math.ceil(levelNumber / 5)` but actual structure is `[2, 2, 3]` — formula is wrong

### 🟢 MEDIUM — Other Issues

- `collectGems` objective type declared but never generated — dead code
- `CinematicErrorBoundary` retry has no attempt limit — infinite loop on deterministic errors
- DB schema missing columns: gold, upgrades, skill_points, skill_tree, quest_progress, flash_challenge_progress

---

## Part 2: Performance Issues

### 🔴 HIGH — Bundle & Loading

| Issue | File | Impact |
|-------|------|--------|
| Remotion statically imported — ships in adventure chunk | `AdventureGame.tsx:28–29` | ~300KB+ unnecessary download |
| All 3 view states (WorldMap, LevelGrid, AdventureGame) bundled together | `AdventureView.tsx:19–22` | Map viewers download game code |
| All 10 world themes eagerly loaded via barrel export | `themes/index.ts` | Every world's config loaded upfront |
| `@remotion/player` downloaded on mobile even though it renders fallback | `CinematicPlayer.tsx:231` | Wasted bandwidth on mobile |

### 🔴 HIGH — Rendering Hot Paths

| Issue | File | Impact |
|-------|------|--------|
| `useParallax` drives React state updates at 60fps via `forceUpdate` | `useParallax.ts:95–119` | All WorldNodes + backgrounds re-render every frame |
| 4× `blur(100–120px)` nebula divs always rendered | `WorldMapBackground.tsx:41–100` | GPU-pegging on older Android |
| `layoutId` on every tile triggers full layout measurement on 7×7 grid | `AdventureTile.tsx:115` | 49 synchronous DOM reads per layout change |
| LevelGrid parallax layers cause React re-render per frame | `LevelGrid.tsx:137–140` | Same root cause as useParallax |
| 60 simultaneous spring animations on LevelGrid mount (20 levels × 3 stars) | `LevelGrid.tsx:369–385` | 1.2s of animation engine activity |
| Gyroscope handler fires at 60Hz without throttle | `useParallax.ts:144–155` | Highest-frequency render trigger on mobile |

### 🟡 MEDIUM — Rendering

| Issue | File |
|-------|------|
| Double `drop-shadow` + `blur(14px)` glow on 10 world nodes | `WorldMap.tsx:116–128` |
| 9 simultaneous SMIL `<animateMotion>` trail dots | `WorldMapDecorations.tsx:171–189` |
| Per-particle SVG `feGaussianBlur` (10 crystals) | `WorldParticles.tsx:144–155` |
| `levels` array computed without `useMemo` | `LevelGrid.tsx:68–87` |
| `WorldNode` not memoized — re-renders 10× per frame | `WorldMap.tsx:48` |
| Untracked `setTimeout` in boss orchestration | `useAdventureBossOrchestration.ts:83` |
| Monolithic `ProgressionContext` re-renders all consumers | `ProgressionContext.tsx:396–425` |

---

## Part 3: UX/UI Improvements — Making It Feel Like an Adventure

### P1 — Quick Wins (1-line to small fixes)

1. **Fix trail dot direction** — `keyPoints="1;0"` → `"0;1"` in `WorldMapDecorations.tsx` (dot travels backward)
2. **Gate star animation on `isNewCompletion`** — currently replays for old completions every mount, training players to ignore it
3. **Player "You Are Here" pin** — 48×48 avatar circle floating above current world node with idle breathing animation
4. **Jump-to-my-world FAB** — 56×56 `neo-yellow` circle, appears when scrolled away from current world, smooth-scrolls back

### P2 — Core Emotional Moments

5. **Level Complete Reveal overlay** — 3-second sequence: stars flip via `rotateY` coin-flip, XP bar ticks up with bounce spring, auto-advances
6. **Boss phase change drama** — freeze timer 1.5s, screen flash, HP bar color transition, taunt dialogue bubble
7. **Fog of war** — worlds 2+ steps ahead get `blur-md` dark overlay with 15% color bleed; next locked world gets shimmer sweep
8. **Haptic feedback hook** — `tap()` 8ms, `success()` pattern, `error()` pattern on key interactions

### P3 — Progression Visibility

9. **5-tier avatar frames** by player level (1-9 plain → 40-50 animated gradient) — visible on map pin, HUD, profile
10. **World completion power rings** — orbiting colored ring per completed world added to map pin
11. **Between-level story beats** — `StoryBeatCard` after levels 2, 4, 6, post-boss with world character dialogue
12. **Next level preview card** — slides in after completion, shows grid size + objectives, play button after 1.5s

### P4 — Premium Feel

13. **Boss defeat slow-mo** — white flash, CSS `animation-play-rate: 0.25` for 600ms, boss shatters via `clip-path`, then Remotion cinematic
14. **Boss arena transition** — screen wipe, arena floor sweep, boss drops with spring + screen shake
15. **Boss rage state (< 20% HP)** — persistent red vignette, tile red tint pulse, heat shimmer filter
16. **Loading anticipation screen** — world-themed placeholder grid, tiles drop in one-by-one, random word-game tip

---

## Part 4: Upgrade Game & Progression Overhaul

### Sprint 1 — Low Effort, High Impact (foundation)

#### A. World Mastery Stars (Impact: 5, Effort: 2)
Each world gets a 0–5 mastery track earned by: 3-starring all levels, completing chapter quests, boss secondary objectives, finding hidden words, completing on Hard. Rewards: avatar frames, world-exclusive items, titles, Gold chests, grid theme cosmetics. Pure function over existing data — no new gameplay mechanics needed.

#### B. Quest System for All 10 Worlds (Impact: 4, Effort: 2)
Expand `ChapterQuestType` with world-mechanic-aware types (`useWorldMechanic`, `noDamageBoss`, `hiddenWordStreak`, `starStreak`, `flashChallengeWins`, `bombChainReaction`, `rainbowWordBonus`). 30 total quests (3 per world) that teach each world's unique mechanic through challenge framing.

#### C. Loot Chest on Level Complete (Impact: 4, Effort: 2)
Replace flat Gold reward with chest reveal animation dropping: Gold, XP, 0–1 Rune Fragment (guaranteed on 3-star), 0–1 Lore Scroll (60 total collectibles, one per non-boss level). Scrolls displayed in "Lexicon Archive" — a visual bookshelf that fills in. Reuse `VictoryCinematic.tsx` variant + `AchievementCard.tsx` layout.

#### D. Flash Challenge Expansion: 5 → 30 Variants (Impact: 3, Effort: 2)
Add word-pattern types (`palindrome`, `allVowels`, `doubleLetters`, `startsWith`, `endsWith`), board-state types (`useGoldTile`, `clearIceTile`, `useBombTile`), performance types (`scoreInSeconds`, `findWordInRow`, `exactLength`). **But first: actually wire `useFlashChallenge` into `AdventureGame`.**

### Sprint 2 — Medium Effort, High Impact (upgrade feel)

#### E. Rune System — Equippable Modifiers (Impact: 5, Effort: 3)
3 rune slots (Tile, Word, Battle) replacing/augmenting the flat time/score/xp upgrades. ~15 runes total with real strategic tradeoffs:
- **Tile Runes:** Gold Amplifier (4× gold tiles), Ice Breaker (adjacent clear), Bomb Chain (row+column), Rainbow Anchor (retains letter)
- **Word Runes:** Linguist (+20% 7+ letters), Speed Demon (time bonus for fast words), Palindrome Blessing (free multiplier)
- **Battle Runes:** Shield (1 free HP), Fury (+10% escalating damage), Silence (boss mechanic -30%)

Players choose a loadout before each world — different builds, different strategies. This is the core "upgrade game" feel.

#### F. Visible Power Growth (Impact: 5, Effort: 3)
Three layers so World 10 players *feel* powerful:
1. **Tile Mastery Aura** — CSS variable `--mastery-level` scales grid glow effects by player level
2. **Combo Ceiling Scaling** — max combo multiplier grows with level (3× at L1-10 → 12× at L41-50)
3. **Power Rating for Boss Damage** — `(playerLevel × 10) + (skillPoints × 5) + (runeBonus)` applies damage multiplier (1× to 1.8× cap)

#### G. Economy Overhaul (Impact: 4, Effort: 3)
Add meaningful Gold sinks: Rune crafting (800–5000g), Weekly Star Chest (500g for 3 rune fragments — gacha-lite catch-up), Retry Shield (50g for +15s after 3+ failures), Grid theme cosmetics (1200g). Calibrated so 70-level playthrough earns ~30K Gold, max upgrades + 3 runes costs ~18K, rest fuels weekly sinks.

### Sprint 3 — Higher Effort, Long-tail Retention

#### H. Prestige / Lexicon Ascension (Impact: 5, Effort: 4)
After defeating World 10 boss, unlock New Game+ with persistent power:
- **Resets:** Level completions, Gold balance (converts to Prestige Tokens at 10:1), flash progress
- **Keeps:** Player level, skill tree, rune collection, cosmetics, mastery
- 5 Ascension ranks, each adding a board modifier (compound tiles → cursed tiles → auto-rune activation → word-length-based boss damage → roguelite level shuffle)

---

## Part 5: Engagement & Retention Framework

### Daily Hooks (implement in order)
1. **Daily Adventure Quests** — 3 per day, scoped to unlocked worlds, completable in one session
2. **Daily Boss Rush** — random previously-defeated boss, half time, leaderboard-scored
3. **Adventure Streak** — independent from global, milestones at 3/7/14/30 days with escalating rewards
4. **Weekly World Event** — one world gets a modifier (Vowel Drought, Speed Round, No Repeats)

### Social Hooks
- **Friend ghost avatars** on world map at their furthest world
- **Boss time leaderboards** (global top 10, friends, your rank)
- **Shared achievement chains** ("You and a friend both defeat World 5 boss this week")

### Anti-Churn Interventions
- **World transition starter packs** — free power-ups on first entry to new worlds
- **Bonus stages** between levels 3–4 of every world (shorter, easier, 1.5× Gold)
- **Boss Intel screen** on first failure (not "You Failed") — shows weak points, suggested loadout
- **Star Recovery challenges** — harder variants of completed levels that award bonus stars for stuck players
- **Dynamic Difficulty Adjustment** — Practice Mode after 3 consecutive failures (+20% time, no star reward)

### Session Design
- Target: 12–18 min, 3–4 levels per session
- **Momentum Meter** — visible bar filling with consecutive completions, +15% XP at 3 levels, resets on quit
- **Boss Anticipation** — "Boss incoming" banner two levels before every boss
- **Incomplete Star Hook** — session-end screen shows gap to next star with prominent "Retry" CTA

### Content Pacing (making 70 levels feel like 200)
- **Procedural Endless levels** — unlock per-world after completing all 7, daily seed, leaderboard-scored
- **Weekly rotating modifiers** — 2–3 worlds get rule changes each week
- **Master Challenges** — 3-level sequences for players who 3-starred everything
- **Seasonal world visual reskins** — 4× per year, same mechanics, fresh aesthetics

### Cross-Mode Synergy
- Adventure worlds unlock themed daily challenge variants
- Boss completion unlocks Word Hunt hint tokens
- World completion unlocks multiplayer table themes
- "Versatile" daily bonus: +25% XP for playing adventure + any other mode

### Target Metrics

| Metric | Target | Churn Signal |
|--------|--------|-------------|
| D1 adventure retention | 65% | < 50% |
| D7 adventure retention | 35% | < 25% |
| D30 adventure retention | 18% | < 12% |
| Session length P50 | 14 min | < 8 min |
| Levels per session | 3.4 | < 2.0 |
| Boss first-attempt failure | < 65% | > 80% |
| Daily quest completion | > 40% | < 25% |

---

## Implementation Priority Roadmap

| Phase | What | Timeline |
|-------|------|----------|
| **Phase 0: Fix Broken** | Wire gold/XP persistence, fix XP formula divergence, wire boss ability registry, connect flash challenges, fix quest chapter mapping | Week 1–2 |
| **Phase 1: Performance** | Dynamic imports (Remotion, views, themes), fix useParallax (MotionValue), memo WorldNode, remove nebula blur, useMemo LevelGrid | Week 2–3 |
| **Phase 2: Foundation** | World Mastery, quests all 10 worlds, loot chests, flash challenge expansion, world mechanics scoring | Week 3–5 |
| **Phase 3: Upgrade Feel** | Rune system, visible power growth, economy overhaul, upgrade shop UI | Week 5–8 |
| **Phase 4: UX Polish** | Level complete reveal, boss atmosphere, fog of war, haptics, between-level flow, story beats | Week 8–10 |
| **Phase 5: Engagement** | Daily quests, boss rush, adventure streak, social hooks, anti-churn interventions | Week 10–13 |
| **Phase 6: Endgame** | Prestige/Ascension, procedural endless, weekly modifiers, cross-mode synergy | Week 13–16 |

---

## Individual Audit Reports

- UX/UI audit saved at: `docs/audits/adventure-ux-audit.md`
- Full agent transcripts available in `/private/tmp/claude-501/` task outputs
