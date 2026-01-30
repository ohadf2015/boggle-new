# Feature 1: Expandable Leaderboard - Implementation Spec

**Impact**: Student engagement ↑20%
**Effort**: Low (1-2 days)
**Priority**: P0 (Critical)

---

## Problem Statement

Current leaderboard only shows top 3 students. Students ranked 4+ see "..." instead of their actual position, which:
- Kills motivation for 70%+ of students
- Provides no context for improvement
- Hides progress from non-top performers

---

## Solution: Expandable Leaderboard

Show **top 3** + **current user's context** (±2 students around them) + **expand option** for full list.

---

## Visual Design (Before & After)

### BEFORE (Current)
```
┌────────────────────────────────┐
│ Classroom Leaderboard          │
├────────────────────────────────┤
│ 🥇 Alice        1,250 XP       │ (gold)
│ 🥈 Bob          1,100 XP       │ (silver)
│ 🥉 Carlos         950 XP       │ (bronze)
│ ...                            │ (everyone else hidden)
└────────────────────────────────┘
```

**Pain Point**: If you're rank 7 of 15, you see "..." with no idea where you stand.

---

### AFTER (Proposed - Compact View)
```
┌────────────────────────────────┐
│ Classroom Leaderboard          │
├────────────────────────────────┤
│ 🥇 Alice        1,250 XP       │ (neo-yellow bg)
│ 🥈 Bob          1,100 XP       │ (gray-800 bg)
│ 🥉 Carlos         950 XP       │ (gray-800 bg)
├────────────────────────────────┤
│ ...                            │ (collapse indicator)
├────────────────────────────────┤
│ 5. Emma           720 XP       │
│ 6. Frank          680 XP       │
│ 7. YOU            645 XP   ←   │ (neo-cyan highlight)
│ 8. Grace          600 XP       │
│ 9. Henry          580 XP       │
├────────────────────────────────┤
│ View Full (15 students) →      │ (expand button)
└────────────────────────────────┘
```

---

### AFTER (Proposed - Expanded Modal)
```
┌─────────────────────────────────────────┐
│ Classroom Leaderboard - English 101 [✕] │
│                                         │
│ 15 students ranked by total XP          │
├─────────────────────────────────────────┤
│ 🥇  1. Alice             1,250 XP       │ (gold highlight)
│ 🥈  2. Bob               1,100 XP       │ (silver highlight)
│ 🥉  3. Carlos              950 XP       │ (bronze highlight)
│     4. Diana               880 XP       │
│     5. Emma                720 XP       │
│     6. Frank               680 XP       │
│ →   7. YOU                 645 XP   ←   │ (cyan highlight)
│     8. Grace               600 XP       │
│     9. Henry               580 XP       │
│    10. Ivy                 520 XP       │
│    11. Jack                480 XP       │
│    12. Kelly               420 XP       │
│    13. Liam                350 XP       │
│    14. Mia                 290 XP       │
│    15. Noah                220 XP       │
├─────────────────────────────────────────┤
│ XP gap to #6: 35 XP                     │
│ Last updated: 2 minutes ago             │
│                                         │
│ [Close]                                 │
└─────────────────────────────────────────┘
```

---

## Component Implementation

### Updated Hook: useClassroomLeaderboard

```typescript
// hooks/useClassroomLeaderboard.ts

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface LeaderboardStudent {
  id: string;
  name: string;
  totalXp: number;
  rank: number;
  lastActive: Date;
}

export interface LeaderboardContext {
  currentUserRank: number;
  studentsAbove: LeaderboardStudent[]; // 2 students above current user
  studentsBelow: LeaderboardStudent[]; // 2 students below current user
  gapToNextRank: number; // XP difference to next rank
}

export function useClassroomLeaderboard(classroomId: string, currentUserId: string) {
  const [topStudents, setTopStudents] = useState<LeaderboardStudent[]>([]);
  const [allStudents, setAllStudents] = useState<LeaderboardStudent[]>([]);
  const [context, setContext] = useState<LeaderboardContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    // Real-time subscription (refresh every 5 minutes or on demand)
    const interval = setInterval(fetchLeaderboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [classroomId, currentUserId]);

  async function fetchLeaderboard() {
    try {
      // Fetch all students in classroom with their XP
      const { data: students, error } = await supabase
        .from('classroom_memberships')
        .select(`
          student_id,
          students:student_id (
            id,
            name,
            student_xp (
              total_xp,
              last_activity
            )
          )
        `)
        .eq('classroom_id', classroomId)
        .order('students.student_xp.total_xp', { ascending: false });

      if (error) throw error;

      // Transform and rank students
      const ranked: LeaderboardStudent[] = students
        .map((m, index) => ({
          id: m.students.id,
          name: m.students.name,
          totalXp: m.students.student_xp?.total_xp || 0,
          rank: index + 1,
          lastActive: new Date(m.students.student_xp?.last_activity)
        }))
        .sort((a, b) => b.totalXp - a.totalXp);

      setAllStudents(ranked);
      setTopStudents(ranked.slice(0, 3));

      // Calculate context for current user
      const currentUserIndex = ranked.findIndex(s => s.id === currentUserId);
      if (currentUserIndex >= 0) {
        const currentUser = ranked[currentUserIndex];
        const studentsAbove = ranked.slice(Math.max(0, currentUserIndex - 2), currentUserIndex);
        const studentsBelow = ranked.slice(currentUserIndex + 1, currentUserIndex + 3);
        const nextRankStudent = ranked[currentUserIndex - 1];
        const gapToNextRank = nextRankStudent ? nextRankStudent.totalXp - currentUser.totalXp : 0;

        setContext({
          currentUserRank: currentUser.rank,
          studentsAbove,
          studentsBelow,
          gapToNextRank
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
    }
  }

  return {
    topStudents,
    allStudents,
    context,
    loading,
    refresh: fetchLeaderboard
  };
}
```

---

### Updated Component: ClassroomLeaderboard

```typescript
// components/education/ClassroomLeaderboard.tsx

'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomLeaderboard } from '@/hooks/useClassroomLeaderboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ClassroomLeaderboard({
  classroomId,
  currentUserId,
  variant = 'compact'
}: {
  classroomId: string;
  currentUserId: string;
  variant?: 'compact' | 'expanded';
}) {
  const { t } = useLanguage();
  const { topStudents, allStudents, context, loading } = useClassroomLeaderboard(
    classroomId,
    currentUserId
  );
  const [showFullModal, setShowFullModal] = useState(false);

  if (loading) {
    return <LeaderboardSkeleton />;
  }

  return (
    <>
      {/* Compact View (Default) */}
      <div className="bg-neo-navy border-neo border-black rounded-neo shadow-hard p-4">
        <h3 className="font-neo-display text-lg text-neo-yellow mb-4">
          {t('education.classroomLeaderboard')}
        </h3>

        {/* Top 3 Students */}
        <div className="space-y-2 mb-3">
          {topStudents.map((student, index) => (
            <LeaderboardRow
              key={student.id}
              student={student}
              rank={index + 1}
              isMedal={true}
              isCurrentUser={student.id === currentUserId}
            />
          ))}
        </div>

        {/* Collapse Indicator */}
        {allStudents.length > 3 && context && context.currentUserRank > 3 && (
          <>
            <div className="border-t border-gray-700 my-2"></div>
            <div className="text-center text-gray-500 text-sm py-1">...</div>
            <div className="border-t border-gray-700 my-2"></div>

            {/* Current User Context (if not in top 3) */}
            <div className="space-y-2 mb-3">
              {context.studentsAbove.map(student => (
                <LeaderboardRow
                  key={student.id}
                  student={student}
                  rank={student.rank}
                  isCurrentUser={false}
                />
              ))}
              <LeaderboardRow
                student={allStudents.find(s => s.id === currentUserId)!}
                rank={context.currentUserRank}
                isCurrentUser={true}
              />
              {context.studentsBelow.map(student => (
                <LeaderboardRow
                  key={student.id}
                  student={student}
                  rank={student.rank}
                  isCurrentUser={false}
                />
              ))}
            </div>

            {/* Gap Info */}
            {context.gapToNextRank > 0 && (
              <div className="text-xs text-gray-400 mb-2">
                {context.gapToNextRank} XP {t('education.toNextRank')}
              </div>
            )}
          </>
        )}

        {/* Expand Button */}
        {allStudents.length > 3 && (
          <button
            onClick={() => setShowFullModal(true)}
            className="w-full mt-2 py-2 text-sm text-neo-cyan hover:text-neo-yellow transition-colors border-t border-gray-700 pt-3"
          >
            {t('education.viewFullLeaderboard')} ({allStudents.length} {t('common.students')}) →
          </button>
        )}
      </div>

      {/* Full Leaderboard Modal */}
      {showFullModal && (
        <Dialog open={showFullModal} onOpenChange={setShowFullModal}>
          <DialogContent className="max-w-2xl bg-neo-navy border-neo border-black rounded-neo shadow-hard-lg">
            <DialogHeader>
              <DialogTitle className="font-neo-display text-2xl text-neo-yellow">
                {t('education.classroomLeaderboard')}
              </DialogTitle>
              <p className="text-sm text-gray-400">
                {allStudents.length} {t('common.students')} {t('education.rankedByXp')}
              </p>
            </DialogHeader>

            {/* Full List */}
            <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
              {allStudents.map((student, index) => (
                <LeaderboardRow
                  key={student.id}
                  student={student}
                  rank={index + 1}
                  isMedal={index < 3}
                  isCurrentUser={student.id === currentUserId}
                  showDetails={true}
                />
              ))}
            </div>

            {/* Footer Info */}
            <div className="border-t border-gray-700 pt-3 text-sm text-gray-400">
              {context && context.gapToNextRank > 0 && (
                <p>XP {t('education.gapToNextRank')}: {context.gapToNextRank}</p>
              )}
              <p>{t('education.lastUpdated')}: {t('education.justNow')}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Sub-component: Leaderboard Row
function LeaderboardRow({
  student,
  rank,
  isMedal = false,
  isCurrentUser = false,
  showDetails = false
}: {
  student: any;
  rank: number;
  isMedal?: boolean;
  isCurrentUser?: boolean;
  showDetails?: boolean;
}) {
  const medal = isMedal
    ? rank === 1
      ? '🥇'
      : rank === 2
      ? '🥈'
      : '🥉'
    : null;

  const bgClass = isCurrentUser
    ? 'bg-neo-cyan/20 border-neo-cyan'
    : isMedal && rank === 1
    ? 'bg-neo-yellow/20 border-neo-yellow'
    : 'bg-gray-800 border-gray-700';

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-neo border-neo ${bgClass}`}
    >
      <div className="flex items-center gap-2">
        {medal ? (
          <span className="text-lg">{medal}</span>
        ) : (
          <span className="text-sm text-gray-400 w-6">{rank}.</span>
        )}
        <span className={`font-neo-body ${isCurrentUser ? 'font-bold text-neo-cyan' : 'text-white'}`}>
          {isCurrentUser ? 'YOU' : student.name}
        </span>
        {isCurrentUser && <span className="text-neo-cyan">←</span>}
      </div>
      <div className="text-right">
        <span className="font-neo-body font-bold text-white">{student.totalXp.toLocaleString()} XP</span>
        {showDetails && (
          <p className="text-xs text-gray-400">
            {t('education.active')} {formatRelativeTime(student.lastActive)}
          </p>
        )}
      </div>
    </div>
  );
}

// Skeleton Loader
function LeaderboardSkeleton() {
  return (
    <div className="bg-neo-navy border-neo border-black rounded-neo shadow-hard p-4 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-1/2 mb-4"></div>
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 bg-gray-700 rounded"></div>
        ))}
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
```

---

## Translation Keys

```json
// translations/en.json

{
  "education": {
    "classroomLeaderboard": "Classroom Leaderboard",
    "viewFullLeaderboard": "View Full",
    "rankedByXp": "ranked by total XP",
    "toNextRank": "to next rank",
    "gapToNextRank": "gap to next rank",
    "lastUpdated": "Last updated",
    "justNow": "just now",
    "active": "Active"
  }
}
```

---

## Database Optimization

### Add Index for Fast Ranking

```sql
-- Index on total_xp for fast sorting
CREATE INDEX idx_student_xp_total ON student_xp(total_xp DESC);

-- Composite index for classroom leaderboards
CREATE INDEX idx_classroom_memberships_leaderboard
ON classroom_memberships(classroom_id, student_id);
```

---

## Caching Strategy

```typescript
// Leaderboard data cached for 5 minutes to reduce DB load

const LEADERBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In useClassroomLeaderboard hook:
const cacheKey = `leaderboard:${classroomId}`;
const cachedData = localStorage.getItem(cacheKey);

if (cachedData) {
  const { data, timestamp } = JSON.parse(cachedData);
  if (Date.now() - timestamp < LEADERBOARD_CACHE_TTL) {
    setAllStudents(data);
    setLoading(false);
    return;
  }
}

// Fetch fresh data if cache miss or expired
// ... fetch logic ...

// Cache the result
localStorage.setItem(cacheKey, JSON.stringify({
  data: ranked,
  timestamp: Date.now()
}));
```

---

## Testing Checklist

- [ ] **Unit Tests**:
  - [ ] Hook returns top 3 students
  - [ ] Hook calculates current user rank correctly
  - [ ] Hook calculates XP gap to next rank
  - [ ] Context shows ±2 students around current user

- [ ] **Visual Tests**:
  - [ ] Medal icons show for top 3
  - [ ] Current user highlighted in cyan
  - [ ] Collapse indicator shows when rank > 3
  - [ ] Modal shows all students

- [ ] **Edge Cases**:
  - [ ] User is rank 1 (no students above)
  - [ ] User is last rank (no students below)
  - [ ] Only 3 students in classroom (no context needed)
  - [ ] User has 0 XP (shows rank correctly)

- [ ] **Performance**:
  - [ ] Leaderboard renders <100ms with 50 students
  - [ ] Cache works (no re-fetch within 5 min)
  - [ ] Real-time updates work every 5 min

---

## Estimated Effort

- **Hook Updates**: 0.5 days
- **Component Updates**: 0.5 days
- **Modal Implementation**: 0.5 days
- **Testing**: 0.5 days
- **Total**: 2 days

---

## Success Metrics

**Before**:
- 30% of students can see their rank (top 3 only)
- Unknown engagement impact

**After (Target)**:
- 100% of students can see their rank
- Student engagement ↑20% (practice sessions per week)
- Modal usage: 60% of students check full leaderboard weekly

---

## Files to Modify

1. `hooks/useClassroomLeaderboard.ts` - Add context calculation
2. `components/education/ClassroomLeaderboard.tsx` - Add expandable UI
3. `translations/en.json` (+ he, sv, ja) - Add new strings
4. Database migration - Add indexes

---

This completes the detailed specification for Feature 1 (Expandable Leaderboard).
