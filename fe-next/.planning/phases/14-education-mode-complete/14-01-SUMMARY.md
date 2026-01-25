---
phase: 14-education-mode-complete
plan: 01
subsystem: education-landing
tags: [education, landing-page, authentication, role-selection, api, supabase]
requires: [11-teacher-vocabulary-builder]
provides:
  - education-landing-page
  - lesson-assignment-api
affects: [14-02, 14-03, 14-04]
tech-stack:
  added: []
  patterns:
    - role-based-landing-page
    - locked-card-pattern
    - lesson-assignment-queries
key-files:
  created:
    - app/[locale]/education/page.tsx
  modified:
    - lib/supabase/teacher.ts
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
decisions:
  - id: edu-landing-001
    decision: Separate education landing from main game landing
    rationale: Clear separation of educational vs recreational use cases
    impact: UX, Navigation
  - id: edu-landing-002
    decision: Teacher access requires authentication, Student access is public
    rationale: Teachers need accounts for classroom management, students can browse before joining
    impact: Authentication, Access Control
  - id: edu-landing-003
    decision: Use ModeCard component with locked state for teacher access
    rationale: Reuses existing landing pattern, provides clear visual feedback
    impact: UI Consistency
duration: 6m
completed: 2026-01-25
---

# Phase 14 Plan 01: Education Landing & Assignment API Summary

**One-liner:** Entry point for education mode with role selection cards and lesson assignment API functions

## What Was Built

### Education Landing Page (`/education` route)
- **Role Selection Interface**: Two ModeCard components for Teacher and Student roles
- **Teacher Card** (Cyan variant):
  - Locked when user not authenticated
  - Shows "Sign in required" message
  - Opens AuthModal when clicked while locked
  - Links to `/teacher` when authenticated
  - Icon: GraduationCap
- **Student Card** (Pink variant):
  - Always accessible (no authentication required)
  - Links to `/student`
  - Icon: BookOpen
- **Neo-Brutalist Styling**: max-w-2xl container, grid layout, dark navy background
- **Header Integration**: Full Header component with navigation

### Lesson Assignment API Functions
- **`assignLesson()`**: Assigns a vocabulary lesson to a classroom
  - Parameters: lessonId, classroomId, teacherId, optional dueDate
  - Creates record in `lesson_assignments` table
  - Returns LessonAssignment with error handling
- **`getStudentAssignedLessons()`**: Fetches all lessons assigned to a student
  - Queries via classroom membership
  - Includes vocabulary_lessons join for full lesson data
  - Returns array of LessonAssignment with nested lesson details
- **LessonAssignment Interface**: New type definition for assignment records

### Translations
- **Landing Section**: Added to all 4 languages
  - English: "Education Mode", "I'm a Teacher", "I'm a Student"
  - Hebrew: "מצב חינוכי", "אני מורה", "אני תלמיד"
  - Swedish: "Utbildningsläge", "Jag är lärare", "Jag är elev"
  - Japanese: "教育モード", "私は教師です", "私は生徒です"
- **Keys Added**: title, teacher, teacherDesc, student, studentDesc, signInRequired

## Key Commits

1. **be7c747**: Add education landing translation keys
   - Landing section in education translations
   - All 4 languages with localized role names
2. **41eefc5**: Create education landing page with role selection
   - Teacher card (locked, auth-gated)
   - Student card (public access)
   - AuthModal integration
3. **a487e11**: Add lesson assignment API functions
   - assignLesson() and getStudentAssignedLessons()
   - LessonAssignment interface
   - Supabase join syntax for lesson data

## Technical Decisions

### Role-Based Access Pattern
- **Teacher access is auth-gated** to ensure classroom owners are tracked
- **Student access is public** to allow exploration before joining
- **Locked card pattern** provides clear visual feedback and call-to-action

### API Design
- **Functions follow existing teacher.ts patterns**: Same error handling, logger usage, return types
- **Supabase join syntax**: `.select('*, vocabulary_lessons(*)')` fetches nested lesson data
- **Classroom-based assignment**: Lessons assigned to classrooms, students inherit via membership

## Files Created/Modified

### Created
- `app/[locale]/education/page.tsx` (67 lines)
  - Education landing component
  - Role selection with Teacher/Student cards
  - AuthModal integration for teacher sign-in

### Modified
- `lib/supabase/teacher.ts` (+96 lines)
  - LessonAssignment interface
  - assignLesson() function
  - getStudentAssignedLessons() function
- `translations/en.js` (+7 lines)
- `translations/he.js` (+7 lines)
- `translations/sv.js` (+7 lines)
- `translations/ja.js` (+7 lines)

## Dependencies

### Requires
- Phase 11 Teacher Vocabulary Builder (database schema, RLS policies)
- ModeCard component (from landing system)
- AuthModal component (from auth system)
- useAuth and useLanguage contexts

### Provides
- `/education` landing route for role selection
- assignLesson() API for classroom lesson assignment
- getStudentAssignedLessons() API for student lesson retrieval

### Affects Future Plans
- **14-02**: Student view will use `/education` as entry point
- **14-03**: Teacher dashboard will use assignLesson() to assign lessons
- **14-04**: Student practice will use getStudentAssignedLessons() to fetch assignments

## Testing Notes

### Manual Verification
- [x] Navigate to `/en/education` - page renders
- [x] Teacher card shows locked when not signed in
- [x] Clicking locked teacher card opens AuthModal
- [x] Student card navigates to `/student` without auth
- [x] Build passes with new route and functions
- [x] Translation keys present in all 4 languages

### Automated Tests
- No tests added (UI route, API functions are data layer queries)
- Future: Could add integration tests for assignment flow

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Status: ✅ Ready for 14-02 (Student Join Classroom)**

### Blockers
None.

### Dependencies Met
- [x] Education landing route exists at `/education`
- [x] Translation keys added for landing section
- [x] assignLesson() and getStudentAssignedLessons() exported from teacher.ts
- [x] Build passes with all changes

### What's Next (14-02)
- Create student join classroom page
- Implement join code input and validation
- Add student classroom listing
