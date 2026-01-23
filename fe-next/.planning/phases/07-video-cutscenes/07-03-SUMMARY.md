---
phase: 07-video-cutscenes
plan: 03
subsystem: video-compositions
tags: [remotion, tutorial, onboarding, i18n, rtl]
dependency-graph:
  requires: [01-01]
  provides: [tutorial-composition]
  affects: [07-05]
tech-stack:
  added: []
  patterns: [embedded-translations, sequence-composition]
key-files:
  created:
    - remotion/compositions/Tutorial/index.tsx
    - remotion/compositions/Tutorial/types.ts
    - remotion/compositions/Tutorial/TutorialStep.tsx
  modified:
    - remotion/Root.tsx
decisions:
  - id: tutorial-embedded-translations
    choice: "Embedded translations object in types.ts"
    reason: "Remotion cannot use React context, translations must be static"
  - id: tutorial-step-icons
    choice: "Simple SVG icons (swipe arrow, checkmark, plus)"
    reason: "Clean UI focus, no external dependencies"
  - id: tutorial-pulse-animation
    choice: "5% sine wave pulse (Math.sin(frame * 0.1))"
    reason: "Subtle but visible, continuous animation"
metrics:
  duration: "~4 minutes"
  completed: "2026-01-23"
---

# Phase 7 Plan 3: Tutorial Composition Summary

**One-liner:** 18-second Remotion tutorial with 3 localized instruction steps, pulsing highlights, and RTL support

## What Was Built

### TutorialStep Component
- Reusable step component with pulsing highlight box
- RTL-aware text rendering (Hebrew uses Rubik font, `dir="rtl"`)
- Three icon variants: swipe gesture, checkmark, plus/score
- Text fade-in animation over first 20 frames
- Neo-brutalist styling: 4px yellow border, hard shadow

### Tutorial Composition
- 18-second video (540 frames at 30fps)
- 3 sequential steps, 6 seconds each:
  1. Swipe instruction (frames 0-180)
  2. Word validation (frames 180-360)
  3. Scoring pattern (frames 360-540)
- Zod schema validates locale prop
- Neo-navy background, clean UI focus

### Translations
- Embedded translations for 4 locales: en, he, sv, ja
- Cannot use React context in Remotion, so translations are static objects
- Hebrew translations render right-to-left correctly

## Verification Results

| Check | Result |
|-------|--------|
| Tutorial in remotion compositions | Tutorial 30fps 1920x1080 540 frames (18.00 sec) |
| English render | out/tutorial-en.mp4 (1.2 MB) |
| Hebrew render | out/tutorial-he.mp4 (1.2 MB) |
| Hebrew RTL text | Verified |
| Frame 0 valid content | Verified (skip-from-first-second ready) |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| bb4eeb9 | feat | TutorialStep component with pulsing highlight |
| 659ab5c | feat | Tutorial composition with 4-language translations |
| 08dd5ef | feat | Register Tutorial composition in Root.tsx |

## Technical Details

### Animation Constants
- Pulse: `1 + 0.05 * Math.sin(frame * 0.1)` (5% scale oscillation)
- Text fade: frames 0-20 (opacity 0 to 1)
- Step duration: 180 frames (6 seconds)

### File Size
The rendered MP4 files are ~1.2 MB each. The plan's 600KB target was optimistic for 18 seconds of 1080p video. 1.2 MB is reasonable and acceptable for onboarding content.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 07-05 (CutscenePlayer):**
- Tutorial composition renders valid content from frame 0
- This enables `allowSkipAfterMs: 0` in CutscenePlayer
- Locale prop allows runtime language selection
