# Blast Mode Page Dependency Tree

## Full Dependency Tree

```
app/[locale]/blast/page.tsx
└── app/[locale]/blast/PageClient.tsx
    └── components/blast/BlastView.tsx
        ├── components/blast/BlastGame.tsx
        │   └── components/blast/BlastGameLayout.tsx
        │       ├── components/blast/BlastGrid.tsx
        │       │   ├── components/GridComponent.tsx
        │       │   ├── components/blast/BlastTileOverlay.tsx
        │       │   ├── components/blast/BlastCascadeOverlay.tsx
        │       │   ├── components/blast/BlastCascadeHighlight.tsx
        │       │   └── components/blast/BlastExplosionLayer.tsx
        │       ├── components/blast/BlastProgressBar.tsx
        │       ├── components/blast/BlastFoundWords.tsx
        │       ├── components/blast/BlastHelpModal.tsx
        │       ├── components/blast/BlastCascadeWordBanner.tsx
        │       ├── components/game/ComboDisplay.tsx
        │       └── components/singleplayer/game/components/LetterTileWord.tsx
        ├── components/blast/BlastResults.tsx
        └── components/blast/BlastWaveTransition.tsx
```

## Component Responsibilities

### Route Layer

| File | Type | Role |
|------|------|------|
| `page.tsx` | Server component | Entry point, `force-dynamic` |
| `PageClient.tsx` | Client component | Suspense + dynamic import (no SSR) |

### Orchestration Layer

| File | Type | Role |
|------|------|------|
| `BlastView.tsx` | Client component | Phase router (playing/waveTransition/results), wave tracking, cumulative score |
| `BlastGame.tsx` | Client component | Hooks orchestrator (useBlastGame, useWordSubmission, useComboSystem) |

### Layout Layer

| File | Type | Role |
|------|------|------|
| `BlastGameLayout.tsx` | Client component | Full portrait layout: header, stats, grid area, dialogs |

### Grid Layer

| File | Type | Role |
|------|------|------|
| `BlastGrid.tsx` | Client component | Grid wrapper with overlay layering and ResizeObserver |
| `GridComponent.tsx` | Client component | Core drag-to-spell grid (shared with all game modes) |
| `BlastTileOverlay.tsx` | Client component | Special tile backgrounds (z-5), cleared gap cells |
| `BlastCascadeHighlight.tsx` | Client component | Cascade word path glow (z-15) |
| `BlastCascadeOverlay.tsx` | Client component | anime.js cascade animations: clearing/falling/appearing (z-20) |
| `BlastExplosionLayer.tsx` | Client component | Particle explosions + score popups (z-30) |

### UI Layer

| File | Type | Role |
|------|------|------|
| `BlastProgressBar.tsx` | Client component | Board clear % with milestone markers |
| `BlastFoundWords.tsx` | Client component | Expandable pill list of found words |
| `BlastHelpModal.tsx` | Client component | AlertDialog explaining mechanics |
| `BlastCascadeWordBanner.tsx` | Client component | Floating cascade word banners with chain badges |
| `BlastWaveTransition.tsx` | Client component | Full-screen wave transition overlay |
| `BlastResults.tsx` | Client component | Results screen with stars, stats, wave breakdown |

### Shared Components (from other modules)

| File | Used by | Role |
|------|---------|------|
| `components/ui/button.tsx` | BlastGameLayout, BlastResults | Neo-brutalist button |
| `components/ui/alert-dialog.tsx` | BlastHelpModal | Radix AlertDialog primitives |
| `components/ui/ConfirmationDialog.tsx` | BlastGameLayout | Quit/End game confirm dialogs |
| `components/ui/PageLoader.tsx` | PageClient | Loading spinner |
| `components/ui/PlayfulBackground.tsx` | BlastView, PageClient | Animated background |
| `components/game/ComboDisplay.tsx` | BlastGameLayout | Combo level indicator |
| `components/singleplayer/game/components/LetterTileWord.tsx` | BlastGameLayout | Word forming display with feedback |
| `components/singleplayer/game/components/DynamicEnergyBackground.tsx` | BlastGameLayout | Energy bg that reacts to game state |
| `components/adventure/juice/ExplosionEffect.tsx` | BlastExplosionLayer | Particle explosion renderer |
| `components/adventure/juice/ScorePopup.tsx` | BlastExplosionLayer | Floating score popup |

## Z-Index Layering (within BlastGrid)

```
z-30  BlastExplosionLayer    (particles + score popups)
z-20  BlastCascadeOverlay    (anime.js gravity animations)
z-15  BlastCascadeHighlight  (word path glow)
z-10  GridComponent cells    (via .game-board-frame > *)
z-5   BlastTileOverlay       (special tile backgrounds + cleared gaps)
```

## Z-Index Layering (within BlastGameLayout)

```
z-50  Combo milestone announcements, cascade banners, board complete overlay
z-40  Screen flash effect
z-30  Header, stats row, word forming area, found words, dead-end notification, grid area
```

## Data Flow

```
BlastView (phase state, wave tracking)
  │
  ├─► BlastGame (hooks orchestration)
  │     │
  │     ├─► useBlastGame → grid state, tile states, explosions, cascades
  │     ├─► useWordSubmission → word validation, feedback
  │     ├─► useComboSystem → combo level, timing
  │     └─► useSpamDetection → abuse prevention
  │           │
  │           └─► BlastGameLayout (pure render)
  │                 │
  │                 └─► BlastGrid → GridComponent + overlays
  │
  ├─► BlastWaveTransition (auto-advance timer)
  │
  └─► BlastResults (useBlastResultSaver for persistence)
```

## Key Hooks (not shown in tree, used by BlastGame)

| Hook | File | Purpose |
|------|------|---------|
| `useBlastGame` | `components/blast/hooks/useBlastGame.ts` | Core game state, tile clearing, cascades |
| `useBlastCascade` | `components/blast/hooks/useBlastCascade.ts` | Cascade animation phases and timing |
| `useWordSubmission` | `components/singleplayer/game/hooks/useWordSubmission.ts` | Word validation pipeline |
| `useComboSystem` | `hooks/useComboSystem.ts` | Combo tracking with decay timer |
| `useSpamDetection` | `components/singleplayer/game/hooks/useSpamDetection.ts` | Rate limiting |
| `useBlastResultSaver` | `components/blast/hooks/useBlastResultSaver.ts` | Persist results to storage |
