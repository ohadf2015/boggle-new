# Root Cause Analysis: Mobile Timer and Combo Alignment

**Date:** 2026-01-19
**Issue:** Timer and combo not centered on mobile, layout shifts between sections
**Severity:** Medium
**Status:** Fixed

## Issue Summary

**Description:**
On mobile devices, the timer and combo display are not properly aligned to center. Additionally, sections don't have dedicated space, causing layout shifting when elements appear/disappear.

**Expected Behavior:**
- Timer should be perfectly centered on mobile
- Combo should be centered above the timer
- Each section (combo row, timer row, score) should have its own reserved space
- No layout shifting when combo appears/disappears or when score updates

**Actual Behavior:**
- Timer is pushed off-center by the score display on mobile
- The stats row uses `justify-between` which spreads elements to edges
- Score takes `flex-1` which affects timer positioning

**Impact:**
- Affected users: All mobile users
- Affected features: In-game HUD layout
- Severity: Medium (visual issue affecting UX)

## Reproduction

**Can Reproduce:** Yes

**Reproduction Steps:**
1. Start a game on mobile (portrait mode)
2. Observe the timer - it's not perfectly centered
3. Get a combo - observe the combo row above
4. Notice the timer shifts slightly based on score width

**Environment:**
- Mode: LOCAL/PRODUCTION
- Device: Mobile (portrait orientation)

## Analysis

**Related Files:**
- `components/game/in-game/components/PortraitLayout.tsx` - Main layout file with the issue
- `components/game/in-game/components/ScoreDisplay.tsx` - Score component
- `components/game/ComboDisplay.tsx` - Combo component
- `components/CircularTimer.tsx` - Timer component

**Code Flow:**

Current mobile layout structure in PortraitLayout.tsx (lines 210-316):
```
Stats section (flex flex-col gap-1):
├── Combo row (h-[40px], lg:hidden, justify-center) ✓ Correct
├── Stats row (flex justify-between) ← PROBLEM
    ├── Desktop header (hidden on mobile via variant="desktop")
    ├── Timer (relative z-20 shrink-0) ← Not centered
    └── Score wrapper (flex-1 justify-start lg:hidden) ← Pushes timer off-center
```

**Issues Identified:**

1. **Line 234:** Stats row uses `justify-between` which spreads elements apart:
   ```tsx
   <div className="flex w-full items-center justify-between relative">
   ```

2. **Lines 264-277:** Score wrapper takes `flex-1` which expands and pushes timer:
   ```tsx
   <div className="flex-1 flex justify-start pl-1 md:pl-3 pointer-events-none lg:hidden">
   ```

3. **No fixed widths for sections:** Elements can grow/shrink causing shifts

## Root Cause

**Root Cause:**
The mobile stats row uses `justify-between` flexbox layout, combined with the score having `flex-1`, which prevents the timer from being truly centered. The score expands to fill available space, pushing the timer toward the left edge rather than keeping it centered.

**Why it Happened:**
- The layout was designed primarily for desktop where combo/score appear on the right side
- Mobile layout inherits the same flex structure but hides/shows different elements
- No explicit centering mechanism for mobile-specific layout

## Fix Strategy

**Recommended Fix:**
Restructure the mobile stats row to use absolute positioning for the score, allowing the timer to be truly centered regardless of score width.

**Implementation Steps:**

1. **Modify stats row for mobile centering:**
   - Use `justify-center` on mobile
   - Keep `justify-between` for desktop (lg:)

2. **Position score absolutely on mobile:**
   - Use `absolute right-0` for score on mobile
   - This removes it from flex flow, allowing timer to center

3. **Add fixed heights/min-widths to sections:**
   - Combo row: Already has `h-[40px]` ✓
   - Timer row: Add `min-h-[80px]` or similar
   - Score: Add `min-w-[50px]` (already has this)

**Files to Modify:**
- `components/game/in-game/components/PortraitLayout.tsx` - Fix layout structure

**Testing Strategy:**
- Unit tests: Verify layout structure with test IDs
- Visual testing: Check mobile portrait on various screen sizes
- Edge cases:
  - Score with 1 digit vs 4+ digits
  - Combo level 0 vs level 7+
  - With/without rank badge

**Validation:**
- Timer should be horizontally centered at all times
- Score should be positioned on the right without affecting timer
- Combo should be centered above timer
- No layout shift when combo appears/disappears

## Prevention

**How to Prevent:**
- [ ] Add visual regression tests for mobile layouts
- [ ] Document layout patterns for mobile vs desktop
- [ ] Add test for timer centering verification

## Next Steps

1. Implement fix in PortraitLayout.tsx
2. Run existing tests to ensure no regression
3. Add specific test for centering behavior
4. Visual verification on mobile devices

---

**RCA Status:** Fixed

## Implementation Summary

**Changes Made:**

1. **PortraitLayout.tsx** - Stats row restructured for mobile centering:
   - Changed `justify-between` to `justify-center lg:justify-between`
   - Added `min-h-[80px] md:min-h-[100px] lg:min-h-[120px]` for consistent section height
   - Added `data-testid="stats-row"` for testing

2. **Mobile score positioning:**
   - Changed from `flex-1 flex justify-start` to `absolute right-1 top-1/2 -translate-y-1/2`
   - Removed extra wrapper div
   - Score no longer affects timer centering

3. **Timer container:**
   - Added `data-testid="timer-container"` for testing

**Tests Added:**
- `MobileTimerCentering.test.tsx` - 15 new tests for mobile centering behavior
- Updated `InGameScreenComboLayout.test.tsx` - 4 new tests for mobile timer centering

**Validation Results:**
- ✅ ESLint: PASS
- ✅ Frontend tests: 2348 passed
- ✅ Build: PASS
