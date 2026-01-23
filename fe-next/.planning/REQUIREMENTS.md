# Requirements: LexiClash Stabilization

**Defined:** 2026-01-22
**Core Value:** Adventure mode must feel immersive and connected to its themed worlds

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Adventure Polish

- [x] **ADV-01**: World-specific parallax backgrounds for Worlds 1-3
- [x] **ADV-02**: World-specific floating particles (meadow butterflies, spring droplets, cave crystals)
- [x] **ADV-03**: Dynamic board theming that matches current world
- [x] **ADV-04**: Word selection trail animation (connecting line between tiles)
- [x] **ADV-05**: Letter pop animation on valid word
- [x] **ADV-06**: Score pop-up animation with combo multipliers
- [x] **ADV-07**: Level entry tile cascade animation
- [x] **ADV-08**: Objective cards slide-in reveal
- [x] **ADV-09**: "Level X" title burst animation
- [x] **ADV-10**: Lexi mascot celebration reactions on achievements
- [x] **ADV-11**: Lexi contextual feedback (encouragement, hints)
- [x] **ADV-12**: Level complete star burst animation

### Content Creation

- [ ] **CONT-01**: AI-generated backgrounds for Alphabet Meadows (World 1)
- [ ] **CONT-02**: AI-generated backgrounds for Synonym Springs (World 2)
- [ ] **CONT-03**: AI-generated backgrounds for Root Caverns (World 3)
- [ ] **CONT-04**: Lexi mascot sprite sheets (idle, celebrate, sad, hint)
- [ ] **CONT-05**: Gold tile graphics with sparkle effect
- [ ] **CONT-06**: Ice tile graphics with frozen appearance
- [ ] **CONT-07**: Bomb tile graphics with pulse effect
- [ ] **CONT-08**: Rainbow/wildcard tile graphics
- [ ] **CONT-09**: Background removal pipeline for generated assets
- [ ] **CONT-10**: Level intro cutscene video (Remotion)
- [ ] **CONT-11**: World transition video (Remotion)
- [ ] **CONT-12**: Tutorial/onboarding video (Remotion)

### Bug Fixes

- [x] **FIX-01**: Wikipedia word extraction pipeline working
- [x] **FIX-02**: Words sync from admin dashboard to game dictionary
- [ ] **FIX-03**: Track frequently rejected invalid words
- [ ] **FIX-04**: Admin review queue for popular invalid submissions
- [ ] **FIX-05**: Approve words from admin queue to dictionary
- [ ] **FIX-06**: Daily challenge word hunt bugs (discover and fix)
- [ ] **FIX-07**: General loose ends and bug fixes throughout

### Infrastructure

- [x] **INF-01**: Remotion workspace setup alongside Next.js
- [x] **INF-02**: React 18 isolation for Remotion (React 19 incompatible)
- [x] **INF-03**: AI image generation API integration (Image MCP or Flux 2)
- [x] **INF-04**: Python microservice for background removal (rembg)
- [x] **INF-05**: Asset optimization pipeline (WebP, <200KB)
- [x] **INF-06**: Video delivery strategy (CDN vs bundled)

## v2 Requirements

Deferred to future milestone. Not in current roadmap.

### Adventure Expansion

- **ADV-V2-01**: Boss battles (Crystal Dragon, etc.)
- **ADV-V2-02**: Chain/cascade auto-combo system
- **ADV-V2-03**: Worlds 4+ content
- **ADV-V2-04**: Special abilities system

### Content Expansion

- **CONT-V2-01**: More character assets (enemies, NPCs)
- **CONT-V2-02**: Audio/sound effects integration
- **CONT-V2-03**: World-specific music

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 3D effects | Complexity, not aligned with neo-brutalist style |
| Unskippable cutscenes | Research shows players resent forced waits |
| Per-level unique mechanics | Scope creep, save for future milestone |
| Multiplayer adventure mode | Focus on single-player polish first |
| Procedural level generation | Manual curation provides better quality |
| Mobile app | Web-first, mobile apps are future milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INF-01 | Phase 1 | Complete |
| INF-02 | Phase 1 | Complete |
| INF-03 | Phase 1 | Complete |
| INF-04 | Phase 1 | Complete |
| INF-05 | Phase 1 | Complete |
| INF-06 | Phase 1 | Complete |
| ADV-04 | Phase 2 | Complete |
| ADV-05 | Phase 2 | Complete |
| ADV-06 | Phase 2 | Complete |
| ADV-07 | Phase 3 | Complete |
| ADV-08 | Phase 3 | Complete |
| ADV-09 | Phase 3 | Complete |
| ADV-01 | Phase 4 | Complete |
| ADV-02 | Phase 4 | Complete |
| ADV-03 | Phase 4 | Complete |
| ADV-10 | Phase 5 | Complete |
| ADV-11 | Phase 5 | Complete |
| ADV-12 | Phase 5 | Complete |
| CONT-01 | Phase 6 | Pending |
| CONT-02 | Phase 6 | Pending |
| CONT-03 | Phase 6 | Pending |
| CONT-04 | Phase 6 | Pending |
| CONT-05 | Phase 6 | Pending |
| CONT-06 | Phase 6 | Pending |
| CONT-07 | Phase 6 | Pending |
| CONT-08 | Phase 6 | Pending |
| CONT-09 | Phase 6 | Pending |
| CONT-10 | Phase 7 | Pending |
| CONT-11 | Phase 7 | Pending |
| CONT-12 | Phase 7 | Pending |
| FIX-01 | Phase 8 (Plans 08-01, 08-03, 08-04) | Complete |
| FIX-02 | Phase 8 (Plans 08-02, 08-04) | Complete |
| FIX-03 | Phase 9 | Pending |
| FIX-04 | Phase 9 | Pending |
| FIX-05 | Phase 9 | Pending |
| FIX-06 | Phase 10 | Pending |
| FIX-07 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-23 (Phase 8 planned: 4 plans created)*
