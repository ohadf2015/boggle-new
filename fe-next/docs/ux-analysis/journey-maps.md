# Education Section - User Journey Maps

## Journey 1: Teacher Assigns Lesson to Multiple Classrooms

### Current State Journey (Pain Points Highlighted)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Navigate to Teacher Dashboard                        │
│    ✓ Clear entry point                                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Click "Lessons" Tab                                  │
│    ✓ Tab structure is intuitive                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Create New Lesson                                    │
│    ✓ LessonBuilder has good word addition flow          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Configure Game Template                              │
│    ⚠️  Limited customization options                     │
│    ⚠️  No preview of how game will look                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Assign to Classroom #1                               │
│    ❌ Opens LessonAssignmentDialog                       │
│    ❌ Select classroom from dropdown                     │
│    ❌ Set optional due date                              │
│    ❌ Click "Assign" button                              │
│    ❌ Dialog closes                                       │
│    📊 FRICTION: 5 clicks per classroom                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Repeat for Classroom #2                              │
│    ❌ Re-open LessonAssignmentDialog                     │
│    ❌ Select different classroom                         │
│    ❌ Re-enter same due date                             │
│    ❌ Click "Assign" again                               │
│    📊 TOTAL: 10 clicks for 2 classrooms                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Repeat for Classroom #3                              │
│    ❌ Re-open dialog AGAIN                               │
│    📊 TOTAL: 15 clicks for 3 classrooms                  │
│    😤 FRUSTRATION: "This is taking forever!"            │
└─────────────────────────────────────────────────────────┘

🎯 OPPORTUNITY: Bulk assignment with multi-select
```

### Improved Journey (Proposed Solution)

```
┌─────────────────────────────────────────────────────────┐
│ 1-3. Create Lesson (Same as before)                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Configure Template with Live Preview                 │
│    ✅ Split-screen: Settings on left, Preview on right   │
│    ✅ Real-time preview of game board                    │
│    ✅ Template presets: "Quick Game", "Study Session"    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Bulk Assignment Dialog                               │
│    ✅ Checkbox list of all classrooms                    │
│    ✅ "Select All" / "Deselect All" buttons              │
│    ✅ Single due date applies to all selected            │
│    ✅ Per-classroom due date override option             │
│    ✅ Preview: "Assigning to 3 classrooms"               │
│    📊 RESULT: 3 clicks for 3 classrooms                  │
│    😊 DELIGHT: "Wow, that was fast!"                    │
└─────────────────────────────────────────────────────────┘

🎉 IMPACT: 80% reduction in clicks (15 → 3)
```

---

## Journey 2: Teacher Identifies Struggling Students

### Current State Journey (Pain Points Highlighted)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Navigate to Teacher Dashboard > Progress Tab         │
│    ✓ Analytics dashboard loads                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. View "Students Needing Help" Metric                  │
│    ⚠️  Shows count (e.g., "3 students")                  │
│    ❌ Doesn't show WHO they are                          │
│    ❌ No click-through to student list                   │
│    😤 FRUSTRATION: "Which students need help?!"         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Switch to "Students" Tab                             │
│    ⚠️  Lists all students                                │
│    ❌ No visual indicator of who's struggling            │
│    ❌ Must manually check each student                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Click Student #1 to View Progress                    │
│    ✓ StudentProgressView opens                          │
│    ✓ Shows words attempted/mastered                     │
│    ❌ No word-level difficulty insights                  │
│    ❌ Can't see common mistakes                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Go Back and Repeat for Each Student                  │
│    📊 FRICTION: Must check 20+ students individually     │
│    😤 FRUSTRATION: "This is overwhelming!"              │
└─────────────────────────────────────────────────────────┘

🎯 OPPORTUNITY: Smart filtering and actionable insights
```

### Improved Journey (Proposed Solution)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Navigate to Teacher Dashboard > Progress Tab         │
│    ✓ Analytics dashboard loads                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. View Enhanced "Students Needing Help" Card           │
│    ✅ Shows count WITH names: "3 students: Alice, Bob,   │
│       Carlos"                                            │
│    ✅ Click-through to filtered student list             │
│    ✅ Visual indicators (red dots, warning icons)        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Click Card → Auto-Filtered Student List              │
│    ✅ Shows ONLY struggling students (<60% accuracy)     │
│    ✅ Sort options: "Most Struggling First"              │
│    ✅ Color-coded progress bars (red/yellow/green)       │
│    ✅ Quick actions: "Send Encouragement Message"        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Click Student → Detailed Diagnostic View             │
│    ✅ Word-level difficulty breakdown                    │
│    ✅ Common mistakes heatmap                            │
│    ✅ Recommended focus words                            │
│    ✅ Suggested interventions: "Review flashcards for    │
│       words X, Y, Z"                                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Take Action                                          │
│    ✅ One-click assign targeted practice lesson          │
│    ✅ Export struggling student report                   │
│    ✅ Schedule follow-up reminders                       │
│    😊 DELIGHT: "I can actually help them now!"          │
└─────────────────────────────────────────────────────────┘

🎉 IMPACT: Proactive intervention, not reactive firefighting
```

---

## Journey 3: Student Completes Practice Session

### Current State Journey (Pain Points Highlighted)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Student Logs In → Student Dashboard                  │
│    ✓ Sees assigned lessons                              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Click Lesson Card                                    │
│    ✓ Practice page loads with mode selector             │
│    ✓ Options: Flashcards, Solo Board, Word List, Warmup │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Select "Flashcards" Mode                             │
│    ⚠️  Standard flashcard UI                             │
│    ❌ Repetitive and boring                              │
│    ❌ No variety or gamification                         │
│    😤 FRUSTRATION: "This feels like homework"           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Complete 20 Flashcards                               │
│    ✅ XP awarded (20 cards × 10 = 200 XP)                │
│    ⚠️  Generic completion message                        │
│    ❌ No personalized feedback                           │
│    ❌ Doesn't show which words still need work           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Return to Dashboard                                  │
│    ✅ Progress bar updated (20/50 words)                 │
│    ⚠️  Leaderboard shows top 3 (not student's rank)      │
│    ❌ Student ranks 7th → sees "..." instead of rank     │
│    😤 FRUSTRATION: "Where do I stand?"                  │
└─────────────────────────────────────────────────────────┘

🎯 OPPORTUNITY: Engaging practice modes + clear progress feedback
```

### Improved Journey (Proposed Solution)

```
┌─────────────────────────────────────────────────────────┐
│ 1-2. Student Logs In and Selects Lesson (Same)          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Enhanced Mode Selector                               │
│    ✅ Mode cards show XP multipliers                     │
│    ✅ "Speed Round" mode (time attack for bonus XP)      │
│    ✅ "Challenge Friend" mode (async peer competition)   │
│    ✅ Visual previews of each mode                       │
│    😊 DELIGHT: "Ooh, I can challenge my friend!"        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Select "Speed Round" Mode                            │
│    ✅ Gamified flashcards with timer                     │
│    ✅ Combo multiplier for correct streaks               │
│    ✅ Sound effects and animations                       │
│    ✅ Real-time XP counter (visual feedback loop)        │
│    😊 DELIGHT: "This is actually fun!"                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Complete Session with Personalized Feedback          │
│    ✅ XP awarded: 200 base + 50 speed bonus = 250 XP     │
│    ✅ Session summary: "17/20 correct (85%)"             │
│    ✅ "Words to review: [list of 3 missed words]"        │
│    ✅ Streak bonus: "5 days in a row! 🔥"                │
│    ✅ Achievement unlock: "Speed Demon" badge            │
│    ✅ LevelUpCelebration modal if level gained           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Return to Enhanced Dashboard                         │
│    ✅ Progress bar updated with animation                │
│    ✅ Expanded leaderboard shows:                        │
│       - Top 3 students                                   │
│       - "You're #7 of 15 students" (clear rank)          │
│       - XP gap to next rank: "45 XP to #6"               │
│    ✅ "Next up: Unlock 'Word Wizard' at Level 10"        │
│    😊 DELIGHT: "I'm so close to #6! Let me practice     │
│       more!"                                             │
└─────────────────────────────────────────────────────────┘

🎉 IMPACT: Intrinsic motivation through clear goals and progress
```

---

## Journey 4: New Teacher Onboarding

### Current State Journey (Pain Points Highlighted)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Teacher Signs Up                                     │
│    ✓ Account created                                    │
│    ❌ No onboarding wizard                               │
│    ❌ Lands on empty TeacherDashboard                    │
│    😤 FRUSTRATION: "Where do I start?"                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Navigate to "Classrooms" Tab                         │
│    ⚠️  Empty state shows "No classrooms yet"             │
│    ✅ "Create Classroom" button is visible               │
│    ⚠️  No guidance on next steps                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Create First Classroom                               │
│    ✓ Form is straightforward                            │
│    ✓ Join code auto-generated                           │
│    ❌ No explanation of what to do with join code        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Navigate to "Lessons" Tab                            │
│    ⚠️  Empty state shows "No lessons yet"                │
│    ❌ No templates or starter lessons                    │
│    ❌ Must build lesson from scratch                     │
│    😤 FRUSTRATION: "This is overwhelming"               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Create First Lesson                                  │
│    ⚠️  LessonBuilder requires manual word entry          │
│    ❌ No word suggestions or imports                     │
│    ❌ No example lessons to learn from                   │
│    📊 FRICTION: Takes 20+ minutes to create first lesson │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Assign Lesson to Classroom                           │
│    ✓ Assignment works                                   │
│    ❌ No guidance on sharing join code with students     │
│    ❌ No preview of student experience                   │
└─────────────────────────────────────────────────────────┘

🎯 OPPORTUNITY: Guided onboarding with quick wins
```

### Improved Journey (Proposed Solution)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Teacher Signs Up                                     │
│    ✅ Welcome modal: "Let's get you started!"            │
│    ✅ 3-step progress indicator                          │
│    ✅ "Complete in 5 minutes" time estimate              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Onboarding Step 1: Create Your First Classroom       │
│    ✅ Inline help text: "This is where your students     │
│       will gather"                                       │
│    ✅ Auto-fills sample classroom name                   │
│    ✅ "Skip this step" option (creates default)          │
│    ✅ Preview: Shows what students see when joining      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Onboarding Step 2: Choose a Starter Lesson           │
│    ✅ Template library: "Basic Vocabulary (20 words)",   │
│       "SAT Prep (50 words)", "ESL Beginner (30 words)"  │
│    ✅ Preview each template before selecting             │
│    ✅ "Import from file" option (CSV/TXT)                │
│    ✅ One-click import                                   │
│    😊 DELIGHT: "I can start teaching in minutes!"       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Onboarding Step 3: Invite Students                   │
│    ✅ Join code displayed prominently                    │
│    ✅ QR code for easy mobile scanning                   │
│    ✅ "Copy invite link" button                          │
│    ✅ Email template pre-filled: "Join my classroom"     │
│    ✅ Sample student view preview                        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Onboarding Complete!                                 │
│    ✅ Checklist: ✓ Classroom created, ✓ Lesson added,   │
│       ✓ Students invited                                 │
│    ✅ Next steps: "Track progress after students join"   │
│    ✅ Help resources: Video tutorials, FAQ link          │
│    ✅ "Skip to dashboard" or "Take a tour"               │
│    😊 DELIGHT: "I'm ready to teach!"                    │
└─────────────────────────────────────────────────────────┘

🎉 IMPACT: Time to first lesson: 20+ min → 5 min
```

---

## Summary of Pain Points by Severity

### 🔴 Critical (Must Fix)
1. **No bulk lesson assignment** - Wastes teacher time, blocks adoption at scale
2. **"Students Needing Help" card not actionable** - Teachers can't act on data
3. **Leaderboard only shows top 3** - Most students don't see their rank, kills motivation
4. **No onboarding wizard** - High barrier to entry for new teachers

### 🟡 Important (Should Fix)
5. **No template previews** - Teachers can't visualize game before creating
6. **Limited practice mode variety** - Students find practice boring
7. **No word-level difficulty insights** - Teachers can't personalize interventions
8. **No lesson templates/presets** - Slow to create first lesson

### 🟢 Nice to Have (Could Fix Later)
9. **No collaborative practice modes** - Missing peer learning opportunities
10. **No parent/guardian integration** - Limited home-school connection
11. **No admin role** - School district oversight not possible
12. **No offline mode** - Can't use without internet

---

## Design Principles for Solutions

1. **Reduce Clicks**: Multi-select over repetition
2. **Make Data Actionable**: Every metric should have a click-through
3. **Progressive Disclosure**: Show more details on demand
4. **Visual Hierarchy**: Use color coding (red/yellow/green) for status
5. **Onboarding**: Guided first-time experience with templates
6. **Gamification**: Leverage existing XP system for engagement
7. **Clear Progress**: Always show "where I am" and "where I'm going"
