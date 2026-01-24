# Phase 11: Teacher Vocabulary Builder - Research

**Researched:** 2026-01-24
**Domain:** Educational platform features, role-based access, vocabulary management
**Confidence:** HIGH

## Summary

This phase introduces a Teacher Vocabulary Builder feature enabling teachers to create custom vocabulary lessons from multiplayer games, with student performance tracking. The research examines the existing LexiClash architecture and identifies patterns for implementing role-based access (teacher vs student), vocabulary lesson management, word integration into game grids, and performance dashboards.

The codebase already has solid foundations:
- Supabase authentication with `is_admin` boolean on profiles (can extend to `user_role` enum)
- Player word tracking (`player_words` table)
- Progress tracking patterns (`player_progression`, `level_completions` tables)
- Word validation via dictionary module and `boggleSolver.ts`
- Recharts 3.6.0 already installed for dashboards
- Host/player role separation in multiplayer

**Primary recommendation:** Extend existing profiles with a `user_role` enum (student/teacher/admin), create vocabulary lesson tables with RLS policies for teacher-student relationships, add word selection UI to host view, and build a teacher dashboard using existing Recharts installation.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase | - | Database, auth, RLS | Already used for auth, profiles, game data |
| Recharts | 3.6.0 | Dashboard charts | Already installed, React-native, declarative |
| Radix UI | - | Accessible UI components | Design system already uses it |
| Framer Motion | - | Animations | Design system already uses it |
| Zod | - | Schema validation | Already used for validation |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Socket.IO | 4.8.1 | Real-time word selection | Live sync during games |
| React Query | - | Data fetching | Dashboard data caching |

### No New Dependencies Required
The existing stack covers all needs. Recharts handles charting, Supabase handles auth/data/RLS, and the word validation system exists.

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Database Schema

```sql
-- Teacher-Student Relationships
CREATE TABLE classroom_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(classroom_id, student_id)
);

CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    join_code TEXT UNIQUE NOT NULL, -- 6 char code for students to join
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vocabulary Lessons
CREATE TABLE vocabulary_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    words JSONB NOT NULL DEFAULT '[]', -- [{word, definition?, canIntegrate}]
    is_public BOOLEAN DEFAULT FALSE, -- Allow sharing between teachers
    source_game_code TEXT, -- Original multiplayer game this was created from
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lesson Assignments
CREATE TABLE lesson_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Performance on Lessons
CREATE TABLE student_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES lesson_assignments(id) ON DELETE SET NULL,
    words_attempted JSONB DEFAULT '{}', -- {word: {attempts, correct, lastAttemptAt}}
    words_mastered TEXT[] DEFAULT '{}', -- Words with 3+ correct in a row
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(student_id, lesson_id)
);
```

### Recommended Project Structure
```
components/
├── teacher/
│   ├── TeacherDashboard.tsx     # Main dashboard view
│   ├── ClassroomManager.tsx     # Create/manage classrooms
│   ├── LessonBuilder.tsx        # Create/edit vocabulary lessons
│   ├── LessonWordSelector.tsx   # Select words during/after game
│   ├── StudentProgressView.tsx  # View individual student progress
│   └── ClassProgressChart.tsx   # Recharts visualization
├── student/
│   ├── StudentLessonView.tsx    # View assigned lessons
│   └── LessonPractice.tsx       # Practice words from lessons
└── multiplayer/
    └── HostWordSelector.tsx     # Word selection overlay for host

hooks/
├── useTeacherDashboard.ts       # Teacher data fetching
├── useClassroom.ts              # Classroom management
├── useVocabularyLesson.ts       # Lesson CRUD
└── useStudentProgress.ts        # Progress tracking
```

### Pattern 1: Role-Based Access via Profiles Extension
**What:** Extend existing `is_admin` boolean to a `user_role` enum
**When to use:** For distinguishing teacher vs student capabilities
**Example:**
```sql
-- Source: Supabase RLS patterns
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

ALTER TABLE profiles ADD COLUMN user_role user_role DEFAULT 'student';

-- Migrate existing admins
UPDATE profiles SET user_role = 'admin' WHERE is_admin = TRUE;
```

### Pattern 2: Teacher-Student RLS with Function
**What:** RLS policy using helper function for classroom membership
**When to use:** For teachers to access their students' data
**Example:**
```sql
-- Source: Context7 Supabase RLS patterns
CREATE OR REPLACE FUNCTION is_teacher_of_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1
    FROM classroom_memberships cm
    JOIN classrooms c ON c.id = cm.classroom_id
    WHERE cm.student_id = p_student_id
    AND c.teacher_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Then use in policy:
CREATE POLICY "Teachers can view student progress"
    ON student_lesson_progress FOR SELECT
    USING (
        auth.uid() = student_id -- Student can see own
        OR is_teacher_of_student(student_id) -- Teacher can see students
    );
```

### Pattern 3: Word Integration Check
**What:** Determine if a word can be embedded in future grids
**When to use:** To show visual indicator during word selection
**Example:**
```typescript
// Uses existing boggleSolver.ts pattern
import { isDictionaryWord } from '@/backend/dictionary';

interface WordIntegrationCheck {
  word: string;
  canIntegrate: boolean;
  reason?: string;
}

function checkWordIntegration(word: string, language: Language): WordIntegrationCheck {
  const normalized = word.toLowerCase().trim();

  // Check if in official dictionary (can be embedded)
  const inDictionary = isDictionaryWord(normalized, language);

  // Word length constraints for grid embedding
  const validLength = normalized.length >= 3 && normalized.length <= 12;

  return {
    word: normalized,
    canIntegrate: inDictionary && validLength,
    reason: !inDictionary
      ? 'Not in dictionary - will be valid but not embeddable'
      : !validLength
        ? 'Word too long for grid embedding'
        : undefined
  };
}
```

### Anti-Patterns to Avoid
- **Putting word lists in profiles table:** Create dedicated tables instead
- **Skipping RLS on education tables:** Teacher/student data must be protected
- **Storing progress in localStorage:** Use database for cross-device sync
- **Coupling lesson creation to multiplayer flow:** Allow standalone lesson creation too

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress charts | Custom SVG/canvas | Recharts (installed) | Accessible, maintained, responsive |
| Join codes | UUID substrings | nanoid with alphabet | Collision-resistant, user-friendly |
| Real-time updates | Polling | Supabase Realtime | Built-in, efficient |
| Form validation | Manual checks | Zod + React Hook Form | Type-safe, tested |
| Date handling | Manual parsing | date-fns (installed) | Edge cases, i18n |

**Key insight:** The codebase already has patterns for progress tracking (adventure mode), user roles (admin), and real-time sync (multiplayer). Reuse these patterns rather than inventing new approaches.

## Common Pitfalls

### Pitfall 1: Forgetting Teacher-Student Privacy
**What goes wrong:** Students can see other students' progress, teachers can see non-classroom students
**Why it happens:** RLS policies only check `auth.uid()` without relationship validation
**How to avoid:** Always use helper functions like `is_teacher_of_student()` in RLS
**Warning signs:** Any direct user_id comparisons without classroom membership check

### Pitfall 2: Word Integration Confusion
**What goes wrong:** Teachers expect all selected words to appear in future grids
**Why it happens:** Community-approved words aren't in the trie used for grid generation
**How to avoid:** Clear visual indicator (checkmark vs warning) showing integration status
**Warning signs:** No UI distinction between dictionary words and community words

### Pitfall 3: Blocking Game Flow for Selection
**What goes wrong:** Word selection UI interrupts active gameplay
**Why it happens:** Selection appears over the game grid during play
**How to avoid:** Word selection happens post-game in results screen, or as overlay on sidebar
**Warning signs:** Any modal or overlay that blocks `GridComponent` during `gameState: 'playing'`

### Pitfall 4: Massive Progress Queries
**What goes wrong:** Teacher dashboard takes 10+ seconds to load with many students
**Why it happens:** Fetching all progress for all students in all lessons at once
**How to avoid:** Paginate by classroom, use aggregate views, consider materialized views
**Warning signs:** Single query with no LIMIT joining 3+ tables

## Code Examples

Verified patterns from existing codebase:

### Progress Tracking Pattern (from adventure mode)
```typescript
// Source: /supabase/migrations/049_adventure_mode.sql
// Pattern: User-specific progress with UPSERT

const updateProgress = async (studentId: string, lessonId: string, wordAttempt: WordAttempt) => {
  const { data, error } = await supabase
    .from('student_lesson_progress')
    .upsert({
      student_id: studentId,
      lesson_id: lessonId,
      words_attempted: { [wordAttempt.word]: wordAttempt },
    }, {
      onConflict: 'student_id,lesson_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  return { data, error };
};
```

### Recharts Dashboard Pattern (verified from Context7)
```tsx
// Source: Context7 Recharts documentation
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StudentProgressChartProps {
  data: Array<{
    date: string;
    wordsLearned: number;
    accuracy: number;
  }>;
}

function StudentProgressChart({ data }: StudentProgressChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="wordsLearned" stroke="#8884d8" />
        <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Host Word Selection Socket Event
```typescript
// Pattern following existing handlers in backend/handlers/
// Source: gameLifecycleHandler.ts patterns

interface SelectVocabularyWordPayload {
  word: string;
  include: boolean; // true = add to lesson, false = remove
}

socket.on('selectVocabularyWord', (data: SelectVocabularyWordPayload) => {
  const gameCode = getGameBySocketId(socket.id);
  const game = getGame(gameCode);

  if (!game || game.hostSocketId !== socket.id) {
    emitError(socket, 'Only host can select vocabulary words');
    return;
  }

  if (game.gameState !== 'finished') {
    emitError(socket, 'Can only select words after game ends');
    return;
  }

  // Update in-memory selection (persisted when lesson is saved)
  if (!game.selectedVocabulary) game.selectedVocabulary = new Set();

  if (data.include) {
    game.selectedVocabulary.add(data.word);
  } else {
    game.selectedVocabulary.delete(data.word);
  }

  socket.emit('vocabularySelectionUpdated', {
    selectedWords: Array.from(game.selectedVocabulary)
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single admin bool | Role enum | 2024+ | Enables teacher/student distinction |
| localStorage progress | Supabase + Realtime | Already current | Cross-device sync, offline support |
| Custom charts | Recharts/Tremor | 2023+ | Accessible, responsive, maintained |

**Deprecated/outdated:**
- N/A - This is a new feature, no legacy approaches exist in codebase

## Open Questions

Things that couldn't be fully resolved:

1. **Multiple Classrooms per Teacher**
   - What we know: Schema supports multiple classrooms
   - What's unclear: UX for managing many classrooms (dropdown? tabs? separate page?)
   - Recommendation: Start with single classroom view, add switcher if needed

2. **Lesson Sharing Between Teachers**
   - What we know: `is_public` flag exists in schema
   - What's unclear: Discovery mechanism, moderation, attribution
   - Recommendation: Phase 1: private only; Phase 2: add sharing if requested

3. **Offline Mode for Students**
   - What we know: Current app requires connection
   - What's unclear: Whether students need offline practice
   - Recommendation: Defer to Phase 2 based on feedback

4. **Requirements EDU-01 through EDU-04**
   - What we know: Referenced in ROADMAP but not yet defined in REQUIREMENTS.md
   - What's unclear: Specific acceptance criteria for each requirement
   - Recommendation: Define requirements before planning begins

## Sources

### Primary (HIGH confidence)
- `/supabase/supabase` (Context7) - RLS multi-tenant patterns
- `/recharts/recharts` (Context7) - Dashboard chart patterns
- Existing codebase:
  - `/supabase/migrations/001_initial_schema.sql` - Profiles structure
  - `/supabase/migrations/010_admin_and_analytics.sql` - Admin role pattern
  - `/supabase/migrations/049_adventure_mode.sql` - Progress tracking pattern
  - `/contexts/auth/authTypes.ts` - Auth context structure
  - `/backend/modules/boggleSolver.ts` - Word validation/trie patterns
  - `/backend/handlers/gameLifecycleHandler.ts` - Socket handler patterns

### Secondary (MEDIUM confidence)
- VocabClass, Vocabulary.com features - Educational app patterns (web search)

### Tertiary (LOW confidence)
- General educational app database patterns - Not library-specific documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used
- Architecture: HIGH - Patterns follow existing codebase conventions
- Pitfalls: HIGH - Based on direct codebase analysis

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable patterns)
