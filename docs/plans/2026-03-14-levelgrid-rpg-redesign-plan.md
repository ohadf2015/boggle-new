# LevelGrid RPG Redesign Implementation Plan

> **For Claude:** REQUIRED: Follow this plan task-by-task using TDD.
> **Design:** SuperDesign draft 7d31eb37

**Goal:** Transform the flat LevelGrid into an RPG-style level select with shield header, decluttered cards, boss card, energy trail, milestone dividers, and Lucide particle background.

**Architecture:** Replace card internals (remove objectives/specialTiles/difficulty) with colored banner + massive number + stars + reward tokens. Extract new sub-components to stay under 500 lines. Keep `LevelGridProps` interface unchanged. Replace emoji particles with Lucide icon particles.

**Tech Stack:** React, Framer Motion, Tailwind, lucide-react, CSS animations

**Prerequisites:** Existing LevelGrid.tsx (493 lines), LevelGridComponents.tsx, LevelGrid.css, levelGridConfig.ts, PremiumCard.tsx

---

## Relevant Codebase Files

### Patterns to Follow
- `components/adventure/LevelGrid.tsx` (current implementation, 493 lines)
- `components/adventure/LevelGridComponents.tsx` (FloatingParticle, DifficultyIndicator)
- `components/adventure/LevelGrid.css` (CSS animations, reduced-motion)
- `components/adventure/levelGridConfig.ts` (WORLD_PARTICLES, WORLD_IMAGES, variants)
- `components/adventure/ui/PremiumCard.tsx` (card with variants: default/gold/locked/perfect/mythic)
- `lib/adventure/levelConfig.ts:261` — `isBossLevel = level === LEVELS_PER_WORLD` (level 7)
- `lib/adventure/index.ts` — exports `LEVELS_PER_WORLD`, `MAX_STARS_PER_LEVEL`, `getWorldColors`, `getWorldGlow`, `getLevelConfig`
- `lib/adventure/mastery.ts:49` — mastery calculation (`completedLevels >= LEVELS_PER_WORLD`)

### Existing Tests
- `components/adventure/__tests__/LevelGrid.difficulty.test.tsx`
- `components/adventure/__tests__/LevelGrid.images.test.tsx`
- `components/adventure/__tests__/LevelGrid.parallax.test.tsx`
- `components/adventure/__tests__/LevelGrid.scroll.test.tsx`

### Key Constants
- `LEVELS_PER_WORLD = 7` (level 7 is always boss)
- `MAX_STARS_PER_LEVEL = 3` (boss gets 5 stars per design)
- World accent colors via `getWorldColors(colorPrimary)` and `getWorldGlow(colorPrimary)`

---

## Phase 1: RPG Header + Shield Emblem (testable: header renders with mastery ring and star bar)

> **Exit Criteria:** RPG header renders with shield, world number, mastery percentage ring, star progress bar, ornamental divider. All text via `t()`. Existing tests still pass.

### Task 1.1: Create RPG Header Sub-Component

**Files:**
- Create: `components/adventure/LevelGridHeader.tsx`
- Create: `components/adventure/__tests__/LevelGridHeader.test.tsx`

**Test first** (`LevelGridHeader.test.tsx`):
- Renders shield emblem with world number
- Renders world name via `t('adventure.worlds.X')`
- Renders circular mastery ring with correct percentage (completedLevels / LEVELS_PER_WORLD * 100)
- Renders star progress bar (h-4, border-3, neo-lime fill proportional to worldStars/maxWorldStars)
- Renders ornamental divider with diamond SVG
- RTL: shield and divider render correctly
- Reduced motion: no animation on mastery ring

**Implementation:**
- Props: `{ world, worldStars, maxWorldStars, completedLevels, glowColor, worldColors }`
- Shield: SVG shield shape with world number centered, world accent border
- Mastery ring: SVG circle with `stroke-dasharray` for % complete, text overlay "X%"
- Star bar: `<div>` with `h-4 border-3 border-neo-black rounded-neo` outer, inner fill div with `bg-neo-lime` and width as percentage
- Divider: horizontal line with centered diamond SVG (absolute positioned)
- All labels: `t('adventure.mastery')`, `t('adventure.stars')`, etc.

**Validation:** `npm run test:frontend -- --testPathPattern="LevelGridHeader"`

### Task 1.2: Wire Header into LevelGrid

**Files:**
- Modify: `components/adventure/LevelGrid.tsx` (replace lines 223-333 header block)

**Test:** Existing `LevelGrid.*.test.tsx` files still pass.

**Implementation:**
- Import `LevelGridHeader` and replace the current `motion.div` header (lines 223-333) with `<LevelGridHeader ... />`
- Pass computed props (worldStars, maxWorldStars, completedLevels, glowColor, worldColors, world)

**Validation:** `npm run test:frontend -- --testPathPattern="LevelGrid"`

---

## Phase 2: Decluttered RPG Cards (testable: cards show banner, big number, stars, reward tokens)

> **Exit Criteria:** Each level card has colored top banner with 'LVL' label, text-5xl level number, 3-star row, footer with reward token icons. No more objectives/specialTiles/difficulty on cards. Card states (PERFECT/COMPLETED/CURRENT/LOCKED) visually distinct. Boss card spans 2 cols.

### Task 2.1: Create RPG Level Card Sub-Component

**Files:**
- Create: `components/adventure/RPGLevelCard.tsx`
- Create: `components/adventure/__tests__/RPGLevelCard.test.tsx`

**Test first:**
- Renders colored top banner strip (24px) with 'LVL' label via `t('adventure.lvl')`
- Renders level number as text-5xl font-black centered
- Renders 3 Star icons (gold filled for earned, outline for unearned)
- Renders footer strip with reward token icons (Coins, Gem, Zap from lucide-react)
- Renders grain texture overlay at 3% opacity
- PERFECT state: gold banner, Crown badge top-right, gold inner glow
- COMPLETED state: green banner, green accent
- CURRENT state: neo-lime pulsing border, Play icon bouncing, 'NEXT' banner via `t('adventure.next')`
- LOCKED state: dimmed 50%, dark banner, Lock icon replaces number, chain stripes
- RTL: banner chevron direction flips, badge positions use logical props
- Reduced motion: no pulse/bounce animations

**Implementation:**
- Props: `{ levelNum, stars, maxStars, isUnlocked, isPerfect, isCurrent, isBoss, worldAccentColor, glowColor, onClick, newStarsFrom }`
- Derive card state: `isPerfect ? 'PERFECT' : stars > 0 ? 'COMPLETED' : isCurrent ? 'CURRENT' : 'LOCKED'`
- Banner colors: gold (#FFD700) for PERFECT, green (#22c55e) for COMPLETED, neo-lime for CURRENT, gray (#374151) for LOCKED
- Banner chevron: CSS `background-image: repeating-linear-gradient(135deg, ...)` (flip to -135deg for RTL)
- Reward tokens: always show Coins; show Gem for levels divisible by 3; show Zap for boss
- Grain: `<div>` overlay with `opacity-[0.03]` and `bg-[url('/images/textures/grain.webp')]` or CSS noise
- Watermark: faint level-specific illustration at 6% opacity (stretch goal, can use world image)

**Validation:** `npm run test:frontend -- --testPathPattern="RPGLevelCard"`

### Task 2.2: Create Boss Card Variant

**Files:**
- Modify: `components/adventure/RPGLevelCard.tsx` (add boss-specific rendering)
- Update: `components/adventure/__tests__/RPGLevelCard.test.tsx`

**Test first:**
- Boss card (`isBoss=true`): spans 2 columns via `col-span-2`
- Red banner with Swords icon and 'BOSS' label via `t('adventure.boss')`
- border-4 with red shadow
- 5 stars instead of 3
- Skull difficulty pips (3 skulls)
- Rare reward token (Gem always shown)
- Pulsing red glow animation (CSS class, respects reduced motion)

**Implementation:**
- When `isBoss`, override: maxStars=5, banner color red, show Swords icon, add `col-span-2` class, increase height by 1.3x via `min-h-[calc(1.3*var(--card-height))]` or explicit Tailwind
- Add `level-grid-boss-pulse` CSS animation in LevelGrid.css

**Validation:** `npm run test:frontend -- --testPathPattern="RPGLevelCard"`

### Task 2.3: Wire RPG Cards into LevelGrid

**Files:**
- Modify: `components/adventure/LevelGrid.tsx` (replace card rendering, lines 343-488)

**Test:** Existing tests adapted. New test: boss card at level 7 spans 2 columns.

**Implementation:**
- Replace PremiumCard usage with `<RPGLevelCard>` inside the grid
- Compute `isCurrent`: first unlocked level with 0 stars
- Compute `isBoss`: `levelNum === LEVELS_PER_WORLD`
- Remove objectives, specialTiles, DifficultyIndicator from card area
- Keep PremiumCard as wrapper (it handles tilt/hover/variant styling)

**Validation:** `npm run test:frontend -- --testPathPattern="LevelGrid"`

---

## Phase 3: Energy Trail + Milestone Dividers (testable: trail visible, dividers after every 3 levels)

> **Exit Criteria:** Neo-lime connecting line between completed cards. Milestone divider with trophy after levels 3 and 6. Reduced motion: trail and dividers static.

### Task 3.1: Create Energy Trail Component

**Files:**
- Create: `components/adventure/EnergyTrail.tsx`
- Create: `components/adventure/__tests__/EnergyTrail.test.tsx`

**Test first:**
- Renders SVG line connecting completed cards
- Line is neo-lime, 2px, 40% opacity
- Line stops at current (first incomplete) level
- Renders nothing when no levels completed
- Reduced motion: solid line, no animation

**Implementation:**
- Use CSS pseudo-elements or an SVG overlay positioned absolutely over the grid
- Calculate completed card positions (grid math: col/row from index, card size from gap)
- Alternative simpler approach: render a vertical/horizontal connector between adjacent cards using CSS `::after` pseudo-elements on each completed card — avoids absolute SVG positioning
- [CHECKPOINT] Approach: SVG overlay vs CSS connectors (recommend CSS connectors for simplicity and RTL compatibility)

**Validation:** `npm run test:frontend -- --testPathPattern="EnergyTrail"`

### Task 3.2: Create Milestone Divider Component

**Files:**
- Create: `components/adventure/MilestoneDivider.tsx`
- Create: `components/adventure/__tests__/MilestoneDivider.test.tsx`

**Test first:**
- Renders trophy icon (Trophy from lucide-react)
- Renders 'Chapter X Complete' text via `t('adventure.chapterComplete', { chapter: X })`
- Renders after levels 3 and 6 in the grid
- RTL: text direction correct

**Implementation:**
- Full-width row in grid (`col-span-full`)
- Horizontal line with centered Trophy icon and label
- Neo-brutalist: border-2, hard shadow on trophy badge

### Task 3.3: Wire Trail + Dividers into LevelGrid

**Files:**
- Modify: `components/adventure/LevelGrid.tsx`

**Implementation:**
- Insert `<MilestoneDivider chapter={1} />` after level 3 item, `<MilestoneDivider chapter={2} />` after level 6
- Add energy trail connector classes to completed cards

**Validation:** `npm run test:frontend -- --testPathPattern="LevelGrid"`

---

## Phase 4: Background Overhaul (testable: Lucide particles, god-rays, mist, no emojis)

> **Exit Criteria:** Emoji particles replaced with Lucide Sparkles/Star icons. God-ray and mist layers added. No emoji strings in particle config.

### Task 4.1: Replace Emoji Particles with Lucide Icons

**Files:**
- Modify: `components/adventure/LevelGridComponents.tsx` (FloatingParticle)
- Modify: `components/adventure/levelGridConfig.ts` (WORLD_PARTICLES)

**Test first:**
- FloatingParticle renders Lucide icon (Sparkles or Star) instead of emoji string
- Particles have varying sizes and opacity
- No emoji strings in rendered output

**Implementation:**
- Change `WORLD_PARTICLES` emoji arrays to icon type arrays: `['Sparkles', 'Star', 'Sparkle']`
- FloatingParticle: render `<Sparkles>` / `<Star>` instead of emoji text
- Keep CSS animation unchanged
- Remove `filter: drop-shadow` text-shadow from `.level-grid-particle` (was for emoji)

### Task 4.2: Add God-Rays and Mist Layers

**Files:**
- Modify: `components/adventure/LevelGrid.tsx` (background layers)
- Modify: `components/adventure/LevelGrid.css` (god-ray animation)

**Test first:**
- God-ray layer renders with correct CSS class
- Mist layer renders at bottom
- Both respect reduced motion

**Implementation:**
- God-rays: CSS `conic-gradient` with world accent color at 5% opacity, slow rotation animation
- Mist: `<div>` at bottom with gradient from transparent to dark, 30% opacity
- Add `@keyframes god-ray-rotate` in LevelGrid.css
- Add to reduced-motion media query

**Validation:** `npm run test:frontend -- --testPathPattern="LevelGrid"` + `npm run build`

---

## Phase 5: Polish + i18n + Final Validation

> **Exit Criteria:** All new translation keys added to 4 languages. All existing tests pass. Build succeeds. Lint clean.

### Task 5.1: Add Translation Keys

**Files:**
- Modify: `translations/en.js`, `translations/he.js`, `translations/sv.js`, `translations/ja.js`

**Keys to add:**
- `adventure.lvl`: "LVL" / "שלב" / "NIV" / "LV"
- `adventure.next`: "NEXT" / "הבא" / "NASTA" / "次"
- `adventure.boss`: "BOSS" / "בוס" / "BOSS" / "ボス"
- `adventure.mastery`: "Mastery" / "שליטה" / "Beharskning" / "マスタリー"
- `adventure.chapterComplete`: "Chapter {chapter} Complete" / (localized equivalents)

### Task 5.2: Clean Up Removed Components

**Files:**
- Modify: `components/adventure/LevelGridComponents.tsx` — remove `DifficultyIndicator` (no longer used in cards)
- Remove difficulty-related imports from LevelGrid.tsx
- Keep `TILE_ICONS` in levelGridConfig.ts (used by BlastTileOverlay.tsx and BlastMultiplayerOverlay.tsx)
- Remove `TILE_ICONS` import from LevelGrid.tsx only

### Task 5.3: Final Validation

**Run:**
```bash
npm run lint
npm run test:frontend -- --testPathPattern="LevelGrid|RPGLevelCard|LevelGridHeader|EnergyTrail|MilestoneDivider"
npm run test:frontend  # full suite
npm run build
```

**All must pass.**

---

## File Size Budget

| File | Estimated Lines | Status |
|------|----------------|--------|
| `LevelGrid.tsx` | ~200 (down from 493) | Under 500 |
| `LevelGridHeader.tsx` | ~120 | Under 500 |
| `RPGLevelCard.tsx` | ~180 | Under 500 |
| `EnergyTrail.tsx` | ~60 | Under 500 |
| `MilestoneDivider.tsx` | ~40 | Under 500 |
| `LevelGridComponents.tsx` | ~80 (remove DifficultyIndicator) | Under 500 |
| `LevelGrid.css` | ~280 (add boss-pulse, god-ray) | Under 500 |
| `levelGridConfig.ts` | ~100 (modify particles) | Under 500 |

---

## Risks

| Risk | P | I | Score | Mitigation |
|------|---|---|-------|------------|
| Boss card 2-col span breaks grid layout on mobile (2-col grid) | 3 | 3 | 9 | On mobile (grid-cols-2), boss card takes full width via `col-span-2`; test at 320px |
| Energy trail SVG positioning misaligns on resize | 3 | 2 | 6 | Use CSS connectors instead of absolute SVG |
| God-ray animation jank on low-end devices | 2 | 2 | 4 | Use `will-change: transform`, respect `useDevicePerformance` |
| Removing DifficultyIndicator breaks other consumers | 2 | 3 | 6 | Grep for imports before removing; keep in file if used elsewhere |
| PremiumCard variant mapping mismatch with new states | 2 | 3 | 6 | Map PERFECT->perfect, COMPLETED->gold, CURRENT->default+custom glow, LOCKED->locked |

---

## Success Criteria

- [ ] RPG header with shield, mastery ring, star bar renders correctly
- [ ] Cards show banner + big number + stars + reward tokens (no objectives/tiles/difficulty)
- [ ] 4 card states visually distinct (PERFECT, COMPLETED, CURRENT, LOCKED)
- [ ] Boss card spans 2 cols with red theme and 5 stars
- [ ] Energy trail connects completed cards
- [ ] Milestone dividers appear after levels 3 and 6
- [ ] Lucide icon particles (no emojis)
- [ ] God-rays and mist background layers
- [ ] All text via `t()`, 4 languages
- [ ] RTL works (Hebrew)
- [ ] Reduced motion respected
- [ ] All files under 500 lines
- [ ] `npm run lint && npm run test && npm run build` pass
