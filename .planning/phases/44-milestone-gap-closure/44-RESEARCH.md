---
phase: 44
research_date: 2026-02-14
status: complete
objective: Research what's needed to close v2.0 milestone gaps and tech debt
focus_areas:
  - SOC-02 requirement completion (ChallengeButton wiring)
  - Phase 38 tech debt cleanup (mock data, unused exports)
  - Phase 37 verification (missing VERIFICATION.md)
---

# Phase 44: Milestone Gap Closure & Tech Debt — Research

**Research Question:** What do I need to know to PLAN this phase well?

---

## Context from Milestone Audit

**Milestone v2.0 Status:**
- Requirements: 26/27 satisfied (1 partial: SOC-02)
- Phases: 7/8 verified (Phase 37 missing VERIFICATION.md)
- E2E Flows: 6/6 complete
- No blockers, but accumulated deferred tech debt

**Identified Gaps:**

1. **SOC-02 (Partial):** ChallengeButton component exists but not wired to student profile or classroom roster
2. **Phase 38 Tech Debt:**
   - Mock classroom/lesson data in duel PageClient.tsx
   - `getActiveDuelsForStudent()` exported but unused
3. **Phase 37:** No VERIFICATION.md (phase never formally verified)

---

## 1. SOC-02: Challenge Button Wiring

### Current State

**Component Location:**
- `/fe-next/components/education/duels/ChallengeButton.tsx` (156 lines, 11 tests passing)

**Component Status:**
- ✅ Built and tested (Phase 38-05)
- ✅ Used in DuelLobby (via import in PageClient)
- ❌ NOT imported in student profile page
- ❌ NOT imported in classroom roster

**ChallengeButton Props Required:**
```typescript
{
  opponentId: string;
  opponentName: string;
  opponentAvatar?: string | null;
  classroomId: string;
  lessons: Array<{ id: string; name: string }>;
  variant?: 'icon' | 'button';  // Default: button
  className?: string;
}
```

**Component Variants:**
- `button`: Full button with icon + text (default)
- `icon`: Icon-only compact button (for tight spaces like roster rows)

**Component Dependencies:**
- Opens `DuelChallengeModal` when clicked
- Uses `useDuelSocket` hook for challenge creation
- Requires classroom context (classroomId) and lesson list

### Integration Surfaces

#### Surface 1: Student Profile Page

**File:** `/fe-next/app/[locale]/student/profile/PageClient.tsx` (530 lines)

**Current State:**
- Profile shows duel stats, recent duels, achievements
- Does NOT import ChallengeButton
- Has empty state with prompt: "Challenge classmates to improve your record"

**Data Availability:**
- ❌ `classroomId` NOT fetched (profile doesn't load classroom data)
- ❌ `lessons` NOT available (profile doesn't fetch lesson list)
- ✅ `user.id` available (from AuthContext)

**Integration Approach:**
1. Fetch student's classroom using `getStudentClassroom(user.id)` (from `lib/supabase/education/classrooms.ts`)
2. Fetch lessons using `getLessons(user.id)` (from `lib/supabase/education/lessons.ts`)
3. Add ChallengeButton to duel section (after duel stats, before recent duels)
4. Use `button` variant (full button, clear CTA)

**Placement Options:**
- **Option A:** Below duel stats grid, "Challenge a Classmate" CTA button
- **Option B:** In empty state (replaces prompt text with button)
- **Option C:** Floating action button in duel section header

**Recommendation:** Option A (clear CTA below stats) — aligns with existing profile layout patterns.

#### Surface 2: Classroom Roster

**File:** `/fe-next/components/teacher/ClassroomStudentList.tsx` (137 lines)

**Current State:**
- Teacher-facing classroom roster showing students
- NOT exposed to students (teacher-only view)
- No student profile pages exist for "other students" in same classroom

**Issue:** SOC-02 requirement states "challenge from classroom roster" but:
- Current roster is teacher-only
- No student-facing roster exists
- No "view other student profile" page exists

**Resolution Options:**

**Option 1:** Add ChallengeButton to existing roster (make accessible to students)
- Requires auth check (teacher vs student view)
- Icon variant button per student row
- Fetch classroomId + lessons in roster parent

**Option 2:** Create student-facing classroom roster page
- New page: `/app/[locale]/student/classroom/PageClient.tsx`
- List classmates with avatars + ChallengeButton per row
- Requires new routing and page structure

**Option 3:** Add "Classmates" tab to duel lobby
- Extend `/app/[locale]/education/duels/PageClient.tsx` with new tab
- Show classmates list with ChallengeButton per row
- Leverages existing duel context (classroom + lessons already fetched)

**Recommendation:** Option 3 (add tab to duel lobby) — least invasive, leverages existing context, aligns with SOC-02 intent (challenge from anywhere in duel context).

---

## 2. Phase 38 Tech Debt Cleanup

### Issue 1: Mock Data in Duel PageClient

**File:** `/fe-next/app/[locale]/education/duels/PageClient.tsx` (100 lines)

**Current State:**
- ✅ ALREADY FETCHES REAL DATA (no mock data found!)
- Line 26-28: Uses `getStudentClassroom(user.id)` and `getLessons(user.id)`
- Line 30-31: Sets state with fetched data
- Line 63: Transforms lessons to `{ id, name }` format

**Status:** ✅ NO ACTION NEEDED — "mock data" claim in milestone audit is outdated. Code already uses real fetches.

**Evidence:**
```typescript
// Lines 24-34 from PageClient.tsx
async function loadData() {
  setLoading(true);
  const [classroomRes, lessonsRes] = await Promise.all([
    getStudentClassroom(user!.id),
    getLessons(user!.id),
  ]);
  if (classroomRes.data) setClassroom(classroomRes.data);
  if (lessonsRes.data) setLessons(lessonsRes.data);
  setLoading(false);
}
```

**Decision:** Mark as RESOLVED in verification — no code changes needed.

### Issue 2: Unused Export `getActiveDuelsForStudent()`

**File:** `/fe-next/lib/supabase/education/duels.ts`

**Function Definition:**
- Lines 439-463 (24 lines)
- Fetches duels with `status = 'active'` where user is challenger or opponent
- Returns `DuelRow[]` with error handling
- Has passing tests (duels.test.ts)

**Current Usage:**
- ❌ NOT imported anywhere in codebase
- ❌ NOT used in DuelLobby, DuelGameView, or DuelHistory
- ❌ NOT used in profile page

**Analysis:**
- Function is SUBSTANTIVE (not a stub)
- Has tests (would need to maintain if kept)
- Similar to `getPendingDuelsForStudent()` which IS used
- Could be useful for "Active Duels" tab or dashboard widget

**Removal Impact:**
- Low risk (no imports found)
- Cleanup benefits (less maintenance)
- Potential future use case (student dashboard "Your Active Duels" widget)

**Decision Options:**

**Option A:** Delete function + tests (clean unused code)
- Pro: Reduces maintenance burden
- Pro: Follows YAGNI principle
- Con: Re-implement if needed later

**Option B:** Keep function, add comment about future use
- Pro: Preserves work
- Pro: Available for dashboard refactor
- Con: Carries maintenance burden

**Option C:** Use function in duel lobby or profile (make it non-orphaned)
- Pro: Completes implementation
- Pro: Adds value (show active duels)
- Con: Scope creep (new feature)

**Recommendation:** Option A (delete) — no current use case, tests add overhead, can re-implement if needed. Follows cleanup intent.

---

## 3. Phase 37 Verification

### Current State

**Phase 37: Practice Modes**
- Plans executed: 37-01 through 37-06
- All deliverables completed (matching, spelling, blitz modes)
- All tests passing (136/136 tests)
- NO VERIFICATION.md file exists

**Required Verification Artifacts:**

Per `.claude/workflows/verification.md` standard:
1. VERIFICATION.md file with structured gaps
2. Check all success criteria from phase goal
3. Verify artifacts exist and are substantive
4. Check wiring (imports, usage, integration)
5. Identify anti-patterns or orphaned code
6. Score: X/Y truths verified

**Phase 37 Success Criteria (from roadmap):**
1. Student can practice word matching (drag-and-drop pairs)
2. Student can practice spelling challenge (type word from definition)
3. Student can practice timed blitz (rapid word finding)
4. Practice mode selector UI exists with all 3 modes
5. Translations complete in 4 languages

**Verification Approach:**

**Step 1:** Create VERIFICATION.md following 38-VERIFICATION.md pattern
- Check artifact existence (components, hooks, tests)
- Verify substantive implementation (not stubs)
- Check imports/usage (wiring verification)
- Confirm translations exist (en, he, sv, ja)

**Step 2:** Run verification checks
- Line count analysis (components should be 200+ lines)
- Test execution (all tests passing)
- Import analysis (components used in pages)
- Translation coverage (keys exist in all languages)

**Step 3:** Document any deferred items
- Note any "TODO" comments
- Identify incomplete integrations
- List any tech debt

**Expected Outcome:** Phase 37 should verify cleanly (no gaps) since all plans completed successfully and tests pass.

---

## 4. Technical Requirements

### Data Fetching Functions

**Classroom Data:**
- Function: `getStudentClassroom(studentId: string)`
- Location: `lib/supabase/education/classrooms.ts`
- Returns: `{ data: Classroom | null, error: { message: string } | null }`
- Used by: DuelLobby (already working)

**Lesson Data:**
- Function: `getLessons(studentId: string)`
- Location: `lib/supabase/education/lessons.ts`
- Returns: `{ data: VocabularyLesson[], error: { message: string } | null }`
- Used by: DuelLobby (already working)

**Both functions already exist and work** — no new data layer needed.

### Component Integration Pattern

**Standard Pattern (from DuelLobby):**
```typescript
// 1. Fetch data on mount
useEffect(() => {
  async function loadData() {
    const [classroomRes, lessonsRes] = await Promise.all([
      getStudentClassroom(user.id),
      getLessons(user.id),
    ]);
    if (classroomRes.data) setClassroom(classroomRes.data);
    if (lessonsRes.data) setLessons(lessonsRes.data);
  }
  loadData();
}, [user]);

// 2. Transform lessons to format ChallengeButton expects
const lessonOptions = lessons.map((l) => ({ id: l.id, name: l.name }));

// 3. Render ChallengeButton with required props
<ChallengeButton
  opponentId={opponent.id}
  opponentName={opponent.display_name}
  opponentAvatar={opponent.avatar_url}
  classroomId={classroom.id}
  lessons={lessonOptions}
  variant="icon"  // or "button"
/>
```

### Testing Requirements

**TDD Cycle:**
1. Write test for ChallengeButton integration
2. Verify button renders with correct props
3. Verify click opens DuelChallengeModal
4. Verify data fetching on mount

**Test Coverage:**
- Student profile: ChallengeButton renders when classroom exists
- Student profile: ChallengeButton hidden when no classroom
- Duel lobby tab: Classmates list renders with ChallengeButton per row

---

## 5. Implementation Complexity

### Task Breakdown

**Task 1: Wire ChallengeButton to Student Profile**
- **Complexity:** Medium (data fetching + state management)
- **Effort:** 1-2 hours
- **Risk:** Low (pattern already proven in DuelLobby)
- **Files:** 1 modified (PageClient.tsx)
- **Tests:** 2-3 new tests

**Task 2: Add Classmates Tab to Duel Lobby**
- **Complexity:** Low (extend existing tab system)
- **Effort:** 1 hour
- **Risk:** Very low (classroom data already available)
- **Files:** 1 modified (PageClient.tsx), 1 new component (ClassmatesList.tsx)
- **Tests:** 3-4 new tests

**Task 3: Clean Up Unused Export**
- **Complexity:** Very low (delete function + tests)
- **Effort:** 15 minutes
- **Risk:** Very low (confirmed no imports)
- **Files:** 1 modified (duels.ts), 1 modified (duels.test.ts)
- **Tests:** Delete corresponding tests

**Task 4: Create Phase 37 VERIFICATION.md**
- **Complexity:** Low (follow 38-VERIFICATION.md pattern)
- **Effort:** 30-45 minutes
- **Risk:** Very low (phase complete, just documentation)
- **Files:** 1 new (37-VERIFICATION.md)
- **Tests:** None (verification artifact)

**Total Effort:** 3-4 hours
**Risk Level:** Low (all patterns proven, no new architecture)

---

## 6. Dependencies and Risks

### Dependencies

**None** — All required infrastructure exists:
- ✅ ChallengeButton component complete
- ✅ DuelChallengeModal complete
- ✅ Data fetching functions exist
- ✅ Socket.IO handlers registered
- ✅ Translations complete (all 4 languages)

### Risks

**Risk 1: Student Has No Classroom**
- **Mitigation:** Hide ChallengeButton when `classroom === null`
- **Precedent:** DuelLobby already handles this (shows "Join classroom" message)

**Risk 2: Student Has No Lessons Assigned**
- **Mitigation:** Show message "No lessons available" in DuelChallengeModal
- **Precedent:** Modal already validates lesson selection (can extend validation)

**Risk 3: Breaking Existing Duel Flow**
- **Mitigation:** All changes are additive (no modifications to existing flow)
- **Verification:** Run full duel test suite after changes

---

## 7. Success Criteria

**SOC-02 Completion:**
- [x] ChallengeButton component exists (done in Phase 38)
- [ ] Student can challenge from profile page (gap)
- [ ] Student can challenge from classroom context (gap — via lobby tab)
- [ ] Both surfaces have classroom + lesson data available
- [ ] All integrations tested and verified

**Tech Debt Resolution:**
- [x] Mock data replaced with real fetches (already done, verify)
- [ ] Unused `getActiveDuelsForStudent()` removed
- [ ] No orphaned exports in duels data layer

**Phase 37 Verification:**
- [ ] VERIFICATION.md created with structured format
- [ ] All 5 success criteria verified
- [ ] All artifacts substantive (not stubs)
- [ ] All components wired (imports verified)
- [ ] Phase marked as "verified" status

**Validation:**
- [ ] All tests pass (no regressions)
- [ ] Build succeeds (no TypeScript errors)
- [ ] Lint passes (no style violations)
- [ ] Human verification (manual testing in dev)

---

## 8. Open Questions

**Q1: Where to place ChallengeButton in student profile?**
- **Answer:** Below duel stats grid, before recent duels list (Option A)
- **Rationale:** Clear CTA placement, doesn't interfere with existing layout

**Q2: Should we create student-facing roster or extend duel lobby?**
- **Answer:** Extend duel lobby with "Classmates" tab (Option 3)
- **Rationale:** Leverages existing context, aligns with duel workflow, less invasive

**Q3: Keep or delete `getActiveDuelsForStudent()`?**
- **Answer:** Delete (Option A)
- **Rationale:** No current use case, YAGNI principle, reduces maintenance

**Q4: Phase 37 verification — any expected gaps?**
- **Answer:** No gaps expected (all plans complete, tests passing)
- **Verification:** Should be straightforward documentation task

---

## 9. Recommended Plan Structure

**Single Plan (44-01):**

All tasks are tightly coupled (gap closure for one milestone) and low complexity. Combining into single plan allows:
- Atomic commit (all gaps closed together)
- Single verification pass
- Clear "before/after" for milestone completion

**Plan 44-01 Tasks:**
1. Wire ChallengeButton to student profile page (SOC-02 part 1)
2. Add "Classmates" tab to duel lobby with ChallengeButton per row (SOC-02 part 2)
3. Remove unused `getActiveDuelsForStudent()` function + tests (tech debt)
4. Verify duel PageClient uses real fetches (tech debt validation)
5. Create Phase 37 VERIFICATION.md (missing artifact)

**Estimated Duration:** 3-4 hours

---

## 10. Key Files Reference

**To Modify:**
- `/fe-next/app/[locale]/student/profile/PageClient.tsx` — Add ChallengeButton + data fetching
- `/fe-next/app/[locale]/education/duels/PageClient.tsx` — Add Classmates tab
- `/fe-next/lib/supabase/education/duels.ts` — Remove getActiveDuelsForStudent()
- `/fe-next/lib/supabase/education/__tests__/duels.test.ts` — Remove corresponding tests

**To Create:**
- `/fe-next/components/education/duels/ClassmatesList.tsx` — Classmates list with ChallengeButton
- `/.planning/phases/37-practice-modes/37-VERIFICATION.md` — Phase 37 verification

**To Reference:**
- `/fe-next/components/education/duels/ChallengeButton.tsx` — Component to integrate
- `/fe-next/components/education/duels/DuelLobby.tsx` — Pattern for tab extension
- `/.planning/phases/38-async-duels/38-VERIFICATION.md` — Template for Phase 37 verification

---

## Summary

**What You Need to Know:**

1. **SOC-02 Gap:** ChallengeButton exists but needs wiring in 2 places (profile + lobby tab)
2. **Data Layer:** All required functions exist (`getStudentClassroom`, `getLessons`)
3. **Mock Data Claim:** False alarm — PageClient already uses real fetches (verify and document)
4. **Unused Export:** `getActiveDuelsForStudent()` should be deleted (no usage, YAGNI)
5. **Phase 37:** Needs verification document (no code gaps, just missing artifact)
6. **Effort:** Low (3-4 hours), low risk (proven patterns)
7. **Single Plan:** All tasks in 44-01 (atomic, tightly coupled)

**Ready to Plan:** All patterns proven, infrastructure exists, straightforward integration work.
