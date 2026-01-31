---
phase: 30-boss-battle-overhaul
plan: 07
status: complete
subsystem: cinematics
tags: [remotion, animations, boss-battle, cinematics]
dependency-graph:
  requires: ["30-01", "30-06"]
  provides: ["cinematic-player", "entrance-cinematic", "defeat-cinematic"]
  affects: ["30-08"]
tech-stack:
  added: ["remotion@4.0.414", "@remotion/player@4.0.414"]
  patterns: ["remotion-composition", "frame-based-animation", "spring-physics"]
key-files:
  created:
    - hooks/useCinematic.ts
    - components/adventure/boss/cinematics/CinematicPlayer.tsx
    - components/adventure/boss/cinematics/BossEntranceCinematic.tsx
    - components/adventure/boss/cinematics/BossDefeatCinematic.tsx
    - components/adventure/boss/cinematics/index.ts
  modified:
    - package.json
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
decisions:
  - key: "remotion-player"
    choice: "Use @remotion/player for in-app playback"
    reason: "Full rendering not needed - just in-app cinematic playback"
  - key: "skip-delay-2s"
    choice: "SKIP_DELAY_MS = 2000ms"
    reason: "BOSS-04 requirement - prevent accidental skips"
  - key: "8-second-duration"
    choice: "Both cinematics are 8 seconds (240 frames at 30fps)"
    reason: "Balance between dramatic effect and player patience"
  - key: "reduced-motion"
    choice: "Auto-complete after 500ms for users who prefer reduced motion"
    reason: "Accessibility compliance - respect prefers-reduced-motion"
metrics:
  duration: ~20 minutes
  completed: 2026-01-31
---

# 30-07 Summary: Cinematic Sequences (Wave 6)

## What Was Built

Remotion-based cinematic sequences for boss battles with skip functionality.

### Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `hooks/useCinematic.ts` | Playback state and skip timing hook | ~250 |
| `components/adventure/boss/cinematics/CinematicPlayer.tsx` | Remotion Player wrapper with skip button | ~280 |
| `components/adventure/boss/cinematics/BossEntranceCinematic.tsx` | 8-second boss entrance composition | ~320 |
| `components/adventure/boss/cinematics/BossDefeatCinematic.tsx` | 8-second victory composition | ~410 |
| `components/adventure/boss/cinematics/index.ts` | Barrel export for module | ~50 |

### Files Modified

| File | Changes |
|------|---------|
| `package.json` | Added remotion@4.0.414 and @remotion/player@4.0.414 |
| `translations/en.js` | Added cinematics translation keys |
| `translations/he.js` | Added Hebrew cinematics translations |
| `translations/sv.js` | Added Swedish cinematics translations |
| `translations/ja.js` | Added Japanese cinematics translations |

## Technical Decisions

### 1. Remotion Player for In-App Playback

Used `@remotion/player` instead of full Remotion rendering pipeline:
- No server-side video rendering needed
- Real-time playback with React components
- Full control over playback state via useCinematic hook

### 2. Skip Timing (BOSS-04)

```typescript
export const SKIP_DELAY_MS = 2000; // 2 seconds before skip unlocks
```

Skip button and ESC key only work after 2 seconds to:
- Prevent accidental skips
- Ensure dramatic moment is seen
- Match BOSS-04 requirement

### 3. Frame-Based Animation

Both cinematics use 30fps with Remotion's `interpolate()` and `spring()`:

**BossEntranceCinematic Phases:**
1. Fade in (0-1s)
2. Silhouette reveal (1-3s)
3. Boss reveal with particles (3-5s)
4. Boss name title (5-7s)
5. Battle ready transition (7-8s)

**BossDefeatCinematic Phases:**
1. Boss stagger/shake (0-1s)
2. Boss shatter (1-3s)
3. Victory explosion (3-4s)
4. Victory text (4-6s)
5. Rewards display (6-8s)

### 4. Accessibility

Users with `prefers-reduced-motion`:
- Cinematic auto-completes after 500ms
- Loading placeholder shown briefly
- No jarring animations

## API Reference

### useCinematic Hook

```typescript
const {
  isPlaying,    // boolean - currently playing
  canSkip,      // boolean - skip unlocked after 2s
  currentFrame, // number - current frame
  progress,     // number - 0-100%
  skip,         // () => void - skip cinematic
  play,         // () => void - resume
  pause,        // () => void - pause
  reset,        // () => void - reset to start
  handleFrameUpdate, // (frame) => void - for Player callback
} = useCinematic({
  durationFrames: 240,
  fps: 30,
  onComplete: () => {},
  onSkipAvailable: () => {},
  autoPlay: true,
});
```

### CinematicPlayer Props

```typescript
interface CinematicPlayerProps {
  composition: ComponentType<Record<string, unknown>>;
  compositionProps?: Record<string, unknown>;
  durationSeconds: number;
  onComplete: () => void;
  width?: number;   // default: 1280
  height?: number;  // default: 720
  fullscreen?: boolean; // default: true
  fps?: number;     // default: 30
  autoPlay?: boolean; // default: true
}
```

### BossEntranceCinematic Props

```typescript
interface BossEntranceCinematicProps {
  bossName: string;      // Already translated display name
  bossTitle?: string;    // e.g., "Guardian of World 1"
  bossImagePath: string; // Path to boss WebP image
  primaryColor?: string; // Hex color for glow effects
  worldNumber?: number;  // World indicator (1-10)
}
```

### BossDefeatCinematic Props

```typescript
interface BossDefeatCinematicProps {
  bossName: string;
  bossImagePath: string;
  primaryColor?: string;
  secondaryColor?: string;
  goldEarned?: number;    // Gold reward to display
  xpEarned?: number;      // XP reward to display
  perfectVictory?: boolean; // Show "PERFECT VICTORY" badge
}
```

## Verification

- [x] Remotion and @remotion/player installed
- [x] useCinematic hook provides skip timing (2s delay)
- [x] CinematicPlayer wraps Remotion Player with skip button
- [x] BossEntranceCinematic plays 8-second entrance sequence
- [x] BossDefeatCinematic plays 8-second victory sequence
- [x] ESC key skips cinematic (after 2s)
- [x] Translations added for all 4 languages
- [x] npm run build succeeds
- [x] 84 tests passing (31 hook + 21 player + 13 entrance + 19 defeat)

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Commit | Description |
|--------|-------------|
| `43f3346d` | chore(30-07): install Remotion dependencies |
| `d86f8108` | feat(30-07): create useCinematic hook for cinematic playback |
| `cadf6672` | feat(30-07): create CinematicPlayer wrapper component |
| `914d06d4` | feat(30-07): create BossEntranceCinematic composition |
| `a21de962` | feat(30-07): create BossDefeatCinematic composition |
| `0e7bdd2f` | feat(30-07): create cinematics barrel export |

## Test Coverage

| File | Tests |
|------|-------|
| `hooks/__tests__/useCinematic.test.ts` | 31 tests |
| `components/adventure/boss/cinematics/__tests__/CinematicPlayer.test.tsx` | 21 tests |
| `components/adventure/boss/cinematics/__tests__/BossEntranceCinematic.test.tsx` | 13 tests |
| `components/adventure/boss/cinematics/__tests__/BossDefeatCinematic.test.tsx` | 19 tests |

**Total: 84 tests passing**

## Next Phase Readiness

Plan 30-08 (Boss Battle Integration) can now integrate cinematics:
- Import from `@/components/adventure/boss/cinematics`
- Use `CinematicPlayer` with boss-specific compositions
- Connect to boss state machine intro/victory states
- Pass boss config to cinematics via `bossConfig.ts`
