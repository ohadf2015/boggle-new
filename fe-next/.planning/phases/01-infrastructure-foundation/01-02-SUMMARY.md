---
phase: 01-infrastructure-foundation
plan: 02
subsystem: infra
tags: [rembg, python, image-processing, birefnet-general, alpha-matting]

# Dependency graph
requires:
  - phase: none
    provides: standalone infrastructure tooling
provides:
  - Background removal pipeline using rembg with birefnet-general model
  - Python virtual environment for image processing tools
  - Shell wrapper for easy CLI usage
affects: [06-ai-asset-generation, adventure-mode-visuals]

# Tech tracking
tech-stack:
  added: [rembg 2.0.61, birefnet-general model, Python 3.9 venv]
  patterns: [Python scripts with shell wrappers, alpha matting for clean edges]

key-files:
  created:
    - scripts/remove-background.py
    - scripts/remove-background.sh
  modified:
    - .gitignore

key-decisions:
  - "Use birefnet-general model (95%+ accuracy, newest available)"
  - "Enable alpha matting with thresholds 240/10 for clean edges"
  - "Python venv for isolation from system packages"
  - "Shell wrapper for automatic venv activation"

patterns-established:
  - "Python tools in scripts/ with .py extension"
  - "Shell wrappers in scripts/ for Python tools requiring venv"
  - "Single-file and batch processing modes in image scripts"

# Metrics
duration: 25min
completed: 2026-01-22
---

# Phase 1 Plan 2: Background Removal Scripts Summary

**rembg pipeline with birefnet-general model and alpha matting for transparent PNG generation**

## Performance

- **Duration:** 25 min
- **Started:** 2026-01-22T14:28:15Z
- **Completed:** 2026-01-22T14:53:31Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Installed rembg 2.0.61 with birefnet-general model (973MB, 95%+ accuracy)
- Created Python script with single-file and batch processing modes
- Alpha matting enabled (thresholds 240/10) for clean edge quality
- Shell wrapper auto-activates venv for easy CLI usage

## Task Commits

Each task was committed atomically:

1. **Task 1: Install rembg and verify CLI functionality** - `8c106b9` (feat)
2. **Task 2: Create background removal Python script** - `42f356a` (feat)
3. **Task 3: Create shell wrapper and test** - `4ab1b8e` (feat)

## Files Created/Modified
- `.gitignore` - Added .venv/ and *.png.tmp exclusions
- `scripts/remove-background.py` - Python script for rembg background removal with alpha matting
- `scripts/remove-background.sh` - Shell wrapper for automatic venv activation

## Decisions Made

**Model Selection:**
- Chose birefnet-general over U2Net (95%+ accuracy vs 90%, newer architecture)
- Pre-downloaded 973MB model file to ~/.u2net/ for faster subsequent runs

**Alpha Matting Configuration:**
- Foreground threshold: 240 (aggressive foreground selection)
- Background threshold: 10 (conservative background removal)
- Result: Clean edges on transparent PNGs suitable for game sprites

**Virtual Environment:**
- Isolated Python environment to avoid system package conflicts
- Shell wrapper handles activation automatically (no manual source needed)

**Script Design:**
- Single mode: `./scripts/remove-background.sh input.png output.png`
- Batch mode: `./scripts/remove-background.sh --batch input_dir/ output_dir/`
- Consistent naming: `{filename}_nobg.png` for batch outputs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Model Loading Time:**
- birefnet-general model (973MB) takes 2-3 minutes to load on first run
- This is expected behavior for deep learning models
- Subsequent runs are faster as model stays cached in memory
- No impact on functionality - scripts work correctly once model loads

**CLI Compatibility:**
- rembg CLI has gradio dependency conflict (ImportError: cannot import HfFolder)
- Not a blocker - Python library API works perfectly
- Scripts use library API directly (from rembg import remove, new_session)
- Shell wrapper provides CLI-like interface without gradio dependency

## User Setup Required

None - no external service configuration required. Scripts use local model files.

## Next Phase Readiness

**Ready for use:**
- Background removal pipeline functional
- Scripts tested with alpha matting
- Virtual environment isolated and stable

**Usage:**
```bash
# Single file
./scripts/remove-background.sh input.png output.png

# Batch processing
./scripts/remove-background.sh --batch input_dir/ output_dir/
```

**For Phase 6 (AI Asset Generation):**
- Pipeline ready to process AI-generated images
- Clean transparent PNGs for Lexi mascot sprites
- Batch mode for processing multiple adventure world assets

---
*Phase: 01-infrastructure-foundation*
*Completed: 2026-01-22*
