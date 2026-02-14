# LexiClash

## What This Is

LexiClash is a multiplayer word game (Boggle-style) with an education platform for teachers and students. Teachers create vocabulary lessons and run classroom games; students practice vocabulary through diverse game modes (word matching, spelling challenge, timed blitz), compete in async and real-time duels, earn XP, unlock achievements, and track progress on engaging dashboards. Built with Next.js 16, TypeScript, Tailwind, Socket.IO, Supabase, and Redis.

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

### Active

<!-- Current scope. Building toward these. -->

(No active requirements — next milestone not yet planned)

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

## Context

- **Shipped v2.0** with 10 phases, 46 plans, 200 files, +34,809 LOC
- Education section: 10+ pages, 50+ components, 15+ hooks
- Modular data layer: `lib/supabase/education/` (10 modules with barrel export)
- Backend modules: xpManager, educationXpManager, educationAchievementManager, classroomGameManager
- Socket.IO namespaces: /duel (async + real-time), /classroom (games)
- 4 DB tables added: student_duels, duel_turns, practice_sessions, student_achievements_progress
- Neo-brutalist design system: Fredoka display, Rubik body, hard shadows, chunky borders
- 4-language support (EN, HE, SV, JA) with RTL for Hebrew
- Container queries preferred over viewport units

## Constraints

- **Tech stack**: Next.js 16 + TypeScript + Tailwind + Supabase + Socket.IO (no new major deps)
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
| Duels: both async + real-time | Async for anytime play, real-time for engagement when both online | Good |
| Practice modes: matching, spelling, blitz | Cover visual, auditory, and speed learning styles | Good |
| Full overhaul scope (10 phases) | Education section needed comprehensive improvement, not patchwork | Good |
| /superdesign for new UI designs | Ensure design quality before implementation | Good |
| Modular education data layer | Split 1260-line monolith into 10 focused modules | Good |
| Socket.IO namespace separation | /duel and /classroom prevent room state pollution | Good |
| AdaptiveMotion for animations | Performance optimization on mobile; MotionValue exception for drag bindings | Good |
| Assignment type unified (practice + duel) | Simpler UI, single workflow for teachers | Good |
| Idempotency guard on XP awards | completed_at check prevents double-awarding on retry | Good |
| RPC with backward-compatible signature | p_lesson_id DEFAULT NULL lets duel handlers keep working | Good |

---
*Last updated: 2026-02-14 after v2.0 milestone*
