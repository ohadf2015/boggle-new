# Root Cause Analysis: Mobile Scroll Blocked

**Date:** 2026-01-21
**Issue:** On some mobile devices, there is no scroll at all and part of the content is unreachable
**Severity:** High
**Status:** Analysis Complete - Ready for Implementation

## Issue Summary

**Description:**
On certain mobile devices, users cannot scroll to reach all content on the page. The content appears cut off at the bottom with no way to scroll down to see the rest.

**Expected Behavior:**
All page content should be scrollable on mobile devices, allowing users to reach every section of the page.

**Actual Behavior:**
Content is clipped at the visible viewport height. No scroll indicator appears and touch scrolling has no effect on some devices.

**Impact:**
- Affected users: Mobile users on certain browsers (likely older iOS Safari, some Android browsers)
- Affected features: All pages with content taller than viewport (settings, rules, profile, etc.)
- Severity: High - Users cannot access important features

## Reproduction

**Can Reproduce:** Partially - Device/browser dependent

**Reproduction Steps:**
1. Open the app on a mobile device (especially older iOS Safari or certain Android browsers)
2. Navigate to a page with content taller than viewport (e.g., /settings, /rules)
3. Attempt to scroll down
4. Observe that content is cut off and scrolling doesn't work

**Environment:**
- Mode: PRODUCTION
- Affected devices: Certain mobile browsers, especially those with dynamic viewport handling issues
- Not affected: Modern browsers with full `dvh` support

## Analysis

**Related Files:**

| File | Role |
|------|------|
| `app/[locale]/layout.tsx:710-730` | Root layout with scroll architecture |
| `app/globals.css:1995-2025` | `screen-fit` and `screen-fit-content` CSS classes |
| `app/[locale]/settings/page.tsx:153-159` | Example page with `min-h-screen` |
| `app/[locale]/rules/page.tsx:96` | Example page with nested `<main>` |
| `app/[locale]/__tests__/layout.overflow.test.tsx` | Test that documents intended architecture |

**Code Flow:**

```
Layout hierarchy:
<body className="screen-fit">                    <!-- min-height: 100dvh, overflow-y: auto -->
  <div className="flex-1 min-h-0 overflow-hidden">  <!-- CLIPS content! -->
    <main className="screen-fit-content">        <!-- flex: 1, overflow-y: auto -->
      {children}                                  <!-- Page content -->
    </main>
  </div>
</body>

Page content pattern (problematic):
<div className="min-h-screen">                   <!-- Forces 100vh height -->
  <main>...</main>                               <!-- NESTED main element -->
</div>
```

## Root Cause

**Root Cause Statement:**

The scroll architecture has a **height resolution conflict** between the layout's `screen-fit-content` scroll container and individual pages that use `min-h-screen`. The issue manifests on mobile browsers due to:

1. **`min-h-screen` resolves to viewport units (`100vh`/`100dvh`)** - This is computed relative to the browser viewport, NOT the scroll container
2. **The wrapper div has `overflow-hidden`** - This is intentional to make `<main>` the scroll container
3. **Pages nest their own `<main>` elements** - Creating semantic HTML conflicts
4. **Mobile browser `dvh` support varies** - Older browsers may not handle dynamic viewport height correctly

**Why it Happened:**

1. The scroll containment architecture is correct in principle (test file documents this)
2. However, pages were built without awareness of this architecture
3. Using `min-h-screen` on page content defeats the flex-based height calculation
4. The scroll container (`screen-fit-content`) cannot scroll content that declares its own viewport-relative minimum height

**Technical Explanation:**

When a page uses `min-h-screen`:
- The content declares "I must be at least 100dvh tall"
- But the scroll container is constrained by the layout hierarchy
- On browsers with full support, this mostly works because `dvh` adapts
- On browsers with incomplete support, the content is simply clipped

## Fix Strategy

**Recommended Fix: Option 1 (Systematic)**

Remove `min-h-screen` from page content and let the flex-based layout handle height. Pages should use:
- No explicit height constraints on root elements
- `pb-safe` or `pb-24 lg:pb-6` for bottom navigation spacing
- No nested `<main>` elements (the layout provides `<main>`)

**Option 2 (Quick Fix - Less Recommended):**
Add `-webkit-fill-available` as a fallback in the `screen-fit` class for Safari compatibility.

**Fix Strategy (Systematic):**

1. **Audit all pages** - Find all uses of `min-h-screen` on page root elements
2. **Remove viewport-relative heights** - Replace with flex-based layouts
3. **Remove nested `<main>` elements** - Use `<div>` or `<section>` instead
4. **Update page patterns** - Document the correct page structure

**Files to Modify:**

| File | Change |
|------|--------|
| `app/[locale]/settings/page.tsx` | Remove `min-h-screen`, use flex layout |
| `app/[locale]/rules/page.tsx` | Remove `min-h-screen`, change `<main>` to `<div>` |
| `app/[locale]/friends/page.tsx` | Remove `min-h-screen`, change `<main>` to `<div>` |
| `app/[locale]/brain/page.tsx` | Change nested `<main>` to `<div>` |
| `app/[locale]/admin/page.tsx` | Change nested `<main>` to `<div>` |
| `app/[locale]/admin/players/page.tsx` | Change nested `<main>` to `<div>` |
| `app/[locale]/admin/dictionary/page.tsx` | Change nested `<main>` to `<div>` |
| `components/landing/LandingView.tsx` | Remove `min-h-screen` |
| Many other pages | Similar changes |

**Testing Strategy:**
- Test on iOS Safari (multiple versions)
- Test on Android Chrome
- Test on Android Firefox
- Test in landscape mode
- Test with browser address bar visible/hidden
- Verify all content is reachable via scrolling

**Validation:**
- Manual testing on actual mobile devices
- Verify scroll works on pages with long content
- Verify no regressions on desktop

## Impact

**Current Impact:**
- Users affected: Mobile users on certain browsers/devices
- Features affected: Any page with content taller than viewport
- Data impact: None (display issue only)

**Potential Side Effects:**
- Removing `min-h-screen` may cause pages to appear shorter on very tall viewports
- Need to ensure backgrounds still cover full viewport
- May need to add flex-grow to content areas to fill available space

## Prevention

**How to Prevent:**

- [ ] **Document page structure requirements** in CLAUDE.md
- [ ] **Add lint rule** to warn about `min-h-screen` in page components
- [ ] **Create page template** that follows correct scroll architecture
- [ ] **Add integration test** that verifies pages are scrollable on mobile viewport sizes
- [ ] **Code review checklist** item for scroll architecture compliance

**Recommended Documentation Addition:**

```markdown
## Page Structure Requirements

Pages rendered inside the locale layout should NOT:
- Use `min-h-screen` on root elements (layout handles viewport sizing)
- Nest `<main>` elements (layout provides the `<main>`)
- Use `h-screen` or `100vh` on content containers

Pages SHOULD:
- Use flex-based layouts that grow naturally
- Add `pb-24 lg:pb-6` for bottom navigation spacing on mobile
- Use semantic `<section>` or `<div>` for content grouping
```

## Next Steps

1. Implement fix using: `/bug_fix:implement-fix rca-mobile-scroll-blocked`
2. Test on multiple mobile devices
3. Update documentation
4. Add preventive lint rules

---

**RCA Status:** Implementation Ready

## Appendix: Affected Pages Audit

Pages using `min-h-screen` on root element:
- `app/[locale]/settings/page.tsx:155`
- `app/[locale]/rules/page.tsx:96`
- `app/[locale]/friends/page.tsx:50`
- `app/[locale]/brain/drills/*/page.tsx` (multiple)
- `app/[locale]/accessibility/page.tsx:154`
- `app/[locale]/unsubscribe/page.tsx:50`
- `app/[locale]/adventure/page.tsx:10`
- `app/[locale]/contact/page.tsx:68`
- `app/[locale]/auth/callback/page.tsx:75`
- `app/[locale]/admin/*/page.tsx` (multiple)
- `app/[locale]/error.tsx:112`
- `app/[locale]/not-found.tsx:11`
- `components/landing/LandingView.tsx:213`
- `components/join/QuickJoinForm.tsx:55`
- `components/join/AutoJoiningState.tsx:26`
- `components/challenge/ChallengeView.tsx:142`
- `components/custom-puzzle/CustomPuzzleGame.tsx:193`
- `components/join-view/QuickJoinView.tsx:132`
- `components/join-view/AutoJoiningView.tsx:29`
- `components/buzz/BuzzChallengeWrapper.tsx:24`
- `components/legal/LegalPageLayout.tsx:31`
- `components/singleplayer/SinglePlayerLobby.tsx:376`

Pages with nested `<main>` elements:
- `app/[locale]/rules/page.tsx:99`
- `app/[locale]/friends/page.tsx:89`
- `app/[locale]/brain/page.tsx:170,223,283,340`
- `app/[locale]/admin/page.tsx:89`
- `app/[locale]/admin/players/page.tsx:79`
- `app/[locale]/admin/dictionary/page.tsx:79`
