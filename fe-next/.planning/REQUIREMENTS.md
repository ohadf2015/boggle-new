# Requirements: LexiClash Stabilization

**Defined:** 2026-01-22
**Core Value:** Adventure mode must feel immersive and connected to its themed worlds

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Adventure Polish

- [ ] **ADV-01**: World-specific parallax backgrounds for Worlds 1-3
- [ ] **ADV-02**: World-specific floating particles (meadow butterflies, spring droplets, cave crystals)
- [ ] **ADV-03**: Dynamic board theming that matches current world
- [ ] **ADV-04**: Word selection trail animation (connecting line between tiles)
- [ ] **ADV-05**: Letter pop animation on valid word
- [ ] **ADV-06**: Score pop-up animation with combo multipliers
- [ ] **ADV-07**: Level entry tile cascade animation
- [ ] **ADV-08**: Objective cards slide-in reveal
- [ ] **ADV-09**: "Level X" title burst animation
- [ ] **ADV-10**: Lexi mascot celebration reactions on achievements
- [ ] **ADV-11**: Lexi contextual feedback (encouragement, hints)
- [ ] **ADV-12**: Level complete star burst animation

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

- [ ] **FIX-01**: Wikipedia word extraction pipeline working
- [ ] **FIX-02**: Words sync from admin dashboard to game dictionary
- [ ] **FIX-03**: Track frequently rejected invalid words
- [ ] **FIX-04**: Admin review queue for popular invalid submissions
- [ ] **FIX-05**: Approve words from admin queue to dictionary
- [ ] **FIX-06**: Daily challenge word hunt bugs (discover and fix)
- [ ] **FIX-07**: General loose ends and bug fixes throughout

### Infrastructure

- [ ] **INF-01**: Remotion workspace setup alongside Next.js
- [ ] **INF-02**: React 18 isolation for Remotion (React 19 incompatible)
- [ ] **INF-03**: AI image generation API integration (Image MCP or Flux 2)
- [ ] **INF-04**: Python microservice for background removal (rembg)
- [ ] **INF-05**: Asset optimization pipeline (WebP, <200KB)
- [ ] **INF-06**: Video delivery strategy (CDN vs bundled)

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
| INF-01 | Phase 1 | Pending |
| INF-02 | Phase 1 | Pending |
| INF-03 | Phase 1 | Pending |
| INF-04 | Phase 1 | Pending |
| INF-05 | Phase 1 | Pending |
| INF-06 | Phase 1 | Pending |
| ADV-04 | Phase 2 | Pending |
| ADV-05 | Phase 2 | Pending |
| ADV-06 | Phase 2 | Pending |
| ADV-07 | Phase 3 | Pending |
| ADV-08 | Phase 3 | Pending |
| ADV-09 | Phase 3 | Pending |
| ADV-01 | Phase 4 | Pending |
| ADV-02 | Phase 4 | Pending |
| ADV-03 | Phase 4 | Pending |
| ADV-10 | Phase 5 | Pending |
| ADV-11 | Phase 5 | Pending |
| ADV-12 | Phase 5 | Pending |
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
| FIX-01 | Phase 8 | Pending |
| FIX-02 | Phase 8 | Pending |
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
*Last updated: 2026-01-22 after initial definition*
