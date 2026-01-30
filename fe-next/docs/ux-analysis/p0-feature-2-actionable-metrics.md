# Feature 2: Actionable "Students Needing Help" Metric - Implementation Spec

**Impact**: Teachers intervene 3× faster
**Effort**: Low (1 day)
**Priority**: P0 (Critical)

---

## Problem Statement

The "Students Needing Help" metric card currently:
- Shows only a count (e.g., "3 students")
- Doesn't reveal WHO needs help
- Has no click-through to take action
- Forces teachers to manually check each student

This wastes teacher time and delays interventions for struggling students.

---

## Solution: Clickable Metric → Filtered Student List

Make the metric card clickable to navigate to a pre-filtered student list showing only struggling students, with quick actions available.

---

## Visual Design (Before & After)

### BEFORE (Current)
```
┌────────────────────────────────┐
│ Students Needing Help      [i] │ (info icon)
│                                │
│         3 students             │ (large number)
│                                │
│ (no additional details)        │
│ (not clickable)                │
└────────────────────────────────┘
```

**Pain Point**: Teacher sees "3 students" but has no idea who they are or how to help them.

---

### AFTER (Proposed - Hoverable Card)
```
┌────────────────────────────────┐
│ Students Needing Help      [i] │ (info icon)
│                                │
│         3 students             │ (large number)
│                                │
│ Alice, Bob, Carlos             │ (names preview)
│                                │
│ Click to view details →        │ (CTA on hover)
└────────────────────────────────┘

Hover State:
┌────────────────────────────────┐
│ Students Needing Help      [i] │
│                                │
│         3 students             │
│                                │
│ Alice (42% accuracy)           │ (red indicator)
│ Bob (55% accuracy)             │ (yellow indicator)
│ Carlos (58% accuracy)          │ (yellow indicator)
│                                │
│ Click to view details →        │ (cursor: pointer)
└────────────────────────────────┘
```

---

### AFTER (Proposed - Filtered Student List Page)

**Click → Navigate to Students Tab with Pre-Applied Filter**

```
┌─────────────────────────────────────────────────────┐
│ Teacher Dashboard > Students                        │
│                                                     │
│ Active Filter: Students Needing Help  [✕ Clear]    │ (filter chip)
│                                                     │
│ 3 students with <60% accuracy                       │
│                                                     │
│ [Sort: Most Struggling First ▼]                     │
│                                                     │
│ ┌─────────────────────────────────────────────────┐│
│ │ 🔴 Alice Johnson                                ││ (red indicator)
│ │    42% accuracy  |  15/50 words  |  Last: 3d ago││
│ │    Common mistakes: Ubiquitous, Ephemeral       ││
│ │    [📚 Assign Review] [💌 Send Message]         ││
│ ├─────────────────────────────────────────────────┤│
│ │ 🟡 Bob Smith                                    ││ (yellow indicator)
│ │    55% accuracy  |  28/50 words  |  Last: 1d ago││
│ │    Common mistakes: Cacophony, Benevolent       ││
│ │    [📚 Assign Review] [💌 Send Message]         ││
│ ├─────────────────────────────────────────────────┤│
│ │ 🟡 Carlos Lee                                   ││
│ │    58% accuracy  |  29/50 words  |  Last: 2d ago││
│ │    Common mistakes: Anomaly, Ephemeral          ││
│ │    [📚 Assign Review] [💌 Send Message]         ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ Quick Actions (Select All):                         │
│ [📚 Assign Review Lesson] [📧 Send Encouragement]   │
└─────────────────────────────────────────────────────┘
```

---

## Component Implementation

### 1. Update MetricCard to be Clickable

```typescript
// components/teacher/analytics/MetricCard.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InfoIcon } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: number;
  trend?: number;
  icon?: React.ReactNode;
  onClick?: () => void; // NEW: Make card clickable
  preview?: React.ReactNode; // NEW: Show preview on hover
  tooltip?: string;
}

export function MetricCard({
  title,
  value,
  trend,
  icon,
  onClick,
  preview,
  tooltip
}: MetricCardProps) {
  const [isHovering, setIsHovering] = useState(false);

  const isClickable = !!onClick;

  return (
    <div
      className={`
        bg-neo-navy border-neo border-black rounded-neo shadow-hard p-6
        transition-all duration-200
        ${isClickable ? 'cursor-pointer hover:shadow-hard-lg hover:-translate-y-1' : ''}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-neo-body text-sm text-gray-400 uppercase tracking-wide">
          {title}
        </h3>
        {tooltip && (
          <div className="relative group">
            <InfoIcon className="w-4 h-4 text-gray-500" />
            <div className="absolute right-0 top-6 w-48 p-2 bg-gray-900 text-xs text-white rounded-neo border-neo border-black shadow-hard opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {tooltip}
            </div>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        <p className="text-4xl font-neo-display font-bold text-neo-yellow">
          {value}
        </p>
        {trend !== undefined && (
          <p className={`text-sm ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
          </p>
        )}
      </div>

      {/* Preview (shown on hover or always for important metrics) */}
      {preview && (
        <div className={`transition-opacity ${isHovering ? 'opacity-100' : 'opacity-60'}`}>
          {preview}
        </div>
      )}

      {/* Click-through CTA */}
      {isClickable && (
        <div className={`mt-3 text-sm text-neo-cyan transition-opacity ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
          Click to view details →
        </div>
      )}
    </div>
  );
}
```

---

### 2. Update AnalyticsDashboard to Add Click Handler

```typescript
// components/teacher/analytics/AnalyticsDashboard.tsx

'use client';

import { useRouter } from 'next/navigation';
import { useClassroomAnalytics } from '@/hooks/useClassroomAnalytics';
import { MetricCard } from './MetricCard';

export function AnalyticsDashboard({ classroomId }: { classroomId: string }) {
  const router = useRouter();
  const { metrics, strugglingStudents, loading } = useClassroomAnalytics(classroomId);

  const handleStudentsNeedingHelpClick = () => {
    // Navigate to Students tab with pre-applied filter
    router.push(`/teacher?tab=students&filter=struggling&classroom=${classroomId}`);
  };

  if (loading) return <AnalyticsSkeleton />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Students Needing Help - NOW CLICKABLE */}
      <MetricCard
        title="Students Needing Help"
        value={metrics.studentsNeedingHelp}
        onClick={handleStudentsNeedingHelpClick}
        preview={
          strugglingStudents.length > 0 ? (
            <div className="text-sm space-y-1">
              {strugglingStudents.slice(0, 3).map(student => (
                <div key={student.id} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    student.accuracy < 50 ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-white">{student.name}</span>
                  <span className="text-gray-400">({student.accuracy}%)</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">All students doing well! 🎉</p>
          )
        }
        tooltip="Students with <60% accuracy on recent lessons"
      />

      {/* Other metrics... */}
      <MetricCard
        title="Class Average XP"
        value={metrics.avgXp}
        trend={metrics.xpTrend}
      />
      {/* ... */}
    </div>
  );
}
```

---

### 3. Update useClassroomAnalytics Hook

```typescript
// hooks/useClassroomAnalytics.ts

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface StrugglingStudent {
  id: string;
  name: string;
  accuracy: number; // percentage (0-100)
  wordsAttempted: number;
  wordsMastered: number;
  lastActive: Date;
  commonMistakes: string[]; // Top 3 words they struggle with
}

export function useClassroomAnalytics(classroomId: string) {
  const [metrics, setMetrics] = useState({
    studentsNeedingHelp: 0,
    avgXp: 0,
    activeToday: 0,
    xpTrend: 0
  });
  const [strugglingStudents, setStrugglingStudents] = useState<StrugglingStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [classroomId]);

  async function fetchAnalytics() {
    try {
      // Fetch student progress for classroom
      const { data: progress, error } = await supabase
        .from('student_lesson_progress')
        .select(`
          student_id,
          words_attempted,
          words_mastered,
          last_activity,
          students:student_id (
            id,
            name
          )
        `)
        .eq('classroom_id', classroomId);

      if (error) throw error;

      // Calculate struggling students (<60% accuracy)
      const struggling: StrugglingStudent[] = progress
        .map(p => {
          const attempted = Object.keys(p.words_attempted || {}).length;
          const correct = Object.values(p.words_attempted || {})
            .filter((w: any) => w.correct > 0).length;
          const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

          // Find common mistakes (words with low success rate)
          const mistakes = Object.entries(p.words_attempted || {})
            .filter(([_, data]: [string, any]) => {
              const successRate = data.attempts > 0 ? data.correct / data.attempts : 0;
              return successRate < 0.5; // <50% success
            })
            .map(([word]) => word)
            .slice(0, 3); // Top 3 mistakes

          return {
            id: p.student_id,
            name: p.students.name,
            accuracy,
            wordsAttempted: attempted,
            wordsMastered: p.words_mastered?.length || 0,
            lastActive: new Date(p.last_activity),
            commonMistakes: mistakes
          };
        })
        .filter(s => s.accuracy < 60) // Threshold: <60%
        .sort((a, b) => a.accuracy - b.accuracy); // Most struggling first

      setStrugglingStudents(struggling);

      setMetrics({
        studentsNeedingHelp: struggling.length,
        avgXp: calculateAvgXp(progress),
        activeToday: calculateActiveToday(progress),
        xpTrend: 0 // TODO: Calculate trend
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  }

  return {
    metrics,
    strugglingStudents,
    loading,
    refresh: fetchAnalytics
  };
}

function calculateAvgXp(progress: any[]): number {
  // Implementation...
}

function calculateActiveToday(progress: any[]): number {
  // Implementation...
}
```

---

### 4. Create Filtered Student List View

```typescript
// components/teacher/StudentProgressView.tsx (Enhanced)

'use client';

import { useSearchParams } from 'next/navigation';
import { useClassroomAnalytics } from '@/hooks/useClassroomAnalytics';
import { useLanguage } from '@/contexts/LanguageContext';

export function StudentProgressView({ classroomId }: { classroomId: string }) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter'); // 'struggling' or null
  const { strugglingStudents } = useClassroomAnalytics(classroomId);

  const [students, setStudents] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'accuracy' | 'recent'>('accuracy');

  useEffect(() => {
    if (filter === 'struggling') {
      setStudents(strugglingStudents);
    } else {
      fetchAllStudents();
    }
  }, [filter, strugglingStudents]);

  const clearFilter = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('filter');
    window.history.pushState({}, '', url);
    fetchAllStudents();
  };

  return (
    <div>
      {/* Active Filter Chip */}
      {filter === 'struggling' && (
        <div className="mb-4 flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-900/20 border-neo border-red-500 rounded-neo">
            <span className="font-neo-body text-red-400">
              Active Filter: {t('education.studentsNeedingHelp')}
            </span>
            <button
              onClick={clearFilter}
              className="text-red-400 hover:text-red-300"
            >
              ✕ {t('common.clear')}
            </button>
          </div>
          <p className="text-sm text-gray-400">
            {students.length} {t('education.studentsWithLowAccuracy')}
          </p>
        </div>
      )}

      {/* Sort Options */}
      <div className="mb-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 bg-gray-800 text-white border-neo border-black rounded-neo"
        >
          <option value="accuracy">{t('education.sortMostStrugglingFirst')}</option>
          <option value="recent">{t('education.sortMostRecentFirst')}</option>
        </select>
      </div>

      {/* Student List */}
      <div className="space-y-4">
        {students.map(student => (
          <StrugglingStudentCard key={student.id} student={student} />
        ))}
      </div>

      {/* Quick Actions */}
      {students.length > 0 && (
        <div className="mt-6 flex gap-3">
          <button className="px-6 py-2 bg-neo-cyan text-black font-neo-body font-bold rounded-neo border-neo border-black shadow-hard hover:shadow-hard-lg">
            📚 {t('education.assignReviewLesson')}
          </button>
          <button className="px-6 py-2 bg-neo-pink text-black font-neo-body font-bold rounded-neo border-neo border-black shadow-hard hover:shadow-hard-lg">
            📧 {t('education.sendEncouragement')}
          </button>
        </div>
      )}
    </div>
  );
}

function StrugglingStudentCard({ student }: { student: StrugglingStudent }) {
  const { t } = useLanguage();
  const indicatorColor = student.accuracy < 50 ? 'bg-red-500' : 'bg-yellow-500';

  return (
    <div className="p-4 bg-neo-navy border-neo border-black rounded-neo shadow-hard">
      {/* Student Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-3 h-3 rounded-full ${indicatorColor}`} />
        <h4 className="font-neo-body font-bold text-white text-lg">{student.name}</h4>
      </div>

      {/* Stats */}
      <div className="flex gap-6 mb-3 text-sm text-gray-400">
        <span>{student.accuracy}% {t('common.accuracy')}</span>
        <span>{student.wordsMastered}/{student.wordsAttempted} {t('education.words')}</span>
        <span>{t('education.lastActive')}: {formatRelativeTime(student.lastActive)}</span>
      </div>

      {/* Common Mistakes */}
      {student.commonMistakes.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">{t('education.commonMistakes')}:</p>
          <div className="flex gap-2">
            {student.commonMistakes.map(word => (
              <span
                key={word}
                className="px-2 py-1 bg-gray-800 text-white text-xs rounded-neo"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button className="px-3 py-1 text-sm bg-neo-cyan text-black rounded-neo hover:bg-neo-cyan/90">
          📚 {t('education.assignReview')}
        </button>
        <button className="px-3 py-1 text-sm bg-gray-700 text-white rounded-neo hover:bg-gray-600">
          💌 {t('education.sendMessage')}
        </button>
      </div>
    </div>
  );
}
```

---

## Translation Keys

```json
// translations/en.json

{
  "education": {
    "studentsNeedingHelp": "Students Needing Help",
    "studentsWithLowAccuracy": "students with <60% accuracy",
    "sortMostStrugglingFirst": "Sort: Most Struggling First",
    "sortMostRecentFirst": "Sort: Most Recent First",
    "assignReviewLesson": "Assign Review Lesson",
    "sendEncouragement": "Send Encouragement",
    "assignReview": "Assign Review",
    "sendMessage": "Send Message",
    "commonMistakes": "Common mistakes",
    "words": "words",
    "lastActive": "Last active"
  },
  "common": {
    "accuracy": "accuracy",
    "clear": "Clear"
  }
}
```

---

## Testing Checklist

- [ ] **Unit Tests**:
  - [ ] Hook correctly identifies students <60% accuracy
  - [ ] Hook extracts top 3 common mistakes
  - [ ] MetricCard renders preview on hover

- [ ] **Integration Tests**:
  - [ ] Click on metric card navigates to filtered student list
  - [ ] Filter chip shows active filter
  - [ ] Clear filter button works
  - [ ] Sort by accuracy works

- [ ] **Edge Cases**:
  - [ ] 0 struggling students (shows "All students doing well!")
  - [ ] Student with 0 attempts (excluded from struggling list)
  - [ ] Student with null words_attempted (handled gracefully)

---

## Estimated Effort

- **MetricCard Updates**: 0.25 days
- **Hook Updates**: 0.25 days
- **Filtered Student List**: 0.25 days
- **Testing**: 0.25 days
- **Total**: 1 day

---

## Success Metrics

**Before**:
- Teachers manually check all students (10+ minutes)
- Unknown who needs help

**After (Target)**:
- Teachers identify struggling students in <3 minutes (3× faster)
- 90% of teachers use this feature weekly
- Intervention rate ↑50%

---

## Files to Modify

1. `components/teacher/analytics/MetricCard.tsx` - Add onClick and preview
2. `components/teacher/analytics/AnalyticsDashboard.tsx` - Add click handler
3. `hooks/useClassroomAnalytics.ts` - Add struggling students calculation
4. `components/teacher/StudentProgressView.tsx` - Add filter support
5. `translations/en.json` (+ he, sv, ja) - Add new strings

---

This completes the detailed specification for Feature 2 (Actionable Metrics).
