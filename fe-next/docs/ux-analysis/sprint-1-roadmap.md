# Sprint 1 Implementation Roadmap - P0 Features

**Duration**: 2 weeks (10 working days)
**Team**: 2 Frontend Engineers + 1 QA Tester
**Goal**: Implement all 3 critical UX improvements

---

## Sprint Overview

### P0 Features (Critical Quick Wins)

| Feature | Impact | Effort | Days | Owner |
|---------|--------|--------|------|-------|
| **Feature 1**: Expandable Leaderboard | Student engagement ↑20% | Low | 2 | Engineer A |
| **Feature 2**: Actionable Metrics | Teacher speed ↑3× | Low | 1 | Engineer B |
| **Feature 3**: Onboarding Wizard | Time to first lesson ↓75% | Medium | 7 | Engineers A+B |

**Total**: 10 engineering days (parallelized to 2 weeks)

---

## Day-by-Day Breakdown

### Week 1: Foundations + Quick Wins

#### Day 1-2: Feature 1 - Expandable Leaderboard (Engineer A)
**Day 1**:
- [ ] Morning: Update `useClassroomLeaderboard` hook
  - Add context calculation (rank, ±2 students, XP gap)
  - Add caching logic (5-minute TTL)
  - Write unit tests
- [ ] Afternoon: Update `ClassroomLeaderboard` component
  - Add compact view with context
  - Add collapse indicator
  - Style with neo-brutalist design

**Day 2**:
- [ ] Morning: Implement full leaderboard modal
  - Create modal component
  - Add "View Full" button
  - Add relative time formatting
- [ ] Afternoon: Testing & refinement
  - Visual testing (edge cases: rank 1, rank last, 3 students total)
  - Performance testing (50+ students)
  - Add translations (en, he, sv, ja)
- [ ] End of Day: **Feature 1 Complete** ✅

---

#### Day 1: Feature 2 - Actionable Metrics (Engineer B)
**Day 1**:
- [ ] Morning: Update `MetricCard` component
  - Add onClick prop
  - Add preview prop
  - Add hover states
  - Update styling
- [ ] Lunch: Update `useClassroomAnalytics` hook
  - Add struggling students calculation (<60% accuracy)
  - Extract common mistakes (top 3 words)
  - Write unit tests
- [ ] Afternoon: Wire up click navigation
  - Update `AnalyticsDashboard` with click handler
  - Add struggling students preview
  - Update `StudentProgressView` with filter support
  - Add filter chip UI
- [ ] Late Afternoon: Testing & translations
  - Test filter navigation
  - Test edge cases (0 struggling students)
  - Add translations
- [ ] End of Day: **Feature 2 Complete** ✅

---

#### Day 2-3: Start Feature 3 - Onboarding Wizard (Both Engineers)

**Day 2 (Engineer A):**
- [ ] Morning: Create wizard shell component
  - `TeacherOnboardingWizard.tsx`
  - Step progression logic
  - Progress indicator
- [ ] Afternoon: Implement Step 1 (Classroom)
  - `ClassroomStep.tsx`
  - Form with name + description
  - Preview panel
  - Skip functionality

**Day 2 (Engineer B):**
- [ ] Morning: Create lesson template data
  - `data/lessonTemplates.ts`
  - 3 templates with 20-50 words each
  - Basic Vocab, SAT Prep, ESL Beginner
- [ ] Afternoon: Create template card components
  - `TemplateCard.tsx`
  - `TemplatePreviewModal.tsx`
  - Template selection logic

**Day 3 (Both Engineers):**
- [ ] Morning: Implement Step 2 (Lesson)
  - `LessonStep.tsx`
  - Template grid layout
  - Template selection
  - Import options (CSV/manual entry) - UI only, functionality later
- [ ] Afternoon: Implement Step 3 (Invite)
  - `InviteStep.tsx`
  - Join code display
  - QR code generation
  - Copy buttons
  - Email template (optional)

---

### Week 2: Complete Onboarding + Polish

#### Day 4-5: Finish Onboarding Wizard

**Day 4 (Engineer A):**
- [ ] Morning: Completion screen
  - `CompletionScreen.tsx`
  - Summary of created resources
  - Tour option (placeholder for now)
- [ ] Afternoon: Integration with teacher dashboard
  - Update `app/[locale]/teacher/PageClient.tsx`
  - Check onboarding status
  - Show wizard on first login
  - Mark onboarding complete

**Day 4 (Engineer B):**
- [ ] Morning: Database migration
  - Add `onboarding_completed` column to users table
  - Create index
  - Test migration
- [ ] Afternoon: API integration
  - Wire up classroom creation
  - Wire up lesson creation
  - Wire up default creation (skip flow)

**Day 5 (Both Engineers):**
- [ ] Morning: Integration testing
  - Complete wizard flow creates all resources
  - Skip creates defaults
  - Returning user doesn't see wizard
- [ ] Afternoon: Refinement
  - Fix any bugs found
  - Polish animations
  - Add loading states

---

#### Day 6-7: Testing & QA

**Day 6 (QA Tester):**
- [ ] Morning: Feature 1 - Leaderboard
  - Test compact view
  - Test modal
  - Test edge cases (rank 1, last, 3 students)
  - Test caching
  - Test translations (all 4 languages)
- [ ] Afternoon: Feature 2 - Actionable Metrics
  - Test metric card click
  - Test filter navigation
  - Test struggling student calculation
  - Test edge cases (0 students, null data)

**Day 7 (QA Tester):**
- [ ] Full Day: Feature 3 - Onboarding Wizard
  - Test step progression
  - Test form validation
  - Test template selection
  - Test skip functionality
  - Test completion flow
  - Test integration with dashboard
  - Test all 4 languages
  - Performance testing

**Day 6-7 (Engineers):**
- [ ] Fix bugs reported by QA
- [ ] Add E2E tests (Playwright)
- [ ] Update documentation

---

#### Day 8: Final Polish & Prep

- [ ] Code review for all features
- [ ] Security audit (input validation, XSS prevention)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance testing (50+ students, 5+ classrooms)
- [ ] Update CLAUDE.md with new features
- [ ] Create release notes

---

#### Day 9: Staging Deployment

- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Internal team testing
- [ ] Gather feedback
- [ ] Fix any critical issues

---

#### Day 10: Production Deployment

- [ ] Final QA sign-off
- [ ] Deploy to production (gradual rollout)
  - 10% of users (first hour)
  - 50% of users (next 4 hours)
  - 100% of users (after monitoring)
- [ ] Monitor error rates and performance
- [ ] Celebrate sprint completion! 🎉

---

## Parallel Work Strategy

### Week 1
```
Day 1-2:
┌─────────────┐    ┌─────────────┐
│ Engineer A  │    │ Engineer B  │
│ Feature 1   │    │ Feature 2   │
│ (Leaderboard)│   │ (Metrics)   │
└─────────────┘    └─────────────┘

Day 3:
┌──────────────────────────────┐
│ Both Engineers               │
│ Feature 3 - Step 1 & 2       │
│ (Onboarding Wizard)          │
└──────────────────────────────┘
```

### Week 2
```
Day 4-5:
┌──────────────────────────────┐
│ Both Engineers               │
│ Feature 3 - Complete Wizard  │
└──────────────────────────────┘

Day 6-7:
┌──────────────────────────────┐
│ QA Tester                    │
│ Test all 3 features          │
└──────────────────────────────┘
┌──────────────────────────────┐
│ Engineers                    │
│ Fix bugs, E2E tests          │
└──────────────────────────────┘
```

---

## Dependencies

### External
- None (all features use existing tech stack)

### Internal
- Database migration must complete before onboarding wizard testing
- Lesson templates must be created before Step 2 implementation
- Both Features 1 & 2 must be complete before Feature 3 integration (to avoid conflicts)

---

## Risk Mitigation

### Risk 1: Onboarding Wizard Blocks Existing Users
**Mitigation**:
- Check `onboarding_completed` flag before showing wizard
- Add "Skip Setup" button on every step
- Store wizard state (if user closes browser mid-flow)

### Risk 2: Leaderboard Performance with Large Classrooms (100+ students)
**Mitigation**:
- Implement caching (5-minute TTL)
- Add pagination to full modal (show 50 students per page)
- Database indexes on `total_xp` column

### Risk 3: Metric Calculation Overhead (Struggling Students)
**Mitigation**:
- Calculate on-demand (not on page load)
- Cache results (5-minute TTL)
- Optimize database query (single query with aggregations)

---

## Success Criteria (Sprint 1 Acceptance)

### Feature 1: Expandable Leaderboard
- [ ] All students can see their rank (not just top 3)
- [ ] Modal shows full leaderboard (all students)
- [ ] XP gap to next rank displayed
- [ ] Caching works (no re-fetch within 5 min)
- [ ] Renders <100ms with 50 students

### Feature 2: Actionable Metrics
- [ ] Metric card shows student names on hover
- [ ] Click navigates to filtered student list
- [ ] Filter chip displayed correctly
- [ ] Common mistakes extracted (top 3 words)
- [ ] Quick actions available (Assign Review, Send Message)

### Feature 3: Onboarding Wizard
- [ ] New teachers see wizard on first login
- [ ] Wizard creates classroom, lesson, and join code
- [ ] Skip creates defaults (classroom + starter lesson)
- [ ] Completion screen shows summary
- [ ] Onboarding flag set to true after completion
- [ ] Returning teachers don't see wizard

### Overall Sprint Goals
- [ ] All P0 features deployed to production
- [ ] Zero critical bugs in production
- [ ] 80%+ test coverage for new code
- [ ] All translations complete (4 languages)
- [ ] Documentation updated

---

## Monitoring & Success Metrics

### Week 1 (Post-Deployment)
Track these metrics daily:

1. **Leaderboard Usage**:
   - % of students who expand full leaderboard
   - Avg time spent viewing leaderboard
   - Error rate (<1%)

2. **Actionable Metrics Usage**:
   - % of teachers who click "Students Needing Help"
   - % of teachers who take action (assign review, send message)
   - Time to intervention (target: <3 min)

3. **Onboarding Completion**:
   - % of new teachers who complete wizard
   - % who skip wizard
   - Avg time to complete wizard (target: <5 min)
   - Abandonment rate by step

---

## Rollback Plan

If any feature causes critical issues:

1. **Feature Flags**: Disable feature via environment variable
2. **Database Rollback**: Revert migration if needed
3. **Code Rollback**: Deploy previous version
4. **User Communication**: Notify users of issue via in-app banner

Feature flags:
```env
ENABLE_EXPANDABLE_LEADERBOARD=true
ENABLE_ACTIONABLE_METRICS=true
ENABLE_ONBOARDING_WIZARD=true
```

---

## Post-Sprint Actions

### Week 3 (After Sprint 1)
- [ ] Retrospective meeting (What went well? What didn't?)
- [ ] Analyze success metrics
- [ ] Gather user feedback (surveys, interviews)
- [ ] Create backlog items for improvements
- [ ] Plan Sprint 2 (P1 features: Bulk Assignment, Student Diagnostics, Gamified Modes)

---

## Team Communication

### Daily Standups (15 minutes)
- What did you complete yesterday?
- What are you working on today?
- Any blockers?

### Weekly Sync (1 hour)
- Demo progress
- Review metrics
- Adjust plan if needed

### Slack Channels
- `#education-improvements` - General discussion
- `#sprint-1-p0` - Sprint-specific updates
- `#bugs` - Bug reports during testing

---

## Documentation Deliverables

By end of Sprint 1:
- [ ] Updated CLAUDE.md with new features
- [ ] Migration guide for `onboarding_completed` column
- [ ] Lesson template creation guide
- [ ] Translation guide (for future languages)
- [ ] Architecture decision record (ADR) for caching strategy
- [ ] Release notes for users

---

## Appendix: File Checklist

### Files to Create (Feature 1)
- [ ] `hooks/useClassroomLeaderboard.ts` (updated)
- [ ] `components/education/ClassroomLeaderboard.tsx` (updated)

### Files to Create (Feature 2)
- [ ] `components/teacher/analytics/MetricCard.tsx` (updated)
- [ ] `components/teacher/analytics/AnalyticsDashboard.tsx` (updated)
- [ ] `hooks/useClassroomAnalytics.ts` (updated)
- [ ] `components/teacher/StudentProgressView.tsx` (updated)

### Files to Create (Feature 3)
- [ ] `components/teacher/TeacherOnboardingWizard.tsx`
- [ ] `components/teacher/onboarding/WelcomeScreen.tsx`
- [ ] `components/teacher/onboarding/ClassroomStep.tsx`
- [ ] `components/teacher/onboarding/LessonStep.tsx`
- [ ] `components/teacher/onboarding/InviteStep.tsx`
- [ ] `components/teacher/onboarding/CompletionScreen.tsx`
- [ ] `components/teacher/onboarding/StepHeader.tsx`
- [ ] `data/lessonTemplates.ts`
- [ ] `migrations/YYYYMMDD_add_onboarding_completed.sql`

### Files to Modify
- [ ] `app/[locale]/teacher/PageClient.tsx`
- [ ] `translations/en.json`
- [ ] `translations/he.json`
- [ ] `translations/sv.json`
- [ ] `translations/ja.json`

---

**Sprint 1 Start Date**: [To be scheduled]
**Sprint 1 End Date**: [2 weeks after start]

**Questions or concerns? Reach out to the team lead!**
