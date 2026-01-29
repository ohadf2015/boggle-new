---
phase: 21
plan: 04
subsystem: education-practice
tags: [flashcards, swipe-gestures, framer-motion, vocabulary, ui-components]
requires: [21-02, 21-03]
provides:
  - SwipeFeedbackOverlay component for visual feedback
  - FlashcardSwipeStack component for swipe-based review
affects: [21-06]
tech-stack:
  added: []
  patterns: [gesture-detection, stacked-cards-ui, keyboard-shortcuts]
key-files:
  created:
    - components/practice/SwipeFeedbackOverlay.tsx
    - components/practice/FlashcardSwipeStack.tsx
  modified:
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
decisions:
  - key: swipe-feedback-overlay
    choice: Opacity-based green/red indicators
    rationale: Progressive visual feedback as user drags, clear color coding (green = mastered, red = needs review)
    alternatives: [instant-flash, border-only, confetti-based]
  - key: stack-depth
    choice: Show 2 background cards with scale/opacity transform
    rationale: Provides visual stack effect without cluttering UI, smooth transitions between cards
    alternatives: [single-card, 3-background-cards, infinite-stack]
  - key: reveal-mechanism
    choice: Tap to reveal definition, then swipe to answer
    rationale: Two-step interaction prevents accidental swipes, gives user time to think
    alternatives: [auto-reveal-on-load, timed-reveal, swipe-to-reveal]
  - key: keyboard-shortcuts
    choice: Space to flip, arrows to swipe
    rationale: Accessibility requirement, power users prefer keyboard navigation
    alternatives: [number-keys, wasd-keys, no-keyboard]
duration: 10min
completed: 2026-01-29
---

# Phase 21 Plan 04: Swipeable Flashcard Stack Summary

> Swipe-based vocabulary review UI with gesture detection and visual feedback

## One-liner

Swipeable flashcard stack with green/red feedback overlays, keyboard shortcuts, and smooth card transitions using Framer Motion.

## What Was Built

### SwipeFeedbackOverlay Component
- **Green "Got It" indicator** - Right swipe shows check icon + green badge
- **Red "Don't Know" indicator** - Left swipe shows X icon + red badge
- **Opacity transforms** - Based on drag distance (0 → 1 as user drags)
- **Neo-Brutalist styling** - Hard shadows, chunky borders, rotated badges
- **RTL support** - Flips layout for Hebrew

**Key features:**
- Uses `useTransform` from Framer Motion for smooth opacity transitions
- Pointer-events-none to prevent interaction blocking
- Color-coded borders (green/red) + background overlays (20% opacity)

### FlashcardSwipeStack Component
- **Stacked card visual** - 2 background cards with scale/opacity transforms
- **Draggable top card** - Using `useSwipeGesture` hook from Plan 03
- **Two-step interaction** - Tap to reveal definition, swipe to answer
- **Exit animations** - Card slides out (500px) with 300ms spring
- **Progress indicator** - Shows current position (e.g., "3 / 10")
- **Keyboard shortcuts** - Space to flip, arrows to swipe (RTL-aware)
- **Visual hints** - "Tap to reveal" overlay when card face-down

**Key features:**
- Uses `AnimatePresence` for smooth card exits
- Background cards use `pointer-events-none` + static transforms
- Swipe threshold: 150px (from `useSwipeGesture`)
- Complete callback when all cards reviewed

### Translation Keys Added
Added to `education.lesson` namespace (4 languages):
- **gotIt** - "Got It" / "ידעתי" / "Kan det" / "分かった"
- **dontKnow** - "Don't Know" / "לא ידעתי" / "Vet inte" / "分からない"
- **tapToReveal** - "Tap to reveal" / "הקש לחשיפה" / "Tryck för att visa" / "タップして表示"

## Implementation Highlights

### Stack Visual Effect
```typescript
// Background cards (visual depth)
style={{
  transform: `scale(${0.95 - idx * 0.03}) translateY(${(idx + 1) * 8}px)`,
  opacity: 0.7 - idx * 0.2,
  zIndex: -idx - 1,
}}
```
- Card 1 (behind current): scale(0.95), translateY(8px), opacity(0.7)
- Card 2 (further back): scale(0.92), translateY(16px), opacity(0.5)

### Exit Animation
```typescript
exit={{
  x: exitDirection === 'right' ? 500 : exitDirection === 'left' ? -500 : 0,
  opacity: 0,
  transition: { duration: 0.3 },
}}
```
- Right swipe exits to +500px
- Left swipe exits to -500px
- Fades to opacity 0

### Keyboard Event Handling
```typescript
// Space to flip card
if (e.key === ' ' && !showDefinition) {
  e.preventDefault();
  setShowDefinition(true);
}
// Arrow keys to swipe (after reveal)
if (showDefinition) {
  handleKeyDown(e); // From useSwipeGesture
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Testing Coverage

No tests written in this plan (Wave 2 implementation). Testing will be added in Phase 21 completion.

**Manual verification:**
- ✅ Lint passes (npm run lint)
- ✅ TypeScript compiles (npx tsc --noEmit)
- ✅ Translation check passes (no missing keys)

## Performance Considerations

### Motion Value Optimization
- `useMotionValue` for x position avoids React re-renders
- `useTransform` for derived values (rotate, opacity) computed on GPU

### Render Optimization
- Background cards are static (no motion values)
- `AnimatePresence` only animates current card exit

### Event Handling
- Keyboard listener cleaned up on unmount
- Drag events throttled by Framer Motion

## Next Phase Readiness

**For Phase 21-06 (Lesson Assignment UI):**
- ✅ FlashcardSwipeStack ready for integration
- ✅ Callbacks (`onGotIt`, `onDontKnow`, `onComplete`) defined
- ✅ Progress tracking built-in

**Blockers:** None

**Concerns:**
- No tests yet (Wave 2 pattern - tests will be added later)
- Build errors during execution (Next.js cache issue, resolved with clean build)
- Spanish translations missing (existing gap, not introduced by this plan)

## Files Changed

**Created (2 files):**
1. `components/practice/SwipeFeedbackOverlay.tsx` - 75 lines
2. `components/practice/FlashcardSwipeStack.tsx` - 218 lines

**Modified (4 files):**
1. `translations/en.js` - Added 3 keys to `education.lesson`
2. `translations/he.js` - Added 3 keys to `education.lesson`
3. `translations/sv.js` - Added 3 keys to `education.lesson`
4. `translations/ja.js` - Added 3 keys to `education.lesson`

**Commit:** `8fcdb13f` - feat(21-04): implement swipeable flashcard stack

## Key Decisions

### Swipe Feedback Design
- **Green right / Red left** - Universal color language for correct/incorrect
- **Opacity-based reveal** - Progressive feedback as user drags
- **Rotated badges** - Playful Neo-Brutalist style (-12° and +12°)

### Card Reveal Flow
- **Tap to reveal** - Forces user to read word before seeing definition
- **Then swipe to answer** - Two-step prevents accidental swipes
- **Disabled drag until reveal** - `drag={showDefinition ? 'x' : false}`

### Accessibility
- **Keyboard shortcuts** - Space (flip), arrows (swipe)
- **Visual hints** - "Tap to reveal" overlay when face-down
- **RTL support** - Keyboard hint labels flip for Hebrew

## Research Context Applied

From 21-RESEARCH.md:

**Pitfall 5 avoided:** Swipe threshold (150px) prevents accidental classifications. Two-step interaction (tap → swipe) adds deliberation.

**LESSON-03 satisfied:** Swipeable flashcard stack with visual feedback implemented. Green glow (right) and red glow (left) match research specification.

## Lessons Learned

### Next.js Build Issues
- Next.js 16 Turbopack occasionally has cache corruption
- Solution: `rm -rf .next && npm run build`
- TypeScript check (`npx tsc --noEmit`) is faster for validation

### Translation Namespace Confusion
- Initially added keys to `teacher.lesson` instead of `education.lesson`
- Pre-commit hook caught missing keys immediately
- Fixed by moving to correct namespace

### Framer Motion Pattern
- Motion values (x, rotate, opacity) avoid React re-renders
- `AnimatePresence` mode="wait" ensures smooth card transitions
- `useTransform` for derived values is more performant than state

## Metrics

- **Duration:** 10 minutes
- **Files created:** 2
- **Files modified:** 4
- **Lines added:** ~300
- **Translation keys:** 3 × 4 languages = 12 keys
- **Tests added:** 0 (Wave 2 - tests later)
- **Commits:** 1

---

**Status:** ✅ Complete
**Next:** Phase 21-06 (Lesson Assignment UI) - Integrate FlashcardSwipeStack
