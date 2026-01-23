# Phase 6 Plan 4: Asset Pipeline Processing Summary

**One-liner:** Processed 11 AI-generated adventure assets through pipeline (backgrounds + parallax); Lexi sprites deferred to later iteration per user decision.

## What Was Built

### WebP Assets Delivered

**World Backgrounds (3):**
| Asset | Size | Budget | Status |
|-------|------|--------|--------|
| meadows.webp | 150KB | <200KB | ✓ |
| springs.webp | 162KB | <200KB | ✓ |
| caverns.webp | 151KB | <200KB | ✓ |

**Parallax Layers (8):**
| Asset | Size | Budget | Status |
|-------|------|--------|--------|
| meadows-hills.webp | 12KB | <150KB | ✓ |
| meadows-grass.webp | 80KB | <150KB | ✓ |
| springs-waterfall.webp | 16KB | <150KB | ✓ |
| springs-mist.webp | 24KB | <150KB | ✓ |
| springs-rocks.webp | 59KB | <150KB | ✓ |
| caverns-crystals-far.webp | 24KB | <150KB | ✓ |
| caverns-stalactites.webp | 25KB | <150KB | ✓ |
| caverns-crystals-near.webp | 48KB | <150KB | ✓ |

### Processing Scripts Created

Created Python scripts for asset processing:
- `scripts/remove-white-bg.py` - PIL-based white background removal
- `scripts/add-parallax-blur.py` - Depth-based Gaussian blur for parallax layers
- `scripts/rembg-process.py` - rembg wrapper script (for future use)

### Parallax Blur Configuration

Applied depth-based blur to create visual depth:
| Layer | Blur Radius | Depth |
|-------|-------------|-------|
| meadows-hills | 4px | Far |
| meadows-grass | 1px | Near |
| springs-waterfall | 5px | Far |
| springs-mist | 2px | Mid |
| springs-rocks | 1px | Near |
| caverns-crystals-far | 5px | Far |
| caverns-stalactites | 3px | Mid |
| caverns-crystals-near | 1px | Near |

## Technical Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| PIL-based bg removal over rembg | rembg had dependency conflicts with system Python | Simpler solution, fewer dependencies |
| Defer Lexi sprites | User decision: "lets go with it for first stage and dont use the lexi sprites" | 11 assets vs planned 19; Lexi mascot uses existing assets |
| q80 WebP quality | Matches Phase 1 baseline settings | Consistent optimization across project |
| Depth blur on parallax | Far layers (4-5px) blur more than near (1px) | Creates depth perception without z-layering |

## Deviations from Plan

| Deviation | Reason | Resolution |
|-----------|--------|------------|
| 11 assets instead of 19 | User requested to skip Lexi sprites for first stage | Sprites can be added in future iteration |
| PIL bg removal instead of rembg | rembg dependency conflicts (onnxruntime, gradio) | Created simple PIL-based script |
| No automated pipeline run | Manual processing was faster for 11 files | Scripts available for batch processing |

## File Inventory

### Created
```
public/images/adventure/
├── backgrounds/
│   ├── meadows.webp (150KB)
│   ├── springs.webp (162KB)
│   └── caverns.webp (151KB)
└── parallax/
    ├── meadows-hills.webp (12KB)
    ├── meadows-grass.webp (80KB)
    ├── springs-waterfall.webp (16KB)
    ├── springs-mist.webp (24KB)
    ├── springs-rocks.webp (59KB)
    ├── caverns-crystals-far.webp (24KB)
    ├── caverns-stalactites.webp (25KB)
    └── caverns-crystals-near.webp (48KB)

scripts/
├── add-parallax-blur.py
├── remove-white-bg.py
└── rembg-process.py
```

### Raw Files (not committed)
```
raw/adventure/
├── *-bg.png (3 backgrounds)
├── *-nobg.png (8 parallax with bg removed)
├── *-final.png (8 parallax with blur applied)
└── lexi-*.png (8 sprites - not used)
```

## Verification

### Build Test
```bash
npm run build  # ✓ Passed
```

### File Size Check
```bash
find public/images/adventure -name "*.webp" -size +200k  # (empty - all under budget)
```

### Path Integration
Theme files already reference correct paths:
- `lib/adventure/themes/world1.ts` → meadows.webp, meadows-hills.webp, meadows-grass.webp
- `lib/adventure/themes/world2.ts` → springs.webp, springs-waterfall.webp, springs-mist.webp, springs-rocks.webp
- `lib/adventure/themes/world3.ts` → caverns.webp, caverns-crystals-far.webp, caverns-stalactites.webp, caverns-crystals-near.webp

## Performance Impact

**Total Asset Size:**
- Backgrounds: 463KB (3 files)
- Parallax: 288KB (8 files)
- **Total: 751KB** (vs 2.6MB budgeted including sprites)

**Per-World Loading:**
- World 1: ~242KB (150KB bg + 92KB parallax)
- World 2: ~261KB (162KB bg + 99KB parallax)
- World 3: ~248KB (151KB bg + 97KB parallax)

All well under mobile performance budget.

## Next Steps

**Immediate:**
- Assets are live and integrated
- No further action needed for Phase 6 core delivery

**Future Iteration (Optional):**
- Add Lexi sprites when mascot redesign is finalized
- Consider animated WebP for Lexi (single file vs sprite sheet)

## Lessons Learned

### What Went Well
- Simple PIL-based approach worked better than complex rembg for white backgrounds
- Depth blur significantly improves visual quality
- All assets under size budget with room to spare

### What Was Tricky
- rembg dependency conflicts wasted time (should have tried simple solution first)
- Regenerating images due to quality issues (backgrounds had blurred duplicates)

---

**Phase:** 06-ai-asset-generation
**Plan:** 04-asset-pipeline-processing
**Status:** ✅ Complete (11/19 assets - user scope reduction)
**Duration:** ~25 minutes
**Commits:** 162401d
