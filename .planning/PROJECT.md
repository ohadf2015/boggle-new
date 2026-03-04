# LexiClash

## What This Is

LexiClash is a multiplayer word game (Boggle-style) with an education platform for teachers and students. Teachers create vocabulary lessons and run classroom games; students practice vocabulary through diverse game modes (word matching, spelling challenge, timed blitz), compete in async and real-time duels, earn XP, unlock achievements, and track progress on engaging dashboards. Blast mode features a deep special tile system with 13 tile types, 28 unique tile-pair synergy effects, psychological engagement mechanics, and a Combo Codex collectible metagame. Built with Next.js 16, TypeScript, Tailwind, Socket.IO, Supabase, Redis, and Phaser 3.

## Core Value

Students learn vocabulary through engaging, competitive gameplay that makes practice feel like play — not homework.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- XP system (100 levels + 5 prestige tiers with multipliers)
- 18 achievements across 4 categories (Progress, Skill, Consistency, Exploration) with 4 tiers each
- Daily streaks with multipliers (7/14/30 day bonuses)
- Classroom leaderboards (weekly + all-time)
- Word mastery tracking (3 correct = mastered)
- Teacher classroom management (create, edit, delete, join codes)
- Lesson builder with word editor + bulk import
- Curriculum word list browser (grade-level)
- Analytics dashboard (heatmaps, effectiveness charts, struggling student detection)
- PDF progress reports
- Student dashboard with XP/stats + lesson list
- Lesson practice (flashcard + board modes)
- Live classroom multiplayer games
- Join classroom via code
- Level-up celebration modal
- Achievement unlock animations
- Async student duels (play board, freeze state, send challenge to beat) — v2.0
- Real-time 1v1 duels (same board, live progress, disconnection handling) — v2.0
- Duel lobby with pending invites, quick-match, and classmate challenges — v2.0
- Duel history with win/loss record, streaks, per-opponent stats — v2.0
- Word matching practice mode (drag-and-drop pairs with instant feedback) — v2.0
- Spelling challenge practice mode (definition to typed word, progressive difficulty) — v2.0
- Timed blitz practice mode (60s speed round with combo multipliers) — v2.0
- Practice mode selector with progress per mode — v2.0
- Progression milestones with visual rewards and animated celebrations — v2.0
- Competitive classroom leaderboards (weekly/monthly, tiers, rank changes, streak badges) — v2.0
- Daily and weekly challenges with bonus XP/coin rewards — v2.0
- Achievement categories for duels and practice (10+ new categories, 4 tiers each) — v2.0
- Student dashboard overhaul (activity feed, duel invites, streak calendar, quick-play) — v2.0
- Student profile page (stats, badges, duel record, recent activity) — v2.0
- Classroom activity feed (recent duels, achievements, milestones by classmates) — v2.0
- Challenge classmate from profile or classroom roster — v2.0
- Teacher dashboard UX improvements (faster navigation, better analytics layout) — v2.0
- Faster lesson creation (template lessons, enhanced bulk import, streamlined editor) — v2.0
- Assignment tracking (assign practice/duels, due dates, completion status) — v2.0
- Assignment dashboard (per-student completion rates, scores, struggling areas) — v2.0
- Practice experience polish (feedback animations, progress indicators, session summaries) — v2.0
- Neo-brutalist design consistency across all education pages — v2.0
- Modular education data layer (10 modules replacing monolithic teacher.ts) — v2.0
- Server-side XP award for practice sessions via educationXpManager — v2.0
- ✓ 5 tile reworks (Rainbow Boost, Treasure Gem, Vortex, Frost, Mirror) + Wildcard removal — v3.0
- ✓ Gold tier system (Silver 1.5x, Gold 3x, Diamond 5x) — v3.0
- ✓ Full 28-pair combination matrix with unique synergy effects — v3.0
- ✓ Combo discovery callout + Combo Codex collectible screen — v3.0
- ✓ Word-length scaling for tile effects (base/1.5x/2x) — v3.0
- ✓ Combo names translated in all 4 languages — v3.0
- ✓ Cascade chain counter with color-escalating visuals — v3.0
- ✓ Near-miss shimmer hint system — v3.0
- ✓ Sugar Crush end-of-level sequence — v3.0
- ✓ Invisible DDA assist (spawn probability adjustment) — v3.0
- ✓ Unique idle + death animations per tile type in Phaser — v3.0
- ✓ All new mechanics synced in multiplayer (seeded PRNG, combo flash, codex persistence) — v3.0
- ✓ 9 blast tile bugs fixed (chain propagation, cascade dedup, scoring, objective guarantee) — v3.0
- ✓ Unified BlastTileType across SP/MP (13 types, no wildcard) — v3.0

### Active

<!-- Current scope. Building toward these. -->

(No active milestone — run `/gsd:new-milestone` to start next)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Skill tree system — Researched (Phase 31) but deferred to future milestone
- AI-generated lessons — Complexity too high, requires separate infrastructure
- Parent portal — Not core to student engagement
- Video/audio content — Storage/bandwidth concerns, text-first
- Cross-school tournaments — Requires matchmaking infrastructure beyond current scope
- Global matchmaking — Anti-feature: classroom boundaries are intentional for safety
- Spectator mode for duels — Defer until duels are validated with real users
- Chat/messaging between students — Moderation complexity, use structured interactions
- Custom avatar uploads — Content moderation risk, use system-provided options
- Pay-to-win mechanics — Educational context, progression must be effort-based
- Global leaderboards — Privacy concerns, keep competition within classrooms
- Tile skin customization — Cosmetic layer deferred; get mechanics right first (v3.0 out-of-scope)
- Competitive combo leaderboards — Defer until Combo Codex validates discovery metagame (v3.0 out-of-scope)

## Context

- **Shipped v3.0** with 10 phases, 32 plans, 287 files, +29,079 / -9,317 LOC
- **Blast mode**: 13 tile types (standard, gold, silver, diamond, bomb, rainbow, ice, lightning, prism, gem, frost, vortex, mirror) with full 28-pair combo matrix
- **Combo Codex**: 31 discoverable combos, persisted to Supabase for authenticated users
- **Psychological hooks**: cascade chain counter, near-miss shimmer, Sugar Crush end sequence, invisible DDA
- **Phaser integration**: Wave 1+2 complete; BlastScene, BlastTile, GravityController, CascadeSequencer, WordPathTrail, idle/death animations all in Phaser layer
- Education section: 10+ pages, 50+ components, 15+ hooks
- Modular data layer: `lib/supabase/education/` (10 modules with barrel export)
- Backend modules: xpManager, educationXpManager, educationAchievementManager, classroomGameManager
- Socket.IO namespaces: /duel (async + real-time), /classroom (games)
- 4 DB tables added: student_duels, duel_turns, practice_sessions, student_achievements_progress
- Neo-brutalist design system: Fredoka display, Rubik body, hard shadows, chunky borders
- 4-language support (EN, HE, SV, JA) with RTL for Hebrew
- Container queries preferred over viewport units

## Constraints

- **Tech stack**: Next.js 16 + TypeScript + Tailwind + Supabase + Socket.IO + Phaser 3 (no new major deps)
- **i18n**: All UI text via `t('key')`, 4 languages
- **RTL**: Hebrew support mandatory
- **Design**: Neo-brutalist style, use /superdesign for new designs
- **Testing**: TDD mandatory, all components must have tests
- **File size**: Max 500 lines per file
- **Accessibility**: WCAG 2.1 AA standards

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Duels: both async + real-time | Async for anytime play, real-time for engagement when both online | ✓ Good |
| Practice modes: matching, spelling, blitz | Cover visual, auditory, and speed learning styles | ✓ Good |
| Full overhaul scope (10 phases) | Education section needed comprehensive improvement, not patchwork | ✓ Good |
| /superdesign for new UI designs | Ensure design quality before implementation | ✓ Good |
| Modular education data layer | Split 1260-line monolith into 10 focused modules | ✓ Good |
| Socket.IO namespace separation | /duel and /classroom prevent room state pollution | ✓ Good |
| AdaptiveMotion for animations | Performance optimization on mobile; MotionValue exception for drag bindings | ✓ Good |
| Assignment type unified (practice + duel) | Simpler UI, single workflow for teachers | ✓ Good |
| Idempotency guard on XP awards | completed_at check prevents double-awarding on retry | ✓ Good |
| RPC with backward-compatible signature | p_lesson_id DEFAULT NULL lets duel handlers keep working | ✓ Good |
| Rainbow Boost (amplifier) over flat bonus | Copies+doubles best special in word; solo=2x. Universal enhancer — always exciting to include | ✓ Good |
| Remove Wildcard | No mechanic implemented; 17% spawn rate diluting special pool | ✓ Good |
| Mirror tile (new) | Doubles combo partner's effect — creates "what if I combine X with Y?" moments | ✓ Good |
| Redesign before bug fixes | New combo system rewrote much of the buggy code; avoided fixing code that got replaced | ✓ Good |
| 28-pair combination matrix | Every tile pair has defined synergy — Candy Crush's core engagement driver | ✓ Good |
| Word-length scaling for tile effects | Longer words = stronger effects (1.5x at 5-6, 2x at 7+). Unique to word games, rewards vocabulary | ✓ Good |
| Trust-client combo type in MP | Server re-broadcasts client's comboType — simpler than server-side detection | ⚠️ Revisit |
| DDA via spawn modifier (not difficulty level) | Subtle boost/nerf without changing game rules; clamped to preserve test fixtures | ✓ Good |

---
*Last updated: 2026-03-04 after v3.0 milestone completion*
