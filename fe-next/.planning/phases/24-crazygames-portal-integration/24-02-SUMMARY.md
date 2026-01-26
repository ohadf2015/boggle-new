---
phase: 24
plan: 02
subsystem: crazygames-integration
tags: [iframe, css, viewport, responsive]
dependencies:
  requires: []
  provides:
    - viewport-detection
    - css-isolation
    - iframe-compatibility
  affects: [24-03, 24-04]
tech-stack:
  added: []
  patterns:
    - css-isolation-with-all-initial
    - viewport-hook-pattern
    - dvh-fallback-pattern
key-files:
  created:
    - hooks/useCrazyGamesViewport.ts
  modified:
    - app/globals.css
    - components/CrazyGamesSDK.tsx
decisions:
  - id: css-all-initial
    what: Use 'all: initial' for CSS isolation
    why: Prevents parent frame styles from bleeding through
    date: 2026-01-26
  - id: dvh-fallback
    what: Use min-height with both 100vh and 100dvh
    why: 100vh in iframe = parent height, 100dvh = iframe height
    date: 2026-01-26
  - id: viewport-delegation
    what: Delegate viewport handling to dedicated hook
    why: Separates concerns, reusable outside provider
    date: 2026-01-26
metrics:
  duration: 5min
  completed: 2026-01-26
---

# Phase 24 Plan 02: Visual Consistency Fixes Summary

> CSS isolation and viewport handling for CrazyGames iframe embedding

## One-liner

Fixed iframe embedding visual inconsistencies with CSS isolation (all: initial), viewport hook for accurate device detection, and 100dvh fallback for proper height calculation.

## What Was Built

### 1. Viewport Handling Hook (`useCrazyGamesViewport`)
- **Purpose**: Provide accurate viewport information when running in iframe
- **Key features**:
  - Iframe detection (`window.parent !== window`)
  - Viewport size tracking using `window.innerWidth/innerHeight` (works correctly in iframes)
  - Device type classification (mobile <768px, tablet 768-1023px, desktop ≥1024px)
  - Landscape orientation detection
  - Resize event handling with 100ms debouncing
- **Exports**: `useCrazyGamesViewport()` hook, `getCrazyGamesDeviceType()` utility
- **Location**: `hooks/useCrazyGamesViewport.ts`

### 2. CSS Isolation for Iframe Embedding
- **Purpose**: Prevent parent frame styles from affecting game appearance
- **Key rules**:
  - `.crazygames-embed` class with `all: initial` reset
  - Re-application of base styles (font, color, background)
  - Viewport filling with `width: 100%`, `height: 100%`, `min-height: 100vh/100dvh`
  - Page-level scroll prevention with `overflow: hidden`
  - Box-sizing inheritance for all descendant elements
  - Landscape mode optimization for desktop (max-height: 100dvh)
- **Location**: `app/globals.css` (CrazyGames section)

### 3. Enhanced CrazyGamesProvider
- **Purpose**: Expose viewport information through context
- **Changes**:
  - Import and use `useCrazyGamesViewport` hook
  - Add `deviceType`, `isLandscape`, `viewportSize` to context type
  - Expose viewport info through context value
  - Update fallback implementation with default values
- **Location**: `components/CrazyGamesSDK.tsx`

## Technical Decisions

### Decision 1: CSS Isolation with 'all: initial'
**Context**: Parent frame styles were bleeding through, causing visual differences

**Options considered**:
1. Reset specific properties (margin, padding, etc.)
2. Use `all: initial` to reset everything
3. Add more specific CSS rules to override parent styles

**Chosen**: Option 2 - `all: initial`

**Rationale**:
- Complete isolation from parent frame styles
- Single declaration handles all potential conflicts
- Re-apply only our base styles explicitly
- Industry standard for iframe widget isolation

**Trade-offs**:
- Must re-declare all base styles (font, color, background)
- Slightly more verbose CSS
- **Winner**: Complete isolation worth the verbosity

### Decision 2: 100vh vs 100dvh Fallback Pattern
**Context**: 100vh in iframe = parent viewport height (incorrect), not iframe height

**Options considered**:
1. Use only 100vh (standard)
2. Use only 100dvh (dynamic viewport height)
3. Use both as fallback: `min-height: 100vh; min-height: 100dvh;`

**Chosen**: Option 3 - Both as fallback

**Rationale**:
- 100dvh adjusts for browser UI (address bar, tabs) on mobile
- Fallback to 100vh for browsers without dvh support
- CSS cascade ensures dvh overrides vh when supported
- Prevents scrollbar issues in mobile iframes

**Trade-offs**:
- Older browsers without dvh support get slightly incorrect height
- **Winner**: Modern mobile support critical for CrazyGames

### Decision 3: Viewport Handling Delegation
**Context**: CrazyGamesProvider was handling too many concerns

**Options considered**:
1. Calculate viewport info inline in provider
2. Create dedicated hook, import into provider
3. Use existing useDesktopLayout hook

**Chosen**: Option 2 - Dedicated hook

**Rationale**:
- Single Responsibility Principle - hook handles viewport logic
- Reusable outside provider context
- Easier to test independently
- Matches existing `useDesktopLayout` pattern
- CrazyGames-specific needs (iframe detection) justify dedicated hook

**Trade-offs**:
- Additional file to maintain
- **Winner**: Separation of concerns improves maintainability

## Deviations from Plan

None - plan executed exactly as written.

## Testing Completed

### Build Verification
- ✅ `npm run lint` passed for all modified files
- ✅ `npm run build` passed successfully
- ✅ No TypeScript errors
- ✅ Translation check passed (no missing keys)

### Manual Testing Required
The following manual verification is recommended:

1. **Visual Parity Test**:
   - Run `npm run dev`
   - Open game standalone at various sizes (375px, 768px, 1024px, 1920px)
   - Take screenshots
   - Open same game in test iframe at same sizes
   - Compare screenshots - should be identical

2. **Scroll Behavior Test**:
   - Page-level scrolling should be prevented in CrazyGames mode
   - Scrollable containers (modals, lists) should still scroll normally

3. **Landscape Mode Test**:
   - At desktop size (≥1024px) in landscape orientation
   - No horizontal scrollbars should appear
   - Content should fit within viewport

4. **RTL Layout Test**:
   - Switch language to Hebrew
   - Verify layout renders correctly in both standalone and iframe
   - Shadows should flip direction (left instead of right)

## Impact Assessment

### Files Created
- `hooks/useCrazyGamesViewport.ts` (120 lines) - Viewport detection hook

### Files Modified
- `app/globals.css` (+43 lines) - CSS isolation rules
- `components/CrazyGamesSDK.tsx` (+19 lines) - Viewport context integration

### Breaking Changes
None. All changes are additive enhancements.

### Performance Impact
- **Negligible**: Hook uses same debouncing (100ms) as existing `useDesktopLayout`
- **CSS**: Minimal overhead from additional CSS rules
- **No runtime cost**: CSS isolation is static, viewport hook is lightweight

## Next Phase Readiness

### Blockers
None.

### Recommendations for Phase 24-03 (Asset Size Optimization)
1. **Verify visual parity first**: Run manual tests before proceeding
2. **Bundle analyzer baseline**: Measure current size before optimization
3. **Test iframe loading**: Verify SDK measurement starts after `gameplayStart()`
4. **Audio lazy loading**: Ensure music doesn't load until user interaction

### Known Limitations
1. **No automated visual regression tests**: Screenshot comparison is manual
2. **Viewport hook not tested**: No unit tests for `useCrazyGamesViewport` (hook is simple)
3. **CSS isolation untested**: No tests verifying parent styles don't bleed through

## Lessons Learned

### What Went Well
1. **Clear problem definition**: CONTEXT.md requirement was specific ("look the same")
2. **Research-driven approach**: 24-RESEARCH.md identified 100vh issue upfront
3. **Separation of concerns**: Dedicated hook made provider simpler
4. **CSS isolation pattern**: `all: initial` is powerful for iframe widgets

### What Could Be Improved
1. **Visual regression testing**: Should automate screenshot comparison
2. **Hook testing**: Even simple hooks benefit from unit tests
3. **CSS testing**: Could use jest-css-modules to verify class application

### Applicable to Future Work
1. **Iframe embedding pattern**: Reuse CSS isolation for other portal integrations
2. **Viewport hook pattern**: Template for other environment-specific hooks
3. **dvh fallback pattern**: Apply to all 100vh usage in mobile-first designs

## Commands

```bash
# Verify implementation
npm run lint
npm run build

# Manual testing (recommended)
npm run dev
# Then test in browser at various viewport sizes

# Check viewport hook usage
grep -r "useCrazyGamesViewport" .
```

## Commits

| Hash | Message | Files |
|------|---------|-------|
| f6a76bf1 | feat(24-02): create viewport handling hook for CrazyGames | hooks/useCrazyGamesViewport.ts |
| da4ac802 | feat(24-02): add CSS isolation and fixes for iframe embedding | app/globals.css |
| e7ac6817 | feat(24-02): enhance CrazyGamesProvider with viewport context | components/CrazyGamesSDK.tsx |

---

**Completed**: 2026-01-26
**Duration**: 5 minutes
**Status**: ✅ All tasks complete, ready for Phase 24-03
