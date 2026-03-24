# Adventure Mode Full Audit — 2026-03-24

**6-Expert Panel**: Game Design, Code Quality, UX/Accessibility, Backend Security, Engagement/Retention, Test Coverage
**Scope**: 40+ components, 21 hooks, 30 lib files, 8 API routes, 169 test files, 8 DB tables
**Total Findings**: 176 (21 CRIT, 51 HIGH, 63 MED, 41 LOW)

---

## Severity Summary

| Expert | CRIT | HIGH | MED | LOW | Total |
|--------|------|------|-----|-----|-------|
| Game Design | 6 | 14 | 18 | 9 | 47 |
| Code Quality & Performance | 3 | 9 | 11 | 5 | 28 |
| UX & Accessibility | 3 | 10 | 16 | 9 | 38 |
| Backend Security | 3 | 4 | 5 | 4 | 16 |
| Engagement & Retention | 3 | 7 | 7 | 4 | 21 |
| Test Coverage | 3 | 5 | 6 | 3 | 17 |
| i18n & RTL | 0 | 2 | 1 | 1 | 4 |
| **TOTAL** | **21** | **51** | **63** | **41** | **176** |

---

## CRITICAL FINDINGS (21)

### Backend Security (3)
| # | Issue | File | Fix |
|---|-------|------|-----|
| SEC-1 | Gold farming via concurrent `/complete` requests — read-then-write race doubles gold | `api/adventure/complete/route.ts:162-300` | Use optimistic lock `.eq('gold', currentGold)` or atomic RPC |
| SEC-2 | No level-unlock validation — can complete World 10 from World 1 | `api/adventure/complete/route.ts:105-151` | Validate `world <= current_world` before processing |
| SEC-3 | Milestone double-claim race condition — concurrent requests both award gold | `api/adventure/claim-milestone/route.ts:59-96` | Add optimistic lock on gold + claimed array |

### Game Design (6)
| # | Issue | File | Fix |
|---|-------|------|-----|
| GD-1 | `isBossLevel` checks level 5 AND 7 — level 5 incorrectly gets boss loot every world | `lib/adventure/lootConfig.ts:44-58` | Change to `levelNumber === 7` only |
| GD-2 | Gold income vs upgrade costs severely mismatched — catch-22 in Worlds 6-8 | `upgradeConfig.ts` + `lootConfig.ts` | Scale gold formula: `(10 + worldId * 5) * stars` |
| GD-3 | World 10 unlock requires only 45 stars — achievable after World 2, bypasses Worlds 3-9 | `constants.ts:261-267` | Require World 9 completion for World 10 access |
| GD-4 | Prestige multipliers don't stack — each rank replaces previous instead of accumulating | `prestigeSystem.ts:102-113` | Accumulate: `slice(0, level).reduce(sum + bonus)` |
| GD-5 | Boss Rush hardcoded to bosses 1-5 only, zero replayability | `bossRush.ts:22-29` | Randomize from all 10, add difficulty tiers |
| GD-6 | Daily quests share identical title keys; weekly timer shows "7 days" on Mondays | `dailyQuests.ts:17-33` | Unique title keys per difficulty variant |

### Code Quality (3)
| # | Issue | File | Fix |
|---|-------|------|-----|
| CQ-1 | AdventureGame.tsx is 539-line god orchestrator with 20+ hooks | `AdventureGame.tsx:1-539` | Split into sub-orchestrators (<300 LOC each) |
| CQ-2 | `earnedGold` race: eager DB save reads gold before it's set in same render cycle | `useAdventureLevelCompletion.ts:296-303` | Compute gold inline in save effect, not from state |
| CQ-3 | `tilesRef` in useCascadeLoop is never assigned — gravity/spawn logic is a no-op | `useCascadeLoop.ts:285-287` | Either wire tiles into ref or remove dead gravity code |

### UX & Accessibility (3)
| # | Issue | File | Fix |
|---|-------|------|-----|
| UX-1 | No exit confirmation — stray tap exits game and loses all progress | `ui/GameHeader.tsx:180-194` | Add confirmation modal before exit |
| UX-2 | "All Objectives Complete!" is hardcoded English, not using t() | `hud/ObjectiveProgress.tsx:133` | Replace with `t('adventure.game.allObjectivesComplete')` |
| UX-3 | AdventureGrid `aria-label="Adventure game board"` is hardcoded English | `AdventureGrid.tsx:381` | Use `t('adventure.grid.ariaLabel')` |

### Engagement (3)
| # | Issue | File | Fix |
|---|-------|------|-----|
| ENG-1 | No streak protection — missing 1 day resets entire streak permanently | `adventureStreak.ts:41-46` | Add 36h grace period + 1 free freeze/week |
| ENG-2 | No FTUE/tutorial — new players land on overwhelming hub with zero guidance | `AdventureHub.tsx` | Auto-start W1L1 on first visit, coach marks after |
| ENG-3 | Prestige requires 70/70 level completion — only ~5% of players will ever reach it | `prestigeSystem.ts:122-133` | Add soft prestige at 80% + per-world micro-prestige |

### Test Coverage (3)
| # | Issue | File | Fix |
|---|-------|------|-----|
| TST-1 | 5 of 8 API routes have ZERO tests (attempt, weekly, state, quest-progress, milestone) | Missing test files | Write auth, validation, happy path, error tests |
| TST-2 | Reducer test covers only 3 of 13 action types | `adventureGameReducer.test.ts` | Add tests for TICK, ACTIVATE_TIME_FREEZE, USE_SHUFFLE, etc. |
| TST-3 | No test for 409 optimistic lock conflict on purchase | `purchase/__tests__/route.test.ts` | Test concurrent-purchase rejection path |

---

## HIGH FINDINGS (51)

### Backend Security (4)
- No upper bound on score — clients can send `score: 2147483647`
- Weekly challenge score TOCTOU race — lower score can overwrite higher
- Quest progress has no key count limit — unbounded JSONB growth
- No rate limiting on 3 of 8 endpoints (progress GET, state GET, attempt POST)

### Game Design (14)
- fuelTank + rune stacking gives 215s vs 160s designed timer — trivializes endgame
- Ice tile count (8) vs clearIce objective (2) completely disconnected
- Lexicon Dragon has 9 phases in 135s with zero on-ramp for first-timers
- All 6 runes cost same (3 fragments), dominant selection, 52 fragments wasted
- levelVariety.ts covers only Worlds 1-3 — 71% of game has no visual variety
- Mastery criteria accept global counts instead of world-scoped — trivially satisfied
- bossHighHealth quests appear in Chapter 1 before boss is reachable (Chapter 3)
- World 2 synonym mechanic is asymmetric — "run" after "running" fails but reverse works
- Loot chest 2-star bonus uses deterministic seed — no variable ratio reinforcement
- Boss phase 3 damage multipliers don't escalate across worlds (Boss 1 ≈ Boss 9)
- Endless mode word count objective becomes mathematically impossible after floor ~15
- Cross-mode synergy gives only +5% XP — too weak to motivate
- Score target formula caps at 1500 for all late worlds — identical gates
- Boss 8 (Cosmic Wordsmith) supernova letters Q/X/Z may not exist in grid

### Code Quality (9)
- ProgressionContext is monolithic — any mutation re-renders entire component tree
- SUBMIT_WORD mutates tiles in place on potentially shared (non-cloned) rows
- effectiveComboTimeout recomputes outside useMemo on every render
- prefersReducedMotion read once at init, never re-evaluated in useCascadeLoop
- No timeout on dictionary API fetch — game freezes if API hangs
- attempt/route.ts and progress/route.ts use `!` assertion on env vars at module scope
- Dead code: getRandomLetter + LETTER_FREQUENCY never called in useCascadeLoop
- timeRemaining in AdventureGame defeats timerStore optimization — re-renders every second
- adventureGameReducer is 723 lines (exceeds 500-line limit)

### UX & Accessibility (10)
- No aria-live on boss HP changes — screen readers get no battle feedback
- No keyboard navigation for game grid tiles — completely inaccessible
- AdventureHub stat pills have no aria-labels
- LevelCompleteModal backdrop doesn't dismiss on click
- 6 infinite `repeat: Infinity` animations in boss UI have no prefers-reduced-motion gate
- WorldMap pulsing rings and crown float also lack motion safety

### Engagement (7)
- Daily quests have no expiry countdown or "all complete" bonus
- No "just one more level" hooks at level complete
- Loot system is almost entirely deterministic — no rare drops or jackpots
- No XP progress bar on AdventureHub (component exists but not mounted)
- Endless mode unlocks too late (requires all 10 worlds) and has no persistence
- Social sharing is boss-only — no sharing for world completion, milestones, etc.
- Failed level shows no near-miss feedback ("You were 5 points away!")

### Test Coverage (5)
- 3 component hooks have zero tests (GridInteraction, QuestTracking, GameCallbacks)
- 3 test files use @ts-nocheck — mocks may be stale/incorrect
- Integration test is shallow — does NOT exercise full game loop
- Boss fight edge cases untested (1 HP, phase transition mid-word, timer + defeat race)
- Rate limiting always mocked to allow — 429 path never tested

---

## MEDIUM FINDINGS (63)

### Backend (5)
- Non-atomic progression update — partial failure leaves inconsistent state
- Service role client bypasses RLS everywhere — no defense-in-depth
- NaN/Infinity pass validation in quest-progress (typeof NaN === 'number')
- Inconsistent level range: attempt says 1-7, complete says 1-10
- Gold column missing causes silent gold loss (UI shows gold that vanishes on refresh)

### Game Design (18)
- Captain Metaphor (W4) phase 3 has highest damage of ANY boss — difficulty spike
- timeFreeze is strictly worse than fuelTank at higher cost — no reason to buy
- Word album gap 500→1000 is ~50 levels with no intermediate reward
- World 9 timer (170s) jumps +35s from World 8 (135s) — jarring
- World 10 Chapter 1 quest requires 3 perfect levels but chapter has only 2 levels
- World 6 Chapter 3 requires 8 flash challenges but max possible is ~6
- Boss 9 loanwordBonusMultiplier (1.5) disconnected from worldMechanics evaluator (1.35)
- Duplicate fallback: when grid can't support long words, secondary becomes wordCount = same as primary
- Breather at level 5 is too close to boss at level 7 — reduces pre-boss tension
- Skill tree types exist but no config/content — dead system consuming skill points
- Boss Rush rune fragment rewards are worthless to endgame players (all runes already forged)
- Weekly challenge fixed at 5x5/120s — trivial for veterans, impossible for newcomers
- Flash challenge palindrome appears in 3 of 5 difficulty tiers — palindrome fatigue
- Prestige quest reset forces replaying 90 identical quests per prestige run
- Endless mode boss floors flagged but no boss content exists
- World 1 upgradeConfig has levels 8-10 defined but worlds only have 7 levels — dead config
- Flash challenge `specificLetter` only targets Q — rarest letter, almost always fails
- Endless mode variety exhausted by floor 40 (8 mechanics cycle × 5 mini-events)

### Code Quality (11)
- 3 uses of `any` type in hooks (showWorldUnlock, storyBeat, recordCompletion)
- Stale closure risk in useAdventureSelection setTimeout
- AdventureView preloads game chunk during hub browsing (wasted bandwidth)
- WorldMap: masteryTiers prop passed but never used
- AdventureHub: onBossRush and hasBossDefeat props declared but never used
- Boss orchestration setTimeout has no cleanup on unmount
- No rate limiting on attempt POST or progress GET endpoints
- adventureGameReducer SUBMIT_WORD case is ~190 lines — needs extraction
- O(n*m) adjacency scan in useAdventureSelection on every selection change
- handleBossIntroSkip identical to handleBossIntroStart — dead duplication
- masteryTiers computation iterates all worlds × completions without grouping

### UX & Accessibility (16)
- TileBadge positions use `-right-1` without RTL flip
- AdventureHub daily quest bars lack progressbar role/aria attributes
- QuestCard has no accessible name or role
- GameSidebar mobile objectives have no group label
- CurrencyDisplay coin emoji aria-label is hardcoded English
- PremiumCard acts as button but has no role/tabIndex/keyboard handler
- No loading state for level grid during data fetch
- No error state in AdventureGame for API failures beyond config validation
- ComboMilestoneOverlay has no aria announcement
- GameHeader score uses pointer-events-none + 10px text (below minimum readable)
- BossDialogue legacy component blocks gameplay area with no dismiss mechanism
- PowerUpBar bottom positioning may overlap device home indicator
- Multiple z-index layers compete (z-20 to z-50) with no centralized system
- WorldMap auto-scroll uses smooth animation (confusing for first-time users)
- EnhancedTimer has no role="timer" or aria-live
- PremiumCard 3D tilt interpolates MotionValue objects as strings — broken

### Engagement (7)
- Weekly modifiers not visible in hub — variety system is invisible
- No session timer or session summary on exit
- Word album milestone gaps too large (500→1000 = ~50 levels)
- Boss Rush is static and short — always bosses 1-5 in order
- Rune system maxes with only 18 of 70 possible fragments — too shallow
- Upgrade costs may create early-game gold drought for newcomers
- No push notifications for adventure-specific events (streak at risk, quest reset)

### Test Coverage (6)
- entry-timing test checks constants not behavior — breaks on config tweaks
- cascade test over-mocks 8+ hooks with potentially stale shapes
- Timer tests lack cleanup assertions (interval leak prevention)
- No test for MAX_TIMER_SECONDS cap in ADD_TIME
- No test for duplicate word rejection in SUBMIT_WORD
- No cascade physics edge cases tested (fully cleared grid, all-ice, infinite loop)

---

## LOW FINDINGS (41)

See individual expert reports for full details. Key items:
- Dead code: unused imports, getRandomLetter, duplicate handlers
- Stale comments (World 10 "needs 80 stars" comment says 45)
- deepDrill T2-T4 all have identical value:1 — likely config error
- Prestige titles null for ranks 1-2 — early prestige feels unrewarded
- Theme tests check CSS class names (fragile)
- In-memory rate limiting bypassed on serverless (different instances)
- Test organization inconsistency (useAdventureAchievements not in __tests__)
- No shared test fixtures — mock factories duplicated across 10+ files

---

## ENGAGEMENT SCORECARD

**Current Score: 6.5/10**

### Top 5 Quick Wins
| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Streak grace period (36h instead of 24h) | 30 min | D7 +10% |
| 2 | Mount XP progress bar in AdventureHub | 1 hr | D7 +5% |
| 3 | Near-miss framing on failure ("X points away!") | 2 hr | D1 +8% |
| 4 | "All 3 quests complete" daily bonus | 1 hr | D7 +5% |
| 5 | Show weekly modifiers in hub | 2 hr | D7 +4% |

### Retention Risk Map
| Segment | Risk | Why |
|---------|------|-----|
| Day 1 new players | CRITICAL | No FTUE, overwhelming hub |
| Day 3-7 casuals | HIGH | Streak loss permanent, gold drought |
| Week 2-4 mid-core | MEDIUM | Difficulty spike W4-7, no adaptive |
| Month 1+ completionists | HIGH | 70-level prestige gate, endless locked |
| Month 2+ hardcore | MEDIUM | Rune system maxes quickly |
| Non-English speakers | MEDIUM | Flash challenge pool shrinks |

---

## TEST COVERAGE SUMMARY

| Subsystem | Coverage | Grade |
|-----------|----------|-------|
| Components | ~80% | B+ |
| Hooks (main) | ~85% | A- |
| Hooks (component) | ~65% | C+ |
| Lib utilities | ~90% | A |
| API Routes | **37%** | **F** |
| Contexts | ~70% | B- |
| Reducer | ~60% | C |

---

## RECOMMENDED SPRINT ORDER

### Sprint 1: Security & Economy (CRITICAL)
1. SEC-2: Level-unlock validation (1 line)
2. SEC-1: Atomic gold update in /complete (RPC)
3. SEC-3: Milestone optimistic lock
4. GD-1: Fix isBossLevel (1 line)
5. GD-4: Fix prestige multiplier accumulation (5 lines)
6. GD-3: World 10 unlock requires World 9

### Sprint 2: Player Safety & UX (CRITICAL/HIGH)
1. UX-1: Exit confirmation dialog
2. UX-2 + UX-3: Fix hardcoded strings
3. CQ-2: Fix earnedGold race condition
4. ENG-1: Streak grace period + freeze
5. 6× motion safety fixes (boss UI reduced-motion gates)
6. Add rate limiting to 3 unprotected endpoints

### Sprint 3: Engagement Quick Wins (HIGH)
1. ENG-2: FTUE tutorial (auto-start W1L1)
2. Mount XP bar in AdventureHub
3. Near-miss failure feedback
4. Daily quest bonus + countdown timer
5. Show weekly modifiers in hub
6. Social sharing for world completion + milestones

### Sprint 4: Game Balance (HIGH)
1. Scale gold formula by world
2. Cap fuelTank time bonus effectiveness
3. Complete levelVariety.ts for Worlds 4-10
4. Fix impossible quests (W10 perfectLevels, W6 flashChallenge)
5. Boss damage escalation across worlds
6. Endless mode word count cap

### Sprint 5: Test Coverage & Code Quality (HIGH)
1. Write tests for 5 untested API routes
2. Expand reducer tests to all 13 action types
3. Split AdventureGame.tsx into sub-orchestrators
4. Split ProgressionContext into data + actions
5. Fix tilesRef in useCascadeLoop
6. Remove dead code (getRandomLetter, duplicate handlers)
