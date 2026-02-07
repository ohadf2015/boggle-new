# LexiClash Layouts

## Overview
Layout components for app structure, navigation, and game screens.

---

## App Shell

### Root Layout (`app/layout.tsx`)
- Font loading (Fredoka, Rubik)
- Global providers (Theme, Auth, Socket)
- Body with Neo-Brutalist background

### Locale Layout (`app/[locale]/layout.tsx`)
- Language context provider
- RTL detection for Hebrew
- Header/Footer rendering

---

## Navigation

### Header
Sticky on mobile, static on desktop.

**Key Elements:**
- Logo/brand
- Navigation links
- User menu (avatar, coins, settings)
- Language switcher

**Responsive Behavior:**
- Mobile: Sticky header (60px), hamburger menu
- Tablet: Sticky header (70px)
- Desktop: Static header (80px), full nav

**CSS Variables:**
```css
--header-height-mobile: 60px;
--header-height-tablet: 70px;
--header-height-desktop: 80px;
```

### Footer
Desktop only, fixed at bottom.

**Key Elements:**
- Copyright
- Legal links (Privacy, Terms)
- Social links

**CSS Variable:**
```css
--footer-height: 60px;
```

### Mobile Tab Bar
Bottom navigation for mobile.

**Key Elements:**
- Home, Play, Profile, Settings tabs
- Active state indicator
- Safe area inset handling

**CSS Variables:**
```css
--mobile-tab-bar-height: 5rem; /* 80px */
--mobile-bottom-safe: calc(var(--mobile-tab-bar-height) + env(safe-area-inset-bottom));
```

---

## Game Layouts

### Desktop Game Layout (`DesktopGameLayout.tsx`)
Three-column layout for desktop gameplay.

```
┌─────────────────────────────────────────────────────┐
│                     Header                          │
├──────────┬─────────────────────────┬───────────────┤
│ Left     │                         │ Right         │
│ Sidebar  │      Game Board         │ Sidebar       │
│          │                         │               │
│ - Timer  │   [Letter Grid]         │ - Score       │
│ - Combo  │   [Trail SVG]           │ - Words       │
│ - Power  │                         │ - Leaderboard │
│   Ups    │                         │               │
│          │                         │               │
├──────────┴─────────────────────────┴───────────────┤
│               Word Forming Area                     │
└─────────────────────────────────────────────────────┘
```

**Sidebar Width:** 256-320px depending on breakpoint

### Portrait Game Layout (`PortraitGameLayout.tsx`)
Vertical stack for mobile portrait.

```
┌─────────────────────┐
│ Timer & Score       │
├─────────────────────┤
│ Word Forming Area   │
├─────────────────────┤
│                     │
│    Game Board       │
│                     │
├─────────────────────┤
│ Combo / Power-ups   │
├─────────────────────┤
│ Mini Leaderboard    │
└─────────────────────┘
```

### Landscape Game Layout (`LandscapeGameLayout.tsx`)
Horizontal layout for mobile landscape.

```
┌─────────────────────────────────────┐
│ Timer │   Game Board    │ Score    │
│       │                 │ Combo    │
│       │                 │ Words    │
└─────────────────────────────────────┘
```

---

## Results Layouts

### Results Page Layout
Two-column on desktop, tabbed on mobile.

**Desktop:**
```
┌─────────────────────────────────────────┐
│           Winner Banner                 │
├───────────────────┬─────────────────────┤
│ Left Column       │ Right Column        │
│ - Celebration     │ - Your Words        │
│ - Stats           │ - Leaderboard       │
│ - Actions         │ - Missed Words      │
│                   │ - Achievements      │
└───────────────────┴─────────────────────┘
```

**Mobile:**
```
┌─────────────────────┐
│   Winner Banner     │
├─────────────────────┤
│ [Results] [Details] │  <- Tabs
├─────────────────────┤
│  Tab Content        │
│  (scrollable)       │
│                     │
├─────────────────────┤
│  Action Buttons     │
└─────────────────────┘
```

---

## Landing Page Layout

### LandingView
Hero section with mode cards.

```
┌─────────────────────────────────────────┐
│              Hero Section               │
│     Mascot + Tagline + Quick Play      │
├─────────────────────────────────────────┤
│            Mode Cards Grid              │
│   ┌───────┐  ┌───────┐  ┌───────┐     │
│   │Single │  │Multi  │  │Brain  │     │
│   │Player │  │Player │  │Train  │     │
│   └───────┘  └───────┘  └───────┘     │
│        ┌───────┐  ┌───────┐           │
│        │Daily  │  │Advent │           │
│        │Chall  │  │ure    │           │
│        └───────┘  └───────┘           │
└─────────────────────────────────────────┘
```

### ModeCardV2
Interactive mode selection card.

**Features:**
- 3D tilt effect on hover
- Shimmer animation on edges
- Icon, title, description
- Play count badge
- Color theming per mode

**Key Code:**
```tsx
// 3D Tilt calculation
const tiltX = ((y - rect.height / 2) / rect.height) * maxTilt;
const tiltY = ((x - rect.width / 2) / rect.width) * -maxTilt;

// Shimmer edge effect
background: `linear-gradient(${angle}deg,
  transparent 20%,
  ${shimmerColor} 50%,
  transparent 80%)`;
```

---

## Lobby Layout

### Multiplayer Lobby
```
┌─────────────────────────────────────────┐
│           Room Code Display             │
├─────────────────────────────────────────┤
│              Players Grid               │
│   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  │
│   │ P1  │  │ P2  │  │ P3  │  │ P4  │  │
│   └─────┘  └─────┘  └─────┘  └─────┘  │
├─────────────────────────────────────────┤
│           Game Settings                 │
│        (Host only controls)             │
├─────────────────────────────────────────┤
│      Start Game / Waiting...            │
└─────────────────────────────────────────┘
```

---

## Adventure Mode Layout

### World Map
```
┌─────────────────────────────────────────┐
│         World Banner + Title            │
├─────────────────────────────────────────┤
│                                         │
│    ○───○───○───★           Path nodes   │
│        │   │                            │
│        ○───○                            │
│                                         │
├─────────────────────────────────────────┤
│  Player Stats │ Current Abilities       │
└─────────────────────────────────────────┘
```

### Boss Battle
```
┌─────────────────────────────────────────┐
│         Boss Health Bar                 │
├─────────────────────────────────────────┤
│    Boss Sprite / Animation              │
├─────────────────────────────────────────┤
│         Game Board                      │
├─────────────────────────────────────────┤
│  Player Health │ Timer │ Score          │
└─────────────────────────────────────────┘
```

---

## Safe Area Handling

### CSS Utilities
```css
/* Content with header spacing */
.content-with-header-spacing {
  padding-top: calc(var(--header-height-mobile) + 8px);
}

/* Content with footer spacing */
.content-with-footer-spacing {
  padding-bottom: calc(var(--footer-height) + env(safe-area-inset-bottom));
}

/* Full safe area */
.content-safe-full {
  padding-top: calc(var(--header-height-mobile) + 8px);
  padding-bottom: var(--mobile-bottom-safe);
}

/* Min height accounting for chrome */
.min-height-screen-safe {
  min-height: calc(100dvh - var(--header-height-mobile) - var(--mobile-bottom-safe));
}
```

---

## Game Board Frame

### Sizing Strategy
Uses CSS variable for guaranteed square aspect:

```css
.game-board-frame {
  --board-size: min(80vmin, calc(100vw - 32px), calc(100dvh - 220px));
  width: var(--board-size);
  height: var(--board-size);
  aspect-ratio: 1 / 1;
}

/* Desktop override */
@media (min-width: 769px) {
  .game-board-frame {
    --board-size: min(45vmin, calc(100vw - 550px), calc(100dvh - 260px), 500px);
  }
}
```

### Key Features
- Cream background
- 4px black border
- 6px hard shadow
- 12px padding (8px mobile)
- Responsive sizing per breakpoint
