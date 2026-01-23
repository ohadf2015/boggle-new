---
phase: 07-video-cutscenes
plan: 05
subsystem: video-playback
tags: [react, video, ios-safari, cutscenes, rtl]
completed: 2026-01-23
duration: 7min
dependency_graph:
  requires: [07-04]
  provides: [cutscene-player-component, video-barrel-export]
  affects: [07-06]
tech_stack:
  added: []
  patterns: [ios-video-autoplay, reduced-motion-preference, rtl-positioning]
key_files:
  created:
    - components/video/CutscenePlayer.tsx
    - components/video/index.ts
    - components/video/__tests__/CutscenePlayer.test.tsx
  modified: []
decisions:
  - iOS autoplay requires muted + playsInline + autoPlay attributes
  - Tutorial videos immediately skippable (0ms delay)
  - Level-intro/transition default 2000ms skip delay
  - RTL skip button positioned on left (Hebrew)
  - Reduced motion preference auto-completes video
metrics:
  tasks_completed: 2
  commits: 1
  test_count: 21
---

# Phase 07 Plan 05: CutscenePlayer Component Summary

React component for playing cutscene videos with iOS Safari compatibility, skip functionality, and language-aware video selection.

## What Was Built

### 1. CutscenePlayer Component (`components/video/CutscenePlayer.tsx`)
Full-featured video player component with:
- **iOS Safari compatibility**: autoPlay, muted, playsInline attributes for automatic playback
- **Skip functionality**: Configurable delay before skip button appears
- **Language-aware paths**: Video path construction using locale from LanguageContext
- **RTL support**: Skip button positioned on left side for Hebrew
- **Reduced motion**: Auto-completes video for users preferring reduced motion
- **Test mode**: Displays video path for testing without actual playback

### 2. Props Interface
```typescript
interface CutscenePlayerProps {
  type: 'level-intro' | 'transition' | 'tutorial';
  worldId?: 'meadows' | 'springs' | 'caverns';
  fromWorldId?: 'meadows' | 'springs' | 'caverns';
  toWorldId?: 'meadows' | 'springs' | 'caverns';
  onComplete?: () => void;
  onSkip?: () => void;
  allowSkipAfterMs?: number;
  testMode?: boolean;
}
```

### 3. Video Path Construction
| Type | Pattern |
|------|---------|
| Level Intro | `/videos/cutscenes/level-intro-{worldId}-{locale}.mp4` |
| Transition | `/videos/cutscenes/transition-{from}-{to}-{locale}.mp4` |
| Tutorial | `/videos/cutscenes/tutorial-{locale}.mp4` |

### 4. Barrel Export (`components/video/index.ts`)
Clean import interface:
```typescript
import { CutscenePlayer } from '@/components/video';
import type { CutscenePlayerProps, CutsceneType, WorldId } from '@/components/video';
```

### 5. Test Suite (21 tests)
Comprehensive coverage for:
- Video path construction (5 tests)
- Skip button timing (4 tests)
- Callbacks (4 tests)
- iOS Safari compatibility (3 tests)
- RTL support (2 tests)
- Test mode (2 tests)
- Reduced motion preference (1 test)

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create CutscenePlayer component | 8ecbc5a | components/video/CutscenePlayer.tsx |
| 2 | Create barrel export and tests | 8ecbc5a | components/video/index.ts, __tests__/CutscenePlayer.test.tsx |

## Verification Results

- [x] `npm run test:frontend -- --testPathPattern=CutscenePlayer` passes (21/21)
- [x] `npm run build` completes without errors
- [x] TypeScript compiles without errors
- [x] Lint passes

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### iOS Safari Autoplay Requirements
```jsx
<video
  autoPlay      // Start playback automatically
  muted         // Required for autoplay (DOM property, not attribute)
  playsInline   // Prevent fullscreen on iOS
  onEnded={handleEnded}
/>
```

### Skip Button Timing
| Cutscene Type | Default Delay |
|---------------|---------------|
| tutorial | 0ms (immediately skippable) |
| level-intro | 2000ms |
| transition | 2000ms |

### Neo-Brutalist Skip Button Styling
- Background: `neo-yellow`
- Text: `neo-black`, bold
- Border: 3px solid black
- Shadow: `shadow-hard`
- Animation: `animate-neo-pop` entrance

### Callback Safety
- `hasCalledCallback` ref prevents double-invocation
- `isSkipped` state prevents onComplete after skip
- Video is paused immediately on skip

## Usage Example

```tsx
import { CutscenePlayer } from '@/components/video';

// Level intro
<CutscenePlayer
  type="level-intro"
  worldId="meadows"
  onComplete={() => startGame()}
  onSkip={() => startGame()}
/>

// World transition
<CutscenePlayer
  type="transition"
  fromWorldId="meadows"
  toWorldId="springs"
  onComplete={() => loadNewWorld()}
/>

// Tutorial (immediately skippable)
<CutscenePlayer
  type="tutorial"
  allowSkipAfterMs={0}
  onComplete={() => showGame()}
  onSkip={() => showGame()}
/>
```

## Next Phase Readiness

Ready for 07-06: Adventure Mode Integration (not in current plan)
- CutscenePlayer component exported and tested
- Video path convention matches render pipeline
- Callbacks ready for game state management
- RTL and accessibility features complete
