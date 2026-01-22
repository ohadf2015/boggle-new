---
phase: 04-world-theming
plan: 01
subsystem: ui
tags: [react-hooks, parallax, gyroscope, animation, performance]

# Dependency graph
requires:
  - phase: 01-infrastructure-foundation
    provides: Device performance detection via useDevicePerformance
provides:
  - useParallax hook for combined gyroscope, gesture, and ambient drift parallax
  - iOS gyroscope permission handling pattern
  - Ambient drift animation system
affects:
  - 04-02 (world backgrounds will consume this hook)
  - 04-03 (particle systems may use parallax for depth)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Combined input sources (gyro + gesture + ambient) for parallax
    - iOS DeviceOrientationEvent permission handling
    - requestAnimationFrame for ambient drift
    - Graceful degradation for reduced motion

key-files:
  created:
    - hooks/useParallax.ts
    - hooks/__tests__/useParallax.test.ts
  modified: []

key-decisions:
  - "Combine three input sources (gyro, gesture, ambient) for 'always alive' effect"
  - "iOS permission request on first touch interaction (graceful fallback)"
  - "Ambient drift uses sine/cosine oscillation at 0.0003/0.0002 speed for organic feel"
  - "All event listeners use passive: true for scroll performance"

patterns-established:
  - "Input source combination pattern: separate state per source, combine in return"
  - "iOS permission request pattern: check for requestPermission, handle async, fallback on error"
  - "Ambient animation pattern: requestAnimationFrame with performance.now() for time tracking"

# Metrics
duration: 14min
completed: 2026-01-22
---

# Phase 04 Plan 01: Parallax Input System Summary

**Combined gyroscope, gesture, and ambient drift parallax hook with iOS permission handling and reduced motion support**

## Performance

- **Duration:** 14 min
- **Started:** 2026-01-22T20:28:53Z
- **Completed:** 2026-01-22T20:42:41Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created useParallax hook combining three input sources (gyroscope, gesture, ambient drift)
- iOS DeviceOrientationEvent permission handling with graceful fallback
- Ambient drift provides "always alive" parallax via sine/cosine oscillation
- Respects prefersReducedMotion preference (returns {x: 0, y: 0})
- Comprehensive test coverage (11 tests, all passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useParallax hook with combined input sources** - `a8bf3e2` (feat)
2. **Task 2: Add tests for useParallax hook** - `295bcef` (test)

## Files Created/Modified

- `hooks/useParallax.ts` - Combined parallax input hook (gyro, gesture, ambient)
- `hooks/__tests__/useParallax.test.ts` - Comprehensive hook tests (11 test cases)

## Decisions Made

**1. Three input sources for "always alive" effect**
- Gyroscope (mobile): Device tilt via DeviceOrientationEvent
- Gesture: Mouse movement (desktop) or touch tracking (mobile)
- Ambient drift: Sine/cosine oscillation running via requestAnimationFrame
- Rationale: Ensures parallax backgrounds are never static, even without user input

**2. iOS permission request on first touch interaction**
- DeviceOrientationEvent.requestPermission() called on first touchstart
- Graceful fallback to gesture-only if permission denied
- Rationale: iOS 13+ requires explicit permission for gyroscope access

**3. Ambient drift speed constants (0.0003/0.0002)**
- X-axis: Math.sin(elapsed × 0.0003) × 3px
- Y-axis: Math.cos(elapsed × 0.0002) × 2px
- Different frequencies create organic Lissajous curve pattern
- Rationale: Subtle always-on movement without distracting from gameplay

**4. All event listeners use passive: true**
- Applied to mousemove, touchmove, deviceorientation, touchstart
- Rationale: Prevents scroll jank by declaring no preventDefault() calls

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 04-02 (world backgrounds):**
- ✅ useParallax hook available for world-specific parallax backgrounds
- ✅ iOS permission handling pattern established
- ✅ Reduced motion support ensures accessibility
- ✅ All tests passing, TypeScript compilation clean

**Technical notes for next plan:**
- Hook returns {x, y, isGyroActive} - use x/y for transform/background-position
- isGyroActive can show UI feedback if gyroscope is contributing to parallax
- Intensity multiplier can be adjusted per world (0.5 = subtle, 1.5 = dramatic)
- Ambient can be disabled via enableAmbient: false if specific world needs static backgrounds

**No blockers or concerns.**

---
*Phase: 04-world-theming*
*Completed: 2026-01-22*
