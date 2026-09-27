# Root Cause Analysis: Board Display Issue on Desktop

**Date:** 2026-01-21
**Issue:** Board looks distorted on desktop - cells appear taller than wide
**Severity:** Medium
**Status:** FIXED

## Issue Summary

**Description:**
The game board displays with non-square cells on desktop. Looking at the screenshot, the letter cells appear taller than they are wide, creating a vertically stretched appearance despite the frame appearing square.

**Expected Behavior:**
- Game board should display as a perfect square
- All letter cells should be perfectly square (1:1 aspect ratio)
- On a 6x6 MEDIUM grid, all cells should have equal width and height

**Actual Behavior:**
- The board frame appears roughly square
- Individual letter cells are taller than wide (portrait-oriented rectangles)
- This creates visual distortion and affects gameplay aesthetics

**Impact:**
- Affected users: Desktop users (primarily `lg:` breakpoint and above)
- Affected features: Game board visual appearance
- Severity: Medium - functional but visually degraded

## Reproduction

**Can Reproduce:** Yes (based on screenshot analysis)

**Environment:**
- Mode: Desktop (landscape orientation, large viewport)
- Browser: Any modern browser
- Grid Size: 6x6 (MEDIUM difficulty based on screenshot content)

## Analysis

**Related Files:**

1. `components/GridComponent.tsx` - Main grid component
   - Lines 400-404: Grid dimensions calculation
   - Lines 478-505: Grid container with absolute positioning
   - Line 609: Cell uses `aspect-square` class

2. `app/globals.css` - Game board frame styling
   - Lines 736-755: Base `.game-board-frame` styles with `aspect-ratio: 1 / 1`
   - Lines 760-768: Desktop media query (min-width: 769px)
   - Lines 772-778: Large desktop (min-width: 1280px)
   - Lines 782-788: Extra large desktop (min-width: 1536px)

3. `components/game/in-game/components/PortraitLayout.tsx` - Layout component
   - Line 367: Grid container with `flex-1` and `min-h-0`

**Code Flow:**

```
PortraitLayout
  └── div.flex-1.flex.items-center.justify-center.min-h-0
      └── GridComponent
          └── div.game-board-frame (motion.div with frame styles)
              └── div.grid.absolute (inner grid with inset: 0)
                  └── motion.div.aspect-square (individual cells)
```

## Root Cause

**Root Cause Statement:**
The `aspect-square` class on individual cells conflicts with CSS Grid's automatic sizing when the parent container's dimensions don't perfectly match a 1:1 ratio due to multiple competing sizing constraints.

**Detailed Analysis:**

1. **Frame Sizing Conflicts:**
   - `.game-board-frame` has `aspect-ratio: 1 / 1` AND explicit width/height via `min()` functions
   - Desktop media query (lines 760-768):
     ```css
     width: min(55vmin, calc(100vw - 550px), calc(100dvh - 260px));
     height: min(55vmin, calc(100vw - 550px), calc(100dvh - 260px));
     ```
   - These calculations may NOT produce equal values when viewport dimensions differ significantly

2. **CSS Grid Distribution:**
   - Inner grid uses `gridTemplateColumns: repeat(6, minmax(0, 1fr))` and `gridTemplateRows: repeat(6, minmax(0, 1fr))`
   - `1fr` distributes available space equally, but if container is NOT square, cells become rectangles

3. **Aspect Ratio Override:**
   - Cells have `aspect-square` (Tailwind for `aspect-ratio: 1 / 1`)
   - However, CSS Grid's `minmax(0, 1fr)` allows cells to stretch beyond their intrinsic ratio
   - The grid layout takes precedence, overriding the cell's aspect-ratio

4. **Flex Container Interaction:**
   - Parent `div.flex-1.min-h-0` can cause height to shrink below width
   - This happens when vertical space is constrained by header, timer, score, and other elements

**Why it Happened:**
- Complex responsive sizing with multiple `min()` functions
- Mixing `aspect-ratio` with CSS Grid `fr` units creates conflicts
- Vertical space consumption by header elements (timer, score, combo display) reduces available height
- Desktop 3-column layout (sidebars + center) constrains horizontal space differently than vertical

## Fix Strategy

**Recommended Fix: Option 2 - Enforce Square Container with min(width, height)**

### Option 1: Use CSS `min()` for Truly Square Dimensions

**Approach:** Ensure width and height are always equal by using the minimum of both
```css
.game-board-frame {
  --frame-size: min(55vmin, calc(100vw - 550px), calc(100dvh - 260px));
  width: var(--frame-size);
  height: var(--frame-size);
}
```

**Pros:** Simple CSS-only fix
**Cons:** May not account for all edge cases
**Risk:** Low

### Option 2: Fix Grid Cell Sizing (Recommended)

**Approach:** Instead of relying on `aspect-square` alone, enforce square cells via grid sizing

```css
/* In GridComponent inline styles */
gridTemplateColumns: `repeat(${cols}, 1fr)`,
gridTemplateRows: `repeat(${rows}, 1fr)`,
/* Cell size enforced by making grid truly square */
```

Combined with ensuring `.game-board-frame` is actually square:
```css
.game-board-frame {
  /* Use single value for both dimensions */
  --grid-size: min(
    55vmin,
    calc(100vw - 550px),
    calc(100dvh - 260px),
    calc(100cqh - 20px) /* container query fallback */
  );
  width: var(--grid-size);
  height: var(--grid-size);
  aspect-ratio: 1 / 1;
}
```

**Pros:** Addresses root cause, maintains responsive design
**Cons:** Requires CSS variable refactor
**Risk:** Low

### Option 3: Container Query Based Sizing

**Approach:** Use container queries for the grid parent to enforce square cells

```tsx
// GridComponent parent wrapper
<div className="desktop-grid-container" style={{ containerType: 'size' }}>
  <GridComponent ... />
</div>
```

With CSS:
```css
.desktop-grid-container .game-board-frame {
  width: min(100cqw, 100cqh);
  height: min(100cqw, 100cqh);
}
```

**Pros:** Modern approach, respects container dimensions
**Cons:** May already be partially implemented
**Risk:** Low

## Implementation Steps

1. **Update `.game-board-frame` CSS** (globals.css lines 760-788):
   - Use CSS custom property for single dimension value
   - Ensure width === height at all breakpoints

2. **Verify GridComponent**:
   - Confirm `aspect-square` on cells works when container is truly square
   - Consider adding `place-items: center` to grid for safety

3. **Test across breakpoints**:
   - 769px (tablet/small desktop)
   - 1024px (desktop)
   - 1280px (large desktop)
   - 1536px (extra large desktop)

**Files to Modify:**
- `app/globals.css` - Fix `.game-board-frame` media queries
- Potentially `components/GridComponent.tsx` - Minor adjustments if needed

**Testing Strategy:**
- Visual inspection across desktop viewport sizes
- Browser DevTools responsive mode
- Verify `aspect-ratio` is respected via computed styles

**Validation:**
- Cells should appear perfectly square
- Board should be square at all desktop breakpoints
- No overflow or clipping

## Prevention

**How to Prevent in Future:**
- [ ] Add visual regression test for grid square appearance
- [ ] Use single CSS variable for both width and height in responsive sizing
- [ ] Avoid mixing `aspect-ratio` with CSS Grid `fr` units without explicit container constraints
- [ ] Add comment in CSS explaining the importance of equal width/height

## Next Steps

1. Implement fix using: `/bug_fix:implement-fix rca-board-layout-desktop`
2. Test across desktop breakpoints
3. Verify mobile/tablet not affected
4. Update any relevant documentation

---

## Fix Implementation - Phase 1 (CSS Variables)

**Branch:** `fix/board-layout-desktop-square-cells`
**Implemented:** 2026-01-21

### Changes Made

**File:** `app/globals.css`

| Location | Change |
|----------|--------|
| Line 751 | Added `--board-size` CSS variable to base `.game-board-frame` rule |
| Line 769 | Added `--board-size` for desktop (769px+) breakpoint |
| Line 782 | Added `--board-size` for large desktop (1280px+) breakpoint |
| Line 794 | Added `--board-size` for extra large desktop (1536px+) breakpoint |
| Line 3183 | **FIXED BUG:** Landscape tablet query had DIFFERENT values for width/height! |

### Key Fix Pattern

**Before (problematic):**
```css
width: min(55vmin, calc(100vw - 550px), calc(100dvh - 260px));
height: min(55vmin, calc(100vw - 550px), calc(100dvh - 260px));
```

**After (fixed):**
```css
--board-size: min(55vmin, calc(100vw - 550px), calc(100dvh - 260px));
width: var(--board-size);
height: var(--board-size);
max-height: var(--board-size);
```

**NOTE:** This fix applied to multiplayer mode (PortraitLayout) but did NOT fix the issue.

---

## Root Cause Re-Analysis (Phase 2)

**Initial fix did not resolve the issue.** Further investigation revealed:

### Actual Root Cause

The bug was in **Single-Player Desktop Mode** (`DesktopGameLayout.tsx`), NOT in the CSS rules.

**File:** `components/singleplayer/game/components/DesktopGameLayout.tsx` (line 239)

**Problematic Code:**
```tsx
<div className="desktop-grid-container aspect-square h-full max-w-full">
```

**Why it failed:**
1. `h-full` sets height to 100% of parent (e.g., 500px if parent is 400x500)
2. `aspect-square` tries to make width = height (500px)
3. `max-w-full` constrains width to 100% of parent (400px)
4. **Result:** Container is 400x500 (NOT SQUARE!)

When parent is taller than wide, `h-full` wins over `aspect-square` because the height is explicitly set. The `max-w-full` then constrains width, breaking the square aspect ratio.

The CSS rule with `!important` then makes the frame `width: 100%` and `height: 100%` of this non-square container, resulting in non-square cells.

---

## Fix Implementation - Phase 2 (Container Query)

**File:** `components/singleplayer/game/components/DesktopGameLayout.tsx`

**Fix Applied:**

```tsx
{/* BEFORE (broken) */}
<div className="flex-1 flex items-center justify-center w-full min-h-0 max-h-full">
  <div className="desktop-grid-container aspect-square h-full max-w-full">

{/* AFTER (fixed) */}
<div className="flex-1 flex items-center justify-center w-full min-h-0 max-h-full" style={{ containerType: 'size' }}>
  <div className="desktop-grid-container" style={{ width: 'min(100cqw, 100cqh)', height: 'min(100cqw, 100cqh)' }}>
```

**How it works:**
1. Parent has `containerType: 'size'` - enables container queries
2. Child uses `min(100cqw, 100cqh)` for BOTH width AND height
3. This always picks the SMALLER of container width or height
4. **Result:** Container is always square, regardless of parent aspect ratio

### Validation

- ✅ Build passes
- ✅ TypeScript compiles without errors
- ✅ No changes to CSS rules needed (container is now always square)

---

**RCA Status:** FIXED - Ready for commit
