# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Adventure mode must feel immersive and connected to its themed worlds
**Current focus:** Phase 9 - Invalid Word System

## Current Position

Phase: 9 of 10 (Invalid Word System)
Plan: 1 of 3 complete
Status: In progress
Last activity: 2026-01-23 - Completed 09-01-PLAN.md (Checkbox Selection UI)

Progress: [████████░░] 85% (8 phases complete + 09-01, 35/~38 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 34
- Average duration: 12 min
- Total execution time: ~282 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 Infrastructure Foundation | 6 | ~60min | 10min |
| 02 Core Game Juice | 3 | ~32min | 11min |
| 03 Level Entry Experience | 3 | ~19min | 6min |
| 04 World Theming | 3 | ~50min | 17min |
| 05 Lexi Personality | 3 | ~23min | 8min |
| 06 AI Asset Generation | 4/4 | ~85min | 21min |
| 07 Video Cutscenes | 6/6 | ~59min | 10min |
| 08 Wikipedia Integration | 4/4 | ~56min | 14min |

**Recent Trend:**
- Phase 1 completed efficiently (10min avg)
- Phase 2 complete: 02-01 (18min), 02-02 (6min), 02-03 (8min)
- Phase 3 complete: 03-01 (8min), 03-02 (7min), 03-03 (4min)
- Phase 4 complete: 04-01 (14min), 04-02 (25min), 04-03 (11min) - world theming UI
- Phase 5 complete: 05-01 (6min), 05-02 (9min), 05-03 (8min) - Lexi personality system

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Focus on Worlds 1-3 only (ship polished subset before expanding)
- Skip boss battles for now (core adventure loop more important)
- Admin queue over auto-approve (human review ensures quality)
- **01-01:** Remotion 4.0.381 supports React 19 natively (no isolation needed)
- **01-02:** birefnet-general model for background removal (95%+ accuracy vs U2Net 90%)
- **01-02:** Alpha matting thresholds 240/10 for clean sprite edges
- **01-03:** Quality 80, effort 6 as baseline for Sharp WebP optimization
- **01-03:** 200KB size limit for all image assets (mobile performance target)
- **01-04:** Pipeline composition chains rembg and Sharp into unified workflow
- **01-04:** Manifest-based batch processing for asset catalogs
- **01-05:** Lighthouse CI 90+ thresholds as errors (enforces performance budget)
- **01-05:** BundleWatch limits 250KB JS / 50KB CSS (gzip, matches CDN)
- **01-06:** Video delivery deferred to Phase 7 (Remotion infra validated, content in Phase 7)
- **02-01:** forwardRef pattern for grid container ref passing (enables coordinate calculation)
- **02-01:** Index-based stable timestamps for trail animation (prevents re-renders)
- **02-01:** DOM coordinate calculation with mathematical fallback (testing support)
- **02-02:** Spring physics constants (stiffness 300, damping 20, mass 0.5) for tile bounce
- **02-02:** Viewport coordinates for sparkle positioning (SelectionSparkle uses fixed positioning)
- **02-02:** Framer Motion over CSS transitions for spring physics control
- **02-03:** Queue pattern for score popups handles rapid submissions
- **02-03:** Calculate popup start position from last selected tile center
- **02-03:** Store score value separately for TypeScript type safety
- **02-03:** Show combo multiplier only when comboCount > 1
- **03-01:** Diagonal wave pattern for cascade (row + col, tiles closest to top-left first)
- **03-01:** 30ms stagger between diagonals for smooth visual flow
- **03-01:** Spring physics (stiffness 400, damping 25, mass 0.8) for crisp tile landing
- **03-01:** Game timer waits for cascade completion to avoid distraction
- **03-02:** Spring physics constants (stiffness 400, damping 30) for objective slide
- **03-02:** 100ms stagger per objective creates clear visual hierarchy
- **03-02:** RTL slides from left (-50px), LTR slides from right (50px)
- **03-02:** Animation completion callback enables UI coordination
- **03-03:** Entry phase state machine coordinates cascade/objectives/title/play sequence
- **03-03:** Scale burst animation (0 → 1.5 → 1.1) creates dramatic impact
- **03-03:** Three-phase timing: 400ms burst + 600ms hold + 300ms fade = 1.3s total
- **03-03:** World themes: World 1 (lime), World 2 (cyan), World 3 (orange)
- **04-01:** Combine three input sources (gyro, gesture, ambient) for "always alive" parallax
- **04-01:** iOS permission request on first touch interaction (graceful fallback)
- **04-01:** Ambient drift uses sine/cosine oscillation at 0.0003/0.0002 speed
- **04-01:** All parallax event listeners use passive: true for scroll performance
- **04-02:** SVG-based particle shapes over CSS shapes for rich visual quality
- **04-02:** Hard cap at 10 visible particles max (sparse, non-distracting)
- **04-02:** Adaptive particle rendering based on device capability (4/8/20 → capped at 10)
- **04-02:** Parallax depth transform: `translate(x * depth, y * depth)` for natural depth perception
- **04-02:** Seeded random (mulberry32) for deterministic particle placement
- **04-03:** Texture opacity < 0.1 for letter readability while providing world distinction
- **04-03:** Special tiles (gold, ice, bomb, rainbow) maintain distinct appearance without world theming
- **04-03:** Letter glow applies to all tiles, texture/border only to standard tiles
- **04-03:** Optional context usage (AdventureThemeContext with fallback) allows grid in/out of provider
- **04-03:** SVG decorations for corner elements (vines, water splashes, crystal clusters)
- **05-01:** 3s cooldown between reactions (configurable via cooldownMs)
- **05-01:** Priority system: high > normal > low for reaction override
- **05-01:** Long word threshold: 6+ letters (matches score bonus)
- **05-01:** Combo milestones: 3x, 5x, 10x with progressive excitement
- **05-01:** World-specific translation keys: adventure.lexi.{type}.world{N}
- **05-02:** Spring physics (stiffness 300, damping 20) for entrance animation
- **05-02:** Position: bottom-20 (above game controls), z-40 (above game, below modals)
- **05-02:** Tap-to-speed pattern: single tap = 2x, double tap = dismiss
- **05-02:** MutationObserver for RTL detection (handles language switching)
- **05-02:** Reduced motion fallback: static mascot + text bubble
- **05-03:** Lexi reactions only fire when isPlaying && entryPhase === 'playing' && !isPaused
- **05-03:** Star-based mascot variant: 3=victory, 2=celebrating, 1=happy, 0=thinking
- **05-03:** Game state adapter pattern for hook integration
- **05-03:** Lexi celebrates alongside (not replaces) existing star animation
- **06-01:** No tile graphics needed - ThemedTile uses CSS overlays (sparkle, frost, flames)
- **06-01:** Different size targets per asset type: 200KB backgrounds, 150KB parallax, 100KB sprites
- **06-01:** Natural language prompts (no hex codes) to prevent Midjourney artifacts
- **06-01:** Midjourney --cref flag for Lexi character consistency across poses
- **06-01:** 2 frames per sprite animation (balance smooth motion with file count)
- **06-04:** PIL-based white bg removal over rembg (simpler, fewer dependencies)
- **06-04:** Depth blur on parallax: far 4-5px, mid 2-3px, near 1px
- **06-04:** Lexi sprites deferred to future iteration (user decision for first stage)
- **07-02:** Portal uses neo-brutalist colors (cyan #00FFFF to pink #FF1493 gradient)
- **07-02:** Three overlapping phases for smooth world transitions (old fade + portal + new fade)
- **07-02:** Portal animation has three visual layers (outer glow, main portal, inner swirl)
- **07-01:** Ken Burns zoom 1.15x -> 1.0x for subtle camera movement in world flyby
- **07-01:** Text overlay appears at frame 150 (last 3 seconds) for world name reveal
- **07-01:** Rubik font for Hebrew, Fredoka for others (per design system)
- **07-03:** Embedded translations for Remotion (cannot use React context in video compositions)
- **07-03:** 5% sine wave pulse animation for tutorial highlight boxes
- **07-03:** Simple SVG icons (swipe arrow, checkmark, plus) for clean UI focus
- **07-04:** H.264 codec with CRF 23 for iOS Safari compatibility
- **07-04:** Videos excluded from git (generated on demand via npm script)
- **07-04:** Single npm command `video:render` generates all 24 video variants
- **07-05:** iOS autoplay requires muted + playsInline + autoPlay attributes
- **07-05:** Tutorial videos immediately skippable (0ms delay), others 2000ms default
- **07-05:** Reduced motion preference auto-completes video (accessibility)
- **07-06:** localStorage for cutscene viewed state (client preference, no server sync)
- **07-06:** World ID mapping: levels 1-7 = meadows, 8-14 = springs, 15-21 = caverns
- **07-06:** AdventureView orchestrates transitions (manages full-screen cutscene overlay)
- **07-06:** Callback composition for world unlock: Modal → Game → View → CutscenePlayer
- **07-06:** Tutorial renders before map content, level intro before tile cascade
- **08-01:** Score threshold 80 for Wikipedia word auto-promotion (high-confidence words)
- **08-01:** Dictionary check before promotion prevents duplicate insertion errors
- **08-01:** Fire-and-forget error handling for auto-promotion (non-blocking)
- **08-01:** Export threshold constant for admin dashboard transparency
- **08-02:** Maximum 100 candidates per batch (prevents API timeout with 90s limit)
- **08-02:** Check checkDatabaseOnly before promoting (skip duplicates gracefully)
- **08-02:** Mark valid separate from promote (clearer UX distinction)
- **08-02:** Neo-brutalist shadow-hard styling for BulkApproveButton
- **08-03:** Format-only fallback threshold 85 for AI unavailability scenarios
- **08-03:** logPipelineError helper provides structured error context (operation, word, language, score)
- **08-03:** Per-candidate try-catch in validateTopCandidates ensures pipeline continues after individual failures
- **08-03:** Defensive batch processing with try-catch per batch prevents data loss on database errors
- **09-01:** Use word.id for selection tracking (not word+language)
- **09-01:** Clear selection when filters or pagination change
- **09-01:** Remove item from selection on approve/dismiss

### Pending Todos

None.

### Blockers/Concerns

**Phase 1 Infrastructure:** ✓ COMPLETE
- ✅ Remotion 4.0.381 is React 19 compatible
- ✅ Background removal uses birefnet-general (open source)
- ✅ Performance budget enforced via CI
- ⏸️ iOS Safari video autoplay → deferred to Phase 7

**Phase 6 Asset Generation:** ✓ COMPLETE
- ✅ 11 assets generated and processed (3 backgrounds + 8 parallax)
- ✅ All assets under size budget (backgrounds <200KB, parallax <150KB)
- ⏸️ Lexi sprites → deferred per user decision (existing mascot used)

**Phase 2 Core Game Juice:** ✓ COMPLETE
- ✅ Word selection trail animation complete (02-01)
- ✅ Letter tile pop animation complete (02-02)
- ✅ Score popup animation complete (02-03)
- ✅ Human-tested polish fixes applied:
  - Dark backgrounds (neo-navy gradients)
  - Trail thickness 4→6, stronger glow
  - Score popup duration 1000→1800ms

**Phase 3 Level Entry Experience:** ✓ COMPLETE
- ✅ Tile cascade animation complete (03-01)
- ✅ Objective slide-in animation complete (03-02)
- ✅ Level title burst animation complete (03-03)
- ✅ Entry sequence callback chain bug fixed
- ✅ Full entry sequence working:
  - Tiles cascade (diagonal wave, ~580ms)
  - Objectives slide in (RTL-aware, ~500ms)
  - Level title bursts (scale + glow, ~1.3s)
  - Total entry time: ~2.4s (slight timing gap noted in verification)

**Phase 4 World Theming:** ✓ COMPLETE (infrastructure ready, assets pending Phase 6)
- ✅ useParallax hook: Combined gyro/gesture/ambient inputs (04-01)
- ✅ WorldParticles: Butterflies, droplets, crystals with SVG shapes (04-02)
- ✅ WorldBackground: Parallax motion + particles integration (04-02)
- ✅ BoardFrame: Corner decorations (vines, splashes, crystals) (04-03)
- ✅ ThemedTile: Texture overlays, borders, letter glow (04-03)
- ⏸️ Parallax images → Phase 6 (AI Asset Generation)
- ⏸️ Background images → Phase 6 (AI Asset Generation)

**Phase 7 Video Cutscenes:** ✓ COMPLETE
- ✅ LevelIntro composition with Ken Burns zoom (07-01)
- ✅ WorldTransition composition with portal animation (07-02)
- ✅ Tutorial composition with embedded translations (07-03)
- ✅ Video render pipeline with H.264 codec (07-04)
- ✅ CutscenePlayer component with iOS Safari support (07-05)
- ✅ Cutscene integration (tutorial, level intro, world transition) (07-06)
- ⏸️ Video files not yet rendered (run `./scripts/render-cutscenes.sh` when ready)

**Phase 8 Wikipedia Integration:** ✓ COMPLETE
- ✅ Auto-promotion for high-scoring words (≥80) (08-01)
- ✅ Bulk approve UI with BulkApproveButton (08-02)
- ✅ Edge case hardening with AI fallback (08-03)
- ✅ E2E integration tests (13 tests) + verification script (08-04)
- ✅ Phase verified: 5/5 success criteria met

**General:**
- Friends page build error pre-exists (unrelated to Phase 2 work)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Verify Wikipedia sync and daily challenge admin features | 2026-01-22 | N/A (verification only) | [001-verify-wikipedia-sync](./quick/001-verify-wikipedia-sync-and-daily-challeng/) |

## Phase 1 Deliverables

| Plan | Description | Status |
|------|-------------|--------|
| 01-01 | Remotion 4.0.381 installation | ✓ |
| 01-02 | rembg background removal | ✓ |
| 01-03 | Sharp WebP optimization | ✓ |
| 01-04 | Asset pipeline integration | ✓ |
| 01-05 | Performance CI (Lighthouse, BundleWatch) | ✓ |
| 01-06 | Video delivery | ⏸️ Deferred to Phase 7 |

## Phase 2 Deliverables

| Plan | Description | Status |
|------|-------------|--------|
| 02-01 | Word selection trail animation | ✓ |
| 02-02 | Letter tile pop animation | ✓ |
| 02-03 | Score popup animation | ✓ |

## Phase 3 Deliverables

| Plan | Description | Status |
|------|-------------|--------|
| 03-01 | Tile cascade animation | ✓ |
| 03-02 | Objective slide-in animation | ✓ |
| 03-03 | Level title burst animation | ✓ |

## Phase 4 Deliverables

| Plan | Description | Status |
|------|-------------|--------|
| 04-01 | Parallax input system (gyro + gesture + ambient) | ✓ |
| 04-02 | World particles & parallax backgrounds | ✓ |
| 04-03 | Board frame decorations & tile theming | ✓ |

## Phase 5 Deliverables

| Plan | Description | Status |
|------|-------------|--------|
| 05-01 | Lexi reactions hook (trigger detection + cooldown) | ✓ |
| 05-02 | LexiReaction component (visual feedback display) | ✓ |
| 05-03 | Adventure integration (hook + component) | ✓ |

## Phase 6 Deliverables

| Plan | Description | Status |
|------|-------------|--------|
| 06-01 | Asset infrastructure (directories + manifest + prompts) | ✓ |
| 06-02 | AI image generation (MCP image generation) | ✓ |
| 06-03 | Background integration (parallax layers) | ✓ |
| 06-04 | Asset pipeline processing (WebP optimization) | ✓ (11/19 assets - Lexi sprites deferred) |

## Phase 7 Deliverables

| Plan | Description | Status |
|------|-------------|--------|
| 07-01 | LevelIntro composition | ✓ |
| 07-02 | WorldTransition composition | ✓ |
| 07-03 | Tutorial composition | ✓ |
| 07-04 | Video render pipeline | ✓ |
| 07-05 | CutscenePlayer component | ✓ |
| 07-06 | Cutscene integration | ✓ |

## Phase 8 Deliverables

| Plan | Description | Status |
|------|-------------|--------|
| 08-01 | Auto-promote high-scoring candidates | ✓ |
| 08-02 | Admin word queue interface | ✓ |
| 08-03 | Edge case hardening | ✓ |
| 08-04 | End-to-End Integration Test | ✓ |

## Phase 9 Deliverables

| Plan | Description | Status |
|------|-------------|--------|
| 09-01 | Checkbox Selection UI | ✓ |
| 09-02 | Bulk approve API endpoint | |
| 09-03 | BulkApproveButton integration | |

## Session Continuity

Last session: 2026-01-23
Stopped at: Completed 09-01-PLAN.md (Checkbox Selection UI)
Resume file: None
Next: 09-02-PLAN.md (Bulk approve API endpoint)

---
*State initialized: 2026-01-22*
*Last updated: 2026-01-23 19:25 UTC*
