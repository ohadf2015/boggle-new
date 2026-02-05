# Feature: Fix Black Screen in Adventure Mode Remotion Videos

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

The Remotion video compositions in adventure mode (VictoryCinematic, DefeatCinematic, BossEntranceCinematic, BossDefeatCinematic) are displaying black screens instead of animated content. This issue needs to be diagnosed and fixed to ensure smooth cinematic playback.

## User Story

As a player in adventure mode
I want to see victory/defeat/boss cinematics properly rendered
So that I have an engaging gaming experience with visual feedback

## Problem Statement

The adventure mode uses Remotion compositions for cinematics that are rendering as black screens. Based on analysis, the root causes are:

1. **Missing font loading** - The compositions use `fontFamily: 'Fredoka, sans-serif'` and `fontFamily: 'Rubik, sans-serif'` directly in CSS but don't use Remotion's `@remotion/google-fonts` package to ensure fonts are loaded before rendering. In Remotion, text won't render if fonts aren't loaded.

2. **Incomplete premounting** - Not all `<Sequence>` components have `premountFor` props, which is critical to prevent black frames during transitions.

3. **Player initialization timing** - The CinematicPlayer uses a 100ms timeout-based "ready" detection which may be unreliable.

## Solution Statement

1. Install and use `@remotion/google-fonts` to properly load Fredoka and Rubik fonts
2. Add `premountFor` to all Sequences in all cinematic components
3. Use `delayRender` and `continueRender` pattern to ensure composition is ready before playback

## Feature Metadata

**Feature Type:** Bug Fix
**Estimated Complexity:** Medium
**Primary Systems Affected:**
- `fe-next/components/adventure/cinematics/VictoryCinematic.tsx`
- `fe-next/components/adventure/cinematics/DefeatCinematic.tsx`
- `fe-next/components/adventure/boss/cinematics/BossEntranceCinematic.tsx`
- `fe-next/components/adventure/boss/cinematics/BossDefeatCinematic.tsx`
- `fe-next/components/adventure/boss/cinematics/CinematicPlayer.tsx`
**Dependencies:** `@remotion/google-fonts`

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `fe-next/components/adventure/cinematics/VictoryCinematic.tsx` (full file)
  - **WHY:** Main victory cinematic - needs font loading and premounting fixes
  - **PATTERN:** Uses Remotion AbsoluteFill, Sequence, interpolate, spring

- `fe-next/components/adventure/cinematics/DefeatCinematic.tsx` (full file)
  - **WHY:** Defeat cinematic - needs same fixes
  - **PATTERN:** Same Remotion patterns

- `fe-next/components/adventure/boss/cinematics/BossEntranceCinematic.tsx` (full file)
  - **WHY:** Boss entrance cinematic - needs font loading and premounting
  - **PATTERN:** Uses Remotion Img, staticFile, Sequence

- `fe-next/components/adventure/boss/cinematics/BossDefeatCinematic.tsx` (full file)
  - **WHY:** Boss defeat cinematic - needs same fixes
  - **PATTERN:** Complex particle effects, needs proper font loading

- `fe-next/components/adventure/boss/cinematics/CinematicPlayer.tsx` (lines 180-220)
  - **WHY:** Player wrapper that controls playback - may need delayRender pattern
  - **PATTERN:** Uses @remotion/player Player component

- `fe-next/hooks/useCinematic.ts` (full file)
  - **WHY:** Playback state management hook
  - **PATTERN:** Frame tracking, completion detection

### Relevant Documentation (MUST READ!)

- [Remotion Google Fonts](https://www.remotion.dev/docs/google-fonts)
  - **Section:** Loading fonts, waitUntilDone()
  - **WHY:** Critical for ensuring text renders properly

- [Remotion Sequence](https://www.remotion.dev/docs/sequence)
  - **Section:** premountFor prop
  - **WHY:** Prevents black frames during sequence transitions

- [Remotion delayRender](https://www.remotion.dev/docs/delay-render)
  - **Section:** Waiting for assets
  - **WHY:** Alternative pattern to ensure composition is ready

### Patterns to Follow

**Font Loading Pattern (CRITICAL):**

```tsx
// ✅ CORRECT: Use @remotion/google-fonts
import { loadFont } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadRubik } from "@remotion/google-fonts/Rubik";

const { fontFamily: fredokaFamily } = loadFont();
const { fontFamily: rubikFamily } = loadRubik();

// Use in styles
style={{ fontFamily: fredokaFamily }}
```

**Sequence Premounting Pattern:**

```tsx
// ✅ CORRECT: Always add premountFor
<Sequence from={60} durationInFrames={60} premountFor={15}>
  <MyComponent />
</Sequence>
```

**DelayRender Pattern (if needed):**

```tsx
import { delayRender, continueRender } from "remotion";

const [handle] = useState(() => delayRender("Loading assets"));

useEffect(() => {
  // When assets are loaded
  continueRender(handle);
}, []);
```

---

## IMPLEMENTATION PLAN

### Phase 1: Install Dependencies

Install the `@remotion/google-fonts` package to enable proper font loading.

**Tasks:**
- Install @remotion/google-fonts package

### Phase 2: Create Shared Font Loading Module

Create a centralized font loading module that can be imported by all cinematics.

**Tasks:**
- Create font loading utility file
- Export loaded font families

### Phase 3: Update All Cinematic Components

Update each cinematic component to use the font loading module and add proper premounting.

**Tasks:**
- Update VictoryCinematic with font loading and premounting
- Update DefeatCinematic with font loading and premounting
- Update BossEntranceCinematic with font loading and premounting
- Update BossDefeatCinematic with font loading and premounting

### Phase 4: Testing & Validation

Verify the cinematics render correctly.

**Tasks:**
- Test each cinematic in isolation
- Test full adventure mode flow
- Run existing tests

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: INSTALL @remotion/google-fonts package

- **IMPLEMENT:** Install the @remotion/google-fonts package using npm
- **COMMAND:** `cd fe-next && npm install @remotion/google-fonts@^4.0.414`
- **VALIDATE:** `cd fe-next && npm list @remotion/google-fonts`

### Task 2: CREATE shared font loading module

- **IMPLEMENT:** Create `fe-next/lib/remotion/fonts.ts` to centralize font loading
- **PATTERN:** Use @remotion/google-fonts loadFont pattern
- **CONTENT:**
```tsx
/**
 * Remotion Font Loading
 *
 * Centralized font loading for all Remotion cinematics.
 * Uses @remotion/google-fonts to ensure fonts are loaded before rendering.
 */

import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadRubik } from "@remotion/google-fonts/Rubik";

// Load Fredoka font (display/heading font)
export const { fontFamily: fredokaFamily, waitUntilDone: waitForFredoka } = loadFredoka("normal", {
  weights: ["400", "700"],
  subsets: ["latin", "hebrew"],
});

// Load Rubik font (body font)
export const { fontFamily: rubikFamily, waitUntilDone: waitForRubik } = loadRubik("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin", "hebrew"],
});

/**
 * Wait for all cinematic fonts to be loaded
 */
export async function waitForAllFonts(): Promise<void> {
  await Promise.all([waitForFredoka(), waitForRubik()]);
}
```
- **VALIDATE:** `cd fe-next && npx tsc --noEmit lib/remotion/fonts.ts 2>/dev/null || echo "Checking types..."`

### Task 3: UPDATE VictoryCinematic with font loading and premounting

- **IMPLEMENT:**
  1. Import font families from shared module
  2. Replace hardcoded fontFamily strings with imported variables
  3. Add `premountFor={15}` to ALL Sequences that don't have it
  4. Ensure consistent FPS usage (30fps = 15 frames = 0.5s premount)
- **FILE:** `fe-next/components/adventure/cinematics/VictoryCinematic.tsx`
- **CHANGES:**
  - Add import: `import { fredokaFamily, rubikFamily } from '../../../lib/remotion/fonts';`
  - Line ~95: Change `fontFamily: 'Fredoka, sans-serif'` to `fontFamily: fredokaFamily`
  - Line ~145: Change `fontFamily: 'Rubik, sans-serif'` to `fontFamily: rubikFamily`
  - Line ~157: Change `fontFamily: 'Fredoka, sans-serif'` to `fontFamily: fredokaFamily`
  - Line ~239-252: Change `fontFamily: 'Fredoka, sans-serif'` to `fontFamily: fredokaFamily`
  - Line ~278: Change `fontFamily: 'Fredoka, sans-serif'` to `fontFamily: fredokaFamily`
  - Line ~308: Add `premountFor={15}` to stats Sequence if missing
  - Line ~347: Add `premountFor={15}` to sparkle particles Sequence if missing
- **GOTCHA:** The Remotion font families include fallbacks automatically - don't add 'sans-serif' manually
- **VALIDATE:** `cd fe-next && npm run lint -- --fix components/adventure/cinematics/VictoryCinematic.tsx`

### Task 4: UPDATE DefeatCinematic with font loading and premounting

- **IMPLEMENT:**
  1. Import font families from shared module
  2. Replace hardcoded fontFamily strings with imported variables
  3. Add `premountFor={15}` to ALL Sequences
- **FILE:** `fe-next/components/adventure/cinematics/DefeatCinematic.tsx`
- **CHANGES:**
  - Add import: `import { fredokaFamily, rubikFamily } from '../../../lib/remotion/fonts';`
  - Replace all `fontFamily: 'Fredoka, sans-serif'` with `fontFamily: fredokaFamily`
  - Replace all `fontFamily: 'Rubik, sans-serif'` with `fontFamily: rubikFamily`
  - Add `premountFor={15}` to Sequences at lines ~170, ~203, ~235, ~274 if missing
- **VALIDATE:** `cd fe-next && npm run lint -- --fix components/adventure/cinematics/DefeatCinematic.tsx`

### Task 5: UPDATE BossEntranceCinematic with font loading and premounting

- **IMPLEMENT:**
  1. Import font families from shared module
  2. Replace hardcoded fontFamily strings with imported variables
  3. Add `premountFor={15}` to ALL Sequences
- **FILE:** `fe-next/components/adventure/boss/cinematics/BossEntranceCinematic.tsx`
- **CHANGES:**
  - Add import: `import { fredokaFamily, rubikFamily } from '../../../../lib/remotion/fonts';`
  - Replace all `fontFamily: 'Fredoka, sans-serif'` with `fontFamily: fredokaFamily`
  - Replace all `fontFamily: 'Rubik, sans-serif'` with `fontFamily: rubikFamily`
  - Add `premountFor={15}` to Sequences at lines ~237, ~245, ~255, ~281, ~304, ~350, ~375 if missing
- **VALIDATE:** `cd fe-next && npm run lint -- --fix components/adventure/boss/cinematics/BossEntranceCinematic.tsx`

### Task 6: UPDATE BossDefeatCinematic with font loading and premounting

- **IMPLEMENT:**
  1. Import font families from shared module
  2. Replace hardcoded fontFamily strings with imported variables
  3. Add `premountFor={15}` to ALL Sequences
- **FILE:** `fe-next/components/adventure/boss/cinematics/BossDefeatCinematic.tsx`
- **CHANGES:**
  - Add import: `import { fredokaFamily, rubikFamily } from '../../../../lib/remotion/fonts';`
  - Replace all `fontFamily: 'Fredoka, sans-serif'` with `fontFamily: fredokaFamily`
  - Replace all `fontFamily: 'Rubik, sans-serif'` with `fontFamily: rubikFamily`
  - Add `premountFor={15}` to ALL Sequences throughout the file
- **VALIDATE:** `cd fe-next && npm run lint -- --fix components/adventure/boss/cinematics/BossDefeatCinematic.tsx`

### Task 7: RUN full validation suite

- **IMPLEMENT:** Run lint, type check, tests, and build
- **VALIDATE:**
```bash
cd fe-next && npm run lint && npx tsc --noEmit && npm run test -- --testPathPattern="cinematic|Cinematic" --passWithNoTests && npm run build
```

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**

- Existing tests in `fe-next/components/adventure/cinematics/__tests__/` and `fe-next/components/adventure/boss/cinematics/__tests__/` should continue to pass
- Font families should be properly exported from the fonts module

**Manual Testing:**

1. Start dev server: `cd fe-next && npm run dev`
2. Navigate to adventure mode
3. Complete a level - verify VictoryCinematic renders (not black screen)
4. Fail a level - verify DefeatCinematic renders
5. Start a boss fight - verify BossEntranceCinematic renders
6. Complete a boss fight - verify BossDefeatCinematic renders

### Edge Cases

- Fast forward/skip should still work
- Reduced motion users should still skip animations
- RTL (Hebrew) should still render correctly with fonts

---

## VALIDATION COMMANDS

**Execute every command to ensure zero regressions:**

### Level 1: Package Installation

```bash
cd fe-next && npm list @remotion/google-fonts
```

**Expected:** Package is installed at version ~4.0.414

### Level 2: Type Check

```bash
cd fe-next && npx tsc --noEmit
```

**Expected:** No type errors

### Level 3: Lint Check

```bash
cd fe-next && npm run lint
```

**Expected:** No lint errors

### Level 4: Unit Tests

```bash
cd fe-next && npm run test -- --testPathPattern="cinematic|Cinematic" --passWithNoTests
```

**Expected:** All tests pass

### Level 5: Build Check

```bash
cd fe-next && npm run build
```

**Expected:** Build succeeds

### Level 6: Manual Validation

1. Run `cd fe-next && npm run dev`
2. Open browser to http://localhost:3000
3. Navigate to adventure mode
4. Complete a level and verify cinematic plays with visible text (not black screen)

---

## ACCEPTANCE CRITERIA

- [ ] `@remotion/google-fonts` is installed
- [ ] Font loading module exists at `fe-next/lib/remotion/fonts.ts`
- [ ] All cinematic components use imported font families (not hardcoded strings)
- [ ] All `<Sequence>` components have `premountFor` props
- [ ] Lint passes with no errors
- [ ] TypeScript compiles with no errors
- [ ] Existing tests pass
- [ ] Build succeeds
- [ ] Manual testing confirms cinematics render properly (no black screens)

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met

---

## NOTES

**Design Rationale:**

- **Why @remotion/google-fonts?** Remotion's font loading system ensures fonts are fully loaded before any frame renders, preventing invisible text. Using CSS font-family fallbacks doesn't work because Remotion needs fonts available synchronously during render.

- **Why premountFor on all Sequences?** Remotion renders frames in isolation - if a component isn't premounted before its appearance, the first few frames may be blank while React mounts the component. 15 frames (0.5s at 30fps) is sufficient premount time.

- **Alternatives considered:**
  - Using `delayRender` + `continueRender` for font loading - this would work but is more complex and requires changes to CinematicPlayer. The @remotion/google-fonts approach is cleaner.
  - Pre-rendering videos to MP4 - this would work but loses the dynamic props capability and increases bundle size.

**Future Considerations:**

- If more fonts are needed, add them to `lib/remotion/fonts.ts`
- Consider creating a test utility for rendering Remotion compositions in tests
