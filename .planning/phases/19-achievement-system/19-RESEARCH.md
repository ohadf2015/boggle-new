# Phase 19: Achievement System - Research Findings

**Date**: 2026-01-25
**Status**: Research Complete

---

## Executive Summary

Phase 19 implements achievement badges and classroom leaderboards for the education XP system (Phase 18). This phase builds on the existing XP infrastructure to reward meaningful student milestones with celebration modals and profile badge displays. The classroom-scoped leaderboard ensures privacy while encouraging healthy competition.

**Key Finding**: The existing XP system (`useEducationXp`, `educationXpManager`) and celebration components (`LevelUpCelebration`, `fireLevelUpConfetti`) provide excellent foundations. Achievement system will integrate seamlessly via database triggers and React contexts.

---

## Architecture Analysis

### Existing XP Infrastructure (Phase 18)

**XP Hook**: `/fe-next/hooks/useEducationXp.ts`
- Manages student XP state (totalXp, currentLevel, streak)
- Awards XP for practice activities (flashcards, solo board, lessons)
- Detects level-ups via `checkLevelUp()` from `xpManager`
- Returns `pendingUpdate` for database persistence
- **Integration Point**: Can be extended to check achievement unlocks

**XP Manager**: `/fe-next/backend/modules/xpManager.ts`
- Level calculation: `getLevelFromXp()` (formula: `SQRT(totalXp / 100)`)
- Level-up detection: `checkLevelUp(oldLevel, newLevel)`
- Title unlocks at levels: 5, 10, 15, 20, 25, 35, 50, 75, 90, 100
- **Integration Point**: Achievement unlocks can piggyback on XP/level checks

**Education XP Manager**: `/fe-next/backend/modules/educationXpManager.ts`
- Practice XP calculation: flashcards, solo board, lesson completion
- Streak bonus multipliers (7, 14, 30 day milestones)
- Mastery-focused messages (emphasizes learning, not points)
- **Integration Point**: Achievement triggers from practice session data

**Database Schema**: `062_education_xp_tracking.sql`
```sql
student_lesson_progress:
  - total_xp (INTEGER)
  - current_level (INTEGER, auto-calculated via trigger)
  - current_streak (INTEGER)
  - longest_streak (INTEGER)
  - last_practice_date (DATE)
  - total_practice_sessions (INTEGER)
```
**Integration Point**: Add `earned_achievements` JSONB column

### Existing Celebration System

**Level-Up Modal**: `/fe-next/components/education/LevelUpCelebration.tsx`
- Neo-brutalist design (hard shadows, chunky borders)
- Confetti via `fireLevelUpConfetti()`
- Shows new level + title unlocks
- Escape key + click-outside dismissal
- **Reuse Pattern**: Achievement unlock modal can follow identical structure

**Confetti Utilities**: `/fe-next/utils/confettiUtils.ts`
- `fireLevelUpConfetti()`: 35 particles + 25 follow-up burst
- Neo-brutalist colors: `#FFE135`, `#FF1493`, `#00FFFF`, `#BFFF00`, `#FF3366`
- Chunky square particles (`flat: true`, `shapes: ['square', 'square', 'square', 'circle']`)
- **Reuse**: Direct call from achievement unlock component

**Translation Keys**: `education.xp.*` section in `/fe-next/translations/en.js`
```javascript
education.xp: {
  level, levelUp, newLevel, newTitleUnlocked, continue,
  mastery: { perfectFlashcard, learnedWords, ... },
  streakMilestone: { week, twoWeeks, month }
}
```
**Action Required**: Add `education.achievements.*` translation section

---

## Technical Requirements Analysis

### 1. Leaderboard Requirements (GAMIFY-04)

**User Story**: Student sees classroom leaderboard with top students by XP

**Technical Approach**:

**Database View** (Supabase migration):
```sql
CREATE VIEW classroom_leaderboard AS
SELECT
  cm.classroom_id,
  slp.student_id,
  p.display_name,
  slp.total_xp,
  slp.current_level,
  slp.current_streak,
  slp.last_practice_date,
  RANK() OVER (PARTITION BY cm.classroom_id ORDER BY slp.total_xp DESC) as rank
FROM student_lesson_progress slp
JOIN classroom_memberships cm ON cm.student_id = slp.student_id
JOIN profiles p ON p.id = slp.student_id
WHERE slp.last_practice_date > NOW() - INTERVAL '7 days'; -- Active only
```

**React Component**: `ClassroomLeaderboard.tsx`
- Fetches top 3 + current student rank via Supabase query
- Privacy-conscious: Classroom-scoped only (no global leaderboard for students)
- Displays: Rank, Name, XP/Level, Streak badge
- Neo-brutalist podium design (1st/2nd/3rd with colors)
- **Location**: `/fe-next/components/education/ClassroomLeaderboard.tsx`

**Integration**: Add to Student Dashboard (`StudentLessonView.tsx`)

---

### 2. Achievement Badge System (GAMIFY-05)

**User Story**: Student can earn 15-20 meaningful achievements (Bronze/Silver/Gold/Platinum tiers)

**Achievement Categories** (from phase context):

1. **Progress Milestones**:
   - "First Lesson Complete" (Bronze)
   - "10 Lessons Mastered" (Silver)
   - "50 Lessons Mastered" (Gold)
   - "Level 10 Reached" (Bronze)
   - "Level 25 Reached" (Silver)
   - "Level 50 Reached" (Gold)
   - "Level 100 Reached" (Platinum)

2. **Skill-Based Feats**:
   - "Perfect Flashcard Session" (Bronze: 10 cards correct)
   - "Flashcard Master" (Silver: 100 perfect cards total)
   - "Word Hunter" (Bronze: 50 vocab words found)
   - "Word Collector" (Silver: 250 vocab words)
   - "Word Archon" (Gold: 1000 vocab words)
   - "Boss Battle Victory" (Silver: Defeat first boss in education mode)

3. **Consistency Habits**:
   - "Dedicated Learner" (Bronze: 7-day streak)
   - "Consistent Scholar" (Silver: 30-day streak)
   - "Unstoppable Student" (Gold: 100-day streak)
   - "Daily Champion" (Platinum: 365-day streak)

4. **Exploration**:
   - "Practice Explorer" (Bronze: Try all 3 practice modes)
   - "Multi-Lesson Learner" (Silver: Practice 5 different lessons)

**Tier Progression Pattern** (same achievement, harder thresholds):
```javascript
{
  id: "word_master",
  tiers: {
    bronze: { threshold: 50, xpReward: 100 },
    silver: { threshold: 150, xpReward: 250 },
    gold: { threshold: 500, xpReward: 500 },
    platinum: { threshold: 1000, xpReward: 1000 }
  }
}
```

**Database Schema**:
```sql
CREATE TABLE student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0, -- For partially complete badges
  UNIQUE(student_id, achievement_id, tier)
);

CREATE INDEX idx_achievements_student ON student_achievements(student_id);
CREATE INDEX idx_achievements_earned_at ON student_achievements(earned_at DESC);
```

**Achievement Configuration**: `/fe-next/backend/modules/achievementManager.ts`
```typescript
export const ACHIEVEMENTS = {
  first_lesson: {
    id: 'first_lesson',
    category: 'progress',
    name: 'First Steps',
    description: 'Complete your first lesson',
    tiers: { bronze: { threshold: 1, xpReward: 50 } },
    triggerOn: 'lesson_complete',
    checkFn: (data) => data.lessonsCompleted >= 1,
  },
  word_master: {
    id: 'word_master',
    category: 'skill',
    name: 'Word Master',
    description: 'Find vocabulary words',
    tiers: {
      bronze: { threshold: 50, xpReward: 100 },
      silver: { threshold: 150, xpReward: 250 },
      gold: { threshold: 500, xpReward: 500 },
      platinum: { threshold: 1000, xpReward: 1000 },
    },
    triggerOn: 'vocab_word_found',
    checkFn: (data) => data.totalVocabWords,
  },
  // ... 15-20 total achievements
};
```

---

### 3. Achievement Unlock Modal (GAMIFY-06)

**User Story**: Student sees achievement unlock modal when earning badge

**Component**: `AchievementUnlockModal.tsx`
- **Reuse Pattern**: Clone `LevelUpCelebration.tsx` structure
- Display: Badge icon/image, tier color, achievement name, progress
- Confetti: Call `fireLevelUpConfetti()` on unlock
- Sound effects: Celebratory chime (respects device mute)
- Timing: Immediately on unlock (doesn't wait for activity end)
- Modal prominence: Full celebration for Gold/Platinum, toast for Bronze/Silver

**Sound System**: `/fe-next/utils/soundEffects.ts`
```typescript
export function playAchievementSound(tier: 'bronze' | 'silver' | 'gold' | 'platinum') {
  if (!audioEnabled()) return;
  const audio = new Audio(`/sounds/achievement_${tier}.mp3`);
  audio.volume = 0.5;
  audio.play().catch(err => console.warn('Audio playback failed', err));
}
```

**Integration**: Achievement detection in `useEducationXp.awardPracticeXp()`
```typescript
// After XP award
const unlockedAchievements = await checkAchievementUnlocks({
  studentId,
  totalXp: newTotalXp,
  currentLevel: newLevel,
  sessionData: session.sessionData,
});

if (unlockedAchievements.length > 0) {
  setUnlockedAchievements(unlockedAchievements);
  // Modal displays automatically via state
}
```

**Translation Keys**:
```javascript
education.achievements: {
  unlocked: "Achievement Unlocked!",
  progress: "Progress: {current}/{total}",
  continue: "Awesome!",
  tiers: {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum"
  }
}
```

---

### 4. Profile Badge Display (GAMIFY-07)

**User Story**: Student can view earned achievement badges in profile with completion progress

**Component**: `StudentAchievementProfile.tsx`
- Grid layout: Badge cards with icon, name, tier, progress
- Progress bars: "Word Master Silver: 142/250 words"
- Locked badges: "??? - Play 5 boss battles to unlock" (5-10% secret)
- Pin feature: Up to 3 featured badges displayed prominently
- Completion: "60% Complete - 12/20 badges"
- Filter: All | Progress | Skill | Consistency | Exploration

**Data Structure**:
```typescript
interface StudentAchievementState {
  earnedAchievements: {
    achievementId: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    earnedAt: Date;
    progress: number;
  }[];
  pinnedBadges: string[]; // Max 3 achievement IDs
  totalCompletion: number; // Percentage
}
```

**Supabase Function**: `get_student_achievements(student_id UUID)`
```sql
CREATE OR REPLACE FUNCTION get_student_achievements(p_student_id UUID)
RETURNS TABLE (
  achievement_id TEXT,
  tier TEXT,
  progress INTEGER,
  earned_at TIMESTAMPTZ,
  is_pinned BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.achievement_id,
    sa.tier,
    sa.progress,
    sa.earned_at,
    sa.achievement_id = ANY(sp.pinned_achievements) as is_pinned
  FROM student_achievements sa
  LEFT JOIN student_profiles sp ON sp.student_id = sa.student_id
  WHERE sa.student_id = p_student_id
  ORDER BY sa.earned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Integration**: Add to Student Dashboard as new tab/section

---

## Data Flow Architecture

### Achievement Detection Flow

```
1. Student completes practice activity
   ↓
2. useEducationXp.awardPracticeXp() called
   ↓
3. XP calculation + level check
   ↓
4. achievementManager.checkUnlocks() called
   ├─ Check progress milestones (lessons, levels)
   ├─ Check skill feats (accuracy, word counts)
   ├─ Check consistency (streaks)
   └─ Check exploration (modes tried)
   ↓
5. If achievement(s) unlocked:
   ├─ Insert into student_achievements table
   ├─ Award bonus XP
   ├─ Fire confetti
   ├─ Play sound effect
   └─ Display AchievementUnlockModal
   ↓
6. Update profile completion percentage
```

### Database Trigger for Achievement Progress

```sql
-- Auto-update achievement progress based on student activity
CREATE OR REPLACE FUNCTION update_achievement_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update word master progress
  UPDATE student_achievements
  SET progress = (
    SELECT COUNT(DISTINCT word)
    FROM student_lesson_progress slp,
    LATERAL jsonb_object_keys(slp.words_attempted::jsonb) AS word
    WHERE slp.student_id = NEW.student_id
  )
  WHERE student_id = NEW.student_id
  AND achievement_id = 'word_master';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER achievement_progress_update
  AFTER UPDATE OF words_attempted ON student_lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_achievement_progress();
```

---

## Design System Integration

### Neo-Brutalist Badge Design

**Tier Colors**:
- Bronze: `#CD7F32` (border), `#FFA54F` (glow)
- Silver: `#C0C0C0` (border), `#E8E8E8` (glow)
- Gold: `#FFD700` (border), `#FFED4E` (glow)
- Platinum: `#E5E4E2` (border), `#B9F2FF` (glow)

**Badge Card Structure**:
```tsx
<motion.div className={cn(
  "relative p-4 rounded-neo",
  "bg-neo-navy border-4 border-neo-black",
  "shadow-hard hover:shadow-hard-lg",
  tierBorderClass, // border-t-4 with tier color
)}>
  {/* Lock icon for unearned */}
  {!earned && <LockIcon className="opacity-30" />}

  {/* Badge icon/emoji */}
  <span className="text-5xl">{achievement.emoji}</span>

  {/* Name + tier */}
  <h3 className="text-neo-white font-black">{achievement.name}</h3>
  <p className="text-neo-orange text-sm">{tier.toUpperCase()}</p>

  {/* Progress bar */}
  {inProgress && (
    <div className="w-full h-2 bg-neo-black/50 rounded-full">
      <div
        className={cn("h-full rounded-full", tierBgClass)}
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  )}
</motion.div>
```

**Secret Badge Appearance**:
- Gray silhouette (no color)
- "???" as name
- Hint text: "Play 5 boss battles to unlock"
- No progress bar shown

---

## Testing Strategy

### Unit Tests

**Achievement Manager** (`achievementManager.test.ts`):
```typescript
describe('achievementManager', () => {
  test('detects first lesson completion', () => {
    const data = { lessonsCompleted: 1 };
    const unlocked = checkAchievementUnlocks(data);
    expect(unlocked).toContainEqual({ id: 'first_lesson', tier: 'bronze' });
  });

  test('awards higher tier when threshold crossed', () => {
    const data = { totalVocabWords: 150 };
    const unlocked = checkAchievementUnlocks(data);
    expect(unlocked).toContainEqual({ id: 'word_master', tier: 'silver' });
  });

  test('does not award same achievement twice', async () => {
    // ... test idempotency
  });
});
```

**Achievement Component Tests**:
- `AchievementUnlockModal.test.tsx`: Confetti fires, sound plays, dismissal
- `StudentAchievementProfile.test.tsx`: Render badges, progress bars, pinning
- `ClassroomLeaderboard.test.tsx`: Top 3 display, current rank, privacy

### Integration Tests

**E2E Flow** (`education-achievements.e2e.test.ts`):
```typescript
test('student earns achievement and sees modal', async () => {
  // 1. Complete 50 flashcards
  await completePracticeSession('flashcard', { cardsCorrect: 50 });

  // 2. Verify "Word Master Bronze" unlocked
  await expect(page.getByText('Achievement Unlocked!')).toBeVisible();
  await expect(page.getByText('Word Master')).toBeVisible();
  await expect(page.getByText('BRONZE')).toBeVisible();

  // 3. Dismiss modal
  await page.getByRole('button', { name: 'Awesome!' }).click();

  // 4. Check profile shows badge
  await page.goto('/student/achievements');
  await expect(page.getByAltText('Word Master Bronze')).toBeVisible();
});
```

---

## Migration Plan

### Database Migrations

**Migration 1**: `063_achievement_system.sql`
```sql
-- Create achievements table
CREATE TABLE student_achievements (...);

-- Create pinned badges column
ALTER TABLE student_lesson_progress
ADD COLUMN pinned_achievements TEXT[] DEFAULT '{}';

-- Create leaderboard view
CREATE VIEW classroom_leaderboard AS (...);

-- Create achievement check function
CREATE FUNCTION check_achievement_unlocks(...);
```

**Migration 2**: `064_achievement_triggers.sql`
```sql
-- Auto-update achievement progress
CREATE TRIGGER achievement_progress_update (...);
```

### Rollout Plan

**Phase 1**: Backend + Database
1. Create achievement configuration (`achievementManager.ts`)
2. Run database migrations
3. Add achievement detection to `useEducationXp`
4. Unit test achievement logic

**Phase 2**: UI Components
1. Build `AchievementUnlockModal` (reuse `LevelUpCelebration`)
2. Build `StudentAchievementProfile` grid
3. Build `ClassroomLeaderboard` component
4. Add sound effects

**Phase 3**: Integration
1. Wire achievement detection in practice flows
2. Add leaderboard to Student Dashboard
3. Add profile tab to Student Dashboard
4. Add translations (4 languages)

**Phase 4**: Testing + Polish
1. E2E achievement flow tests
2. Visual regression tests (badges, modals)
3. Performance testing (large badge collections)
4. Accessibility audit (ARIA labels, keyboard nav)

---

## Performance Considerations

### Database Optimization

**Indexes**:
```sql
CREATE INDEX idx_achievements_student ON student_achievements(student_id);
CREATE INDEX idx_achievements_earned_at ON student_achievements(earned_at DESC);
CREATE INDEX idx_progress_xp ON student_lesson_progress(total_xp DESC);
```

**Query Optimization**:
- Leaderboard query: `LIMIT 3` + current student rank only
- Profile query: Fetch achievements + metadata in single query
- Cache achievement definitions in memory (static config)

**Pagination**:
- Profile badge grid: Virtualized scrolling for 100+ badges (future-proof)
- Leaderboard: No pagination needed (top 3 + you)

### Frontend Optimization

**Lazy Loading**:
- `AchievementUnlockModal`: Preload on mount (small bundle)
- `StudentAchievementProfile`: Code-split route
- Badge images: WebP format, lazy load below fold

**State Management**:
- Achievement state in `PracticeSessionProvider` context
- Avoid prop drilling via React Context
- Optimistic updates for badge pinning

---

## Security Considerations

### RLS Policies

**student_achievements table**:
```sql
-- Students can only view their own achievements
CREATE POLICY achievements_select ON student_achievements
  FOR SELECT USING (auth.uid() = student_id);

-- Achievements can only be inserted via function (no direct INSERT)
CREATE POLICY achievements_insert ON student_achievements
  FOR INSERT WITH CHECK (false);
```

**Leaderboard view**:
```sql
-- Students can only view their classroom's leaderboard
CREATE POLICY leaderboard_select ON classroom_leaderboard
  FOR SELECT USING (
    classroom_id IN (
      SELECT classroom_id FROM classroom_memberships
      WHERE student_id = auth.uid()
    )
  );
```

### Validation

**Achievement Unlock Verification**:
- Server-side check via Supabase function (not client-side only)
- Validate student owns the progress data
- Prevent duplicate unlocks via UNIQUE constraint

**XP Bonus Validation**:
- Cap bonus XP per achievement (max 1000 XP)
- Verify achievement exists in config before awarding
- Log suspicious activity (rapid achievement unlocks)

---

## Translation Requirements

### New Translation Keys Needed

**education.achievements** section:
```javascript
education.achievements: {
  // Modal
  unlocked: "Achievement Unlocked!",
  continue: "Awesome!",

  // Tiers
  tiers: {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum"
  },

  // Profile
  profileTitle: "Your Achievements",
  completion: "Completion: {percent}% - {earned}/{total} badges",
  pinBadge: "Pin Badge",
  unpinBadge: "Unpin Badge",
  maxPinnedReached: "You can only pin 3 badges",

  // Categories
  categories: {
    all: "All",
    progress: "Progress",
    skill: "Skill",
    consistency: "Consistency",
    exploration: "Exploration"
  },

  // Progress
  progress: "Progress: {current}/{total}",
  locked: "Locked",
  secret: "???",
  secretHint: "{hint}",

  // Leaderboard
  leaderboard: {
    title: "Classroom Leaderboard",
    yourRank: "You're #{rank}",
    topStudents: "Top Students",
    noData: "No active students yet"
  }
}
```

**Achievement Names + Descriptions** (per achievement):
```javascript
achievements: {
  first_lesson: {
    name: "First Steps",
    description: "Complete your first lesson",
    secretHint: "Complete a lesson to unlock"
  },
  word_master: {
    name: "Word Master",
    description: "Find {threshold} vocabulary words",
    tiers: {
      bronze: "Find 50 vocabulary words",
      silver: "Find 150 vocabulary words",
      gold: "Find 500 vocabulary words",
      platinum: "Find 1000 vocabulary words"
    }
  },
  // ... all achievements
}
```

**Languages Required**: English, Hebrew, Swedish, Japanese, Spanish

---

## Dependencies and Blockers

### Prerequisites (Phase 18 - Completed)
- ✅ XP tracking in database (`062_education_xp_tracking.sql`)
- ✅ `useEducationXp` hook for XP state management
- ✅ `educationXpManager` for XP calculation
- ✅ `LevelUpCelebration` component for modal pattern
- ✅ Confetti utilities for celebrations

### External Dependencies
- Supabase: Database migrations, RLS policies, functions
- Canvas-confetti: Already installed (used in Phase 18)
- Framer Motion: Already installed (used in Phase 18)
- Radix UI: Already installed (accessible components)

### Potential Blockers
1. **Achievement configuration complexity**: 15-20 achievements with 4 tiers = complex logic
   - **Mitigation**: Start with 8-10 core achievements, expand later
2. **Leaderboard privacy concerns**: Students seeing other names
   - **Mitigation**: Top 3 only + anonymize option (future)
3. **Sound effect browser compatibility**: Autoplay restrictions
   - **Mitigation**: Play on user action (button click) only

---

## Open Questions for Planning

### Technical Decisions

1. **Achievement Storage**: Store achievement config in database or code?
   - **Recommendation**: Code (`achievementManager.ts`) for flexibility, cache in DB for queries

2. **Leaderboard Time Scope**: Weekly reset vs all-time?
   - **Phase Context**: Claude's discretion
   - **Recommendation**: Default all-time, add weekly toggle later (Phase 20)

3. **Inactive Student Handling**: Hide or gray out students 7+ days inactive?
   - **Phase Context**: Claude's discretion
   - **Recommendation**: Gray out with "(inactive)" label

4. **Badge Images**: SVG icons, emoji, or generated images?
   - **Recommendation**: Emoji for MVP (🏆, ⭐, 🎖️), custom SVGs later

5. **Secret Badge Percentage**: 5-10% secret badges?
   - **Recommendation**: 10% (2 out of 20 badges)

### UX Decisions

1. **Modal Prominence**: Full celebration for all tiers or tiered approach?
   - **Phase Context**: Claude's discretion
   - **Recommendation**: Full modal for Gold/Platinum, toast for Bronze/Silver

2. **Profile Badge Layout**: Grid, category sections, or carousel?
   - **Phase Context**: Claude's discretion
   - **Recommendation**: Grid with category filter tabs

3. **Leaderboard XP Display**: Show XP amounts, levels, or rank-only?
   - **Phase Context**: Claude's discretion
   - **Recommendation**: Show level + XP (transparency encourages progress)

---

## Success Metrics

### Quantitative Metrics

1. **Achievement Unlock Rate**: % of students earning at least 1 achievement/week
   - **Target**: 60%+ of active students
2. **Profile Engagement**: % of students viewing achievement profile
   - **Target**: 40%+ weekly
3. **Leaderboard Views**: Daily leaderboard views per student
   - **Target**: 2+ views/day
4. **Completion Rate**: Average achievement completion %
   - **Target**: 30%+ completion (6/20 badges)

### Qualitative Metrics

1. **Student Feedback**: Surveys on achievement meaningfulness
2. **Teacher Feedback**: Are achievements motivating students?
3. **Retention Impact**: Do achievement unlocks correlate with continued practice?

---

## Recommendations for Planning Phase

### Critical Path Features (Must Have)

1. **Achievement System Core**:
   - Achievement configuration (8-10 achievements to start)
   - Unlock detection logic in `useEducationXp`
   - Database migrations (tables, views, triggers)

2. **Unlock Celebration**:
   - `AchievementUnlockModal` component
   - Confetti + sound effects
   - Translation keys for all languages

3. **Profile Display**:
   - `StudentAchievementProfile` component
   - Badge grid with progress bars
   - Pin/unpin functionality

4. **Classroom Leaderboard**:
   - `ClassroomLeaderboard` component
   - Top 3 + current rank display
   - Privacy-conscious design

### Nice-to-Have (Defer to Future)

1. **Advanced Leaderboard**:
   - Weekly/monthly time scopes
   - Classroom comparison charts
   - Historical rank tracking

2. **Achievement Details**:
   - Full achievement history timeline
   - Rarity statistics (% of students who earned)
   - Detailed progress graphs

3. **Social Features**:
   - Share achievement unlocks
   - Compare achievements with friends
   - Achievement-based challenges

### Technical Debt to Avoid

1. **Achievement Config in Database**: Keep in code for flexibility
2. **Client-Side Only Detection**: Always verify server-side
3. **Hardcoded Thresholds**: Use config constants for easy tuning
4. **Missing Tests**: 80%+ coverage for achievement logic

---

## Conclusion

Phase 19 builds on Phase 18's solid XP foundation to create a comprehensive achievement system. The existing celebration components, confetti utilities, and XP infrastructure provide excellent building blocks. Key implementation focuses:

1. **Reuse existing patterns** (`LevelUpCelebration` → `AchievementUnlockModal`)
2. **Server-side validation** (Supabase functions for unlock verification)
3. **Privacy-first design** (classroom-scoped leaderboard)
4. **Meaningful achievements** (genuine milestones, not trivial actions)

**Ready for planning phase with clear technical direction and existing infrastructure support.**
