---
phase: 01-infrastructure-foundation
plan: 04
subsystem: infra
tags: [asset-pipeline, rembg, sharp, webp, automation, batch-processing]

# Dependency graph
requires:
  - phase: 01
    plan: 02
    provides: "Background removal scripts (rembg)"
  - phase: 01
    plan: 03
    provides: "Image optimization scripts (Sharp)"
provides:
  - "Unified asset generation pipeline: rembg -> Sharp"
  - "Single-command asset processing with configurable background removal"
  - "Batch asset orchestration via manifest or directory scanning"
affects: [06-ai-asset-generation, adventure-mode-visuals, daily-buzz-assets]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pipeline composition: Chain existing scripts into unified workflow"
    - "Export functions for reuse across scripts (generateAsset)"
    - "Manifest-based batch processing for asset catalogs"
    - "Temp file management with automatic cleanup"

key-files:
  created:
    - scripts/generate-asset.ts
    - scripts/asset-pipeline.ts
    - public/assets/.gitkeep
  modified:
    - package.json
    - .gitignore

key-decisions:
  - "Chain rembg and Sharp into single unified pipeline"
  - "Export generateAsset() for batch script reuse"
  - "Support both manifest-based and directory-based batch processing"
  - ".asset-temp/ for temporary files with automatic cleanup"

patterns-established:
  - "Script composition: Export functions from scripts for reuse"
  - "require.main === module pattern to prevent execution on import"
  - "Manifest-driven workflows with JSON configuration"
  - "Batch processing with progress reporting and summary statistics"

# Metrics
duration: 8min
completed: 2026-01-22
---

# Phase 01 Plan 04: Asset Pipeline Integration Summary

**Unified asset generation pipeline chaining rembg background removal and Sharp WebP optimization**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-22T15:20:00Z
- **Completed:** 2026-01-22T15:28:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Created single asset generation script (generate-asset.ts) that chains rembg -> Sharp
- Exported generateAsset() function for reuse in batch processing
- Built batch pipeline orchestrator with manifest and directory modes
- Added npm scripts (asset:generate, asset:pipeline) for CLI access
- Created public/assets/ output directory with .gitkeep
- Added .asset-temp/ to .gitignore for temporary file management

## Task Commits

Each task was committed atomically:

1. **Task 1: Create single asset generation script** - `be74e51` (feat)
2. **Task 2: Create batch asset pipeline orchestrator** - `ae7c315` (feat)
3. **Task 3: Add npm scripts and output directory** - `94f6592` (feat)

## Files Created/Modified
- `scripts/generate-asset.ts` - Single asset pipeline (background removal + optimization, 232 lines)
- `scripts/asset-pipeline.ts` - Batch orchestrator with manifest support (211 lines)
- `package.json` - Added asset:generate and asset:pipeline npm scripts
- `public/assets/.gitkeep` - Output directory placeholder
- `.gitignore` - Added .asset-temp/ exclusion

## Decisions Made

**1. Pipeline composition strategy:**
- Chain existing scripts (remove-background.sh -> Sharp) instead of reimplementing
- Use spawn() to call bash script for background removal
- Direct Sharp library usage for optimization (no subprocess)
- Temporary files in .asset-temp/ with cleanup via try/finally

**2. Script reusability:**
- Export generateAsset() function from generate-asset.ts
- Import and reuse in asset-pipeline.ts for batch processing
- Use `require.main === module` to prevent main() execution on import
- Enables future scripts to leverage existing pipeline

**3. Batch processing modes:**
- Manifest mode: JSON file with asset list and configuration
- Directory mode: Process all PNG/JPG files in directory
- Both modes support removeBg and targetKb customization
- Progress reporting and summary statistics for both modes

**4. CLI design:**
- Flags: --remove-bg (default), --no-remove-bg, --target-kb=N, --output-dir=D
- Manifest format: baseInputDir, baseOutputDir, defaultRemoveBg, assets array
- npm scripts for developer-friendly access
- Help text includes Image MCP workflow examples

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**require.main === module pattern needed:**
- Initially, generate-asset.ts ran main() immediately on import
- This caused asset-pipeline.ts to show generate-asset help text
- Fixed by wrapping main() call with require.main === module check
- Ensures script only runs when executed directly, not when imported

## User Setup Required

None - pipeline uses existing rembg and Sharp installations.

## Next Phase Readiness

**Ready for Phase 6 (AI Asset Generation):**
- Full pipeline ready: raw PNG -> transparent sprite -> optimized WebP
- Single-command workflow: `npm run asset:generate -- input.png output-name --remove-bg`
- Batch workflow: `npm run asset:pipeline -- --manifest=assets.json`
- Output directory (public/assets/) ready for game assets
- Temp file cleanup prevents disk bloat

**Workflow example:**
```bash
# Single asset (e.g., Lexi sprite)
npm run asset:generate -- raw/lexi.png lexi-idle --remove-bg

# Background image (no removal)
npm run asset:generate -- raw/meadow.png world-1-bg --no-remove-bg

# Batch processing from manifest
npm run asset:pipeline -- --manifest=assets.json

# Batch processing from directory
npm run asset:pipeline -- --dir=raw/ --output=public/assets/
```

**Integration points:**
- Image MCP generates PNG -> save to raw/ -> run pipeline
- Daily Buzz: Generate trending topic image -> optimize to <200KB
- Adventure Mode: Generate world assets -> batch process via manifest

**No blockers or concerns.**

---
*Phase: 01-infrastructure-foundation*
*Completed: 2026-01-22*
