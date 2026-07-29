# Feature: Daily Challenge Card 3D Effect Enhancement

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Enhance the Daily Challenge card/banner on the landing page to have the same 3D tilt effect as the ModeCard components. The current DailyChallengeBanner uses basic neo-brutalist styling (hard shadows, scale animations) but lacks the premium 3D tilt effect that makes the ModeCards feel more interactive and game-like.

## User Story

As a player
I want the Daily Challenge card to feel premium and interactive like the other game mode cards
So that the landing page has consistent, high-quality visual feedback

## Problem Statement

The DailyChallengeBanner currently uses:
- ✅ Hard shadows (correct neo-brutalist style)
- ✅ Scale on hover/tap via Framer Motion
- ✅ Vibrant gradient
- ❌ **NO 3D tilt effect** (ModeCard has this)
- ❌ **NO shine effect on hover** (ModeCard has this)
- ❌ **NO corner accent animation** (ModeCard has this)
- ❌ **Inconsistent hover glow** (simpler ring vs ModeCard's dramatic glow)

The ModeCard has a sophisticated 3D feel with:
- `useTiltEffect` hook for perspective rotation on mouse move
- Hover glow with `boxShadow` including multiple glow layers
- Shine effect (gradient sweep across card)
- Corner accent that scales on hover

## Solution Statement

Update the DailyChallengeBanner component to:
1. Add the `useTiltEffect` hook for 3D perspective rotation
2. Add the shine effect overlay on hover
3. Add corner accent with scale animation
4. Update hover glow to match ModeCard's multi-layer glow style
5. Use `isHovered` state to coordinate all effects

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Low
**Primary Systems Affected:** `components/daily/DailyChallengeBanner.tsx`
**Dependencies:** `useTiltEffect` hook, `useDevicePerformance` hook (both already exist)

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `.claude/agents/context/prime-context.md` - COMPLETE codebase overview
  - **WHY:** Contains all project patterns, configurations, and architecture
  - **ACTION:** Read this file first to understand the codebase

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `components/daily/DailyChallengeBanner.tsx` (full file)
  - **WHY:** The component to modify
  - **PATTERN:** Currently uses Framer Motion for scale, needs 3D tilt added

- `components/landing/ModeCard.tsx` (lines 51-91, 131-166, 304-333)
  - **WHY:** Contains the 3D tilt implementation to mirror
  - **PATTERN:** useTiltEffect hook, isHovered state, shine effect, corner accent

- `hooks/useTiltEffect.ts` (full file)
  - **WHY:** The hook to use for 3D effect
  - **PATTERN:** Returns `{ ref, style, handlers, isHovered }`

- `hooks/useDevicePerformance.ts`
  - **WHY:** Used to conditionally enable animations
  - **PATTERN:** `{ enableComplexAnimations, prefersReducedMotion }`

### Patterns to Follow

**3D Tilt Effect Pattern (from ModeCard lines 72-90):**

```typescript
import { useTiltEffect } from '@/hooks/useTiltEffect';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

// Inside component:
const [isHovered, setIsHovered] = useState(false);
const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

// 3D tilt effect - use slightly reduced values since banner is smaller
const { ref, style: tiltStyle, handlers: tiltHandlers } = useTiltEffect<HTMLDivElement>({
  maxTilt: 12,        // Less than ModeCard's 18 since banner is smaller
  hoverScale: 1.04,   // Noticeable but not as dramatic as ModeCard's 1.06
  perspective: 800,   // Strong 3D effect
});

// Combined handlers
const handlers = {
  ...tiltHandlers,
  onMouseEnter: () => {
    setIsHovered(true);
    tiltHandlers.onMouseEnter();
  },
  onMouseLeave: () => {
    setIsHovered(false);
    tiltHandlers.onMouseLeave();
  },
};
```

**Hover Glow Pattern (from ModeCard lines 159-164):**

```typescript
// Inside the div that has tiltStyle applied:
style={{
  // Hover glow effect - lime color to match banner gradient
  boxShadow: isHovered && !hasPlayed
    ? `0 0 25px rgba(191, 255, 0, 0.5), 0 0 50px rgba(191, 255, 0, 0.3), 6px 6px 0px rgb(var(--neo-black))`
    : undefined,
  ...tiltStyle,
}}
```

**Shine Effect Pattern (from ModeCard lines 307-320):**

```typescript
{/* Shine effect on hover - only when animations enabled */}
{enableComplexAnimations && !prefersReducedMotion && (
  <>
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo"
      initial={false}
      animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        initial={{ x: '-100%' }}
        animate={isHovered ? { x: '200%' } : { x: '-100%' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </motion.div>

    {/* Decorative corner accent */}
    <motion.div
      className="absolute top-0 right-0 w-12 h-12 pointer-events-none overflow-hidden rounded-neo"
      initial={false}
    >
      <motion.div
        className="absolute -top-6 -right-6 w-12 h-12 bg-white/10 rotate-45"
        animate={isHovered ? { scale: 1.2, opacity: 0.15 } : { scale: 1, opacity: 0.08 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  </>
)}
```

**Key Differences from ModeCard:**

1. **Tilt values reduced**: maxTilt: 12 (vs 18), hoverScale: 1.04 (vs 1.06) - banner is smaller
2. **Glow color**: Use lime green `rgba(191, 255, 0, ...)` to match lime gradient
3. **Corner accent size**: w-12 h-12 (vs w-16 h-16) - smaller for banner
4. **RTL-aware**: Current banner already handles RTL for hover states - keep that

---

## IMPLEMENTATION PLAN

### Phase 1: Add 3D Tilt Hook and State

Add the necessary imports and hook setup to enable 3D tilt effect.

### Phase 2: Update Component Structure

Update the motion.div wrapper to use the tilt ref, style, and handlers.

### Phase 3: Add Premium Effects

Add shine effect and corner accent animations, gated by performance settings.

### Phase 4: Testing

Verify visually that the card has 3D tilt, shine, and glow effects matching ModeCard.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: ADD imports to DailyChallengeBanner.tsx

- **IMPLEMENT:** Add imports for `useTiltEffect` and `useDevicePerformance` hooks, and `useState` for isHovered
- **PATTERN:** Reference `ModeCard.tsx:10-11` for imports
- **IMPORTS:**
  ```typescript
  import { useTiltEffect } from '@/hooks/useTiltEffect';
  import { useDevicePerformance } from '@/hooks/useDevicePerformance';
  ```
- **GOTCHA:** `useState` is already imported, just add the new hooks
- **VALIDATE:** `npm run lint`

### Task 2: ADD hook calls inside component

- **IMPLEMENT:** Add `isHovered` state, `useDevicePerformance` call, and `useTiltEffect` call with combined handlers
- **PATTERN:** Reference `ModeCard.tsx:69-90` for hook setup
- **LOCATION:** After the existing useState declarations (around line 41), before the useEffect hooks
- **CODE:**
  ```typescript
  const [isHovered, setIsHovered] = useState(false);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  // 3D tilt effect - slightly reduced for smaller banner
  const { ref: tiltRef, style: tiltStyle, handlers: tiltHandlers } = useTiltEffect<HTMLDivElement>({
    maxTilt: 12,
    hoverScale: 1.04,
    perspective: 800,
  });

  // Combined handlers for hover state
  const combinedHandlers = {
    ...tiltHandlers,
    onMouseEnter: () => {
      setIsHovered(true);
      tiltHandlers.onMouseEnter();
    },
    onMouseLeave: () => {
      setIsHovered(false);
      tiltHandlers.onMouseLeave();
    },
  };
  ```
- **GOTCHA:** The ref is named `tiltRef` to avoid conflicts, we'll use it on the outer div
- **VALIDATE:** `npm run lint`

### Task 3: UPDATE motion.div to use tilt ref and handlers

- **IMPLEMENT:**
  1. Change `<motion.div` to `<div ref={tiltRef} {...combinedHandlers}` wrapper
  2. Keep inner `<motion.div` for tap animation only (scale on tap)
  3. Add tiltStyle and hover glow to style prop
- **PATTERN:** Reference `ModeCard.tsx:131-166` for structure
- **CHANGES:**
  - Remove `whileHover={{ scale: 1.02 }}` (tilt hook handles scale)
  - Keep `whileTap={{ scale: 0.98 }}` for press feedback
  - Add `style` prop with tiltStyle and boxShadow for hover glow
  - Add the combinedHandlers spread
- **GOTCHA:** The tilt effect needs a regular div with ref, motion.div can be inside for tap
- **VALIDATE:** `npm run dev` - verify card tilts on hover

### Task 4: ADD shine effect and corner accent

- **IMPLEMENT:** Add the shine overlay and corner accent inside the card, after the sparkles animation
- **PATTERN:** Reference `ModeCard.tsx:304-333` for shine and corner effects
- **LOCATION:** After the existing sparkles animation block (around line 170), before the flex container
- **CODE:**
  ```typescript
  {/* Premium animated effects - same as ModeCard */}
  {enableComplexAnimations && !prefersReducedMotion && (
    <>
      {/* Shine effect on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo"
        initial={false}
        animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          initial={{ x: '-100%' }}
          animate={isHovered ? { x: '200%' } : { x: '-100%' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </motion.div>

      {/* Decorative corner accent */}
      <motion.div
        className="absolute top-0 right-0 w-12 h-12 pointer-events-none overflow-hidden rounded-neo"
        initial={false}
      >
        <motion.div
          className="absolute -top-6 -right-6 w-12 h-12 bg-white/10 rotate-45"
          animate={isHovered ? { scale: 1.2, opacity: 0.15 } : { scale: 1, opacity: 0.08 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </>
  )}
  ```
- **GOTCHA:** Size is w-12/h-12 (not w-16/h-16 like ModeCard) for smaller banner
- **VALIDATE:** `npm run dev` - verify shine sweeps across on hover

### Task 5: UPDATE hover glow style

- **IMPLEMENT:** Replace the current ring-based glow with a multi-layer boxShadow glow
- **CHANGES:**
  1. Remove the ring classes when not played: `ring-2 ring-neo-lime-dark/60 ring-offset-2 ring-offset-transparent`
  2. Add inline style for hover glow matching ModeCard pattern
- **CODE:** In the style prop:
  ```typescript
  style={{
    boxShadow: isHovered
      ? `0 0 25px rgba(191, 255, 0, 0.5), 0 0 50px rgba(191, 255, 0, 0.3), 6px 6px 0px rgb(var(--neo-black))`
      : undefined,
    ...tiltStyle,
  }}
  ```
- **GOTCHA:** The lime glow color `rgba(191, 255, 0, ...)` matches the neo-lime gradient
- **VALIDATE:** `npm run dev` - verify glow appears on hover

### Task 6: CLEANUP - Remove conflicting motion props

- **IMPLEMENT:** Remove the `whileHover` prop since tilt hook now handles scale
- **CHANGES:** Keep only `whileTap={{ scale: 0.98 }}` for press feedback
- **VALIDATE:** `npm run lint && npm run build`

---

## TESTING STRATEGY

### Visual Testing (Manual)

1. **Desktop:** Hover over the Daily Challenge card
   - Verify 3D tilt effect (card tilts toward mouse position)
   - Verify shine effect (gradient sweeps across on hover)
   - Verify corner accent (top-right white accent scales up)
   - Verify glow effect (lime green glow around card)
   - Verify scale increase on hover

2. **Mobile:** Touch and drag on the Daily Challenge card
   - Verify reduced tilt effect on touch (60% intensity)
   - Verify tap scale down works

3. **RTL (Hebrew):** Switch to Hebrew language
   - Verify tilt still works correctly
   - Verify hover states still work

4. **Reduced Motion:** Enable "reduce motion" in OS settings
   - Verify tilt effect is disabled
   - Verify shine/corner effects are disabled
   - Card should still be functional

### Automated Testing

No new tests needed - this is a visual enhancement with no logic changes.
The existing component functionality (link navigation, countdown, streak display) is unchanged.

---

## VALIDATION COMMANDS

### Level 1: Lint Check

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint
```

**Expected:** No new lint errors

### Level 2: TypeScript Check

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npx tsc --noEmit
```

**Expected:** No type errors

### Level 3: Build Check

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build
```

**Expected:** Build completes successfully

### Level 4: Visual Verification

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run dev
```

**Expected:**
- Navigate to landing page
- Hover over Daily Challenge card
- Verify 3D tilt, shine, and glow effects work

---

## ACCEPTANCE CRITERIA

- [ ] Daily Challenge card has 3D tilt effect on hover (tilts toward mouse)
- [ ] Daily Challenge card has shine effect on hover (gradient sweep)
- [ ] Daily Challenge card has corner accent animation on hover
- [ ] Daily Challenge card has lime-colored glow on hover
- [ ] Effects are disabled when user prefers reduced motion
- [ ] No lint errors
- [ ] No TypeScript errors
- [ ] Build passes successfully
- [ ] RTL mode still works correctly
- [ ] Mobile touch interactions work

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Manual visual testing confirms feature works
- [ ] Lint, type check, and build all pass
- [ ] RTL and reduced motion tested

---

## NOTES

### Design Rationale

**Why match ModeCard styling?**
- Visual consistency across landing page
- Premium game-like feel for all interactive elements
- Daily Challenge should feel as important as game mode selection

**Why slightly reduced tilt values?**
- Banner is smaller than ModeCard
- Too much tilt on small element feels jarring
- maxTilt: 12 (vs 18), hoverScale: 1.04 (vs 1.06)

**Why lime green glow color?**
- Matches the card's gradient (from-neo-lime via-lime-300 to-yellow-300)
- Creates cohesive visual effect
- `rgba(191, 255, 0, ...)` is the lime color in RGB

### Future Considerations

- Could add variant support for different glow colors based on `hasPlayed` state
- Corner accent could be RTL-flipped (left instead of right in Hebrew)
- Could add similar effect to the SSR placeholder for consistency

### Known Limitations

- 3D tilt is mouse/touch only, no keyboard interaction
- Shine effect doesn't work perfectly on very fast mouse movements
- Effects are disabled entirely when reduced motion is preferred (no fallback)
