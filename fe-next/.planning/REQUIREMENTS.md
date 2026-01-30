# Requirements: LexiClash v2.0

**Defined:** 2026-01-30
**Core Value:** Adventure mode must feel immersive and connected to its themed worlds

## v2.0 Requirements

Requirements for Adventure Overhaul milestone. Each maps to roadmap phases.

### Meta-Progression Foundation

- [ ] **META-01**: User earns XP from adventure level completion
- [ ] **META-02**: User sees XP progress bar toward next level
- [ ] **META-03**: User levels up based on XP accumulation
- [ ] **META-04**: User earns gold currency from level completion
- [ ] **META-05**: User can spend gold on permanent stat upgrades (+10% time, +5% score)
- [ ] **META-06**: User sees persistent player level across all worlds

### Game Juice & Visual Feedback

- [ ] **JUICE-01**: User sees screen shake (0.1-0.3s, 2-8px intensity) on combo completion
- [ ] **JUICE-02**: User sees particle effects with adaptive budget (50-100 particles max)
- [ ] **JUICE-03**: User sees combo scaling animations (Nice! → Great! → Amazing! → LEGENDARY!)
- [ ] **JUICE-04**: User sees score popup animations with arc trajectory to counter
- [ ] **JUICE-05**: Animations respect reduced-motion preference (accessibility)

### UI Framework

- [ ] **UI-01**: User sees HUD with clear visual hierarchy (timer, score, objectives)
- [ ] **UI-02**: User sees determinate progress bars for objectives
- [ ] **UI-03**: User sees floating score animations during gameplay
- [ ] **UI-04**: User sees clear focus on board during gameplay (streamlined interface)
- [ ] **UI-05**: User sees cooldown visualization (radial progress) for power-ups

### Dynamic Board Mechanics

- [ ] **BOARD-01**: User sees tiles cascade (Candy Crush pattern: collapse → fall → refill, 0.25s per step)
- [ ] **BOARD-02**: User sees smooth tile movement (quadratic/elastic easing)
- [ ] **BOARD-03**: User sees explosion effects for multi-tile clearing
- [ ] **BOARD-04**: User sees special tile types (frozen, locked, multiplier)
- [ ] **BOARD-05**: Cascades trigger automatically when words removed
- [ ] **BOARD-06**: Board transformations animate at 60fps on mobile (iPhone 12 baseline)

### Power-Up System

- [ ] **POWER-01**: User can activate "Freeze Time" power-up (extends timer by 10s)
- [ ] **POWER-02**: User can activate "Hint" power-up (reveals valid word on board)
- [ ] **POWER-03**: User can activate "Score Multiplier" power-up (2x score for 30s)
- [ ] **POWER-04**: User sees power-up cooldown timers (60s between uses)
- [ ] **POWER-05**: User sees activation animations (0.25s burst effect)
- [ ] **POWER-06**: Power-ups inventory persists across levels
- [ ] **POWER-07**: Every level is beatable without power-ups (skill-based balance)

### Adaptive Difficulty

- [ ] **DIFF-01**: User can select explicit difficulty (Easy/Medium/Hard)
- [ ] **DIFF-02**: System selects pre-game difficulty based on performance (3-state: easy/normal/hard)
- [ ] **DIFF-03**: System provides gradual unlock hints after 3 failures
- [ ] **DIFF-04**: Difficulty adjustments are invisible to user (no rubber-banding perception)
- [ ] **DIFF-05**: Boss fights have fixed difficulty (learnable patterns)

### Boss Battle Overhaul

- [ ] **BOSS-01**: User battles bosses with 5-phase state machine (intro → phase1 → phase2 → enraged → victory/defeat)
- [ ] **BOSS-02**: User sees segmented HP bar with phase indicators
- [ ] **BOSS-03**: User sees telegraphed boss attacks (2s visual warning before activation)
- [ ] **BOSS-04**: User sees 5-10s cinematic intro (skippable after 2s)
- [ ] **BOSS-05**: Bosses have 2-3 unique abilities per boss
- [ ] **BOSS-06**: Boss abilities registered in extensible ability system
- [ ] **BOSS-07**: Boss entrance and defeat have cinematic sequences
- [ ] **BOSS-08**: User sees unique graphics per boss (Image MCP + rembg pipeline)

### Skill Tree & Progression Depth

- [ ] **SKILL-01**: User can unlock skills in branching tree (3 paths: Power, Strategy, Utility)
- [ ] **SKILL-02**: User earns skill points on level up
- [ ] **SKILL-03**: User sees skill tree visualization with locked/unlocked states
- [ ] **SKILL-04**: Skills provide horizontal progression (enable strategies, not just +10% stats)
- [ ] **SKILL-05**: User unlocks power-up slots via skill tree
- [ ] **SKILL-06**: User unlocks advanced power-ups via skill progression

### Achievement System

- [ ] **ACHIEVE-01**: User earns achievements for gameplay milestones
- [ ] **ACHIEVE-02**: User sees achievement unlock modal when earning badge
- [ ] **ACHIEVE-03**: User can view earned achievements in profile
- [ ] **ACHIEVE-04**: Achievements have tiers (Bronze/Silver/Gold/Platinum)

### Visual Polish & Effects

- [ ] **POLISH-01**: User sees confetti effects on level victory
- [ ] **POLISH-02**: User sees fireworks on boss defeat
- [ ] **POLISH-03**: User sees 10+ combo full-screen celebration effects
- [ ] **POLISH-04**: User sees layered particle effects (background, mid-ground, foreground)
- [ ] **POLISH-05**: User sees victory/defeat cinematics (Remotion-generated)
- [ ] **POLISH-06**: Particle system enforces budget (max 50-100 on screen, adaptive)

### Cinematic System

- [ ] **CINE-01**: User sees boss entrance cutscene (5-10s, Remotion-based)
- [ ] **CINE-02**: User sees victory celebration sequence
- [ ] **CINE-03**: User sees defeat sequence
- [ ] **CINE-04**: All cinematics are skippable after 2s
- [ ] **CINE-05**: Cinematics use Remotion + Lottie + Skia for effects

### Dynamic Difficulty Tuning (Advanced)

- [ ] **DDA-01**: System tracks performance metrics (words per minute, success rate, combo length)
- [ ] **DDA-02**: AI Director adjusts intensity based on player flow state
- [ ] **DDA-03**: Mid-game adjustments are invisible (gradual, not sudden)
- [ ] **DDA-04**: Analytics track difficulty effectiveness
- [ ] **DDA-05**: System excludes boss fights from adaptive scaling

### World Expansion (v1.1 Carryover)

- [ ] **WORLD-01**: World 4 Idiom Archipelago has parallax backgrounds (3-5 layers, tropical islands)
- [ ] **WORLD-02**: World 4 Idiom Archipelago has themed particles (palm fronds, seashells, waves)
- [ ] **WORLD-03**: World 4 Idiom Archipelago has board decorations (tiki borders, island accents)
- [ ] **WORLD-04**: World 4 has AI-generated background assets (WebP, <200KB)
- [ ] **WORLD-05**: World 5 Compound Canyon has parallax backgrounds (3-5 layers, desert cliffs)
- [ ] **WORLD-06**: World 5 Compound Canyon has themed particles (dust, tumbleweeds, heat shimmer)
- [ ] **WORLD-07**: World 5 Compound Canyon has board decorations (canyon rock borders, desert accents)
- [ ] **WORLD-08**: World 5 has AI-generated background assets (WebP, <200KB)

### Tech Debt Cleanup (v1.1 Carryover)

- [ ] **DEBT-01**: Entry sequence timing optimized from 2.38s to 2s target
- [ ] **DEBT-02**: Video MP4 rendering pipeline functional (Remotion render script)
- [ ] **DEBT-03**: Bug fixes for BUG-004 through BUG-008 resolved
- [ ] **DEBT-04**: Lexi stuck detection implemented (30s inactivity triggers help)

## Future Requirements

Deferred to v2.1+ milestones.

### Advanced Features

- **ADV-01**: Combo power-ups (combine 2+ for mega effects)
- **ADV-02**: Contextual power-up suggestions (when player stuck)
- **ADV-03**: Charge-based power-up system (earn through combos)
- **ADV-04**: Prestige system with cross-run unlocks
- **ADV-05**: 4+ phase boss battles (2 phases sufficient for v2.0)
- **ADV-06**: Environmental boss effects (weather, lighting)
- **ADV-07**: Multiple currencies (stick with single gold for v2.0)
- **ADV-08**: Roguelike cross-run progression

### Polish & Refinement

- **POL-01**: Audio theming per world (world-specific sound loops)
- **POL-02**: Haptic feedback for combos and boss hits
- **POL-03**: 3D effects (not aligned with Neo-Brutalist style, deferred)
- **POL-04**: Per-level unique mechanics (cognitive load concern)

## Out of Scope

Explicitly excluded from v2.0 milestone.

| Feature | Reason |
|---------|--------|
| Multiplayer adventure mode | Scope creep, single-player polish first |
| 3D effects or environments | Not aligned with Neo-Brutalist design, performance concerns |
| Complex AI boss behavior | Start with rule-based, defer adaptive AI to future |
| Procedurally generated levels | Quality control, hand-crafted preferred |
| Lengthy unskippable cutscenes | Accessibility violation, player frustration (all cinematics skip after 2s) |
| Free-to-play monetization | Premium game, power-ups never required |
| Cross-platform cloud saves | Web-first for v2.0, defer to platform integration |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### Phase 26: Meta-Progression Foundation
- META-01, META-02, META-03, META-04, META-05, META-06
- JUICE-01, JUICE-02, JUICE-03, JUICE-04, JUICE-05
- UI-01, UI-02, UI-03, UI-04, UI-05

### Phase 27: Dynamic Board Mechanics
- BOARD-01, BOARD-02, BOARD-03, BOARD-04, BOARD-05, BOARD-06

### Phase 28: Power-Up System
- POWER-01, POWER-02, POWER-03, POWER-04, POWER-05, POWER-06, POWER-07

### Phase 29: Adaptive Difficulty System
- DIFF-01, DIFF-02, DIFF-03, DIFF-04, DIFF-05

### Phase 30: Boss Battle Overhaul
- BOSS-01, BOSS-02, BOSS-03, BOSS-04, BOSS-05, BOSS-06, BOSS-07, BOSS-08

### Phase 31: Skill Tree & Progression Depth
- SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-05, SKILL-06
- ACHIEVE-01, ACHIEVE-02, ACHIEVE-03, ACHIEVE-04

### Phase 32: Visual Polish & Effects
- POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05, POLISH-06

### Phase 33: Cinematic System
- CINE-01, CINE-02, CINE-03, CINE-04, CINE-05

### Phase 34: Dynamic Difficulty Tuning (AI Director)
- DDA-01, DDA-02, DDA-03, DDA-04, DDA-05

### Phase 35: World Expansion & Tech Debt Cleanup
- WORLD-01, WORLD-02, WORLD-03, WORLD-04, WORLD-05, WORLD-06, WORLD-07, WORLD-08
- DEBT-01, DEBT-02, DEBT-03, DEBT-04

**Coverage Summary:**
- v2.0 requirements: 76 total
- Mapped to phases: 76/76 (100%)
- Unmapped: 0

| Requirement | Phase | Status |
|-------------|-------|--------|
| META-01 | Phase 26 | Pending |
| META-02 | Phase 26 | Pending |
| META-03 | Phase 26 | Pending |
| META-04 | Phase 26 | Pending |
| META-05 | Phase 26 | Pending |
| META-06 | Phase 26 | Pending |
| JUICE-01 | Phase 26 | Pending |
| JUICE-02 | Phase 26 | Pending |
| JUICE-03 | Phase 26 | Pending |
| JUICE-04 | Phase 26 | Pending |
| JUICE-05 | Phase 26 | Pending |
| UI-01 | Phase 26 | Pending |
| UI-02 | Phase 26 | Pending |
| UI-03 | Phase 26 | Pending |
| UI-04 | Phase 26 | Pending |
| UI-05 | Phase 26 | Pending |
| BOARD-01 | Phase 27 | Pending |
| BOARD-02 | Phase 27 | Pending |
| BOARD-03 | Phase 27 | Pending |
| BOARD-04 | Phase 27 | Pending |
| BOARD-05 | Phase 27 | Pending |
| BOARD-06 | Phase 27 | Pending |
| POWER-01 | Phase 28 | Pending |
| POWER-02 | Phase 28 | Pending |
| POWER-03 | Phase 28 | Pending |
| POWER-04 | Phase 28 | Pending |
| POWER-05 | Phase 28 | Pending |
| POWER-06 | Phase 28 | Pending |
| POWER-07 | Phase 28 | Pending |
| DIFF-01 | Phase 29 | Pending |
| DIFF-02 | Phase 29 | Pending |
| DIFF-03 | Phase 29 | Pending |
| DIFF-04 | Phase 29 | Pending |
| DIFF-05 | Phase 29 | Pending |
| BOSS-01 | Phase 30 | Pending |
| BOSS-02 | Phase 30 | Pending |
| BOSS-03 | Phase 30 | Pending |
| BOSS-04 | Phase 30 | Pending |
| BOSS-05 | Phase 30 | Pending |
| BOSS-06 | Phase 30 | Pending |
| BOSS-07 | Phase 30 | Pending |
| BOSS-08 | Phase 30 | Pending |
| SKILL-01 | Phase 31 | Pending |
| SKILL-02 | Phase 31 | Pending |
| SKILL-03 | Phase 31 | Pending |
| SKILL-04 | Phase 31 | Pending |
| SKILL-05 | Phase 31 | Pending |
| SKILL-06 | Phase 31 | Pending |
| ACHIEVE-01 | Phase 31 | Pending |
| ACHIEVE-02 | Phase 31 | Pending |
| ACHIEVE-03 | Phase 31 | Pending |
| ACHIEVE-04 | Phase 31 | Pending |
| POLISH-01 | Phase 32 | Pending |
| POLISH-02 | Phase 32 | Pending |
| POLISH-03 | Phase 32 | Pending |
| POLISH-04 | Phase 32 | Pending |
| POLISH-05 | Phase 32 | Pending |
| POLISH-06 | Phase 32 | Pending |
| CINE-01 | Phase 33 | Pending |
| CINE-02 | Phase 33 | Pending |
| CINE-03 | Phase 33 | Pending |
| CINE-04 | Phase 33 | Pending |
| CINE-05 | Phase 33 | Pending |
| DDA-01 | Phase 34 | Pending |
| DDA-02 | Phase 34 | Pending |
| DDA-03 | Phase 34 | Pending |
| DDA-04 | Phase 34 | Pending |
| DDA-05 | Phase 34 | Pending |
| WORLD-01 | Phase 35 | Pending |
| WORLD-02 | Phase 35 | Pending |
| WORLD-03 | Phase 35 | Pending |
| WORLD-04 | Phase 35 | Pending |
| WORLD-05 | Phase 35 | Pending |
| WORLD-06 | Phase 35 | Pending |
| WORLD-07 | Phase 35 | Pending |
| WORLD-08 | Phase 35 | Pending |
| DEBT-01 | Phase 35 | Pending |
| DEBT-02 | Phase 35 | Pending |
| DEBT-03 | Phase 35 | Pending |
| DEBT-04 | Phase 35 | Pending |

---
*Requirements defined: 2026-01-30*
*Last updated: 2026-01-30 after roadmap creation (76/76 requirements mapped to phases 26-35)*
