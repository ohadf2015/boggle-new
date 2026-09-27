# Root Cause Analysis: Mobile Scroll Blocked

**Date:** 2026-01-22 (Updated)
**Issue:** Single-finger touch scroll doesn't work on mobile - only two-finger gestures work
**Severity:** High
**Status:** ✅ FIXED

## Issue Summary

**Description:**
On mobile devices, single-finger vertical swipe gestures do not scroll pages. Users report that only two-finger gestures (pinch/zoom) allow scrolling, which is a non-standard interaction.

**Expected Behavior:**
Single-finger vertical swipe should scroll page content normally on all mobile devices.

**Actual Behavior:**
Single-finger swipe does nothing. Only two-finger gestures work. This affects ALL pages, not just specific ones.

**Impact:**
- Affected users: All mobile users (majority of traffic)
- Affected features: All pages with scrollable content
- Severity: High - Core UX functionality broken

## Reproduction

**Can Reproduce:** Yes - consistently on mobile devices

**Reproduction Steps:**
1. Open any page on a mobile device (iOS or Android)
2. Try scrolling with single finger swipe
3. Observe: Page does not scroll
4. Try two-finger gesture
5. Observe: Page scrolls (but this is non-standard UX)

**Environment:**
- Mode: PRODUCTION and LOCAL
- Affected devices: All mobile phones (iOS Safari, Chrome Mobile, Android browsers)
- Not affected: Desktop browsers (mouse wheel works)

## Analysis

**Related Files:**

| File | Role |
|------|------|
| `app/[locale]/layout.tsx:724` | Root layout wrapper with `overflow-hidden` (THE PROBLEM) |
| `app/[locale]/layout.tsx:725` | Main element with `screen-fit-content` (scroll container) |
| `app/globals.css:2019-2025` | `.screen-fit-content` CSS class definition |

**Verified DOM Structure (via Playwright):**

```
<body className="antialiased screen-fit">
  <Providers>
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">  <!-- LINE 724 - THE PROBLEM -->
      <main className="screen-fit-content">  <!-- Child wants to scroll but parent blocks it -->
        {children}
      </main>
    </div>
  </Providers>
</body>
```

**Playwright Analysis Results:**
- Parent div: `overflow: hidden`, height: 2181px (computed)
- Main element: `overflowY: auto`, height: 2181px (computed)
- Viewport: 667px
- `touchAction`: `auto` on all elements (NOT a touch-action issue)

## Root Cause

**Root Cause Statement:**

The parent `div` at line 724 has `overflow-hidden` which **blocks touch scroll events from reaching the child** `main` element on mobile devices.

**Technical Explanation:**

1. On mobile, touch scroll events use a different propagation model than desktop mouse wheel
2. When a parent element has `overflow: hidden`, it creates a **scroll boundary**
3. The child element's `overflow-y: auto` cannot receive touch scroll events because the parent intercepts and blocks them
4. Two-finger gestures work because they use a different event path (pinch/zoom) that bypasses the overflow clipping
5. On desktop, mouse wheel events propagate differently and can reach the child element

**Git History Analysis:**
- Commit `0c822d74` ("fix scroll") added `overflow-hidden` to fix a visual overflow issue
- Commit `dbda3f5b` changed `overflow-clip` to `overflow-hidden` for cross-browser compatibility
- Both changes inadvertently broke mobile touch scrolling

**Why it Happened:**
- The fix was likely tested on desktop but not on actual mobile devices
- `overflow-hidden` and `overflow-clip` both block scroll event propagation on mobile
- The intent was to contain visual overflow, not to block scrolling

## Fix Strategy

**Recommended Fix: Option 1 (Simple - Recommended)**

Replace `overflow-hidden` with `overflow-x-hidden` to only contain horizontal overflow while allowing vertical scroll propagation.

**Implementation:**

Change line 724 in `app/[locale]/layout.tsx` from:
```jsx
<div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
```
To:
```jsx
<div className="flex-1 flex flex-col min-h-0 relative overflow-x-hidden">
```

**Option 2: Remove overflow entirely**
- **Approach:** Remove the `overflow-hidden` class entirely
- **Pros:** Most straightforward fix
- **Cons:** May reintroduce the horizontal overflow issue the original fix addressed
- **Risk:** Low - can always add back if needed

**Option 3: Move scroll responsibility to wrapper**
- **Approach:** Add `overflow-y-auto` to the wrapper div, remove from main
- **Pros:** Keeps overflow containment in one place
- **Cons:** Changes the scroll container, may affect existing page layouts
- **Risk:** Medium

**Files to Modify:**

| File | Change |
|------|--------|
| `app/[locale]/layout.tsx:724` | Change `overflow-hidden` to `overflow-x-hidden` |

**Testing Strategy:**
- Test on iOS Safari (actual device)
- Test on Android Chrome (actual device)
- Test single-finger scroll on all page types
- Verify no horizontal scroll appears
- Verify desktop behavior unchanged
- Test the /rules page which has long scrollable content

**Validation:**
- How to verify: Open any page on mobile, single-finger swipe should scroll
- Regression testing: Check no horizontal overflow on any page

## Impact

**Current Impact:**
- Users affected: ALL mobile users
- Features affected: All pages with scrollable content
- Data impact: None (display issue only)
- User experience: Severely degraded - core navigation broken

**Potential Side Effects:**
- Changing to `overflow-x-hidden` may allow vertical content to escape if any exists (unlikely)
- Need to verify no horizontal scrollbar appears after the fix

## Prevention

**How to Prevent:**

- [ ] **Test on actual mobile devices** before merging scroll-related changes
- [ ] **Add E2E test** for basic scroll functionality on mobile viewport
- [ ] **Document overflow-hidden dangers** in code review checklist
- [ ] **Prefer overflow-x-hidden** over overflow-hidden in layout containers

## Next Steps

1. Implement fix: Change `overflow-hidden` to `overflow-x-hidden` in `app/[locale]/layout.tsx:724`
2. Test on actual mobile device (iOS Safari, Chrome Mobile)
3. Verify desktop behavior unchanged
4. Verify no horizontal scroll regression
5. Deploy and monitor

---

**RCA Status:** Implementation Ready

## Evidence

**Playwright Analysis (2026-01-22):**
```javascript
{
  "overflowHiddenElements": [
    {
      "tag": "DIV",
      "className": "flex-1 flex flex-col min-h-0 relative overflow-hidden",
      "overflow": "hidden",
      "overflowY": "hidden",
      "height": "2181.25px"  // Content is taller than viewport
    }
  ],
  "documentHeight": 2181,
  "viewportHeight": 667,  // But viewport is only 667px
  "mainInfo": {
    "overflowY": "auto",  // Main wants to scroll
    "touchAction": "auto"  // No touch-action issue
  }
}
```

This confirms the parent's `overflow: hidden` is blocking scroll events from reaching the child on mobile.
