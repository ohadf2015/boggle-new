---
phase: 20-student-analytics-dashboard
plan: 03
subsystem: teacher-analytics-ui
completed: 2026-01-29
duration: 13min
tags: [react, hooks, analytics, table, teacher-dashboard]
requires: [20-01]
provides:
  - "StudentProgressTable component for teacher dashboard"
  - "useStudentProgressMetrics hook for student data management"
  - "getStudentsProgressSummary query for classroom-wide metrics"
affects: [20-06]
decisions:
  - decision: "Sort by XP descending as default"
    rationale: "Teachers want to see top performers first, most actionable view"
  - decision: "Highlight struggling students (accuracy <60%) with orange row"
    rationale: "Visual indicator for intervention priority, aligns with research threshold"
  - decision: "Hide streak/mastery columns on mobile"
    rationale: "Essential columns (name, XP, accuracy) stay visible on small screens"
  - decision: "Use Next.js Image component for avatars"
    rationale: "Automatic optimization, prevents bandwidth waste on teacher dashboard"
  - decision: "Calculate daysAgo in render instead of query"
    rationale: "Relative dates stay fresh on client, avoid stale 'yesterday' labels"
tech-stack:
  added: []
  patterns:
    - "useMemo for sorted student list (performance optimization)"
    - "Optional chaining for onStudentClick callback (flexible API)"
key-files:
  created:
    - hooks/useStudentProgressMetrics.ts
    - hooks/__tests__/useStudentProgressMetrics.test.ts
    - components/teacher/analytics/StudentProgressTable.tsx
    - components/teacher/analytics/__tests__/StudentProgressTable.test.tsx
  modified:
    - lib/supabase/analytics.ts
    - lib/supabase/__tests__/analytics.test.ts
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
---

# Phase 20 Plan 03: Student Progress Table Summary

> Individual student metrics table with sortable columns and struggling student highlighting

## What Was Built

Implemented a complete student progress tracking system for teacher dashboards, showing individual student metrics in a sortable, responsive table.

### Components

**StudentProgressTable**
- Sortable table by name, level, XP, mastery, accuracy, streak
- Visual highlighting for struggling students (orange row, left border)
- Responsive design with progressive column hiding (mobile → tablet → desktop)
- Avatar display with fallback initials
- Flame icon for active streaks (≥3 days)
- Relative time formatting (today, yesterday, X days ago)
- Click handler for drilling into individual student details

**useStudentProgressMetrics Hook**
- Fetches student progress summaries for classroom
- Manages loading/error states
- Provides refresh function for manual updates
- Uses useMounted pattern to prevent state updates after unmount
- Returns empty array when classroomId is empty (safety)

**getStudentsProgressSummary Query**
- Aggregates student progress across all lessons in classroom
- Calculates vocabulary mastery (% words mastered / total lesson words)
- Calculates overall accuracy (% correct / total attempts)
- Identifies struggling students (accuracy < 60%)
- Joins profiles for display names and avatars
- Tracks current streak and last practice date

## Test Coverage

**Total Tests:** 17 passing (4 query + 5 hook + 8 component)

**Query Tests (lib/supabase/__tests__/analytics.test.ts):**
- Returns empty array for classroom with no students
- Returns student progress with calculated mastery percentage
- Calculates accuracy from words_attempted correctly
- Marks student as struggling when accuracy < 60%

**Hook Tests (hooks/__tests__/useStudentProgressMetrics.test.ts):**
- Returns loading state initially
- Returns students array after fetch
- Returns error on fetch failure
- Refreshes when refresh() called
- Returns empty array when classroomId empty

**Component Tests (components/teacher/analytics/__tests__/StudentProgressTable.test.tsx):**
- Renders loading state with NeoLoader
- Renders table with student rows
- Renders empty state when no students
- Sorts by XP when XP header clicked (desc → asc)
- Sorts by accuracy when accuracy header clicked
- Highlights struggling students with CSS class
- Calls onStudentClick when row clicked
- Hides columns on mobile (responsive)

**Coverage:**
- analytics.ts: 75.58% statements, 96.55% branches
- useStudentProgressMetrics.ts: 96.77% statements, 100% lines
- StudentProgressTable.tsx: 73.68% statements, 69.23% branches

## Deviations from Plan

None - plan executed exactly as written.

## Architecture Decisions

### Data Flow

```
Teacher Dashboard
    ↓
StudentProgressTable (component)
    ↓
useStudentProgressMetrics (hook)
    ↓
getStudentsProgressSummary (query)
    ↓
Supabase: classroom_memberships → profiles → student_lesson_progress → vocabulary_lessons
```

### Sorting Implementation

Implemented client-side sorting with useMemo to avoid expensive re-renders:

```typescript
const sortedStudents = useMemo(() => {
  const sorted = [...students];
  sorted.sort((a, b) => { /* comparison logic */ });
  return sortDirection === 'asc' ? sorted : sorted.reverse();
}, [students, sortColumn, sortDirection]);
```

**Why useMemo:** Student lists can grow large (30+ students), useMemo ensures sorting only happens when students, sortColumn, or sortDirection change.

### Struggling Student Detection

Threshold of 60% accuracy aligns with educational research on comprehension:
- <60% = struggling (intervention needed)
- 60-79% = developing (monitor)
- 80%+ = proficient

Visual treatment: Orange row (`bg-neo-orange/20`) with left border accent.

### Responsive Breakpoints

| Breakpoint | Hidden Columns |
|------------|----------------|
| Mobile (<768px) | Level, Mastery, Streak, Last Active |
| Tablet (768-1024px) | Mastery, Last Active |
| Desktop (>1024px) | None (all visible) |

Essential columns (Student, XP, Accuracy) always visible.

## Integration Points

### Consumed By

- Teacher Dashboard (20-06) - Main analytics view
- Classroom Manager - Student overview section

### Provides

- StudentProgressTable export for teacher UI
- useStudentProgressMetrics hook for other analytics components
- getStudentsProgressSummary for server-side rendering

## Translation Keys Added

Added 14 keys to `education.analytics` section across 4 languages:

**English:**
- studentProgress, student, level, mastery, accuracy, streak
- lastActive, noStudents, inviteStudents, struggling
- daysAgo, today, yesterday

**Also added to:** Hebrew (he), Swedish (sv), Japanese (ja)

## Next Phase Readiness

**Ready for 20-04 (Common Mistakes Widget):** ✅
- getCommonMistakes query already exists from 20-01
- Translation keys already added
- Component can follow same pattern as StudentProgressTable

**Ready for 20-06 (Dashboard Integration):** ✅
- StudentProgressTable tested and working
- Hook provides clean API: `{ students, isLoading, error, refresh }`
- No blockers

## Known Issues

None.

## Performance Considerations

**Optimizations:**
- useMemo for sorted student list (prevents unnecessary re-sorts)
- Next.js Image for avatars (automatic optimization)
- Conditional column rendering (reduces DOM nodes on mobile)

**Potential improvements for Phase 21+:**
- Virtualized scrolling for classrooms with 100+ students
- Server-side sorting/pagination for very large datasets
- Caching strategy for student progress (stale-while-revalidate)

## Lessons Learned

1. **Date.now() purity:** React 19's purity checks caught impure Date.now() call in render. Fixed by creating date once at function start.

2. **Mock file paths matter:** NeoLoader is in `components/ui/`, not `components/`. Always verify exact paths before mocking.

3. **Duplicate imports:** ESLint enforces single import statement per module. Use `import { a, type B }` syntax.

4. **Test sort direction:** Initial sort is XP desc, clicking toggles to asc. Tests must verify BOTH states.

## Screenshots / Examples

```typescript
// Usage example
<StudentProgressTable
  classroomId="classroom-123"
  onStudentClick={(studentId) => router.push(`/student/${studentId}`)}
/>
```

**Empty state:**
- Message: "No students in this classroom yet"
- Hint: "Share the join code to invite students"

**Struggling student row:**
- Orange background with left border
- "(Needs Help)" label next to name

**Streak indicator:**
- Flame emoji (🔥) for streaks ≥3 days
- Number displays current streak

---

**Completed:** 2026-01-29
**Duration:** 13 minutes
**Commits:** 1 (b6d789cb)
**Tests Added:** 17
**Files Created:** 4
**Files Modified:** 6
