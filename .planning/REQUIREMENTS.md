# Requirements — Milestone v2.0 Education 2.0

## Overview

**Goal:** Transform the education section into an engaging, competitive learning platform with student duels as the centerpiece, diverse practice modes, polished UI, and improved teacher workflows.

**Total requirements:** 27
**Categories:** 7

---

## v2.0 Requirements

### Foundation (FOUND)

Infrastructure changes required before feature work.

- [x] **FOUND-01**: Split `lib/supabase/teacher.ts` (1260 lines) into modular files under `lib/supabase/education/` (classrooms, lessons, progress, assignments, duels, practice)
- [x] **FOUND-02**: Create new Supabase tables for duels (`student_duels`, `duel_turns`), practice sessions (`practice_sessions`), and achievement progress (`student_achievements_progress`) with RLS policies
- [x] **FOUND-03**: Create Socket.IO duel namespace with room-based architecture extending existing classroom game infrastructure
- [x] **FOUND-04**: Rebalance XP awards for new activities (duels, practice modes, challenges) to prevent inflation while maintaining motivation

### Duels (DUEL)

Student-vs-student competition — the centerpiece feature.

- [x] **DUEL-01**: User can create an async duel challenge — play a board, freeze state, send challenge to classmate with score to beat
- [x] **DUEL-02**: User can accept and play an async duel challenge — play same frozen board, compare scores, determine winner
- [x] **DUEL-03**: User can start a real-time 1v1 duel — both players see same board simultaneously with live progress indicators
- [x] **DUEL-04**: User can browse a duel lobby showing pending invites, available opponents, and quick-match option within their classroom
- [x] **DUEL-05**: User can view duel history with win/loss record, streaks, and per-opponent stats

### Practice Modes (PRAC)

Diverse vocabulary practice beyond flashcards and board play.

- [ ] **PRAC-01**: User can practice word matching — drag-and-drop or tap to pair words with definitions, with instant feedback and scoring
- [ ] **PRAC-02**: User can practice spelling challenge — see definition, type the correct word, with progressive difficulty and hints
- [ ] **PRAC-03**: User can play timed blitz — 60-second speed round cycling through vocabulary with combo multipliers
- [ ] **PRAC-04**: User can select practice mode from a mode selector UI showing all available modes with descriptions and progress per mode

### Gamification (GAMF)

Deeper progression and competitive systems.

- [x] **GAMF-01**: User sees progression milestones with visual rewards — milestone badges, animated celebrations, visual progress indicators beyond basic XP bar
- [x] **GAMF-02**: User can view competitive classroom leaderboards — weekly/monthly boards with tiers, rank change indicators, and streak badges
- [x] **GAMF-03**: User receives daily and weekly challenges — time-limited goals (e.g., "Master 5 words today", "Win 3 duels this week") with bonus XP/coin rewards
- [x] **GAMF-04**: User can unlock new achievement categories for duels and practice — "Win 10 duels", "Perfect spelling streak", "Blitz master", etc. with 4 tiers each

### UI Polish (UIPOL)

Visual improvements across all education pages.

- [x] **UIPOL-01**: Student dashboard overhaul — engaging layout with activity feed, duel invites widget, streak calendar, quick-play buttons, progress visualization
- [ ] **UIPOL-02**: Teacher dashboard UX improvements — faster navigation, better analytics layout, assignment tracking panel, student duel monitoring
- [ ] **UIPOL-03**: Practice experience polish — better feedback animations, progress indicators, mode transitions, session completion summaries
- [ ] **UIPOL-04**: Neo-brutalist consistency audit — ensure all education pages follow design system (hard shadows, chunky borders, Fredoka/Rubik typography, proper color palette)

### Teacher Workflows (TEACH)

Improved teacher tools and workflows.

- [ ] **TEACH-01**: Teacher can create lessons faster — bulk word import improvements, template lessons, streamlined word editor
- [ ] **TEACH-02**: Teacher can assign practice modes and duels to students — set specific activities, due dates, and track completion status
- [ ] **TEACH-03**: Teacher can view assignment dashboard showing per-student completion rates, scores, and struggling areas

### Student Social (SOC)

Student-facing social features within classroom boundaries.

- [x] **SOC-01**: User has a student profile page showing stats, badges, recent activity, XP level, and duel record
- [x] **SOC-02**: User can challenge a specific classmate to a duel directly from their profile or the classroom roster
- [x] **SOC-03**: User can see a classroom activity feed showing recent duels, achievements unlocked, and milestones reached by classmates

---

## Future Requirements (Deferred)

These features were identified in research but deferred to future milestones:

- **Skill tree system** — Researched in Phase 31, too complex for this milestone
- **AI-generated lessons** — High complexity, requires separate infrastructure
- **Cross-school tournaments** — Requires matchmaking infrastructure beyond current scope
- **Parent portal** — Not core to student engagement
- **Video/audio content** — Storage/bandwidth concerns, text-first approach
- **Global matchmaking** — Anti-feature: classroom boundaries are intentional for safety
- **Spectator mode for duels** — Nice-to-have, defer until duels are validated

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-matching random opponents | Classroom safety — only match within same classroom |
| Pay-to-win mechanics | Educational context — progression must be effort-based |
| Global leaderboards | Privacy concerns — keep competition within classrooms |
| Chat/messaging between students | Moderation complexity — use structured interactions only |
| Custom avatar uploads | Content moderation risk — use system-provided options |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| FOUND-01 | Phase 36 | Complete |
| FOUND-02 | Phase 36 | Complete |
| FOUND-03 | Phase 36 | Complete |
| FOUND-04 | Phase 36 | Complete |
| DUEL-01 | Phase 38 | Complete |
| DUEL-02 | Phase 38 | Complete |
| DUEL-03 | Phase 39 | Complete |
| DUEL-04 | Phase 38 | Complete |
| DUEL-05 | Phase 38 | Complete |
| PRAC-01 | Phase 37 | Complete |
| PRAC-02 | Phase 37 | Complete |
| PRAC-03 | Phase 37 | Complete |
| PRAC-04 | Phase 37 | Complete |
| GAMF-01 | Phase 40 | Pending |
| GAMF-02 | Phase 40 | Pending |
| GAMF-03 | Phase 40 | Pending |
| GAMF-04 | Phase 40 | Pending |
| UIPOL-01 | Phase 41 | Pending |
| UIPOL-02 | Phase 42 | Pending |
| UIPOL-03 | Phase 43 | Pending |
| UIPOL-04 | Phase 43 | Pending |
| TEACH-01 | Phase 42 | Pending |
| TEACH-02 | Phase 42 | Pending |
| TEACH-03 | Phase 42 | Pending |
| SOC-01 | Phase 41 | Pending |
| SOC-02 | Phase 38 | Complete |
| SOC-03 | Phase 41 | Pending |

---

*Generated: 2026-02-13 from research + user scoping*
