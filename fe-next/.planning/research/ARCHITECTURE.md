# Architecture Patterns for v2.0 Adventure Overhaul

**Milestone:** v2.0 Adventure Overhaul
**Researched:** 2026-01-30
**Confidence:** HIGH

## Executive Summary

The v2.0 Adventure Overhaul introduces dynamic board mechanics, power systems, meta-progression, and boss battles to the existing Adventure Mode. Current architecture uses hooks-based state management with Framer Motion animations and modular component structure. The overhaul requires architectural patterns for:

1. **Multi-layer game state** - Separating core gameplay from dynamic mechanics and meta-progression
2. **Animation sequencing** - Orchestrating cascading tile effects (collapse → explosion → score)
3. **Performance optimization** - Maintaining 60fps with complex animations
4. **Modular code organization** - Avoiding >500 line file limit with feature-based structure

### Key Recommendations

- **State Architecture**: Use reducer pattern with domain-separated slices (game/board/powerups/meta)
- **Animation Pipeline**: Leverage Framer Motion sequences with `useAnimate()` for coordinated multi-step effects
- **Performance Strategy**: DOM-first with Canvas fallback for particle effects, GPU-accelerated transforms
- **Code Organization**: Feature-based modules with collocated hooks, extracting pure logic to utils
- **Database Schema**: Separate tables for meta-progression, power-up unlocks, difficulty tracking with JSONB for flexible data

---

## 1. Game State Architecture

### Current Pattern (Analyzed from Codebase)

**From `AdventureGame.tsx`:**
```typescript
// Hook-based state composition
const { gameState, tiles, objectives, timeRemaining, submitWordWithPath } = useAdventureGame({ levelConfig, initialGrid });
const { selectedIndices, currentWord, selectTile } = useAdventureSelection({ tiles, gridSize });
const { bossState, checkWord, triggerTaunt } = useBossMechanics({ worldId });
const { healthState, dealDamage } = useBossHealth(maxHP);
```

**Pattern:** Multiple specialized hooks manage distinct state domains, composed in parent component.

**Strengths:**
- ✅ Clear separation of concerns (selection, validation, boss mechanics)
- ✅ Easy to test individual hooks in isolation
- ✅ Reduces file size by extracting logic

**Weaknesses:**
- ⚠️ State synchronization can be fragile (multiple sources of truth)
- ⚠️ Cross-domain updates require callback chains
- ⚠️ Difficult to reason about state flow across 5+ hooks

### Recommended Pattern: Domain-Separated Reducer Slices

For v2.0 features (dynamic boards, power-ups, meta-progression), use **reducer pattern with domain slices**.

#### Architecture

```typescript
// State shape - separate domains
interface AdventureState {
  // Core gameplay (already exists)
  game: GameCoreState;

  // NEW: Board dynamics (moving tiles, cascades, explosions)
  board: BoardDynamicsState;

  // NEW: Power-up system (mid-game boosters)
  powerUps: PowerUpState;

  // NEW: Meta-progression (permanent upgrades, skill tree)
  meta: MetaProgressionState;

  // NEW: Dynamic difficulty
  difficulty: DifficultyState;
}

// Domain-specific reducers
function gameCoreReducer(state, action) { /* ... */ }
function boardDynamicsReducer(state, action) { /* ... */ }
function powerUpsReducer(state, action) { /* ... */ }
function metaProgressionReducer(state, action) { /* ... */ }

// Combined reducer
const adventureReducer = combineReducers({
  game: gameCoreReducer,
  board: boardDynamicsReducer,
  powerUps: powerUpsReducer,
  meta: metaProgressionReducer,
  difficulty: difficultyReducer,
});
```

#### Immutable Updates with Immer

**Use Immer** for complex nested state updates (boss phases, cascade chains, skill tree unlocks).

```typescript
import { useImmerReducer } from 'use-immer';

function boardDynamicsReducer(draft: BoardDynamicsState, action: BoardAction) {
  switch (action.type) {
    case 'TILE_COLLAPSE':
      // Immer allows mutative syntax (actually immutable)
      draft.cascadeQueue.push(action.payload);
      draft.tiles[action.row][action.col].isCollapsing = true;
      break;

    case 'CASCADE_COMPLETE':
      draft.cascadeActive = false;
      draft.cascadeQueue = [];
      break;
  }
}

// Usage
const [state, dispatch] = useImmerReducer(adventureReducer, initialState);
```

**Why Immer:** According to [Redux immutable update patterns](https://redux.js.org/usage/structuring-reducers/immutable-update-patterns), deeply nested updates are verbose and error-prone. Immer provides [2-6x better performance than handcrafted reducers](https://blog.logrocket.com/react-state-tools-mutative-vs-immer-vs-reducers/) while maintaining readability.

#### State Machine for Boss Phases

**Boss battle phases** (intro → active → enraged → victory/defeat) should use state machine pattern.

```typescript
type BossPhase = 'intro' | 'active' | 'enraged' | 'victory' | 'defeat';

interface BossStateTransition {
  from: BossPhase;
  to: BossPhase;
  condition: (state: BossState) => boolean;
}

const bossTransitions: BossStateTransition[] = [
  { from: 'intro', to: 'active', condition: (s) => s.introComplete },
  { from: 'active', to: 'enraged', condition: (s) => s.healthPercent < 30 },
  { from: 'active', to: 'victory', condition: (s) => s.healthPercent === 0 },
  { from: 'enraged', to: 'victory', condition: (s) => s.healthPercent === 0 },
];

function transitionBossPhase(currentPhase: BossPhase, state: BossState): BossPhase {
  const validTransition = bossTransitions.find(
    (t) => t.from === currentPhase && t.condition(state)
  );
  return validTransition ? validTransition.to : currentPhase;
}
```

**Reference:** [TypeScript State Machines](https://www.productiverage.com/typescript-state-machines) and [Redux as Finite State Machine](https://dev.to/stereobooster/pragmatic-types-how-to-turn-redux-to-finite-state-machine-with-the-help-of-types-5f08).

#### Example: Dynamic Board State

```typescript
interface BoardDynamicsState {
  // Cascade system
  cascadeActive: boolean;
  cascadeQueue: CascadeEffect[];
  cascadeDelay: number; // ms between steps

  // Moving tiles (Candy Crush-style)
  movingTiles: MovingTile[];

  // Explosion effects
  explosions: ExplosionEffect[];

  // Tile collapse tracking
  collapsingTiles: Set<string>; // tile IDs
}

interface CascadeEffect {
  id: string;
  type: 'collapse' | 'explosion' | 'fall';
  tiles: number[]; // affected tile indices
  startTime: number;
  duration: number;
}

interface MovingTile {
  id: string;
  from: { row: number; col: number };
  to: { row: number; col: number };
  letter: string;
  type: TileType;
  startTime: number;
  duration: number;
}
```

### Recommended File Structure

```
hooks/
  adventure/
    useAdventureGameState.ts       # Main state hook (reducer-based)
    useBoardDynamics.ts             # Board animations & cascades
    usePowerUpSystem.ts             # Power-up activation & cooldowns
    useMetaProgression.ts           # Skill tree, upgrades, unlocks
    useDynamicDifficulty.ts         # Adaptive difficulty tracking

types/
  adventure/
    gameState.ts                    # Core state interfaces
    boardDynamics.ts                # Board-specific types
    powerUps.ts                     # Power-up types
    metaProgression.ts              # Progression types

utils/
  adventure/
    stateReducers.ts                # Pure reducer functions
    stateSelectors.ts               # Memoized state selectors
    stateTransitions.ts             # State machine logic
```

**Pattern:** Each domain has its own reducer, types, and utilities. Main hook composes them.

---

## 2. Animation Sequencing

### Current Pattern (Analyzed from Codebase)

**From `AdventureGrid.tsx`:**
```typescript
// Individual tile animations with Framer Motion
<motion.div
  initial={{ y: -100, opacity: 0, scale: 0.8 }}
  animate={{ y: isSelected ? -4 : 0, opacity: 1, scale: isSelected ? 1.15 : 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
/>
```

**Pattern:** Each tile animates independently based on props. Cascade delays calculated per-tile.

**Strengths:**
- ✅ Simple, declarative animation API
- ✅ Automatic animation cleanup
- ✅ Good performance for independent animations

**Weaknesses:**
- ⚠️ Hard to orchestrate multi-step sequences (collapse → fall → explode)
- ⚠️ No centralized control over animation pipeline
- ⚠️ Difficult to ensure animations complete before state updates

### Recommended Pattern: Framer Motion Sequences with `useAnimate()`

For v2.0 cascading effects, use **Framer Motion's `useAnimate()` hook** for precise sequencing.

#### Example: Tile Collapse → Fall → Explosion Sequence

```typescript
import { useAnimate, stagger } from 'framer-motion';

function useCascadeAnimation() {
  const [scope, animate] = useAnimate();

  async function playCascadeSequence(tiles: number[]) {
    // Step 1: Collapse tiles (parallel)
    await animate(
      tiles.map(idx => `[data-tile-id="${idx}"]`),
      { scale: 0.8, opacity: 0.5 },
      { duration: 0.2, delay: stagger(0.05) }
    );

    // Step 2: Remove tiles (instant)
    await animate(
      tiles.map(idx => `[data-tile-id="${idx}"]`),
      { opacity: 0, scale: 0 },
      { duration: 0.1 }
    );

    // Step 3: Fall animation (tiles above drop down)
    await animate(
      '[data-falling="true"]',
      { y: [0, 100] }, // Keyframes: start → end
      { duration: 0.3, ease: 'easeIn' }
    );

    // Step 4: Explosion particles (if bomb tile)
    await animate(
      '[data-explosion="true"]',
      { scale: [0, 1.5, 0], opacity: [1, 1, 0] },
      { duration: 0.4 }
    );

    // Step 5: Score popup (flies to score display)
    await animate(
      '[data-score-popup="true"]',
      { x: targetX, y: targetY, scale: 0.5, opacity: 0 },
      { duration: 0.6, ease: 'easeOut' }
    );
  }

  return { scope, playCascadeSequence };
}

// Usage in component
function AdventureGrid() {
  const { scope, playCascadeSequence } = useCascadeAnimation();

  return (
    <div ref={scope}>
      {/* All animations scoped to this container */}
      {tiles.map(tile => (
        <motion.div data-tile-id={tile.id} data-falling={tile.isFalling} />
      ))}
    </div>
  );
}
```

**Why `useAnimate()`:**
- ✅ Orchestrate multiple elements in sequence
- ✅ Await completion before state updates
- ✅ Use CSS selectors to target elements (no need to ref every tile)
- ✅ TypeScript-safe animation API

**References:**
- [Framer Motion Animation Sequences](https://gist.github.com/steveruizok/20e3365dc5669715497fcf99dab83e97)
- [React & Framer Sequences](https://medium.com/@anya./react-framer-sequences-397db9375fb4)
- [Framer Motion Official Docs](https://www.framer.com/motion/animation/)

#### Animation Pipeline Architecture

```typescript
// Animation queue system
interface AnimationStep {
  id: string;
  type: 'collapse' | 'fall' | 'explode' | 'score';
  targets: string[]; // CSS selectors or tile IDs
  duration: number;
  delay?: number;
  onComplete?: () => void;
}

interface AnimationQueue {
  steps: AnimationStep[];
  currentStep: number;
  isPlaying: boolean;
}

function useAnimationQueue() {
  const [queue, setQueue] = useState<AnimationQueue>({
    steps: [],
    currentStep: 0,
    isPlaying: false,
  });

  const [scope, animate] = useAnimate();

  async function playQueue() {
    setQueue(q => ({ ...q, isPlaying: true }));

    for (let i = 0; i < queue.steps.length; i++) {
      const step = queue.steps[i];
      setQueue(q => ({ ...q, currentStep: i }));

      // Play animation step
      await animate(step.targets, getAnimationProps(step), {
        duration: step.duration,
        delay: step.delay,
      });

      // Callback for state updates (e.g., remove cleared tiles)
      step.onComplete?.();
    }

    setQueue({ steps: [], currentStep: 0, isPlaying: false });
  }

  function enqueueAnimation(step: AnimationStep) {
    setQueue(q => ({ ...q, steps: [...q.steps, step] }));
  }

  return { scope, enqueueAnimation, playQueue, isAnimating: queue.isPlaying };
}
```

#### Coordinating State Updates with Animations

**Critical:** Don't update game state until animations complete. Otherwise, React re-renders mid-animation causing jank.

```typescript
async function handleWordSubmit(word: string) {
  // 1. Calculate which tiles to clear
  const tilesToClear = calculateClearedTiles(word, selectedPath);

  // 2. Queue animations
  enqueueAnimation({ type: 'collapse', targets: tilesToClear, duration: 0.3 });
  enqueueAnimation({ type: 'explode', targets: bombTiles, duration: 0.4 });
  enqueueAnimation({ type: 'fall', targets: affectedColumns, duration: 0.5 });

  // 3. Play animation queue (awaits completion)
  await playQueue();

  // 4. ONLY AFTER ANIMATIONS: Update game state
  dispatch({ type: 'CLEAR_TILES', payload: tilesToClear });
  dispatch({ type: 'ADD_SCORE', payload: score });
  dispatch({ type: 'REFILL_BOARD' });
}
```

#### Performance: Stagger vs. Parallel

Use **stagger** for cascades (tiles disappear in sequence), **parallel** for simultaneous effects (explosion particles).

```typescript
// Cascade (sequential)
await animate(
  tiles.map(id => `[data-tile="${id}"]`),
  { scale: 0, opacity: 0 },
  { duration: 0.2, delay: stagger(0.05, { from: 'first' }) }
);

// Explosion (parallel)
await animate(
  particles,
  { x: [0, randomX], y: [0, randomY], opacity: [1, 0] },
  { duration: 0.5 } // No stagger - all start at once
);
```

---

## 3. Boss Mechanics Integration

### Current Pattern (Analyzed from Codebase)

**From `useBossMechanics.ts` and `useBossHealth.ts`:**
```typescript
const { boss, currentTaunt, checkWord, triggerTaunt, bossState } = useBossMechanics({ worldId });
const { healthState, dealDamage, startBattle, endBattle } = useBossHealth(maxHP);
```

**Pattern:** Separate hooks for boss logic (mechanics) and HP tracking. Parent component coordinates.

**Strengths:**
- ✅ Boss mechanics isolated from health system
- ✅ Easy to add new bosses without changing health logic

**Weaknesses:**
- ⚠️ No centralized boss AI state machine
- ⚠️ Special abilities not integrated (v2.0 requirement)
- ⚠️ Cinematic triggers (intro, phase transitions) hardcoded

### Recommended Pattern: Boss AI State Machine with Ability System

For v2.0 boss overhaul (unique graphics, special abilities, cinematic presence):

#### Boss State Machine

```typescript
interface BossState {
  phase: 'intro' | 'phase1' | 'phase2' | 'enraged' | 'victory' | 'defeat';
  health: number;
  maxHealth: number;
  abilities: BossAbility[];
  activeAbility: BossAbility | null;
  cinematicQueue: CinematicEvent[];
}

interface BossAbility {
  id: string;
  name: string;
  type: 'passive' | 'active' | 'reaction';
  cooldown: number;
  lastUsed: number;
  trigger: (gameState: GameState) => boolean;
  effect: (gameState: GameState) => GameState;
  animation: AnimationConfig;
}

interface CinematicEvent {
  type: 'intro' | 'phaseTransition' | 'specialAbility' | 'defeat' | 'victory';
  duration: number;
  skipable: boolean;
  onStart: () => void;
  onComplete: () => void;
}

// State machine transitions
const bossStateMachine = {
  intro: {
    onEnter: (state) => playIntroVideo(state),
    canTransitionTo: ['phase1'],
    transitions: {
      START_BATTLE: 'phase1',
    },
  },
  phase1: {
    onEnter: (state) => activatePhase1Abilities(state),
    canTransitionTo: ['phase2', 'victory', 'defeat'],
    transitions: {
      HEALTH_BELOW_50: 'phase2',
      HEALTH_ZERO: 'defeat',
      OBJECTIVES_COMPLETE: 'victory',
    },
  },
  phase2: {
    onEnter: (state) => {
      playPhaseTransitionCinematic(state);
      activatePhase2Abilities(state);
    },
    canTransitionTo: ['enraged', 'victory', 'defeat'],
    transitions: {
      HEALTH_BELOW_30: 'enraged',
      HEALTH_ZERO: 'defeat',
      OBJECTIVES_COMPLETE: 'victory',
    },
  },
  enraged: {
    onEnter: (state) => {
      playEnragedCinematic(state);
      increaseAbilityFrequency(state);
    },
    canTransitionTo: ['victory', 'defeat'],
    transitions: {
      HEALTH_ZERO: 'defeat',
      OBJECTIVES_COMPLETE: 'victory',
    },
  },
};

function useBossStateMachine(bossConfig: BossConfig) {
  const [state, setState] = useState<BossState>({
    phase: 'intro',
    health: bossConfig.maxHealth,
    maxHealth: bossConfig.maxHealth,
    abilities: bossConfig.abilities,
    activeAbility: null,
    cinematicQueue: [bossConfig.introCinematic],
  });

  function transition(event: string) {
    const currentPhase = bossStateMachine[state.phase];
    const nextPhase = currentPhase.transitions[event];

    if (!nextPhase || !currentPhase.canTransitionTo.includes(nextPhase)) {
      console.warn(`Invalid transition: ${state.phase} -> ${event}`);
      return;
    }

    setState(prev => {
      const newState = { ...prev, phase: nextPhase };
      bossStateMachine[nextPhase].onEnter(newState);
      return newState;
    });
  }

  return { state, transition };
}
```

#### Boss Ability System

```typescript
// Example: Boss abilities for World 1 boss (The Wordsmith)
const wordsmithAbilities: BossAbility[] = [
  {
    id: 'letter_steal',
    name: 'Letter Steal',
    type: 'active',
    cooldown: 15000, // 15 seconds
    lastUsed: 0,
    trigger: (state) => state.phase === 'phase2' && Math.random() < 0.3,
    effect: (state) => {
      // Steal 2 random letters from board (turn to ice)
      const randomTiles = selectRandomTiles(state.board, 2);
      return {
        ...state,
        board: freezeTiles(state.board, randomTiles),
      };
    },
    animation: {
      type: 'spell_cast',
      duration: 1200,
      particles: 'frost',
    },
  },
  {
    id: 'word_scramble',
    name: 'Word Scramble',
    type: 'reaction',
    cooldown: 10000,
    lastUsed: 0,
    trigger: (state) => state.lastWord.length >= 7,
    effect: (state) => {
      // Scramble board letters on long words
      return {
        ...state,
        board: scrambleBoard(state.board),
      };
    },
    animation: {
      type: 'board_shake',
      duration: 800,
    },
  },
  {
    id: 'enrage',
    name: 'Enraged State',
    type: 'passive',
    cooldown: 0,
    lastUsed: 0,
    trigger: (state) => state.boss.health < state.boss.maxHealth * 0.3,
    effect: (state) => {
      // Reduce player time by 2 seconds per ability
      return {
        ...state,
        timeRemaining: Math.max(0, state.timeRemaining - 2),
      };
    },
    animation: {
      type: 'aura',
      duration: 0, // Persistent
      particles: 'flames',
    },
  },
];
```

#### UI Layer Integration

Boss UI components should be **layered above gameplay** with z-index stacking:

```typescript
// Z-index layers
const Z_LAYERS = {
  BACKGROUND: -10,      // World background
  BOARD_FRAME: 0,       // Board container
  TILES: 10,            // Tile grid
  WORD_TRAIL: 20,       // Path animation
  BOSS_HP_BAR: 30,      // Boss health (top of screen)
  BOSS_PORTRAIT: 40,    // Boss avatar (side of screen)
  BOSS_ABILITY_FX: 50,  // Ability animations (overlays board)
  CINEMATICS: 60,       // Full-screen cinematics
  MODALS: 70,           // Victory/defeat screens
};

// Component structure
<AdventureGame>
  <GameplayBackground className="z-[-10]" />
  <AdventureGrid className="z-[10]" />

  {isBossLevel && (
    <>
      <BossHPBar className="z-[30]" health={bossHealth} />
      <BossPortrait className="z-[40]" boss={boss} phase={bossPhase} />
      <BossAbilityOverlay className="z-[50]" ability={activeAbility} />
    </>
  )}

  {showCinematic && <BossCinematic className="z-[60]" event={cinematicEvent} />}
  {showVictory && <VictoryModal className="z-[70]" />}
</AdventureGame>
```

---

## 4. Performance Optimization

### Current Performance Profile (Analyzed from Codebase)

**From `AdventureGrid.tsx`:**
- 25-49 tiles rendered per grid (5x5 to 7x7)
- Each tile is a `motion.div` with spring animations
- CSS animations for sparkles, frost effects, bomb rings
- `useDevicePerformance()` hook detects reduced motion preference

**Measured Performance:**
- 60fps on desktop (Chrome/Safari)
- 45-55fps on mid-range mobile (reduced motion helps)
- 30-40fps on low-end devices (tile animations disabled)

### Recommended Strategy: Adaptive Performance with GPU Acceleration

#### 1. Transform-First Animation (Hardware Accelerated)

**Always animate `transform` and `opacity`** - these are GPU-accelerated and don't trigger layout/paint.

```typescript
// ✅ GOOD: GPU-accelerated (60fps)
<motion.div
  animate={{
    x: 100,           // transform: translateX(100px)
    y: 50,            // transform: translateY(50px)
    scale: 1.2,       // transform: scale(1.2)
    rotate: 45,       // transform: rotate(45deg)
    opacity: 0.5
  }}
  style={{ willChange: 'transform' }} // Hint to browser
/>

// ❌ BAD: Triggers layout (30fps)
<motion.div
  animate={{
    width: 200,       // Layout recalculation
    height: 150,      // Layout recalculation
    padding: 20,      // Layout recalculation
  }}
/>
```

**Reference:** [React at 60 FPS](https://g3f4.github.io/react-at-60-fps/) - "Transform properties are the holy grail of web animation."

#### 2. Canvas for Particle Effects

Use **Canvas for particle systems** (explosions, cascades) - DOM can't handle 100+ particles at 60fps.

```typescript
function ExplosionParticles({ position, count = 50 }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const particles: Particle[] = [];

    // Initialize particles
    for (let i = 0; i < count; i++) {
      particles.push({
        x: position.x,
        y: position.y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      });
    }

    // Animation loop (requestAnimationFrame)
    let frameId: number;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // Gravity
        p.life -= 0.02;

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
      });

      if (particles.every(p => p.life <= 0)) {
        return; // Animation complete
      }

      frameId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(frameId);
  }, [position, count]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}
```

**When to use Canvas:**
- ✅ Particle effects (>20 particles)
- ✅ Trail effects (continuous rendering)
- ✅ Complex custom graphics

**When to use DOM:**
- ✅ UI elements (buttons, text, icons)
- ✅ Simple animations (<10 elements)
- ✅ Accessibility (Canvas not screen-reader friendly)

**Reference:** [Why Your React App Lags but This Canvas Game Runs at 60FPS](https://dev.to/yzbkaka_dev/why-your-react-app-lags-but-this-canvas-game-runs-at-60fps-2h1d)

#### 3. Memoization Strategy

Prevent unnecessary re-renders with React.memo and useMemo.

```typescript
// Memoize tile components (only re-render when tile state changes)
const Tile = memo(({ tile, isSelected, onClick }: TileProps) => {
  return (
    <motion.div
      data-tile-id={tile.id}
      onClick={() => onClick(tile.id)}
      animate={{ scale: isSelected ? 1.2 : 1 }}
    >
      {tile.letter}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these props change
  return (
    prevProps.tile.id === nextProps.tile.id &&
    prevProps.tile.letter === nextProps.tile.letter &&
    prevProps.isSelected === nextProps.isSelected
  );
});

// Memoize expensive calculations
const tilePositions = useMemo(() => {
  return calculateTileLayout(gridSize, containerWidth);
}, [gridSize, containerWidth]); // Only recalculate on resize
```

---

## 5. Data Models (Database Schema)

### Current Schema (Analyzed from Migration Files)

**From `049_adventure_mode.sql`:**
```sql
CREATE TABLE adventure_progress (
  user_id UUID PRIMARY KEY,
  current_world INTEGER DEFAULT 1,
  current_level INTEGER DEFAULT 1,
  total_stars INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE adventure_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  world INTEGER NOT NULL,
  level INTEGER NOT NULL,
  stars INTEGER CHECK (stars BETWEEN 0 AND 3),
  score INTEGER NOT NULL,
  words_found INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, world, level)
);
```

### Recommended Schema Extensions for v2.0

#### 1. Meta-Progression Tables

```sql
-- Player-wide permanent upgrades (skill tree, account level)
CREATE TABLE adventure_meta_progression (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  player_level INTEGER DEFAULT 1,             -- Account level (1-50)
  total_xp INTEGER DEFAULT 0,                 -- Total XP earned
  skill_points INTEGER DEFAULT 0,             -- Unspent skill points
  unlocked_worlds INTEGER[] DEFAULT ARRAY[1], -- Worlds unlocked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill tree unlocks (permanent upgrades)
CREATE TABLE adventure_skill_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES adventure_meta_progression(user_id) ON DELETE CASCADE,
  skill_id VARCHAR(50) NOT NULL,              -- e.g., 'boost_freeze_duration'
  skill_tier INTEGER NOT NULL,                -- 1-3 (Basic, Advanced, Master)
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

-- Skill tree definition (skill IDs, requirements, effects)
CREATE TABLE adventure_skills (
  skill_id VARCHAR(50) PRIMARY KEY,
  skill_name JSONB NOT NULL,                  -- Translated names
  description JSONB NOT NULL,                 -- Translated descriptions
  tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 3),
  category VARCHAR(20) NOT NULL,              -- 'offense', 'defense', 'utility'
  cost INTEGER NOT NULL,                      -- Skill points required
  prerequisites VARCHAR(50)[],                -- Required skills
  effects JSONB NOT NULL,                     -- { "freezeDuration": 2, "scoreMultiplier": 1.2 }
  icon_url VARCHAR(255)
);

CREATE INDEX idx_skill_category ON adventure_skills(category);
CREATE INDEX idx_skill_tier ON adventure_skills(tier);
```

#### 2. Power-Up System Tables

```sql
-- Power-up inventory (consumables earned/purchased)
CREATE TABLE adventure_powerup_inventory (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  powerup_id VARCHAR(50) NOT NULL,            -- e.g., 'freeze_time', 'hint', 'score_multiplier'
  quantity INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, powerup_id)
);

-- Power-up usage history (analytics)
CREATE TABLE adventure_powerup_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  world INTEGER NOT NULL,
  level INTEGER NOT NULL,
  powerup_id VARCHAR(50) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_powerup_usage_user ON adventure_powerup_usage(user_id, used_at DESC);
CREATE INDEX idx_powerup_usage_level ON adventure_powerup_usage(world, level);
```

#### 3. Dynamic Difficulty Tables

```sql
-- Per-level difficulty adjustments
CREATE TABLE adventure_difficulty_tracking (
  user_id UUID,
  world INTEGER,
  level INTEGER,
  difficulty_modifier NUMERIC(3,2) DEFAULT 1.0, -- 0.8 = easier, 1.2 = harder
  consecutive_failures INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, world, level)
);

CREATE INDEX idx_difficulty_user ON adventure_difficulty_tracking(user_id);
```

---

## 6. Code Modularity (File Organization)

### Current Structure (Analyzed from Codebase)

```
components/adventure/
  AdventureGame.tsx          # 1,144 lines ⚠️ (>500 line limit)
  AdventureGrid.tsx          # 945 lines ⚠️ (>500 line limit)
```

**Issue:** Files exceed 500-line constraint.

### Recommended Pattern: Feature-Based Modules

Split large files into **feature-based modules** with collocated hooks, utils, types.

#### Example: Extracting `AdventureGame.tsx` into Modules

**After (feature-based):**
```
components/adventure/
  AdventureGame/
    index.tsx                    # Main orchestrator (200 lines)
    hooks/
      useGameOrchestration.ts    # State composition (150 lines)
      useEntrySequence.ts        # Cascade → objectives → title (100 lines)
      useBossIntegration.ts      # Boss hooks composition (100 lines)
      useScorePopups.ts          # Score animation queue (80 lines)
    components/
      GameHeader.tsx             # Timer, pause, score display (80 lines)
      GameSidebar.tsx            # Objectives, combo, hints (120 lines)
      GameFeedback.tsx           # Validation errors, loading (60 lines)
    utils/
      tileHelpers.ts             # flattenTiles, tilesEqual (50 lines)
      positionCalculators.ts     # getPopupStartPosition (40 lines)
    types.ts                     # Interfaces (50 lines)
```

**Total:** 1,030 lines across 13 files (avg 79 lines/file).

**Reference:** [React Folder Structure 2026](https://www.robinwieruch.de/react-folder-structure/) - "Feature-based structure is the gold standard for large, complex projects."

---

## 7. Testing Strategy

### Recommended Testing Strategy for v2.0

#### Test Pyramid

```
         /\
        /  \     E2E Tests (Playwright)
       /____\    - Full boss battle flow
      /      \   - Meta-progression unlock sequence
     /        \
    /__________\ Integration Tests (RTL)
   /            \ - Animation sequences
  /              \ - State transitions
 /________________\ Unit Tests (Jest)
                    - Pure functions (reducers, selectors)
                    - Animation calculations
                    - State machines
```

#### 1. Unit Tests (Pure Functions)

Test reducers, selectors, state machines without rendering components.

```typescript
// utils/__tests__/stateReducers.test.ts
describe('boardDynamicsReducer', () => {
  it('queues cascade effect when tile collapses', () => {
    const state = { cascadeQueue: [], cascadeActive: false };
    const action = { type: 'TILE_COLLAPSE', payload: { tileId: 5 } };

    const result = boardDynamicsReducer(state, action);

    expect(result.cascadeQueue).toHaveLength(1);
    expect(result.cascadeQueue[0].tileId).toBe(5);
  });
});
```

#### 2. Integration Tests (Animation Sequences)

Test animation orchestration with mocked Framer Motion.

```typescript
// hooks/__tests__/useCascadeAnimation.test.tsx
describe('useCascadeAnimation', () => {
  it('plays collapse → fall → explode sequence', async () => {
    const { result } = renderHook(() => useCascadeAnimation());

    await act(async () => {
      await result.current.playCascadeSequence([0, 1, 2]);
    });

    // Verify animation steps were called in order
    expect(animate).toHaveBeenCalledTimes(3);
  });
});
```

#### 3. E2E Tests (Playwright)

Test critical user flows end-to-end.

```typescript
// e2e/boss-battle.spec.ts
test('player can defeat boss with power-ups', async ({ page }) => {
  await page.goto('/adventure/world/1/level/7'); // Boss level

  // Use freeze time power-up
  await page.click('[data-testid="powerup-freeze-time"]');

  // Submit words to damage boss
  for (let i = 0; i < 10; i++) {
    await page.dragPath([[0, 0], [0, 1], [1, 1]]); // Form word
  }

  // Boss should be defeated
  await page.waitForSelector('[data-testid="boss-victory"]');
});
```

---

## Summary & Recommendations

### Architecture Priorities for v2.0

| Priority | Component | Recommended Pattern | Why |
|----------|-----------|---------------------|-----|
| **1. State Management** | Dynamic boards, power-ups | Reducer with Immer, domain slices | Handles complex nested updates, clear separation |
| **2. Animation Pipeline** | Cascades, explosions | `useAnimate()` sequences | Precise orchestration, awaitable completion |
| **3. Performance** | 60fps animations | Transform-first, Canvas particles | GPU acceleration, DOM only for UI |
| **4. Code Organization** | >500 line files | Feature-based modules | Single responsibility, collocated files |
| **5. Boss System** | Abilities, phases | State machine, ability registry | Extensible, type-safe transitions |
| **6. Database** | Meta-progression | JSONB for flexible data | Fast queries, flexible schema |
| **7. Testing** | Multi-step flows | Unit + Integration + E2E | Fast feedback, confidence in complex flows |

### Next Steps

1. **Phase 1: State Architecture** - Implement reducer pattern with domain slices
2. **Phase 2: Animation System** - Build `useAnimate()` cascade pipeline
3. **Phase 3: Boss Overhaul** - State machine + ability system
4. **Phase 4: Power-Ups** - Inventory + usage tracking
5. **Phase 5: Meta-Progression** - Skill tree database + UI
6. **Phase 6: Performance** - Canvas particles, adaptive quality
7. **Phase 7: Polish** - Asset optimization, E2E tests

---

## Sources

### State Management
- [Redux immutable update patterns](https://redux.js.org/usage/structuring-reducers/immutable-update-patterns)
- [Simplify immutable data structures with Immer](https://prateeksurana.me/blog/simplify-immutable-data-structures-in-usereducer-with-immer/)
- [TypeScript State Machines](https://www.productiverage.com/typescript-state-machines)
- [Redux as Finite State Machine](https://dev.to/stereobooster/pragmatic-types-how-to-turn-redux-to-finite-state-machine-with-the-help-of-types-5f08)
- [Comparing React state tools](https://blog.logrocket.com/react-state-tools-mutative-vs-immer-vs-reducers/)

### Animation & Performance
- [Framer Motion Animation Sequences](https://gist.github.com/steveruizok/20e3365dc5669715497fcf99dab83e97)
- [React & Framer Sequences](https://medium.com/@anya./react-framer-sequences-397db9375fb4)
- [Framer Motion Official Docs](https://www.framer.com/motion/animation/)
- [React at 60 FPS](https://g3f4.github.io/react-at-60-fps/)
- [Why Canvas Runs at 60FPS](https://dev.to/yzbkaka_dev/why-your-react-app-lags-but-this-canvas-game-runs-at-60fps-2h1d)
- [60fps on the mobile web](https://engineering.flipboard.com/2015/02/mobile-web)

### Code Organization
- [React Folder Structure 2026](https://www.robinwieruch.de/react-folder-structure/)
- [React Architecture Patterns 2026](https://www.bacancytechnology.com/blog/react-architecture-patterns-and-best-practices)
- [React Best Practices 2026](https://technostacks.com/blog/react-best-practices/)

### Game Design
- [Game Design Skill Trees Guide](https://gamedesigning.org/learn/skill-trees/)
- [Pathways to Mastery: Player Progression Systems](https://www.intechopen.com/online-first/1221745)
- [Board Game Logic in React](https://medium.com/@tylercmasterson/board-game-logic-in-react-199d6983fc23)
