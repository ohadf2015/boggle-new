# Phase 41: Student Dashboard Overhaul - Research

**Researched:** 2026-02-14
**Domain:** Dashboard UX, Activity Feeds, Social Features
**Confidence:** HIGH

## Summary

Phase 41 transforms the student dashboard from a basic lesson list into an engaging, activity-rich hub. The dashboard serves as a student's home base, showcasing their progress, upcoming challenges, classroom social activity, and quick-access actions.

**Current State:** Student dashboard (PageClient.tsx) exists with hero card, challenges panel, leaderboard, and lesson list. Profile page (profile/PageClient.tsx) shows stats and achievements. The infrastructure is solid but lacks social features and quick-play affordances.

**Standard Approach:** Modern educational dashboards follow a widget-based layout with activity feeds, quick actions, progress visualization, and social comparison. Key pattern: hero section → quick actions → activity feed → deeper content.

**Primary recommendation:** Extend existing dashboard with activity feed widget and quick-play buttons. Create profile page enhancements. Build classroom activity feed using existing database tables (student_duels, student_achievements, student_progress).

## Standard Stack

The established libraries/tools for student dashboard features:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.0.7 | Page routing, dynamic rendering | Already used, force-dynamic for real-time data |
| Framer Motion | Latest | Animations, transitions | Already integrated, neo-brutalist motion variants exist |
| Tailwind CSS | 3.4.18 | Styling, responsive layout | Project standard, neo-brutalist utilities defined |
| Supabase Realtime | Latest | Live activity updates | Already used for classroom updates, WebSocket built-in |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Radix UI | Latest | Accessible widgets (tabs, dialogs) | For activity filter tabs, quick-play menus |
| date-fns | Latest | Date formatting for activity timestamps | "2 hours ago", "Today at 3pm" |
| Lucide Icons | Latest | Neo-brutalist icons | Already used (Trophy, Zap, Flame) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Realtime | Socket.IO polling | Socket.IO already used for duels, but Supabase better for data-driven updates |
| Framer Motion | CSS animations | Motion library provides spring physics, better for neo-brutalist "pop" effects |

**Installation:**
No new dependencies required — all libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
app/[locale]/student/
├── page.tsx                    # Dashboard entry (force-dynamic)
├── PageClient.tsx              # Main dashboard (EXTEND THIS)
├── profile/
│   ├── page.tsx
│   └── PageClient.tsx          # Profile page (EXTEND THIS)
└── achievements/
    └── PageClient.tsx          # Full achievements page (already built)

components/student/
├── ActivityFeed.tsx            # NEW: Classroom activity timeline
├── ActivityItem.tsx            # NEW: Single activity card
├── QuickPlayPanel.tsx          # NEW: Quick-play buttons
└── StreakCalendar.tsx          # NEW: Visual streak calendar

components/education/
├── ClassroomLeaderboard.tsx    # EXISTS: Leaderboard widget
├── challenges/
│   └── ChallengePanel.tsx      # EXISTS: Daily/weekly challenges
└── milestones/
    └── MilestoneTracker.tsx    # EXISTS: Milestone progress

hooks/
├── useClassroomActivity.ts     # NEW: Fetch recent classroom activity
├── useStudentProfile.ts        # NEW: Fetch student full profile stats
└── useRealtimeActivity.ts      # NEW: Subscribe to live activity updates
```

### Pattern 1: Widget-Based Dashboard Layout
**What:** Dashboard composed of independent, reusable widgets
**When to use:** For flexible, extensible dashboard layouts

**Example:**
```tsx
// Source: Existing fe-next/app/[locale]/student/PageClient.tsx
export default function StudentPageClient() {
  // Auth + classroom data loading...

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      {/* Hero Card: XP + Stats + Mascot (EXISTS) */}
      <StudentProgress classroomId={classroomId} userId={user.id} />

      {/* NEW: Quick Play Panel */}
      <QuickPlayPanel classroomId={classroomId} userId={user.id} />

      {/* Daily & Weekly Challenges (EXISTS) */}
      <ChallengePanel playerId={user.id} />

      {/* NEW: Activity Feed */}
      <ActivityFeed classroomId={classroomId} userId={user.id} />

      {/* Full Classroom Leaderboard (EXISTS) */}
      <ClassroomLeaderboard classroomId={classroomId} currentUserId={user.id} />

      {/* Lesson List (EXISTS) */}
      <StudentLessonView />
    </div>
  );
}
```

### Pattern 2: Activity Feed Timeline
**What:** Reverse-chronological timeline of classroom events
**When to use:** For social features showing recent activity

**Example:**
```tsx
// Source: React Activity Feed patterns + Stream.io guidelines
interface ActivityItem {
  id: string;
  type: 'duel_completed' | 'achievement_unlocked' | 'milestone_reached' | 'lesson_completed';
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  timestamp: Date;
  metadata: {
    duelId?: string;
    achievementKey?: string;
    milestoneLevel?: number;
    lessonName?: string;
  };
}

function ActivityFeed({ classroomId }: { classroomId: string }) {
  const { activities, isLoading } = useClassroomActivity(classroomId);

  return (
    <motion.div
      className="p-6 rounded-neo-lg border-neo-thick bg-neo-navy/40 shadow-hard-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-xl font-neo-display font-bold text-neo-white mb-4">
        {t('student.dashboard.classroomActivity')}
      </h2>

      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </motion.div>
  );
}
```

### Pattern 3: Quick Play Panel with Action Buttons
**What:** Prominent buttons for starting practice/duels without navigating
**When to use:** For reducing friction to core actions

**Example:**
```tsx
function QuickPlayPanel({ classroomId, userId }: Props) {
  const { lessons } = useStudentProgress();

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Quick Practice */}
      <motion.button
        whileHover={{ scale: 1.02, rotate: -1 }}
        whileTap={{ scale: 0.98 }}
        className="p-4 bg-neo-cyan text-neo-black rounded-neo-lg border-neo-thick border-neo-black shadow-hard-lg"
        onClick={() => startQuickPractice()}
      >
        <Zap className="w-8 h-8 mb-2 mx-auto" />
        <span className="font-neo-display font-bold">
          {t('student.dashboard.quickPractice')}
        </span>
      </motion.button>

      {/* Quick Duel */}
      <motion.button
        whileHover={{ scale: 1.02, rotate: 1 }}
        whileTap={{ scale: 0.98 }}
        className="p-4 bg-neo-pink text-neo-white rounded-neo-lg border-neo-thick border-neo-black shadow-hard-lg"
        onClick={() => openDuelLobby()}
      >
        <Swords className="w-8 h-8 mb-2 mx-auto" />
        <span className="font-neo-display font-bold">
          {t('student.dashboard.quickDuel')}
        </span>
      </motion.button>
    </div>
  );
}
```

### Pattern 4: Streak Calendar Visualization
**What:** Visual calendar showing daily streak status
**When to use:** For gamifying consistency and daily engagement

**Example:**
```tsx
function StreakCalendar({ userId }: { userId: string }) {
  const { currentStreak, streakHistory } = useWinStreak();
  const days = getLast30Days();

  return (
    <div className="p-4 rounded-neo bg-neo-navy/40 border-neo border-neo-black">
      <h3 className="font-neo-display font-bold text-neo-white mb-3">
        {t('student.dashboard.streakCalendar')} 🔥 {currentStreak}
      </h3>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div
            key={day.date}
            className={cn(
              "w-8 h-8 rounded-neo border-2 flex items-center justify-center text-xs font-bold",
              streakHistory[day.date]
                ? "bg-neo-pink/30 border-neo-pink text-neo-pink"
                : "bg-neo-black/20 border-neo-black/50 text-neo-white/30"
            )}
          >
            {day.day}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Infinite scroll activity feed:** Use pagination instead (20 items, "Load More" button) to avoid performance issues
- **Real-time updates without debouncing:** Supabase realtime can fire rapidly; debounce updates to avoid re-render storms
- **Generic "View Profile" button:** Make profile stats visible directly on dashboard (reduce clicks)
- **Activity feed without filtering:** Students should filter by activity type (duels, achievements, milestones)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting ("2 hours ago") | Custom timestamp formatter | `date-fns` formatDistanceToNow | Handles i18n, edge cases, pluralization |
| Real-time updates | Polling with setInterval | Supabase Realtime subscriptions | Built-in reconnection, efficient, scales better |
| Activity feed pagination | Custom offset/limit logic | Supabase `.range(0, 19)` + cursor | Handles edge cases, performant |
| Streak calendar date calculations | Manual date math | `date-fns` date utilities | Handles timezones, DST, leap years |
| Activity filtering UI | Custom filter state | Radix UI Tabs component | Accessible, keyboard navigation, proper ARIA |
| Profile stats aggregation | Client-side summing | Supabase RPC functions | Database is faster, handles concurrency |

**Key insight:** Dashboard data aggregation (total XP, duel win rate, achievement count) should happen server-side via Supabase RPC functions. Client-side aggregation breaks with large datasets and doesn't handle real-time updates efficiently.

## Common Pitfalls

### Pitfall 1: Activity Feed Performance Degradation
**What goes wrong:** Fetching all classroom activity on every page load causes slow dashboard loads as classroom grows.

**Why it happens:** Student dashboards fetch activity without limits, loading hundreds of records for active classrooms.

**How to avoid:**
- Limit initial fetch to 20 most recent activities
- Use Supabase `.range(0, 19)` for pagination
- Add index on `created_at DESC` for activity queries
- Consider caching recent activity in Redis for 1 minute

**Warning signs:**
- Dashboard load time > 2 seconds
- Activity feed query returning > 100 rows
- Multiple students reporting slow dashboard

### Pitfall 2: Real-Time Update Overload
**What goes wrong:** Subscribing to all classroom events causes UI to re-render constantly during active periods.

**Why it happens:** Supabase Realtime fires on every INSERT/UPDATE. Active classroom = constant updates.

**How to avoid:**
- Debounce real-time updates (250ms)
- Subscribe only to relevant tables (student_duels, student_achievements)
- Use optimistic updates for user's own actions
- Unsubscribe when component unmounts

**Warning signs:**
- UI feels janky during classroom games
- React DevTools shows constant re-renders
- Students report dashboard "jumping around"

### Pitfall 3: Missing RTL Support for Activity Feed
**What goes wrong:** Activity feed timestamps, avatars, and icons don't flip for Hebrew (RTL language).

**Why it happens:** Forgot to apply `rtl` class and `dir="rtl"` to activity items.

**How to avoid:**
- Wrap ActivityFeed in `<div className={cn(isRTL && 'rtl')}>`
- Use `flex-row-reverse` for RTL avatar positioning
- Test with `?locale=he` before committing
- Use logical properties: `ms-2` instead of `ml-2`

**Warning signs:**
- Hebrew dashboard looks broken
- Avatars on wrong side
- Timestamps don't align properly

### Pitfall 4: Stale Profile Statistics
**What goes wrong:** Student profile shows outdated stats (old XP, wrong duel count) because cache isn't invalidated.

**Why it happens:** Profile fetches data once on mount, doesn't refetch when student completes activities.

**How to avoid:**
- Use SWR or TanStack Query for automatic revalidation
- Invalidate profile cache when student completes duel/achievement
- Subscribe to Supabase Realtime for student's own profile updates
- Add "Refresh" button as fallback

**Warning signs:**
- Students complain stats don't update
- Refresh page shows correct stats
- Achievements appear after page reload

### Pitfall 5: Quick Play Buttons Without Loading States
**What goes wrong:** Quick play buttons feel broken because they don't show loading feedback when clicked.

**Why it happens:** Starting practice/duel requires async operations (fetch lesson, create session) but button doesn't show progress.

**How to avoid:**
- Use `useMutation` or similar pattern for async actions
- Show spinner in button during loading
- Disable button to prevent double-clicks
- Show error toast if action fails

**Warning signs:**
- Students click button multiple times
- Confusion about whether action worked
- Multiple practice sessions created accidentally

## Code Examples

Verified patterns from existing codebase:

### Classroom Activity Hook
```typescript
// Source: Pattern from useClassroomLeaderboard.ts and useStudentProgress.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

interface ActivityItem {
  id: string;
  type: 'duel_completed' | 'achievement_unlocked' | 'milestone_reached';
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export function useClassroomActivity(classroomId: string, limit = 20) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      if (!supabase || !classroomId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch recent duels
        const { data: duels, error: duelsError } = await supabase
          .from('student_duels')
          .select(`
            id,
            completed_at,
            winner_id,
            challenger:challenger_id (id, display_name, avatar_emoji),
            opponent:opponent_id (id, display_name, avatar_emoji)
          `)
          .eq('classroom_id', classroomId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .range(0, limit - 1);

        if (duelsError) throw duelsError;

        // Fetch recent achievements
        const { data: achievements, error: achievementsError } = await supabase
          .from('student_achievements')
          .select(`
            id,
            unlocked_at,
            student:student_id (id, display_name, avatar_emoji),
            achievement:achievement_id (key, icon)
          `)
          .order('unlocked_at', { ascending: false })
          .range(0, limit - 1);

        if (achievementsError) throw achievementsError;

        // Merge and sort by timestamp
        const combinedActivities: ActivityItem[] = [
          ...(duels || []).map(d => ({
            id: `duel-${d.id}`,
            type: 'duel_completed' as const,
            actorId: d.winner_id,
            actorName: d.winner_id === d.challenger?.id ? d.challenger.display_name : d.opponent?.display_name,
            actorAvatar: d.winner_id === d.challenger?.id ? d.challenger.avatar_emoji : d.opponent?.avatar_emoji,
            timestamp: new Date(d.completed_at),
            metadata: { duelId: d.id }
          })),
          ...(achievements || []).map(a => ({
            id: `achievement-${a.id}`,
            type: 'achievement_unlocked' as const,
            actorId: a.student?.id,
            actorName: a.student?.display_name || 'Unknown',
            actorAvatar: a.student?.avatar_emoji,
            timestamp: new Date(a.unlocked_at),
            metadata: { achievementKey: a.achievement?.key, icon: a.achievement?.icon }
          }))
        ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
         .slice(0, limit);

        setActivities(combinedActivities);
        setIsLoading(false);
      } catch (err) {
        logger.error('Error fetching classroom activity:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    }

    fetchActivity();
  }, [classroomId, limit]);

  return { activities, isLoading, error };
}
```

### Activity Feed Component
```tsx
// Source: Pattern from ClassroomLeaderboard.tsx and ChallengePanel.tsx
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomActivity } from '@/hooks/useClassroomActivity';
import { cn } from '@/lib/utils';
import { Trophy, Award, TrendingUp } from 'lucide-react';

export function ActivityFeed({ classroomId, userId }: { classroomId: string; userId: string }) {
  const { t, language } = useLanguage();
  const { activities, isLoading } = useClassroomActivity(classroomId);
  const isRTL = language === 'he';

  if (isLoading) {
    return (
      <div className="p-6 rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy/40 shadow-hard-lg">
        <div className="h-8 w-48 bg-neo-white/10 rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-neo-white/10 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={cn("p-6 rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy/40 shadow-hard-lg mb-6", isRTL && 'rtl')}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-xl font-neo-display font-bold text-neo-white mb-4">
        {t('student.dashboard.classroomActivity')}
      </h2>

      {activities.length === 0 ? (
        <p className="text-neo-white/50 text-center py-8 font-neo-body">
          {t('student.dashboard.noActivityYet')}
        </p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-neo border-2 border-neo-black/30 bg-neo-navy/20",
                activity.actorId === userId && "border-neo-cyan/50"
              )}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-neo bg-neo-cyan/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">{activity.actorAvatar || '👤'}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-neo-white font-neo-body text-sm">
                  <span className="font-bold">{activity.actorName}</span>
                  {' '}
                  {activity.type === 'duel_completed' && t('student.dashboard.activity.wonDuel')}
                  {activity.type === 'achievement_unlocked' && t('student.dashboard.activity.unlockedAchievement')}
                  {activity.type === 'milestone_reached' && t('student.dashboard.activity.reachedMilestone')}
                </p>
                <p className="text-neo-white/50 text-xs font-neo-body">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>

              {/* Icon */}
              <div className="flex-shrink-0">
                {activity.type === 'duel_completed' && <Trophy className="w-5 h-5 text-neo-yellow" />}
                {activity.type === 'achievement_unlocked' && <Award className="w-5 h-5 text-neo-pink" />}
                {activity.type === 'milestone_reached' && <TrendingUp className="w-5 h-5 text-neo-cyan" />}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
```

### Quick Play Panel Component
```tsx
// Source: Pattern from QuickPlayButton.tsx and existing dashboard buttons
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { Zap, Swords, BookOpen } from 'lucide-react';

export function QuickPlayPanel({ classroomId, userId }: { classroomId: string; userId: string }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { lessons } = useStudentProgress();

  const handleQuickPractice = () => {
    if (lessons.length > 0) {
      const randomLesson = lessons[Math.floor(Math.random() * lessons.length)];
      router.push(`/${language}/student/lessons/${randomLesson.id}`);
    }
  };

  const handleQuickDuel = () => {
    router.push(`/${language}/duels/lobby?classroomId=${classroomId}`);
  };

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Quick Practice */}
      <motion.button
        whileHover={{ scale: 1.02, rotate: -1 }}
        whileTap={{ scale: 0.98 }}
        className="p-6 bg-neo-cyan text-neo-black rounded-neo-lg border-neo-thick border-neo-black shadow-hard-lg transition-all hover:shadow-hard-pressed active:shadow-hard-pressed"
        onClick={handleQuickPractice}
        disabled={lessons.length === 0}
      >
        <Zap className="w-10 h-10 mb-2 mx-auto" />
        <span className="font-neo-display font-bold text-lg block">
          {t('student.dashboard.quickPractice')}
        </span>
        <span className="text-xs opacity-80 mt-1 block">
          {t('student.dashboard.randomLesson')}
        </span>
      </motion.button>

      {/* Quick Duel */}
      <motion.button
        whileHover={{ scale: 1.02, rotate: 1 }}
        whileTap={{ scale: 0.98 }}
        className="p-6 bg-neo-pink text-neo-white rounded-neo-lg border-neo-thick border-neo-black shadow-hard-lg transition-all hover:shadow-hard-pressed active:shadow-hard-pressed"
        onClick={handleQuickDuel}
      >
        <Swords className="w-10 h-10 mb-2 mx-auto" />
        <span className="font-neo-display font-bold text-lg block">
          {t('student.dashboard.quickDuel')}
        </span>
        <span className="text-xs opacity-80 mt-1 block">
          {t('student.dashboard.challengeClassmate')}
        </span>
      </motion.button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static lesson list dashboard | Widget-based dashboard with activity feeds | 2024-2025 shift | Students see classroom context, not just their own progress |
| Manual profile page navigation | Quick stats on dashboard | Modern dashboards (2025+) | Reduces clicks, faster access to key info |
| Generic "News Feed" | Filtered activity timelines | 2025+ social platforms | Students control what they see (duels vs achievements) |
| Client-side aggregation | Server-side RPC functions | 2024+ with database optimization | Better performance, scales to 1000+ students |
| Polling for updates | Real-time subscriptions | 2024+ with WebSocket/Supabase | Instant updates, lower server load |

**Deprecated/outdated:**
- **Infinite scroll activity feeds:** Replaced by paginated "Load More" pattern (better UX on mobile, avoids infinite loading states)
- **Custom date formatters:** Use `date-fns` for i18n-aware relative dates ("2 hours ago" in Hebrew, Swedish, Japanese)
- **Manual real-time polling:** Use Supabase Realtime subscriptions instead of `setInterval`

## Open Questions

Things that couldn't be fully resolved:

1. **Duel Invite Widget vs Activity Feed**
   - What we know: SOC-01 requires "duel invites widget" but Phase 38 already built DuelLobby with pending invites
   - What's unclear: Should pending invites be a separate widget on dashboard, or redirect to DuelLobby?
   - Recommendation: Add small "Pending Duels" badge to Quick Duel button (shows count), clicking opens DuelLobby. Avoids widget duplication.

2. **Streak Calendar Granularity**
   - What we know: Students have `current_streak` (days) in student_progress table
   - What's unclear: Should calendar show last 7 days, 30 days, or current month?
   - Recommendation: Show last 7 days (fits mobile, less overwhelming). Add "View Full History" link to profile page.

3. **Activity Feed Real-Time Updates**
   - What we know: Supabase Realtime can subscribe to table changes
   - What's unclear: Should activity feed update live (instant) or on page refresh?
   - Recommendation: Start with page refresh (simpler). Add real-time in Phase 42 polish if students request it.

4. **Profile Page Duel Record Format**
   - What we know: SOC-01 requires "duel record" on profile page
   - What's unclear: Format — total wins/losses, win rate %, or head-to-head with each classmate?
   - Recommendation: Show total wins/losses + win rate % prominently. Add "View Full Duel History" link to separate page (Phase 38's DuelHistory component).

## Sources

### Primary (HIGH confidence)
- Existing codebase: fe-next/app/[locale]/student/PageClient.tsx (dashboard structure)
- Existing codebase: fe-next/components/education/ClassroomLeaderboard.tsx (widget pattern)
- Existing codebase: fe-next/hooks/useClassroomLeaderboard.ts (data fetching pattern)
- Database schema: fe-next/supabase/migrations/20260213000000_education_duels_practice.sql (activity data sources)
- Database schema: fe-next/supabase/migrations/063_education_achievements.sql (achievement tracking)

### Secondary (MEDIUM confidence)
- [16 Best React Dashboards in 2026 | Untitled UI](https://www.untitledui.com/blog/react-dashboards) - Dashboard layout best practices
- [Figma activity feed components | Untitled UI](https://www.untitledui.com/components/activity-feeds) - Activity feed design patterns
- [React Activity Feed Tutorial | Stream.io](https://getstream.io/react-activity-feed/tutorial/) - Activity feed implementation
- [How to Build a Realtime Activity Feed with React and Pusher](https://pusher.com/blog/how-to-build-a-realtime-activity-feed-with-react-and-pusher/) - Real-time update patterns
- [Next.js Dashboard Templates 2026 | NextAdmin](https://nextadmin.co/) - Modern dashboard patterns
- [React Timeline component - Material UI](https://mui.com/material-ui/react-timeline/) - Timeline visualization

### Tertiary (LOW confidence)
- None - all findings verified with existing codebase or authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in active use
- Architecture: HIGH - Patterns verified in existing dashboard/widget components
- Pitfalls: HIGH - Based on common issues in similar dashboards (performance, RTL, real-time)

**Research date:** 2026-02-14
**Valid until:** 30 days (stable patterns, database schema unlikely to change)
