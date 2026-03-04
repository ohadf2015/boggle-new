# Milestones

## v3.0 — Blast Mode Special Tiles Redesign (Shipped: 2026-03-04)

**Status:** SHIPPED
**Period:** 2026-03-04 (~10 hours)
**Phases:** 46-55 (10 phases, 32 plans)
**Requirements:** 35/35 satisfied
**Commits:** ~139 | **Files:** 287 | **LOC:** +29,079 / -9,317

**Key accomplishments:**
1. Unified tile type system and fixed 9 chain/cascade/scoring bugs (BUGF-01 to BUGF-09)
2. 5 tile reworks — Rainbow Boost (amplifier), Treasure Gem (shard collector), Vortex (pull+explode), Frost (2-hit reveal), Mirror (doubles partner) + Gold tier system (Silver/Gold/Diamond) + Wildcard removal
3. Full 28-pair combination matrix with unique synergy effects for every special tile pairing
4. Combo discovery UX — first-time callout banner, Combo Codex collectible screen, word-length scaling for tile effects
5. Psychological hooks — cascade chain counter, near-miss shimmer, Sugar Crush end-of-level sequence, invisible DDA assist
6. Unique idle + death animations for all 13 tile types in Phaser layer
7. All new mechanics synced deterministically in multiplayer (seeded PRNG, combo flash sync, Codex Supabase persistence)
8. Full 4-language translations for all 31 combo names and UI keys

**Phases:**
- Phase 46: Foundation — Unified Types & Bug Fixes (4 plans)
- Phase 47: Tile Reworks — New Behaviors & Spawn Tables (5 plans)
- Phase 48: Combination System Core (4 plans)
- Phase 49: Combination UX — Discovery, Codex, Scaling, Translations (5 plans)
- Phase 50: Psychological Hooks — Addiction Layer (4 plans)
- Phase 51: Visual Polish — Tile Idle & Death Animations (2 plans)
- Phase 52: Multiplayer Sync — New Mechanics in Multiplayer (4 plans)
- Phase 53: Gap Closure — Wildcard Type Cleanup (1 plan)
- Phase 54: Gap Closure — Multiplayer Combo Sync + Codex Wiring (1 plan)
- Phase 55: Tech Debt & Documentation Cleanup (2 plans)

**Archive:** `.planning/milestones/v3.0-ROADMAP.md`

---

## v1.0 — Foundation & Game Modes (Pre-GSD)

**Status:** ~87% complete (Phase 30/35)
**Period:** Pre-2026-02-13

Work completed outside formal GSD workflow. Phases 1-35 covered:
- Core game engine (Boggle-style word finding)
- Multiplayer via Socket.IO
- Adventure mode with boss battles
- Blast mode (cascade puzzle mechanics)
- Achievement system (18 achievements, 4 tiers)
- XP/leveling (100 levels + prestige)
- Remotion cinematics library
- Education platform (teacher tools, student practice, classroom games)
- Daily challenges
- Power-up system
- Skill tree research (Phase 31)

**Last phase:** 35
**Notable:** Boss Battle Overhaul (Phase 30) was in progress at transition.

---

## v2.0 — Education 2.0 (Shipped: 2026-02-14)

**Status:** SHIPPED
**Period:** 2026-02-13 → 2026-02-14
**Phases:** 36-45 (10 phases, 46 plans)
**Requirements:** 27/27 satisfied
**Commits:** 109 | **Files:** 200 | **LOC:** +34,809 / -1,378

**Key accomplishments:**
1. Refactored monolithic teacher.ts into 10 modular education modules with barrel exports
2. Built 3 practice modes (word matching, spelling challenge, timed blitz) with session tracking and XP
3. Implemented async + real-time student duels with full lifecycle, lobby, history, and challenge from profile
4. Added gamification depth: competitive leaderboards, daily/weekly challenges, milestone celebrations, 10+ achievement categories
5. Overhauled student dashboard with activity feed, streak calendar, quick-play panel, and classmate challenges
6. Improved teacher workflows with assignment tracking, template lessons, bulk import, and duel monitoring
7. Neo-brutalist design consistency audit across all education pages
8. Full 4-language translations (EN, HE, SV, JA) with RTL support

**Phases:**
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

**Archive:** `.planning/milestones/v2.0-ROADMAP.md`

---
