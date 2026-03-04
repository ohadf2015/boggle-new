# Roadmap: LexiClash

## Milestones

- ✅ **v1.0 Foundation & Game Modes** - Phases 1-35 (shipped pre-2026-02-13)
- ✅ **v2.0 Education 2.0** - Phases 36-45 (shipped 2026-02-14)
- 🚧 **v3.0 Blast Mode Special Tiles Redesign** - Phases 46-52 (in progress)

## Phases

<details>
<summary>✅ v1.0 Foundation & Game Modes (Phases 1-35) - SHIPPED pre-2026-02-13</summary>

Core game engine, multiplayer, adventure mode, blast mode, achievements, XP/leveling,
Remotion cinematics, education platform, daily challenges, power-ups, skill tree research.
Last phase: 35.

</details>

<details>
<summary>✅ v2.0 Education 2.0 (Phases 36-45) - SHIPPED 2026-02-14</summary>

- Phase 36: Foundation & Refactoring (5 plans)
- Phase 37: Practice Modes (6 plans)
- Phase 38: Async Duels (8 plans)
- Phase 39: Real-Time Duels (5 plans)
- Phase 40: Gamification Enhancements (7 plans)
- Phase 41: Student Dashboard Overhaul (4 plans)
- Phase 42: Teacher Dashboard & Workflows (5 plans)
- Phase 43: Practice Experience & Design Polish (4 plans)
- Phase 44: Milestone Gap Closure & Tech Debt (1 plan)
- Phase 45: Practice XP Server-Side Wiring (1 plan)

</details>

---

### 🚧 v3.0 Blast Mode Special Tiles Redesign (In Progress)

**Milestone Goal:** Rework the Blast mode special tile system to maximize player engagement and "one more game" addiction through a complete combination matrix, tile reworks, psychological hooks, and bug fixes.

#### Phase 46: Foundation — Unified Tile Types & Bug Fixes
**Goal**: The tile system has a single shared type definition and all known bugs are eliminated, giving new work a stable foundation to build on.
**Depends on**: Phase 45 (v2.0 complete)
**Requirements**: TILE-08, BUGF-01, BUGF-02, BUGF-03, BUGF-04, BUGF-05, BUGF-06, BUGF-07, BUGF-08, BUGF-09
**Success Criteria** (what must be TRUE):
  1. Singleplayer and multiplayer Blast games use the same `BlastTileType` enum — no divergent type definitions exist in the codebase
  2. Lightning column-clear correctly triggers bombs in its path (chain detonation visible in play)
  3. Prism cross-clear correctly triggers lightning tiles it passes through
  4. Double-bomb words no longer inflate scores from BFS race condition
  5. Cascade correctly re-forms and re-scores vertical words after gravity (dedup bug gone)
**Plans**: 4 plans

Plans:
- [x] 46-01-PLAN.md — Unify BlastTileType enum into shared/types/blast.ts and migrate all consumers (Wave 1)
- [x] 46-02-PLAN.md — Fix chain propagation bugs (BUGF-01, BUGF-02) — lightning↔bomb and prism↔lightning (Wave 2)
- [x] 46-03-PLAN.md — Fix state and scoring bugs (BUGF-03, BUGF-04, BUGF-05, BUGF-06, BUGF-07) (Wave 3)
- [x] 46-04-PLAN.md — Fix objective guarantee bugs (BUGF-08, BUGF-09) — clustering and minimum ratio (Wave 2)

#### Phase 47: Tile Reworks — New Behaviors & Spawn Tables
**Goal**: All four reworked tiles (Rainbow Boost, Treasure Gem, Vortex, Frost), the new Mirror tile, Wildcard removal, gold tier system, and updated spawn tables are live in singleplayer Blast.
**Depends on**: Phase 46
**Requirements**: TILE-01, TILE-02, TILE-03, TILE-04, TILE-05, TILE-06, TILE-07, TILE-09
**Success Criteria** (what must be TRUE):
  1. Rainbow Boost in a word copies and doubles the best other special in that word; alone it doubles word score
  2. Treasure Gem visibly accumulates shards (3 hits) and on completion spawns 2 random specials with a +25 bonus
  3. Vortex pulls nearby tiles toward it and then explodes, visibly rearranging the board
  4. Frost tile cracks on first hit revealing the inner tile type, then frees and activates that tile on second hit
  5. Mirror doubles the partnered special's effect; Wildcard never appears on the board; Silver/Gold/Diamond tier multipliers apply correctly
**Plans**: 5 plans

Plans:
- [x] 47-01-PLAN.md — Rainbow Boost rework: amplify best special or 2x word score (TILE-01) (Wave 1)
- [ ] 47-02-PLAN.md — Treasure Gem shard collector: 3-hit accumulation, +25 bonus, spawn 2 specials (TILE-02) (Wave 2)
- [ ] 47-03-PLAN.md — Vortex pull+explode and Frost 2-hit reveal with inner special activation (TILE-03, TILE-04) (Wave 3)
- [ ] 47-04-PLAN.md — Mirror tile, Wildcard removal, Silver/Gold/Diamond tier system (TILE-05, TILE-06, TILE-07) (Wave 4)
- [ ] 47-05-PLAN.md — Updated spawn distribution tables for all waves with new tile unlock progression (TILE-09) (Wave 5)

#### Phase 48: Combination System Core — Detection, Matrix, and Effects
**Goal**: Any word containing two or more special tiles triggers a unique synergy effect from the full 28-pair combination matrix, with visuals and audio clearly distinguishing combinations from individual tile clears.
**Depends on**: Phase 47
**Requirements**: COMB-01, COMB-02, COMB-03
**Success Criteria** (what must be TRUE):
  1. Submitting a word with 2+ special tiles always triggers a combination effect (no silent misses)
  2. All 28 tile pairs produce distinct, named effects — no two pairs produce identical outcomes
  3. Combination clears visually exceed individual tile clears (larger particles, screen flash, distinct audio sting)
**Plans**: TBD

Plans:
- [ ] 48-01: Build combination detection system — scan word path, identify special pairs, dispatch synergy (COMB-01)
- [ ] 48-02: Implement combination matrix Part 1 — pairs involving Bomb, Lightning, Prism, Rainbow Boost (COMB-02)
- [ ] 48-03: Implement combination matrix Part 2 — pairs involving Vortex, Frost, Mirror, Treasure Gem, Gold tiers (COMB-02)
- [ ] 48-04: Implement combination visual/audio layer — particles, screen effects, audio stings (COMB-03)

#### Phase 49: Combination UX — Discovery, Codex, Scaling, Translations
**Goal**: Players are rewarded for discovering new combinations with a dramatic first-time callout, can browse their discovery progress in the Combo Codex, receive stronger effects for longer words, and all combination text is translated.
**Depends on**: Phase 48
**Requirements**: COMB-04, COMB-05, COMB-06, COMB-07
**Success Criteria** (what must be TRUE):
  1. First time a combination fires, gameplay briefly freezes and a "COMBO DISCOVERED: [name]!" banner appears with unique icon
  2. The Combo Codex screen is accessible from the Blast mode menu and shows discovered vs. total combinations (e.g., "12/28")
  3. A 7+ letter word containing a special tile produces a visibly stronger effect than a 3-letter word with the same tile
  4. Combination names and "COMBO DISCOVERED" banner text display correctly in Hebrew, Swedish, and Japanese
**Plans**: TBD

Plans:
- [ ] 49-01: Build combo discovery callout — 300ms freeze, banner, first-discovery persistence (COMB-04)
- [ ] 49-02: Build Combo Codex screen — grid of 28 combos, discovered/undiscovered states, accessible from menu (COMB-05)
- [ ] 49-03: Implement word-length scaling for tile effects — 1.0x / 1.5x / 2.0x thresholds (COMB-06)
- [ ] 49-04: Add combination names and descriptions to all 4 language translation files (COMB-07)

#### Phase 50: Psychological Hooks — Addiction Layer
**Goal**: The four psychological engagement mechanics (cascade chain counter, near-miss shimmer, Sugar Crush end sequence, invisible difficulty assist) are all active, making every game session feel dynamic and "almost" achievable.
**Depends on**: Phase 49
**Requirements**: PSYC-01, PSYC-02, PSYC-03, PSYC-04
**Success Criteria** (what must be TRUE):
  1. Cascades display an escalating "CHAIN x2, CHAIN x3..." counter with color progression from white to rainbow
  2. After submitting a word that misses a nearby combo or cascade opportunity, 2-3 tiles briefly pulse to hint at the missed potential
  3. When moves run out, remaining tiles convert to specials and fire in sequence with escalating intensity before the results screen
  4. After 3+ failed words the board spawns noticeably more special tiles; after a high success streak the rate normalizes
**Plans**: TBD

Plans:
- [ ] 50-01: Implement cascade chain counter with color-escalating visuals (PSYC-01)
- [ ] 50-02: Implement near-miss shimmer detection and pulse animation (PSYC-02)
- [ ] 50-03: Implement Sugar Crush end-of-level sequence (PSYC-03)
- [ ] 50-04: Implement invisible assist DDA — spawn probability adjustment on fail/success streaks (PSYC-04)

#### Phase 51: Visual Polish — Tile Idle and Death Animations
**Goal**: Every tile type has a distinctive personality on the board — unique idle animations make tiles feel alive before selection, and unique death animations make clearing them feel satisfying and differentiated.
**Depends on**: Phase 47 (tiles must exist before animating them)
**Requirements**: TILE-10, TILE-11
**Success Criteria** (what must be TRUE):
  1. Each of the 10+ tile types has a visually distinct idle animation visible while tiles sit on the board (breathing, wobble, shimmer, cycling, etc.)
  2. Each tile type produces a distinct death animation when cleared (shatter, dissolve, refract, burst, etc.) — no two types look identical on clear
**Plans**: TBD

Plans:
- [ ] 51-01: Implement idle animations for all tile types in Phaser BlastTile layer (TILE-10)
- [ ] 51-02: Implement death/clear animations for all tile types in Phaser BlastTile layer (TILE-11)

#### Phase 52: Multiplayer Sync — New Mechanics in Multiplayer
**Goal**: All new tile types, combination effects, and game mechanics work correctly and deterministically in multiplayer Blast games, and Combo Codex progress persists to each player's profile.
**Depends on**: Phase 51
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):
  1. Multiplayer Blast games spawn and activate all new/reworked tile types (Rainbow Boost, Treasure Gem, Vortex, Frost, Mirror, Gold tiers) without errors
  2. Two clients watching the same combination effect see identical particle/screen effects with no divergence
  3. Board refills after cascades produce the same tiles on all clients (seeded random, not Math.random())
  4. Combo Codex progress earned in any session (singleplayer or multiplayer) persists to the player's Supabase profile
**Plans**: TBD

Plans:
- [ ] 52-01: Wire all new tile types into multiplayer blast game flow (SYNC-01)
- [ ] 52-02: Synchronize combination effect dispatch deterministically across clients (SYNC-02)
- [ ] 52-03: Replace cascade refill Math.random() with seeded random for multiplayer determinism (SYNC-03)
- [ ] 52-04: Persist Combo Codex discovery progress to Supabase player profile (SYNC-04)

---

## Progress

**Execution Order:** 46 → 47 → 48 → 49 → 50 → 51 → 52

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 36. Foundation & Refactoring | v2.0 | 5/5 | Complete | 2026-02-14 |
| 37. Practice Modes | v2.0 | 6/6 | Complete | 2026-02-14 |
| 38. Async Duels | v2.0 | 8/8 | Complete | 2026-02-14 |
| 39. Real-Time Duels | v2.0 | 5/5 | Complete | 2026-02-14 |
| 40. Gamification Enhancements | v2.0 | 7/7 | Complete | 2026-02-14 |
| 41. Student Dashboard Overhaul | v2.0 | 4/4 | Complete | 2026-02-14 |
| 42. Teacher Dashboard & Workflows | v2.0 | 5/5 | Complete | 2026-02-14 |
| 43. Practice Experience & Design Polish | v2.0 | 4/4 | Complete | 2026-02-14 |
| 44. Milestone Gap Closure & Tech Debt | v2.0 | 1/1 | Complete | 2026-02-14 |
| 45. Practice XP Server-Side Wiring | v2.0 | 1/1 | Complete | 2026-02-14 |
| 46. Foundation — Unified Types & Bug Fixes | v3.0 | 4/4 | Complete | 2026-03-04 |
| 47. Tile Reworks — New Behaviors & Spawn Tables | 3/5 | In Progress|  | ~12min |
| 48. Combination System Core | v3.0 | 0/4 | Not started | - |
| 49. Combination UX | v3.0 | 0/4 | Not started | - |
| 50. Psychological Hooks | v3.0 | 0/4 | Not started | - |
| 51. Visual Polish — Tile Animations | v3.0 | 0/2 | Not started | - |
| 52. Multiplayer Sync | v3.0 | 0/4 | Not started | - |
