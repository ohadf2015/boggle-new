---
phase: 41-student-dashboard-overhaul
plan: 02
subsystem: education-frontend
status: complete
completed: 2026-02-14
duration: 11m
tags: [student-dashboard, activity-feed, social, classroom, react, hooks]

requires:
  - 41-01

provides:
  - useClassroomActivity hook
  - ActivityFeed component
  - Classroom activity timeline

affects:
  - 41-04 (may reference activity feed patterns)

tech-stack:
  added: []
  patterns:
    - Parallel Supabase queries for data merging
    - Activity feed pattern with multiple data sources
    - Timestamp-based sorting for mixed activity types

key-files:
  created:
    - hooks/useClassroomActivity.ts
    - hooks/useClassroomActivity.test.ts
    - components/student/ActivityFeed.tsx
    - components/student/ActivityFeed.test.tsx
  modified:
    - app/[locale]/student/PageClient.tsx
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js

decisions:
  - title: "Parallel queries for duels and achievements"
    rationale: "Better performance than sequential queries, both data sources independent"
    impact: "Activity feed loads faster with Promise.all pattern"

  - title: "Filter achievements by classroom membership"
    rationale: "student_achievements lacks classroom_id, must filter via classroom_memberships join"
    impact: "Two-step query: fetch classroom members, then filter achievements"

  - title: "Type assertions for Supabase joins"
    rationale: "Supabase TypeScript types don't infer joined table structures correctly"
    impact: "Used `any` type assertions for duel/achievement mapping, cleaner than complex type definitions"

  - title: "Activity feed shows last 20 items by default"
    rationale: "Balance between showing enough context and query performance"
    impact: "Students see recent classroom activity without pagination"
---

# Phase 41 Plan 02: Classroom Activity Feed Summary

**Build classroom activity feed showing recent duels and achievements by classmates.**

## Objective Achievement

✅ **Objective met:** Activity feed successfully displays merged timeline of duel completions and achievement unlocks, wired into student dashboard.

**One-liner:** Classroom activity timeline merges duels and achievements with parallel queries, sorted by timestamp DESC.

## What Was Built

### 1. useClassroomActivity Hook

**Purpose:** Fetch and merge classroom activity from multiple data sources

**Implementation:**
- Parallel queries to `student_duels` (completed duels) and `student_achievements` (unlocked achievements)
- Filters achievements by classroom membership (query classroom_memberships first, then filter by student_ids)
- Joins with profiles table for actor display_name and avatar_emoji
- Merges results, sorts by timestamp DESC, slices to limit (default 20)
- Returns ActivityItem[] with unified type ('duel_completed' | 'achievement_unlocked')

**Key patterns:**
```typescript
// Parallel fetch with Promise.all
const [duelsResult, achievementsResult] = await Promise.all([
  supabase.from('student_duels').select(...).eq('status', 'completed'),
  supabase.from('student_achievements').select(...).in('student_id', studentIds)
]);

// Merge and sort
const merged = [...duelActivities, ...achievementActivities]
  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  .slice(0, limit);
```

**Tests:** 4 passing
- Empty activities when classroomId is null
- Loading state transitions
- Merges and sorts by timestamp DESC
- Handles fetch errors gracefully

### 2. ActivityFeed Component

**Purpose:** Render activity timeline with visual differentiation

**Features:**
- Loading skeleton (3 pulsing rows)
- Empty state ("No activity yet")
- Error handling ("Failed to load activity")
- Activity items with:
  - Avatar emoji in circle
  - Actor name + action description
  - Relative timestamp (formatDistanceToNow)
  - Icon badge (Trophy for duels, Award for achievements)
- Highlights current user's activities (cyan border)
- RTL support (Hebrew)
- Staggered entrance animations (Framer Motion)

**Visual design:**
- Neo-brutalist card (border-neo-thick, shadow-hard-lg)
- Icon badges with background colors (yellow/15 for duels, cyan/15 for achievements)
- Hover effects on non-highlighted items

**Tests:** 5 passing
- Renders loading skeleton
- Renders empty state
- Renders activity items with correct icons
- Highlights current user's activities
- RTL layout for Hebrew

### 3. Dashboard Integration

**Location:** `app/[locale]/student/PageClient.tsx`

**Updated layout order:**
1. ClassroomGameBanner (if active)
2. StudentProgress (hero card with XP/level/stats)
3. QuickPlayPanel (from 41-01)
4. StreakCalendar (from 41-01)
5. ChallengePanel
6. ClassroomLeaderboard
7. **ActivityFeed** ← NEW
8. Page Header + StudentLessonView (lesson list)

**Positioning rationale:** Activity feed placed after leaderboard to create natural flow from competitive standings to social activity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added type assertions for Supabase joins**
- **Found during:** Task 1, build phase
- **Issue:** TypeScript couldn't infer types for joined tables (profiles via foreign keys)
- **Fix:** Added `(duel: any)` and `(ach: any)` type assertions in map functions
- **Files modified:** hooks/useClassroomActivity.ts
- **Commit:** 37a5b1af

**2. [Rule 2 - Missing Critical] Added translation keys**
- **Found during:** Task 1, git commit hook
- **Issue:** 10 translation keys used but not defined (student.dashboard.activity.*)
- **Fix:** Added keys to en/he/sv/ja translations files
- **Files modified:** translations/*.js
- **Commit:** c0cb4dff

## Technical Implementation

### Data Flow

```
useClassroomActivity(classroomId)
  ↓
1. Fetch classroom_memberships → studentIds[]
  ↓
2. Promise.all([
     fetch student_duels (completed, classroom_id)
     fetch student_achievements (student_id in studentIds)
   ])
  ↓
3. Transform to ActivityItem[]
   - duel: { actorId: winner_id, actorName, type: 'duel_completed' }
   - achievement: { actorId: student_id, actorName, type: 'achievement_unlocked' }
  ↓
4. Merge, sort by timestamp DESC, slice to limit
  ↓
ActivityFeed renders timeline
```

### Performance Characteristics

- **Parallel queries:** Duels and achievements fetch simultaneously (faster than sequential)
- **Default limit:** 20 items (balance between context and performance)
- **No pagination:** Single query, no infinite scroll (future enhancement if needed)
- **Join optimization:** Profiles joined via foreign keys (indexed lookups)

### Edge Cases Handled

- **No classroom membership:** Returns empty activities
- **No duels or achievements:** Shows empty state
- **Draw duels (no winner):** Uses challenger as actor
- **Missing profile data:** Defaults to 'Unknown' for display_name
- **Fetch errors:** Logs error, shows error state to user

## Testing Results

**All tests pass:** 9/9

**Hook tests:**
- ✅ Returns empty when classroomId null
- ✅ Loading state transitions
- ✅ Merges duel + achievement data sorted by timestamp DESC
- ✅ Handles fetch errors gracefully

**Component tests:**
- ✅ Renders loading skeleton
- ✅ Renders empty state
- ✅ Renders activity items with correct icons
- ✅ Highlights current user's activities
- ✅ RTL layout for Hebrew

**Build:** ✅ Succeeded with no errors

**Lint:** ✅ No errors (pre-commit hook passed)

## Translation Keys Added

**English:**
- student.dashboard.classroomActivity
- student.dashboard.quickPractice
- student.dashboard.randomLesson
- student.dashboard.quickDuel
- student.dashboard.challengeClassmate
- student.dashboard.streakCalendar
- student.dashboard.activity.wonDuel
- student.dashboard.activity.unlockedAchievement
- student.dashboard.activity.noActivity
- student.dashboard.activity.errorLoading

**Other languages:** Translated to Hebrew, Swedish, Japanese

## Known Limitations

1. **No real-time updates:** Activity feed doesn't auto-refresh when new duels/achievements occur (requires manual page refresh)
2. **No pagination:** Shows last 20 items only, no "load more" functionality
3. **TypeScript type safety:** Used `any` type assertions for Supabase join results (trade-off for simplicity)
4. **Achievement filtering:** Two-step query (classroom members → filter achievements) due to lack of classroom_id on student_achievements table

## Next Phase Readiness

**Phase 41-04 dependencies:**
- ✅ Activity feed component ready for reference
- ✅ Hook patterns established for multi-source data merging
- ✅ Translation keys established for student dashboard sections

**No blockers for next plan.**

## Commits

1. **c0cb4dff** - feat(41-02): create useClassroomActivity hook and ActivityFeed component
2. **37a5b1af** - feat(41-02): wire ActivityFeed into student dashboard

**Total commits:** 2
**Total files changed:** 10
**Total lines added:** ~800

---

**Plan complete.** Activity feed provides social context, showing students what classmates are achieving and competing in. Addresses SOC-03 (classroom activity feed) and UIPOL-01 (dashboard activity feed requirement).
