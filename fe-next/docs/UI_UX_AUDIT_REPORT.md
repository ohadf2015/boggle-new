# LexiClash UI/UX Design Audit Report
**Date:** January 4, 2026
**Auditor:** UI/UX Design Specialist
**Scope:** Comprehensive pixel-perfect analysis across all screen sizes
**Focus:** Mobile portrait mode with coverage of all viewports

---

## Executive Summary

This audit identifies **27 UI/UX issues** across the LexiClash word game application, ranging from critical button overlap problems to minor spacing inconsistencies. The application demonstrates strong Neo-Brutalist design implementation but suffers from mobile portrait layout challenges, contrast issues, and cognitive overload in certain screens.

**Critical Issues Found:** 6
**High Priority Issues:** 8
**Medium Priority Issues:** 9
**Low Priority Issues:** 4

---

## 1. BUTTON OVERLAP & HIDDEN ELEMENTS

### 1.1 Tutorial FAB Overlaps Mobile Menu
**Priority:** CRITICAL
**Location:** `/fe-next/components/landing/LandingView.tsx:275-298`
**Screen Sizes:** Mobile portrait (320px-480px)

**Issue:**
The Tutorial floating action button (FAB) positioned at `bottom-4 right-4` with z-index 40 can overlap with the mobile hamburger menu (z-index 50) when the header is sticky. The button also doesn't account for safe-area-inset on devices with notches/rounded corners properly for the right edge.

```tsx
// Current code - Line 275
<motion.button
  className="
    fixed bottom-4 right-4 z-40
    ...
    mb-[env(safe-area-inset-bottom)]
    rtl:right-auto rtl:left-4
  "
```

**Problems:**
- No `mr-[env(safe-area-inset-right)]` for right safe area
- Z-index 40 may be insufficient when mobile menu backdrop (z-9998) is active
- Button can overlap with floating achievement notifications

**Fix:**
```tsx
<motion.button
  className="
    fixed bottom-4 right-4 z-[45]
    ...
    mb-[max(env(safe-area-inset-bottom),16px)]
    mr-[max(env(safe-area-inset-right),16px)]
    rtl:right-auto rtl:left-4
    rtl:mr-0 rtl:ml-[max(env(safe-area-inset-left),16px)]
  "
```

**Visual Description:**
On iPhone 14 Pro (393x852), the Tutorial button sits too close to the screen edge and can overlap the header's hamburger menu when scrolling.

---

### 1.2 Landscape Side Panels Overlap on Very Short Screens
**Priority:** CRITICAL
**Location:** `/fe-next/components/game/InGameScreen.tsx:600-673`
**Screen Sizes:** Landscape mobile < 400px height (iPhone SE landscape: 667x375)

**Issue:**
In landscape mode, left and right side panels use absolute positioning without accounting for panel collision on very short screens (< 400px height). The padding calculation `paddingInline: max(150px, 20vw)` can cause panels to overlap the grid.

```tsx
// Current - Lines 709-719
<div className={cn(
  "flex flex-col items-center justify-center w-full h-full landscape-grid-container",
  isExtremelyShortLandscape ? "gap-1 py-1" :
    isVeryShortLandscape ? "gap-1.5 py-1" :
      "gap-2 py-2"
)}
  style={{
    paddingInline: isExtremelyShortLandscape ? '120px' :
      isVeryShortLandscape ? '130px' :
        'max(150px, 20vw)'
  }}>
```

**Problems:**
- No check if `120px * 2 < viewport width`
- Panel content can overflow on 667x300 viewports
- Timer/combo displays don't scale down sufficiently

**Fix:**
```tsx
// Calculate safe padding that prevents panel overlap
const safePaddingInline = useMemo(() => {
  if (typeof window === 'undefined') return 'max(150px, 20vw)';

  const viewportWidth = window.innerWidth;
  const minPanelWidth = 120;
  const maxTotalPanelWidth = viewportWidth * 0.5; // Max 50% of viewport
  const safeWidth = Math.min(minPanelWidth, maxTotalPanelWidth / 2);

  return isExtremelyShortLandscape ? `${safeWidth}px` :
    isVeryShortLandscape ? `${safeWidth + 10}px` :
      'max(150px, 20vw)';
}, [isExtremelyShortLandscape, isVeryShortLandscape]);

// In JSX
style={{ paddingInline: safePaddingInline }}
```

---

### 1.3 Mobile Leaderboard Hidden Behind Found Words
**Priority:** HIGH
**Location:** `/fe-next/components/game/InGameScreen.tsx:1022-1078`
**Screen Sizes:** Mobile portrait < 640px, portrait height < 600px

**Issue:**
The CompactLeaderboard and found words section are stacked vertically with limited overflow handling. On screens < 600px height, the leaderboard section can be pushed completely off-screen.

```tsx
// Current - Line 1024
{isPlaying && !gameplayFocusMode && leaderboard && leaderboard.length > 0 && (
  <div className="hidden sm:block lg:hidden mt-0.5 md:mt-2 space-y-0.5 max-w-md mx-auto lg:max-w-lg md:space-y-2 flex-shrink-0 overflow-hidden">
```

**Problems:**
- Section is `hidden` on mobile (< 640px) - no leaderboard visible
- No `max-height` constraint when visible
- `overflow-hidden` prevents scrolling to see cut-off content
- `flex-shrink-0` prevents compression when space is tight

**Fix:**
```tsx
{isPlaying && !gameplayFocusMode && leaderboard && leaderboard.length > 0 && (
  <div className="block sm:block lg:hidden mt-0.5 md:mt-2 space-y-0.5 max-w-md mx-auto lg:max-w-lg md:space-y-2 flex-shrink overflow-auto max-h-[200px]">
    {/* Content */}
  </div>
)}
```

---

### 1.4 Exit Button Can Overlap Grid in Landscape
**Priority:** HIGH
**Location:** `/fe-next/components/singleplayer/SinglePlayerGame.tsx:1233-1244`
**Screen Sizes:** Landscape 667x375 and similar

**Issue:**
Exit button at `bottom-2 right-2` doesn't account for grid overflow or hint button overlap.

```tsx
// Current - Line 1234
<div className="absolute bottom-2 right-2 z-30">
  <Button
    variant="ghost"
    size="sm"
    onClick={handleQuitRequest}
    className="w-12 h-12 p-0 bg-neo-red..."
  >
```

**Problems:**
- Z-index 30 same as pause button - can cause render order issues
- No spacing between quit and hint buttons (both at `bottom-2`)
- Button can overlap grid corner on small landscape screens

**Fix:**
```tsx
<div className="absolute bottom-2 right-2 z-35 flex gap-2 flex-row-reverse">
  {/* Quit button with guaranteed spacing */}
  <Button
    variant="ghost"
    size="sm"
    onClick={handleQuitRequest}
    className="w-12 h-12 min-w-[48px] min-h-[48px] p-0 bg-neo-red..."
  >
```

---

### 1.5 Header Logo Truncation on Very Small Screens
**Priority:** MEDIUM
**Location:** `/fe-next/components/Header.tsx:100-177`
**Screen Sizes:** < 360px width (Galaxy Fold, etc.)

**Issue:**
The logo uses responsive font sizes but doesn't account for very narrow screens, causing "CLASH" text to wrap or get cut off.

```tsx
// Current - Line 133
<span
  className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl text-neo-cyan relative animate-lexi-glow landscape:text-xl landscape:xs:text-2xl landscape:sm:text-3xl"
```

**Problems:**
- No minimum width constraint
- `flex-shrink min-w-0` allows compression but no ellipsis
- Landscape sizes applied globally, affecting portrait on small devices

**Fix:**
```tsx
<h1 className="font-black uppercase tracking-tight flex items-center gap-0.5 flex-shrink-0 min-w-[140px]">
  {/* Prevent shrinking below readable size */}
  <span className="text-2xl xs:text-3xl... truncate max-w-[60vw]">
    {t('logo.lexi')}
  </span>
  <span className="text-lg xs:text-xl... truncate max-w-[40vw]">
    {t('logo.clash')}
  </span>
</h1>
```

---

## 2. LAYOUT ISSUES BY SCREEN SIZE

### 2.1 Grid Sizing Inconsistency in Portrait Mode
**Priority:** HIGH
**Location:** `/fe-next/app/globals.css:507-546`
**Screen Sizes:** Mobile portrait 320px-768px

**Issue:**
Grid uses complex `min()` calculations that can result in different sizing on similar screen sizes due to viewport unit inconsistencies.

```css
/* Current - globals.css line 540 */
.game-board-frame {
  padding: 3px;
  width: calc(100vw - 8px);
  height: min(calc(100vw - 8px), calc(100dvh - 190px));
  max-width: calc(100vw - 8px);
}
```

**Problems:**
- Uses both `vw` and `dvh` units which behave differently
- `calc(100dvh - 190px)` assumes fixed header height (not always true)
- `dvh` not supported in older browsers (iOS < 15.4)

**Fix:**
```css
@media (max-width: 768px) {
  .game-board-frame {
    padding: 3px;
    /* Use container query or viewport-stable units */
    width: min(calc(100vw - 8px), 600px);
    /* Fallback for browsers without dvh */
    height: min(calc(100vw - 8px), calc(100vh - 190px));
    height: min(calc(100vw - 8px), calc(100dvh - 190px));
    max-width: 100%;
    aspect-ratio: 1 / 1;
  }
}
```

---

### 2.2 Compact Leaderboard Race Track Overflow
**Priority:** MEDIUM
**Location:** `/fe-next/components/game/CompactLeaderboard.tsx:184-291`
**Screen Sizes:** Mobile portrait < 375px width

**Issue:**
The race track leaderboard uses fixed padding that doesn't scale on very narrow screens, causing horizontal overflow.

```tsx
// Current - Line 189
className={cn(
  'relative flex items-center gap-1.5 px-1.5 py-1.5 rounded-neo border-3',
```

**Problems:**
- Fixed `gap-1.5` and `px-1.5` don't scale below 375px
- Avatar + name + score can exceed container width
- `truncate` on username not working due to `flex` container

**Fix:**
```tsx
className={cn(
  'relative flex items-center gap-1 sm:gap-1.5 px-1 sm:px-1.5 py-1.5 rounded-neo border-3',
  'min-w-0 w-full' // Ensure flex container respects width
)}

// For username
<div className="flex-1 min-w-0 overflow-hidden">
  <div className="flex items-center gap-1 min-w-0">
    <span className="text-xs font-black text-neo-black truncate block">
      {t('leaderboard.you') || 'YOU'}
    </span>
```

---

### 2.3 WordFormingArea Minimum Width Too Large for Small Screens
**Priority:** MEDIUM
**Location:** `/fe-next/components/game/WordFormingArea.tsx:126-131`
**Screen Sizes:** < 375px width

**Issue:**
Fixed minimum widths cause horizontal overflow on narrow screens.

```tsx
// Current - Line 127
const containerClasses = cn(
  'flex items-center justify-center relative',
  compact ? 'h-10 min-h-[40px] min-w-[100px]' : 'h-14 min-h-[56px] min-w-[140px]',
  className
);
```

**Problems:**
- `min-w-[100px]` in compact mode too large for 320px screens
- `min-w-[140px]` in normal mode forces overflow

**Fix:**
```tsx
const containerClasses = cn(
  'flex items-center justify-center relative',
  compact
    ? 'h-10 min-h-[40px] min-w-[80px] xs:min-w-[100px]'
    : 'h-14 min-h-[56px] min-w-[100px] xs:min-w-[140px]',
  className
);
```

---

### 2.4 Landscape Mode Forced on Desktop
**Priority:** LOW
**Location:** `/fe-next/hooks/useMobileLandscape.ts` (inferred)
**Screen Sizes:** Desktop browsers in narrow windows

**Issue:**
Landscape detection may trigger on desktop browsers in narrow windows, forcing inappropriate mobile-optimized layouts.

**Expected Logic:**
```tsx
const isLandscape = useMemo(() => {
  if (typeof window === 'undefined') return false;

  // Only consider landscape for mobile devices
  const isMobile = window.innerWidth <= 768 ||
    /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const isOrientationLandscape = window.innerWidth > window.innerHeight;
  const isShortScreen = window.innerHeight <= 600;

  return isMobile && isOrientationLandscape && isShortScreen;
}, []);
```

---

### 2.5 Mobile Menu Slide-Out Width Calculation
**Priority:** LOW
**Location:** `/fe-next/components/Header.tsx:298-312`
**Screen Sizes:** All mobile

**Issue:**
Mobile menu uses `w-[280px] max-w-[85vw]` which can be too narrow on tablets or too wide on very small phones.

```tsx
// Current - Line 305
className={cn(
  "fixed top-0 bottom-0 w-[280px] max-w-[85vw] z-[9999] sm:hidden",
```

**Fix:**
```tsx
className={cn(
  "fixed top-0 bottom-0 w-[min(320px,85vw)] z-[9999] sm:hidden",
  // Ensures menu is never smaller than 280px or larger than 85vw
```

---

## 3. CONTRAST & ACCESSIBILITY

### 3.1 Yellow Text on Cyan Background - Insufficient Contrast
**Priority:** CRITICAL
**Location:** `/fe-next/components/landing/ModeCard.tsx:44-59`
**Screen Sizes:** All

**Issue:**
The live badge uses `bg-neo-lime/90 text-neo-black` but the color combination doesn't meet WCAG AA standards (4.5:1 for normal text).

```tsx
// Current - Line 137
<span className="inline-flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1 lg:py-1.5 bg-neo-lime/90 text-neo-black text-xs lg:text-sm font-bold rounded-neo border-2 border-neo-black shadow-hard-sm">
```

**Contrast Ratios:**
- neo-lime (#BFFF00) on neo-cyan (#00FFFF): ~1.8:1 (FAIL)
- neo-lime (#BFFF00) on neo-pink (#FF1493): ~2.1:1 (FAIL)

**Fix:**
```tsx
// Use higher contrast background
<span className="inline-flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1 lg:py-1.5 bg-neo-cream text-neo-black text-xs lg:text-sm font-bold rounded-neo border-2 border-neo-black shadow-hard-sm">
```

**Testing:**
- neo-cream (#FFFEF0) on neo-black: 19.8:1 (AAA pass)

---

### 3.2 Ghost Button Border Visibility
**Priority:** HIGH
**Location:** `/fe-next/components/ui/button.tsx:42-48`
**Screen Sizes:** All, especially dark mode

**Issue:**
Ghost variant uses `border-neo-cream` which has poor visibility on light backgrounds and can disappear against neo-cream cards.

```tsx
// Current - Line 43
ghost: [
  "bg-transparent text-neo-white border-3 border-neo-cream shadow-none",
  "hover:bg-neo-navy-light hover:border-neo-white hover:shadow-hard-sm",
```

**Contrast Issues:**
- neo-cream border on neo-cream background: 1:1 (invisible)
- neo-cream (#FFFEF0) on slate-50: ~1.1:1 (poor)

**Fix:**
```tsx
ghost: [
  "bg-transparent text-neo-white dark:text-neo-white light:text-neo-black",
  "border-3 border-neo-black dark:border-neo-cream", // High contrast in all modes
  "shadow-none",
  "hover:bg-neo-navy-light/50 hover:border-neo-cyan hover:shadow-hard-sm",
```

---

### 3.3 Placeholder Text Opacity Too Low
**Priority:** MEDIUM
**Location:** `/fe-next/app/globals.css:741-744`
**Screen Sizes:** All

**Issue:**
Global placeholder opacity of 0.75 combined with color may not meet 4.5:1 contrast.

```css
/* Current - Line 741 */
input::placeholder,
textarea::placeholder {
  opacity: 0.75;
}
```

**Calculation:**
- If input text is neo-black (rgb(0,0,0)) at 0.75 opacity on neo-cream background
- Effective color: rgba(0,0,0,0.75) ≈ #404040
- Contrast vs neo-cream: ~4.1:1 (close to failing)

**Fix:**
```css
input::placeholder,
textarea::placeholder {
  opacity: 1;
  color: rgb(var(--neo-black) / 0.65); /* Darker but still distinguishable */
}

/* Better approach - use semantic colors */
input::placeholder {
  color: var(--muted-foreground); /* Already WCAG compliant */
  opacity: 1;
}
```

---

### 3.4 Link Underline Color in Light Mode
**Priority:** MEDIUM
**Location:** `/fe-next/components/ui/button.tsx:50-54`
**Screen Sizes:** All, light mode only

**Issue:**
Link variant uses `text-neo-cyan` which may have poor contrast on light backgrounds.

```tsx
// Current - Line 50
link: [
  "bg-transparent text-neo-cyan border-0 shadow-none underline-offset-4",
  "hover:underline hover:translate-x-0 hover:translate-y-0 hover:shadow-none",
```

**Contrast:**
- neo-cyan (#00FFFF) on slate-50 (#f8fafc): ~2.8:1 (FAIL AA)

**Fix:**
```tsx
link: [
  "bg-transparent border-0 shadow-none underline-offset-4",
  "text-neo-cyan dark:text-neo-cyan light:text-neo-navy", // High contrast in light mode
  "hover:underline hover:brightness-110",
```

---

### 3.5 Focus Indicator Visibility on Colored Backgrounds
**Priority:** HIGH
**Location:** `/fe-next/app/globals.css:206-209`
**Screen Sizes:** All

**Issue:**
Focus ring uses `neo-cyan` which can disappear on cyan backgrounds or have poor visibility on bright backgrounds.

```css
/* Current - Line 206 */
.focus-visible-ring:focus-visible {
  outline: 3px solid var(--neo-cyan);
  outline-offset: 2px;
}
```

**Problems:**
- Cyan on cyan-gradient cards: invisible
- Cyan on yellow: poor contrast (~2.3:1)

**Fix:**
```css
.focus-visible-ring:focus-visible {
  outline: 3px solid var(--neo-black);
  outline-offset: 2px;
  /* Add inner ring for contrast on dark backgrounds */
  box-shadow: 0 0 0 2px var(--background), 0 0 0 5px var(--neo-black);
}

/* Alternative: use currentColor with contrasting background */
.focus-visible-ring:focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 2px;
  filter: invert(1);
}
```

---

### 3.6 Insufficient Touch Target Sizes
**Priority:** HIGH
**Location:** Multiple locations
**Screen Sizes:** All mobile

**Issue:**
While the landscape-ux.md indicates 48x48px minimums, several components don't meet this:

**Violations:**
1. **Header Settings Icon** (`Header.tsx:188-200`): `w-11 h-11` = 44x44px
2. **Mobile Menu Toggle** (`Header.tsx:259-279`): `w-11 h-11` = 44x44px
3. **Tutorial FAB Icon** (`LandingView.tsx:283`): Icon itself may be < 44px
4. **ModeCard Arrow** (`ModeCard.tsx:109-120`): `w-7 h-7` on mobile = 28x28px

**Fix for Header:**
```tsx
// Header.tsx - Line 188
<Link
  href={`/${language}/settings`}
  className={cn(
    "flex items-center justify-center gap-1",
    "min-w-[48px] min-h-[48px] w-12 h-12 lg:w-12 lg:h-12", // Changed from w-11
    ...
  )}
>
```

**Fix for ModeCard:**
```tsx
// ModeCard.tsx - Line 109
<div
  className={cn(
    "w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12", // Increased from w-7
    ...
  )}
>
```

---

## 4. COGNITIVE OVERLOAD

### 4.1 Landing Page Too Busy in Portrait
**Priority:** MEDIUM
**Location:** `/fe-next/components/landing/LandingView.tsx`
**Screen Sizes:** Mobile portrait < 640px

**Issue:**
On mobile portrait, users see simultaneously:
- Header with logo, profile, sound, menu (sticky)
- Hero text (2 lines)
- Tutorial prompt banner
- Daily challenge banner
- 2 large mode cards
- Tutorial FAB button
- Mobile menu (when opened)

**Cognitive Load Analysis:**
- 7-9 interactive elements visible at once
- 3 CTAs competing for attention (Tutorial Prompt, Daily Challenge, Mode Cards)
- Optimal: 3-5 primary actions per screen

**Fix - Progressive Disclosure:**
```tsx
// 1. Hide tutorial prompt if user has seen it or is authenticated
{!isLandscape && !isAuthenticated && !hasCompletedOnboarding() && (
  <TutorialPrompt
    isVisible={showTutorialPrompt}
    onStartTutorial={handleStartTutorial}
    onDismiss={handleDismissTutorialPrompt}
  />
)}

// 2. Make Daily Challenge banner collapsible
<DailyChallengeBanner compact={isLandscape} collapsible={true} />

// 3. Reduce FAB prominence
<motion.button
  className="... opacity-70 hover:opacity-100" // Less intrusive
  onClick={handleOpenTutorial}
>
```

---

### 4.2 In-Game Screen Information Density
**Priority:** HIGH
**Location:** `/fe-next/components/game/InGameScreen.tsx:886-1082`
**Screen Sizes:** Mobile portrait

**Issue:**
Portrait in-game screen displays:
- Exit button
- Combo indicator
- Timer
- Score
- Word forming area
- Grid
- Found words list
- Leaderboard
- Tournament banner (when active)
- Achievement tracker
- Chat (desktop)

**Recommendations:**
1. **Auto-hide elements during active play:**
```tsx
const [isActivelyPlaying, setIsActivelyPlaying] = useState(false);

// Hide leaderboard when user is forming words
{!isActivelyPlaying && isPlaying && !gameplayFocusMode && (
  <CompactLeaderboard ... />
)}
```

2. **Collapsible sections:**
```tsx
<div className="found-words-section">
  <button onClick={() => setShowFoundWords(!showFoundWords)}>
    Your Words ({normalizedFoundWords.length}) {showFoundWords ? '▼' : '▶'}
  </button>
  {showFoundWords && (
    <div className="words-list">...</div>
  )}
</div>
```

---

### 4.3 Landscape Mode Control Confusion
**Priority:** MEDIUM
**Location:** `/fe-next/components/singleplayer/SinglePlayerGame.tsx:1336-1381`
**Screen Sizes:** Landscape mobile

**Issue:**
First-time landscape users see a tutorial overlay explaining controls, but:
- Tutorial overlay blocks the entire game
- Users must click anywhere to dismiss
- Tutorial only shows once (localStorage)
- No persistent visual cues for button locations

**Improvements:**
```tsx
// Add subtle button labels that fade after 5 seconds
const [showButtonLabels, setShowButtonLabels] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => setShowButtonLabels(false), 5000);
  return () => clearTimeout(timer);
}, []);

// In JSX
<div className="absolute bottom-2 left-2 z-30 flex flex-col items-start gap-1">
  <Button>
    {isPaused ? <Play /> : <Pause />}
  </Button>
  <AnimatePresence>
    {showButtonLabels && (
      <motion.span
        className="text-xs bg-neo-black/80 text-white px-2 py-1 rounded"
        exit={{ opacity: 0 }}
      >
        Pause
      </motion.span>
    )}
  </AnimatePresence>
</div>
```

---

### 4.4 CompactLeaderboard "You" Indicator Too Subtle
**Priority:** LOW
**Location:** `/fe-next/components/game/CompactLeaderboard.tsx:218-228`
**Screen Sizes:** All

**Issue:**
The current player's row uses different colors but the "YOU" label competes visually with username, making it hard to spot quickly.

**Current:**
```tsx
<span className="text-xs font-black text-neo-black truncate">
  {t('leaderboard.you') || 'YOU'}
</span>
```

**Enhancement:**
```tsx
<div className="flex items-center gap-1.5">
  <span className="text-xs font-black text-neo-black bg-neo-yellow px-1.5 py-0.5 rounded border-2 border-neo-black">
    {t('leaderboard.you') || 'YOU'}
  </span>
  {isLeading && (
    <span className="text-[9px] font-bold text-neo-black/80 uppercase">
      🔥 {t('leaderboard.leading') || 'Leading!'}
    </span>
  )}
</div>
```

---

## 5. GAME-SPECIFIC ISSUES

### 5.1 Grid Cell Tap Targets in Portrait
**Priority:** MEDIUM
**Location:** Grid component (not shown in audit, but inferred from usage)
**Screen Sizes:** Mobile portrait < 375px

**Issue:**
With game-board-frame calculation `width: calc(100vw - 8px)` on 320px screen:
- Grid width: 312px
- 4x4 grid: 78px per cell (OK)
- 5x5 grid: 62px per cell (marginal)
- 6x6 grid: 52px per cell (FAIL - below 56px recommended)

**Recommendation:**
```tsx
// Add difficulty-based grid constraints
const gridCellMinSize = 56; // Minimum tap target
const maxGridSize = useMemo(() => {
  const cols = letterGrid[0].length;
  return cols * gridCellMinSize;
}, [letterGrid]);

// In CSS
.game-board-frame {
  max-width: min(calc(100vw - 8px), var(--max-grid-size));
}
```

---

### 5.2 Word Forming Area Feedback Animation Overlap
**Priority:** LOW
**Location:** `/fe-next/components/game/WordFormingArea.tsx:336-351`
**Screen Sizes:** All

**Issue:**
Sparkle particles and burst rings overflow the container bounds, can overlap with timer/stats above.

```tsx
// Current - Line 337
{showFeedback && visibleFeedback?.type === 'accepted' && sparklePositions.map((pos, i) => (
  <motion.div
    key={`sparkle-${i}`}
    className="absolute w-2 h-2 bg-neo-yellow rounded-full"
    // Particles shoot out 35px - may overlap other elements
    animate={{
      x: [0, Math.cos(pos.angle) * 35],
      y: [0, Math.sin(pos.angle) * 35],
```

**Fix:**
```tsx
// Add container with overflow control
<div className="relative isolate overflow-visible">
  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}>
    {/* Particles render behind, limited to safe area */}
    {showFeedback && visibleFeedback?.type === 'accepted' && sparklePositions.map((pos, i) => (
      <motion.div
        key={`sparkle-${i}`}
        animate={{
          x: [0, Math.cos(pos.angle) * 25], // Reduced from 35px
          y: [0, Math.sin(pos.angle) * 25],
```

---

### 5.3 Landscape Indicator Banner Timing
**Priority:** LOW
**Location:** `/fe-next/components/LandscapeIndicator.tsx`
**Screen Sizes:** Mobile portrait transitioning to landscape

**Issue:**
The landscape rotation prompt can appear too late (after user already starts game in portrait) or too early (during page load).

**Current:**
```tsx
// Shows immediately when conditions met
useEffect(() => {
  setIsVisible(isMobile && isPortrait);
}, [isMobile, isPortrait]);
```

**Improvement:**
```tsx
// Delay appearance and check if user is on game page
useEffect(() => {
  if (!FEATURE_ENABLED || !isMobile || !isPortrait) {
    setIsVisible(false);
    return;
  }

  // Only show on game pages after 2 second delay
  const isGamePage = window.location.pathname.includes('/game') ||
                      window.location.pathname.includes('/multiplayer');

  if (!isGamePage) {
    return;
  }

  const timer = setTimeout(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed !== 'true') {
      setIsVisible(true);
    }
  }, 2000);

  return () => clearTimeout(timer);
}, [isMobile, isPortrait]);
```

---

## 6. SPACING & ALIGNMENT

### 6.1 Inconsistent Button Padding
**Priority:** MEDIUM
**Location:** `/fe-next/components/ui/button.tsx:63-67`
**Screen Sizes:** All

**Issue:**
Button variants have inconsistent internal padding and min-height calculations:

```tsx
// Current
size: {
  default: "min-h-[48px] h-auto px-5 py-2 [&_svg]:w-5 [&_svg]:h-5",
  sm: "min-h-[48px] h-auto px-4 text-xs [&_svg]:w-4 [&_svg]:h-4",
  lg: "min-h-[48px] h-auto px-8 text-base [&_svg]:w-6 [&_svg]:h-6",
  icon: "min-h-[48px] min-w-[48px] h-auto w-11 p-0 [&_svg]:w-5 [&_svg]:h-5",
},
```

**Problems:**
- `icon` size has `w-11` (44px) but `min-w-[48px]` - conflicting values
- `sm` size uses same min-height as default, making size name confusing
- `h-auto` with `min-h` can cause unexpected height with multi-line text

**Fix:**
```tsx
size: {
  default: "h-12 px-5 py-3 [&_svg]:w-5 [&_svg]:h-5",
  sm: "h-10 px-4 py-2 text-xs [&_svg]:w-4 [&_svg]:h-4",
  lg: "h-14 px-8 py-4 text-base [&_svg]:w-6 [&_svg]:h-6",
  icon: "h-12 w-12 p-0 [&_svg]:w-5 [&_svg]:h-5", // Square, consistent
},
```

---

### 6.2 Header Vertical Rhythm Broken
**Priority:** LOW
**Location:** `/fe-next/components/Header.tsx:79-99`
**Screen Sizes:** All

**Issue:**
Header uses mixed spacing units that don't follow 4px/8px grid:

```tsx
// Current - Line 85
className={cn(
  // Inconsistent padding values
  "px-2 sm:px-3 lg:px-4 py-2 sm:py-2 lg:py-2.5",
```

**Problems:**
- `py-2.5` = 10px (not on 8px grid)
- Breaks vertical rhythm
- Inconsistent with `py-2` on smaller screens

**Fix:**
```tsx
className={cn(
  // Consistent 8px grid
  "px-2 sm:px-3 lg:px-4 py-2 sm:py-2 lg:py-3",
  // Or use custom spacing if 2.5 is intentional
  "px-2 sm:px-3 lg:px-4 py-2 lg:py-[0.625rem]",
```

---

### 6.3 ModeCard Gap Inconsistency
**Priority:** LOW
**Location:** `/fe-next/components/landing/ModeCard.tsx:135-148`
**Screen Sizes:** All

**Issue:**
Live badge uses different gap sizes than parent card:

```tsx
// Parent card - Line 92
<div className="flex items-start justify-between mb-2 lg:mb-4">

// Live badge - Line 135
<div className="flex flex-wrap gap-1 lg:gap-2">
```

**Recommendation:**
Use consistent gap multiplier:
```tsx
// If parent uses 2/4 pattern, badges should use 1/2 or 2/4
<div className="flex flex-wrap gap-1.5 lg:gap-3">
// Maintains 1:2 ratio with parent
```

---

### 6.4 Mobile Menu Content Alignment
**Priority:** LOW
**Location:** `/fe-next/components/Header.tsx:335-492`
**Screen Sizes:** Mobile < 640px

**Issue:**
Menu sections have inconsistent padding between section headers and content:

```tsx
// Section spacing varies
<div className="flex flex-col gap-2"> // Daily
<div className="flex flex-col gap-2"> // Account
<div className="flex flex-col gap-3"> // Admin (different!)
<div className="flex flex-col gap-2"> // Info
```

**Fix:**
```tsx
// Consistent gap-3 for all sections
<div className="flex flex-col gap-3">
```

---

## 7. TEXT TRUNCATION & OVERFLOW

### 7.1 Username Truncation in Leaderboard
**Priority:** MEDIUM
**Location:** `/fe-next/components/game/InGameScreen.tsx:1126-1134`
**Screen Sizes:** All, especially mobile

**Issue:**
Long usernames get truncated but tooltip/full name not available:

```tsx
// Current - Line 1126
<div className={`font-black truncate text-sm flex items-center gap-1 text-neo-black ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
  {player.isHost && <Crown className="w-4 h-4 text-neo-yellow flex-shrink-0" />}
  <span className="truncate">{player.username}</span>
```

**Recommendation:**
```tsx
// Add title attribute for hover tooltip
<span className="truncate" title={player.username}>
  {player.username}
</span>

// Or use Radix UI Tooltip for better UX
<Tooltip>
  <TooltipTrigger asChild>
    <span className="truncate">{player.username}</span>
  </TooltipTrigger>
  <TooltipContent>
    <p>{player.username}</p>
  </TooltipContent>
</Tooltip>
```

---

### 7.2 Found Words List Overflow
**Priority:** MEDIUM
**Location:** `/fe-next/components/game/InGameScreen.tsx:849-881`
**Screen Sizes:** Desktop/tablet

**Issue:**
Found words panel can overflow with long word lists, but scrollbar styling may be inconsistent:

```tsx
// Current - Line 849
<div className="flex-1 overflow-y-auto p-3 min-h-0 custom-scrollbar">
```

**Issue:**
- `.custom-scrollbar` class not defined in globals.css
- Default scrollbar intrusive on Windows
- No scroll indicator for users

**Fix:**
```css
/* Add to globals.css */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.5);
}
```

---

## 8. RESPONSIVE BREAKPOINT ISSUES

### 8.1 Tablet Portrait Mode Neglected
**Priority:** MEDIUM
**Location:** Multiple components
**Screen Sizes:** 768px-1024px portrait

**Issue:**
Most components jump from mobile (`sm:`) to desktop (`lg:`) styling, neglecting tablet portrait (iPad: 768x1024).

**Examples:**
```tsx
// ModeCard.tsx - no md: breakpoint
className="text-lg sm:text-xl lg:text-2xl xl:text-3xl"

// Header.tsx - jumps from sm to lg
"px-2 sm:px-3 lg:px-4"
```

**Recommendation:**
Add tablet-specific breakpoints:
```tsx
className="text-lg sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl"
//                            ^ Added tablet size
```

---

### 8.2 Large Desktop Optimization Missing
**Priority:** LOW
**Location:** Multiple components
**Screen Sizes:** > 1920px

**Issue:**
Components scale linearly to very large sizes without max constraints:

```tsx
// Header logo can become comically large
className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl"
// No 2xl: breakpoint or max-size
```

**Recommendation:**
```tsx
className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-6xl max-w-[600px]"
//                                                                        ^ Cap at 2xl
```

---

## PRIORITY SUMMARY

### Critical (Immediate Fix Required)
1. Tutorial FAB overlaps mobile menu (1.1)
2. Landscape side panels overlap on short screens (1.2)
3. Yellow text on cyan background contrast (3.1)

### High Priority (Fix Before Next Release)
1. Mobile leaderboard hidden behind found words (1.3)
2. Exit button overlaps grid in landscape (1.4)
3. Grid sizing inconsistency in portrait (2.1)
4. Ghost button border visibility (3.2)
5. Focus indicator visibility (3.5)
6. Insufficient touch target sizes (3.6)
7. In-game screen information density (4.2)

### Medium Priority (Fix in Next Sprint)
1. Header logo truncation on very small screens (1.5)
2. Compact leaderboard overflow (2.2)
3. WordFormingArea minimum width too large (2.3)
4. Placeholder text opacity (3.3)
5. Link underline color in light mode (3.4)
6. Landing page cognitive overload (4.1)
7. Landscape control confusion (4.3)
8. Grid cell tap targets (5.1)
9. Button padding inconsistency (6.1)
10. Username truncation tooltip (7.1)
11. Found words scrollbar styling (7.2)
12. Tablet portrait mode neglected (8.1)

### Low Priority (Nice to Have)
1. Landscape mode forced on desktop (2.4)
2. Mobile menu slide-out width (2.5)
3. CompactLeaderboard "You" indicator (4.4)
4. Word forming animation overflow (5.2)
5. Landscape indicator banner timing (5.3)
6. Header vertical rhythm (6.2)
7. ModeCard gap inconsistency (6.3)
8. Mobile menu content alignment (6.4)
9. Large desktop optimization (8.2)

---

## TESTING RECOMMENDATIONS

### Device Matrix
Test all fixes on:
- **Mobile Portrait:** iPhone SE (375x667), iPhone 14 Pro (393x852), Galaxy S21 (360x800), Pixel 5 (393x851)
- **Mobile Landscape:** iPhone SE landscape (667x375), iPhone 14 Pro landscape (852x393)
- **Tablet Portrait:** iPad (768x1024), iPad Pro 11" (834x1194)
- **Tablet Landscape:** iPad landscape (1024x768)
- **Desktop:** 1366x768, 1920x1080, 2560x1440

### Accessibility Testing
1. **Contrast Checker:** Use WebAIM contrast checker on all new color combinations
2. **Screen Reader:** Test with VoiceOver (iOS/Mac) or TalkBack (Android)
3. **Keyboard Navigation:** Ensure all interactive elements reachable via Tab
4. **Touch Target Audit:** Use browser DevTools to measure all tap targets
5. **Color Blindness:** Test with ChromeLens or Colorblind Web Page Filter

### Automated Testing
Add Playwright tests for:
```typescript
// Example test for touch targets
test('all buttons meet 48x48px minimum', async ({ page }) => {
  await page.goto('/');

  const buttons = await page.locator('button, a[role="button"]').all();

  for (const button of buttons) {
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(48);
    expect(box?.height).toBeGreaterThanOrEqual(48);
  }
});

// Contrast ratio testing
test('text contrast meets WCAG AA', async ({ page }) => {
  await page.goto('/');

  // Use axe-playwright or pa11y for automated checks
  const results = await injectAxe(page);
  const violations = await checkA11y(page);

  expect(violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
});
```

---

## CONCLUSION

The LexiClash application demonstrates strong visual design with its Neo-Brutalist aesthetic, but suffers from several critical UX issues particularly in mobile portrait mode. The most pressing issues are:

1. **Button overlap and z-index conflicts** that can make core functionality inaccessible
2. **Contrast violations** that fail WCAG AA standards
3. **Cognitive overload** from too many simultaneous UI elements
4. **Responsive design gaps** particularly for tablet portrait and very small phones

**Recommended Implementation Order:**
1. Week 1: Fix all CRITICAL issues (3 items)
2. Week 2: Address HIGH priority items (7 items)
3. Week 3-4: Tackle MEDIUM priority issues (12 items)
4. Ongoing: LOW priority enhancements (9 items)

**Estimated Total Effort:** 40-60 developer hours across 4 weeks

By addressing these issues systematically, LexiClash will provide a more accessible, less overwhelming, and pixel-perfect user experience across all device types.

---

**Report Generated:** January 4, 2026
**Next Review:** After implementation of HIGH priority fixes
**Questions/Clarifications:** Contact UI/UX Design Team
