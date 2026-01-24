---
phase: 10-bug-fixes-stabilization
plan: 02
subsystem: quality-assurance
tags: [performance, testing, lighthouse, memory-leaks, ci-validation]

requires:
  - 10-01-bug-discovery

provides:
  - performance-validation-framework
  - memory-leak-detection-tests
  - performance-report-documentation
  - bug-tracking-for-performance

affects:
  - 10-03-bug-fixes
  - production-deployment
  - ci-pipeline

tech-stack:
  added:
    - playwright-cdp-profiling
  patterns:
    - chrome-devtools-protocol-heap-snapshots
    - performance-validation-e2e-tests
    - lighthouse-ci-integration

key-files:
  created:
    - e2e/performance-validation.spec.ts
    - .planning/phases/10-bug-fixes-stabilization/PERFORMANCE-REPORT.md
  modified:
    - .planning/phases/10-bug-fixes-stabilization/BUG-REGISTRY.md

decisions:
  - id: use-cdp-for-memory-profiling
    choice: Chrome DevTools Protocol for heap snapshots
    why: Industry standard, reliable, automated
    alternatives: [manual-devtools-profiling, third-party-tools]
  - id: 10mb-heap-growth-threshold
    choice: Maximum 10MB heap growth over 100 gameplay rounds
    why: Allows normal game state accumulation while detecting leaks
    alternatives: [5mb-stricter, 20mb-looser]
  - id: network-idle-wait-strategy
    choice: Wait for networkidle state before performance measurements
    why: Ensures page fully loaded for accurate metrics
    alternatives: [wait-for-specific-elements, fixed-timeout]

metrics:
  duration: 12min
  completed: 2026-01-24
---

# Phase 10 Plan 02: Performance Validation Summary

**One-liner:** Created performance validation framework with memory leak detection, but blocked by production build failure and test configuration issues.

## What Was Delivered

### ✅ Performance Test Framework
- **File:** `e2e/performance-validation.spec.ts` (295 lines, 4 tests)
- **Capabilities:**
  - Memory leak detection via Chrome DevTools Protocol
  - Heap snapshot profiling (initial/final/post-GC)
  - FCP validation with load time measurement
  - DOM node accumulation detection
  - Animation frame/timer cleanup verification
- **Test Coverage:**
  - 100 gameplay round simulation (~30min equivalent)
  - Heap growth validation (<10MB threshold)
  - DOM node growth validation (<50% threshold)
  - Garbage collection verification

### ✅ Performance Report Structure
- **File:** `PERFORMANCE-REPORT.md`
- **Sections:**
  - Executive summary with blocker status
  - Lighthouse results placeholder (blocked)
  - Memory leak analysis methodology
  - Performance issues tracking
  - Optimization opportunities
  - Test execution log
- **Status:** Ready for results when blockers resolved

### ✅ Bug Discovery & Documentation
- **BUG-009:** Next.js 16 Turbopack production build failure
  - Severity: Critical
  - Impact: Blocks Lighthouse CI, production deployment
  - Attempted: 5 different fix strategies
  - Status: Open, requires Next.js team escalation
- **BUG-010:** Performance tests timeout due to API configuration
  - Severity: High
  - Impact: Blocks test execution, performance validation
  - Cause: Missing Supabase credentials in test environment
  - Status: Open, requires test configuration

## What Was NOT Delivered

### ❌ Lighthouse CI Results
**Blocker:** Production build fails during page data collection
- Cannot run `npx lhci autorun`
- Cannot validate 90+ score targets
- Cannot establish performance baseline
- **Resolution Required:** Fix BUG-009 (Next.js 16 build issue)

### ❌ Memory Leak Test Results
**Blocker:** Tests timeout waiting for networkidle
- API requests fail with "Invalid API key"
- Page never reaches stable network state
- Tests timeout after 60 seconds
- **Resolution Required:** Fix BUG-010 (test environment config)

### ❌ Performance Bug Registry
**Dependency:** Requires successful Lighthouse run
- Cannot identify performance regressions
- Cannot create performance bugs
- Cannot prioritize optimization work
- **Deferred To:** After BUG-009 resolution

## Deviations from Plan

### Deviation 1: Production Build Failure (Rule 4 - Architectural Issue)
**What:** Next.js 16 Turbopack build fails consistently
**Why:** Build system issue requires framework-level investigation
**Impact:** Blocks all production deployments and Lighthouse CI
**Action Taken:** Documented as BUG-009, attempted 5 fix strategies
**Recommendation:** Escalate to Next.js team or downgrade to Next.js 15

### Deviation 2: Test Configuration Issues (Rule 3 - Blocking Issue)
**What:** Performance tests cannot execute due to missing API credentials
**Why:** Test environment lacks Supabase configuration
**Impact:** Cannot run memory leak detection or performance validation
**Action Taken:** Documented as BUG-010, identified 3 resolution paths
**Recommendation:** Configure test environment or implement API mocking

### Deviation 3: Incomplete Task Execution (Expected Given Blockers)
**What:** All 3 tasks blocked by infrastructure issues
**Why:** Cannot validate performance without working build and tests
**Impact:** Phase objectives not met
**Action Taken:** Created framework and documentation, tracked blockers
**Recommendation:** Prioritize bug fixes before continuing performance work

## Technical Insights

### Insight 1: Chrome DevTools Protocol for Automated Profiling
**Learning:** CDP provides programmatic access to heap snapshots
**Implementation:**
```typescript
const client = await page.context().newCDPSession(page);
await client.send('HeapProfiler.enable');
await client.send('HeapProfiler.collectGarbage');
const metrics = await client.send('Performance.getMetrics');
```
**Benefit:** Automated memory leak detection without manual profiling
**Caveat:** Only works with Chromium, not Firefox or WebKit

### Insight 2: Network Idle Strategy Fragility
**Learning:** Waiting for `networkidle` fails when API requests error continuously
**Problem:** Page loads but network never stabilizes due to retrying failed requests
**Alternative Strategies:**
1. Wait for specific UI elements instead of networkidle
2. Mock failing API endpoints
3. Configure proper credentials for test environment
**Recommendation:** Use element-based waits for critical tests

### Insight 3: Next.js 16 Build Instability
**Learning:** Turbopack in Next.js 16.0.10 has manifest generation issues
**Evidence:** Multiple ENOENT errors for `_clientMiddlewareManifest.json`
**Workarounds Attempted:**
- Clean .next directory: Failed
- Disable Turbopack: Failed (still uses Turbopack)
- Stop dev server: Failed
- Clear caches: Failed
**Conclusion:** Likely Next.js bug requiring version change or framework fix

## Test Results

### Performance Validation Tests
**Status:** ❌ All Failed (Timeout)
**Command:** `npx playwright test e2e/performance-validation.spec.ts --project=chromium`

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Memory leak detection | <10MB heap growth | Test timeout (60s) | ❌ Failed |
| FCP validation | <3000ms load time | Test timeout (60s) | ❌ Failed |
| DOM node accumulation | <50% node growth | Test timeout (60s) | ❌ Failed |
| Timer cleanup | Navigation succeeds | Test timeout (60s) | ❌ Failed |

**Failure Cause:** All tests timeout waiting for `networkidle` due to API errors
**Console Errors:**
- `[SUPABASE] SERVICE KEY VALIDATION FAILED: Invalid API key`
- `[API] Check played error: Invalid API key`
- `[Daily Puzzle] Failed to save grid: TypeError: isSupabaseConfigured is not a function`

### Lighthouse CI
**Status:** ❌ Not Executed (Build Blocker)
**Command:** `npx lhci autorun --config=lighthouserc.desktop.cjs`
**Blocker:** Production build fails before Lighthouse can run
**Error:** `ENOENT: no such file or directory, open '.next/static/[hash]/_clientMiddlewareManifest.json'`

## Architecture Decisions

### Decision: 10MB Heap Growth Threshold
**Context:** Need to distinguish normal gameplay state from memory leaks
**Options:**
1. **5MB threshold:** Stricter, may flag normal accumulation as leaks
2. **10MB threshold:** ✅ Chosen - Balances leak detection with normal usage
3. **20MB threshold:** Too loose, may miss small leaks

**Rationale:**
- 100 gameplay rounds simulates ~30 minutes of play
- Normal game state (board, words, scores) accumulates legitimately
- 10MB allows for this while catching abnormal growth
- Can adjust based on actual baseline once tests run

### Decision: Chrome DevTools Protocol Over Manual Profiling
**Context:** Need automated, repeatable memory leak detection
**Options:**
1. **Manual DevTools:** Not automatable, requires human intervention
2. **CDP Heap Snapshots:** ✅ Chosen - Fully automated, CI-compatible
3. **Third-party Tools:** Additional dependencies, learning curve

**Rationale:**
- CDP is built into Chromium, no extra dependencies
- Programmatic control over GC and snapshots
- Same data as manual DevTools but automated
- Industry standard approach

### Decision: Network Idle Wait Strategy (Later Revised)
**Context:** Need to ensure page fully loaded before measurements
**Options:**
1. **networkidle:** ✅ Initially chosen - Standard Playwright approach
2. **Element-based waits:** More reliable but requires knowledge of UI
3. **Fixed timeouts:** Fragile, environment-dependent

**Rationale:**
- networkidle ensures all network requests complete
- Standard Playwright pattern for E2E tests
- Works well when APIs are healthy
**Revision Needed:** networkidle fails with API errors, need element-based waits

## Next Phase Readiness

### Blockers for Phase Completion
1. **BUG-009 (Critical):** Production build failure
   - Prevents Lighthouse CI validation
   - Prevents production deployment
   - Requires Next.js version change or framework fix

2. **BUG-010 (High):** Test configuration issues
   - Prevents memory leak detection
   - Prevents performance baseline
   - Requires environment configuration or API mocking

### Dependencies Created
- **For 10-03 (Bug Fixes):**
  - BUG-009 and BUG-010 documented
  - Performance test framework ready for execution
  - Report structure ready for results

### Open Questions
1. **Next.js Version Strategy:**
   - Downgrade to 15.x for stability?
   - Wait for Next.js 16.0.11 bug fix?
   - Investigate middleware edge runtime conflicts?

2. **Test Environment Configuration:**
   - Should tests use real Supabase (staging)?
   - Should tests mock API responses?
   - Should tests use different wait strategies?

3. **Performance Budget Enforcement:**
   - When can Lighthouse CI be integrated into CI/CD?
   - Should performance tests run on every PR?
   - What's the process for performance regressions?

## Commit Log

| Commit | Message | Files |
|--------|---------|-------|
| b3e80882 | docs(10-02): document performance validation blockers (BUG-009, BUG-010) | BUG-REGISTRY.md, PERFORMANCE-REPORT.md, performance-validation.spec.ts |

## Files Modified

### Created
- `e2e/performance-validation.spec.ts` (295 lines)
  - Memory leak detection via CDP
  - FCP validation
  - DOM node accumulation check
  - Timer cleanup verification

- `.planning/phases/10-bug-fixes-stabilization/PERFORMANCE-REPORT.md`
  - Performance validation documentation
  - Blocker tracking
  - Test execution log
  - Recommendations for fixes

### Modified
- `.planning/phases/10-bug-fixes-stabilization/BUG-REGISTRY.md`
  - Added BUG-009: Next.js 16 build failure
  - Added BUG-010: Performance test configuration
  - Documented attempted fixes
  - Tracked resolution paths

## Lessons Learned

### What Went Well
1. **Systematic Blocker Documentation:** Both bugs comprehensively documented
2. **Test Framework Design:** Performance tests well-structured and ready
3. **CDP Integration:** Successfully integrated heap profiling capability
4. **Report Structure:** Clear documentation framework for future results

### What Could Be Improved
1. **Build Stability Verification:** Should have verified production build works before starting
2. **Test Environment Setup:** Should have configured credentials before writing tests
3. **Wait Strategy Flexibility:** Should have used element-based waits from start
4. **Dependency Checking:** Should have validated all prerequisites

### Action Items
1. **Immediate:** Prioritize BUG-009 and BUG-010 fixes
2. **Short-term:** Execute performance tests once bugs resolved
3. **Long-term:** Integrate Lighthouse CI into PR pipeline
4. **Process:** Add build verification to plan prerequisites

## Recommendations

### For Plan 10-03 (Bug Fixes)
1. **Fix BUG-009 First:** Critical blocker for all performance work
   - Try Next.js 15.x downgrade
   - Investigate middleware edge runtime
   - Contact Next.js team if needed

2. **Fix BUG-010 Second:** Enables test execution
   - Configure Supabase test credentials
   - Or implement API mocking layer
   - Or use staging environment

3. **Then Execute Tests:** Once infrastructure works
   - Run memory leak detection
   - Run Lighthouse CI
   - Document actual performance metrics

### For Production Deployment
1. **Block on BUG-009:** Cannot deploy without successful build
2. **Establish Performance Baseline:** Before optimizing
3. **Set up Monitoring:** Lighthouse CI on every PR
4. **Create Performance Budget:** Enforce via CI/CD

---

**Status:** Blocked by infrastructure issues (BUG-009, BUG-010)
**Next Action:** Prioritize bug fixes in plan 10-03
**Completion:** Framework complete, results pending bug resolution
