# Architecture Integration: v1.1 Features

**Project:** LexiClash v1.1 Milestone
**Researched:** 2026-01-25
**Confidence:** HIGH

## Executive Summary

This document maps how v1.1 features (boss battles, chain combos, education gamification, student analytics) integrate with existing LexiClash architecture. All features build on established patterns with minimal structural changes.

**Key Integration Points:**
- **Boss battles**: Extend existing Adventure Mode level system (already has boss support via `bossConfig.ts`)
- **Chain combos**: Enhance existing scoring engine and tile state machine
- **Education gamification**: Extend existing education database schema (migrations 056, 058)
- **Analytics**: Build on existing `practice_sessions` tracking table

**Build Order Priority:**
1. Chain combos (foundation for scoring improvements)
2. Boss battle refinements (state machine + UI polish)
3. Education XP system (leverage combo scoring)
4. Analytics dashboards (consume existing data)

---

## 1. Boss Battle Architecture

### Current State (v1.0)

**Already Implemented:**
- `lib/adventure/bossConfig.ts`: Complete boss definitions for 10 worlds
- `types/boss.ts`: BossConfig, BossTwistMechanic, BossTaunts interfaces
- `hooks/useBossMechanics.ts`: Boss state management hook
- Components: `BossIntro.tsx`, `BossDialogue.tsx`, `BossVictory.tsx`
- Integration: `AdventureGame.tsx` has boss intro/taunt/victory flows

**Boss Twist Mechanics (Defined):**
```typescript
type BossTwistType =
  | 'popQuiz'          // Ms. Grammar - Random requirements
  | 'hiveMind'         // Spelling Bee - Sticky tiles
  | 'synonymShift'     // Prof. Thesaurus - Synonym bonuses
  | 'idiomIslands'     // Captain Metaphor - Idiom challenges
  | 'compoundMerge'    // Baron Buildaword - Compound words
  | 'anagramScramble'  // Puzzle Master - Anagram hints
  | 'palindromeMirror' // Reflection King - Palindrome bonuses
  | 'neologismNebula'  // Cosmic Wordsmith - Rare word bonuses
  | 'polyglotPeaks'    // Linguist Sage - Multi-language
  | 'allMechanics'     // Lexicon Dragon - Combined mechanics
```

### Integration Needs (v1.1)

#### 1.1 State Machine Enhancement

**Current:** `hooks/useBossMechanics.ts` manages boss state reactively
**Enhancement:** Add state machine for boss phase transitions

```typescript
// New: lib/adventure/bossStateMachine.ts
type BossPhase = 'intro' | 'phase1' | 'phase2' | 'enraged' | 'victory' | 'defeat';
type BossEvent = 'START' | 'DAMAGE' | 'LOW_HP' | 'COMPLETE' | 'TIMEOUT';

interface BossState {
  phase: BossPhase;
  hp: number;           // 0-100 (visual only, not damage-based)
  damageDealt: number;  // Tracks progress via objectives
  enrageThreshold: 66;  // Trigger at 66% objective progress
}
```

**Integration:** `useAdventureGame.ts` already has state reducer pattern
- Add boss state to existing `GameState` interface
- Trigger phase transitions on objective progress updates
- Boss "HP" = visual representation of objective completion (66% = enraged)

#### 1.2 Mechanic Implementation

**Current:** `useBossMechanics.checkWord()` validates boss requirements
**Enhancement:** Full mechanic implementations needed

| Mechanic | Implementation Location | Integration Point |
|----------|------------------------|-------------------|
| popQuiz | `lib/adventure/bossMechanics/popQuiz.ts` | `useAdventureGame` word validation |
| hiveMind | `lib/adventure/bossMechanics/hiveMind.ts` | Tile state (sticky tiles) |
| synonymShift | `lib/adventure/bossMechanics/synonymShift.ts` | Word validation + scoring |
| compoundMerge | `lib/adventure/bossMechanics/compoundMerge.ts` | Word validation logic |
| anagramScramble | `lib/adventure/bossMechanics/anagramScramble.ts` | Hint system integration |

**Pattern:** Each mechanic exports:
```typescript
export interface BossMechanicImplementation {
  checkWord: (word: string, gameState: GameState) => BossMechanicResult;
  modifyTileState?: (tiles: TileState[][], phase: BossPhase) => TileState[][];
  getPhaseTransition?: (progress: number) => BossPhase | null;
}
```

#### 1.3 UI Components (Already Built)

**No changes needed** — existing components support all mechanics:
- `BossIntro`: Shows boss character + mechanic explanation
- `BossDialogue`: Taunt display with position control
- `BossVictory`: Victory/defeat screen with stars

**Enhancement:** Add boss HP bar to `AdventureGame.tsx` header
```tsx
// New component: components/adventure/BossHealthBar.tsx
<BossHealthBar
  currentHp={bossState.hp}
  phase={bossState.phase}
  enraged={bossState.phase === 'enraged'}
/>
```

#### 1.4 Database Schema

**No new tables needed** — uses existing adventure progression tables:
- `adventure_level_completions`: Tracks boss victories (already exists)
- `adventure_level_attempts`: Tracks boss attempts for analytics (migration 059)

---

## 2. Chain/Combo Architecture

### Current State (v1.0)

**Combo System (Multiplayer):**
- `shared/utils/scoring.ts`: `getComboBonus()`, `getComboMultiplier()`
- `contexts/InGameContext.tsx`: Tracks combo count per player
- Formula: Flat bonus scaling with word length (not multiplier-based)

**Adventure Mode Combo:**
- `hooks/useAdventureGame.ts`: Tracks `comboCount` in game state
- Resets after 3-second timeout (`COMBO_TIMEOUT_MS`)
- Displays in `AdventureGame.tsx` sidebar

### Integration Needs (v1.1)

#### 2.1 Chain Tiles (Special Tile Type)

**Already Defined:** `types/adventure.ts` includes `'chain'` in `TileType`
**Current Implementation:** Stubbed in `useAdventureGame.ts` (initialized but unused)

**Enhancement:** Full chain tile mechanics

```typescript
// lib/adventure/chainTileMechanics.ts
interface ChainTileState extends TileState {
  isChained: boolean;
  chainedWith: number[];  // Indices of linked tiles
}

function activateChainTile(
  tiles: TileState[][],
  path: { row: number; col: number }[]
): {
  updatedTiles: TileState[][];
  chainBonus: number;  // 1.5x combo multiplier
} {
  // 1. Find chain tiles in path
  // 2. Link adjacent chain tiles
  // 3. Apply CHAIN_COMBO_MULTIPLIER (1.5x) to combo bonus
  // 4. Return updated tile state + bonus
}
```

**Integration Points:**
1. `useAdventureGame.ts` reducer: Add `ACTIVATE_CHAIN` action
2. `submitWordWithPath()`: Check for chain tiles in path
3. `AdventureGrid.tsx`: Visual feedback for chained tiles (glow effect)
4. `levelConfig.ts` generator: Add chain tiles to World 5+ levels

#### 2.2 Enhanced Combo Display

**Current:** Simple `x{comboCount}` text display
**Enhancement:** Visual combo meter with tier thresholds

```tsx
// components/adventure/ComboMeter.tsx
interface ComboTier {
  threshold: number;
  label: string;
  color: string;
}

const COMBO_TIERS: ComboTier[] = [
  { threshold: 0, label: 'None', color: 'neo-white' },
  { threshold: 3, label: 'Nice!', color: 'neo-lime' },
  { threshold: 5, label: 'Great!', color: 'neo-cyan' },
  { threshold: 7, label: 'Amazing!', color: 'neo-orange' },
  { threshold: 10, label: 'LEGENDARY!', color: 'neo-pink' },
];
```

**Integration:** Replace text display in `AdventureGame.tsx` sidebar

#### 2.3 Scoring Engine Changes

**Current:** `shared/utils/scoring.ts` has flat combo bonus
**Enhancement:** No changes needed — existing formula works

**Formula Validation:**
```typescript
// Current (v1.0)
getComboBonus(5, 5) // => 5 points (combo 5 * 1.0 word factor)

// With chain tiles (v1.1)
baseBonus = getComboBonus(5, 5);  // 5
chainMultiplier = hasChainTile ? 1.5 : 1.0;
finalBonus = Math.floor(baseBonus * chainMultiplier); // 7 points
```

**NO breaking changes** — chain multiplier applied AFTER base combo calculation

---

## 3. Education Gamification Architecture

### Current State (v1.0)

**Database Schema (Migration 056):**
- `classrooms`: Teacher-created classrooms with join codes
- `classroom_memberships`: Student-classroom relationships
- `vocabulary_lessons`: Word lists with definitions
- `lesson_assignments`: Teacher assigns lessons to classrooms
- `student_lesson_progress`: Tracks completion %

**Database Schema (Migration 058):**
- `lesson_templates`: Room settings for practice sessions
- `practice_sessions`: Tracks flashcard/solo board practice
- `student_practice_progress` view: Aggregated stats

**No XP/achievement system exists yet**

### Integration Needs (v1.1)

#### 3.1 XP System Database Schema

**New Table:** `student_education_xp`

```sql
-- Migration: 061_education_xp_system.sql
CREATE TABLE student_education_xp (
    student_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    xp_this_week INTEGER NOT NULL DEFAULT 0,
    week_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: Calculate level from total_xp
CREATE OR REPLACE FUNCTION calculate_student_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Same formula as Adventure Mode: level = floor(sqrt(total_xp / 100))
    NEW.level = GREATEST(1, FLOOR(POWER(NEW.total_xp / 100.0, 0.5)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**XP Sources:**

| Action | XP Award | Implementation |
|--------|----------|----------------|
| Complete flashcard session | 10 XP per card | `practice_sessions` trigger |
| Find vocabulary word in solo board | 5 XP per word | Real-time via API endpoint |
| Complete lesson assignment | 50 XP | `student_lesson_progress` trigger |
| Perfect lesson (100% completion) | +25 XP bonus | Trigger on completion update |
| Daily practice streak | 10 XP per day | Cron job checking daily activity |

**Integration:** Reuse Adventure Mode XP calculation functions
```typescript
// lib/education/xpCalculation.ts
import { getLevelFromXp, getXpForLevel } from '@/lib/adventure/constants';

export function calculateEducationLevel(totalXp: number): number {
  return getLevelFromXp(totalXp); // Same curve as Adventure Mode
}
```

#### 3.2 Achievement System

**New Table:** `student_achievements`

```sql
CREATE TABLE student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, achievement_id, classroom_id)
);

-- Achievement definitions stored in code, not database
```

**Achievement Types:**

```typescript
// lib/education/achievementDefinitions.ts
export interface EducationAchievement {
  id: string;
  nameKey: string;           // Translation key
  descriptionKey: string;
  iconPath: string;
  xpReward: number;
  condition: (progress: StudentProgress) => boolean;
}

export const EDUCATION_ACHIEVEMENTS: EducationAchievement[] = [
  {
    id: 'first_lesson',
    nameKey: 'education.achievements.firstLesson',
    descriptionKey: 'education.achievements.firstLessonDesc',
    iconPath: '/images/achievements/first-lesson.webp',
    xpReward: 10,
    condition: (p) => p.lessonsCompleted >= 1,
  },
  {
    id: 'vocabulary_master',
    nameKey: 'education.achievements.vocabMaster',
    descriptionKey: 'education.achievements.vocabMasterDesc',
    iconPath: '/images/achievements/vocab-master.webp',
    xpReward: 100,
    condition: (p) => p.totalVocabularyWordsFound >= 100,
  },
  // ... 15-20 more achievements
];
```

**Integration:** Achievement checking via React hook
```typescript
// hooks/useEducationAchievements.ts
export function useEducationAchievements(studentId: string) {
  const { data: progress } = useStudentProgress(studentId);

  useEffect(() => {
    if (!progress) return;

    // Check all achievements
    for (const achievement of EDUCATION_ACHIEVEMENTS) {
      if (achievement.condition(progress)) {
        // Award achievement via API (idempotent - UNIQUE constraint)
        awardAchievement(studentId, achievement.id);
      }
    }
  }, [progress, studentId]);
}
```

#### 3.3 Classroom Leaderboard

**New View:** `classroom_leaderboard`

```sql
CREATE OR REPLACE VIEW classroom_leaderboard AS
SELECT
    cm.classroom_id,
    cm.student_id,
    p.display_name,
    COALESCE(xp.total_xp, 0) AS total_xp,
    COALESCE(xp.level, 1) AS level,
    COALESCE(xp.xp_this_week, 0) AS xp_this_week,
    COUNT(DISTINCT sa.achievement_id) AS achievement_count,
    ROW_NUMBER() OVER (
        PARTITION BY cm.classroom_id
        ORDER BY COALESCE(xp.total_xp, 0) DESC
    ) AS rank,
    ROW_NUMBER() OVER (
        PARTITION BY cm.classroom_id
        ORDER BY COALESCE(xp.xp_this_week, 0) DESC
    ) AS weekly_rank
FROM classroom_memberships cm
LEFT JOIN profiles p ON p.id = cm.student_id
LEFT JOIN student_education_xp xp ON xp.student_id = cm.student_id
LEFT JOIN student_achievements sa ON sa.student_id = cm.student_id
GROUP BY cm.classroom_id, cm.student_id, p.display_name, xp.total_xp, xp.level, xp.xp_this_week;
```

**Component:** `components/education/ClassroomLeaderboard.tsx`
- Displays top 10 students by total XP
- Toggle between "All Time" and "This Week" views
- Shows level badges and achievement counts

#### 3.4 Real-Time XP Awards

**Challenge:** Award XP during solo board practice without server lag

**Solution:** Optimistic updates with background sync

```typescript
// hooks/useEducationXpAward.ts
export function useEducationXpAward() {
  const [localXp, setLocalXp] = useState(0);
  const syncQueue = useRef<XpAward[]>([]);

  const awardXp = useCallback((amount: number, source: string) => {
    // 1. Optimistic update
    setLocalXp(prev => prev + amount);

    // 2. Queue for batch sync
    syncQueue.current.push({ amount, source, timestamp: Date.now() });

    // 3. Debounced sync (every 5 seconds or on unmount)
    debouncedSync();
  }, []);

  // Batch sync to avoid DB hammering during practice
  const syncToDatabase = async () => {
    if (syncQueue.current.length === 0) return;

    const awards = syncQueue.current;
    syncQueue.current = [];

    await fetch('/api/education/xp/batch-award', {
      method: 'POST',
      body: JSON.stringify({ awards }),
    });
  };
}
```

**API Endpoint:** `app/api/education/xp/batch-award/route.ts`
- Receives array of XP awards
- Single database transaction to update `student_education_xp.total_xp`
- Triggers achievement checks via database function

---

## 4. Analytics Architecture

### Current State (v1.0)

**Existing Analytics Tables:**
- `practice_sessions`: Tracks all student practice (flashcards, solo board, warmup)
- `student_practice_progress` view: Aggregated stats per lesson
- `student_lesson_progress`: Lesson completion tracking

**Missing:** Teacher-facing analytics dashboards

### Integration Needs (v1.1)

#### 4.1 Analytics Views (Database)

**New Views for Teacher Dashboard:**

```sql
-- Migration: 062_teacher_analytics_views.sql

-- 1. Student Progress Summary
CREATE OR REPLACE VIEW teacher_student_analytics AS
SELECT
    cm.classroom_id,
    cm.student_id,
    p.display_name,

    -- Lesson completion
    COUNT(DISTINCT slp.lesson_id) AS lessons_started,
    SUM(CASE WHEN slp.completion_percent = 100 THEN 1 ELSE 0 END) AS lessons_completed,
    AVG(slp.completion_percent) AS avg_completion_percent,

    -- Practice activity
    COUNT(DISTINCT ps.id) AS practice_sessions,
    SUM(ps.time_spent_seconds) AS total_practice_time_seconds,

    -- Vocabulary mastery
    (SELECT COUNT(DISTINCT word)
     FROM practice_sessions ps2
     WHERE ps2.student_id = cm.student_id
       AND word = ANY(ps2.vocabulary_words_found)
    ) AS unique_vocabulary_words_mastered,

    -- Recent activity
    MAX(ps.started_at) AS last_practice_date,
    MAX(slp.updated_at) AS last_lesson_activity

FROM classroom_memberships cm
LEFT JOIN profiles p ON p.id = cm.student_id
LEFT JOIN student_lesson_progress slp ON slp.student_id = cm.student_id
LEFT JOIN practice_sessions ps ON ps.student_id = cm.student_id
GROUP BY cm.classroom_id, cm.student_id, p.display_name;

-- 2. Lesson Effectiveness Analytics
CREATE OR REPLACE VIEW lesson_effectiveness_analytics AS
SELECT
    vl.id AS lesson_id,
    vl.name AS lesson_name,
    vl.classroom_id,

    COUNT(DISTINCT slp.student_id) AS students_assigned,
    SUM(CASE WHEN slp.completion_percent = 100 THEN 1 ELSE 0 END) AS students_completed,
    AVG(slp.completion_percent) AS avg_completion_rate,

    -- Practice engagement
    COUNT(DISTINCT ps.id) AS total_practice_sessions,
    AVG(ps.time_spent_seconds) AS avg_practice_duration,

    -- Vocabulary retention (% of words found in practice)
    AVG(
        CASE WHEN jsonb_array_length(vl.words) > 0
        THEN (
            SELECT COUNT(DISTINCT word)::FLOAT / jsonb_array_length(vl.words)
            FROM practice_sessions ps2
            WHERE ps2.lesson_id = vl.id
              AND word = ANY(ps2.vocabulary_words_found)
        )
        ELSE 0
        END
    ) * 100 AS vocabulary_retention_percent

FROM vocabulary_lessons vl
LEFT JOIN student_lesson_progress slp ON slp.lesson_id = vl.id
LEFT JOIN practice_sessions ps ON ps.lesson_id = vl.id
GROUP BY vl.id, vl.name, vl.classroom_id;

-- 3. Classroom Activity Heatmap
CREATE OR REPLACE VIEW classroom_activity_heatmap AS
SELECT
    cm.classroom_id,
    DATE(ps.started_at) AS activity_date,
    COUNT(DISTINCT ps.student_id) AS active_students,
    COUNT(ps.id) AS practice_sessions,
    SUM(ps.time_spent_seconds) / 60 AS total_minutes_practiced
FROM classroom_memberships cm
LEFT JOIN practice_sessions ps ON ps.student_id = cm.student_id
  AND ps.started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cm.classroom_id, DATE(ps.started_at)
ORDER BY activity_date DESC;
```

#### 4.2 Dashboard Components

**New Page:** `app/[locale]/education/analytics/page.tsx`

**Component Hierarchy:**
```
EducationAnalyticsDashboard
├── ClassroomSelector (dropdown to switch classrooms)
├── AnalyticsOverviewCards
│   ├── TotalStudentsCard
│   ├── AvgCompletionCard
│   ├── ActiveThisWeekCard
│   └── VocabularyMasteredCard
├── StudentProgressTable
│   ├── StudentRow (sortable by completion, practice time, etc.)
│   └── ProgressBar (visual completion %)
├── LessonEffectivenessChart
│   └── BarChart (completion rate per lesson)
└── ActivityHeatmap
    └── CalendarHeatmap (GitHub-style activity grid)
```

**Data Flow:**
```typescript
// hooks/useClassroomAnalytics.ts
export function useClassroomAnalytics(classroomId: string) {
  const { data: overview } = useSWR(
    `/api/education/analytics/overview?classroomId=${classroomId}`,
    fetcher
  );

  const { data: students } = useSWR(
    `/api/education/analytics/students?classroomId=${classroomId}`,
    fetcher
  );

  const { data: lessonEffectiveness } = useSWR(
    `/api/education/analytics/lessons?classroomId=${classroomId}`,
    fetcher
  );

  return { overview, students, lessonEffectiveness };
}
```

**API Endpoints:**
- `GET /api/education/analytics/overview` → Queries `teacher_student_analytics` view
- `GET /api/education/analytics/students` → Fetches student progress table
- `GET /api/education/analytics/lessons` → Queries `lesson_effectiveness_analytics` view
- `GET /api/education/analytics/activity` → Queries `classroom_activity_heatmap` view

#### 4.3 Real-Time Updates (Optional Enhancement)

**Challenge:** Teachers want live progress updates during classroom sessions

**Solution:** Supabase Realtime subscriptions

```typescript
// hooks/useRealtimeAnalytics.ts
export function useRealtimeAnalytics(classroomId: string) {
  const supabase = useSupabaseClient();

  useEffect(() => {
    const channel = supabase
      .channel(`classroom:${classroomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'practice_sessions',
        filter: `student_id=in.(SELECT student_id FROM classroom_memberships WHERE classroom_id='${classroomId}')`,
      }, (payload) => {
        // Update analytics in real-time
        mutate(`/api/education/analytics/overview?classroomId=${classroomId}`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classroomId]);
}
```

**Performance:** Use debouncing to avoid excessive re-renders (update max once per 5 seconds)

---

## 5. Database Schema Changes Summary

### New Migrations Required

| Migration | Purpose | Tables/Views |
|-----------|---------|--------------|
| 061_education_xp_system.sql | XP and levels for students | `student_education_xp` |
| 061_education_xp_system.sql | Achievement tracking | `student_achievements` |
| 062_teacher_analytics_views.sql | Analytics views | 4 materialized views |
| 063_boss_battle_enhancements.sql (optional) | Boss state persistence | `adventure_boss_states` (optional) |

### Migration 061: Education XP System

```sql
-- student_education_xp table (see section 3.1)
-- student_achievements table (see section 3.2)
-- classroom_leaderboard view (see section 3.3)

-- Functions
CREATE OR REPLACE FUNCTION award_education_xp(
    p_student_id UUID,
    p_xp_amount INTEGER,
    p_source TEXT
) RETURNS void AS $$
BEGIN
    INSERT INTO student_education_xp (student_id, total_xp)
    VALUES (p_student_id, p_xp_amount)
    ON CONFLICT (student_id) DO UPDATE
    SET total_xp = student_education_xp.total_xp + p_xp_amount,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Migration 062: Teacher Analytics Views

```sql
-- teacher_student_analytics view (see section 4.1)
-- lesson_effectiveness_analytics view (see section 4.1)
-- classroom_activity_heatmap view (see section 4.1)

-- Optional: Materialized views for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_classroom_analytics AS
SELECT * FROM teacher_student_analytics;

-- Refresh trigger (run hourly via cron)
CREATE OR REPLACE FUNCTION refresh_classroom_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_classroom_analytics;
END;
$$ LANGUAGE plpgsql;
```

### Existing Tables (No Changes)

| Table | Usage in v1.1 |
|-------|---------------|
| `adventure_level_completions` | Boss battles (already tracks boss victories) |
| `adventure_level_attempts` | Boss battle analytics (migration 059) |
| `classrooms` | Education mode (no changes) |
| `vocabulary_lessons` | Education mode (no changes) |
| `practice_sessions` | XP award triggers added |
| `student_lesson_progress` | XP award triggers added |

---

## 6. Component Hierarchy Changes

### Adventure Mode (Boss Battles)

**New Components:**
```
components/adventure/
├── BossHealthBar.tsx (NEW)
│   └── Shows boss HP with phase indicators
├── BossIntro.tsx (EXISTS - no changes)
├── BossDialogue.tsx (EXISTS - no changes)
└── BossVictory.tsx (EXISTS - no changes)

lib/adventure/
├── bossMechanics/ (NEW - directory)
│   ├── popQuiz.ts
│   ├── hiveMind.ts
│   ├── synonymShift.ts
│   ├── compoundMerge.ts
│   ├── anagramScramble.ts
│   └── index.ts
└── bossStateMachine.ts (NEW)
```

**Modified Components:**
- `AdventureGame.tsx`: Add `<BossHealthBar />` to header
- `hooks/useAdventureGame.ts`: Integrate boss state machine
- `hooks/useBossMechanics.ts`: Use mechanic implementations from `/bossMechanics/`

### Chain/Combo System

**New Components:**
```
components/adventure/
└── ComboMeter.tsx (NEW)
    └── Replaces simple x{count} display

lib/adventure/
└── chainTileMechanics.ts (NEW)
    └── Chain tile activation logic
```

**Modified Components:**
- `AdventureGame.tsx`: Replace combo text with `<ComboMeter />`
- `AdventureGrid.tsx`: Add chain tile visual effects
- `hooks/useAdventureGame.ts`: Add chain tile handling to word submission

### Education Mode

**New Components:**
```
components/education/
├── XpProgressBar.tsx (NEW)
│   └── Shows XP progress to next level
├── AchievementBadge.tsx (NEW)
│   └── Individual achievement display
├── AchievementUnlockedModal.tsx (NEW)
│   └── Celebration modal on unlock
├── ClassroomLeaderboard.tsx (NEW)
│   └── Top students by XP
└── analytics/ (NEW - directory)
    ├── AnalyticsDashboard.tsx
    ├── StudentProgressTable.tsx
    ├── LessonEffectivenessChart.tsx
    └── ActivityHeatmap.tsx

hooks/
├── useEducationXpAward.ts (NEW)
├── useEducationAchievements.ts (NEW)
└── useClassroomAnalytics.ts (NEW)
```

**New Pages:**
```
app/[locale]/education/
└── analytics/
    └── page.tsx (NEW - teacher dashboard)
```

**Modified Components:**
- `app/[locale]/education/page.tsx`: Add XP bar to student view
- Student practice components: Trigger XP awards via `useEducationXpAward`

---

## 7. Suggested Build Order

### Phase 1: Chain Combos (Week 1)
**Priority:** HIGH — Foundation for scoring improvements

**Tasks:**
1. Implement `lib/adventure/chainTileMechanics.ts`
2. Add chain tile generation to `levelConfig.ts` (World 5+)
3. Create `ComboMeter.tsx` component
4. Update `useAdventureGame.ts` to handle chain tiles
5. Add visual effects to `AdventureGrid.tsx`

**Dependencies:** None (standalone feature)
**Testing:** Unit tests for chain mechanics, E2E for visual feedback

**Deliverables:**
- Chain tiles appear in World 5+ levels
- 1.5x combo multiplier applied when chain tiles used
- Visual feedback (glow effect) on chained tiles

---

### Phase 2: Boss Battle State Machine (Week 2)
**Priority:** HIGH — Completes existing boss system

**Tasks:**
1. Implement `lib/adventure/bossStateMachine.ts`
2. Create `BossHealthBar.tsx` component
3. Implement 3 boss mechanics: `popQuiz.ts`, `hiveMind.ts`, `synonymShift.ts`
4. Integrate state machine into `useAdventureGame.ts`
5. Add boss HP bar to `AdventureGame.tsx` header

**Dependencies:** Phase 1 (uses combo system)
**Testing:** Boss battle E2E tests, state machine unit tests

**Deliverables:**
- Boss HP bar shows progress during battle
- 3 boss mechanics fully functional
- Phase transitions (intro → phase1 → enraged → victory/defeat)

---

### Phase 3: Education XP System (Week 3)
**Priority:** MEDIUM — Leverages combo scoring from Phase 1

**Tasks:**
1. Create migration `061_education_xp_system.sql`
2. Implement `useEducationXpAward.ts` hook
3. Create XP UI components (`XpProgressBar.tsx`, `ClassroomLeaderboard.tsx`)
4. Add XP triggers to practice session endpoints
5. Implement achievement definitions (`achievementDefinitions.ts`)

**Dependencies:** Phase 1 (combo system for XP calculations)
**Testing:** Database triggers, XP calculation unit tests

**Deliverables:**
- Students earn XP from practice activities
- XP bar shows progress in education UI
- Classroom leaderboard displays top students

---

### Phase 4: Achievement System (Week 4)
**Priority:** MEDIUM — Builds on XP system

**Tasks:**
1. Implement `useEducationAchievements.ts` hook
2. Create achievement components (`AchievementBadge.tsx`, `AchievementUnlockedModal.tsx`)
3. Add achievement checking to practice sessions
4. Design 15-20 achievement definitions
5. Add achievement icons to `/public/images/achievements/`

**Dependencies:** Phase 3 (XP system)
**Testing:** Achievement unlock conditions, UI tests

**Deliverables:**
- 15-20 achievements defined
- Achievement unlocked modal appears on first unlock
- Achievement badges displayed in student profile

---

### Phase 5: Analytics Dashboard (Week 5)
**Priority:** LOW — Consumes existing data, no gameplay changes

**Tasks:**
1. Create migration `062_teacher_analytics_views.sql`
2. Implement analytics API endpoints (`/api/education/analytics/*`)
3. Create dashboard components (see section 4.2)
4. Build `app/[locale]/education/analytics/page.tsx`
5. Add real-time updates via Supabase subscriptions (optional)

**Dependencies:** Phase 3 (student XP data for leaderboard analytics)
**Testing:** View query performance, UI responsiveness

**Deliverables:**
- Teacher analytics dashboard showing student progress
- Lesson effectiveness metrics
- Activity heatmap (last 30 days)

---

### Phase 6: Boss Mechanic Completion (Week 6)
**Priority:** LOW — Polish for remaining 7 bosses

**Tasks:**
1. Implement remaining 7 boss mechanics
2. Add mechanic-specific UI elements (e.g., synonym hints for Prof. Thesaurus)
3. Tune boss difficulty based on playtest feedback
4. Add boss-specific sound effects and animations

**Dependencies:** Phase 2 (state machine)
**Testing:** Boss battle E2E tests for all 10 worlds

**Deliverables:**
- All 10 boss mechanics fully implemented
- Boss battles polished and balanced

---

## 8. Integration Risks & Mitigations

### Risk 1: Chain Tile Complexity
**Risk:** Chain tile mechanics might slow down gameplay loops
**Mitigation:** Optimize chain detection algorithm (O(n) path scan, not O(n²) grid scan)
**Test:** Performance profiling with 7x7 grid + 5 chain tiles

### Risk 2: XP Award Database Load
**Risk:** Real-time XP awards during practice could overload database
**Mitigation:** Batch XP updates every 5 seconds (see section 3.4)
**Test:** Load testing with 30 students practicing simultaneously

### Risk 3: Analytics View Performance
**Risk:** Complex analytics views might timeout on large classrooms (100+ students)
**Mitigation:** Use materialized views, refresh hourly via cron
**Test:** Query performance testing with 500 student records

### Risk 4: Boss State Machine Complexity
**Risk:** Boss state transitions might conflict with existing level completion logic
**Mitigation:** Boss state is isolated in `useBossMechanics` hook, doesn't affect core game state
**Test:** Integration tests verifying boss battles don't break normal level flow

---

## 9. Performance Considerations

### Database Query Optimization

**Analytics Views:**
- Use `EXPLAIN ANALYZE` on all view queries
- Add indexes on frequently filtered columns:
  - `classroom_memberships(classroom_id, student_id)`
  - `practice_sessions(student_id, lesson_id, started_at)`
  - `student_achievements(student_id, achievement_id)`

**Expected Performance:**
- Analytics dashboard load: < 500ms for classroom with 50 students
- XP award batch update: < 100ms for batch of 20 awards
- Leaderboard query: < 200ms for classroom with 100 students

### Frontend Rendering

**Combo Meter Animation:**
- Use `will-change: transform` for combo tier transitions
- Debounce combo count updates (max 1 update per 100ms)

**Boss HP Bar:**
- CSS transform animations (GPU-accelerated)
- Update max once per objective completion (not per word)

**Chain Tile Effects:**
- SVG glow filters (avoid canvas for better performance)
- Reuse effect elements (pool of 10 max concurrent effects)

---

## 10. Testing Strategy

### Unit Tests

**Chain Mechanics:**
```typescript
// lib/adventure/__tests__/chainTileMechanics.test.ts
describe('activateChainTile', () => {
  it('should link adjacent chain tiles in path', () => {
    const tiles = createMockTiles([
      [{ type: 'chain' }, { type: 'chain' }, { type: 'standard' }],
    ]);
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];

    const result = activateChainTile(tiles, path);
    expect(result.chainBonus).toBe(1.5);
    expect(result.updatedTiles[0][0].isChained).toBe(true);
  });
});
```

**Boss State Machine:**
```typescript
// lib/adventure/__tests__/bossStateMachine.test.ts
describe('BossStateMachine', () => {
  it('should transition to enraged phase at 66% progress', () => {
    const machine = createBossStateMachine();
    machine.send({ type: 'DAMAGE', progress: 66 });

    expect(machine.state.phase).toBe('enraged');
  });
});
```

**XP Calculation:**
```typescript
// lib/education/__tests__/xpCalculation.test.ts
describe('calculateEducationLevel', () => {
  it('should match Adventure Mode XP curve', () => {
    expect(calculateEducationLevel(100)).toBe(1);
    expect(calculateEducationLevel(400)).toBe(2);
    expect(calculateEducationLevel(900)).toBe(3);
  });
});
```

### Integration Tests

**Boss Battle Flow:**
```typescript
// components/adventure/__tests__/BossBattle.integration.test.tsx
it('should complete boss battle flow', async () => {
  const { user, screen } = render(<AdventureGame levelConfig={bosslevelConfig} />);

  // 1. Boss intro appears
  expect(screen.getByText(/Ms. Grammar/i)).toBeInTheDocument();
  await user.click(screen.getByText(/Start Battle/i));

  // 2. Submit words to reach enraged phase
  await submitWord('TESTING');
  expect(screen.getByText(/ENRAGED/i)).toBeInTheDocument();

  // 3. Complete level
  await submitWord('VICTORY');
  expect(screen.getByText(/Victory/i)).toBeInTheDocument();
});
```

**XP Award Flow:**
```typescript
// hooks/__tests__/useEducationXpAward.integration.test.ts
it('should award XP and update leaderboard', async () => {
  const { result } = renderHook(() => useEducationXpAward());

  // Award XP
  act(() => {
    result.current.awardXp(50, 'flashcard_complete');
  });

  // Wait for batch sync
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith('/api/education/xp/batch-award');
  });

  // Verify leaderboard update
  const leaderboard = await fetchClassroomLeaderboard();
  expect(leaderboard[0].total_xp).toBe(50);
});
```

### E2E Tests (Playwright)

**Boss Battle:**
```typescript
test('complete boss battle with chain combo', async ({ page }) => {
  await page.goto('/adventure/world/1/level/7');

  // Start boss battle
  await page.click('[data-testid="boss-intro-start"]');

  // Submit word with chain tiles
  await selectTiles(page, ['C', 'H', 'A', 'I', 'N']);
  await page.click('[data-testid="submit-word"]');

  // Verify chain bonus applied
  await expect(page.locator('[data-testid="combo-display"]')).toContainText('x1.5');

  // Complete boss battle
  await completeObjectives(page);
  await expect(page.locator('[data-testid="boss-victory"]')).toBeVisible();
});
```

**Education Analytics:**
```typescript
test('teacher views student progress', async ({ page }) => {
  await page.goto('/education/analytics');

  // Select classroom
  await page.selectOption('[data-testid="classroom-selector"]', 'classroom-123');

  // Verify analytics load
  await expect(page.locator('[data-testid="total-students"]')).toContainText('25');

  // Check student progress table
  const studentRow = page.locator('[data-testid="student-row-0"]');
  await expect(studentRow.locator('[data-testid="xp-value"]')).toContainText('450');
});
```

---

## 11. Sources & Confidence

### HIGH Confidence Areas

**Existing Architecture (Verified via codebase inspection):**
- Boss battle foundations: `lib/adventure/bossConfig.ts`, `hooks/useBossMechanics.ts` (READ verified)
- Combo system: `shared/utils/scoring.ts` (READ verified)
- Education schema: Migrations 056, 058 (READ verified)
- Adventure Mode state management: `hooks/useAdventureGame.ts` (READ verified)

**Verified Integration Points:**
- TileType includes 'chain' (types/adventure.ts line 24)
- Boss intro/dialogue/victory components exist (AdventureGame.tsx lines 918-1006)
- Practice sessions table ready for XP triggers (migration 058)

### MEDIUM Confidence Areas

**Implementation Complexity Estimates:**
- Boss state machine: 2-3 days (based on existing state machine patterns)
- Chain tile mechanics: 1-2 days (similar to existing special tile logic)
- XP system: 3-4 days (database + frontend integration)

**Database Performance:**
- Analytics views should perform well (indexed foreign keys exist)
- Materialized views recommended for 100+ student classrooms
- No load testing data available yet

### LOW Confidence Areas

**Boss Mechanic Tuning:**
- Balance difficulty requires playtest feedback
- Some mechanics (polyglotPeaks, allMechanics) may need custom UI

**Real-Time Analytics:**
- Supabase Realtime subscription limits unknown
- May need WebSocket fallback for large classrooms (50+ concurrent students)

**Achievement Definitions:**
- 15-20 achievements proposed, may need UX research to validate appeal

---

## 12. Open Questions for Validation

1. **Boss Mechanics:** Should boss "HP" be visual only, or should it affect difficulty?
   - Recommendation: Visual only — keeps difficulty consistent with base Adventure Mode

2. **Chain Tiles:** Should chain tiles link automatically or require specific word patterns?
   - Recommendation: Automatic linking (simpler UX, less frustration)

3. **XP System:** Should education XP be separate from Adventure Mode XP?
   - Recommendation: Separate systems — different progression curves and rewards

4. **Analytics:** How often should materialized views refresh?
   - Recommendation: Hourly refresh (balances freshness vs. DB load)

5. **Achievement Icons:** Custom illustrations or icon library?
   - Recommendation: Icon library (FontAwesome/Lucide) for MVP, custom art later

---

## Conclusion

All v1.1 features integrate cleanly with existing LexiClash architecture:

- **Boss battles** extend the already-present boss system (minor additions)
- **Chain combos** leverage existing tile system and scoring engine
- **Education gamification** builds on existing education schema (056, 058)
- **Analytics** consume existing tracking tables (no game loop changes)

**No architectural rewrites needed.** All features follow established patterns.

**Suggested build order prioritizes gameplay (chains, bosses) before polish (XP, analytics).**

**Estimated development time:** 6 weeks for full v1.1 feature set.
