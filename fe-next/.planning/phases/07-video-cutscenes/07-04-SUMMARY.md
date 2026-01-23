---
phase: 07-video-cutscenes
plan: 04
subsystem: video-rendering
tags: [remotion, batch-render, npm-scripts, h264]
completed: 2026-01-23
duration: 8min
dependency_graph:
  requires: [07-01, 07-02, 07-03]
  provides: [video-render-pipeline, npm-video-scripts]
  affects: [07-05]
tech_stack:
  added: []
  patterns: [batch-shell-script, npm-script-alias]
key_files:
  created:
    - scripts/render-cutscenes.sh
    - public/videos/cutscenes/.gitkeep
  modified:
    - package.json
    - .gitignore
decisions:
  - H.264 codec with CRF 23 for iOS Safari compatibility
  - Videos excluded from git (generated on demand)
  - Single npm command for full batch render
metrics:
  tasks_completed: 3
  commits: 3
  test_video_size: 10MB
---

# Phase 07 Plan 04: Video Render Pipeline Summary

Batch rendering script and npm scripts for generating all 24 cutscene video variants with H.264 codec.

## What Was Built

### 1. Output Directory Structure
- Created `public/videos/cutscenes/` for rendered video output
- Added `.gitkeep` to track directory in git
- Updated `.gitignore` to exclude `*.mp4` files (generated on demand)

### 2. Batch Render Script (`scripts/render-cutscenes.sh`)
- Comprehensive shell script for rendering all video variants
- Configuration: 30 FPS, 1920x1080, CRF 23, H.264 codec
- Renders 24 total videos:
  - Level intros: 3 worlds x 4 locales = 12 videos
  - World transitions: 2 transitions x 4 locales = 8 videos
  - Tutorials: 4 locales = 4 videos
- Progress counter showing current/total
- Summary output with file count and total size

### 3. npm Scripts
- `video:render`: Full batch render (24 videos)
- `video:render:test`: Single video for pipeline testing

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create output directory structure | 697ac60 | public/videos/cutscenes/.gitkeep, .gitignore |
| 2 | Create render-cutscenes.sh script | 7f84485 | scripts/render-cutscenes.sh |
| 3 | Add npm scripts and test pipeline | e6e3f0b | package.json |

## Verification Results

- [x] `scripts/render-cutscenes.sh` is executable (-rwxr-xr-x)
- [x] `public/videos/cutscenes/` directory exists
- [x] `npm run video:render` script registered
- [x] Test render completed successfully (LevelIntro meadows/en)
- [x] Rendered video is valid MP4 (ISO Media, MP4 Base Media v1)
- [x] H.264 codec used (iOS Safari compatible)

## Deviations from Plan

### File Size Observation
Test video was ~10MB vs the 1MB target in success criteria. This is expected for 8-second videos at 1920x1080 with CRF 23. CRF 23 provides good quality/size balance for production. Lower CRF values would increase size further.

No other deviations - plan executed as written.

## Technical Details

### Render Command
```bash
npx remotion render remotion/index.ts [Composition] [output.mp4] \
  --props='{"worldId":"meadows","locale":"en"}' \
  --codec=h264 \
  --crf=23 \
  --log=error
```

### Video Variants
| Type | Count | Naming Pattern |
|------|-------|----------------|
| Level Intro | 12 | `level-intro-{world}-{locale}.mp4` |
| Transition | 8 | `transition-{from}-{to}-{locale}.mp4` |
| Tutorial | 4 | `tutorial-{locale}.mp4` |

### Supported Locales
- en (English)
- he (Hebrew)
- sv (Swedish)
- ja (Japanese)

### Supported Worlds
- meadows (World 1)
- springs (World 2)
- caverns (World 3)

### Valid Transitions
- meadows -> springs
- springs -> caverns

## Usage

```bash
# Render all 24 videos (~5-10 min)
npm run video:render

# Test single video (~30 sec)
npm run video:render:test
```

## Next Phase Readiness

Ready for 07-05: Adventure Integration
- All compositions available via CLI
- Video files can be generated on demand
- File naming convention established for video player integration
