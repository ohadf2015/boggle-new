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
- [x] 47-02-PLAN.md — Treasure Gem shard collector: 3-hit accumulation, +25 bonus, spawn 2 specials (TILE-02) (Wave 2)
- [x] 47-03-PLAN.md — Vortex pull+explode and Frost 2-hit reveal with inner special activation (TILE-03, TILE-04) (Wave 3)
- [x] 47-04-PLAN.md — Mirror tile, Wildcard removal, Silver/Gold/Diamond tier system (TILE-05, TILE-06, TILE-07) (Wave 4)
- [x] 47-05-PLAN.md — Updated spawn distribution tables for all waves with new tile unlock progression (TILE-09) (Wave 5)

#### Phase 48: Combination System Core — Detection, Matrix, and Effects
**Goal**: Any word containing two or more special tiles triggers a unique synergy effect from the full 28-pair combination matrix, with visuals and audio clearly distinguishing combinations from individual tile clears.
**Depends on**: Phase 47
**Requirements**: COMB-01, COMB-02, COMB-03
**Success Criteria** (what must be TRUE):
  1. Submitting a word with 2+ special tiles always triggers a combination effect (no silent misses)
  2. All 28 tile pairs produce distinct, named effects — no two pairs produce identical outcomes
  3. Combination clears visually exceed individual tile clears (larger particles, screen flash, distinct audio sting)
**Plans**: 4 plans

Plans:
- [x] 48-01-PLAN.md — Expand detection to 28 pairs + extract combo effect executor from useBlastGame (COMB-01) (Wave 1)
- [x] 48-02-PLAN.md — Implement combo effects: Bomb/Lightning/Prism/Rainbow pairs (12 effects) (COMB-02) (Wave 2)
- [x] 48-03-PLAN.md — Implement combo effects: Vortex/Frost/Mirror/Gem pairs (10 effects) (COMB-02) (Wave 2)
- [x] 48-04-PLAN.md — BlastComboFlash visual overlay + audio sting callback (COMB-03) (Wave 3)

#### Phase 49: Combination UX — Discovery, Codex, Scaling, Translations
**Goal**: Players are rewarded for discovering new combinations with a dramatic first-time callout, can browse their discovery progress in the Combo Codex, receive stronger effects for longer words, and all combination text is translated.
**Depends on**: Phase 48
**Requirements**: COMB-04, COMB-05, COMB-06, COMB-07
**Success Criteria** (what must be TRUE):
  1. First time a combination fires, gameplay briefly freezes and a "COMBO DISCOVERED: [name]!" banner appears with unique icon
  2. The Combo Codex screen is accessible from the Blast mode menu and shows discovered vs. total combinations (e.g., "12/28")
  3. A 7+ letter word containing a special tile produces a visibly stronger effect than a 3-letter word with the same tile
  4. Combination names and "COMBO DISCOVERED" banner text display correctly in Hebrew, Swedish, and Japanese
**Plans**: 5 plans

Plans:
- [x] 49-01-PLAN.md — Combo discovery callout: useBlastComboDiscovery hook + BlastComboDiscovery banner (COMB-04) (Wave 1)
- [x] 49-02-PLAN.md — Combo Codex modal + BlastReadyScreen button (COMB-05) (Wave 2)
- [x] 49-03-PLAN.md — Word-length scaling: getWordLengthScaleFactor + scaledRadius in combo effects (COMB-06) (Wave 1)
- [x] 49-04-PLAN.md — Translation completeness: 25 combo names + 4 UI keys in all 4 languages (COMB-07) (Wave 3)
- [x] 49-05-PLAN.md — Gap closure: wire BlastComboDiscovery into gameplay (COMB-04) (Wave 4)

#### Phase 50: Psychological Hooks — Addiction Layer
**Goal**: The four psychological engagement mechanics (cascade chain counter, near-miss shimmer, Sugar Crush end sequence, invisible difficulty assist) are all active, making every game session feel dynamic and "almost" achievable.
**Depends on**: Phase 49
**Requirements**: PSYC-01, PSYC-02, PSYC-03, PSYC-04
**Success Criteria** (what must be TRUE):
  1. Cascades display an escalating "CHAIN x2, CHAIN x3..." counter with color progression from white to rainbow
  2. After submitting a word that misses a nearby combo or cascade opportunity, 2-3 tiles briefly pulse to hint at the missed potential
  3. When moves run out, remaining tiles convert to specials and fire in sequence with escalating intensity before the results screen
  4. After 3+ failed words the board spawns noticeably more special tiles; after a high success streak the rate normalizes
**Plans**: 4 plans

Plans:
- [x] 50-01-PLAN.md — Cascade chain counter with color-escalating visuals (PSYC-01)
- [x] 50-02-PLAN.md — Near-miss shimmer detection and pulse animation (PSYC-02)
- [x] 50-03-PLAN.md — Sugar Crush end-of-level sequence (PSYC-03)
- [x] 50-04-PLAN.md — Invisible assist DDA: spawn probability adjustment on fail/success streaks (PSYC-04)

#### Phase 51: Visual Polish — Tile Idle and Death Animations
**Goal**: Every tile type has a distinctive personality on the board — unique idle animations make tiles feel alive before selection, and unique death animations make clearing them feel satisfying and differentiated.
**Depends on**: Phase 47 (tiles must exist before animating them)
**Requirements**: TILE-10, TILE-11
**Success Criteria** (what must be TRUE):
  1. Each of the 10+ tile types has a visually distinct idle animation visible while tiles sit on the board (breathing, wobble, shimmer, cycling, etc.)
  2. Each tile type produces a distinct death animation when cleared (shatter, dissolve, refract, burst, etc.) — no two types look identical on clear
**Plans**: 2 plans

Plans:
- [x] 51-01-PLAN.md — Add mirror/silver/diamond to BlastTileRules + idle tweens for all tile types (TILE-10) (Wave 1)
- [x] 51-02-PLAN.md — Per-type death/clear animations via playClearByType() dispatch (TILE-11) (Wave 1, depends on 51-01)

#### Phase 52: Multiplayer Sync — New Mechanics in Multiplayer
**Goal**: All new tile types, combination effects, and game mechanics work correctly and deterministically in multiplayer Blast games, and Combo Codex progress persists to each player's profile.
**Depends on**: Phase 51
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):
  1. Multiplayer Blast games spawn and activate all new/reworked tile types (Rainbow Boost, Treasure Gem, Vortex, Frost, Mirror, Gold tiers) without errors
  2. Two clients watching the same combination effect see identical particle/screen effects with no divergence
  3. Board refills after cascades produce the same tiles on all clients (seeded random, not Math.random())
  4. Combo Codex progress earned in any session (singleplayer or multiplayer) persists to the player's Supabase profile
**Plans**: 4 plans

Plans:
- [x] 52-01-PLAN.md — Wire all new tile types into multiplayer blast game flow (SYNC-01) (Wave 1)
- [x] 52-02-PLAN.md — Synchronize combination effect dispatch deterministically across clients (SYNC-02) (Wave 1)
- [x] 52-03-PLAN.md — Replace cascade refill Math.random() with seeded random for multiplayer determinism (SYNC-03) (Wave 1)
- [x] 52-04-PLAN.md — Persist Combo Codex discovery progress to Supabase player profile (SYNC-04) (Wave 1)

#### Phase 53: Gap Closure — Wildcard Type Cleanup
**Goal**: The `'wildcard'` string is fully removed from `BlastTileType` union, `BLAST_TILE_TYPE_LIST`, and all downstream consumers — eliminating contradictory test assertions and preventing wildcard tile generation in multiplayer.
**Depends on**: Phase 52
**Requirements**: TILE-06, TILE-08, SYNC-01
**Gap Closure**: Closes gaps from audit
**Success Criteria** (what must be TRUE):
  1. `BlastTileType` union has exactly 13 types (no `'wildcard'`)
  2. `BLAST_TILE_TYPE_LIST` has length 13 with no wildcard entry
  3. All tests pass with no contradictory wildcard assertions
  4. `BLAST_TILE_TYPES` in multiplayer constants excludes wildcard
**Plans**: 1 plan

Plans:
- [x] 53-01-PLAN.md — Remove wildcard from BlastTileType union, Records, and test assertions (TILE-06, TILE-08, SYNC-01) (Wave 1)

#### Phase 54: Gap Closure — Multiplayer Combo Sync + Codex Wiring
**Goal**: Multiplayer combo flash sync works end-to-end (client A submits combo → server broadcasts → client B sees flash), and authenticated singleplayer users persist Combo Codex progress to Supabase.
**Depends on**: Phase 53
**Requirements**: SYNC-02, SYNC-04
**Gap Closure**: Closes gaps from audit
**Success Criteria** (what must be TRUE):
  1. `submitWord` socket payload includes `comboType` when a combo is detected
  2. Server broadcasts `blastComboSync` to other players on combo word submission
  3. `useBlastComboDiscovery()` receives authenticated `userId` in `BlastView.tsx`
  4. Supabase POST fires for combo discoveries by logged-in singleplayer users
**Plans**: 1 plan

Plans:
- [x] 54-01-PLAN.md — Wire comboType into submitWord emit + pass userId to useBlastComboDiscovery (SYNC-02, SYNC-04) (Wave 1)

#### Phase 55: Tech Debt & Documentation Cleanup
**Goal**: All tech debt items from the v3.0 audit are resolved — `blastComboEffects.ts` split under 500 lines, legacy dead constants removed, lint errors fixed, and all REQUIREMENTS.md/ROADMAP.md checkboxes reflect actual status.
**Depends on**: Phase 54
**Requirements**: None (tech debt)
**Gap Closure**: Closes tech debt from audit
**Success Criteria** (what must be TRUE):
  1. `blastComboEffects.ts` split into files each under 500 lines
  2. Legacy constants (`RAINBOW_BONUS`, `MAGNET_RADIUS`, etc.) removed from `types.ts`
  3. No lint errors in `blastMultiplayerConstants.ts`
  4. All REQUIREMENTS.md checkboxes and traceability statuses match audit findings
  5. All ROADMAP.md plan checkboxes match actual completion
**Plans**: 2 plans

Plans:
- [x] 55-01-PLAN.md — Remove dead constants + fix lint duplicate-import errors (Wave 1)
- [x] 55-02-PLAN.md — Update REQUIREMENTS.md and ROADMAP.md stale entries (Wave 1)

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
| 47. Tile Reworks — New Behaviors & Spawn Tables | 5/5 | Complete    | 2026-03-04 | ~12min |
| 48. Combination System Core | 3/4 | Complete    | 2026-03-04 | - |
| 49. Combination UX | 5/5 | Complete    | 2026-03-04 | - |
| 50. Psychological Hooks | 4/4 | Complete    | 2026-03-04 | - |
| 51. Visual Polish — Tile Animations | 2/2 | Complete    | 2026-03-04 | - |
| 52. Multiplayer Sync | 4/4 | Complete    | 2026-03-04 | - |
| 53. Gap Closure — Wildcard Type Cleanup | 1/1 | Complete    | 2026-03-04 | - |
| 54. Gap Closure — MP Combo Sync + Codex Wiring | 1/1 | Complete    | 2026-03-04 | - |
| 55. Tech Debt & Docs Cleanup | 2/2 | Complete    | 2026-03-04 | - |
