# Feature: GIF Mascot Background Removal and Integration

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Process the 4 existing GIF mascots (`main.gif`, `play.gif`, `study.gif`, `oops.gif`) to remove their backgrounds using a Python script that handles frame-by-frame processing of animated GIFs. Then integrate these background-removed GIFs into the LexiClash game to replace corresponding static PNG mascots in appropriate contexts.

## User Story

As a game developer
I want to process GIF mascot files to remove backgrounds and use them in the game
So that the mascot animations are more visually polished and integrate seamlessly with the neo-brutalist dark theme

## Problem Statement

The game currently has 4 GIF mascot files in `public/mascot/`:
- `main.gif` (1.6MB) - Should represent happy/idle state
- `play.gif` (3.4MB) - Should represent gaming/excited gameplay
- `study.gif` (2.7MB) - Should represent thinking/focused states
- `oops.gif` (2.8MB) - Should represent errors/mistakes

These GIFs currently have backgrounds that clash with the dark neo-brutalist theme. They need frame-by-frame background removal to achieve transparency, then integration into the mascot system to replace static PNG variants in appropriate game contexts.

## Solution Statement

Create a Python script that processes animated GIF files frame-by-frame to remove backgrounds using the `rembg` library, preserving animation timing and transparency. Then update the mascot component system to support GIF variants, mapping each processed GIF to appropriate game contexts (happy, gaming, thinking, oops), and update components throughout the app to use animated GIFs instead of static PNGs where contextually appropriate.

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Medium
**Primary Systems Affected:**
- Python scripts (background removal)
- Mascot component system (`Mascot.tsx`, `InteractiveMascot.tsx`, `IdleMascot.tsx`)
- Image assets and type definitions
**Dependencies:**
- `rembg` (Python library for background removal)
- `Pillow` (Python imaging library)
- `imageio` (for GIF processing)

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `.claude/agents/context/prime-context.md` - COMPLETE codebase overview
  - **WHY:** Contains all project patterns, configurations, and architecture
  - **ACTION:** Read this file first to understand the codebase

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `components/ui/Mascot.tsx` (lines 1-100)
  - **WHY:** Defines `MascotVariant` types and `MASCOT_IMAGES` mapping
  - **PATTERN:** Static image paths mapped to variant names
  - **CRITICAL:** This is the source of truth for mascot image paths

- `components/ui/InteractiveMascot.tsx` (lines 1-50, 215-225, 405-450)
  - **WHY:** Shows how mascots are rendered with interactions and animations
  - **PATTERN:** Uses `Image` from Next.js, supports hover/click states
  - **CRITICAL:** Must preserve animation system while adding GIF support

- `components/ui/IdleMascot.tsx` (lines 1-110)
  - **WHY:** Random activity animations during idle time
  - **PATTERN:** Cycles through base variants and activities
  - **CRITICAL:** GIFs should integrate with existing idle animation logic

- `hooks/useRandomMascotActivity.ts`
  - **WHY:** Logic for random mascot activity selection
  - **PATTERN:** Timer-based variant switching
  - **NOTE:** GIF animations are built-in, this hook cycles variants

- `scripts/remove_mascot_bg.py`
  - **WHY:** Existing background removal for static PNG images
  - **PATTERN:** Uses `rembg.remove()` on single images
  - **LIMITATION:** Does NOT handle GIF frame-by-frame processing

- `scripts/batch_remove_bg.py`
  - **WHY:** Batch processing pattern with backups and error handling
  - **PATTERN:** Iterates files, creates backups, processes, replaces
  - **NOTE:** Good pattern to mirror for GIF batch processing

- `components/ui/MASCOT_GUIDE.md`
  - **WHY:** Documentation for mascot usage patterns
  - **ACTION:** Update with GIF variant documentation after implementation

- `CLAUDE.md` (lines 60-80)
  - **WHY:** Neo-Brutalist design system - dark theme, hard shadows
  - **CRITICAL:** GIFs must work with dark backgrounds (transparency required)

### New Files to Create

- `scripts/remove_gif_background.py` - Frame-by-frame GIF background removal script
- `scripts/optimize_processed_gifs.py` - GIF optimization for web (file size reduction)

### Files to Modify

- `components/ui/Mascot.tsx` - Add GIF variant support
- `components/ui/InteractiveMascot.tsx` - Handle GIF rendering
- `components/ui/IdleMascot.tsx` - Update variant mapping for GIFs
- `components/ui/MASCOT_GUIDE.md` - Document GIF usage

### Relevant Documentation (MUST READ!)

- [rembg Documentation](https://github.com/danielgatis/rembg)
  - **Section:** API Reference
  - **WHY:** Background removal library we're using

- [Pillow GIF Documentation](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#gif)
  - **Section:** GIF file format handling
  - **WHY:** Frame extraction and reconstruction for animated GIFs

- [imageio Documentation](https://imageio.readthedocs.io/en/stable/userapi.html)
  - **Section:** Reading and writing GIF files
  - **WHY:** Recommended library for preserving GIF animation metadata

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
  - **Section:** Animated image support
  - **WHY:** Understand how Next.js handles GIF files

### Patterns to Follow

**GIF Context Mapping (from user clarification):**

```typescript
// Map GIF files to mascot variants
const GIF_VARIANT_MAPPING = {
  'main.gif': 'happy',      // Happy/idle state
  'play.gif': 'gaming',     // Gaming/excited gameplay
  'study.gif': 'thinking',  // Thinking/focused states
  'oops.gif': 'oops',       // Errors/mistakes
};
```

**Python GIF Processing Pattern:**

```python
# ✅ GOOD: Frame-by-frame processing with metadata preservation
import imageio.v3 as iio
from rembg import remove
from PIL import Image
import io

def process_gif_frames(input_path, output_path):
    # Read GIF with metadata
    frames = iio.imread(input_path, plugin='pillow')
    metadata = iio.immeta(input_path)

    processed_frames = []
    for frame in frames:
        # Convert frame to bytes
        img = Image.fromarray(frame)
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')

        # Remove background
        output_bytes = remove(img_bytes.getvalue())

        # Convert back to array
        processed_img = Image.open(io.BytesIO(output_bytes))
        processed_frames.append(processed_img)

    # Save with original timing
    iio.imwrite(output_path, processed_frames,
                duration=metadata.get('duration', 100),
                loop=0)  # Infinite loop
```

**Next.js Image Component for GIF:**

```tsx
// ✅ GOOD: GIF rendering with Next.js Image
import Image from 'next/image';

<Image
  src="/mascot/main.gif"
  alt="Lexi mascot - happy"
  width={128}
  height={128}
  className="object-contain"
  unoptimized={true}  // CRITICAL: Next.js doesn't optimize GIFs
  priority={true}     // For above-fold GIFs
/>
```

**TypeScript Variant Extension:**

```typescript
// ✅ GOOD: Extend MascotVariant to support GIF variants
export type MascotVariant =
  | 'happy'           // Can be PNG or GIF
  | 'gaming'          // Can be PNG or GIF
  | 'thinking'        // Can be PNG or GIF
  | 'oops'            // Can be PNG or GIF
  // ... other variants

// Determine if variant should use GIF
export const GIF_VARIANTS = new Set<MascotVariant>([
  'happy',
  'gaming',
  'thinking',
  'oops',
]);

export function getMascotImagePath(variant: MascotVariant): string {
  if (GIF_VARIANTS.has(variant)) {
    // Map to GIF file
    const gifMap: Record<string, string> = {
      'happy': '/mascot/main-nobg.gif',
      'gaming': '/mascot/play-nobg.gif',
      'thinking': '/mascot/study-nobg.gif',
      'oops': '/mascot/oops-nobg.gif',
    };
    return gifMap[variant] || MASCOT_IMAGES[variant];
  }
  return MASCOT_IMAGES[variant];
}
```

**Error Handling Pattern (from existing scripts):**

```python
# ✅ GOOD: Robust error handling with backups
def process_with_backup(input_path, output_path):
    backup_path = input_path.with_suffix('.gif.backup')

    # Create backup
    shutil.copy2(input_path, backup_path)

    try:
        # Process file
        process_gif_frames(str(input_path), str(output_path))
        print(f"✓ Successfully processed: {input_path.name}")
        return True
    except Exception as e:
        print(f"✗ Error processing {input_path.name}: {e}")
        # Restore backup on failure
        if backup_path.exists():
            backup_path.replace(input_path)
        return False
```

---

## IMPLEMENTATION PLAN

### Phase 1: Python Script Development

Create GIF-specific background removal script with frame-by-frame processing capabilities.

**Tasks:**

- Implement frame extraction and reconstruction logic
- Add rembg processing for each frame
- Preserve animation timing and metadata
- Handle errors gracefully with backups

**Order:** Must be completed first before Phase 2.

### Phase 2: GIF Processing Execution

Process the 4 existing GIF mascots to remove backgrounds.

**Tasks:**

- Run script on `main.gif`, `play.gif`, `study.gif`, `oops.gif`
- Verify background removal quality
- Optimize processed GIFs for web (file size reduction)
- Validate animations play correctly

**Order:** Depends on Phase 1 completion.

### Phase 3: Mascot Component System Integration

Update TypeScript components to support GIF variants alongside PNG variants.

**Tasks:**

- Extend `MascotVariant` type system to support GIFs
- Add GIF path mapping logic
- Update `InteractiveMascot` to handle GIF rendering
- Ensure `IdleMascot` works with GIF animations
- Add `unoptimized={true}` for Next.js Image components

**Order:** Depends on Phase 2 completion (need processed GIFs to test).

### Phase 4: Testing & Validation

Comprehensive testing of GIF integration across all mascot components.

**Tasks:**

- Test GIF rendering in different contexts (landing, game, errors)
- Validate performance (file sizes, animation smoothness)
- Check RTL support (Hebrew)
- Test accessibility (reduced motion preference)
- Verify dark theme integration

**Order:** Can be done incrementally with Phase 3.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE `scripts/remove_gif_background.py`

- **IMPLEMENT:** Frame-by-frame GIF background removal using `imageio` + `rembg`
- **PATTERN:** Mirror error handling from `scripts/batch_remove_bg.py:49-95`
- **IMPORTS:** `imageio.v3`, `rembg.remove`, `PIL.Image`, `pathlib.Path`, `shutil`
- **GOTCHA:** GIF frames must preserve timing metadata (duration per frame)
- **GOTCHA:** Use `imageio` not `Pillow` directly - better GIF metadata preservation
- **GOTCHA:** Must handle variable frame durations (some GIFs have different timing per frame)
- **VALIDATE:** `python3 scripts/remove_gif_background.py --help` shows usage

### Task 2: IMPLEMENT frame extraction logic in `remove_gif_background.py`

- **IMPLEMENT:** Function to extract all frames from input GIF with metadata
- **PATTERN:** Use `imageio.v3.imread()` with `plugin='pillow'` for best compatibility
- **GOTCHA:** Some GIFs have palette mode - convert to RGBA before processing
- **GOTCHA:** Store original duration, loop count, and disposal method
- **VALIDATE:** `python3 -c "import imageio.v3 as iio; print(iio.imread('public/mascot/main.gif').shape)"` succeeds

### Task 3: IMPLEMENT background removal per frame in `remove_gif_background.py`

- **IMPLEMENT:** Loop through frames, apply `rembg.remove()` to each
- **PATTERN:** Convert frame to PNG bytes → rembg → PIL Image → append to list
- **GOTCHA:** `rembg.remove()` expects bytes input, returns bytes output
- **GOTCHA:** Must maintain frame order and timing
- **VALIDATE:** Test on single frame first before full GIF processing

### Task 4: IMPLEMENT GIF reconstruction with metadata in `remove_gif_background.py`

- **IMPLEMENT:** Reassemble processed frames into output GIF with original timing
- **PATTERN:** Use `imageio.v3.imwrite()` with duration and loop parameters
- **GOTCHA:** Duration can be single value (all frames) or array (per frame)
- **GOTCHA:** Set `loop=0` for infinite loop (standard for mascot animations)
- **VALIDATE:** `python3 scripts/remove_gif_background.py public/mascot/main.gif public/mascot/main-test.gif` creates valid GIF

### Task 5: ADD batch processing mode to `remove_gif_background.py`

- **IMPLEMENT:** `--batch` flag to process all GIFs in `public/mascot/`
- **PATTERN:** Mirror structure from `scripts/batch_remove_bg.py:49-104`
- **GOTCHA:** Create backups before processing (`.gif.backup` extension)
- **GOTCHA:** Skip files already processed (check for `-nobg.gif` suffix)
- **VALIDATE:** `python3 scripts/remove_gif_background.py --batch --dry-run` lists files to process

### Task 6: ADD progress reporting to `remove_gif_background.py`

- **IMPLEMENT:** Frame-by-frame progress output (e.g., "Frame 15/120")
- **PATTERN:** Print status after each frame: `print(f"Frame {i+1}/{total}", end='\r')`
- **GOTCHA:** Use `\r` for same-line updates, `\n` for final message
- **VALIDATE:** Run on `main.gif` and verify frame count progress displays

### Task 7: RUN background removal on all 4 GIF mascots

- **IMPLEMENT:** Execute `python3 scripts/remove_gif_background.py --batch`
- **OUTPUT:** Creates `main-nobg.gif`, `play-nobg.gif`, `study-nobg.gif`, `oops-nobg.gif`
- **GOTCHA:** Process takes 5-15 minutes per GIF (120+ frames each)
- **GOTCHA:** Memory usage can spike - process one at a time if needed
- **VALIDATE:** `ls -lh public/mascot/*-nobg.gif` shows all 4 processed files
- **VALIDATE:** Open each GIF in browser to verify transparency and animation

### Task 8: CREATE `scripts/optimize_processed_gifs.py`

- **IMPLEMENT:** GIF optimization script using `gifsicle` or `Pillow` optimization
- **PATTERN:** Reduce file size while preserving quality (target <500KB per GIF)
- **IMPORTS:** `subprocess` (for gifsicle) or `Pillow.Image.save(optimize=True)`
- **GOTCHA:** GIFs can be 2-3MB after processing - need optimization for web
- **VALIDATE:** `python3 scripts/optimize_processed_gifs.py --help` shows usage

### Task 9: RUN optimization on processed GIFs

- **IMPLEMENT:** Execute optimization on all `-nobg.gif` files
- **PATTERN:** `gifsicle -O3 --lossy=80 input.gif -o output.gif`
- **GOTCHA:** Balance quality vs. file size - target 80% lossy compression
- **VALIDATE:** Compare file sizes before/after optimization
- **VALIDATE:** Verify animations still play smoothly after optimization

### Task 10: UPDATE `components/ui/Mascot.tsx` - Add GIF variant mapping

- **IMPLEMENT:** Add `GIF_VARIANTS` Set and `getMascotImagePath()` helper
- **PATTERN:** See "TypeScript Variant Extension" pattern above
- **IMPORTS:** No new imports needed
- **GOTCHA:** Must maintain backward compatibility - PNGs still work for other variants
- **VALIDATE:** `npm run build` succeeds with no type errors

### Task 11: UPDATE `components/ui/Mascot.tsx` - Export GIF utilities

- **IMPLEMENT:** Export `GIF_VARIANTS` and `getMascotImagePath()` for use in other components
- **PATTERN:** Add to existing exports at bottom of file
- **VALIDATE:** TypeScript compilation succeeds

### Task 12: UPDATE `components/ui/InteractiveMascot.tsx` - Use GIF paths

- **IMPLEMENT:** Replace `MASCOT_IMAGES[variant]` with `getMascotImagePath(variant)`
- **PATTERN:** Find line ~453: `const imageSrc = getImageSource(currentVariant);`
- **GOTCHA:** Must import `getMascotImagePath` from `./Mascot`
- **VALIDATE:** Component renders without TypeScript errors

### Task 13: UPDATE `components/ui/InteractiveMascot.tsx` - Add unoptimized prop for GIFs

- **IMPLEMENT:** Conditionally add `unoptimized={true}` when rendering GIF variants
- **PATTERN:** Check if `imageSrc.endsWith('.gif')` then add prop
- **GOTCHA:** Next.js doesn't optimize GIFs - must set `unoptimized={true}`
- **VALIDATE:** No console warnings about GIF optimization in browser

### Task 14: UPDATE `components/ui/IdleMascot.tsx` - Support GIF variants

- **IMPLEMENT:** Import and use `getMascotImagePath()` for variant rendering
- **PATTERN:** Similar to InteractiveMascot changes
- **GOTCHA:** Idle animation timing should complement GIF animation (not conflict)
- **VALIDATE:** `npm run build` succeeds

### Task 15: CREATE test file `__tests__/gif-mascot-integration.test.tsx`

- **IMPLEMENT:** Unit tests for GIF variant mapping and rendering
- **PATTERN:** Follow existing test structure in `components/ui/__tests__/`
- **IMPORTS:** `@testing-library/react`, `jest`
- **VALIDATE:** `npm run test:frontend -- gif-mascot-integration.test.tsx` passes

### Task 16: TEST GIF rendering in Landing page

- **IMPLEMENT:** Verify `main.gif` (happy variant) renders on landing page
- **PATTERN:** Check `components/landing/LandingView.tsx` for mascot usage
- **GOTCHA:** May need to clear Next.js cache: `rm -rf .next`
- **VALIDATE:** Open `http://localhost:3001` and verify animated GIF displays

### Task 17: TEST GIF rendering in Error states

- **IMPLEMENT:** Verify `oops.gif` renders in error scenarios
- **PATTERN:** Check `components/ErrorBanner.tsx` and `app/[locale]/not-found.tsx`
- **VALIDATE:** Trigger error state and verify `oops-nobg.gif` displays with animation

### Task 18: TEST GIF rendering in Game context

- **IMPLEMENT:** Verify `play.gif` (gaming variant) renders during gameplay
- **PATTERN:** Check `components/singleplayer/SinglePlayerGame.tsx` mascot usage
- **VALIDATE:** Start game and verify `play-nobg.gif` displays

### Task 19: TEST GIF rendering in Brain Training

- **IMPLEMENT:** Verify `study.gif` (thinking variant) renders in brain training
- **PATTERN:** Check `app/[locale]/brain/page.tsx` for mascot usage
- **VALIDATE:** Navigate to brain training and verify `study-nobg.gif` displays

### Task 20: UPDATE `components/ui/MASCOT_GUIDE.md` - Document GIF variants

- **IMPLEMENT:** Add section explaining GIF variants and when they're used
- **PATTERN:** Follow existing documentation structure
- **GOTCHA:** Explain that GIFs auto-animate, no `animated` prop needed
- **VALIDATE:** Read documentation - verify clarity and completeness

### Task 21: TEST performance with DevTools

- **IMPLEMENT:** Measure GIF file size impact and animation performance
- **PATTERN:** Use Chrome DevTools Network tab + Performance tab
- **GOTCHA:** GIFs should be <500KB each after optimization
- **VALIDATE:** Record metrics: file sizes, FPS during animation, memory usage

### Task 22: TEST RTL support (Hebrew)

- **IMPLEMENT:** Verify GIF mascots render correctly in Hebrew (RTL) layout
- **PATTERN:** Switch language to Hebrew (`he`) in app
- **GOTCHA:** Mascots should NOT mirror (unlike text)
- **VALIDATE:** All GIF mascots display correctly in RTL mode

### Task 23: TEST accessibility - Reduced Motion

- **IMPLEMENT:** Verify GIFs respect `prefers-reduced-motion` preference
- **PATTERN:** Check `useDevicePerformance` hook integration
- **GOTCHA:** GIFs always animate - may need to show static frame if user prefers reduced motion
- **VALIDATE:** Enable reduced motion in OS settings, verify behavior

### Task 24: ADD fallback for GIF loading failures

- **IMPLEMENT:** Graceful degradation to PNG if GIF fails to load
- **PATTERN:** Use Next.js Image `onError` callback to fallback
- **GOTCHA:** Must handle both network errors and unsupported GIF formats
- **VALIDATE:** Simulate GIF load failure, verify PNG fallback displays

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**

- Test `getMascotImagePath()` returns correct paths for GIF variants
- Test `getMascotImagePath()` returns PNG paths for non-GIF variants
- Test backward compatibility (existing PNG variants still work)
- Use Jest + React Testing Library

**Pattern:**

```typescript
// ✅ GOOD: Test GIF variant mapping
describe('getMascotImagePath', () => {
  it('should return GIF path for happy variant', () => {
    expect(getMascotImagePath('happy')).toBe('/mascot/main-nobg.gif');
  });

  it('should return PNG path for non-GIF variant', () => {
    expect(getMascotImagePath('celebrating')).toBe('/mascot/lexi-celebrating.png');
  });

  it('should handle all GIF variants correctly', () => {
    const gifVariants: MascotVariant[] = ['happy', 'gaming', 'thinking', 'oops'];

    gifVariants.forEach(variant => {
      const path = getMascotImagePath(variant);
      expect(path).toContain('-nobg.gif');
    });
  });
});
```

### Integration Tests

**Scope and Requirements:**

- Test GIF rendering in actual components (Mascot, InteractiveMascot, IdleMascot)
- Test Next.js Image component handles GIFs correctly
- Test `unoptimized` prop is applied for GIFs
- Use React Testing Library with jsdom

**Pattern:**

```typescript
// ✅ GOOD: Test GIF rendering with Next.js Image
describe('InteractiveMascot with GIF', () => {
  it('should render GIF variant with unoptimized prop', () => {
    render(<InteractiveMascot variant="happy" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('main-nobg.gif'));
    // Note: unoptimized prop doesn't appear in DOM, it's a Next.js internal flag
  });

  it('should render PNG variant for non-GIF mascots', () => {
    render(<InteractiveMascot variant="celebrating" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('lexi-celebrating.png'));
  });
});
```

### Manual Testing

**Scope and Requirements:**

- Verify GIF animations play smoothly across all browsers
- Test file sizes are acceptable (<500KB per GIF)
- Verify transparency looks good on dark backgrounds
- Test performance on low-end devices
- Verify reduced motion preference is respected

**Checklist:**

- [ ] `main-nobg.gif` displays on landing page with smooth animation
- [ ] `play-nobg.gif` displays during gameplay
- [ ] `study-nobg.gif` displays in brain training
- [ ] `oops-nobg.gif` displays on error pages
- [ ] All GIFs have transparent backgrounds (no white/colored bg)
- [ ] File sizes are optimized (<500KB each)
- [ ] Animations loop smoothly (no stuttering)
- [ ] RTL layout works correctly (Hebrew)
- [ ] Reduced motion preference disables or simplifies GIF display

### Edge Cases

**List specific edge cases that must be tested for this feature:**

- GIF file fails to load (network error) → Should fallback to PNG
- Browser doesn't support GIF → Should fallback to PNG
- GIF file corrupted → Should show error and fallback
- Slow network → GIF should show loading state then animate
- Multiple mascots on page → Should not degrade performance
- Page with both PNG and GIF mascots → Both should work simultaneously
- Switching variants rapidly → Should not cause memory leaks

---

## VALIDATION COMMANDS

**⚠️ CRITICAL: This is a frontend-only feature - no backend validation needed**

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 0: Python Dependencies Check

```bash
python3 -c "import imageio, rembg, PIL; print('✅ All dependencies installed')"
```

**Expected:** ✅ All dependencies installed
**If fails:** Install with `pip3 install imageio rembg pillow`

### Level 1: Script Validation

```bash
python3 scripts/remove_gif_background.py --help
```

**Expected:** Usage instructions displayed with `--batch` and `--dry-run` options

### Level 2: GIF Processing (Dry Run)

```bash
python3 scripts/remove_gif_background.py --batch --dry-run
```

**Expected:** Lists 4 GIF files to process (main.gif, play.gif, study.gif, oops.gif)

### Level 3: TypeScript Compilation

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build
```

**Expected:** Build succeeds with no TypeScript errors

### Level 4: Frontend Unit Tests

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test:frontend -- gif-mascot
```

**Expected:** All GIF mascot integration tests pass

### Level 5: Linting

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint
```

**Expected:** No linting errors related to mascot components

### Level 6: File Size Validation

```bash
ls -lh /Users/ohadfisher/git/boggle-new/fe-next/public/mascot/*-nobg.gif
```

**Expected:** All processed GIFs are <500KB each (after optimization)

### Level 7: GIF Integrity Check

```bash
for gif in /Users/ohadfisher/git/boggle-new/fe-next/public/mascot/*-nobg.gif; do
  file "$gif" | grep -q "GIF image data" && echo "✅ Valid GIF: $(basename $gif)" || echo "❌ Invalid: $(basename $gif)"
done
```

**Expected:** All 4 GIFs are valid (✅ Valid GIF messages)

### Level 8: Visual Regression Test (Manual)

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run dev
```

**Then manually:**
1. Open `http://localhost:3001`
2. Verify `main-nobg.gif` displays with animation
3. Navigate to game, verify `play-nobg.gif` displays
4. Navigate to brain training, verify `study-nobg.gif` displays
5. Trigger error state, verify `oops-nobg.gif` displays
6. All GIFs should have transparent backgrounds and smooth animations

---

## ACCEPTANCE CRITERIA

- [ ] Python script processes all 4 GIF mascots with frame-by-frame background removal
- [ ] All processed GIFs have transparent backgrounds (no white/colored backgrounds)
- [ ] GIF file sizes are optimized (<500KB each after optimization)
- [ ] TypeScript mascot components support both GIF and PNG variants
- [ ] `main.gif` (happy) displays on landing page with animation
- [ ] `play.gif` (gaming) displays during gameplay with animation
- [ ] `study.gif` (thinking) displays in brain training with animation
- [ ] `oops.gif` (errors) displays on error pages with animation
- [ ] All GIF animations loop smoothly (no stuttering or frame drops)
- [ ] Next.js Image component uses `unoptimized={true}` for GIFs
- [ ] Backward compatibility maintained (existing PNG mascots still work)
- [ ] RTL support verified (Hebrew layout displays GIFs correctly)
- [ ] Reduced motion preference respected (accessibility)
- [ ] Unit tests pass with ≥80% coverage for new code
- [ ] Build succeeds with no TypeScript errors
- [ ] Linting passes with no errors
- [ ] Documentation updated in MASCOT_GUIDE.md

---

## COMPLETION CHECKLIST

- [ ] All 24 tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All 8 validation levels executed successfully
- [ ] Full test suite passes (unit tests)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms all 4 GIFs work correctly
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability
- [ ] Performance verified (file sizes, animation smoothness)
- [ ] Accessibility tested (reduced motion, keyboard navigation)
- [ ] Documentation complete and accurate

---

## NOTES

**Design Rationale:**

**Why frame-by-frame processing?**
- Animated GIFs contain multiple frames (typically 30-120 frames)
- Each frame needs independent background removal
- Must preserve timing metadata (duration per frame)
- This is MORE complex than static PNG processing

**Why use `imageio` instead of `Pillow` directly?**
- `imageio.v3` has better GIF metadata preservation
- Easier to work with frame sequences
- Better handling of variable frame durations

**Why add `unoptimized={true}` for Next.js Image?**
- Next.js Image Optimization doesn't support animated GIFs
- Without `unoptimized`, Next.js will convert GIF to static image
- This prop bypasses optimization and serves GIF as-is

**Alternatives considered:**

**Alternative 1: Convert GIFs to video (WebM/MP4)**
- **Pros:** Smaller file sizes, better performance
- **Cons:** Requires video playback logic, complexity increase
- **Decision:** Rejected - GIFs are simpler and sufficiently performant

**Alternative 2: Extract single frame from GIF and use as static image**
- **Pros:** Simpler implementation, smaller file sizes
- **Cons:** Loses animation benefit, defeats purpose of GIFs
- **Decision:** Rejected - animation is the core value proposition

**Trade-offs:**

- **File size vs. quality:** Optimized GIFs to 80% lossy compression (balance)
- **Animation frames vs. file size:** Keep all frames for smooth animation (prioritize quality)
- **GIF vs. PNG for some variants:** Use GIF only for 4 specific contexts (hybrid approach)

**Future Considerations:**

- **Potential improvement:** Add WebP animated format support (better compression)
- **Potential improvement:** Lazy load GIFs only when visible (Intersection Observer)
- **Potential improvement:** Generate multiple resolutions (responsive GIFs)
- **Extension point:** Add more GIF mascots for other contexts (victory, celebrating, etc.)

**Known Limitations:**

- GIF file sizes will always be larger than static PNGs (animation trade-off)
- GIFs ignore `prefers-reduced-motion` by nature (browser limitation)
  - **Mitigation:** Detect preference and show static frame OR fallback PNG
- Background removal quality depends on `rembg` model accuracy
  - **Mitigation:** Manual review after processing, touch up if needed
- Processing time is 5-15 minutes per GIF (frame count dependent)
  - **Mitigation:** One-time processing, results cached
