# Phase 30 Research: Boss Battle Overhaul

**Phase Goal:** Boss battles feel like epic cinematic fights, not just harder puzzles

**Research Date:** 2026-01-31
**Dependencies:** Phase 27 (COMPLETE), Phase 28 (COMPLETE), Phase 29 (COMPLETE)

---

## Executive Summary

Phase 30 transforms boss battles from simple HP bars and taunts into cinematic, multi-phase experiences with state machines, telegraphed attacks, unique abilities, and boss-specific graphics. The foundation from Phases 16-17 provides boss configurations, taunts, and basic mechanics, but lacks the depth, visual polish, and drama needed for memorable encounters.

**Key Gap:** Current boss system (4 phases: intro → active → enraged → victory/defeat) needs expansion to 5 phases with intermediate phase transitions, attack telegraphing, and ability systems. No cinematic sequences exist beyond basic intro modals.

**Technology Stack Required:**
- XState 5.24.0 for 5-phase state machines
- GSAP 3.14.2 for complex attack animations
- tsParticles 3.x for particle effects (attack telegraphing, phase transitions)
- Remotion + Lottie + Skia for cinematics
- Image MCP + FLUX.1 for boss graphics
- rembg (Python) for background removal

---

## 1. Existing Boss Foundation (Phases 16-17)

### Current Implementation Status

**Phase 16 (Boss Battle Foundation) - COMPLETE:**
- ✅ Boss types system (`types/boss.ts`)
- ✅ Boss configurations (`lib/adventure/bossConfig.ts`) - 10 unique bosses
- ✅ `useBossHealth` hook - HP tracking, damage, phase transitions (intro/active/enraged/victory/defeat)
- ✅ `useBossMechanics` hook - Word evaluation, taunt display, twist mechanics
- ✅ `BossHPBar` component - Real-time HP display with enraged indicator
- ✅ `BossIntro` component - Pre-battle cutscene modal
- ✅ `BossDialogue` component - In-battle taunts
- ✅ `BossVictory` component - Victory/defeat screens
- ✅ `BossOverlay` compound component - All boss UI elements

**Phase 17 (Boss Mechanic Expansion) - COMPLETE:**
- ✅ 10 boss twist mechanics: popQuiz, hiveMind, etymologyDig, idiomBattle, assemblyLine, scrambledReality, mirrorMatch, stellarForge, babelSummit, finalWord
- ✅ Mechanic-specific word evaluation logic
- ✅ Score multipliers for meeting/missing mechanic requirements
- ✅ Multi-phase boss support (finalWord boss with 3 phases)

**Files Involved:**
```
types/boss.ts (277 lines)
hooks/useBossHealth.ts (157 lines)
hooks/useBossMechanics.ts
components/adventure/BossHPBar.tsx (105 lines)
components/adventure/BossIntro.tsx (197 lines)
components/adventure/BossDialogue.tsx
components/adventure/BossVictory.tsx
components/adventure/boss/BossOverlay.tsx (180 lines)
lib/adventure/bossConfig.ts
```

**Current Phase System:**
```
BossPhase = 'intro' | 'active' | 'enraged' | 'victory' | 'defeat'

intro (BossIntro modal)
  ↓ (player clicks "Ready to Fight")
active (HP > 25%)
  ↓ (HP ≤ 25%)
enraged (HP ≤ 25%, mechanics intensify)
  ↓ (HP = 0 or timer expires)
victory/defeat (BossVictory modal)
```

**Damage Formula:**
```typescript
baseDamage = score / 10
comboMultiplier = 1 + (comboCount * 0.1)
mechanicBonus = bossMechanicResult.scoreMultiplier
totalDamage = Math.round(baseDamage * comboMultiplier * mechanicBonus)
```

### Gaps vs Phase 30 Requirements

| Requirement | Current State | Gap |
|-------------|---------------|-----|
| **BOSS-01**: 5-phase state machine | 4 phases (intro/active/enraged/victory/defeat) | Need 5 phases: intro → phase1 → phase2 → enraged → victory/defeat |
| **BOSS-02**: Segmented HP bar with phase indicators | Single HP bar, enraged badge at 25% | Need segmented bar showing phase thresholds (0-33%, 33-66%, 66-100%) |
| **BOSS-03**: Telegraphed attacks (2s warning) | No attack system | Need attack telegraph system + visual warnings |
| **BOSS-04**: 5-10s cinematic intro (skippable after 2s) | Basic modal intro, instant skip | Need Remotion cinematic + timed skip unlock |
| **BOSS-05**: 2-3 unique abilities per boss | 1 twist mechanic per boss | Need ability system with multiple abilities |
| **BOSS-06**: Extensible ability system | Hardcoded twist mechanics | Need registry pattern for abilities |
| **BOSS-07**: Boss entrance/defeat cinematics | Basic modals | Need Remotion cinematics for entrance/defeat |
| **BOSS-08**: Unique graphics per boss (Image MCP + rembg) | Placeholder images | Need AI-generated graphics pipeline |

**Key Dependencies:**
- ✅ Phase 27 (Dynamic Board Mechanics) - Cascade animations, explosion effects, smooth tile movement
- ✅ Phase 28 (Power-Up System) - Activation effects, cooldowns, radial progress indicators
- ✅ Phase 29 (Adaptive Difficulty) - Performance tracking, hint system

---

## 2. Technology Research

### 2.1 XState 5.24.0 - State Machine Management

**Purpose:** Manage 5-phase boss state machine with transitions, guards, and actions

**Key Features:**
- Actor-based state management with zero dependencies
- TypeScript 5.0+ required, strong typing for states/events
- React integration via `@xstate/react` hooks (`useMachine`, `useActor`)
- Event-driven programming model perfect for boss battles

**Installation:**
```bash
npm install xstate@5.24.0 @xstate/react
```

**Use Cases for Boss Battles:**
```typescript
// 5-phase state machine
const bossMachine = createMachine({
  id: 'boss',
  initial: 'intro',
  context: { hp: 1000, phase: 1 },
  states: {
    intro: {
      on: { START: 'phase1' }
    },
    phase1: {
      on: {
        DAMAGE: { actions: 'dealDamage' },
        PHASE_TRANSITION: { target: 'phase2', guard: 'hpBelow66' }
      }
    },
    phase2: {
      on: {
        DAMAGE: { actions: 'dealDamage' },
        PHASE_TRANSITION: { target: 'enraged', guard: 'hpBelow33' }
      }
    },
    enraged: {
      on: {
        DAMAGE: { actions: 'dealDamage' },
        VICTORY: { target: 'victory', guard: 'hpZero' },
        DEFEAT: 'defeat'
      }
    },
    victory: { type: 'final' },
    defeat: { type: 'final' }
  }
});
```

**React Hook Pattern:**
```typescript
const [state, send] = useMachine(bossMachine);
// send('START') to start battle
// send({ type: 'DAMAGE', amount: 50 }) to deal damage
// state.matches('phase1') to check current phase
```

**Why XState over useState?**
- ✅ Prevents impossible states (can't be in phase1 and enraged simultaneously)
- ✅ Visualizable state machine (Stately Studio integration)
- ✅ Guards prevent invalid transitions
- ✅ Actions co-located with transitions
- ✅ TypeScript inference for events/context

**Sources:**
- [XState GitHub](https://github.com/statelyai/xstate)
- [XState React Hooks](https://stately.ai/docs/xstate-react)
- [TypeScript Support](https://stately.ai/docs/typescript)

---

### 2.2 GSAP 3.14.2 - Advanced Animations

**Purpose:** Complex attack animations, cascading effects, boss telegraph warnings

**Key Features:**
- Industry-standard animation library (12M+ weekly downloads)
- `stagger` property for cascading animations
- `timeline` for sequenced animations
- React integration via `useGSAP()` hook (handles cleanup)

**Installation:**
```bash
npm install gsap@3.14.2
```

**Use Cases for Boss Battles:**

**1. Attack Telegraph (2s warning):**
```typescript
// Telegraphed attack animation
const telegraphAttack = (targetTiles: number[]) => {
  const timeline = gsap.timeline();

  // Phase 1: Warning glow (1s)
  timeline.to(targetTiles.map(i => `.tile-${i}`), {
    boxShadow: '0 0 20px red',
    duration: 0.5,
    repeat: 1,
    yoyo: true
  });

  // Phase 2: Attack activation (1s)
  timeline.to(targetTiles.map(i => `.tile-${i}`), {
    scale: 1.2,
    filter: 'brightness(2)',
    duration: 0.5
  });

  // Phase 3: Impact
  timeline.to(targetTiles.map(i => `.tile-${i}`), {
    scale: 1,
    filter: 'brightness(1)',
    duration: 0.5
  });
};
```

**2. Cascading Tile Effects:**
```typescript
// Stagger effect for tile animations
gsap.to('.boss-tiles', {
  scale: 1.1,
  rotation: 5,
  duration: 0.3,
  stagger: 0.02, // 20ms delay between each
  ease: 'back.out(1.7)'
});
```

**3. HP Bar Segment Transitions:**
```typescript
// Animate HP bar segment depletion
gsap.to('.hp-segment-1', {
  width: '0%',
  duration: 0.5,
  ease: 'power2.inOut',
  onComplete: () => {
    // Trigger phase transition
    send('PHASE_TRANSITION');
  }
});
```

**React Hook Pattern:**
```typescript
import { useGSAP } from '@gsap/react';

useGSAP(() => {
  // Animations here
  // Cleanup handled automatically
}, [dependencies]);
```

**Why GSAP over Framer Motion?**
- ✅ More powerful timeline system
- ✅ Better performance for complex animations (GPU-accelerated)
- ✅ Stagger effects built-in
- ✅ Richer easing options (elastic, back, bounce)
- ⚠️ Current project uses Framer Motion extensively - GSAP should supplement, not replace

**Sources:**
- [GSAP React Integration](https://gsap.com/resources/React/)
- [GSAP Stagger Tutorial](https://dev.to/greyboyle/easy-react-animation-with-gsap-1bnp)
- [GSAP NPM Package](https://www.npmjs.com/package/gsap)

---

### 2.3 tsParticles 3.x - Particle Effects

**Purpose:** Attack telegraphing particles, phase transition effects, boss aura

**Key Features:**
- Lightweight TypeScript library for particle effects
- React component `@tsparticles/react`
- Confetti, fireworks, starfields, connecting lines
- GPU-accelerated, 60fps performance

**Installation:**
```bash
npm install @tsparticles/react @tsparticles/engine @tsparticles/slim
```

**Use Cases for Boss Battles:**

**1. Attack Telegraph Warning:**
```typescript
const AttackTelegraphParticles = () => (
  <Particles
    options={{
      particles: {
        number: { value: 50 },
        color: { value: "#ff0000" },
        shape: { type: "circle" },
        opacity: {
          value: 0.8,
          animation: { enable: true, speed: 2 }
        },
        size: { value: 3 },
        move: {
          enable: true,
          speed: 2,
          direction: "none",
          outModes: { default: "bounce" }
        }
      }
    }}
  />
);
```

**2. Boss Phase Transition Burst:**
```typescript
const PhaseTransitionEffect = () => (
  <Particles
    options={{
      particles: {
        number: { value: 100 },
        color: { value: ["#FFE135", "#FF6B35", "#FF1493"] },
        shape: { type: "star" },
        size: { value: { min: 2, max: 6 } },
        move: {
          enable: true,
          speed: { min: 5, max: 15 },
          direction: "none",
          outModes: { default: "destroy" }
        },
        life: {
          duration: { value: 1 },
          count: 1
        }
      },
      emitters: {
        position: { x: 50, y: 50 },
        rate: { quantity: 100, delay: 0 }
      }
    }}
  />
);
```

**3. Boss Enraged Aura:**
```typescript
const EnragedAuraParticles = () => (
  <Particles
    options={{
      particles: {
        number: { value: 30 },
        color: { value: "#ff0000" },
        shape: { type: "circle" },
        opacity: { value: 0.5 },
        size: { value: 4 },
        move: {
          enable: true,
          speed: 1,
          direction: "none",
          attract: {
            enable: true,
            rotateX: 600,
            rotateY: 1200
          }
        }
      }
    }}
  />
);
```

**Performance Budget (from Phase 27):**
- Max 50-100 particles on screen (adaptive based on device)
- Use `@tsparticles/slim` for smaller bundle size
- GPU acceleration via CSS transforms

**Why tsParticles over custom canvas?**
- ✅ Pre-optimized performance
- ✅ Declarative configuration
- ✅ React component integration
- ✅ Built-in particle behaviors (attract, repulse, bounce)

**Sources:**
- [tsParticles GitHub](https://github.com/tsparticles/tsparticles)
- [tsParticles React](https://github.com/tsparticles/react)
- [tsParticles Samples](https://particles.js.org/samples/index.html)

---

### 2.4 Remotion - Cinematic System

**Purpose:** Boss entrance/defeat cinematics (5-10s video sequences)

**Key Features:**
- Programmatic video creation using React components
- TypeScript-first, integrates with existing codebase
- Remotion Skills (Jan 2026) - AI-assisted video generation via Claude Code
- Render to MP4 or embed as React component

**Installation:**
```bash
npm install remotion @remotion/player
```

**Use Cases for Boss Battles:**

**1. Boss Entrance Cinematic (5-10s):**
```typescript
// compositions/BossEntrance.tsx
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';

export const BossEntrance = ({ bossName, bossImage }) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(1, frame / 30); // Fade in over 1s

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Background flash (0-1s) */}
      <Sequence from={0} durationInFrames={30}>
        <div className="flash-effect" />
      </Sequence>

      {/* Boss reveal (1-3s) */}
      <Sequence from={30} durationInFrames={60}>
        <img
          src={bossImage}
          style={{
            opacity,
            transform: `scale(${Math.min(1, frame / 60)})`
          }}
        />
      </Sequence>

      {/* Boss name title (3-5s) */}
      <Sequence from={90} durationInFrames={60}>
        <h1 className="boss-name">{bossName}</h1>
      </Sequence>
    </AbsoluteFill>
  );
};
```

**2. Boss Defeat Cinematic (5-10s):**
```typescript
export const BossDefeat = ({ bossName }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      {/* Boss collapse animation (0-2s) */}
      <Sequence from={0} durationInFrames={60}>
        <BossCollapseEffect frame={frame} />
      </Sequence>

      {/* Victory confetti (2-5s) */}
      <Sequence from={60} durationInFrames={90}>
        <ConfettiExplosion />
      </Sequence>

      {/* Victory text (5-7s) */}
      <Sequence from={150} durationInFrames={60}>
        <h1>VICTORY!</h1>
      </Sequence>
    </AbsoluteFill>
  );
};
```

**3. Embed in React App:**
```typescript
import { Player } from '@remotion/player';

<Player
  component={BossEntrance}
  durationInFrames={300}
  compositionWidth={1920}
  compositionHeight={1080}
  fps={30}
  inputProps={{ bossName: 'Ms. Grammar', bossImage: '/boss-1.png' }}
  controls
  autoPlay
/>
```

**Remotion Skills Integration:**
With Remotion Skills (Jan 2026), cinematics can be generated via natural language:
```
Claude, create a boss entrance cinematic:
- Boss name: "Ms. Grammar"
- 8 seconds long
- Dark background with lightning effects
- Boss fades in from smoke
- Name appears with dramatic zoom
```

**Skippable After 2s (BOSS-04):**
```typescript
const [canSkip, setCanSkip] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => setCanSkip(true), 2000);
  return () => clearTimeout(timer);
}, []);

return (
  <>
    <Player ... />
    {canSkip && (
      <button onClick={onSkip}>Skip (press ESC)</button>
    )}
  </>
);
```

**Why Remotion over video files?**
- ✅ Programmatic - generate cinematics from boss data
- ✅ Dynamic - boss name/image injected as props
- ✅ Smaller bundle - no video file storage
- ✅ AI-assisted - Remotion Skills for rapid iteration
- ⚠️ Larger dependency footprint than video files

**Sources:**
- [Remotion GitHub](https://github.com/remotion-dev/remotion)
- [Remotion Skills (Jan 2026)](https://gaga.art/blog/remotion-skills/)
- [Remotion with Claude Code](https://medium.com/@creativeaininja/making-videos-with-code-the-complete-guide-to-remotion-and-claude-code-82892e21d022)

---

### 2.5 Image MCP + FLUX.1 + rembg - Boss Graphics Pipeline

**Purpose:** Generate unique, transparent boss graphics for each boss character

**Pipeline Architecture:**
```
1. Image MCP (FLUX.1) → Generate boss image from prompt
2. rembg (Python) → Remove background, output transparent PNG
3. Optimization → WebP conversion, resize for web
4. Integration → Import into React components
```

#### Step 1: Image MCP (FLUX.1 Model)

**Available via Claude Code:**
```typescript
// Image generation via MCP
const generateBossImage = async (bossName: string, personality: string) => {
  const prompt = `
    A bold, cartoonish ${bossName} character for a word game.
    Personality: ${personality}.
    Neo-brutalist art style with thick black outlines.
    Vibrant colors (yellow, orange, pink, cyan).
    Full body portrait, facing forward.
    No background, solid white background for removal.
  `;

  // Invoke via Claude Code MCP
  const imagePath = await mcp.generateImage(prompt, {
    aspectRatio: '1:1',
    imageSize: '2K',
    purpose: 'game character art',
    useWorldKnowledge: false
  });

  return imagePath;
};
```

**Example Prompts:**
- Ms. Grammar: "Strict teacher character with ruler, glasses, and stern expression. Neo-brutalist cartoon style."
- Spelling Bee: "Giant bee character with dictionary pages as wings. Playful, buzzing energy."
- Puzzle Master: "Wizard with puzzle pieces floating around. Mischievous grin, colorful robes."

#### Step 2: rembg (Background Removal)

**Installation:**
```bash
pip install rembg
```

**Python Script:**
```python
from rembg import remove
from PIL import Image

def remove_boss_background(input_path: str, output_path: str):
    """Remove background and output transparent PNG."""
    with open(input_path, 'rb') as i:
        input_data = i.read()
        output_data = remove(input_data)

    with open(output_path, 'wb') as o:
        o.write(output_data)

    print(f"Background removed: {output_path}")

# Usage
remove_boss_background('boss-ms-grammar.png', 'boss-ms-grammar-transparent.png')
```

**Performance:**
- 2-3 seconds per image
- Runs offline (no API costs)
- Python 3.11+ required
- Latest version: 2.0.72 (Jan 2026)

**Output Quality:**
- Transparent PNG with alpha channel
- Clean edges for cartoonish/high-contrast images
- May require manual cleanup for complex hair/fur

#### Step 3: WebP Optimization (Daily Buzz Pattern)

**From CLAUDE.md (Image Optimization):**
```typescript
import sharp from 'sharp';

async function optimizeBossImage(inputPath: string, outputPath: string) {
  await sharp(inputPath)
    .resize(800, 800, { fit: 'inside' }) // Max 800x800
    .webp({ quality: 80, effort: 6 }) // Match Daily Buzz settings
    .toFile(outputPath);

  const stats = await fs.stat(outputPath);
  if (stats.size > 200 * 1024) { // Target <200KB
    console.warn(`Boss image too large: ${stats.size / 1024}KB`);
  }
}
```

#### Step 4: Integration into React

**File Structure:**
```
public/images/bosses/
├── boss-ms-grammar.webp
├── boss-spelling-bee.webp
├── boss-professor-thesaurus.webp
└── ...
```

**Boss Config Update:**
```typescript
// lib/adventure/bossConfig.ts
export const BOSS_CONFIGS: BossConfig[] = [
  {
    id: 'ms-grammar',
    worldId: 1,
    displayName: 'adventure.bosses.msGrammar.name',
    imagePath: '/images/bosses/boss-ms-grammar.webp', // ← New
    // ...
  }
];
```

**Preload for Performance:**
```typescript
// Preload boss images on world entry
useEffect(() => {
  const preloadImages = BOSS_CONFIGS.map(boss => {
    const img = new Image();
    img.src = boss.imagePath;
    return img;
  });
}, []);
```

**Why This Pipeline?**
- ✅ AI-generated = unique art for each boss
- ✅ Transparent PNGs = flexible layering/compositing
- ✅ WebP optimization = fast load times (<200KB)
- ✅ No licensing issues = AI-generated art
- ⚠️ Manual step required (Python script)

**Automation Opportunity:**
- Create Node.js script to invoke Python rembg
- Generate all 10 boss images in one command
- Integrate into build pipeline

**Sources:**
- [rembg GitHub](https://github.com/danielgatis/rembg)
- [rembg PyPI](https://pypi.org/project/rembg/)
- [Background Removal Tutorial](https://www.python-engineer.com/posts/remove_background/)

---

### 2.6 Immer - Nested State Updates

**Purpose:** Simplify nested state updates in boss state machine context

**Why Needed:**
Boss state machines have complex nested context:
```typescript
{
  hp: 1000,
  phase: 1,
  attacks: [
    { id: 'attack-1', cooldown: 30, active: false },
    { id: 'attack-2', cooldown: 45, active: false }
  ],
  abilities: {
    ability1: { unlocked: false, uses: 0 },
    ability2: { unlocked: false, uses: 0 }
  }
}
```

**With Immer:**
```typescript
import { produce } from 'immer';

// Update nested state immutably
const newContext = produce(context, draft => {
  draft.hp -= 50;
  draft.attacks[0].cooldown -= 1;
  draft.abilities.ability1.uses += 1;
});
```

**Integration with XState:**
```typescript
const bossMachine = createMachine({
  context: initialContext,
  actions: {
    dealDamage: assign(({ context, event }) =>
      produce(context, draft => {
        draft.hp -= event.amount;
      })
    )
  }
});
```

**Installation:**
```bash
npm install immer
```

**Sources:**
- Immer is a dependency of XState 5.x
- Project already uses React hooks (likely using Immer patterns)

---

## 3. Boss Ability System Design

### Current State vs Target State

**Current (Phase 17):**
- 1 twist mechanic per boss (popQuiz, hiveMind, etc.)
- Hardcoded in `useBossMechanics.ts`
- No ability cooldowns or activation logic

**Target (Phase 30 - BOSS-05, BOSS-06):**
- 2-3 unique abilities per boss
- Extensible registry pattern
- Ability cooldowns, activation conditions, visual effects

### Ability System Architecture

```typescript
// types/bossAbility.ts
export interface BossAbility {
  id: string;
  name: string; // Translation key
  description: string; // Translation key
  cooldown: number; // seconds
  activationCondition: (context: BossContext) => boolean;
  effect: (context: BossContext, gameState: AdventureGameState) => void;
  telegraph: TelegraphConfig;
}

export interface TelegraphConfig {
  duration: number; // 2s warning
  visualType: 'tiles' | 'screen' | 'boss';
  particleEffect?: string;
  soundEffect?: string;
}

// Ability Registry Pattern
export class BossAbilityRegistry {
  private abilities = new Map<string, BossAbility>();

  register(ability: BossAbility) {
    this.abilities.set(ability.id, ability);
  }

  get(id: string): BossAbility | undefined {
    return this.abilities.get(id);
  }

  getForBoss(bossId: string): BossAbility[] {
    // Return 2-3 abilities for specific boss
  }
}
```

### Example Abilities

**1. Ms. Grammar - "Pop Quiz" Ability:**
```typescript
{
  id: 'pop-quiz',
  name: 'adventure.bosses.abilities.popQuiz.name',
  description: 'adventure.bosses.abilities.popQuiz.desc',
  cooldown: 30,
  activationCondition: (ctx) => ctx.phase >= 2,
  effect: (ctx, gameState) => {
    // Enforce word category requirement for next 3 words
    gameState.requirementType = 'doubleLetters';
    gameState.requirementDuration = 3;
  },
  telegraph: {
    duration: 2,
    visualType: 'screen',
    particleEffect: 'sparkle'
  }
}
```

**2. Spelling Bee - "Hivemind Swarm" Ability:**
```typescript
{
  id: 'hivemind-swarm',
  name: 'adventure.bosses.abilities.hivemindSwarm.name',
  description: 'adventure.bosses.abilities.hivemindSwarm.desc',
  cooldown: 45,
  activationCondition: (ctx) => ctx.hp < 500,
  effect: (ctx, gameState) => {
    // Make 6 random tiles sticky (require multiple uses)
    const randomIndices = getRandomTiles(6);
    randomIndices.forEach(i => {
      gameState.specialTiles[i] = 'sticky';
    });
  },
  telegraph: {
    duration: 2,
    visualType: 'tiles',
    particleEffect: 'bees'
  }
}
```

**3. Puzzle Master - "Scrambled Reality" Ability:**
```typescript
{
  id: 'scrambled-reality',
  name: 'adventure.bosses.abilities.scrambledReality.name',
  description: 'adventure.bosses.abilities.scrambledReality.desc',
  cooldown: 40,
  activationCondition: (ctx) => ctx.phase === 3, // Enraged only
  effect: (ctx, gameState) => {
    // Shuffle all tiles on board
    gameState.tiles = shuffleTiles(gameState.tiles);
  },
  telegraph: {
    duration: 2,
    visualType: 'boss',
    particleEffect: 'swirl'
  }
}
```

### Ability Activation Flow

```
1. Boss state machine checks activation conditions every 1s
2. If condition met + cooldown ready → Trigger telegraph
3. Telegraph plays 2s warning (particles + visual cues)
4. After 2s → Execute ability effect
5. Start cooldown timer
6. Update UI (cooldown indicators)
```

**XState Integration:**
```typescript
const bossMachine = createMachine({
  // ...
  states: {
    phase1: {
      invoke: {
        src: 'abilityChecker', // Check every 1s
        onDone: { actions: 'triggerAbility' }
      }
    }
  }
});
```

---

## 4. Segmented HP Bar Design

### Current HP Bar (BossHPBar.tsx)

**Current Features:**
- Single bar (0-100%)
- Color change at 25% (green → red)
- Enraged badge appears at 25%
- Smooth spring animation

**Gaps vs BOSS-02:**
- No phase indicators
- No segmentation showing thresholds

### Target Design (5-Phase System)

**HP Segments:**
```
|------ 100-66% ------||------ 66-33% ------||------ 33-0% ------|
|    PHASE 1 (GREEN)  ||   PHASE 2 (YELLOW) ||  ENRAGED (RED)   |
```

**Visual Design:**
```
╔════════════════════════════════════════════╗
║ Ms. Grammar                      [PHASE 2] ║
║ ┌────────────┬────────────┬────────────┐   ║
║ │████████████│████████    │            │   ║
║ │  PHASE 1   │  PHASE 2   │  ENRAGED   │   ║
║ │   (FULL)   │ (ACTIVE)   │  (EMPTY)   │   ║
║ └────────────┴────────────┴────────────┘   ║
║              650 / 1000 HP                 ║
╚════════════════════════════════════════════╝
```

**Implementation Strategy:**
```typescript
interface HPSegment {
  id: string;
  label: string;
  threshold: number; // HP percentage where segment ends
  color: string;
  filled: boolean;
}

const segments: HPSegment[] = [
  { id: 'phase1', label: 'Phase 1', threshold: 66, color: 'lime', filled: true },
  { id: 'phase2', label: 'Phase 2', threshold: 33, color: 'yellow', filled: false },
  { id: 'enraged', label: 'Enraged', threshold: 0, color: 'red', filled: false }
];

// Calculate current segment
const currentHP = 650; // 65%
const currentSegment = segments.find(s => currentHP > s.threshold);

// Render 3 segments
segments.map(segment => (
  <div className={`hp-segment ${segment.filled ? 'filled' : 'empty'}`}>
    <div className="hp-fill" style={{ width: `${calculateFill(segment)}%` }} />
    <span>{segment.label}</span>
  </div>
));
```

**Phase Indicator Badge:**
```typescript
<div className="phase-badge">
  PHASE {currentPhase} / 3
</div>
```

**Transition Animation:**
- When segment depletes to 0%, flash effect + shake
- Play phase transition sound
- Update badge to next phase

---

## 5. Attack Telegraph System

### Visual Design (2s Warning - BOSS-03)

**Concept:**
```
0.0s: Boss ability activates
  ↓
0.0-0.5s: WARNING text appears ("INCOMING ATTACK!")
  ↓
0.5-1.5s: Target tiles glow red (pulsing), particles spawn
  ↓
1.5-2.0s: Intensity increases (faster pulse, more particles)
  ↓
2.0s: Attack executes (tiles scrambled/locked/etc.)
```

**Component Structure:**
```typescript
interface AttackTelegraphProps {
  type: 'tiles' | 'screen' | 'boss';
  targetTiles?: number[];
  duration: number; // 2s
  onComplete: () => void;
}

export const AttackTelegraph = ({ type, targetTiles, duration, onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 0.05, 1));
    }, 100);

    if (progress >= 1) {
      onComplete();
    }

    return () => clearInterval(interval);
  }, [progress]);

  if (type === 'tiles') {
    return (
      <div className="attack-telegraph-tiles">
        <WarningBanner />
        {targetTiles.map(i => (
          <TileWarningOverlay
            key={i}
            index={i}
            intensity={progress}
          />
        ))}
        <AttackTelegraphParticles intensity={progress} />
      </div>
    );
  }

  if (type === 'screen') {
    return (
      <div className="attack-telegraph-screen">
        <ScreenFlash intensity={progress} color="red" />
        <WarningText progress={progress} />
      </div>
    );
  }

  return null;
};
```

**GSAP Animation:**
```typescript
// Pulsing glow on target tiles
gsap.to(targetTiles.map(i => `.tile-${i}`), {
  boxShadow: '0 0 30px red',
  scale: 1.1,
  duration: 0.5,
  repeat: -1,
  yoyo: true,
  ease: 'power2.inOut'
});
```

**tsParticles Warning Effect:**
```typescript
<Particles
  options={{
    particles: {
      number: { value: 30 },
      color: { value: "#ff0000" },
      opacity: { value: { min: 0.3, max: 0.9 } },
      size: { value: { min: 2, max: 5 } },
      move: {
        enable: true,
        speed: 3,
        direction: "none"
      }
    }
  }}
/>
```

---

## 6. Implementation Strategy

### Wave-Based Approach

**Wave 1: XState 5-Phase State Machine**
- Install XState + @xstate/react
- Create `bossMachine.ts` with 5 phases (intro/phase1/phase2/enraged/victory/defeat)
- Replace `useBossHealth` phase tracking with XState
- Wire state machine into `BossOverlay`

**Wave 2: Segmented HP Bar**
- Redesign `BossHPBar.tsx` with 3 segments
- Add phase indicators (badges)
- Animate segment depletion with GSAP
- Add phase transition effects (flash, shake)

**Wave 3: Attack Telegraph System**
- Install GSAP + tsParticles
- Create `AttackTelegraph.tsx` component
- Implement 2s warning flow (warning → telegraph → execute)
- Wire into boss state machine (invoke telegraph service)

**Wave 4: Boss Ability System**
- Design `BossAbility` interface
- Create `BossAbilityRegistry` class
- Define 2-3 abilities per boss (10 bosses × 2-3 = 20-30 abilities)
- Integrate ability activation into state machine

**Wave 5: Boss Graphics Pipeline**
- Generate 10 boss images via Image MCP (FLUX.1)
- Run rembg Python script for background removal
- Optimize to WebP (<200KB)
- Update `bossConfig.ts` with image paths

**Wave 6: Cinematic System**
- Install Remotion + @remotion/player
- Create `BossEntranceCinematic.tsx` composition
- Create `BossDefeatCinematic.tsx` composition
- Wire cinematics into `BossOverlay` (replace modals)
- Add skip functionality (after 2s)

**Wave 7: Integration & Testing**
- Wire all systems together in `AdventureGame.tsx`
- Comprehensive testing (state machine, abilities, cinematics)
- Performance testing (60fps on mobile)
- Accessibility audit (reduced motion, keyboard controls)

---

## 7. Key Risks & Mitigations

### Risk 1: State Machine Complexity

**Risk:** XState state machine becomes too complex with abilities, attacks, phases
**Mitigation:**
- Use hierarchical states (phase1.ability1, phase1.ability2)
- Extract ability logic into separate services
- Visualize state machine with Stately Studio
- Start simple (5 phases) before adding abilities

### Risk 2: Performance Degradation

**Risk:** GSAP + tsParticles + Remotion = janky animations on mobile
**Mitigation:**
- Particle budget enforcement (max 50-100 on screen)
- GPU-accelerated properties only (transform, opacity)
- Lazy load Remotion cinematics (don't bundle in main chunk)
- Test on iPhone 12 baseline (Phase 27 standard)

### Risk 3: Boss Graphics Quality

**Risk:** AI-generated images look inconsistent or low-quality
**Mitigation:**
- Use consistent prompt template for all bosses
- Manual review before background removal
- Fallback to placeholder images during development
- Consider manual art commission if AI results unsatisfactory

### Risk 4: Cinematic Load Times

**Risk:** Remotion cinematics take too long to render/load
**Mitigation:**
- Preload cinematics on world entry (not on boss level)
- Use `@remotion/player` for instant playback (no render needed)
- Cache rendered videos in IndexedDB
- Skip button unlocks after 2s (BOSS-04)

### Risk 5: Translation Overhead

**Risk:** 20-30 new abilities × 4 languages = 80-120 translation keys
**Mitigation:**
- Use AI-assisted translation (existing workflow)
- Prioritize English first, translate in batch
- Reuse existing boss taunt translation patterns
- Phase 13 (Translation Completion) already established workflow

---

## 8. Dependencies & Prerequisites

### Completed Dependencies

✅ **Phase 27 (Dynamic Board Mechanics):**
- Cascade animations for ability effects
- Explosion effects for attack impacts
- Special tile system (frozen, locked, multiplier)

✅ **Phase 28 (Power-Up System):**
- Activation effects pattern (shake + particles)
- Cooldown visualization (radial progress)
- Effect duration tracking (30s multiplier pattern)

✅ **Phase 29 (Adaptive Difficulty):**
- Performance tracking for ability tuning
- Hint system integration (ability could grant hints)

### New Dependencies to Install

```bash
# XState state machines
npm install xstate@5.24.0 @xstate/react

# GSAP animations
npm install gsap@3.14.2

# tsParticles effects
npm install @tsparticles/react @tsparticles/engine @tsparticles/slim

# Remotion cinematics
npm install remotion @remotion/player

# Immer state updates (may already be installed)
npm install immer

# Python for background removal (separate environment)
pip install rembg
```

### External Tools

- **Image MCP:** Available via Claude Code (no installation)
- **rembg:** Python CLI tool (requires Python 3.11+)
- **Sharp:** Already installed (WebP optimization)

---

## 9. Testing Strategy

### Unit Tests

**XState State Machine:**
- Test phase transitions (intro → phase1 → phase2 → enraged → victory/defeat)
- Test guard conditions (hpBelow66, hpBelow33, hpZero)
- Test ability activation logic
- Test cooldown tracking

**Boss Ability System:**
- Test ability registry (register, get, getForBoss)
- Test activation conditions
- Test ability effects on game state
- Test telegraph duration

**Segmented HP Bar:**
- Test segment fill calculations
- Test phase indicator updates
- Test transition animations trigger

### Integration Tests

**Boss Battle Flow:**
1. Start battle (intro → phase1)
2. Deal damage (phase1 → phase2 transition at 66%)
3. Ability activates (telegraph → execute)
4. Enraged phase (phase2 → enraged at 33%)
5. Victory (enraged → victory at 0 HP)

**Attack Telegraph:**
1. Ability condition met
2. Telegraph starts (2s warning)
3. Visual effects appear (particles, glow)
4. Attack executes after 2s
5. Cooldown starts

### Performance Tests

**Mobile Performance (iPhone 12):**
- 60fps during phase transitions
- Particle count < 100 on screen
- HP bar animation smooth (no jank)
- Telegraph animations don't block input

**Bundle Size:**
- XState < 20KB
- GSAP < 50KB
- tsParticles < 100KB
- Remotion (lazy loaded, not in main bundle)

### Accessibility Tests

**Keyboard Controls:**
- Skip cinematic (ESC key)
- Navigate boss UI (Tab)
- Activate power-ups during boss battle (1, 2, 3 keys)

**Reduced Motion:**
- Disable GSAP animations
- Disable particle effects
- Disable screen shake
- Static HP bar transitions

---

## 10. Success Criteria Validation

| Requirement | Implementation Path | Validation Method |
|-------------|---------------------|-------------------|
| **BOSS-01**: 5-phase state machine | XState machine with intro/phase1/phase2/enraged/victory/defeat states | Unit test state transitions, integration test full battle flow |
| **BOSS-02**: Segmented HP bar | Redesign `BossHPBar.tsx` with 3 segments + phase badges | Visual test in Storybook, unit test segment fill calculations |
| **BOSS-03**: Telegraphed attacks (2s) | `AttackTelegraph.tsx` component + GSAP animations | Integration test telegraph → attack flow, manual test timing |
| **BOSS-04**: 5-10s cinematic intro (skip after 2s) | Remotion cinematics + skip button timer | Manual test cinematic, unit test skip unlock timing |
| **BOSS-05**: 2-3 abilities per boss | `BossAbility` interface + registry, 20-30 total abilities | Unit test ability activation, integration test effects |
| **BOSS-06**: Extensible ability system | `BossAbilityRegistry` class | Unit test registry CRUD, verify new abilities easy to add |
| **BOSS-07**: Entrance/defeat cinematics | Remotion `BossEntranceCinematic` + `BossDefeatCinematic` | Manual test cinematics, validate skip functionality |
| **BOSS-08**: Unique graphics (Image MCP + rembg) | 10 AI-generated images + background removal pipeline | Visual review all boss images, validate <200KB size |

---

## 11. File Size & Complexity Management

**File Size Constraints (from CLAUDE.md):**
- Max 500 lines per file
- Max 300 lines for components

**Splitting Strategy:**

**Types (New Files):**
- `types/bossAbility.ts` (ability interfaces)
- `types/bossStateMachine.ts` (XState types)
- `types/attackTelegraph.ts` (telegraph types)

**State Management:**
- `hooks/useBossStateMachine.ts` (XState integration, ~200 lines)
- `hooks/useBossAbilities.ts` (ability activation, ~250 lines)
- `hooks/useAttackTelegraph.ts` (telegraph orchestration, ~150 lines)

**Components (New Files):**
- `components/adventure/boss/SegmentedHPBar.tsx` (~200 lines)
- `components/adventure/boss/AttackTelegraph.tsx` (~150 lines)
- `components/adventure/boss/BossAbilityIndicator.tsx` (~100 lines)
- `components/adventure/boss/cinematics/BossEntranceCinematic.tsx` (~250 lines)
- `components/adventure/boss/cinematics/BossDefeatCinematic.tsx` (~250 lines)

**Ability Definitions (New Directory):**
```
lib/adventure/abilities/
├── index.ts (registry, ~100 lines)
├── msGrammarAbilities.ts (~150 lines)
├── spellingBeeAbilities.ts (~150 lines)
├── professorThesaurusAbilities.ts (~150 lines)
└── ... (7 more boss ability files)
```

**Existing Files to Modify:**
- `types/boss.ts` (add ability types, stay under 500 lines)
- `hooks/useBossHealth.ts` (integrate XState, ~200 lines)
- `components/adventure/boss/BossOverlay.tsx` (add cinematics, ~250 lines)
- `components/adventure/AdventureGame.tsx` (wire abilities, already large - minimal changes)

**Estimated New Lines:** ~3000-4000 lines total across 20+ files

---

## 12. Translation Requirements

### New Translation Keys (Estimate)

**Boss Abilities (20-30 abilities × 2 keys = 40-60 keys):**
```javascript
adventure.bosses.abilities.popQuiz.name
adventure.bosses.abilities.popQuiz.desc
adventure.bosses.abilities.hivemindSwarm.name
adventure.bosses.abilities.hivemindSwarm.desc
// ... 18-28 more abilities
```

**Attack Telegraphs (10 keys):**
```javascript
adventure.bosses.telegraph.warning
adventure.bosses.telegraph.incoming
adventure.bosses.telegraph.prepare
// ... 7 more
```

**Phase Indicators (5 keys):**
```javascript
adventure.bosses.phase1
adventure.bosses.phase2
adventure.bosses.enraged
adventure.bosses.phaseTransition
adventure.bosses.phaseIndicator
```

**Cinematics (10 keys):**
```javascript
adventure.bosses.cinematics.skip
adventure.bosses.cinematics.entrance
adventure.bosses.cinematics.defeat
adventure.bosses.cinematics.victory
// ... 6 more
```

**Total: ~65-85 new translation keys × 4 languages = 260-340 translations**

**Reuse Existing Keys:**
- Boss names (already translated)
- Twist mechanic descriptions (already translated)
- Victory/defeat messages (already translated)

---

## 13. Questions for Planning

### Architecture Decisions

1. **State Machine Scope:** Should XState manage entire boss battle (including abilities) or just phase transitions?
   - **Recommendation:** Phase transitions only, abilities managed separately for simplicity

2. **Ability Activation:** Automatic (AI director) or manual (player activates)?
   - **Requirement:** Automatic (boss is NPC, not player-controlled)

3. **Cinematic Format:** Remotion (programmatic) or pre-rendered MP4s?
   - **Recommendation:** Remotion for flexibility, consider MP4 fallback if performance issues

4. **Telegraph Interruption:** Can player interrupt telegraphed attacks (e.g., power-up)?
   - **Recommendation:** No interruption (telegraph = warning, not cancellable)

### UX Decisions

5. **Segmented HP Bar:** Always visible or only during active phases?
   - **Recommendation:** Hidden during intro, visible during active/enraged/victory/defeat

6. **Ability Indicators:** Show cooldowns for boss abilities (like power-ups)?
   - **Recommendation:** Show active ability indicators, hide cooldowns (boss = mysterious)

7. **Cinematic Skip:** Skip button visible immediately or after 2s?
   - **Requirement:** Visible but disabled for 2s (BOSS-04)

8. **Attack Feedback:** How to communicate attack impact (tiles scrambled, locked, etc.)?
   - **Recommendation:** Post-attack notification ("Boss scrambled the tiles!") + visual change

### Technical Decisions

9. **Boss Graphics Pipeline:** Automated (CI/CD) or manual (developer-run script)?
   - **Recommendation:** Manual during Phase 30, automate in Phase 35 (Tech Debt Cleanup)

10. **Particle Budget:** Same as Phase 27 (50-100) or stricter for boss battles?
    - **Recommendation:** Stricter (50 max) to leave headroom for HP bar + abilities

11. **Ability Complexity:** Simple effects (change tiles) or complex (change mechanics)?
    - **Recommendation:** Start simple (tile changes), add complexity in future phases

12. **Phase Transition Timing:** Instant on HP threshold or delayed after ability?
    - **Recommendation:** Instant transition, ability completes after transition

---

## 14. Prior Art & Inspiration

### Games with Similar Boss Systems

**1. Cuphead:**
- Multi-phase bosses (3-5 phases)
- Telegraphed attacks (visual cues before activation)
- HP bar segments showing phase thresholds
- Unique boss art and animations

**Lessons:**
- Clear visual communication of phases
- Telegraph warnings reduce frustration
- Boss personality conveyed through animations

**2. Hollow Knight:**
- Boss attacks have 1-2s wind-up animations
- Screen shake on phase transitions
- Cinematic entrance sequences
- Distinctive boss music per encounter

**Lessons:**
- Wind-up animations = natural telegraph
- Audio cues reinforce phase changes
- Music sets boss battle tone

**3. Undertale:**
- Turn-based boss battles with unique mechanics per boss
- Attack patterns visualized before execution
- Boss dialogue during battle (personality)
- Mercy system (non-violent resolution)

**Lessons:**
- Boss personality through dialogue/behavior
- Predictable patterns feel fair
- Unique mechanics per boss = memorable

**4. Mega Man Series:**
- Boss weakness system (rock-paper-scissors)
- Telegraph pattern: boss pose → attack executes
- Boss rush mode (fight all bosses sequentially)

**Lessons:**
- Clear attack patterns
- Boss pose = telegraph
- Pattern recognition = skill expression

---

## 15. Summary & Recommendations

### Phase 30 is Ready to Plan

**Green Lights:**
- ✅ Foundation exists (Phases 16-17)
- ✅ Dependencies complete (Phases 27-29)
- ✅ Technology researched and validated
- ✅ Clear requirements (BOSS-01 through BOSS-08)
- ✅ File size strategy defined
- ✅ Testing strategy established

**Key Recommendations:**

1. **Prioritize Core Loop First:**
   - Wave 1-3: State machine + HP bar + telegraphs
   - Wave 4-5: Abilities + graphics
   - Wave 6-7: Cinematics + polish

2. **Start with 1 Boss, Then Generalize:**
   - Implement Ms. Grammar (World 1) fully
   - Validate gameplay feel
   - Replicate for 9 remaining bosses

3. **Use Existing Patterns:**
   - Telegraph system = Phase 28 activation effects (shake + particles)
   - Ability cooldowns = Phase 28 power-up cooldowns (radial progress)
   - HP segments = Phase 27 explosion intensity levels

4. **Defer Complex Abilities:**
   - Phase 30 MVP: Simple abilities (tile changes, score modifiers)
   - Phase 35: Complex abilities (mechanic changes, board transforms)

5. **Manual Pipeline for Graphics:**
   - Generate images via Image MCP during planning
   - Run rembg script after Phase 30 complete
   - Automate in Phase 35 (Tech Debt Cleanup)

### Next Step: Write Plans

**Plan Structure (7-8 waves recommended):**
- 30-01: XState 5-phase state machine
- 30-02: Segmented HP bar redesign
- 30-03: Attack telegraph system
- 30-04: Boss ability system foundation
- 30-05: Boss abilities (10 bosses × 2-3 abilities)
- 30-06: Boss graphics pipeline
- 30-07: Cinematic system (entrance + defeat)
- 30-08: Integration & polish

**Estimated Timeline:** 8-10 days (1 day per wave, testing/polish)

---

## Sources

**XState:**
- [XState GitHub](https://github.com/statelyai/xstate)
- [XState React Hooks](https://stately.ai/docs/xstate-react)
- [TypeScript Support](https://stately.ai/docs/typescript)

**GSAP:**
- [GSAP React Integration](https://gsap.com/resources/React/)
- [GSAP Stagger Tutorial](https://dev.to/greyboyle/easy-react-animation-with-gsap-1bnp)
- [GSAP NPM Package](https://www.npmjs.com/package/gsap)

**tsParticles:**
- [tsParticles GitHub](https://github.com/tsparticles/tsparticles)
- [tsParticles React](https://github.com/tsparticles/react)
- [tsParticles Samples](https://particles.js.org/samples/index.html)

**Remotion:**
- [Remotion GitHub](https://github.com/remotion-dev/remotion)
- [Remotion Skills (Jan 2026)](https://gaga.art/blog/remotion-skills/)
- [Remotion with Claude Code](https://medium.com/@creativeaininja/making-videos-with-code-the-complete-guide-to-remotion-and-claude-code-82892e21d022)

**rembg:**
- [rembg GitHub](https://github.com/danielgatis/rembg)
- [rembg PyPI](https://pypi.org/project/rembg/)
- [Background Removal Tutorial](https://www.python-engineer.com/posts/remove_background/)

---

_Research completed: 2026-01-31_
_Researcher: Claude (gsd-phase-researcher)_
