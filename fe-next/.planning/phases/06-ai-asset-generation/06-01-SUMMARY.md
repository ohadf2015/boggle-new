# Phase 6 Plan 1: Asset Infrastructure Summary

**One-liner:** Established directory structure, pipeline manifest for 19 adventure assets, and comprehensive Midjourney prompt templates with post-processing workflow.

## What Was Built

### Directory Structure
Created organized asset directories matching Phase 6 research specification:
- `public/images/adventure/backgrounds/` - Full-scene world backgrounds (1024x1024)
- `public/images/adventure/parallax/` - Multi-layer depth elements (1024x512)
- `public/images/adventure/sprites/` - Lexi mascot character sprites
- Note: No `tiles/` directory needed — ThemedTile.tsx uses CSS overlays (sparkle, frost, flames) already implemented

### Asset Pipeline Manifest
Created `scripts/adventure-assets.json` with 19 asset definitions:
- **3 world backgrounds:** meadows, springs, caverns (200KB target)
- **8 parallax layers:** 2 for meadows, 3 for springs, 3 for caverns (150KB target)
- **8 Lexi sprites:** 2 frames × 4 states (idle, celebrate, sad, hint) at 100KB target
- Configured with appropriate `removeBg` settings (true for sprites, false for backgrounds)
- Compatible with existing `asset-pipeline.ts` from Phase 1

### Prompt Documentation
Created `docs/asset-generation-prompts.md` with 365 lines covering:
- **Art style guidelines:** Neo-brutalist cartoon aesthetic (Cuphead/Hollow Knight energy)
- **World background prompts:** Specific Midjourney v8 templates for meadows, springs, caverns
- **Parallax layer prompts:** Depth-aware designs with atmospheric perspective
- **Lexi sprite prompts:** Character consistency workflow using `--cref` flag
- **Post-processing workflow:** Integration with rembg + Sharp WebP optimization
- **Anti-patterns:** Hex codes in prompts, technical jargon, photorealistic styles
- **Troubleshooting guide:** Character inconsistency, layer cohesion, file size issues

## Technical Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| No tiles directory | ThemedTile uses CSS overlays (already implemented) | Reduced asset generation scope from 23 to 19 images |
| Different size targets per asset type | Backgrounds need detail (200KB), parallax layers smaller (150KB), sprites minimal (100KB) | Optimized mobile performance budget |
| Natural language prompts | Midjourney interprets hex codes/jargon as visual elements | Prevents generation artifacts (text in images) |
| `--cref` flag for Lexi consistency | Midjourney v8 feature maintains character appearance across poses | Ensures recognizable mascot across all states |
| 2 frames per animation | Balance between smooth motion and file count/size | 8 sprites total instead of 12 (if 3 frames) |

## Dependencies

### Built Upon
- **Phase 1 (Infrastructure):** Existing asset-pipeline.ts, rembg (birefnet-general), Sharp WebP optimization
- **Phase 4 (Animation):** Parallax depth system, particle effects (butterflies, droplets, crystals)
- **Phase 5 (Lexi):** Existing mascot design in `public/mascot/main-nobg.gif` as character reference

### Provides For
- **06-02:** AI image generation (Midjourney Discord workflow)
- **06-03:** Background integration (parallax layers in WorldBackground component)
- **06-04:** Lexi sprite integration (adventure-specific mascot states)

## File Inventory

### Created
```
public/images/adventure/
├── backgrounds/.gitkeep
├── parallax/.gitkeep
└── sprites/.gitkeep

scripts/adventure-assets.json (122 lines)
docs/asset-generation-prompts.md (365 lines)
```

### Modified
None — all new files

## Deviations from Plan

None — plan executed exactly as specified. Tasks completed in order:
1. Directory structure created
2. Asset manifest with 19 entries
3. Prompt documentation with style guidelines, per-asset prompts, and workflow

## Decisions Made

1. **No tile graphics generation:** Confirmed ThemedTile.tsx already uses CSS overlays (sparkle for gold, frost for ice, flames for bomb). No image assets needed for special tiles.

2. **2 frames per sprite state:** Chose 2 frames over 3 based on existing InteractiveMascot component patterns. Sufficient for subtle breathing/bounce animations.

3. **Parallax layer count per world:** 2 layers for meadows (simpler), 3 layers for springs and caverns (more depth complexity). Balance visual richness with performance.

4. **Style reference approach:** Document both `--sref` (style locking) and `--cref` (character consistency) workflows. Style refs established after user approval in 06-02.

## Lessons Learned

### What Went Well
- **Existing infrastructure reuse:** Phase 1 pipeline (rembg + Sharp) works perfectly for adventure assets. No new tooling needed.
- **Clear research foundation:** 06-RESEARCH.md provided exact asset counts, directory structure, and parallax patterns from existing codebase.
- **Natural language prompt emphasis:** Documenting the "hex code" anti-pattern prevents common Midjourney pitfalls.

### What Was Tricky
- **Balancing prompt specificity:** Too vague → inconsistent style; too specific → constrains creative variation. Documented both template prompts and variation suggestions.
- **File size target rationale:** Had to explain WHY different targets (backgrounds need detail, parallax less critical, sprites minimal). Added to manifest as explicit config.

### Future Improvements
- **Automated Discord workflow:** Manual download process is tedious. If Midjourney releases official API, integrate it. Current workaround: Manual generation, automated post-processing.
- **Style reference gallery:** After 06-02 generation, create a visual reference gallery (approved examples) to supplement text prompts.

## Testing Notes

### Verification Performed
- ✅ Directory structure exists with .gitkeep files
- ✅ Manifest is valid JSON with 19 assets
- ✅ Manifest compatible with asset-pipeline.ts (baseInputDir, baseOutputDir, removeBg, targetKb)
- ✅ Prompt documentation has 50+ lines (actually 365 lines)
- ✅ Covers all 4 asset categories (backgrounds, parallax, sprites, workflow)

### Not Tested Yet
- Actual image generation (06-02)
- Pipeline processing of real assets (06-02)
- Visual QA of generated assets (06-02)
- Integration with WorldBackground component (06-03)
- Lexi sprite animation in adventure mode (06-04)

## Next Steps

**Immediate (06-02):**
1. Generate test images in Midjourney (1 per world for style approval)
2. Get user approval on art style
3. Establish `--sref` style references
4. Batch generate all 19 assets via Discord
5. Download to `raw/adventure/` directory
6. Run pipeline: `npx tsx scripts/asset-pipeline.ts --manifest=scripts/adventure-assets.json`
7. Verify output file sizes and visual quality

**Later Plans:**
- 06-03: Integrate backgrounds into WorldBackground component (replace CSS gradients with real images)
- 06-04: Integrate Lexi sprites into LexiReaction component (add adventure-specific states)

## Performance Impact

**Current:** None (no images loaded yet, only infrastructure)

**Expected (after 06-02):**
- 3 backgrounds × 200KB = 600KB
- 8 parallax layers × 150KB = 1200KB
- 8 sprites × 100KB = 800KB
- **Total:** ~2.6MB raw assets → lazy-loaded per world (max 1 world active at once)

**Per-world budget:**
- World 1: 200KB (bg) + 300KB (2 parallax) + 800KB (sprites) = 1.3MB
- World 2: 200KB (bg) + 450KB (3 parallax) + 800KB (sprites) = 1.45MB
- World 3: 200KB (bg) + 450KB (3 parallax) + 800KB (sprites) = 1.45MB

**Optimization:** Sprites shared across worlds (only load once). Actual per-world cost: 0.65-0.85MB.

## Related Documentation

- `.planning/phases/06-ai-asset-generation/06-RESEARCH.md` - Technical research on Midjourney, parallax, asset pipeline
- `.planning/phases/06-ai-asset-generation/06-CONTEXT.md` - User decisions on art style, asset scope
- `scripts/asset-pipeline.ts` - Existing pipeline orchestrator (Phase 1)
- `scripts/generate-asset.ts` - Core asset processing (rembg + Sharp, Phase 1)
- `components/adventure/themed/WorldBackground.tsx` - Parallax layer consumer (Phase 4)
- `components/adventure/themed/ThemedTile.tsx` - CSS overlay implementation (Phase 4)

---

**Phase:** 06-ai-asset-generation
**Plan:** 01-asset-infrastructure
**Status:** ✅ Complete
**Duration:** ~10 minutes
**Commits:** 3 (b8a0575, 5dfb4cb, d899027)
