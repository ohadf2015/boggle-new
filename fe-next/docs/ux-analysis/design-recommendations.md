# Education Section - Design Recommendations

**Priority Framework**: Impact × Effort = Priority Score

| Priority | Impact | Effort | Implementation Timeline |
|----------|--------|--------|------------------------|
| P0 (Critical) | High | Low-Medium | Sprint 1 (Week 1-2) |
| P1 (High) | High | Medium-High | Sprint 2-3 (Week 3-6) |
| P2 (Medium) | Medium | Low-Medium | Sprint 4-5 (Week 7-10) |
| P3 (Low) | Low-Medium | Any | Backlog |

---

## P0: Critical Quick Wins (Week 1-2)

### 1. Fix Leaderboard Visibility (P0)
**Impact**: High | **Effort**: Low | **Affects**: All students

#### Problem
- Current leaderboard only shows top 3 students
- Students ranked 4+ see "..." instead of their rank
- Kills motivation for majority of students who aren't in top 3

#### Solution: Expandable Leaderboard
```typescript
// Component: components/education/ClassroomLeaderboard.tsx

interface LeaderboardProps {
  classroomId: string;
  currentUserId: string;
  variant?: 'compact' | 'expanded'; // New prop
}

// Expanded variant shows:
// - Top 3 (highlighted)
// - Current user's rank (if not in top 3)
// - 2 students above and below current user
// - "Show Full Leaderboard" button → modal with all students

// Visual Design:
// ┌─────────────────────────────────────┐
// │ 🥇 Alice          1,250 XP          │ (neo-yellow bg)
// │ 🥈 Bob            1,100 XP          │ (gray bg)
// │ 🥉 Carlos          950 XP           │ (gray bg)
// ├─────────────────────────────────────┤
// │ ...                                 │ (collapse divider)
// ├─────────────────────────────────────┤
// │ 5. Emma            720 XP           │
// │ 6. Frank           680 XP           │
// │ 7. YOU             645 XP   ←       │ (neo-cyan highlight)
// │ 8. Grace           600 XP           │
// │ 9. Henry           580 XP           │
// ├─────────────────────────────────────┤
// │ View Full Leaderboard (15 students) │ (button)
// └─────────────────────────────────────┘
```

#### Implementation Steps
1. Update `useClassroomLeaderboard` hook to return full student list
2. Add `findCurrentUserRank()` helper to calculate position
3. Modify `ClassroomLeaderboard` component:
   - Show top 3 (always)
   - Show current user's context (±2 students)
   - Add expand/collapse toggle
4. Add modal for full leaderboard view
5. Update translations for new text

**Files to Modify**:
- `components/education/ClassroomLeaderboard.tsx`
- `hooks/useClassroomLeaderboard.ts`
- `translations/en.json` (+ he, sv, ja)

**Success Metric**: Student engagement ↑20% (measured by practice sessions per week)

---

### 2. Make "Students Needing Help" Actionable (P0)
**Impact**: High | **Effort**: Low | **Affects**: All teachers

#### Problem
- Metric card shows count but no click-through
- Teachers can't identify WHO needs help
- No actionable next steps

#### Solution: Clickable Metric Card → Filtered Student List
```typescript
// Component: components/teacher/analytics/MetricCard.tsx

interface MetricCardProps {
  title: string;
  value: number;
  trend?: number;
  onClick?: () => void; // NEW: Make card clickable
  details?: React.ReactNode; // NEW: Show preview on hover
}

// Enhanced "Students Needing Help" card:
// ┌─────────────────────────────────────────┐
// │ Students Needing Help      [i]          │
// │                                         │
// │         3 students                      │ (large number)
// │                                         │
// │ Alice, Bob, Carlos                      │ (names preview)
// │ Click to view details →                 │ (CTA)
// └─────────────────────────────────────────┘
//
// On click → Navigate to Students tab with filter applied
```

#### Implementation Steps
1. Add `onClick` prop to `MetricCard` component
2. Extract student names from analytics data
3. Add hover tooltip showing student names
4. Wire up click handler to navigate to Students tab with filter
5. Update `StudentProgressTable` to accept pre-applied filters

**Files to Modify**:
- `components/teacher/analytics/MetricCard.tsx`
- `components/teacher/analytics/AnalyticsDashboard.tsx`
- `components/teacher/StudentProgressView.tsx`

**Success Metric**: Teachers intervene with struggling students 3× faster

---

### 3. Add Onboarding Wizard for New Teachers (P0)
**Impact**: High | **Effort**: Medium | **Affects**: All new users

#### Problem
- New teachers land on empty dashboard
- No guidance on first steps
- 20+ minutes to create first lesson
- High abandonment rate during setup

#### Solution: 3-Step Guided Onboarding
```typescript
// New Component: components/teacher/TeacherOnboardingWizard.tsx

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<StepProps>;
  canSkip?: boolean;
}

const steps: OnboardingStep[] = [
  {
    id: 'classroom',
    title: 'Create Your First Classroom',
    description: 'This is where your students will gather',
    component: OnboardingClassroomStep,
    canSkip: true // Creates default classroom
  },
  {
    id: 'lesson',
    title: 'Choose a Starter Lesson',
    description: 'Pick a template or import your own',
    component: OnboardingLessonStep,
    canSkip: false
  },
  {
    id: 'invite',
    title: 'Invite Students',
    description: 'Share your join code or invite link',
    component: OnboardingInviteStep,
    canSkip: true
  }
];

// Visual Design:
// ┌────────────────────────────────────────────────┐
// │  Welcome to LexiClash for Teachers! 🎓        │
// │                                                │
// │  [●────○────○]  Step 1 of 3                   │ (progress)
// │                                                │
// │  Create Your First Classroom                   │
// │  This is where your students will gather       │
// │                                                │
// │  ┌──────────────────────────────────────────┐ │
// │  │ Classroom Name: [English 101         ]  │ │
// │  │                                          │ │
// │  │ Description: [Optional              ]   │ │
// │  │                                          │ │
// │  │ [Preview what students see →]           │ │
// │  └──────────────────────────────────────────┘ │
// │                                                │
// │  [Skip this step]      [Next: Choose Lesson]  │
// └────────────────────────────────────────────────┘
```

#### Lesson Template Library
```typescript
// Starter templates to reduce time to first lesson

interface LessonTemplate {
  id: string;
  name: string;
  description: string;
  wordCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  words: Array<{ word: string; definition: string }>;
  previewImage?: string;
}

const STARTER_TEMPLATES: LessonTemplate[] = [
  {
    id: 'basic-vocab',
    name: 'Basic Vocabulary',
    description: 'Common everyday words',
    wordCount: 20,
    difficulty: 'beginner',
    words: [ /* ... */ ]
  },
  {
    id: 'sat-prep',
    name: 'SAT Vocabulary',
    description: 'College entrance exam prep',
    wordCount: 50,
    difficulty: 'advanced',
    words: [ /* ... */ ]
  },
  {
    id: 'esl-beginner',
    name: 'ESL Beginner',
    description: 'English as Second Language starter pack',
    wordCount: 30,
    difficulty: 'beginner',
    words: [ /* ... */ ]
  }
];
```

#### Implementation Steps
1. Create `TeacherOnboardingWizard` component with step progression
2. Build 3 step components (Classroom, Lesson, Invite)
3. Add lesson template library with pre-built word lists
4. Implement CSV import for custom lessons
5. Add "Skip onboarding" option that creates defaults
6. Store onboarding completion in user profile
7. Show wizard only on first login

**Files to Create**:
- `components/teacher/TeacherOnboardingWizard.tsx`
- `components/teacher/onboarding/OnboardingClassroomStep.tsx`
- `components/teacher/onboarding/OnboardingLessonStep.tsx`
- `components/teacher/onboarding/OnboardingInviteStep.tsx`
- `data/lessonTemplates.ts` (template library)

**Files to Modify**:
- `app/[locale]/teacher/PageClient.tsx` (show wizard on first load)
- Database schema: Add `onboarding_completed` to `users` table

**Success Metric**: Time to first lesson: 20+ min → 5 min

---

## P1: High-Impact Features (Week 3-6)

### 4. Bulk Lesson Assignment (P1)
**Impact**: High | **Effort**: Medium | **Affects**: Teachers with 3+ classrooms

#### Problem
- Assigning same lesson to multiple classrooms requires repetitive clicks
- 5 clicks per classroom (15 clicks for 3 classrooms)
- Frustrating for teachers managing multiple sections

#### Solution: Multi-Select Assignment Dialog
```typescript
// Updated Component: components/teacher/LessonAssignmentDialog.tsx

interface BulkAssignmentProps {
  lessonId: string;
  availableClassrooms: Classroom[];
  onAssign: (assignments: LessonAssignment[]) => Promise<void>;
}

// Visual Design:
// ┌────────────────────────────────────────────────┐
// │  Assign Lesson: "SAT Vocabulary Week 1"        │
// │                                                │
// │  Select Classrooms:                            │
// │  ┌──────────────────────────────────────────┐ │
// │  │ [✓] English 101 (24 students)            │ │ (checked)
// │  │ [✓] English 102 (22 students)            │ │ (checked)
// │  │ [ ] English 103 (18 students)            │ │ (unchecked)
// │  │ [✓] English 104 (25 students)            │ │ (checked)
// │  └──────────────────────────────────────────┘ │
// │                                                │
// │  [Select All] [Deselect All]                   │
// │                                                │
// │  Due Date (applies to all):                    │
// │  [📅 Friday, Feb 2, 2026 ▼]                    │
// │                                                │
// │  ⚠️  Per-classroom due dates? [Enable]         │ (toggle)
// │                                                │
// │  Preview: Assigning to 3 classrooms (69 students) │
// │                                                │
// │  [Cancel]                [Assign to 3 Classes] │
// └────────────────────────────────────────────────┘

// With per-classroom dates enabled:
// ┌────────────────────────────────────────────────┐
// │  [✓] English 101  📅 Feb 2, 2026               │
// │  [✓] English 102  📅 Feb 3, 2026  (next day)   │
// │  [✓] English 104  📅 Feb 2, 2026               │
// └────────────────────────────────────────────────┘
```

#### Implementation Steps
1. Replace single dropdown with checkbox list
2. Add "Select All" / "Deselect All" buttons
3. Show student count per classroom
4. Implement shared due date with per-classroom override
5. Add assignment preview ("Assigning to X classrooms")
6. Batch API call to create all assignments in single request
7. Show success toast: "Assigned to 3 classrooms"

**Files to Modify**:
- `components/teacher/LessonAssignmentDialog.tsx`
- `hooks/useLessons.ts` (add bulk assignment function)
- Backend: `POST /api/education/lessons/[id]/assign-bulk`

**Success Metric**: Assignment time: 15 clicks → 3 clicks (80% reduction)

---

### 5. Enhanced Student Diagnostics (P1)
**Impact**: High | **Effort**: Medium-High | **Affects**: All teachers

#### Problem
- Teachers see word count but not word-level insights
- Can't identify which specific words are causing difficulty
- No recommended interventions

#### Solution: Word-Level Analytics Dashboard
```typescript
// New Component: components/teacher/StudentDiagnosticView.tsx

interface WordDifficulty {
  word: string;
  definition: string;
  attempts: number;
  successRate: number; // 0-100
  lastAttempt: Date;
  difficultyScore: number; // calculated
  recommendedAction: 'review' | 'practice' | 'mastered';
}

// Visual Design:
// ┌────────────────────────────────────────────────────────┐
// │  Student: Alice Johnson                                │
// │  Lesson: SAT Vocabulary Week 1 (50 words)              │
// │                                                        │
// │  ┌──────────┬──────────┬──────────┬──────────┐        │
// │  │ Overall  │ Mastered │ Struggling│ Not Tried│        │
// │  │   72%    │   36/50  │    8/50   │   6/50   │        │ (metric cards)
// │  └──────────┴──────────┴──────────┴──────────┘        │
// │                                                        │
// │  Words Needing Attention (sorted by difficulty):       │
// │  ┌────────────────────────────────────────────────┐   │
// │  │ 🔴 "Ubiquitous"     2/10 attempts (20%)         │   │ (red = critical)
// │  │    Last tried: 3 days ago                       │   │
// │  │    [📚 Assign Review] [💡 Show Definition]      │   │
// │  ├────────────────────────────────────────────────┤   │
// │  │ 🟡 "Ephemeral"      5/12 attempts (42%)         │   │ (yellow = needs work)
// │  │    Last tried: 1 day ago                        │   │
// │  │    [📚 Assign Review] [💡 Show Definition]      │   │
// │  ├────────────────────────────────────────────────┤   │
// │  │ 🟡 "Cacophony"      6/14 attempts (43%)         │   │
// │  │    Last tried: 2 days ago                       │   │
// │  │    [📚 Assign Review] [💡 Show Definition]      │   │
// │  └────────────────────────────────────────────────┘   │
// │                                                        │
// │  📊 Difficulty Heatmap (all 50 words):                 │
// │  [Visual heatmap showing all words colored by          │
// │   success rate: green = mastered, yellow = struggling, │
// │   red = critical, gray = not tried]                    │
// │                                                        │
// │  Recommended Actions:                                  │
// │  ┌────────────────────────────────────────────────┐   │
// │  │ ✓ Create targeted review lesson with 8 words   │   │
// │  │ ✓ Send encouragement message                   │   │
// │  │ ✓ Schedule follow-up in 3 days                 │   │
// │  └────────────────────────────────────────────────┘   │
// │                                                        │
// │  [Create Review Lesson] [Export Report] [Close]       │
// └────────────────────────────────────────────────────────┘
```

#### Difficulty Scoring Algorithm
```typescript
function calculateWordDifficulty(word: WordAttempts): number {
  const successRate = word.correct / word.attempts;
  const recencyFactor = daysSinceLastAttempt(word.lastAttemptAt) / 7; // 0-1
  const attemptWeight = Math.min(word.attempts / 10, 1); // More attempts = more confident score

  // Lower score = more difficult (for student)
  const difficultyScore = (
    (1 - successRate) * 0.6 +  // Success rate is primary factor
    recencyFactor * 0.2 +       // Recent attempts matter more
    (1 - attemptWeight) * 0.2   // Fewer attempts = less certain
  );

  return difficultyScore; // 0 (easy) to 1 (very difficult)
}

function categorizeWord(score: number): 'mastered' | 'practice' | 'review' {
  if (score <= 0.3) return 'mastered';  // <30% difficulty
  if (score <= 0.6) return 'practice';  // 30-60% difficulty
  return 'review';                       // >60% difficulty (critical)
}
```

#### Implementation Steps
1. Create `StudentDiagnosticView` component
2. Implement word-level analytics hook: `useStudentWordAnalytics`
3. Build difficulty scoring algorithm
4. Create vocabulary heatmap visualization (Recharts)
5. Add "Create Review Lesson" quick action (pre-populates with struggling words)
6. Add export to PDF/CSV functionality
7. Implement recommendation engine

**Files to Create**:
- `components/teacher/StudentDiagnosticView.tsx`
- `components/teacher/analytics/VocabularyHeatmap.tsx`
- `hooks/useStudentWordAnalytics.ts`
- `utils/difficultyScoring.ts`

**Success Metric**: Teacher intervention effectiveness ↑50% (measured by student improvement rate)

---

### 6. Gamified Practice Modes (P1)
**Impact**: High | **Effort**: Medium-High | **Affects**: All students

#### Problem
- Flashcard mode is boring and repetitive
- No variety or challenge
- Students see practice as "homework" not "fun"

#### Solution: 3 New Engaging Practice Modes

#### Mode 1: Speed Round (Time Attack)
```typescript
// Component: components/student/practice/SpeedRoundMode.tsx

// Gamified flashcards with:
// - 30-second timer per word
// - Combo multiplier (correct streak)
// - Sound effects and animations
// - Real-time XP counter
// - Leaderboard integration

// Visual Design:
// ┌────────────────────────────────────────────────┐
// │  🔥 COMBO: 5x                    ⏱️  0:28       │ (timer + combo)
// │                                                │
// │         "UBIQUITOUS"                           │ (large word)
// │                                                │
// │  [Show Definition]                             │
// │                                                │
// │  Type it from memory:                          │
// │  [________________________]                     │
// │                                                │
// │  XP: 250 (+50 speed bonus)     🎯 8/20         │ (progress)
// │                                                │
// │  [Skip (-10 XP)]                               │
// └────────────────────────────────────────────────┘

interface SpeedRoundConfig {
  timePerWord: number; // seconds
  comboMultiplier: number; // 1.5x for 5+ streak
  speedBonus: number; // bonus XP for fast answers
  skipPenalty: number; // -10 XP
}
```

#### Mode 2: Challenge Friend (Async Competition)
```typescript
// Component: components/student/practice/ChallengeFriendMode.tsx

// Asynchronous peer competition:
// - Student A completes lesson → generates challenge
// - Student B gets notification → completes same words
// - Compare scores, streak, time
// - Winner gets bonus XP

// Visual Design:
// ┌────────────────────────────────────────────────┐
// │  Challenge from: Bob 🎯                        │
// │  Lesson: SAT Vocabulary Week 1                 │
// │  Bob's Score: 850 XP in 5:32                   │
// │                                                │
// │  ⚡ Beat Bob's score to win 100 bonus XP!      │
// │                                                │
// │  [Accept Challenge] [Decline]                  │
// └────────────────────────────────────────────────┘

// After completion:
// ┌────────────────────────────────────────────────┐
// │  🏆 YOU WIN! +100 XP                           │
// │                                                │
// │  Your Score:   920 XP in 4:58   ✓              │
// │  Bob's Score:  850 XP in 5:32                  │
// │                                                │
// │  [Challenge Someone Else] [Review Words]       │
// └────────────────────────────────────────────────┘
```

#### Mode 3: Adaptive Quiz (Smart Difficulty)
```typescript
// Component: components/student/practice/AdaptiveQuizMode.tsx

// AI-adjusted difficulty:
// - Starts with medium difficulty
// - If student gets 3 correct → harder words
// - If student gets 2 wrong → easier words
// - Prioritizes words student hasn't mastered

interface AdaptiveQuizState {
  currentDifficulty: number; // 0-1
  consecutiveCorrect: number;
  consecutiveWrong: number;
  wordsRemaining: WordDifficulty[];
}

function selectNextWord(state: AdaptiveQuizState): WordDifficulty {
  // Prioritize words at current difficulty level that student struggles with
  const targetDifficulty = state.currentDifficulty;
  const strugglingWords = state.wordsRemaining
    .filter(w => w.difficultyScore >= targetDifficulty - 0.1 &&
                 w.difficultyScore <= targetDifficulty + 0.1)
    .sort((a, b) => b.difficultyScore - a.difficultyScore);

  return strugglingWords[0] || state.wordsRemaining[0];
}
```

#### Implementation Steps
1. Create 3 new practice mode components
2. Implement timer/countdown logic for Speed Round
3. Build challenge system with push notifications
4. Create adaptive difficulty algorithm
5. Add sound effects and haptic feedback
6. Integrate with XP system (bonus multipliers)
7. Update mode selector to show all 5 modes (existing + new)

**Files to Create**:
- `components/student/practice/SpeedRoundMode.tsx`
- `components/student/practice/ChallengeFriendMode.tsx`
- `components/student/practice/AdaptiveQuizMode.tsx`
- `components/student/practice/PracticeModeSelector.tsx` (enhanced)

**Success Metric**: Practice session length ↑40%, return rate ↑60%

---

## P2: Medium-Impact Improvements (Week 7-10)

### 7. Template Preview System (P2)
**Impact**: Medium | **Effort**: Low-Medium | **Affects**: Teachers creating lessons

#### Problem
- Teachers configure game settings without seeing how it looks
- No preview of actual game board
- Uncertainty about student experience

#### Solution: Split-Screen Template Editor
```typescript
// Enhanced Component: components/teacher/LessonTemplateEditor.tsx

// Visual Design:
// ┌──────────────────────┬──────────────────────┐
// │ Game Settings        │ Live Preview         │ (50/50 split)
// ├──────────────────────┼──────────────────────┤
// │ Timer Duration:      │  ┌────────────────┐  │
// │ [180 seconds ▼]      │  │  S E T         │  │ (preview board)
// │                      │  │  T R U         │  │
// │ Difficulty:          │  │  A N G E       │  │
// │ [○ Easy              │  │  U B I Q U I T O U S │
// │  ● Medium            │  └────────────────┘  │
// │  ○ Hard]             │                      │
// │                      │  ⏱️  3:00 remaining   │
// │ Min Word Length:     │                      │
// │ [3 letters ▼]        │  Words Found: 0/15   │
// │                      │                      │
// │ Allow Late Join:     │  [This is what       │
// │ [✓] Yes              │   students will see] │
// │                      │                      │
// │ Template Presets:    │                      │
// │ [Quick Game ▼]       │                      │
// │                      │                      │
// │ [Save Template]      │ [Start Game]         │
// └──────────────────────┴──────────────────────┘
```

#### Implementation Steps
1. Add preview panel to `LessonTemplateEditor`
2. Create mock game board that updates in real-time
3. Pre-populate preview with lesson vocabulary
4. Add template presets (Quick Game, Study Session, Tournament)
5. Show estimated game duration based on settings

**Files to Modify**:
- `components/teacher/LessonTemplateEditor.tsx`
- Add template presets to `data/lessonTemplates.ts`

**Success Metric**: Template configuration errors ↓30%

---

### 8. Enhanced Analytics Export (P2)
**Impact**: Medium | **Effort**: Medium | **Affects**: Teachers

#### Problem
- No way to export classroom data
- Teachers can't share reports with administrators
- No historical tracking

#### Solution: Export to PDF/CSV with Customization
```typescript
// New Component: components/teacher/analytics/AnalyticsExport.tsx

interface ExportOptions {
  format: 'pdf' | 'csv';
  dateRange: { start: Date; end: Date };
  includeMetrics: ('progress' | 'attendance' | 'vocabulary' | 'xp')[];
  includeCharts: boolean;
  includeStudentDetails: boolean;
}

// Visual Design:
// ┌────────────────────────────────────────────────┐
// │  Export Classroom Analytics                    │
// │                                                │
// │  Format:                                       │
// │  ● PDF Report  ○ CSV Spreadsheet              │
// │                                                │
// │  Date Range:                                   │
// │  [📅 Jan 1, 2026] to [📅 Jan 30, 2026]        │
// │                                                │
// │  Include:                                      │
// │  ✓ Student Progress                            │
// │  ✓ Attendance Metrics                          │
// │  ✓ Vocabulary Mastery                          │
// │  ✓ XP and Leveling                             │
// │  ✓ Charts and Visualizations                   │
// │  □ Individual Student Details                  │
// │                                                │
// │  [Cancel]               [Generate Report]      │
// └────────────────────────────────────────────────┘
```

#### Implementation Steps
1. Create export dialog component
2. Implement PDF generation (use `jsPDF` or `react-pdf`)
3. Implement CSV export for spreadsheet data
4. Add date range selector
5. Generate professional-looking reports with charts
6. Include school/classroom branding

**Files to Create**:
- `components/teacher/analytics/AnalyticsExport.tsx`
- `utils/reportGenerator.ts`

**Success Metric**: 80% of teachers export reports monthly

---

### 9. Student Achievement Showcase (P2)
**Impact**: Medium | **Effort**: Low | **Affects**: Students

#### Problem
- Achievement unlocks are shown in modal but not persistent
- No way to show off badges
- Achievements feel temporary, not rewarding

#### Solution: Student Profile with Badge Showcase
```typescript
// Enhanced Component: app/[locale]/student/profile/page.tsx

// Visual Design:
// ┌────────────────────────────────────────────────┐
// │  🎓 Student Profile: Alice Johnson             │
// │                                                │
// │  Level 12  |  1,250 XP  |  🔥 5-day streak     │
// │  ────────────────────────────────────          │ (progress bar)
// │  Next level: 250 XP to go                      │
// │                                                │
// │  🏆 Achievements (8 unlocked)                  │
// │  ┌─────┬─────┬─────┬─────┬─────┐              │
// │  │ 🥇  │ 📚  │ 🔥  │ ⚡  │ 🎯  │              │ (badge grid)
// │  │Speed│Word │Hot  │Fast │Sharp│              │
// │  │Demon│Wiz  │Stk  │Fin  │Eye  │              │
// │  └─────┴─────┴─────┴─────┴─────┘              │
// │                                                │
// │  📊 Statistics                                 │
// │  • Words Mastered: 145                         │
// │  • Lessons Completed: 12                       │
// │  • Practice Sessions: 34                       │
// │  • Total XP Earned: 5,420                      │
// │  • Longest Streak: 12 days                     │
// │                                                │
// │  Recent Activity:                              │
// │  • Completed "SAT Vocab Week 2" (2 hours ago)  │
// │  • Unlocked "Speed Demon" badge (1 day ago)    │
// │  • Reached Level 12 (3 days ago)               │
// └────────────────────────────────────────────────┘
```

#### Implementation Steps
1. Create student profile page (currently placeholder)
2. Add badge showcase grid
3. Display lifetime statistics
4. Add recent activity feed
5. Make badges shareable (copy link to profile)

**Files to Modify**:
- `app/[locale]/student/profile/page.tsx` (implement real profile)
- `components/education/EducationBadgeGrid.tsx` (enhance display)

**Success Metric**: Student pride/motivation ↑ (qualitative feedback)

---

## P3: Future Enhancements (Backlog)

### 10. Parent/Guardian Portal (P3)
**Impact**: Low-Medium | **Effort**: High | **Affects**: Parents

- View student's progress
- Get weekly summary emails
- Opt-in to notifications (assignments due, achievements)
- Privacy controls (students can hide leaderboard from parents)

### 11. School Admin Dashboard (P3)
**Impact**: Medium | **Effort**: High | **Affects**: District coordinators

- Oversee multiple teachers
- School-wide analytics
- Teacher permissions management
- Bulk classroom creation
- Compliance reporting

### 12. Collaborative Learning Modes (P3)
**Impact**: Medium | **Effort**: High | **Affects**: Students

- Peer study groups (2-4 students)
- Shared flashcard sessions
- Team challenges
- Vocabulary relay races

### 13. Offline Mode (P3)
**Impact**: Low | **Effort**: Very High | **Affects**: Low-bandwidth users

- Download lessons for offline practice
- Sync progress when reconnected
- Progressive Web App (PWA)

---

## Implementation Roadmap

### Sprint 1 (Week 1-2): Quick Wins
✅ Fix leaderboard visibility
✅ Make "Students Needing Help" clickable
✅ Add teacher onboarding wizard

**Goal**: Reduce friction for new users and improve student engagement

---

### Sprint 2 (Week 3-4): Teacher Efficiency
✅ Bulk lesson assignment
✅ Enhanced student diagnostics (Phase 1: Basic word-level data)

**Goal**: Save teachers time and enable data-driven interventions

---

### Sprint 3 (Week 5-6): Student Engagement
✅ Gamified practice modes (Speed Round + Challenge Friend)
✅ Enhanced student diagnostics (Phase 2: Heatmap + recommendations)

**Goal**: Make practice fun, increase session frequency

---

### Sprint 4 (Week 7-8): Polish and Analytics
✅ Template preview system
✅ Analytics export (PDF + CSV)

**Goal**: Improve teacher confidence and enable reporting

---

### Sprint 5 (Week 9-10): Student Recognition
✅ Student achievement showcase
✅ Adaptive quiz mode

**Goal**: Build long-term motivation through social proof

---

## Success Metrics Summary

| Feature | Key Metric | Target | Timeline |
|---------|-----------|--------|----------|
| Leaderboard Fix | Student engagement ↑ | +20% | Week 2 |
| Actionable Metrics | Teacher intervention speed ↑ | 3× faster | Week 2 |
| Onboarding Wizard | Time to first lesson ↓ | 20 min → 5 min | Week 2 |
| Bulk Assignment | Assignment time ↓ | 80% reduction | Week 4 |
| Student Diagnostics | Intervention effectiveness ↑ | +50% | Week 6 |
| Gamified Practice | Practice session length ↑ | +40% | Week 6 |
| Template Preview | Configuration errors ↓ | -30% | Week 8 |
| Analytics Export | Monthly report usage | 80% adoption | Week 8 |
| Achievement Showcase | Student pride ↑ | Qualitative | Week 10 |

---

## Design System Compliance

All components will follow **Neo-Brutalist "Jackbox Party Pack" design**:

### Visual Elements
- **Hard shadows** (no blur): `shadow-hard`, `shadow-hard-lg`
- **Chunky borders**: `border-neo` (3px black)
- **Bold colors**: `neo-yellow`, `neo-cyan`, `neo-pink`
- **Rounded corners**: `rounded-neo` (minimal 4px)
- **Typography**: Fredoka (display), Rubik (body)

### Interaction States
- **Pressed**: `shadow-hard-pressed` (2px offset)
- **Hover**: Slight lift with `shadow-hard-lg`
- **Disabled**: 50% opacity, no shadow

### Animations
- **Entrance**: `animate-neo-pop` (bounce in)
- **Success**: `animate-neo-wobble` (celebration)
- **Error**: `animate-neo-shake` (attention)

### Accessibility
- **WCAG 2.1 AA** compliant
- **High contrast** text (always white on dark)
- **RTL support** (Hebrew shadows auto-flip)
- **Keyboard navigation** (all interactive elements)

---

## Next Steps

1. **Review this document** with stakeholders
2. **Prioritize features** based on business goals
3. **Assign to sprints** following roadmap
4. **Create detailed tickets** for each feature
5. **Conduct usability testing** after each sprint
6. **Iterate based on feedback**

**Questions? Reach out to UX team for clarifications or design support.**
