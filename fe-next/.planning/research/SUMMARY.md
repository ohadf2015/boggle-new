# v2.0 Adventure Overhaul - Research Summary

**Project:** LexiClash v2.0 Adventure Overhaul
**Domain:** Feature-rich Action-Puzzle Word Game with Dynamic Mechanics
**Researched:** 2026-01-30
**Overall Confidence:** MEDIUM-HIGH

---

## Executive Summary

The v2.0 Adventure Overhaul transforms LexiClash Adventure Mode from a static word-finding puzzle into a visually spectacular, feature-rich experience with dynamic board mechanics, power systems, boss battles, and meta-progression. Research across stack, features, architecture, and pitfalls reveals this is **buildable with the current technology foundation** (Next.js 16, React 19, Framer Motion, Socket.IO), but requires careful attention to **performance optimization and game balance**.

**The recommended approach leverages existing dependencies first**: GSAP for complex board animations, Framer Motion for UI feedback, Zustand for game state, and Immer-based reducers for complex state updates. Add tsParticles for particle effects and enhance the Remotion pipeline for cinematic content. The architecture should use **domain-separated state slices** (game/board/powerups/meta/difficulty) with Framer Motion's `useAnimate()` for precise animation sequencing. Critical success factors include avoiding React Context re-render cascades, preventing animation layout thrashing, and designing power-ups for horizontal (not vertical) progression.

**Key risks center on performance and game balance**: The biggest technical risk is animating CSS layout properties instead of transforms, which will drop mobile performance from 60fps to <30fps. The biggest design risk is power creep, where power-ups become mandatory instead of strategic choices, making the game feel like a "free-to-play grind wall" despite being premium. Both risks are mitigable with proper testing protocols and design principles established upfront.

---

## Strategic Recommendations

Based on synthesis across all research domains, here are the top actionable recommendations:

### 1. **Use Existing Stack, Add Strategically**
- **Leverage GSAP + Framer Motion combo**: GSAP for complex board mechanics (cascades, tile physics), Framer Motion for UI animations
- **Add tsParticles only**: Don't introduce React Spring, Motion One, or other animation libraries (creates redundancy)
- **Keep Zustand**: Already installed, perfect for game state, 3KB vs Redux's 23KB
- **Extend Remotion workflow**: Add Lottie/Skia plugins for boss cinematics, use Remotion Lambda for server-side rendering
- **Rationale**: Minimizes bundle size impact (~15KB total additions), leverages proven dependencies, reduces learning curve

### 2. **Transform-First Animation Architecture**
- **Critical rule**: Only animate `transform` and `opacity` properties (GPU-accelerated)
- **Use Framer Motion's `useAnimate()`**: Orchestrate multi-step sequences (collapse → fall → explode) with awaitable completion
- **Canvas for particles**: DOM can't handle 100+ particles at 60fps, use Canvas with `requestAnimationFrame`
- **Enforce in code review**: Any PR animating `width`, `height`, `margin`, `padding`, or `top/left` should be rejected
- **Rationale**: Prevents layout thrashing (the #1 performance killer), maintains 60fps on mobile

### 3. **Horizontal Power-Up Progression**
- **Design power-ups to enable strategies, not inflate numbers**: "Freeze Time" (new playstyle) > "2x Score" (just easier)
- **Test every level without power-ups first**: Balance for skill, then add power-ups as optional enhancement
- **Soft caps on stacking**: Diminishing returns if combining multiple multipliers
- **Never gate content with power-ups**: Players should win with skill, power-ups should reduce time/effort
- **Rationale**: Avoids "free-to-play grind wall" perception, keeps skill primary, prevents power creep

### 4. **Domain-Separated State Architecture**
- **Split state by concern**: Create separate reducers for game/board/powerups/meta/difficulty (don't balloon existing contexts)
- **Use Immer for nested updates**: Boss phases, cascade chains, skill tree unlocks need clean immutable updates
- **State machine for boss phases**: Explicit transitions (intro → active → enraged → victory/defeat) prevent invalid states
- **Avoid Context re-render cascade**: This codebase already has 17 contexts with 57+ properties in InGameContext — adding more will kill performance
- **Rationale**: Prevents #1 pitfall (Context re-render cascade), enables testable state logic, scales to complex features

### 5. **Invisible Adaptive Difficulty**
- **Pre-game adjustments only**: Select difficulty BEFORE level starts, don't change mid-game (players notice)
- **Transparent player choice**: Offer explicit Easy/Medium/Hard options alongside adaptive system
- **Performance-based unlocks over rubber-banding**: After 3 failures, unlock free hint — don't make board easier
- **Never adjust boss fights**: Boss difficulty must be fixed and learnable through pattern recognition
- **Rationale**: Avoids "rubber-banding perception" (players feel cheated when game is too obvious)

### 6. **Front-Load Technical Risk**
- **Start with Dynamic Board Mechanics**: Highest animation complexity, needs `useAnimate()` research, test performance early
- **Then Power-Ups**: Medium risk, needs balance testing, no dependencies on other systems
- **Boss Battles third**: Requires all mechanics working, needs 5-6 iteration cycles per boss
- **Meta-Progression fourth**: Easier to balance after power-ups are tuned
- **Visual polish last**: Prevents particle overload accumulation, allows adaptive particle budgets
- **Rationale**: Discovers performance bottlenecks early, allows course correction before visual investment

### 7. **Continuous Refactoring Protocol**
- **Allocate 10-15% per sprint to tech debt**: Don't defer to "tech debt sprints" (they never happen)
- **File size enforcement**: Lint rule to fail build if files exceed 500 lines (CLAUDE.md already specifies this)
- **Test coverage must not decrease**: v2.0 should maintain or increase coverage (currently 3,481 tests)
- **Feature-based modules**: Extract large components into feature folders with collocated hooks/utils/types
- **Rationale**: 8 major feature categories will generate tech debt fast; continuous refactoring prevents "development hell"

---

## Technology Stack Synthesis

### Recommended Core Stack

| Category | Technology | Version | Purpose | Confidence |
|----------|------------|---------|---------|------------|
| **Animation (Complex)** | GSAP | 3.14.2 (installed) | Board mechanics, tile cascades, explosions | HIGH |
| **Animation (UI)** | Framer Motion | 12.23.24 (installed) | UI feedback, power-up effects, overlays | HIGH |
| **Particles** | tsParticles | 3.x (NEW) | Explosions, confetti, combo celebrations | MEDIUM |
| **State Management** | Zustand | 5.0.10 (installed) | Game state, power-ups, meta-progression | HIGH |
| **State Machines** | XState | 5.24.0 (installed) | Boss battle phases, complex flows | HIGH |
| **Immutable Updates** | Immer | via use-immer | Nested state updates (cascades, skill tree) | HIGH |
| **Video/Cinematics** | Remotion + Lottie + Skia | Latest | Boss intros, victory sequences | MEDIUM |
| **Image Processing** | rembg (Python) | Latest | Background removal for boss graphics | HIGH |
| **Image Generation** | Hugging Face MCP + FLUX.1 | Latest | Boss graphics, power-up icons | MEDIUM |

### Critical Version Requirements
- **Node.js**: 18.0.0+ (already met)
- **React**: 19.x (already using React 19)
- **TypeScript**: 5.9.3 (already met)
- **No breaking changes required**: All additions are compatible with current stack

### Bundle Size Impact
- **tsParticles**: ~15KB gzipped (lazy load)
- **Remotion**: 0KB runtime (videos pre-rendered)
- **rembg**: 0KB (Python, not bundled)
- **Total runtime impact**: ~15KB (negligible for 309,792 line codebase)

### Stack Contradictions Resolved

**STACK says "use tsParticles" + PITFALLS warns "particle overload":**
- **Resolution**: Use tsParticles but enforce particle budget (max 50-100 on screen, adaptive reduction on low-end devices)
- **Implementation**: Create `useParticleBudget()` hook that detects device performance and limits particle count

**FEATURES says "Candy Crush cascades (0.25s timing)" + ARCHITECTURE says "use Framer Motion sequences":**
- **Resolution**: Use Framer Motion's `useAnimate()` for cascade orchestration with stagger delays matching Candy Crush timing
- **Implementation**: `await animate(tiles, { scale: 0 }, { duration: 0.25, delay: stagger(0.05) })`

**STACK says "Zustand for state" + PITFALLS warns "Context re-render cascade":**
- **Resolution**: Use Zustand for high-frequency state (boss health, combo multipliers), keep React Context for static data (configuration, translations)
- **Implementation**: Migrate boss state and power-up inventory from Context to Zustand stores

---

## Feature Priorities & Implementation Order

### Must Have (Table Stakes - Phase 1)

**From FEATURES.md research:**
1. **Meta-Progression Foundation**
   - XP/level system with player progression
   - Single currency economy (gold)
   - Permanent stat upgrades (+10% time, +5% score)
   - **Why first**: Drives retention, needed before other features unlock

2. **Game Juice (Visual Feedback)**
   - Screen shake (0.1-0.3s, 2-8px intensity)
   - Particle effects with adaptive budget
   - Combo scaling animations
   - **Why first**: Makes existing gameplay feel better, low-hanging fruit

3. **Basic UI Framework**
   - HUD hierarchy (timer, score, objectives)
   - Progress indicators (determinate bars)
   - Floating score animations
   - **Why first**: Foundation for all other features

### Should Have (Competitive - Phase 2)

4. **Dynamic Board Mechanics**
   - Tile cascades (Candy Crush pattern: 0.25s per step)
   - Smooth tile movement (quadratic/elastic easing)
   - Explosion effects (multi-tile clearing)
   - **Why second**: Differentiator vs static word games, depends on animation foundation

5. **Power-Up System**
   - 3 core power-ups (Freeze Time, Hint, Score Multiplier)
   - Cooldown visualization (radial progress)
   - Activation animations (0.25s burst)
   - **Why second**: Strategic depth, no dependencies

6. **Adaptive Difficulty (Basic)**
   - 3-state system (easy/normal/hard)
   - Pre-game adjustment based on performance
   - Gradual unlock hints after failures
   - **Why second**: Keeps all skill levels engaged

### High Impact (Endgame - Phase 3)

7. **Boss Battle Overhaul**
   - Segmented health bars with phase indicators
   - Telegraphed attacks (2s visual warning)
   - 2-phase battles (75%-50%-0%)
   - Pattern recognition mechanics
   - **Why third**: Requires all mechanics working, memorable moments

8. **Cinematic System**
   - 5-10s boss entrance cutscenes (skippable after 2s)
   - Victory celebrations with confetti
   - Remotion-based video generation
   - **Why third**: Polish layer on top of mechanics

9. **Advanced Power-Ups**
   - Combo power-ups (combine 2+ for mega effects)
   - Contextual suggestions (when player stuck)
   - Charge-based system (earn through combos)
   - **Why third**: Rewards mastery, builds on basic system

### Defer to v2.1+ (Post-MVP)

- **Branching skill trees**: Complex economy balancing, test single-path first
- **Multiple currencies**: Adds complexity, validate single currency works
- **Prestige system**: Late-game concern, needs extensive playtesting
- **4+ phase bosses**: 2 phases sufficient for MVP
- **Environmental boss effects**: Nice-to-have, focus on core mechanics
- **Cross-run unlocks (roguelike)**: May conflict with progression, iterate later

---

## Architectural Decisions

### Core Pattern: Domain-Separated Reducers with Immer

**From ARCHITECTURE.md:**

```typescript
interface AdventureState {
  game: GameCoreState;           // Existing gameplay
  board: BoardDynamicsState;     // NEW: Cascades, moving tiles
  powerUps: PowerUpState;        // NEW: Inventory, cooldowns
  meta: MetaProgressionState;    // NEW: Skill tree, upgrades
  difficulty: DifficultyState;   // NEW: Adaptive scaling
}

// Use Immer for clean nested updates
const [state, dispatch] = useImmerReducer(adventureReducer, initialState);
```

**Why this pattern:**
- Clear separation of concerns (each domain has its own reducer)
- Immer provides 2-6x better performance than handcrafted reducers for nested updates
- Enables testable pure functions (reducers are easy to test)
- Scales to complex features (boss phases, cascade chains, skill unlocks)

### Animation Sequencing: Framer Motion `useAnimate()`

**From ARCHITECTURE.md + FEATURES.md:**

```typescript
const { scope, playCascadeSequence } = useCascadeAnimation();

async function playCascadeSequence(tiles: number[]) {
  // Step 1: Collapse (0.25s with stagger)
  await animate(tiles, { scale: 0.8, opacity: 0.5 },
    { duration: 0.2, delay: stagger(0.05) });

  // Step 2: Remove (0.1s instant)
  await animate(tiles, { opacity: 0, scale: 0 }, { duration: 0.1 });

  // Step 3: Fall (0.3s gravity)
  await animate(fallingTiles, { y: [0, 100] }, { duration: 0.3, ease: 'easeIn' });

  // Step 4: Score popup (0.6s arc to counter)
  await animate(scorePopup, { x: targetX, y: targetY, opacity: 0 },
    { duration: 0.6, ease: 'easeOut' });
}
```

**Why this pattern:**
- Orchestrates multi-step sequences with precise timing
- Awaitable completion prevents state updates mid-animation (prevents jank)
- CSS selectors target elements without manual refs
- Matches Candy Crush timing (0.25s per cascade step)

### Performance Strategy: Transform-First + Canvas Fallback

**From ARCHITECTURE.md + PITFALLS.md:**

**DOM animations (UI elements):**
- Animate `transform` (translateX/Y, scale, rotate) and `opacity` ONLY
- Never animate `width`, `height`, `margin`, `padding`, `top`, `left` (layout thrashing)
- Use `will-change: transform` for hint to browser

**Canvas rendering (particles):**
- Use for >20 particles (DOM can't handle this at 60fps)
- `requestAnimationFrame` loop for smooth 60fps
- Particle pooling to avoid GC pauses

**Adaptive quality:**
```typescript
const particleCount = isLowEndDevice ? 50 : 200;
```

### Boss System: State Machine + Ability Registry

**From ARCHITECTURE.md:**

```typescript
const bossBattleMachine = {
  intro: { onEnter: playIntroVideo, canTransitionTo: ['phase1'] },
  phase1: { onEnter: activatePhase1Abilities, canTransitionTo: ['phase2', 'victory', 'defeat'] },
  phase2: { onEnter: activatePhase2Abilities, canTransitionTo: ['enraged', 'victory', 'defeat'] },
  enraged: { onEnter: increaseAbilityFrequency, canTransitionTo: ['victory', 'defeat'] }
};

interface BossAbility {
  id: string;
  type: 'passive' | 'active' | 'reaction';
  cooldown: number;
  trigger: (gameState: GameState) => boolean;
  effect: (gameState: GameState) => GameState;
  animation: AnimationConfig;
}
```

**Why this pattern:**
- State machine prevents invalid transitions (can't go from intro to enraged)
- Ability registry makes bosses extensible (add new abilities without changing core logic)
- Type-safe transitions catch bugs at compile time

### Database Schema: JSONB for Flexibility

**From ARCHITECTURE.md:**

```sql
-- Meta-progression with flexible skill tree data
CREATE TABLE adventure_meta_progression (
  user_id UUID PRIMARY KEY,
  player_level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  skill_points INTEGER DEFAULT 0,
  unlocked_worlds INTEGER[] DEFAULT ARRAY[1]
);

-- Skill definitions with JSONB for effects
CREATE TABLE adventure_skills (
  skill_id VARCHAR(50) PRIMARY KEY,
  skill_name JSONB NOT NULL,           -- Translated names
  effects JSONB NOT NULL,              -- { "freezeDuration": 2, "scoreMultiplier": 1.2 }
  prerequisites VARCHAR(50)[]
);
```

**Why JSONB:**
- Flexible schema for skill effects (don't know all upgrade types upfront)
- Fast queries with GIN indexes
- Supports translations without separate table

---

## Risk Mitigation & Critical Pitfalls

### Top 5 Critical Risks (from PITFALLS.md)

#### 1. React Context Re-render Cascade (CRITICAL)

**Risk**: InGameContext has 57 properties, ProgressionContext has 16 properties, adding boss/power-up state will cause every context consumer to re-render on any change → 60fps drops to <30fps.

**Prevention**:
- **Split contexts by concern**: Create separate BossContext, PowerUpContext (don't expand InGameContext)
- **Separate data from API**: Read-only data in one context, callbacks in another
- **Memoize provider values**: Already documented in InGameContext.tsx line 74 — ENFORCE for new contexts
- **Consider Zustand**: For high-frequency state (boss health, combo multipliers)

**Detection**:
- React DevTools Profiler: If component re-renders >5 times during single animation, context is too large
- Test on low-end device (iPhone 12), not just MacBook

#### 2. Framer Motion Layout Thrashing (CRITICAL)

**Risk**: Animating `width`, `height`, `margin`, `padding`, `top`, `left` triggers layout recalculation 60x per second → 60fps to 15fps on mobile.

**Prevention**:
- **Animate transforms only**: Use `transform: translate()` instead of `left/top`
- **Opacity is safe**: Only non-transform property that's cheap
- **Leverage AdaptiveMotion**: Codebase already has performance-aware components — USE THEM
- **Code review enforcement**: Reject PRs animating layout properties

**Detection**:
- Chrome DevTools Performance tab: "Recalculate Style" >5ms is bad
- Paint flashing: If entire screen flashes green during animation, you're animating wrong properties
- Test on actual iPhone 12/13, not simulator

#### 3. Power Creep (CRITICAL)

**Risk**: Power-ups become "essential" instead of "helpful," later bosses impossible without power-ups, players perceive "pay-to-win" grind even though game is premium.

**Prevention**:
- **Horizontal progression**: "Freeze Time" (new strategy) > "2x Score" (just easier)
- **Design content WITHOUT power-ups first**: Balance level, then add power-ups as optional
- **Test every level without power-ups**: Must be beatable with skill alone
- **Soft caps on stacking**: Diminishing returns on multiple multipliers

**Detection**:
- Playtesters say "I can't beat this without power-ups" (bad sign)
- Players feel forced to grind for power-ups to progress

#### 4. Rubber-Banding Perception (CRITICAL)

**Risk**: Players notice adaptive difficulty and feel game is "cheating" or "patronizing" — "the game gave me easy words" undermines accomplishment.

**Prevention**:
- **Make it invisible**: DDA adjustments must be subtle and unnoticeable
- **Pre-game only**: Select difficulty BEFORE level, don't adjust mid-game (too obvious)
- **Transparent options**: Let players choose Easy/Medium/Hard explicitly
- **Never adjust boss fights**: Boss difficulty must be fixed and learnable

**Detection**:
- Playtest with think-aloud: If players say "that felt too easy," DDA is too obvious
- Watch for pattern recognition: Players saying "board always gets easier after I fail"

#### 5. Visual Overload & Accessibility (MODERATE)

**Risk**: Too many particles, animations, visual effects cause sensory overload, players with photosensitivity/ADHD/motion sensitivity can't play.

**Prevention**:
- **Extend reduced-motion support**: AdaptiveMotion.tsx already exists — extend to particles
- **Particle budget**: Max 50-100 particles on screen simultaneously
- **Accessibility settings**: Disable screen shake, reduce particle density
- **Color-blind modes**: Test with simulators

**2026 trend alignment**:
- Industry moving toward "minimalist UI, less clutter, more clarity"
- Games like Alto's Odyssey use environmental cues instead of HUD chaos
- This aligns with Neo-Brutalist design (already bold and high-contrast)

---

## Phase Sequencing Guidance

Based on combined research findings, here's the recommended phase order with rationale:

### Phase 1: Foundation (Core Systems)

**What to build:**
- Meta-progression foundation (XP, levels, single currency)
- Game juice infrastructure (screen shake, particle system with budget, combo scaling)
- UI framework (HUD, progress bars, floating score animations)

**Why first:**
- **Dependency**: Meta-progression needed before skill trees and power-ups unlock
- **Low risk**: Well-documented patterns (Clash of Clans economy, mobile UI standards)
- **High impact**: Makes existing gameplay feel better immediately
- **Architecture setup**: Establishes domain-separated state pattern for later features

**Avoids pitfalls:**
- Sets particle budget upfront (prevents visual overload accumulation)
- Creates accessibility framework early (reduced motion, particle limits)
- Establishes memoization patterns for contexts (prevents re-render cascade later)

**Technology focus:**
- Zustand for meta-progression state
- Framer Motion for UI animations
- tsParticles setup with adaptive budget

**Research flags:**
- Standard patterns, skip `/gsd:research-phase`
- May need UX prototyping for skill point unlock cadence

---

### Phase 2: Dynamic Mechanics (Differentiation)

**What to build:**
- Tile cascades (Candy Crush pattern: collapse → fall → refill)
- Smooth tile movement (quadratic/elastic easing functions)
- Explosion effects (multi-tile clearing)
- Power-up system (Freeze Time, Hint, Score Multiplier)
- Basic adaptive difficulty (3-state pre-game adjustment)

**Why second:**
- **Dependency**: Requires animation foundation from Phase 1
- **High technical risk**: Front-load animation complexity early for course correction
- **Differentiator**: Moving tiles + cascades distinguish from static word games
- **Independent**: Power-ups and difficulty don't depend on bosses

**Avoids pitfalls:**
- Tests `useAnimate()` sequences early (if animation layout thrashes, discover now)
- Validates power-up horizontal progression before adding more (prevents power creep)
- Establishes performance baseline on mobile (60fps or fail)

**Technology focus:**
- GSAP for complex tile physics
- Framer Motion `useAnimate()` for cascade sequences
- Immer-based board reducer for cascade chains
- Canvas rendering for explosion particles

**Research flags:**
- **Needs `/gsd:research-phase`**: Animation timing, easing functions, cascade chain limits
- **Performance testing critical**: Test on iPhone 12 continuously

---

### Phase 3: Boss Battles (Memorable Moments)

**What to build:**
- Boss state machine (intro → phase1 → phase2 → enraged → victory/defeat)
- Telegraphed attack system (2s visual warnings)
- Segmented health bars with phase indicators
- Boss ability registry (2-3 abilities per boss)
- 5-10s cinematic intros (Remotion-based, skippable after 2s)

**Why third:**
- **Dependency**: Requires board mechanics and power-ups from Phase 2
- **High iteration cost**: Bosses need 5-6 playtesting cycles, expensive to test
- **Memorable**: Creates shareable moments, retention driver
- **Integration complexity**: Combines all systems (state, animation, abilities, UI)

**Avoids pitfalls:**
- Tests boss clarity early with fresh playtesters (not developers who know mechanics)
- Fixed boss difficulty (no adaptive scaling in boss fights)
- Cinematics stay short and skippable (prevents player frustration)

**Technology focus:**
- XState for boss state machine
- Remotion + Lottie for boss intros
- Image MCP + rembg for boss graphics pipeline
- Boss ability system architecture

**Research flags:**
- **Needs `/gsd:research-phase`**: Boss attack patterns for word games (unusual domain)
- **Iteration budget**: Plan for 5-6 playtesting cycles per boss
- **Visual asset pipeline**: Test Remotion rendering performance

---

### Phase 4: Meta-Progression Depth (Retention)

**What to build:**
- Branching skill tree (3 paths: Power, Strategy, Utility)
- Permanent upgrades (+10% time, +5% score, power-up discounts)
- Achievement system with unlock rewards
- Power-up inventory management

**Why fourth:**
- **Dependency**: Requires power-ups balanced from Phase 2
- **Lower risk**: Standard mobile game patterns (Puzzle Quest, Clash of Clans)
- **Retention layer**: Adds long-term progression on top of mechanics
- **Balancing**: Easier to tune after power-ups and bosses are working

**Avoids pitfalls:**
- Skill tree provides horizontal progression (unlock strategies, not just bigger numbers)
- Fast unlock cadence (something every 1-2 sessions)
- No grinding for basics (core mechanics don't require upgrades)

**Technology focus:**
- Database schema for skill unlocks (JSONB for flexible effects)
- Zustand persistence for progression state
- UI for skill tree visualization

**Research flags:**
- Standard patterns, skip `/gsd:research-phase`
- May need economy balancing research (gold earn rate vs upgrade costs)

---

### Phase 5: Visual Polish (Production Quality)

**What to build:**
- Enhanced particle effects (confetti, fireworks, combo celebrations)
- Victory/defeat cinematics with Remotion
- Advanced combo visual feedback (10+ combo full-screen effects)
- Layered particle effects (background, mid-ground, foreground)

**Why last:**
- **Dependency**: All mechanics must work first
- **Polish layer**: Enhances existing features, not core functionality
- **Asset optimization**: Can measure memory budget after features complete
- **Adaptive quality**: Can tune particle counts based on performance data

**Avoids pitfalls:**
- Builds on particle budget from Phase 1 (prevents overload)
- Tests cumulative visual impact (all effects together)
- Accessibility audit before release (reduced motion, color-blind modes)

**Technology focus:**
- Remotion Skia for advanced effects
- Canvas particle optimization
- Asset streaming (load/unload based on memory budget)

**Research flags:**
- Standard patterns, skip `/gsd:research-phase`
- Performance testing on low-end devices mandatory

---

### Phase 6: Dynamic Difficulty Tuning (Flow State)

**What to build:**
- AI Director system (intensity-based scaling)
- Performance tracking (words per minute, success rate, combo length)
- Invisible mid-game adjustments (gradual, not sudden)
- Analytics for difficulty effectiveness

**Why very last:**
- **Dependency**: Requires ALL systems working to tune properly
- **Data-driven**: Needs real player data to calibrate
- **Iterative**: Will require multiple tuning passes
- **Optional enhancement**: Game works without it

**Avoids pitfalls:**
- Invisible adjustments only (players should never notice)
- Pre-game primary, mid-game subtle (prevents rubber-banding perception)
- Boss fights excluded (fixed difficulty for pattern learning)

**Technology focus:**
- Custom difficulty adapter (no library needed)
- Analytics integration for performance tracking
- K-means clustering for player segmentation

**Research flags:**
- **May need `/gsd:research-phase`**: Balancing invisible DDA is iterative
- **A/B testing required**: Test with and without adaptive system

---

### Phase Ordering Rationale Summary

**Key principles applied:**
1. **Front-load technical risk**: Animations first (Phase 2) to discover performance issues early
2. **Dependencies before features**: Meta-progression (Phase 1) before skill tree (Phase 4)
3. **Test-then-enhance**: Basic power-ups (Phase 2) before advanced combos (Phase 5)
4. **Data-driven last**: Adaptive difficulty (Phase 6) needs all systems working for tuning
5. **Polish layer on top**: Visual effects (Phase 5) after mechanics proven

**Critical path:**
- Phase 1 → Phase 2 → Phase 3 (minimum viable product)
- Phase 4 → Phase 5 → Phase 6 (retention and polish)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | **HIGH** | GSAP/Framer Motion proven, tsParticles mature, Zustand ideal for game state |
| **Features** | **MEDIUM-HIGH** | Candy Crush patterns well-documented, but word-game bosses are unusual domain |
| **Architecture** | **HIGH** | Reducer + Immer pattern proven, `useAnimate()` sequences documented, Canvas performance well-understood |
| **Pitfalls** | **HIGH** | Context re-render cascade and layout thrashing documented with recent 2026 sources |

**Overall confidence:** **MEDIUM-HIGH**

### Breakdown by Phase

| Phase | Confidence | Reason |
|-------|------------|--------|
| Phase 1 (Foundation) | HIGH | Standard mobile game patterns, well-documented |
| Phase 2 (Mechanics) | MEDIUM | Animation complexity high, needs performance testing |
| Phase 3 (Bosses) | MEDIUM | Boss patterns for word games unusual, needs iteration |
| Phase 4 (Meta) | HIGH | Standard progression patterns from mobile games |
| Phase 5 (Polish) | MEDIUM | Performance budget needs validation on low-end devices |
| Phase 6 (Difficulty) | LOW | Invisible DDA tuning is iterative, needs player data |

### Gaps to Address During Planning

**Animation Performance (Phase 2):**
- **Gap**: Exact cascade chain length limits unknown (prevent infinite loops)
- **Resolution**: Implement max cascade depth (e.g., 5 levels), test with playtesting
- **Action**: `/gsd:research-phase` for cascade timing and chain limits

**Boss Attack Vocabulary (Phase 3):**
- **Gap**: How boss attacks integrate with word-finding gameplay unclear
- **Resolution**: Design workshop, prototype 2-3 attack types, validate with playtesters
- **Action**: `/gsd:research-phase` for boss attack patterns specific to word games

**Power-Up Economy Balance (Phase 2/4):**
- **Gap**: Earn rate vs usage rate unknown (avoid hoarding or spamming)
- **Resolution**: A/B testing with different earn rates, analytics tracking
- **Action**: Monitor during alpha, iterate based on player behavior

**Mobile Performance Budget (Phase 5):**
- **Gap**: Exact particle count limits for low-end devices unknown
- **Resolution**: Device profiling on iPhone 12, test different particle counts
- **Action**: Performance testing mandatory before Phase 5 completion

**Adaptive Difficulty Tuning (Phase 6):**
- **Gap**: Rubber-banding perception threshold unknown (when is it too obvious?)
- **Resolution**: A/B testing with invisible vs transparent adjustments
- **Action**: Requires real player data, iterate over multiple releases

---

## Integration Strategy

### Contradictions Resolved

**STACK recommends tsParticles + PITFALLS warns particle overload:**
- **Resolution**: Use tsParticles with enforced budget (50-100 particles max, adaptive reduction)
- **Code**: `const particleCount = isLowEndDevice ? 50 : 200;`

**FEATURES says "Candy Crush timing (0.25s)" + ARCHITECTURE says "use Framer Motion":**
- **Resolution**: `useAnimate()` with stagger matching Candy Crush: `delay: stagger(0.05)`
- **Code**: `await animate(tiles, { scale: 0 }, { duration: 0.25, delay: stagger(0.05) })`

**STACK says "Zustand" + PITFALLS warns "Context cascade":**
- **Resolution**: Zustand for high-frequency (boss health, combos), Context for static (config)
- **Migration**: Move boss state and power-up inventory from Context to Zustand

**FEATURES says "meta-progression" + PITFALLS warns "grind wall":**
- **Resolution**: Skill > upgrades (20% advantage, not 200%), horizontal over vertical
- **Design principle**: Every level beatable without upgrades, upgrades reduce time/effort

### Cross-Domain Dependencies

**Meta-Progression → Power-Ups (Phase 1 → Phase 2):**
- Skill tree unlocks power-up slots
- Player level gates advanced power-ups
- **Action**: Design skill tree structure in Phase 1, implement power-up unlocks in Phase 2

**Power-Ups → Bosses (Phase 2 → Phase 3):**
- Boss mechanics assume player has power-ups available
- Boss difficulty tuned for power-up usage (but beatable without)
- **Action**: Balance bosses in Phase 3 after power-ups proven in Phase 2

**Board Mechanics → All Features (Phase 2 → Phase 3-6):**
- Cascades affect score calculations (meta-progression)
- Explosions trigger particle effects (visual polish)
- Moving tiles interact with boss abilities
- **Action**: Lock cascade logic early, other features build on top

**Animation Foundation → All Features (Phase 1 → Phase 2-6):**
- `useAnimate()` sequences used in boss intros, power-up effects, combo celebrations
- Particle budget system used everywhere
- **Action**: Establish animation patterns in Phase 1, reuse throughout

---

## Sources Summary

### Primary Sources (HIGH confidence)
- **STACK.md**: 38 sources, includes official docs (Remotion, GSAP, Framer Motion), 2026 comparisons
- **FEATURES.md**: 30+ sources, includes game design analysis (Candy Crush, Puzzle Quest, Marvel Puzzle Quest)
- **ARCHITECTURE.md**: 20+ sources, includes React performance guides, state management comparisons
- **PITFALLS.md**: 35+ sources, includes 2026 research papers, developer retrospectives

### Key Sources by Topic

**Animation Performance:**
- [React at 60 FPS](https://g3f4.github.io/react-at-60-fps/)
- [Framer Motion vs GSAP Comparison](https://semaphore.io/blog/react-framer-motion-gsap)
- [Why Canvas Runs at 60FPS](https://dev.to/yzbkaka_dev/why-your-react-app-lags-but-this-canvas-game-runs-at-60fps-2h1d)

**Game Balance:**
- [Power Creep - TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/PowerCreep)
- [Adaptive Rubber-Banding in Racing Games](https://journals.sagepub.com/doi/abs/10.3233/ICG-220207)
- [Progression Systems in Mobile Games](https://www.blog.udonis.co/mobile-marketing/mobile-games/progression-systems)

**State Management:**
- [Redux Immutable Update Patterns](https://redux.js.org/usage/structuring-reducers/immutable-update-patterns)
- [Immer vs Reducers Performance](https://blog.logrocket.com/react-state-tools-mutative-vs-immer-vs-reducers/)
- [React Context Performance Dangers](https://thoughtspile.github.io/2021/10/04/react-context-dangers/)

**UX Patterns:**
- [Candy Crush Cascades](https://candycrush.fandom.com/wiki/Cascades)
- [Boss Design Guide](https://gamedesignskills.com/game-design/game-boss-design/)
- [Game Juice Best Practices](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design)

---

## Ready for Roadmap Creation

**Synthesis complete**: All 4 research files integrated with contradictions resolved and cross-domain dependencies identified.

**Key outputs for roadmapper:**
1. **Phase structure**: 6 phases with clear rationale and dependencies
2. **Technology decisions**: Specific stack choices with version requirements
3. **Risk mitigation**: Top 5 pitfalls with prevention strategies
4. **Research flags**: Which phases need `/gsd:research-phase` during planning
5. **Testing strategy**: What to validate in each phase

**Confidence level**: MEDIUM-HIGH overall, with specific areas flagged for iteration (boss patterns, DDA tuning, animation performance).

**Critical success factors**:
- Front-load animation complexity (Phase 2) to discover performance issues early
- Design power-ups for horizontal progression (prevent grind wall perception)
- Test on low-end devices continuously (iPhone 12 is baseline, not MacBook)
- Maintain <500 line file limit and test coverage throughout (prevent tech debt)

**Next step**: Roadmapper can use Phase 1-6 structure as starting point, adjust based on timeline constraints and team capacity.

---

*Research synthesis completed: 2026-01-30*
*Ready for roadmap planning: yes*
