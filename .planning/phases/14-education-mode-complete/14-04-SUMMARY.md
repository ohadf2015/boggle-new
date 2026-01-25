---
phase: 14
plan: 04
subsystem: education-student
tags: [student-dashboard, assignments, progress-tracking, react-hooks, translations]
requires:
  - 14-01  # Lesson assignment API
  - 14-02  # Student join classroom flow
  - 11-07  # Student lesson view foundation
provides:
  - Enhanced student dashboard showing assigned lessons
  - Status-based lesson display (assigned/started/completed)
  - Visual distinction between lesson states
affects:
  - Student practice flow will need to handle assigned lessons
  - Future notification system can alert on new assignments
tech-stack:
  added: []
  patterns:
    - Combined data fetching (assignments + progress)
    - Status-based UI rendering
    - Deduplication logic for overlapping datasets
key-files:
  created:
    - hooks/__tests__/useStudentProgress.test.ts
  modified:
    - hooks/useStudentProgress.ts
    - components/student/StudentLessonView.tsx
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
decisions: []
metrics:
  duration: 7 minutes
  completed: 2026-01-25
---

# Phase 14 Plan 04: Student Assignment Visibility Summary

**One-liner:** Student dashboard now shows assigned lessons alongside in-progress lessons with clear status indicators

## What Was Built

### Enhanced useStudentProgress Hook
- **Dual data fetching**: Fetches both `getStudentAssignedLessons()` and `getStudentProgress()` in parallel
- **StudentLesson type**: New type with `status: 'assigned' | 'started' | 'completed'`
- **Smart combination logic**: Merges assigned and progress data without duplication
- **Status determination**:
  - `assigned`: Lesson assigned but no progress record exists
  - `started`: Progress exists, not completed
  - `completed`: Progress has `completed_at` timestamp
- **Automatic sorting**: assigned → started → completed (priority order)
- **Backward compatibility**: Keeps `progress` field for legacy consumers
- **Test coverage**: 6 comprehensive tests covering all scenarios

### Updated StudentLessonView Component
- **Status-aware rendering**: Different UI for each status
  - **Assigned**: NEW badge (cyan), Start button, word count only
  - **Started**: Progress bar (cyan), Continue button, mastery stats
  - **Completed**: Award icon, progress bar (yellow), Review button
- **Enhanced empty state**: Added "Join a Classroom" CTA button
- **Button styling**: Cyan for Start, pink for Continue/Review
- **Lesson name display**: Uses actual lesson name instead of ID prefix
- **Classroom context**: Shows assigned date for assigned lessons

### Translations
Added 4 new keys across 4 languages (en, he, sv, ja):
- `student.lessons.new`: Badge text (NEW/חדש/NY/新規)
- `student.lessons.start`: Button for assigned lessons
- `student.lessons.continue`: Button for in-progress lessons
- `student.lessons.empty.joinClassroom`: CTA button text

## Technical Decisions

None - implementation followed existing patterns from Phase 11.

## Deviations from Plan

None - plan executed exactly as written.

## Testing

### Hook Tests (6/6 passing)
- ✅ Fetches both assigned and progress data in parallel
- ✅ Marks assigned-only lessons with status "assigned"
- ✅ Marks started lessons with status "started"
- ✅ Marks completed lessons with status "completed"
- ✅ Sorts lessons by status priority
- ✅ Deduplicates lessons appearing in both datasets

### Manual Testing Checklist
- [ ] Assigned lesson shows NEW badge
- [ ] Start button navigates to practice page
- [ ] In-progress lesson shows progress bar
- [ ] Completed lesson shows yellow progress bar + Award icon
- [ ] Empty state shows "Join a Classroom" button
- [ ] RTL layout works for Hebrew

## Performance Considerations

- **Parallel fetching**: Both API calls execute simultaneously (not sequential)
- **O(n) deduplication**: Uses Map for O(1) lookups during merge
- **Minimal re-renders**: useMemo in component prevents unnecessary sorts

## Known Limitations

- **No due date display**: Due dates exist in database but not shown in UI (future enhancement)
- **No classroom name**: Lessons don't show which classroom assigned them (requires join with classrooms table)

## Next Phase Readiness

### Blockers
None

### Concerns
1. **Practice page routing**: Student clicking "Start" on assigned lesson needs to handle no-progress-yet scenario
2. **Lesson deletion**: If teacher deletes lesson while student has progress, need graceful handling

### Recommendations
1. **Add classroom context**: Show which classroom assigned each lesson
2. **Add due dates**: Display due dates when set by teacher
3. **Add notifications**: Alert students when new lessons assigned

## Dependencies

### Used From Previous Phases
- `getStudentAssignedLessons()` from lib/supabase/teacher.ts (14-01)
- `getStudentProgress()` from lib/supabase/teacher.ts (11-03)
- `StudentLessonView` foundation from Phase 11-07
- Student join flow from 14-02

### Provided to Next Phases
- `StudentLesson` type with status field
- Enhanced `useStudentProgress` hook with `lessons` field
- Translation keys for assignment UI

## Files Changed

### Created (1 file)
- `hooks/__tests__/useStudentProgress.test.ts` (356 lines) - TDD tests for enhanced hook

### Modified (6 files)
- `hooks/useStudentProgress.ts` (+100 lines) - Added assignment fetching, StudentLesson type, merge logic
- `components/student/StudentLessonView.tsx` (+40 lines) - Status-based rendering, new buttons/badges
- `translations/en.js` (+4 keys) - English translations
- `translations/he.js` (+4 keys) - Hebrew translations
- `translations/sv.js` (+4 keys) - Swedish translations
- `translations/ja.js` (+4 keys) - Japanese translations

## Commits

1. **b7b63b0d** - `feat(14-04): enhance useStudentProgress hook to include assigned lessons`
   - StudentLesson type with status field
   - Parallel fetching of assignments and progress
   - Deduplication and sorting logic
   - 6 comprehensive tests

2. **69f53b75** (earlier commit from 14-05 merged in) - Unrelated to this plan

3. **465621c9** - `feat(14-04): add translation keys for enhanced student view`
   - 4 keys × 4 languages = 16 translation entries
   - NEW badge, Start/Continue buttons, Join CTA

## Success Criteria

- [x] useStudentProgress returns lessons with status field
- [x] StudentLessonView displays assigned + started + completed lessons
- [x] Visual distinction between lesson states (badges, buttons, progress bars)
- [x] Empty state has "Join a Classroom" CTA
- [x] All translations present in 4 languages (en, he, sv, ja)

## Conclusion

Phase 14 Plan 04 successfully enhanced the student dashboard to show assigned lessons. Students can now see all lessons their teacher has assigned, even before starting practice. The implementation uses efficient parallel data fetching, smart deduplication, and clear visual indicators for lesson status. The hook maintains backward compatibility while providing the new `lessons` field for enhanced UI. All 6 tests pass, translations are complete for 4 languages, and the feature is ready for integration with the practice flow.
