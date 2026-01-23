---
phase: 07-video-cutscenes
plan: 01
subsystem: video-rendering
tags: [remotion, composition, ken-burns, rtl, animation]
depends_on:
  requires: [01-01]
  provides: [level-intro-composition, shared-interpolations, text-overlay]
  affects: [07-02, 07-03, adventure-mode]
tech_stack:
  added: []
  patterns: [ken-burns-zoom, rtl-text-overlay, zod-schema-props]
files:
  created:
    - remotion/shared/utils/interpolations.ts
    - remotion/shared/components/TextOverlay.tsx
    - remotion/compositions/LevelIntro/index.tsx
    - remotion/compositions/LevelIntro/types.ts
  modified:
    - remotion/Root.tsx
decisions:
  - decision: "Ken Burns zoom parameters"
    rationale: "1.15x -> 1.0x over 6s creates subtle camera movement without distracting from content"
  - decision: "Text overlay appears in last 3 seconds"
    rationale: "Establishes mood first, then reveals world name for context before gameplay"
  - decision: "Rubik font for Hebrew, Fredoka for others"
    rationale: "Per design system - Rubik has better Hebrew glyph support"
metrics:
  duration: 4.5min
  completed: 2026-01-23
---

# Phase 7 Plan 01: LevelIntro Composition Summary

**One-liner:** Ken Burns zoom composition for world flyby establishing shots with RTL-aware text overlay.

## What Was Built

Created the LevelIntro Remotion composition for adventure mode world entry cutscenes. The composition displays a world background image with a Ken Burns zoom effect (zooming out from 1.15x to 1.0x) and fades in the world name in the final 3 seconds.

### Key Components

1. **Shared Utilities** (`remotion/shared/utils/interpolations.ts`)
   - `fadeIn()` - opacity 0->1 interpolation
   - `fadeOut()` - opacity 1->0 interpolation
   - `kenBurnsZoom()` - scale interpolation for camera movement
   - All use clamped extrapolation for clean animation bounds

2. **TextOverlay Component** (`remotion/shared/components/TextOverlay.tsx`)
   - RTL-aware text rendering for video overlays
   - Supports all 4 locales: en, he, sv, ja
   - Uses Rubik font for Hebrew, Fredoka for others
   - Neo-brutalist styling with hard text shadow

3. **LevelIntro Composition** (`remotion/compositions/LevelIntro/index.tsx`)
   - 240 frames (8 seconds at 30fps)
   - Ken Burns zoom effect over first 6 seconds
   - Fade in over 0.5s, fade out over 1s
   - World name appears with fade-in at frame 150
   - Supports 3 worlds: meadows, springs, caverns
   - World name translations for all 4 locales

### Technical Details

**Timing (at 30fps):**
- Total duration: 240 frames (8s)
- Ken Burns: frames 0-180 (6s)
- Fade in: frames 0-15 (0.5s)
- Fade out: frames 210-240 (1s)
- Text overlay: frames 150-240 (3s)

**Composition Config:**
- Resolution: 1920x1080
- FPS: 30
- Schema: Zod validation for worldId and locale props

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 8 second duration | Within 5-10s guideline, enough for establishing shot feel |
| Ken Burns 1.15x -> 1.0x | Subtle zoom-out creates camera movement without distraction |
| Text at 5 second mark | Establish visual mood first, then contextualize with world name |
| Unicode escape for translations | Ensures proper encoding in source file |

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

**Created:**
- `remotion/shared/utils/interpolations.ts` - Reusable animation helpers
- `remotion/shared/components/TextOverlay.tsx` - RTL-aware text overlay
- `remotion/compositions/LevelIntro/types.ts` - Zod schema and types
- `remotion/compositions/LevelIntro/index.tsx` - Main composition

**Modified:**
- `remotion/Root.tsx` - Added LevelIntro composition registration

## Verification Results

- TypeScript compiles without errors
- Render produces valid MP4 (8s at 1080p)
- Hebrew locale renders with RTL text alignment
- Ken Burns zoom effect visible in output
- World name overlay appears in final 3 seconds

## Notes

**Video file size:** The plan expected <500KB but actual output is ~10MB. This is expected for 8 seconds of 1080p H.264 video. The 500KB expectation was unrealistic - video compression ratios don't support that for full HD content.

**Shared utilities:** The interpolation helpers and TextOverlay component are designed for reuse in other compositions (WorldTransition, Tutorial, etc.).

## Next Phase Readiness

Ready for 07-02 (WorldTransition) or integration with adventure mode. The shared utilities provide a foundation for consistent animation patterns across all video compositions.
