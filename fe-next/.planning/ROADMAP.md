# Roadmap: LexiClash Stabilization

## Overview

This milestone brings adventure mode from functional to immersive through a foundation-first approach. We start by establishing the infrastructure pipeline (Remotion, AI assets, optimization), then layer on game feel (juice animations, level entry, world theming, Lexi personality), generate content assets (backgrounds, tiles, videos), and finally stabilize the content pipeline (Wikipedia integration, invalid word system, bug fixes). Each phase delivers observable user value while building toward the core vision: adventure mode that feels connected to its themed worlds, not generic Boggle with different labels.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infrastructure Foundation** - Asset pipeline, Remotion setup, optimization
- [x] **Phase 2: Core Game Juice** - Word trails, letter pops, score animations
- [x] **Phase 3: Level Entry Experience** - Tile cascade, objective reveal, title burst
- [x] **Phase 4: World Theming** - Parallax backgrounds, particles, dynamic boards
- [x] **Phase 5: Lexi Personality** - Mascot reactions and contextual feedback
- [x] **Phase 6: AI Asset Generation** - Backgrounds, tiles, characters, removal pipeline
- [x] **Phase 7: Video Cutscenes** - Remotion compositions and delivery
- [ ] **Phase 8: Wikipedia Integration** - Word extraction and sync pipeline
- [ ] **Phase 9: Invalid Word System** - Admin queue and approval workflow
- [ ] **Phase 10: Bug Fixes & Stabilization** - Daily challenge fixes and loose ends

## Phase Details

### Phase 1: Infrastructure Foundation
**Goal**: Establish asset generation and optimization pipeline that enables all visual polish work
**Depends on**: Nothing (first phase)
**Requirements**: INF-01, INF-02, INF-03, INF-04, INF-05, INF-06
**Success Criteria** (what must be TRUE):
  1. Remotion 4.0.236+ runs with React 19 without breaking Next.js 16 production builds
  2. AI images can be generated via API and automatically optimized to WebP <200KB
  3. Python script removes backgrounds from generated images with clean edges (rembg)
  4. Video rendering strategy (Lambda vs bundled) is decided and tested on iOS Safari
  5. Performance budget enforced (Lighthouse 90+, bundle size tracked)
**Plans**: 6 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — Install Remotion 4.0.381, verify React 19 compatibility
- [x] 01-02-PLAN.md — Install rembg CLI, create background removal scripts
- [x] 01-03-PLAN.md — Create Sharp-based WebP optimization scripts
- [x] 01-04-PLAN.md — Integrate asset pipeline (generation -> removal -> optimization)
- [x] 01-05-PLAN.md — Configure Lighthouse CI 90+, add BundleWatch
- [x] 01-06-PLAN.md — Video delivery strategy (deferred to Phase 7)

### Phase 2: Core Game Juice
**Goal**: Add responsive animations that make every player action feel satisfying and immediate
**Depends on**: Phase 1 (asset pipeline ready)
**Requirements**: ADV-04, ADV-05, ADV-06
**Success Criteria** (what must be TRUE):
  1. User sees animated trail connecting tiles as they select letters
  2. Letters pop/bounce when selected and animate smoothly on valid word submission
  3. Score appears as floating animation showing points earned with combo multipliers
  4. All animations respect reduced-motion preference and work in Hebrew RTL mode
  5. Performance budget maintained (no FPS drops on low-end devices)
**Plans**: 3 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md — Integrate WordPathTrail into adventure grid for selection trail
- [x] 02-02-PLAN.md — Enhance letter tile animations with spring physics and sparkle
- [x] 02-03-PLAN.md — Add ScorePopupFly animation on valid word submission

### Phase 3: Level Entry Experience
**Goal**: Create dramatic level start that builds anticipation before gameplay begins
**Depends on**: Phase 2 (animation system established)
**Requirements**: ADV-07, ADV-08, ADV-09
**Success Criteria** (what must be TRUE):
  1. Tiles cascade onto board with staggered timing when level loads
  2. Objective cards slide in from side revealing level goals
  3. Level title bursts onto screen with prominent animation
  4. Full entry sequence completes in <2 seconds (respects player time)
  5. Animations work correctly in all 4 languages including Hebrew RTL
**Plans**: 3 plans in 2 waves

Plans:
- [x] 03-01-PLAN.md — Tile cascade animation with diagonal wave pattern
- [x] 03-02-PLAN.md — Objective cards slide-in with RTL support
- [x] 03-03-PLAN.md — Level title burst animation with world theming

### Phase 4: World Theming
**Goal**: Each world has distinct visual identity through parallax backgrounds, particles, and board styling
**Depends on**: Phase 3 (animation foundation ready)
**Requirements**: ADV-01, ADV-02, ADV-03
**Success Criteria** (what must be TRUE):
  1. Playing Alphabet Meadows shows meadow-specific parallax background with 3-5 layers
  2. Synonym Springs displays spring-themed particles (water droplets) during gameplay
  3. Root Caverns has cave-specific atmosphere with crystal particle effects
  4. Game board tiles have subtle world-specific decorations without obscuring letters
  5. All themes maintain 90+ Lighthouse score and work in reduced-motion mode
**Plans**: 3 plans in 2 waves

Plans:
- [x] 04-01-PLAN.md — Create useParallax hook with combined gyro/gesture/ambient parallax
- [x] 04-02-PLAN.md — Enhance WorldBackground with parallax motion and world-specific particles
- [x] 04-03-PLAN.md — Add board frame decorations and tile theming

### Phase 5: Lexi Personality
**Goal**: Lexi mascot provides emotional connection through contextual reactions and encouragement
**Depends on**: Phase 4 (world context established)
**Requirements**: ADV-10, ADV-11, ADV-12
**Success Criteria** (what must be TRUE):
  1. Lexi appears with celebration animation when player achieves milestones (long words, combos)
  2. Lexi provides contextual feedback (hints when stuck, encouragement on struggle)
  3. Level completion shows star burst animation with Lexi celebration
  4. All Lexi animations can be tapped to speed up 2x (respect player time)
  5. Lexi sprite consistency maintained across all animations (Leonardo AI character reference)
**Plans**: 3 plans in 2 waves

Plans:
- [x] 05-01-PLAN.md — Create useLexiReactions hook and translation keys
- [x] 05-02-PLAN.md — Create LexiReaction display component with tap-to-speed
- [x] 05-03-PLAN.md — Integrate Lexi into AdventureGame and LevelCompleteModal

### Phase 6: AI Asset Generation
**Goal**: Production-ready pipeline generates all visual assets for Worlds 1-3 with consistent style
**Depends on**: Phase 1 (asset pipeline infrastructure)
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, CONT-08, CONT-09
**Success Criteria** (what must be TRUE):
  1. AI-generated backgrounds exist for all 3 worlds (Meadows, Springs, Caverns) with locked style
  2. Lexi mascot sprite sheets generated with character consistency (idle, celebrate, sad, hint states)
  3. All 4 special tile types have themed graphics (gold sparkle, ice frozen, bomb pulse, rainbow)
  4. Background removal pipeline produces clean-edged PNGs ready for game integration
  5. All assets optimized to WebP <200KB and stored with version control
**Plans**: 4 plans in 3 waves

Plans:
- [x] 06-01-PLAN.md — Set up asset infrastructure, directories, manifest, and prompt templates
- [x] 06-02-PLAN.md — Generate world backgrounds for Meadows, Springs, and Caverns
- [x] 06-03-PLAN.md — Generate Lexi mascot sprites (idle, celebrate, sad, hint states)
- [x] 06-04-PLAN.md — Process assets through pipeline (background removal + WebP optimization)

### Phase 7: Video Cutscenes
**Goal**: Remotion-powered video cutscenes add narrative polish at key moments
**Depends on**: Phase 6 (assets generated for video content)
**Requirements**: CONT-10, CONT-11, CONT-12
**Success Criteria** (what must be TRUE):
  1. Level intro cutscene plays on first level entry (5-10s, skippable after 2s)
  2. World transition video plays when unlocking new world (skippable)
  3. Tutorial/onboarding video available for new players (fully skippable)
  4. All videos work on iOS Safari with muted autoplay and playsinline attributes
  5. Videos rendered in all 4 languages with Hebrew RTL text support
**Plans**: 6 plans in 3 waves

Plans:
- [x] 07-01-PLAN.md — Create LevelIntro composition with Ken Burns zoom effect
- [x] 07-02-PLAN.md — Create WorldTransition composition with portal animation
- [x] 07-03-PLAN.md — Create Tutorial composition with UI highlights
- [x] 07-04-PLAN.md — Create batch rendering script for all video variants
- [x] 07-05-PLAN.md — Create CutscenePlayer React component
- [x] 07-06-PLAN.md — Integrate cutscenes into adventure mode flow

### Phase 8: Wikipedia Integration
**Goal**: Wikipedia word extraction pipeline reliably syncs curated words to game dictionary
**Depends on**: Phase 1 (infrastructure stable)
**Requirements**: FIX-01, FIX-02
**Success Criteria** (what must be TRUE):
  1. Admin can extract words from Wikipedia page URLs via dashboard
  2. Extracted words appear in game dictionary and validate correctly during gameplay
  3. Word sync happens reliably without manual intervention
  4. Admin sees confirmation when words successfully added to dictionary
  5. System handles edge cases (duplicate words, invalid formats, non-English pages)
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: Invalid Word System
**Goal**: Admin can review and approve frequently submitted invalid words to improve dictionary
**Depends on**: Phase 8 (word pipeline working)
**Requirements**: FIX-03, FIX-04, FIX-05
**Success Criteria** (what must be TRUE):
  1. System tracks how many times each invalid word is submitted by players
  2. Admin dashboard shows queue of popular invalid words sorted by frequency
  3. Admin can approve words from queue with one click, adding to valid dictionary
  4. Approved words immediately validate correctly in new games
  5. Queue shows context (example sentences, rejection reasons) to aid review decisions
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

### Phase 10: Bug Fixes & Stabilization
**Goal**: Daily challenge works reliably and loose ends are resolved for production readiness
**Depends on**: Phase 9 (core features stable)
**Requirements**: FIX-06, FIX-07
**Success Criteria** (what must be TRUE):
  1. Daily challenge word hunt mode works without crashes or incorrect scoring
  2. All discovered bugs from previous phases are fixed and verified
  3. Build passes all tests and linting with zero errors
  4. Performance metrics meet targets (Lighthouse 90+, FCP <2s, no memory leaks)
  5. Game works correctly in all 4 languages including Hebrew RTL edge cases
**Plans**: TBD

Plans:
- [ ] 10-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Foundation | 6/6 | Complete | 2026-01-22 |
| 2. Core Game Juice | 3/3 | Complete | 2026-01-22 |
| 3. Level Entry Experience | 3/3 | Complete | 2026-01-22 |
| 4. World Theming | 3/3 | Complete | 2026-01-22 |
| 5. Lexi Personality | 3/3 | Complete | 2026-01-22 |
| 6. AI Asset Generation | 4/4 | Complete | 2026-01-23 |
| 7. Video Cutscenes | 6/6 | Complete | 2026-01-23 |
| 8. Wikipedia Integration | 0/TBD | Not started | - |
| 9. Invalid Word System | 0/TBD | Not started | - |
| 10. Bug Fixes & Stabilization | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-22*
*Last updated: 2026-01-23 (Phase 7 planned)*
