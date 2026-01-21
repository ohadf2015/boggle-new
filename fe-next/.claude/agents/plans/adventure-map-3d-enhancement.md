# Feature: Adventure Map 3D Enhancement with React Three Fiber

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Transform the Adventure Mode world map from a 2D Framer Motion implementation to an immersive 3D floating islands experience using React Three Fiber. The current implementation uses 2D cards with parallax effects, but the design spec calls for true floating islands with depth, golden bridges, magical atmosphere, and a "Jackbox Party Pack" meets "Candy Crush Saga" world map feel.

## User Story

As a player exploring Adventure Mode
I want to see an immersive 3D world map with floating islands
So that I feel like I'm embarking on a magical word adventure through themed worlds

## Problem Statement

The current adventure map implementation uses 2D cards with basic parallax scrolling. While functional, it doesn't match the visual fidelity of the design prototype which shows:
- Floating word-themed islands on cloudy/starry background
- Golden bridges connecting islands (made of letters)
- Parallax scrolling with floating books, pencils, scrolls
- Each island with unique world theme and visual depth
- True 3D perspective and depth

## Solution Statement

Implement a true 3D world map using React Three Fiber (@react-three/fiber) with:
1. 3D floating island meshes with procedural generation or GLTF models
2. Perspective camera with smooth scroll-based navigation
3. Particle systems for magical atmosphere (stars, sparkles, clouds)
4. Golden letter bridges connecting islands with glow effects
5. Post-processing for bloom, depth of field, and atmosphere
6. Mobile-optimized rendering with quality scaling

## Feature Metadata

**Feature Type:** Enhancement (improves existing feature)
**Estimated Complexity:** High
**Primary Systems Affected:**
- `components/adventure/WorldMap.tsx` (complete rewrite)
- `components/adventure/AdventureView.tsx` (minor updates)
- New 3D components directory
**Dependencies:**
- `@react-three/fiber` (React renderer for Three.js)
- `@react-three/drei` (helpers and abstractions)
- `@react-three/postprocessing` (visual effects)

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `components/adventure/WorldMap.tsx` (lines 1-627)
  - **WHY:** Current 2D implementation to be replaced
  - **PATTERN:** Uses Framer Motion, parallax transforms, existing props interface
  - **KEEP:** Props interface (WorldMapProps), world data logic, completions handling

- `components/adventure/AdventureView.tsx` (lines 1-197)
  - **WHY:** Parent component that uses WorldMap
  - **PATTERN:** State management, transitions, header
  - **UPDATE:** May need loading state for 3D assets

- `components/adventure/LevelGrid.tsx` (lines 1-227)
  - **WHY:** Level selection after clicking world
  - **PATTERN:** Keep as-is, no 3D needed here

- `lib/adventure/constants.ts`
  - **WHY:** World configurations, colors, themes
  - **PATTERN:** WORLD_CONFIGS, color palettes per world

- `app/globals.css`
  - **WHY:** Neo-brutalist design tokens
  - **PATTERN:** `neo-*` colors, shadow-hard-*, border-neo

### New Files to Create

```
components/adventure/3d/
├── WorldMap3D.tsx           # Main 3D scene container
├── FloatingIsland.tsx       # Individual island mesh
├── GoldenBridge.tsx         # Bridge connecting islands
├── CloudParticles.tsx       # Atmospheric clouds
├── StarField.tsx            # Background star particles
├── FloatingDecorations.tsx  # Books, scrolls, pencils
├── IslandMaterial.tsx       # Custom shader materials
├── CameraController.tsx     # Scroll-based camera
└── LoadingFallback.tsx      # Loading state while assets load
```

### Relevant Documentation (MUST READ!)

- [React Three Fiber Docs](https://r3f.docs.pmnd.rs/)
  - **Section:** Getting started, Canvas, useFrame, useThree
  - **WHY:** Core library for 3D rendering

- [Drei Helpers](https://github.com/pmndrs/drei)
  - **Section:** OrbitControls, Float, useProgress, Center, Text3D
  - **WHY:** Essential helpers for common 3D tasks

- [React Three Postprocessing](https://docs.pmnd.rs/react-postprocessing/introduction)
  - **Section:** EffectComposer, Bloom, DepthOfField
  - **WHY:** Visual polish and atmosphere

---

## DESIGN DECISIONS

### 1. 3D Library Choice: React Three Fiber

**Decision:** Use @react-three/fiber + @react-three/drei
**Rationale:**
- React-native rendering model (components, hooks, state)
- Industry standard for React 3D projects
- Rich ecosystem with drei helpers
- Performance optimizations built-in
- Active maintenance and community

**Alternatives Rejected:**
- Babylon.js: Heavier, less React-native
- Plain Three.js: More verbose, harder to integrate with React
- CSS 3D: Limited depth and perspective capabilities

### 2. Island Rendering Approach

**Decision:** Procedural geometry with custom materials
**Rationale:**
- No need for external GLTF models (faster loading)
- Stylized look matches neo-brutalist design
- Easier to customize per-world themes
- Better performance than detailed models

**Implementation:**
- Use `THREE.CylinderGeometry` or `THREE.IcosahedronGeometry` for island base
- Custom shader materials for stylized look
- Floating animation via `<Float>` from drei
- World-specific colors from WORLD_CONFIGS

### 3. Camera System

**Decision:** Fixed camera with scroll-based position
**Rationale:**
- Intuitive for mobile users (scroll to navigate)
- Matches current interaction pattern
- No learning curve for users
- Smooth transitions between worlds

**Implementation:**
- Camera follows scroll position
- Islands positioned vertically in 3D space
- Smooth easing via spring physics
- Tap/click on island to select

### 4. Performance Strategy

**Decision:** Progressive enhancement with quality tiers
**Rationale:**
- Mobile-first (most game traffic)
- Graceful degradation
- Maintain 60fps target

**Implementation:**
- Detect device capability via `navigator.hardwareConcurrency`
- High: Full post-processing, particles, shadows
- Medium: Basic effects, reduced particles
- Low: Minimal effects, simplified geometry

---

## VISUAL DESIGN SPECIFICATION

### World Colors (from WORLD_CONFIGS)

| World | Primary Color | Secondary | Glow Effect |
|-------|--------------|-----------|-------------|
| 1 Alphabet Meadows | neo-lime | green-600 | Green glow |
| 2 Synonym Springs | neo-cyan | blue-500 | Cyan glow |
| 3 Root Caverns | neo-purple | indigo-600 | Purple glow |
| 4 Idiom Archipelago | neo-orange | orange-600 | Orange glow |
| 5 Compound Canyon | neo-red | rose-700 | Red glow |
| 6 Anagram Labyrinth | neo-pink | fuchsia-600 | Pink glow |
| 7 Mirror Palace | neo-white | cyan-300 | White/cyan glow |
| 8 Neologism Nebula | neo-purple | pink-500 | Purple gradient glow |
| 9 Polyglot Peaks | neo-cyan | emerald-500 | Teal glow |
| 10 Lexicon Throne | neo-yellow | amber-400 | Golden glow |

### Island Visual Hierarchy

```
UNLOCKED + COMPLETE:
  - Full color, intense glow
  - Stars visible on surface
  - Sparkle particles
  - Bridge to next world: golden

UNLOCKED + IN-PROGRESS:
  - Full color, subtle glow
  - Progress indicator
  - Slight pulse animation

LOCKED:
  - Grayscale/desaturated
  - Lock icon floating above
  - Star requirement badge
  - Bridge to previous: dim

CURRENT (next playable):
  - Brightest glow
  - Pulse animation
  - "PLAY" indicator
```

### Bridge Design

```
Golden Letter Bridge:
  ┌───┐   ┌───┐   ┌───┐
  │ W │───│ O │───│ R │───│ D │
  └───┘   └───┘   └───┘   └───┘

- Letter blocks form bridge
- Gold material with metallic shader
- Glow effect when unlocked
- Dim/gray when locked
- Subtle floating animation
```

### Floating Decorations

Position throughout 3D space:
- 📖 Floating books (slow rotation)
- 📜 Scrolls (gentle sway)
- ✏️ Pencils (spinning slowly)
- ⭐ Sparkles (particle system)
- ☁️ Clouds (parallax layers)

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation Setup

**Goal:** Install dependencies, create base 3D canvas

**Tasks:**
1. Install React Three Fiber dependencies
2. Create WorldMap3D.tsx with basic Canvas
3. Set up lighting and camera
4. Create performance detection hook
5. Add loading state management

### Phase 2: Island Components

**Goal:** Create 3D floating island meshes

**Tasks:**
1. Create FloatingIsland.tsx component
2. Implement procedural island geometry
3. Create IslandMaterial.tsx with world-specific colors
4. Add floating animation with Float from drei
5. Implement interaction (hover, click)
6. Add star indicators and lock overlay

### Phase 3: Bridges and Connections

**Goal:** Connect islands with golden bridges

**Tasks:**
1. Create GoldenBridge.tsx component
2. Implement letter block geometry
3. Create golden metallic material
4. Add glow effect for unlocked bridges
5. Position bridges between islands

### Phase 4: Atmosphere and Effects

**Goal:** Create magical atmosphere

**Tasks:**
1. Create StarField.tsx background
2. Create CloudParticles.tsx for depth
3. Create FloatingDecorations.tsx
4. Add post-processing (Bloom, atmosphere)
5. Implement quality tiers

### Phase 5: Camera and Navigation

**Goal:** Implement scroll-based camera

**Tasks:**
1. Create CameraController.tsx
2. Implement scroll-to-position mapping
3. Add smooth camera transitions
4. Handle touch/click on islands
5. Add scroll indicator UI

### Phase 6: Integration and Polish

**Goal:** Replace old WorldMap, polish UX

**Tasks:**
1. Update AdventureView to use WorldMap3D
2. Add loading fallback with progress
3. Implement quality settings toggle
4. Test on various devices
5. Performance optimization pass

---

## STEP-BY-STEP TASKS

### Task 1: CREATE package.json dependencies

- **IMPLEMENT:** Add React Three Fiber and related packages
- **PATTERN:** Use exact versions for stability
- **VALIDATE:** `npm install`

```bash
npm install @react-three/fiber @react-three/drei @react-three/postprocessing three
npm install -D @types/three
```

### Task 2: CREATE components/adventure/3d/WorldMap3D.tsx

- **IMPLEMENT:** Main 3D scene container with Canvas
- **PATTERN:** Follow R3F Canvas setup with Suspense
- **IMPORTS:** Canvas from @react-three/fiber, Environment from drei
- **GOTCHA:** Canvas must be wrapped in a div with explicit height
- **VALIDATE:** Component renders without errors

```tsx
// Structure:
interface WorldMap3DProps {
  totalStars: number;
  completions: Array<{ world: number; level: number; stars: number }>;
  onWorldSelect: (worldId: number) => void;
}

export default function WorldMap3D({ ... }: WorldMap3DProps) {
  return (
    <div className="h-[calc(100vh-12rem)] w-full">
      <Canvas shadows camera={{ position: [0, 0, 10], fov: 50 }}>
        <Suspense fallback={null}>
          {/* Scene contents */}
        </Suspense>
      </Canvas>
    </div>
  );
}
```

### Task 3: CREATE components/adventure/3d/FloatingIsland.tsx

- **IMPLEMENT:** Individual 3D island with world theme
- **PATTERN:** Use Float from drei for animation
- **IMPORTS:** Float, Text from drei, useFrame from fiber
- **GOTCHA:** Materials must be disposed on unmount
- **VALIDATE:** Island renders with correct color

```tsx
// Key features:
// - Procedural cylinder/icosahedron geometry
// - World-specific color material
// - Float animation (speed, intensity based on state)
// - Click handler for selection
// - Hover state with scale/glow change
// - Lock overlay for locked worlds
// - Star indicators on surface
```

### Task 4: CREATE components/adventure/3d/IslandMaterial.tsx

- **IMPLEMENT:** Custom stylized material for islands
- **PATTERN:** Use MeshStandardMaterial with custom parameters
- **IMPORTS:** MeshStandardMaterial, Color from three
- **GOTCHA:** Emissive for glow must be separate from base color
- **VALIDATE:** Materials change per world theme

### Task 5: CREATE components/adventure/3d/GoldenBridge.tsx

- **IMPLEMENT:** Letter blocks forming bridge between islands
- **PATTERN:** Array of positioned boxes with Text
- **IMPORTS:** Box, Text from drei
- **GOTCHA:** Text3D is expensive, use sprite text or limit letters
- **VALIDATE:** Bridge connects two island positions

### Task 6: CREATE components/adventure/3d/StarField.tsx

- **IMPLEMENT:** Background star particle system
- **PATTERN:** Points geometry with custom shader
- **IMPORTS:** Points, PointsMaterial from three
- **GOTCHA:** Use instancing for performance
- **VALIDATE:** Stars twinkle in background

### Task 7: CREATE components/adventure/3d/CloudParticles.tsx

- **IMPLEMENT:** Atmospheric cloud layers
- **PATTERN:** Billboard sprites at various depths
- **IMPORTS:** Sprite, SpriteMaterial from three
- **GOTCHA:** Use existing cloud.png asset
- **VALIDATE:** Clouds move slowly in parallax

### Task 8: CREATE components/adventure/3d/FloatingDecorations.tsx

- **IMPLEMENT:** Books, scrolls, pencils floating in scene
- **PATTERN:** Use existing PNG assets as sprites
- **IMPORTS:** Sprite, useTexture from drei
- **GOTCHA:** Position at various z-depths for parallax
- **VALIDATE:** Decorations float and rotate slowly

### Task 9: CREATE components/adventure/3d/CameraController.tsx

- **IMPLEMENT:** Scroll-based camera position control
- **PATTERN:** useScroll from Framer + useFrame from R3F
- **IMPORTS:** useFrame, useThree from fiber
- **GOTCHA:** Interpolate camera.position.y smoothly
- **VALIDATE:** Scrolling moves through world vertically

### Task 10: CREATE components/adventure/3d/LoadingFallback.tsx

- **IMPLEMENT:** Loading state while 3D assets load
- **PATTERN:** Use useProgress from drei
- **IMPORTS:** useProgress from drei
- **GOTCHA:** Match neo-brutalist styling
- **VALIDATE:** Shows progress percentage

### Task 11: CREATE hooks/usePerformanceTier.ts

- **IMPLEMENT:** Detect device capability for quality settings
- **PATTERN:** Check hardwareConcurrency, device memory
- **IMPORTS:** None (native APIs)
- **GOTCHA:** Fallback gracefully on unsupported APIs
- **VALIDATE:** Returns 'high' | 'medium' | 'low'

### Task 12: UPDATE components/adventure/3d/WorldMap3D.tsx - Add post-processing

- **IMPLEMENT:** Bloom and atmosphere effects
- **PATTERN:** EffectComposer from postprocessing
- **IMPORTS:** EffectComposer, Bloom from postprocessing
- **GOTCHA:** Only enable on high quality tier
- **VALIDATE:** Glow effect on islands

### Task 13: UPDATE components/adventure/AdventureView.tsx

- **IMPLEMENT:** Import WorldMap3D instead of WorldMap
- **PATTERN:** Dynamic import for code splitting
- **IMPORTS:** dynamic from next/dynamic
- **GOTCHA:** Add loading fallback
- **VALIDATE:** AdventureView renders 3D map

### Task 14: CREATE components/adventure/3d/index.ts

- **IMPLEMENT:** Barrel exports for 3D components
- **PATTERN:** Export all public components
- **VALIDATE:** Clean imports from parent

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test hook logic (usePerformanceTier)
- Test world data transformations
- Test camera position calculations

**Pattern:**
```typescript
describe('usePerformanceTier', () => {
  it('should return high for powerful devices', () => {
    // Mock navigator.hardwareConcurrency = 8
  });

  it('should return low for weak devices', () => {
    // Mock navigator.hardwareConcurrency = 2
  });
});
```

### Integration Tests

**Scope and Requirements:**
- Test WorldMap3D renders without errors
- Test world selection triggers callback
- Test loading state displays

### Visual Regression Tests

**Scope and Requirements:**
- Capture screenshots of world map at different states
- Compare across quality tiers
- Test on different viewport sizes

### Performance Tests

**Scope and Requirements:**
- Measure FPS on various devices
- Test memory usage
- Test loading time

---

## VALIDATION COMMANDS

### Level 1: Dependencies Installation

```bash
npm install @react-three/fiber @react-three/drei @react-three/postprocessing three
npm install -D @types/three
```

**Expected:** Installation completes without errors

### Level 2: TypeScript Compilation

```bash
npm run build
```

**Expected:** Build succeeds with no type errors

### Level 3: Lint Check

```bash
npm run lint
```

**Expected:** No lint errors in new files

### Level 4: Unit Tests

```bash
npm run test:frontend -- --testPathPattern="adventure/3d"
```

**Expected:** All tests pass

### Level 5: Dev Server

```bash
npm run dev
# Navigate to /adventure
```

**Expected:** 3D world map renders, worlds are clickable

### Level 6: Performance Check

```bash
# Open Chrome DevTools > Performance
# Record while scrolling through worlds
# Check FPS stays above 30fps minimum
```

**Expected:** Smooth 60fps on desktop, 30fps on mobile

---

## ACCEPTANCE CRITERIA

- [ ] 3D floating islands render for all 10 worlds
- [ ] Islands use correct colors from WORLD_CONFIGS
- [ ] Locked worlds appear grayscale with lock icon
- [ ] Golden bridges connect unlocked worlds
- [ ] Scroll navigates through worlds vertically
- [ ] Clicking unlocked world triggers onWorldSelect
- [ ] Floating decorations (books, scrolls) visible
- [ ] Star/cloud particles create atmosphere
- [ ] Post-processing bloom on high-quality devices
- [ ] Loading state shows while assets load
- [ ] Performance: 60fps desktop, 30fps mobile
- [ ] Existing props interface unchanged
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Mobile touch interactions work

---

## COMPLETION CHECKLIST

- [ ] Dependencies installed
- [ ] All 3D components created
- [ ] WorldMap3D integrates with AdventureView
- [ ] Quality tiers implemented
- [ ] Performance acceptable on mobile
- [ ] Visual design matches prototype
- [ ] Tests written and passing
- [ ] Lint passing
- [ ] Build passing
- [ ] Code reviewed

---

## NOTES

### Design Rationale

**Why full 3D instead of 2.5D:**
- Design spec explicitly shows floating islands with depth
- React Three Fiber provides declarative 3D
- Better immersion for game experience
- Future-proof for more 3D features

**Why procedural geometry:**
- No external asset dependency
- Faster loading
- Matches stylized neo-brutalist aesthetic
- Easier to customize per world

### Performance Considerations

**Bundle size impact:**
- three.js: ~150KB gzipped
- @react-three/fiber: ~40KB gzipped
- @react-three/drei: ~30KB gzipped (tree-shaken)
- Total: ~220KB added to bundle

**Mitigation:**
- Dynamic import (code split)
- Only loads when entering Adventure Mode
- Lazy load post-processing

### Future Considerations

- Add world-specific 3D elements (trees, crystals, etc.)
- Implement fly-through animation on world selection
- Add boss character previews floating above boss levels
- Consider GLTF models for more detailed islands
- VR/AR potential with existing R3F setup

### Known Limitations

- WebGL required (fallback to 2D for non-WebGL browsers)
- Higher battery usage on mobile
- Older devices may need low-quality mode

---

## REFERENCES

### External Documentation

- [React Three Fiber](https://r3f.docs.pmnd.rs/) - Core 3D library
- [Drei Helpers](https://github.com/pmndrs/drei) - Essential utilities
- [Three.js Docs](https://threejs.org/docs/) - Underlying 3D engine
- [Codrops R3F Tutorial](https://tympanus.net/codrops/2025/03/04/creating-stylized-water-effects-with-react-three-fiber/) - Stylized effects
- [Three.js Learning Path 2025](https://threejsresources.com/blog/three-js-learning-path-from-zero-to-mastery) - Best practices

### Design Reference

- Design spec: `.claude/agents/plans/adventure-mode-design-spec.md`
- World map mockup: Lines 14-61 in design spec
- World themes: Lines 463-479 in design spec
- Visual style: Lines 546-577 in design spec
