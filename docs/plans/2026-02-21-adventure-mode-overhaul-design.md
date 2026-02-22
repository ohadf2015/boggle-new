# Adventure Mode Overhaul — Design Document

**Date:** 2026-02-21
**Status:** Approved
**Scope:** Bottom UI, Side Quests, Boss Battle Feel, Mobile Cinematics

---

## Overview

Full overhaul of LexiClash adventure mode covering four interconnected areas:
1. Bottom UI redesign — unified control bar replacing cramped sidebar
2. Side quests system — mid-level flash challenges + persistent chapter quests
3. Boss HP/dialogue/interaction drama
4. Remotion cinematic mobile fixes (aspect ratio + element scaling)

Implemented via 4 parallel agents with clear interface contracts.

---

## Section 1 — Bottom UI & Game Layout

### Problem
`GameLayout` constrains sidebar to `max-h-[20vh]` (~140px on mobile). Objectives, power-ups, and hints are cut off and invisible.

### Solution: Unified Bottom Control Bar
Replace vertical sidebar with a horizontal strip fixed at `h-20` below the grid on mobile. Desktop keeps right sidebar.

**Layout:**
```
Mobile:
┌─────────────────────────────────┐
│         GAME HEADER             │  56px, flex-shrink-0
├─────────────────────────────────┤
│                                 │
│         GAME BOARD              │  flex-1, min-h-0
│                                 │
├─────────────────────────────────┤
│  [⚡Obj1 60%][🎯Obj2 ✓][💡Hint] │  80px, flex-shrink-0
└─────────────────────────────────┘

Desktop (lg+): unchanged right sidebar
```

**Files changed:**
- `components/adventure/ui/GameLayout.tsx` — sidebar `max-h-[20vh]` → `h-20 lg:h-full` with `overflow-x-auto lg:overflow-y-auto`
- `components/adventure/ui/GameSidebar.tsx` — add horizontal mobile layout variant
- `components/adventure/hud/ObjectiveProgress.tsx` — add compact horizontal "chip" variant for mobile bar
- `components/adventure/power-ups/PowerUpBar.tsx` — join bottom bar on mobile as icon-only buttons

**Design:**
- Objective chips: icon + compact progress ring + label, pill-shaped, neo-brutalist border
- Completion state: chip turns neo-lime with checkmark
- Scroll indicator (fade gradient) if chips overflow

---

## Section 2 — Side Quests System

### Two-tier architecture

#### Tier 1 — Mid-Level Flash Challenges (ephemeral, in-game)
- Triggers at ~30% remaining time, max 1 per level
- Stays visible for 30 seconds, slides up from bottom
- On completion: coin/score reward + particle burst
- On timeout: slides out silently

**Example challenges:**
- "Find a 6+ letter word in 30s → +50 coins"
- "Build a 3-word combo streak → +1 star bonus"
- "Use the letter Q → +30 coins"

**New files:**
- `lib/adventure/flashChallengeConfig.ts` — challenge definitions per world
- `hooks/useFlashChallenge.ts` — timer, trigger logic, completion detection
- `components/adventure/FlashChallengeToast.tsx` — slide-up toast UI

**Integration:** `useAdventureGame` exposes `onFlashChallengeComplete`. `AdventureGame.tsx` wires `useFlashChallenge` hook.

#### Tier 2 — Chapter Quests (persistent, cross-level)
- 3 quests per chapter (every 5 levels)
- Visible on level select screen as quest log panel
- Progress persists in `adventureProgress` (Supabase)
- Rewards: coins, XP, cosmetic badges

**Example quests:**
- "Defeat the boss without using a hint"
- "Find 20 words in World 2"
- "Complete 3 levels with full combo"

**New files:**
- `types/adventure.ts` — add `AdventureQuest`, `QuestProgress`, `QuestReward` types
- `lib/adventure/questConfig.ts` — quest definitions (all chapters, all worlds)
- `hooks/useChapterQuests.ts` — progress tracking, completion detection, reward claiming
- `components/adventure/quests/ChapterQuestPanel.tsx` — level select UI panel
- `components/adventure/quests/QuestCard.tsx` — individual quest card

**Level select integration:** `LevelGrid.tsx` gets a collapsible `ChapterQuestPanel` above or below the level grid.

---

## Section 3 — Boss HP, Dialogue & Battle Feel

### HP Bar Overhaul

**Segmented HP:** Divide bar into 4 visible chunks separated by thin black dividers. Each chunk = 25% HP. When a chunk empties, it darkens dramatically.

**Hit reaction:** On each damage event:
1. Bar shakes (`animate-neo-shake`, 200ms)
2. White flash overlay on bar (opacity 0→0.6→0, 150ms)
3. Damage number floats up from bar (reuse `ScorePopup` pattern)
4. Bar spring-animates to new value

**Phase transition (≤25% HP):**
1. Screen flash (red tint, 300ms)
2. `ENRAGED!` badge slams in with `scale: 0→1.2→1` spring
3. Screen shake (intensity 4)
4. HP bar color pulses red (`animate-pulse`)

**Files changed:**
- `components/adventure/BossHPBar.tsx` — segmented bar, hit reaction, damage numbers
- `types/boss.ts` — add `onDamage` callback to `BossHealthState`

### Boss Dialogue Overhaul

**Repositioned:** From `fixed top-28` → anchored directly below `BossHPBar` in the DOM (not fixed). This makes it contextually connected and always visible regardless of screen size.

**Visual improvements:**
- `max-w-xs` → `max-w-sm`
- Avatar: 32px → 48px with yellow glow ring
- Text: `text-sm` → `text-base`
- Typewriter effect: characters appear at 60ms each, skippable on tap
- Display duration: 3.5s (configurable per taunt type)
- Speech bubble tail pointing up to HP bar

**Files changed:**
- `components/adventure/BossDialogue.tsx` — repositioned, larger, typewriter effect
- `components/adventure/boss/BossOverlay.tsx` — move dialogue below HP bar

### Battle Interaction Drama

**Good word → boss hit:**
- Boss avatar `animate-neo-shake` (300ms)
- White flash ring around boss section
- Lightning bolt particles burst from HP bar

**Bad word → boss counter:**
- Player health bar red flash
- Screen edge vignette flash (300ms, red gradient overlay)

**Boss mechanic word (BOSS! bonus):**
- Lightning bolt particle burst at HP bar position
- Extra score popup with star icon

**Files changed:**
- `components/adventure/AdventureGame.tsx` — wire hit callbacks to BossOverlay
- `components/adventure/boss/BossOverlay.tsx` — accept `onHit`, `onCounter` callbacks
- `components/adventure/effects/AdventureEffectsLayer.tsx` — add edge vignette flash

---

## Section 4 — Remotion Cinematics on Mobile

### Problem
`CinematicPlayer` renders `width: 100vw, height: 100vh` but compositions are `1280×720` landscape. On portrait mobile, content appears tiny/misaligned.

### Fix 1: CinematicPlayer aspect-ratio letterbox

```typescript
// Detect portrait mobile
const isPortrait = window.innerWidth < window.innerHeight;
const isMobile = window.innerWidth < 768;

// Letterbox: fill width, constrain height to 16:9
const playerWidth = window.innerWidth;
const playerHeight = isPortrait && isMobile
  ? Math.round(window.innerWidth * (720 / 1280))  // 56.25vw
  : window.innerHeight;
```

Container: `flex items-center justify-center bg-black` (black bars above/below on portrait).

**File:** `components/adventure/boss/cinematics/CinematicPlayer.tsx`

### Fix 2: Responsive elements inside compositions

All Remotion compositions use `useVideoConfig()` to get `width`/`height`. Switch hardcoded font sizes to percentage-based:

```typescript
const { width } = useVideoConfig();
const titleSize = width * 0.08; // 8% of composition width
```

**Particle count scaling:**
```typescript
const particleCount = width < 500 ? 20 : width < 800 ? 40 : 80;
```

**Skip button:** Add `paddingBottom: 'env(safe-area-inset-bottom)'` for notch awareness.

**Files changed:**
- `components/adventure/boss/cinematics/CinematicPlayer.tsx`
- `lib/remotion/primitives/TitleReveal.tsx`
- `lib/remotion/primitives/ParticleLayer.tsx`
- `lib/remotion/primitives/SparkleField.tsx`
- `components/adventure/cinematics/VictoryCinematic.tsx`
- `components/adventure/cinematics/DefeatCinematic.tsx`
- `components/adventure/boss/cinematics/BossEntranceCinematic.tsx`
- `components/adventure/boss/cinematics/BossDefeatCinematic.tsx`

---

## Agent Assignments

| Agent | Domain | Key Files |
|-------|---------|-----------|
| Frontend Developer | Bottom UI, GameLayout, GameSidebar | `GameLayout`, `GameSidebar`, `ObjectiveProgress` |
| UX Researcher | Side Quests system | `questConfig`, `useChapterQuests`, `ChapterQuestPanel`, `useFlashChallenge`, `FlashChallengeToast` |
| Game Designer | Boss HP, dialogue, interaction drama | `BossHPBar`, `BossDialogue`, `BossOverlay`, `AdventureGame` |
| Animator | Remotion mobile fixes + primitives | `CinematicPlayer`, all cinematic compositions, shared Remotion primitives |

---

## Testing Requirements

Each change requires:
- Unit tests for new hooks (`useFlashChallenge`, `useChapterQuests`)
- Component tests for new UI (`FlashChallengeToast`, `ChapterQuestPanel`, `QuestCard`)
- Updated tests for modified components (`BossHPBar`, `BossDialogue`, `GameLayout`, `CinematicPlayer`)
- RTL (Hebrew) validation for all new text

## Translation Keys Required

All new UI text must use `t('key')` with additions to all 4 language files:
- Flash challenge: `adventure.quests.flash.*`
- Chapter quests: `adventure.quests.chapter.*`
- Boss hit: already covered by existing taunt keys
