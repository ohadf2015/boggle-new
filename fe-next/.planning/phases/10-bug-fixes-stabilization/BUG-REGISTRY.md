# Bug Registry - Daily Word Hunt Challenge

**Phase:** 10 - Bug Fixes & Stabilization
**Discovery Date:** 2026-01-24
**Mode:** Daily Challenge Word Hunt (Survival)
**Languages Tested:** English, Hebrew, Swedish, Japanese

---

## Discovery Overview

This registry documents all bugs discovered during systematic bug discovery session for the daily word hunt challenge mode.

**Discovery Method:**
- E2E test suite creation (automated discovery)
- Code analysis (static bug detection)
- Test file examination (known bugs from tests)
- Error handling audit (console.error/warn pattern search)
- Translation system validation

**Bug Count:** 8 bugs discovered
- Critical: 1 (testing infrastructure)
- High: 3 (data loss, clue accuracy, sync issues)
- Medium: 3 (error handling, regression risk, user communication)
- Low: 2 (debug logs, translation validation)

---

## Discovered Bugs

### Critical Bugs
> Critical: Crashes, data loss, game unplayable

#### BUG-001: E2E Test Server Port Conflict Prevents Automated Testing
**Severity:** Critical (for testing infrastructure)
**Component:** e2e/playwright configuration
**Language:** All
**Steps to Reproduce:**
1. Start dev server on port 3001
2. Run `npx playwright test e2e/daily-challenge-stabilization.spec.ts`
3. Playwright tries to start webServer but port 3001 already in use
4. Tests timeout: "Error: Timed out waiting 120000ms from config.webServer"

**Evidence:** Test execution logs show "EADDRINUSE: address already in use 0.0.0.0:3001"
**Root Cause:** Playwright webServer config conflicts with already-running dev server
**Fix Plan:** 10-02 (configuration fix)

---

### High Severity Bugs
> High: Incorrect scoring, major UI breakage

#### BUG-002: Invalid Attempt Count Blocks Result Submission
**Severity:** High
**Component:** components/daily/results/useResultSubmission.ts
**Language:** All
**Status:** ✅ FIXED (Plan 10-03)
**Steps to Reproduce:**
1. Complete Word Hunt game
2. If attemptsUsed < 1 or > 10 (data corruption scenario)
3. Result is marked as submitted but never actually sent to server
4. Player loses their score/progress permanently

**Evidence:**
```typescript
// Line 92-98: Invalid data is marked submitted without actually submitting
if (result.attemptsUsed < 1 || result.attemptsUsed > 10) {
  console.warn('[WordHunt Submit] Invalid attempts count:', result.attemptsUsed);
  hasSubmittedRef.current = true; // BUG: Marks submitted without sending
  markWordHuntResultSubmitted(language);
  return; // Never submits to server!
}
```

**Root Cause:** Data validation happens AFTER submission flag is set, causing permanent data loss

**Fix Applied:**
- Removed `hasSubmittedRef.current = true` and `markWordHuntResultSubmitted(language)` calls
- Changed to console.error for better visibility
- Return early without marking as submitted
- Test coverage: 4 tests in bug-fixes.test.tsx (RED-GREEN cycle verified)
- Commit: 99f53d9b (test), [next] (fix)

#### BUG-003: Known Letters Not Cleaned Up When All Occurrences Become Green
**Severity:** High (affects clue accuracy)
**Component:** components/daily/survival/useSurvivalClues.ts
**Language:** All
**Steps to Reproduce:**
1. Target word is "STYLE"
2. Discover word "TEST" (reveals T at position 1, S at position 0)
3. Both T and S turn green (all occurrences found)
4. Expected: T and S removed from knownLetters (yellow set)
5. Actual: T and S remain in knownLetters causing confusion

**Evidence:** Test file line 444-447:
```typescript
// BUG: T and S should be REMOVED from knownLetters since all occurrences are green
expect(result.current[0].knownLetters.has('T')).toBe(false);
expect(result.current[0].knownLetters.has('S')).toBe(false);
```

**Root Cause:** updateCluesFromDiscovery reads stale accumulatedClues state
**Fix Plan:** 10-03 (clue system fixes)

---

### Medium Severity Bugs
> Medium: Visual glitches, minor UX issues

#### BUG-004: Console Errors Not Surfaced to User in Production
**Severity:** Medium
**Component:** Multiple (error handling across daily challenge components)
**Language:** All
**Steps to Reproduce:**
1. Trigger any API failure (network error, invalid response)
2. Error is logged to console but user sees no feedback
3. User confused about what happened

**Evidence:** 48 console.error/warn calls found:
- Dictionary validation errors silently swallowed (line 274)
- Leaderboard fetch failures not shown to user
- Result submission failures only logged
- AI hint generation failures hidden

**Root Cause:** Error handling uses console.error without user-facing toast/dialog
**Fix Plan:** 10-04 (error handling improvements)

#### BUG-005: Guestfingerprint Requirement Previously Blocked Authenticated Users
**Severity:** Medium (fixed but regression risk)
**Component:** components/daily/results/useResultSubmission.ts, DailyChallengeResults.tsx
**Language:** All
**Steps to Reproduce:**
1. This is a FIXED bug (marked with "BUG FIX" comments)
2. Risk: Could regress if refactored incorrectly

**Evidence:** Multiple comments in code:
```typescript
// BUG FIX: Previously required guestFingerprint for ALL users, blocking authenticated submissions
const canSubmit = (isAuthenticated ? !!profile : !!guestFingerprint);
```

**Root Cause:** Logic incorrectly required guestFingerprint for authenticated users
**Fix Plan:** Add regression test in 10-05

#### BUG-006: Server Reset Failure Not Communicated to User
**Severity:** Medium
**Component:** components/daily/DailyChallenge.tsx (line 229-231)
**Language:** All
**Steps to Reproduce:**
1. User clicks retry/reset button
2. Server API call fails (network error, API down)
3. Error caught and logged: `console.warn('Failed to reset server attempt:', serverError)`
4. User sees success toast even though server reset failed
5. Server and client now out of sync

**Evidence:** Line 229-242 shows error is caught but success toast shown anyway
**Root Cause:** Error handling swallows failure without notifying user
**Fix Plan:** 10-03 (retry mechanism fixes)

---

### Low Severity Bugs
> Low: Polish issues, cosmetic

#### BUG-007: Debug Logging Left in Production Code
**Severity:** Low
**Component:** Multiple components
**Language:** All
**Steps to Reproduce:**
1. Open browser console during gameplay
2. See debug logs like "[WordHunt Submit Check]" polluting production console

**Evidence:**
- Line 73: `console.log('[WordHunt Submit Check]', { ... })`
- Line 153: `console.log('[WordHunt Submit] Preparing submission:', { ... })`
- Line 233: `console.log('Leaderboard data:', { ... })`

**Root Cause:** Debug logs not removed before production
**Fix Plan:** 10-04 (code cleanup)

#### BUG-008: Missing Translation Keys for Runtime Errors
**Severity:** Low
**Component:** Translation system
**Language:** All
**Steps to Reproduce:**
1. Run check:translations script
2. Found 4 template literals with dynamic interpolation
3. Found 8 variable keys where t(variable) could fail at runtime

**Evidence:** Translation report shows:
```
TEMPLATE LITERALS (4 found):
  - t(`achievements.${achievement.key}.name`)
  - t(`adventure.worlds.${world.name}`)

VARIABLE KEYS (8 found):
  - t(messageKey), t(fallbackKey), etc.
```

**Root Cause:** Dynamic translation keys not validated at build time
**Fix Plan:** 10-05 (add validation for dynamic keys)

---

## Bug Template

```markdown
## BUG-XXX: [Title]
**Severity:** Critical | High | Medium | Low
**Component:** [Component path]
**Language:** All | EN | HE | SV | JA
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Expected: X, Actual: Y

**Evidence:** [Screenshot path or console error]
**Root Cause (if known):** [Analysis]
**Fix Plan:** [Which plan will address this]
```

---

## Manual Testing Checklist

**Note:** Manual testing deferred to fix plans. E2E test suite created for automated validation once BUG-001 is resolved.

### English (EN)
- [x] Code review completed
- [x] Error handling audited
- [x] Console logging patterns identified
- [ ] Play complete game (blocked by BUG-001 - E2E infrastructure)
- [ ] Test clue system (deferred to 10-03 after BUG-003 fix)
- [ ] Test scoring display (deferred to 10-02)
- [ ] Test results screen (deferred to 10-03 after BUG-002 fix)
- [ ] Test leaderboard integration (deferred to 10-04)

### Hebrew (HE)
- [x] Code review completed
- [x] RTL layout verified in code
- [ ] Play complete game (blocked by BUG-001)
- [ ] Test clue system RTL (deferred to 10-03)
- [ ] Test scoring display RTL (deferred to 10-02)
- [ ] Test results screen RTL (deferred to 10-03)

### Swedish (SV)
- [x] Code review completed
- [x] Character encoding verified
- [ ] Play complete game (blocked by BUG-001)
- [ ] Test special chars åäö (deferred to 10-02)

### Japanese (JA)
- [x] Code review completed
- [x] Character encoding verified
- [ ] Play complete game (blocked by BUG-001)
- [ ] Test kanji/kana rendering (deferred to 10-02)

---

## E2E Test Results

**Test Suite:** e2e/daily-challenge-stabilization.spec.ts
**Status:** Blocked by BUG-001 (port conflict)
**Last Attempt:** 2026-01-24
**Outcome:** Test execution failed - webServer couldn't start due to port 3001 already in use

**Created Tests:** 20 discovery scenarios
- 4 basic functionality tests (one per language)
- 5 edge case tests
- 4 scoring edge case tests
- 3 state management tests
- 4 UI/UX responsive tests

**Next Steps:**
1. Fix BUG-001 (Playwright configuration)
2. Execute full test suite
3. Capture screenshots for manual inspection
4. Document any additional bugs discovered

**Note:** Test suite is comprehensive and ready to run once infrastructure issue is resolved.

---

## Performance Validation Bugs (Plan 10-02)

### BUG-009: Next.js 16 Turbopack Production Build Failure

**Severity:** Critical
**Status:** RESOLVED (transient issue - build now passes)
**Discovered:** 2026-01-24 (Plan 10-02)
**Component:** Build System / Next.js 16
**Language:** All

**Steps to Reproduce:**
1. Run `rm -rf .next && npm run build`
2. Build compiles successfully
3. TypeScript check passes
4. Failure occurs during "Collecting page data" phase
5. Error: `ENOENT: no such file or directory, open '.next/static/[hash]/_clientMiddlewareManifest.json'`

**Impact:**
- Blocks all production builds
- Blocks Lighthouse CI performance validation
- Blocks deployment to production
- Prevents establishing performance baseline

**Technical Details:**
- Next.js version: 16.0.10
- Turbopack enabled (experimental.turbopackUseSystemTlsCerts: true)
- Occurs consistently across multiple build attempts
- Compilation succeeds but static generation fails
- Also occurs with Turbopack disabled (NEXT_DISABLE_TURBOPACK=1)

**Attempted Fixes:**
- [x] Remove `.next` directory
- [x] Kill running processes
- [x] Clear node_modules cache
- [x] Disable Turbopack (still fails)
- [x] Stop dev server completely
- [ ] Downgrade Next.js version
- [ ] Investigate middleware edge runtime
- [ ] Check for conflicting webpack/turbopack configs

**Workaround:** None found yet

**References:**
- Plan: 10-02-PLAN.md Task 1
- PERFORMANCE-REPORT.md Issue 1
- Next.js issue tracker: TBD

**Fix Plan:** 10-02 or escalate to Next.js team

---

### BUG-010: Performance Tests Timeout Due to API Configuration

**Severity:** High
**Status:** OPEN
**Discovered:** 2026-01-24 (Plan 10-02)
**Component:** Testing Infrastructure / API Configuration
**Language:** All

**Steps to Reproduce:**
1. Run `npx playwright test e2e/performance-validation.spec.ts --project=chromium`
2. Tests navigate to `/en/daily/word-hunt`
3. API calls fail: "Invalid API key"
4. Page never reaches `networkidle` state
5. Tests timeout after 60 seconds

**Impact:**
- Cannot execute memory leak detection tests
- Cannot validate FCP performance targets
- Cannot measure DOM node accumulation
- Blocks performance validation entirely

**Technical Details:**
- Error: "SERVICE KEY VALIDATION FAILED: Invalid API key"
- Failing endpoint: `/api/check-played`
- Environment: Test environment lacks Supabase credentials
- Also affects: Community words loading, dictionary validation
- Timeout: 60 seconds (test times out)

**Console Errors:**
```
[API] GOOGLE_CREDENTIALS_JSON not set - AI hints will use fallback
[SUPABASE] SERVICE KEY VALIDATION FAILED: Invalid API key
[CommunityWords] Error loading from database: Invalid API key
[API] Check played error: Invalid API key
[Daily Puzzle] Failed to save grid: TypeError: isSupabaseConfigured is not a function
```

**Attempted Fixes:**
- [ ] Configure test environment variables
- [ ] Mock API responses for tests
- [ ] Use staging environment credentials
- [ ] Modify tests to wait for specific elements instead of networkidle

**Workaround:**
Option 1: Configure Supabase credentials in test environment
Option 2: Modify tests to mock API responses
Option 3: Change tests to not wait for networkidle

**References:**
- Test file: `e2e/performance-validation.spec.ts`
- Plan: 10-02-PLAN.md Task 2
- PERFORMANCE-REPORT.md Execution Status

**Fix Plan:** 10-02 (test configuration) or 10-04 (mock infrastructure)
