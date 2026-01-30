---
phase: 26-meta-progression-foundation
plan: 03
subsystem: game-juice
tags: [hooks, animations, accessibility, web-animations-api, tdd]

dependencies:
  requires:
    - hooks/useDevicePerformance.ts (reduced motion detection)
  provides:
    - hooks/useScreenShake.ts (screen shake effect hook)
  affects:
    - Future game juice components (combo feedback, level ups)
    - Adventure mode UI (boss attacks, power-ups)

tech-stack:
  added:
    - Web Animations API (element.animate())
  patterns:
    - GPU-accelerated animations (transform-only)
    - Accessibility-first design (reduced motion support)
    - Configurable animation parameters

files:
  created:
    - hooks/useScreenShake.ts (145 lines)
    - hooks/__tests__/useScreenShake.test.ts (377 lines)
  modified: []

decisions:
  - id: transform-only-animations
    choice: Use only CSS transform property for shake animations
    rationale: GPU-accelerated, no layout thrashing, better performance on mobile
    alternatives_considered:
      - Layout properties (left/top/margin): Rejected due to layout thrashing
      - Framer Motion: Rejected as too heavy for simple shake effect

  - id: reduced-motion-flash
    choice: Provide opacity flash as alternative for reduced-motion users
    rationale: Maintains feedback without motion, accessible, WCAG compliant
    alternatives_considered:
      - No feedback: Rejected as it removes important game juice
      - Color change: Rejected as less noticeable than flash

  - id: intensity-clamping
    choice: Clamp shake intensity between 2-8px
    rationale: 2px minimum for visible effect, 8px maximum to avoid nausea
    alternatives_considered:
      - No limits: Rejected due to potential for excessive shake causing discomfort
      - Wider range (1-20px): Rejected to enforce conservative defaults

metrics:
  lines_added: 522
  lines_modified: 0
  tests_added: 15
  test_coverage: 100%
  duration: 3 minutes
  completed: 2026-01-30
---

# Phase 26 Plan 03: Screen Shake Hook Summary

## One-liner
GPU-accelerated screen shake hook with Web Animations API, reduced motion support, and configurable intensity/duration parameters.

## What Was Built

### Core Implementation
Implemented `useScreenShake` hook that provides visceral feedback for game events:

**API:**
```typescript
const { shakeRef, shake } = useScreenShake();

// Attach ref to container
<div ref={shakeRef}><GameContent /></div>

// Trigger shake
shake(intensity?, duration?)
```

**Features:**
- Web Animations API for GPU-accelerated performance
- Transform-only animations (no layout properties)
- Configurable intensity (2-8px, default 4px)
- Configurable duration (100-300ms, default 200ms)
- Reduced motion detection via `useDevicePerformance`
- Flash feedback alternative for accessibility

**Keyframe Pattern:**
11-keyframe sequence creates natural-feeling random shake:
- Start and end at origin (no permanent offset)
- Alternating diagonal directions for variety
- Easing: ease-in-out for smooth motion

### Test Coverage
Comprehensive test suite with 15 test cases covering:

**Basic Functionality (3 tests):**
- Returns shakeRef and shake function
- Triggers animation when shake is called
- Does not animate if ref is not attached

**Intensity Parameter (3 tests):**
- Default intensity of 4px
- Scales shake magnitude based on parameter
- Clamps intensity between 2 and 8px

**Duration Parameter (3 tests):**
- Default duration of 200ms
- Uses custom duration when provided
- Clamps duration between 100 and 300ms

**Reduced Motion (2 tests):**
- Skips shake animation when prefers-reduced-motion is enabled
- Provides flash feedback for reduced-motion users

**Transform-Only Verification (2 tests):**
- Only uses transform property (no layout properties)
- Uses translate for shake movement

**Keyframe Pattern (2 tests):**
- Has multiple keyframes for random-feeling shake
- Starts and ends at origin (no permanent offset)

All tests passing with 100% coverage.

## Technical Decisions

### 1. Web Animations API over Framer Motion
**Decision:** Use native Web Animations API instead of Framer Motion.

**Rationale:**
- Zero dependencies (built into browsers)
- Better performance (direct browser API)
- Simpler for this single-purpose hook
- Framer Motion is overkill for basic shake

**Impact:** Lighter bundle size, better performance, no external dependency.

### 2. Transform-Only Animations
**Decision:** Animate only the `transform` property, never layout properties.

**Rationale:**
- GPU-accelerated rendering
- No layout thrashing (doesn't trigger reflow)
- Smooth 60fps on mobile devices
- Follows game juice best practices

**Verification:** Grep check confirms no layout properties used.

### 3. Reduced Motion Flash Alternative
**Decision:** Provide opacity flash feedback when prefers-reduced-motion is enabled.

**Rationale:**
- Maintains game juice without motion
- WCAG 2.1 Level AA compliant
- Subtle but noticeable feedback
- Respects user preferences

**Implementation:** 3-keyframe opacity animation (1 → 0.8 → 1).

### 4. Conservative Parameter Ranges
**Decision:** Clamp intensity to 2-8px and duration to 100-300ms.

**Rationale:**
- Prevents excessive shake causing nausea
- Enforces sensible defaults
- Maintains consistent game feel
- Protects against accidental misuse

**Trade-offs:** Less flexibility, but better UX safety.

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

### Dependencies
- **useDevicePerformance:** Provides `prefersReducedMotion` flag
- **React:** Uses `useRef` and `useCallback` hooks

### Future Consumers
This hook will be used by:
- Combo feedback system (Phase 26 plan 04+)
- Level up celebrations (Phase 26 meta-progression)
- Boss attack feedback (Phase 30 boss overhaul)
- Power-up activation (Phase 28 power-up system)

### Usage Pattern
```typescript
const { shakeRef, shake } = useScreenShake();

// On combo trigger
const handleCombo = (comboLevel: number) => {
  const intensity = Math.min(2 + comboLevel, 8);
  shake(intensity, 200);
};

// On level up
const handleLevelUp = () => {
  shake(6, 250); // Strong shake for milestone
};
```

## Performance Characteristics

**Animation Performance:**
- GPU-accelerated via transform
- No layout thrashing
- Runs at 60fps on capable devices
- Gracefully degrades on low-end devices

**Memory:**
- Minimal (single ref, single callback)
- No memory leaks (proper cleanup in Web Animations API)

**Bundle Impact:**
- +145 lines production code
- +377 lines test code
- No external dependencies added

## Testing Strategy

**TDD Approach:**
1. RED: Wrote 15 failing tests first
2. GREEN: Implemented hook to pass all tests
3. REFACTOR: Cleaned up keyframe generation

**Test Quality:**
- 100% line coverage
- Tests behavior, not implementation
- Verifies accessibility compliance
- Checks parameter validation
- Confirms GPU-accelerated approach

## Next Phase Readiness

### Blockers
None.

### Concerns
None - implementation is complete and tested.

### Recommendations
1. Use conservative intensities (2-4px) for common events
2. Reserve high intensities (6-8px) for major moments
3. Test shake frequency to avoid motion fatigue
4. Consider shake cooldown for rapid-fire events

## Lessons Learned

### What Went Well
1. TDD approach caught edge cases early (ref not attached, reduced motion)
2. Web Animations API was simpler than expected
3. Transform-only constraint enforced good practices
4. Test suite provides excellent documentation

### What Could Be Improved
1. Could add shake cooldown to prevent over-shaking
2. Could provide preset intensities (subtle, medium, strong)
3. Could add randomization to keyframes for more variety

### Carry Forward
- Transform-only approach should be standard for all game juice
- Reduced motion flash pattern works well, reuse for other effects
- Web Animations API is suitable for most game juice needs

---

**Status:** ✅ Complete
**Confidence:** High - Full test coverage, no dependencies, clear API
**Ready for:** Integration into combo system and other game juice components
