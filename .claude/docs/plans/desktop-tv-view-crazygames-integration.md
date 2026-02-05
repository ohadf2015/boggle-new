# Desktop/TV View Improvements & CrazyGames Integration Plan

**Feature**: Improve desktop view for all game modes, TV view optimization, and CrazyGames portal integration
**Created**: 2026-01-17
**Status**: Planning Complete

---

## Executive Summary

This plan addresses three interconnected improvements:
1. **Desktop View Optimization** - Enhance all game modes for larger screens (1024px+)
2. **TV Broadcast View Enhancement** - Improve the spectator/host experience for TV displays
3. **CrazyGames Integration Readiness** - Ensure compliance with CrazyGames SDK requirements

---

## Phase 1: CrazyGames Compliance Foundation

### 1.1 Critical Viewport Support

**Required viewport sizes (CrazyGames distribution):**
| Size | Device Type | Priority |
|------|-------------|----------|
| 821×462 | Desktop (smallest non-fullscreen) | Critical |
| 907×510 | Desktop (common) | High |
| 1216×684 | Desktop (common) | High |
| 1077×606 | Desktop (common) | High |
| 800×450 | Mobile landscape | Critical |
| 1080×607 | Tablet landscape | High |

**Implementation Tasks:**
- [ ] Create new Tailwind breakpoint `cg-min: 821px` for CrazyGames minimum desktop
- [ ] Add `cg-mobile: 800px` breakpoint for CrazyGames mobile landscape
- [ ] Test all game modes at 821×462 minimum viewport
- [ ] Ensure UI elements remain usable at smallest supported size

### 1.2 SDK Lifecycle Integration

**Current State**: `useCrazyGamesLifecycle.ts` exists but needs expansion

**Required Changes:**

```typescript
// hooks/useCrazyGamesLifecycle.ts - Enhanced version
interface CrazyGamesLifecycleConfig {
  autoStart?: boolean;           // Auto-call gameplayStart on mount
  autoStop?: boolean;            // Auto-call gameplayStop on unmount
  happyTimeThreshold?: {
    score?: number;              // Default: 100
    combo?: number;              // Default: 5
    wordsFound?: number;         // New: trigger on word count
  };
  pauseOnAd?: boolean;           // Pause game timer during ads
}
```

**Files to Modify:**
- `hooks/useCrazyGamesLifecycle.ts` - Add config options
- `components/singleplayer/SinglePlayerGame.tsx` - Integrate lifecycle
- `components/daily-challenge/DailyChallengeGame.tsx` - Integrate lifecycle
- `host/components/HostInGameView.tsx` - Integrate lifecycle (host controls)

### 1.3 Fullscreen Button Removal

**Critical**: CrazyGames prohibits custom fullscreen buttons

**Files with Fullscreen Logic:**
- `host/components/TvBroadcastView.tsx` - Has `isFullscreen` state and toggle
- Need to conditionally hide when `isOnCrazyGamesPlatform === true`

**Implementation:**
```typescript
// Conditional rendering pattern
const { isOnCrazyGamesPlatform } = useCrazyGames();

{!isOnCrazyGamesPlatform && (
  <button onClick={toggleFullscreen}>Fullscreen</button>
)}
```

---

## Phase 2: Desktop View Improvements

### 2.1 Single Player Game (Desktop)

**Current Issues:**
- Layout optimized primarily for mobile landscape
- Desktop has underutilized screen real estate
- Grid could be larger on wide screens

**Proposed Desktop Layout (lg: 1024px+):**
```
┌──────────────────────────────────────────────────────────┐
│                    Header (Timer/Score)                   │
├────────────┬─────────────────────────────┬───────────────┤
│            │                             │               │
│   Stats    │          Grid               │    Words      │
│   Panel    │        (Larger)             │    Found      │
│            │                             │               │
│  - Score   │     [Letter Grid]           │  - Recent     │
│  - Combo   │                             │  - Best       │
│  - Timer   │                             │  - Total      │
│            │                             │               │
├────────────┴─────────────────────────────┴───────────────┤
│                    Action Bar (Submit/etc)                │
└──────────────────────────────────────────────────────────┘
```

**Implementation Tasks:**
- [ ] Create `useDesktopLayout` hook (width >= 1024px AND height >= 600px)
- [ ] Add desktop-specific grid sizing (larger cells, more spacing)
- [ ] Create side panels for stats and word list (hidden on mobile)
- [ ] Implement keyboard shortcuts for desktop (Enter to submit, Backspace to clear)

**Files to Create/Modify:**
- `hooks/useDesktopLayout.ts` - New hook
- `components/singleplayer/SinglePlayerGame.tsx` - Desktop layout variant
- `components/singleplayer/DesktopStatsPanel.tsx` - New component
- `components/singleplayer/DesktopWordList.tsx` - New component

### 2.2 Daily Challenge Game (Desktop)

**Current Issues:**
- Similar to Single Player, underutilizes desktop space
- Brain score visualization could be more prominent

**Proposed Improvements:**
- [ ] Inherit desktop layout patterns from SinglePlayer
- [ ] Add persistent leaderboard sidebar (desktop only)
- [ ] Show brain training metrics prominently
- [ ] Display challenge metadata (trend, category) in sidebar

### 2.3 Multiplayer/Host View (Desktop)

**Current Issues:**
- Grid view works but player cards could be larger
- Leaderboard animation opportunities

**Proposed Improvements:**
- [ ] Larger player cards on desktop
- [ ] Animated score transitions
- [ ] Sound effects for score milestones (CrazyGames compatible)

### 2.4 Brain Drills (Desktop)

**Game Modes to Optimize:**
1. `rare-gems` - Word finding challenge
2. `combo-master` - Combo building
3. `pattern-switcher` - Grid pattern recognition
4. `memory-hunt` - Memory challenge
5. `lightning-round` - Speed challenge

**Proposed Improvements:**
- [ ] Consistent desktop layout across all drills
- [ ] Larger interactive areas
- [ ] Desktop-specific animations

---

## Phase 3: TV Broadcast View Enhancement

### 3.1 Current TV View Analysis

**Existing Components:**
- `TvBroadcastView.tsx` - Main container (270 lines)
- `TvJoinBar.tsx` - Room code and QR display
- `TvGameHeader.tsx` - Round info and timer
- `TvGrid.tsx` - Letter grid display
- `TvLeaderboard.tsx` - Player rankings
- `TvNotificationQueue.tsx` - Word found notifications

### 3.2 TV-Specific Improvements

**Resolution Support:**
- [ ] Add 4K (3840×2160) support with scaled elements
- [ ] Add 1080p (1920×1080) as default TV resolution
- [ ] Ensure readability at 10-foot viewing distance

**Visual Enhancements:**
```
┌──────────────────────────────────────────────────────────┐
│  [QR Code]    ROOM: ABC123    [Timer 2:30]    [Round 2]  │  ← Larger text
├──────────────────────────────┬───────────────────────────┤
│                              │                           │
│                              │      LEADERBOARD          │
│       L E T T E R            │  ┌─────────────────────┐  │
│       E T T E R L            │  │ 1. Player1   1250  │  │  ← Animated
│       T T E R L E            │  │ 2. Player2   1100  │  │    transitions
│       T E R L E T            │  │ 3. Player3    950  │  │
│                              │  └─────────────────────┘  │
│                              │                           │
│       [Found: LETTER 50pts]  │   [Combo: 5x streak!]    │  ← Notifications
│                              │                           │
└──────────────────────────────┴───────────────────────────┘
```

**Implementation Tasks:**
- [ ] Add TV breakpoint `tv: 1920px` in Tailwind config
- [ ] Scale all typography for TV viewing distance
- [ ] Add celebration animations for milestones
- [ ] Implement auto-scroll leaderboard for 8+ players
- [ ] Add ambient background animations (subtle)

### 3.3 TV-Specific Features

**New Features:**
- [ ] Picture-in-picture mode for grid during leaderboard focus
- [ ] Sound design for TV (ambient music option)
- [ ] "Attract mode" for when waiting for players
- [ ] Tournament bracket display (future multiplayer feature)

---

## Phase 4: Banner Ad Integration Strategy

### 4.1 CrazyGames Banner Rules

**Constraints:**
- Banners only on screens lasting 5+ seconds
- NO banners during active gameplay
- Supported sizes: 728×90 (leaderboard), 300×250 (medium rect), 320×50 (mobile)

### 4.2 Banner Placement Plan

**Allowed Locations:**
| Location | Size | Duration Check |
|----------|------|----------------|
| Home screen | 728×90 | Always visible |
| Game mode selection | 300×250 | 5+ seconds typical |
| Results screen | 728×90 | Post-game display |
| Leaderboard screen | 300×250 | 5+ seconds typical |
| Settings page | 320×50 | 5+ seconds typical |

**Prohibited Locations:**
- Active gameplay (any mode)
- Countdown screens (< 5 seconds)
- Loading screens (unpredictable duration)

### 4.3 Implementation

**Files to Modify:**
- `app/[locale]/page.tsx` - Home screen banner
- `app/[locale]/solo/page.tsx` - Mode selection banner
- `components/results/ResultsScreen.tsx` - Results banner
- Create `components/ads/BannerPlacement.tsx` - Centralized banner logic

**Banner Placement Component:**
```typescript
interface BannerPlacementProps {
  location: 'home' | 'mode-select' | 'results' | 'leaderboard' | 'settings';
  className?: string;
}

// Automatically selects appropriate size based on location and screen
export function BannerPlacement({ location, className }: BannerPlacementProps) {
  const { isOnCrazyGamesPlatform, requestBanner } = useCrazyGames();
  // Only render on CrazyGames platform
  // Auto-size based on location
}
```

---

## Phase 5: Responsive Design System Updates

### 5.1 New Tailwind Breakpoints

**Add to `tailwind.config.js`:**
```javascript
screens: {
  // Existing
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',

  // CrazyGames specific
  'cg-mobile': '800px',    // CrazyGames mobile landscape min
  'cg-min': '821px',       // CrazyGames desktop minimum
  'cg-tablet': '1080px',   // CrazyGames tablet landscape

  // TV specific
  'tv': '1920px',          // Standard TV/monitor
  'tv-4k': '3840px',       // 4K displays

  // Height-based (using arbitrary values)
  'tall': { 'raw': '(min-height: 800px)' },
  'short': { 'raw': '(max-height: 600px)' },
}
```

### 5.2 Container Queries for Components

**Pattern to implement:**
```css
/* Component-level responsiveness */
.game-grid-container {
  container-type: inline-size;
  container-name: grid;
}

@container grid (min-width: 500px) {
  .grid-cell {
    font-size: 2rem;
    padding: 1rem;
  }
}
```

**Files to Update:**
- `styles/globals.css` - Add container query utilities
- Component files - Add container wrappers

---

## Phase 6: Testing Strategy

### 6.1 Viewport Testing Matrix

**Required Test Viewports:**
| Viewport | Type | Priority |
|----------|------|----------|
| 375×667 | iPhone SE | High |
| 800×450 | CG Mobile | Critical |
| 821×462 | CG Desktop Min | Critical |
| 1024×768 | Tablet | High |
| 1280×720 | Laptop | High |
| 1920×1080 | Desktop/TV | Critical |
| 3840×2160 | 4K TV | Medium |

### 6.2 CrazyGames Testing

**Pre-submission Checklist:**
- [ ] gameplayStart/gameplayStop called correctly
- [ ] No custom fullscreen buttons
- [ ] Banners only on 5+ second screens
- [ ] All viewports render correctly
- [ ] Initial load < 50MB (desktop) / 20MB (mobile)
- [ ] happyTime triggered appropriately

### 6.3 Playwright E2E Tests

**New Test Files:**
- `tests/e2e/desktop-layout.spec.ts` - Desktop view tests
- `tests/e2e/tv-broadcast.spec.ts` - TV view tests
- `tests/e2e/crazygames-lifecycle.spec.ts` - SDK integration tests

---

## Implementation Order

### Sprint 1: CrazyGames Compliance (Critical)
1. Add CrazyGames breakpoints to Tailwind
2. Remove/hide fullscreen buttons on CrazyGames
3. Enhance lifecycle hook with config options
4. Test at minimum viewport (821×462)

### Sprint 2: Desktop Layout Foundation
1. Create `useDesktopLayout` hook
2. Implement SinglePlayer desktop layout
3. Create reusable desktop panels (stats, word list)
4. Add keyboard shortcuts

### Sprint 3: TV View Enhancement
1. Add TV breakpoints
2. Scale typography for TV viewing
3. Implement celebration animations
4. Add leaderboard auto-scroll

### Sprint 4: Banner Integration
1. Create `BannerPlacement` component
2. Add banners to allowed locations
3. Verify 5-second rule compliance
4. Test banner rendering on CrazyGames

### Sprint 5: Polish & Testing
1. Complete viewport testing matrix
2. Write E2E tests
3. Performance optimization
4. Documentation updates

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| CrazyGames rejection | High | Strict compliance checklist |
| Performance on min viewport | Medium | Optimize animations, lazy load |
| TV readability issues | Medium | User testing at 10ft distance |
| Banner revenue impact | Low | Strategic placement optimization |

---

## Success Metrics

1. **CrazyGames Approval** - Pass first submission review
2. **Desktop Engagement** - 20% increase in session duration on 1024px+ screens
3. **TV Usability** - Readable at 10ft viewing distance
4. **Performance** - < 3s initial load on all viewports
5. **Test Coverage** - 80%+ for new components

---

## Appendix: File Inventory

### Files to Create
- `hooks/useDesktopLayout.ts`
- `components/singleplayer/DesktopStatsPanel.tsx`
- `components/singleplayer/DesktopWordList.tsx`
- `components/ads/BannerPlacement.tsx`
- `tests/e2e/desktop-layout.spec.ts`
- `tests/e2e/tv-broadcast.spec.ts`
- `tests/e2e/crazygames-lifecycle.spec.ts`

### Files to Modify
- `tailwind.config.js` - Add breakpoints
- `hooks/useCrazyGamesLifecycle.ts` - Enhanced config
- `components/singleplayer/SinglePlayerGame.tsx` - Desktop layout
- `components/daily-challenge/DailyChallengeGame.tsx` - Desktop layout
- `host/components/TvBroadcastView.tsx` - TV enhancements, hide fullscreen on CG
- `host/components/HostInGameView.tsx` - Desktop improvements
- `styles/globals.css` - Container queries
- `app/[locale]/page.tsx` - Home banner
- `components/results/ResultsScreen.tsx` - Results banner
