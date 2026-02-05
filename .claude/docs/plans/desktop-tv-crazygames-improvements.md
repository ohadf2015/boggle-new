# Feature: Desktop/TV Responsiveness & CrazyGames Improvements

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Improve the desktop mode responsiveness to eliminate unnecessary scrolling during gameplay. The game screen (especially during play) must be fully visible without scrolling, and the letter grid should be as responsive and large as possible within the available viewport. Additionally, when running in CrazyGames iframe, hide signup/login buttons since CrazyGames handles authentication separately.

## User Story

As a desktop/TV player on CrazyGames or standalone desktop browser,
I want the game screen to fit perfectly within my viewport without scrolling,
So that I can focus on gameplay without UI distractions or having to scroll to see important elements.

## Problem Statement

1. **Desktop Layout Scrolling**: On some desktop screens (especially CrazyGames minimum 821x462), the game view requires scrolling when it shouldn't
2. **Grid Not Maximized**: The letter grid doesn't always maximize to fill available vertical space efficiently
3. **CrazyGames Auth Buttons**: When embedded in CrazyGames iframe, standard login/signup buttons still appear (though they're already partially hidden)

## Solution Statement

1. Refactor the desktop game layout to use CSS viewport units (`dvh`) and flexbox/grid properly to prevent overflow
2. Optimize grid sizing calculations for CrazyGames minimum dimensions (821x462)
3. Ensure AuthButton completely hides external OAuth when `isCrazyGames` is true
4. Apply `overflow: hidden` constraints to game containers during active gameplay

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Medium
**Primary Systems Affected:**
- SinglePlayerGame.tsx (desktop layout)
- globals.css (responsive grid sizing)
- AuthButton.tsx (CrazyGames auth hiding)
- useDesktopLayout.ts (breakpoint optimization)

**Dependencies:** None (all existing libraries)

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `.claude/agents/context/prime-context.md` - COMPLETE codebase overview
  - **WHY:** Contains all project patterns, configurations, and architecture
  - **ACTION:** Read this file first to understand the codebase

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `components/singleplayer/SinglePlayerGame.tsx` (lines 1540-1695)
  - **WHY:** Contains the desktop 3-column layout that needs fixing
  - **PATTERN:** Uses CSS Grid with fixed sidebar widths

- `hooks/useDesktopLayout.ts` (lines 1-192)
  - **WHY:** Desktop detection thresholds - may need adjustment for CrazyGames
  - **PATTERN:** Returns `meetsCrazyGamesMin` boolean

- `app/globals.css` (lines 746-790, 2640-2700)
  - **WHY:** `.game-board-frame` sizing calculations and CrazyGames-specific styles
  - **PATTERN:** Uses `min()` with `dvh`, `vw`, and `vmin` units

- `components/auth/AuthButton.tsx` (lines 59-65, 600-680)
  - **WHY:** Already has `isCrazyGames` logic for hiding login
  - **PATTERN:** Uses `hideLogin` flag from `useCrazyGamesAuth`

- `app/[locale]/layout.tsx` (lines 678-738)
  - **WHY:** Root layout with `screen-fit` class on body
  - **PATTERN:** Uses flex column layout with `min-h-0`

- `tailwind.config.js` (lines 29-47)
  - **WHY:** Contains CrazyGames-specific breakpoints (`cg-mobile`, `cg-min`, `cg-tablet`)
  - **PATTERN:** Custom media query breakpoints

### Patterns to Follow

**Desktop Layout Pattern (from SinglePlayerGame.tsx):**

```tsx
// ✅ Current 3-column grid layout
<div
  className="flex w-full h-full gap-4 p-4"
  style={{
    display: 'grid',
    gridTemplateColumns: isTv ? '320px 1fr 320px' : '280px 1fr 280px',
    gridTemplateRows: '1fr', // Single row fills height
  }}
>
```

**Game Board Frame Sizing (from globals.css):**

```css
/* ✅ Current pattern uses min() with dvh */
.game-board-frame {
  width: min(80vmin, calc(100vw - 32px), calc(100dvh - 220px));
  height: min(80vmin, calc(100vw - 32px), calc(100dvh - 220px));
  max-height: calc(100dvh - 220px);
  aspect-ratio: 1 / 1;
}
```

**CrazyGames Auth Hiding Pattern (from AuthButton.tsx):**

```tsx
// ✅ Existing pattern
const hideLogin = isCrazyGames;

// In render:
{hideLogin ? (
  // CrazyGames auth UI
) : (
  // Standard OAuth buttons
)}
```

**Viewport Fit Pattern (from globals.css):**

```css
/* ✅ Screen fit utilities */
.screen-fit {
  height: 100dvh;
  overflow: hidden;
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Desktop Layout Optimization

**Tasks:**
1. Update SinglePlayerGame desktop layout to prevent overflow
2. Fix the center game area flex container to properly constrain height
3. Remove `min-h-screen` that causes overflow on smaller desktop heights

**Order:** These changes are foundational and must be done first.

### Phase 2: CrazyGames Grid Sizing

**Tasks:**
1. Add CrazyGames-specific media query for 821x462 minimum
2. Optimize `.game-board-frame` sizing for CrazyGames dimensions
3. Reduce sidebar widths on smaller desktops to maximize grid

**Order:** Depends on Phase 1 - need proper layout first.

### Phase 3: Auth Button Enhancement

**Tasks:**
1. Verify AuthButton completely hides OAuth options in CrazyGames iframe
2. Add visual indicator for CrazyGames-linked accounts
3. Clean up any residual spacing when buttons are hidden

**Order:** Independent - can be done in parallel with Phase 2.

### Phase 4: Testing & Validation

**Tasks:**
1. Test at CrazyGames minimum resolution (821x462)
2. Test at standard desktop (1024x768)
3. Test at TV resolution (1920x1080)
4. Verify no scrolling in game view at any resolution

**Order:** After all implementation is complete.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: UPDATE `components/singleplayer/SinglePlayerGame.tsx`

**Fix desktop layout overflow issues in the 3-column grid.**

- **IMPLEMENT:** Change `min-h-screen` to `h-full` in the desktop layout wrapper to prevent overflow
- **PATTERN:** Reference landscape layout which uses `h-full` without min-height
- **IMPORTS:** None needed
- **GOTCHA:** The outer `div` has both flex and grid styles - keep grid for layout
- **FILE:** SinglePlayerGame.tsx lines 1544-1545

**Current (line 1545):**
```tsx
<div className="relative flex h-full min-h-screen w-full overflow-hidden bg-neo-navy">
```

**Change to:**
```tsx
<div className="relative flex h-full w-full overflow-hidden bg-neo-navy">
```

- **VALIDATE:** `npm run build && npm run lint`

### Task 2: UPDATE `components/singleplayer/SinglePlayerGame.tsx`

**Optimize center game area to fill available height without overflow.**

- **IMPLEMENT:** Update the center column to use proper flex constraints with `min-h-0` and remove the inline `maxHeight` style that conflicts with flexbox
- **PATTERN:** Similar to mobile portrait layout
- **FILE:** SinglePlayerGame.tsx lines 1610-1680

**Current (lines 1610-1611):**
```tsx
<div className="flex flex-col items-center justify-center h-full min-w-0 gap-3">
```

**Change to:**
```tsx
<div className="flex flex-col items-center justify-center h-full min-w-0 min-h-0 gap-3">
```

**Current (lines 1654-1657):**
```tsx
<div
  className="flex-1 flex items-center justify-center w-full min-h-0"
  style={{ maxHeight: 'calc(100vh - 200px)' }}
>
```

**Change to:**
```tsx
<div className="flex-1 flex items-center justify-center w-full min-h-0 max-h-full">
```

- **VALIDATE:** `npm run build`

### Task 3: UPDATE `app/globals.css`

**Add CrazyGames-specific desktop styling for optimized grid sizing.**

- **IMPLEMENT:** Add a new media query section for CrazyGames minimum resolution (821px+) with optimized grid sizing
- **PATTERN:** Follow existing desktop media query pattern
- **FILE:** globals.css after line 2244 (after `.crazygames-embed` section)

**Add after line 2244:**
```css
/* CrazyGames desktop optimization - minimum 821x462 viewport */
/* When in CrazyGames iframe, maximize grid space with smaller sidebars */
@media (min-width: 821px) and (min-height: 462px) and (max-width: 1023px) {
  body.crazygames-embed .game-board-frame,
  .crazygames-embed .game-board-frame {
    /* Maximize grid for CrazyGames minimum dimensions */
    /* Account for reduced sidebar space: ~200px each = ~400px total */
    width: min(calc(100dvh - 100px), calc(100vw - 420px), 55vmin);
    height: min(calc(100dvh - 100px), calc(100vw - 420px), 55vmin);
    max-height: calc(100dvh - 100px);
    padding: 10px;
  }
}

/* CrazyGames larger desktop - standard 1024+ */
@media (min-width: 1024px) {
  body.crazygames-embed .game-board-frame,
  .crazygames-embed .game-board-frame {
    /* Standard desktop sizing with CrazyGames optimizations */
    width: min(calc(100dvh - 120px), calc(100vw - 560px), 58vmin);
    height: min(calc(100dvh - 120px), calc(100vw - 560px), 58vmin);
    max-height: calc(100dvh - 120px);
  }
}
```

- **VALIDATE:** `npm run build`

### Task 4: UPDATE `components/singleplayer/SinglePlayerGame.tsx`

**Reduce sidebar widths for smaller desktop screens to maximize grid.**

- **IMPLEMENT:** Add responsive sidebar widths that shrink on smaller desktops (821-1023px)
- **PATTERN:** Use `useDesktopLayout` hook's `meetsCrazyGamesMin` check
- **FILE:** SinglePlayerGame.tsx lines 1584-1590

**Current:**
```tsx
style={{
  display: 'grid',
  gridTemplateColumns: isTv ? '320px 1fr 320px' : '280px 1fr 280px',
  gridTemplateRows: '1fr',
}}
```

**Change to:**
```tsx
style={{
  display: 'grid',
  gridTemplateColumns: isTv
    ? '320px 1fr 320px'
    : layout.width < 1024
      ? '200px 1fr 200px'  // Smaller sidebars for CrazyGames minimum
      : '280px 1fr 280px',
  gridTemplateRows: '1fr',
}}
```

**Also need to destructure `layout` from useDesktopLayout. Update the hook call around line 100:**

**Current:**
```tsx
const { isDesktop, isTv } = useDesktopLayout();
```

**Change to:**
```tsx
const layout = useDesktopLayout();
const { isDesktop, isTv } = layout;
```

- **VALIDATE:** `npm run build && npm run lint`

### Task 5: UPDATE `components/singleplayer/SinglePlayerGame.tsx`

**Add game-specific overflow constraints to prevent scroll during play.**

- **IMPLEMENT:** Add `overflow-hidden` to the game layout container and ensure sidebars scroll independently
- **PATTERN:** Similar to landscape layout `landscape-full-height` class
- **FILE:** SinglePlayerGame.tsx line 1584

**Current:**
```tsx
<div
  className="flex w-full h-full gap-4 p-4"
```

**Change to:**
```tsx
<div
  className="flex w-full h-full gap-4 p-4 overflow-hidden"
```

- **VALIDATE:** `npm run build`

### Task 6: UPDATE `app/globals.css`

**Ensure game containers respect viewport height during gameplay.**

- **IMPLEMENT:** Add utility class for game view that prevents any overflow/scroll
- **FILE:** globals.css after line 2020 (after `.screen-fit` utilities)

**Add:**
```css
/* Game view container - no scroll during gameplay */
.game-view-container {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* CrazyGames game view - ensure no overflow in iframe */
body.crazygames-embed .game-view-container,
.crazygames-embed .game-view-container {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
}
```

- **VALIDATE:** `npm run build`

### Task 7: VERIFY `components/auth/AuthButton.tsx`

**Verify CrazyGames auth hiding is complete.**

- **IMPLEMENT:** Verify that both inline and dropdown variants completely hide OAuth when `isCrazyGames` is true
- **PATTERN:** Check all rendering paths
- **FILE:** AuthButton.tsx lines 600-680 and 780-820

**Verification checklist:**
1. `hideLogin` is set correctly from `isCrazyGames` (line 602)
2. Inline variant shows only CrazyGames auth when `hideLogin` is true (lines 610-651)
3. Dropdown variant shows only CrazyGames auth when `hideLogin` is true (check lines 780+)

**If any issues found, fix them. Otherwise, mark as verified.**

- **VALIDATE:** `npm run build && npm run test:frontend -- --testPathPattern=AuthButton`

### Task 8: CREATE test file `components/singleplayer/__tests__/DesktopLayoutResponsive.test.tsx`

**Add tests for desktop layout responsiveness.**

- **IMPLEMENT:** Test that desktop layout doesn't overflow at various resolutions
- **PATTERN:** Follow existing test patterns in `components/__tests__/`

```tsx
import { render, screen } from '@testing-library/react';
import { useDesktopLayout } from '@/hooks/useDesktopLayout';

// Mock useDesktopLayout
jest.mock('@/hooks/useDesktopLayout');
const mockUseDesktopLayout = useDesktopLayout as jest.MockedFunction<typeof useDesktopLayout>;

describe('Desktop Layout Responsiveness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use smaller sidebars at CrazyGames minimum resolution', () => {
    // Mock CrazyGames minimum dimensions
    mockUseDesktopLayout.mockReturnValue({
      type: 'desktop',
      isDesktop: true,
      isTv: false,
      isTablet: false,
      isMobile: false,
      isTallScreen: false,
      isWideScreen: true,
      meetsCrazyGamesMin: true,
      width: 821,
      height: 462,
      aspectRatio: 821 / 462,
    });

    // Verify sidebar width logic would use smaller sidebars
    const layout = mockUseDesktopLayout();
    expect(layout.width < 1024).toBe(true);
    expect(layout.meetsCrazyGamesMin).toBe(true);
  });

  it('should use standard sidebars at larger desktop resolution', () => {
    mockUseDesktopLayout.mockReturnValue({
      type: 'desktop',
      isDesktop: true,
      isTv: false,
      isTablet: false,
      isMobile: false,
      isTallScreen: true,
      isWideScreen: true,
      meetsCrazyGamesMin: true,
      width: 1280,
      height: 800,
      aspectRatio: 1280 / 800,
    });

    const layout = mockUseDesktopLayout();
    expect(layout.width >= 1024).toBe(true);
  });
});
```

- **VALIDATE:** `npm run test:frontend -- --testPathPattern=DesktopLayoutResponsive`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test useDesktopLayout returns correct values at CrazyGames minimum
- Test sidebar width calculation logic
- Test AuthButton hiding in CrazyGames mode

**Pattern:**
```typescript
describe('Desktop layout calculations', () => {
  it('should return meetsCrazyGamesMin: true for 821x462', () => {
    // Arrange
    Object.defineProperty(window, 'innerWidth', { value: 821 });
    Object.defineProperty(window, 'innerHeight', { value: 462 });

    // Act
    const { result } = renderHook(() => useDesktopLayout());

    // Assert
    expect(result.current.meetsCrazyGamesMin).toBe(true);
  });
});
```

### Integration Tests

**Scope and Requirements:**
- Test full game view renders without overflow at various resolutions
- Test CrazyGames mode properly hides auth buttons

### Manual Testing

**Steps:**
1. Open Chrome DevTools and set viewport to 821x462
2. Navigate to single player game
3. Start a game and verify:
   - No scrollbars appear
   - Grid is maximized and playable
   - All UI elements visible
4. Repeat at 1024x768 and 1920x1080

---

## VALIDATION COMMANDS

**Prerequisites:**

```bash
# Start LOCAL dev environment
npm run dev
```

### Level 1: Build Compilation

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build
```

**Expected:** Build succeeds with no compilation errors

### Level 2: Linting

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint
```

**Expected:** No linting errors

### Level 3: Type Checking

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npx tsc --noEmit
```

**Expected:** No type errors

### Level 4: Unit Tests

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test:frontend -- --testPathPattern="(DesktopLayout|AuthButton)" --passWithNoTests
```

**Expected:** All tests pass

### Level 5: Manual Validation

1. Open http://localhost:3000/en/singleplayer in Chrome
2. Open DevTools (F12) → Toggle device toolbar
3. Set custom resolution: 821x462
4. Navigate through: Preset Selection → Start Game
5. **Verify:** No horizontal or vertical scrollbars during gameplay
6. **Verify:** Grid fills available space maximally
7. Repeat at 1024x768 and 1920x1080

---

## ACCEPTANCE CRITERIA

- [ ] Desktop game view fits within viewport without scrolling at 821x462 minimum
- [ ] Desktop game view fits without scrolling at 1024x768 and 1920x1080
- [ ] Letter grid is maximized to fill available vertical space
- [ ] Sidebar widths adapt responsively (smaller on 821-1023px)
- [ ] CrazyGames iframe hides standard OAuth buttons completely
- [ ] All validation commands pass with zero errors
- [ ] No regressions in mobile or landscape layouts
- [ ] Unit tests cover responsive breakpoint logic

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works at all target resolutions
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Design Rationale:**

- **Why reduce sidebar widths at 821-1023px?** CrazyGames minimum is 821x462. With standard 280px sidebars (560px total), only 261px remains for the grid. Reducing to 200px sidebars (400px total) leaves 421px for the grid - much more playable.

- **Why use `dvh` instead of `vh`?** `dvh` (dynamic viewport height) accounts for mobile browser chrome (address bar) and is more reliable across devices.

- **Why add `min-h-0` to flex children?** Flexbox has an implicit `min-height: auto` that can cause overflow. Setting `min-h-0` allows children to shrink below their content size.

**Future Considerations:**

- Consider adding a "compact mode" toggle for users who prefer smaller UI
- Monitor CrazyGames analytics for common viewport sizes to further optimize
- Consider container queries (`@container`) for sidebar content once broader browser support exists

**Known Limitations:**

- Grid cannot exceed viewport height even at very wide aspect ratios (intentional - prevents distorted grid)
- Minimum playable grid size limits how small the viewport can go (approximately 300x300px for the grid)
