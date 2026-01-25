# Phase 14: Education Mode Complete - Research

**Researched:** 2026-01-25
**Domain:** Education Mode UI/UX - Landing Page, Student Join Flow, Lesson Assignment
**Confidence:** HIGH

## Summary

This phase completes the education section of LexiClash by creating a dedicated education landing page, implementing student classroom join flow, and enhancing the teacher/student dashboards. The research analyzed the existing codebase patterns from Phase 11 (teacher-vocabulary-builder), the main landing page architecture, and the multiplayer join flow.

The codebase already has solid infrastructure: 5 database tables with RLS policies, Supabase client functions in `lib/supabase/teacher.ts`, hooks for classroom/progress management, and basic teacher/student page routes. What's missing are the user-facing flows: an education-specific landing page, a student join classroom UI, lesson assignment from teacher side, and available lessons view for students.

**Primary recommendation:** Use `/education` as the entry point with role-based routing to teacher/student dashboards, reusing existing `ModeCard` and `JoinRoomForm` patterns for consistent UX.

## Standard Stack

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.x | Routing via `app/[locale]/` | Project standard |
| Radix UI | 1.x | Accessible tabs, dialogs, dropdowns | Already used in TeacherDashboard |
| Framer Motion | 10.x | Animations | ModeCard glow effects, transitions |
| Supabase | 2.x | Database, auth, RLS | Phase 11 schema already exists |
| react-hot-toast | 2.x | Notifications | Project standard |

### Supporting (No New Dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | existing | Icons (GraduationCap, Users, BookOpen) | All education UI |
| @radix-ui/react-tabs | existing | Tab navigation | Dashboard sections |
| zod | existing | Form validation | Join code, lesson forms |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom route groups | Parallel routes | Simpler mental model with current approach |
| Separate education layout | Shared layout | Single layout is sufficient, use conditional rendering |

**Installation:** No new packages required - all dependencies exist.

## Architecture Patterns

### Recommended URL Structure
```
app/[locale]/
├── education/
│   └── page.tsx              # Education landing - role selector
├── teacher/
│   └── page.tsx              # Teacher dashboard (existing)
├── student/
│   ├── page.tsx              # Student dashboard (existing)
│   ├── join/
│   │   └── page.tsx          # Join classroom flow
│   └── lessons/
│       └── [id]/
│           └── page.tsx      # Lesson practice (existing)
```

**Rationale:**
- `/education` serves as the entry point, similar to main landing page pattern
- Teacher/student routes remain at root level (no `/education/teacher`) for simpler URLs
- This matches the current structure and avoids breaking existing deep links

### Pattern 1: Role-Based Landing Card
**What:** Education landing page with two cards: "I'm a Teacher" and "I'm a Student"
**When to use:** Entry point to education section
**Example:**
```typescript
// Source: Derived from components/landing/ModeCard.tsx pattern
<ModeCard
  title={t('education.imATeacher')}
  description={t('education.teacherDesc')}
  href={`/${language}/teacher`}
  icon={<GraduationCap />}
  variant="cyan"
  locked={!isAuthenticated}
  lockedMessage={t('education.signInRequired')}
  onLockedClick={() => setShowAuthModal(true)}
/>
```

### Pattern 2: Join Classroom Form
**What:** Student joins classroom via 6-character join code (similar to multiplayer room join)
**When to use:** Student join flow at `/student/join`
**Example:**
```typescript
// Source: Derived from components/multiplayer/JoinRoomForm.tsx
const { joinClassroom } = useJoinClassroom();

const handleSubmit = async (joinCode: string) => {
  const result = await joinClassroom(joinCode);
  if (result.success) {
    router.push(`/${language}/student`);
  } else {
    toast.error(result.error);
  }
};
```

### Pattern 3: Available Lessons with Assignment Context
**What:** Students see lessons assigned to their classrooms, not just started lessons
**When to use:** Student dashboard lesson list
**Example:**
```typescript
// New API function needed in lib/supabase/teacher.ts
export async function getAssignedLessons(studentId: string): Promise<{
  data: Array<VocabularyLesson & { assignment: LessonAssignment | null; progress: StudentLessonProgress | null }>;
  error: { message: string } | null;
}> {
  // Query: Get lessons via classroom_memberships -> classrooms -> lesson_assignments
  // Join with student_lesson_progress to show started status
}
```

### Pattern 4: Practice-Before-Game Gate
**What:** Before joining multiplayer with a lesson, student must have minimum progress
**When to use:** Teacher-initiated classroom multiplayer games
**Implementation Approach:**
```typescript
// In multiplayer join flow, check if lesson requires practice
const checkPracticeRequirement = async (lessonId: string, studentId: string) => {
  const progress = await getStudentProgress(studentId, lessonId);
  const minMastery = 0.3; // 30% of words mastered
  const masteryRate = progress.words_mastered.length / lesson.words.length;
  return masteryRate >= minMastery;
};
```

### Anti-Patterns to Avoid
- **Duplicating landing page logic:** Reuse ModeCard, not copy it
- **Separate education auth flow:** Use existing AuthContext + role check
- **Over-engineering role system:** `profile.is_admin` for teachers is sufficient for MVP
- **Creating new database tables:** All needed tables exist from Phase 11

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Join code input | Custom input | `JoinRoomForm` pattern with validation | Edge cases: paste, uppercase, error states |
| Role-based redirects | Manual route guards | `useAuth` + early return pattern | Existing pattern in `/teacher/page.tsx` |
| Code display/copy | DIY clipboard | `RoomCodeSection` pattern | QR code, copy feedback, toast |
| Loading states | Spinner divs | `NeoLoader` component | Consistent with app style |
| Form dialogs | Custom modal | Radix Dialog | Accessibility, focus trap |

**Key insight:** The codebase has mature patterns for every UI need. Reuse components from `components/landing/`, `components/multiplayer/`, and `components/teacher/`.

## Common Pitfalls

### Pitfall 1: Auth Loading Flash
**What goes wrong:** User sees "unauthorized" message briefly before auth loads
**Why it happens:** `useAuth().loading` is true initially, causing redirect
**How to avoid:** Check `if (authLoading) return <NeoLoader />` before checking `isAuthenticated`
**Warning signs:** Flash of redirect on page load
**Verified in:** `app/[locale]/teacher/page.tsx` lines 29-38 show correct pattern

### Pitfall 2: Role Confusion (Teacher vs Admin)
**What goes wrong:** Code checks wrong field for teacher access
**Why it happens:** Schema uses `profile.is_admin` for teachers, not a separate `user_role`
**How to avoid:** Use `profile?.is_admin === true` consistently
**Warning signs:** Teachers can't access teacher dashboard
**Verified in:** `app/[locale]/teacher/page.tsx` line 18: `const isTeacher = profile?.is_admin === true;`

### Pitfall 3: Missing Classroom Membership Check
**What goes wrong:** Student sees lessons from classrooms they haven't joined
**Why it happens:** Query doesn't filter by classroom_memberships
**How to avoid:** Always join through classroom_memberships table
**Warning signs:** Student sees unrelated lessons

### Pitfall 4: Join Code Case Sensitivity
**What goes wrong:** Student can't join with lowercase code
**Why it happens:** Database stores uppercase, user types lowercase
**How to avoid:** `.toUpperCase()` on input (already done in `joinClassroom`)
**Warning signs:** "Invalid join code" errors
**Verified in:** `lib/supabase/teacher.ts` line 255: `.eq('join_code', joinCode.toUpperCase())`

### Pitfall 5: RTL Layout Breaking
**What goes wrong:** Hebrew UI elements misaligned
**Why it happens:** Missing RTL conditionals
**How to avoid:** Use `isRTL && 'rtl'` class pattern, `isRTL ? 'ml-2' : 'mr-2'` for icons
**Warning signs:** Icons on wrong side, text alignment issues
**Verified in:** All existing teacher components use this pattern

## Code Examples

### Education Landing Page Structure
```typescript
// Source: Pattern from components/landing/LandingView.tsx
'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import ModeCard from '@/components/landing/ModeCard';
import AuthModal from '@/components/auth/AuthModal';
import Header from '@/components/Header';
import { GraduationCap, BookOpen } from 'lucide-react';

export default function EducationLandingPage() {
  const { t, language } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="flex-1 flex flex-col bg-neo-navy">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <h1 className="text-3xl font-neo-display text-neo-white mb-8">
          {t('education.landing.title')}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
          <ModeCard
            title={t('education.imATeacher')}
            description={t('education.teacherDesc')}
            href={`/${language}/teacher`}
            icon={<GraduationCap className="w-6 h-6" />}
            variant="cyan"
            loading={authLoading}
            locked={!isAuthenticated}
            lockedMessage={t('education.signInRequired')}
            onLockedClick={() => setShowAuthModal(true)}
          />
          <ModeCard
            title={t('education.imAStudent')}
            description={t('education.studentDesc')}
            href={`/${language}/student`}
            icon={<BookOpen className="w-6 h-6" />}
            variant="pink"
          />
        </div>
      </main>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
```

### Student Join Classroom Component
```typescript
// Source: Pattern from components/multiplayer/JoinRoomForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJoinClassroom } from '@/hooks/useClassroom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardPaste, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export default function JoinClassroomForm() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { joinClassroom } = useJoinClassroom();
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setJoinCode(text.trim().toUpperCase().slice(0, 6));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    const result = await joinClassroom(joinCode);
    setIsJoining(false);

    if (result.success) {
      toast.success(t('student.classroom.joined'));
      router.push(`/${language}/student`);
    } else {
      toast.error(result.error || t('student.classroom.invalidCode'));
    }
  };

  return (
    <Card className="border-3 border-neo-black shadow-hard">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="h-14 text-xl text-center font-mono tracking-widest uppercase"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handlePaste}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <ClipboardPaste className="w-4 h-4" />
            </Button>
          </div>
          <Button
            type="submit"
            disabled={isJoining || joinCode.length !== 6}
            className="w-full h-14 bg-neo-cyan text-neo-black font-bold"
          >
            <LogIn className="mr-2" />
            {isJoining ? t('common.loading') : t('student.classroom.join')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### Lesson Assignment API Function
```typescript
// Source: Pattern from lib/supabase/teacher.ts
export interface LessonAssignment {
  id: string;
  lesson_id: string;
  classroom_id: string;
  due_date: string | null;
  created_at: string;
}

/**
 * Assign a lesson to a classroom
 */
export async function assignLesson(
  lessonId: string,
  classroomId: string,
  dueDate?: string
): Promise<{ data: LessonAssignment | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('lesson_assignments')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('classroom_id', classroomId)
      .maybeSingle();

    if (existing) {
      return { data: null, error: { message: 'Lesson already assigned to this classroom' } };
    }

    const { data, error } = await supabase
      .from('lesson_assignments')
      .insert({
        lesson_id: lessonId,
        classroom_id: classroomId,
        due_date: dueDate || null,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return { data: null, error: { message: error } };
  }
}

/**
 * Get lessons assigned to student's classrooms
 */
export async function getStudentAssignedLessons(
  studentId: string
): Promise<{ data: Array<VocabularyLesson & { assignment: LessonAssignment }>; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    // Get student's classroom memberships
    const { data: memberships, error: memberError } = await supabase
      .from('classroom_memberships')
      .select('classroom_id')
      .eq('student_id', studentId);

    if (memberError || !memberships?.length) {
      return { data: [], error: memberError ? { message: memberError.message } : null };
    }

    const classroomIds = memberships.map(m => m.classroom_id);

    // Get assignments for those classrooms
    const { data: assignments, error: assignError } = await supabase
      .from('lesson_assignments')
      .select(`
        *,
        vocabulary_lessons (*)
      `)
      .in('classroom_id', classroomIds)
      .order('created_at', { ascending: false });

    if (assignError) {
      return { data: [], error: { message: assignError.message } };
    }

    // Transform to expected shape
    const lessons = (assignments || []).map(a => ({
      ...a.vocabulary_lessons,
      assignment: {
        id: a.id,
        lesson_id: a.lesson_id,
        classroom_id: a.classroom_id,
        due_date: a.due_date,
        created_at: a.created_at,
      },
    }));

    return { data: lessons, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return { data: [], error: { message: error } };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded teacher check | `profile.is_admin` field | Phase 11 | Single source of truth for roles |
| Manual join code generation | Database trigger | Phase 11 migration 056 | Consistent 6-char uppercase codes |
| localStorage progress | Supabase `student_lesson_progress` | Phase 11 | Cross-device sync, teacher visibility |

**Deprecated/outdated:**
- Direct Supabase queries in components: Use hooks (`useClassrooms`, `useStudentProgress`)
- Non-RTL aware styling: Always use conditional RTL classes

## Open Questions

1. **Practice Requirement Threshold**
   - What we know: Students should practice vocabulary before joining lesson-based games
   - What's unclear: Exact mastery percentage required (30%? 50%?)
   - Recommendation: Start with 30% (configurable per lesson later)

2. **Student List Management Scope**
   - What we know: Teachers need to see who's in their classrooms
   - What's unclear: Should teachers be able to remove students?
   - Recommendation: Phase 14 shows list only; removal can be Phase 15 enhancement

3. **Education Mode Entry from Main Landing**
   - What we know: Education landing exists at `/education`
   - What's unclear: Should there be a visible link from main landing page?
   - Recommendation: Add subtle "For Teachers" link in footer or header for discoverability

## Sources

### Primary (HIGH confidence)
- `app/[locale]/teacher/page.tsx` - Auth guard pattern
- `components/landing/LandingView.tsx` - Landing page structure
- `components/landing/ModeCard.tsx` - Card component with locked state
- `components/multiplayer/JoinRoomForm.tsx` - Join flow pattern
- `lib/supabase/teacher.ts` - Database API layer
- `hooks/useClassroom.ts` - Classroom hooks
- `hooks/useStudentProgress.ts` - Progress tracking hooks

### Secondary (MEDIUM confidence)
- Database schema from Phase 11 migration (5 tables, 27 RLS policies)
- Existing translation keys in `translations/` directory

### Tertiary (LOW confidence)
- None - all patterns derived from verified codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use
- Architecture: HIGH - Patterns verified from existing codebase
- Pitfalls: HIGH - Found in production code during analysis

**Research date:** 2026-01-25
**Valid until:** 60 days (stable patterns, no external dependencies)
