# LexiClash

## What This Is

LexiClash is a multiplayer word game (Boggle-style) with an education platform for teachers and students. Teachers create vocabulary lessons and run classroom games; students practice vocabulary through various game modes, earn XP, unlock achievements, and compete with classmates. Built with Next.js 16, TypeScript, Tailwind, Socket.IO, Supabase, and Redis.

## Core Value

Students learn vocabulary through engaging, competitive gameplay that makes practice feel like play — not homework.

## Current Milestone: v2.0 Education 2.0

**Goal:** Transform the education section into an engaging, competitive learning platform with student duels as the centerpiece, diverse practice modes, polished UI across all dashboards, and improved teacher workflows.

**Target features:**
- Student duels (async challenges + real-time 1v1)
- New practice modes (word matching, spelling challenge, timed blitz)
- Gamification depth (richer progression, visual rewards, competitive leaderboards)
- Student dashboard overhaul
- Teacher dashboard UX improvements
- Practice experience UI polish
- Neo-brutalist consistency pass across education
- Teacher workflow improvements (faster lesson creation, assignment tracking)
- Student-to-student social features

**Design approach:** Use /superdesign for new UI designs before implementation.

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

### Active

<!-- Current scope. Building toward these. -->

- [ ] Student duels — async challenges (play board, send score to opponent)
- [ ] Student duels — real-time 1v1 (same board, live progress)
- [ ] Word matching practice mode (drag-and-drop or tap pairs)
- [ ] Spelling challenge practice mode (definition to typed word)
- [ ] Timed blitz practice mode (60s speed round)
- [ ] Richer progression milestones and visual rewards
- [ ] Student dashboard overhaul (more engaging, informative)
- [ ] Teacher dashboard UX improvements (faster workflows)
- [ ] Practice experience UI polish
- [ ] Neo-brutalist consistency pass across education section
- [ ] Teacher workflow improvements (lesson creation, assignment tracking)
- [ ] Student-to-student social features (challenges, profiles)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Skill tree system — Researched (Phase 31) but deferred to future milestone
- AI-generated lessons — Complexity too high for this milestone
- Parent portal — Not core to student engagement
- Video/audio content — Storage/bandwidth concerns, text-first
- Cross-school tournaments — Requires infrastructure beyond current scope

## Context

- Education section has 10+ pages, 50+ components, 15+ hooks
- Backend modules: xpManager, educationXpManager, educationAchievementManager, classroomGameManager
- Supabase data layer (`lib/supabase/teacher.ts`) is 1261 lines — may need splitting
- Socket.IO already handles real-time classroom games — extend for duels
- Neo-brutalist design system well-established (Fredoka display, Rubik body, hard shadows, chunky borders)
- 4-language support (EN, HE, SV, JA) — all new UI text needs translations
- RTL support for Hebrew
- Container queries preferred over viewport units
- Existing classroom game infrastructure can be extended for 1v1 duels

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
| Duels: both async + real-time | Async for anytime play, real-time for engagement when both online | -- Pending |
| Practice modes: matching, spelling, blitz | Cover visual, auditory, and speed learning styles | -- Pending |
| Full overhaul scope (12+ phases) | Education section needs comprehensive improvement, not patchwork | -- Pending |
| /superdesign for new UI designs | Ensure design quality before implementation | -- Pending |

---
*Last updated: 2026-02-13 after milestone v2.0 initialization*
